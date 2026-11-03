---
title: "Under the Endpoint Picker, Part 4: Measure, Don't Assume"
description: "A hand-written GPU copy ran at two-thirds of CUDA's speed on the same hardware, with the same commands, over the same link. The cause was something nobody thought to check, and it is the same mistake round robin makes on every request."
date: "2026-11-03T09:03:00"
author: "Igor Racic"
tags: ["ai-infrastructure", "gpu", "performance", "f5-bnk", "load-balancing"]
---

# Measure, Don't Assume

## Under the Endpoint Picker, Part 4

> Part 4 of a six-part series. [Part 3](/blog/under-the-endpoint-picker-3-pay-once-then-get-out-of-the-way) showed that a CUDA copy is seven methods and a doorbell, with no kernel involvement once setup is done. This part tries to build that copy by hand, and gets a lesson in trusting measurements over assumptions.

If a `cudaMemcpy` is just sixty bytes of commands and one doorbell, you should be able to write those sixty bytes yourself, ring the doorbell yourself, and match CUDA's speed. No CUDA at all. Allocate the objects from Part 3 through the kernel module, map the ring and the doorbell, write a command, ring.

Public research has done exactly that, with a small library that replaces CUDA for copies. It's a great way to find out what CUDA does that nobody wrote down.

## A Copy in 72 Bytes

The hand-built copy is 18 dwords, 72 bytes, slightly longer than CUDA's 60 because it binds the copy engine explicitly instead of relying on earlier state:

```text
SET_OBJECT        HOPPER_DMA_COPY_A  (class 0xC8B5, subchannel 4)
OFFSET_IN         source virtual address
OFFSET_OUT        destination virtual address
LINE_LENGTH_IN    bytes to copy
LAUNCH_DMA        0x182   copy
SET_SEMAPHORE_*   completion address and value
LAUNCH_DMA        0x00c   release the semaphore
```

A single fused launch that copies and releases in one go also works. The length field is 32 bits, so one launch moves at most 4 GiB minus one byte. Anything bigger is several launches.

Then the ring entry: 8 bytes that point at those 72. There's a trap here. The entry format expects the pushbuffer address shifted right by two bits, because commands are always 4-byte aligned. Pass the address unshifted and the GPU fetches from the wrong place.

## Xid Codes Are Your Debugger

Without a driver to tell you what went wrong, the GPU's own error codes become the debugger. NVIDIA calls them Xids, and they land in the kernel log. Three of them come up again and again when you work at this level:

| Xid | Meaning | Typical cause when building commands by hand |
|---|---|---|
| 32 | bad command stream | missing `SET_OBJECT`, unbound subchannel, a missing store fence |
| 31 | GPU MMU fault | a wrong address, such as the unshifted pushbuffer address |
| 13 | exception inside an SM | a compute kernel touching memory it shouldn't |

The unshifted address produced an Xid 31. Shift it, and the copy works. Data arrives, the semaphore fires, everything checks out.

## Two-Thirds of CUDA

Then you measure it. A 256 MiB copy from the hand-built path runs at 38 GB/s. CUDA, on the same machine, runs at 55.

That's a big gap for something this simple. Every obvious suspect checks out. It's the same copy engine, the same PCIe link, and the same memory. The command stream is almost identical to CUDA's. The 12 extra bytes can't cost a third of the bandwidth, and anyway the commands aren't on the critical path once the copy engine is running.

The answer turned out to have nothing to do with the copy. The GPU's SM clock was idling at 345 MHz.

When CUDA initializes a device, it quietly sends a performance-boost control command (`NV2080_CTRL_CMD_PERF_BOOST`) that raises the clocks to 1755 MHz. Nothing in the copy path asks for it. It's part of CUDA's setup, invisible unless you're tracing every control call. The hand-built library didn't send it, so the GPU stayed in its idle power state, and even the copy engine path ran slower.

Add that one control call to setup, and the hand-built copy goes from 38 to 54.8 GB/s against CUDA's 54.7:

| Copy size | Hand-built | CUDA |
|---|---|---|
| 4 MiB | 31.3 GB/s | 35.7 GB/s |
| 64 MiB | 53.9 GB/s | 53.5 GB/s |
| 256 MiB | 55.1 GB/s | 52.9 GB/s |
| 1 GiB | 55.5 GB/s | 55.4 GB/s |

That's after the clock fix. A fixed overhead of about 15 µs per copy remains, from submission, the semaphore round trip and wakeup. It costs 11% at 4 MiB and 1% at 64 MiB. Small transfers pay for setup, and big ones don't notice. That's worth remembering when someone benchmarks a KV cache transfer with tiny chunks and draws conclusions about the link.

## The Flaky One

The second problem was harder, because it only happened sometimes.

With the CPU and GPU using different virtual addresses for the same buffer, 25 to 34% of 128 MiB round trips came back wrong. Not crashes, and not Xids. The data was just wrong some of the time.

The fix was to stop having two addresses. Reserve one window of virtual address space in the process, about 4 GiB starting at `0x200000000`. Map each buffer at a fixed address inside it on the CPU side, and at the same address on the GPU side. One pointer, valid on both processors. With that layout, 1,000 runs out of 1,000 passed. It also kept every buffer under the 40-bit address limit of the ring entry format, which removed the need for a separate extended-base entry.

This is the same idea CUDA's unified memory is built on: GPU virtual address equals CPU virtual address. CUDA gets it for free from the unified-memory module. A hand-built path has to do it deliberately, and if it doesn't, it gets a bug that looks like flaky hardware.

## Nobody Wrote It Down

Neither fix appears in an API reference. The clock boost is a side effect of CUDA's initialization. The address layout is a property of how CUDA sets up memory. Both are invisible from the outside.

In production, both would show up the same way: a ticket saying the GPU is slow, or the GPU is flaky, on hardware that passes every health check. The spec sheet says the machine should do 55 GB/s. It does 38. Everything you'd normally check says it should be fine.

What fixed it wasn't a better guess. It was measuring what was actually happening, and noticing the clock register.

## Round Robin Trusts the Spec Sheet

This is the part I keep thinking about from a routing point of view. The wrong assumption was "same hardware, same work, same speed". The signal that mattered was one nobody was looking at.

Round robin makes that exact assumption on every request. It treats every GPU in the pool as identical and every request as the same unit of work. Neither holds.

Requests aren't equal. A 128K-token summary and a two-word greeting are both one request, and they differ in cost by orders of magnitude. Latency across requests in real inference traffic can spread by more than an order of magnitude, and prompt sizes by more than that.

Servers aren't equal either, even when the hardware is. Two identical GPUs can be draining their queues at very different rates. One might be decoding long outputs for a dozen users while the other is mostly doing short prefills. One might be throttling. One might have its prefix cache warm for the request in hand and the other might not. From the outside they look the same: same model, same pod spec, same health check.

Least connections improves on round robin by counting in-flight requests. It's still counting requests instead of work. One connection streaming a 4,000-token answer and one waiting for a 10-token reply count the same.

## What the BNK Picker Measures Instead

The BNK endpoint picker is built on the same lesson as the clock story: read the register, don't trust the spec sheet.

It weights load by tokens, not request count. A request is scored by how much prefill and decode work it brings, so a long prompt counts for what it costs.

It measures how fast each server is actually clearing its decode work, as seconds to drain its current queue, instead of assuming identical GPUs have identical capacity. If one server is slower right now, for any reason (clocks, thermal limits, a heavy batch of long outputs), the picker sees it in the numbers without having to know why.

It values a cache hit by the measured cost of fetching it from the tier it's in, as Part 1 described, rather than assuming all hits are equal.

And it balances cache reuse against load using a trade-off derived from measured hardware behaviour, not from weights someone guessed during setup and never revisited. Hand-tuned weights are their own kind of spec sheet. They're right for the traffic and hardware they were tuned on, and they quietly go wrong as both change.

The hand-built copy and the routing problem have the same shape. Things that should behave the same don't, the reason isn't visible in the configuration, and the only reliable fix is to measure the thing that actually decides the outcome.

## Next

All of this depended on being able to see what CUDA does: every control call, every doorbell, every command. Part 5 is about how that seeing works, and why the obvious way to watch a GPU slows it down by a factor of almost 3,000. That has a direct lesson for where observability belongs in an inference stack.

---

**Under the Endpoint Picker**

1. [One Request, Five Prices](/blog/under-the-endpoint-picker-1-one-request-five-prices)
2. [What Sits Behind the Pod IP](/blog/under-the-endpoint-picker-2-what-sits-behind-the-pod-ip)
3. [Pay Once, Then Get Out of the Way](/blog/under-the-endpoint-picker-3-pay-once-then-get-out-of-the-way)
4. Measure, Don't Assume
5. [Seeing Without Slowing Down](/blog/under-the-endpoint-picker-5-seeing-without-slowing-down)
6. [When the GPU Stops Asking the CPU](/blog/under-the-endpoint-picker-6-when-the-gpu-stops-asking-the-cpu)
