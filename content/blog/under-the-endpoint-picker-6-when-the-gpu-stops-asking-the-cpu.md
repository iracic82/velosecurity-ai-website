---
title: "Under the Endpoint Picker, Part 6: When the GPU Stops Asking the CPU"
description: "A single GPU thread can ring its own doorbell and start a data transfer with no CPU involved. It's a lab experiment today, but it shows where the data path is heading, and why policy has to live somewhere the data still passes through."
date: "2026-11-03T09:01:00"
author: "Igor Racic"
tags: ["ai-infrastructure", "gpu", "dpu", "f5-bnk", "security"]
---

# When the GPU Stops Asking the CPU

## Under the Endpoint Picker, Part 6

> Part 6, the last of the series. Parts [2](/blog/under-the-endpoint-picker-2-what-sits-behind-the-pod-ip) to [5](/blog/under-the-endpoint-picker-5-seeing-without-slowing-down) followed the CPU as it drove the GPU: commands, rings, doorbells, semaphores. This part turns that around, then brings the whole series back to the front door.

In every part so far, the CPU did the asking. It wrote the command into a pushbuffer and the entry into the ring. It moved `GPPut` forward, fenced each step, and rang the doorbell. The GPU answered, but never started anything on its own.

That's how almost every GPU workload runs today, and it puts the host CPU in a convenient place. It sees every transfer being requested. If you wanted to enforce a rule about what data moves where, the host is where you'd do it.

Now take the CPU out of that position. Let it prepare a copy, but leave the doorbell alone, and have a thread on the GPU ring it.

## One Thread, One Store

The GPU kernel that does this is about as small as a kernel can be. One thread runs one line:

```c
*dst = token;
```

`dst` is the address of the doorbell. `token` is the value that tells the GPU's front end which channel has new work. The compiler turns that line into a single system-scope global store, `STG.E.STRONG.SYS`. The `.SYS` suffix is a memory scope: it makes the store visible system-wide. It isn't a route to the host.

The CPU still does the preparation. On one channel it builds a copy-engine command and a ring entry, exactly as in Part 2, and moves `GPPut` forward. Then it stops. No doorbell. On a second channel it launches the one-thread kernel, passing in the doorbell address and the first channel's token. The kernel runs, stores the token, and the copy engine wakes up and moves the data.

<svg viewBox="0 0 800 260" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="The CPU prepares a copy on channel A and does not ring its doorbell. It launches a one-thread kernel on channel B. The GPU thread stores channel A's token to the doorbell, and the copy engine moves 4 MiB to host memory." style="width:100%;height:auto;max-width:760px;display:block;margin:2rem auto;">
  <defs>
    <marker id="p6Arr" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="#00d4ff"/></marker>
  </defs>
  <g font-family="ui-sans-serif,system-ui,sans-serif">
    <text x="20" y="28" fill="#64748b" font-size="13" font-weight="700" letter-spacing="1">CPU</text>
    <rect x="20" y="40" width="340" height="64" rx="8" fill="#0b0f1a" stroke="#334155"/>
    <text x="40" y="66" fill="#e2e8f0" font-size="14" font-weight="700">Channel A: prepare the copy</text>
    <text x="40" y="88" fill="#94a3b8" font-size="12">command + ring entry + GPPut. No doorbell.</text>
    <rect x="420" y="40" width="360" height="64" rx="8" fill="#0b0f1a" stroke="#334155"/>
    <text x="440" y="66" fill="#e2e8f0" font-size="14" font-weight="700">Channel B: launch a 1-thread kernel</text>
    <text x="440" y="88" fill="#94a3b8" font-size="12">args: doorbell address, channel A token</text>
    <line x1="600" y1="104" x2="600" y2="150" stroke="#00d4ff" stroke-width="1.5" marker-end="url(#p6Arr)"/>
    <text x="20" y="146" fill="#64748b" font-size="13" font-weight="700" letter-spacing="1">GPU</text>
    <rect x="420" y="156" width="360" height="64" rx="8" fill="#0d1526" stroke="#00d4ff"/>
    <text x="440" y="182" fill="#00d4ff" font-size="14" font-weight="700">SM thread rings the doorbell</text>
    <text x="440" y="204" fill="#94a3b8" font-size="12">*dst = token  →  STG.E.STRONG.SYS</text>
    <line x1="420" y1="188" x2="366" y2="188" stroke="#00d4ff" stroke-width="1.5" marker-end="url(#p6Arr)"/>
    <rect x="20" y="156" width="340" height="64" rx="8" fill="#0b0f1a" stroke="#334155"/>
    <text x="40" y="182" fill="#e2e8f0" font-size="14" font-weight="700">Copy engine runs channel A</text>
    <text x="40" y="204" fill="#94a3b8" font-size="12">4 MiB moved to host memory</text>
  </g>
</svg>

## What It Takes Without CUDA

Writing that kernel is trivial. Launching it without CUDA, using only the raw interfaces from earlier in this series, is the hard part. A compute launch needs three things built by hand.

**A launch descriptor.** NVIDIA calls it a QMD. On Hopper it's 384 bytes, 256-byte aligned, and it describes the grid, the block, the shared memory, the program address and the constant buffers. Only 13 of its 96 dwords end up non-zero.

**A constant buffer.** It holds the kernel's arguments at fixed offsets: the doorbell's GPU address and the token.

**The program itself.** It's 256 bytes of SASS, the GPU's native machine code, written for the specific architecture.

The launch goes to the compute class on the second channel, using two methods that hand the descriptor's address to the GPU's scheduler.

The doorbell needs one more piece of setup. A GPU thread can only store to addresses in the GPU's own virtual address space, so the doorbell page has to be mapped there. The user-mode aperture gets allocated with a flag that makes it mappable from the GPU side, then mapped into the GPU's address space. The kernel gets that GPU address plus `0x90`. The store goes to the doorbell over the GPU's internal path, and no transaction was seen leaving the card over PCIe.

## Getting It to Run

As with everything at this level, the Xid codes were the debugger.

The first attempt patched a launch descriptor captured from a real CUDA launch. It faulted immediately, with the GPU's scheduler hitting address zero, an Xid 31. Captured descriptors carry state that only makes sense in CUDA's context. Building the descriptor from scratch, with field meanings guided by the open-source Mesa NVK driver, fixed it.

The second problem was an address collision. NVK's default window for shared memory overlapped the scratch memory the experiment was using, and the kernel faulted inside the SM with an Xid 13. Moving the window out of the way fixed it.

After that, a test cell changed from `0xcafebabe` to `0xdeadbeef`, showing the thread had run and stored. Then came the full chain: a 4 MiB pattern moved from GPU memory to host memory, with the doorbell rung by an SM and no Xids.

The next step is the obvious one: have the GPU write the whole submission itself. That means the command, the ring entry, `GPPut` and the doorbell. At that point the CPU isn't in the data path at all. It set things up once, as in Part 3, and then the GPU decides what moves and when.

## This Isn't Just a Lab Trick

Nobody will ship hand-written SASS and hand-built launch descriptors, and this exact code only runs on one GPU generation. As an experiment it's narrow.

The direction isn't. Some of it is already in products. GPUDirect RDMA lets a NIC read and write GPU memory directly, without staging data in host RAM. GPUDirect Storage does the same for NVMe. GPU-initiated networking libraries let kernels send and receive over the fabric themselves, because waiting for the CPU to ring a doorbell between compute steps is too slow for tightly coupled workloads. Mixture-of-experts inference, where tokens get routed between GPUs in the middle of a forward pass, is pushing hard in that direction.

Follow that line to its end and the host CPU stops being the place where data movement is decided. It sets things up and then watches.

## Where Policy Has to Live

That breaks an assumption a lot of security designs quietly rely on: the host sees the traffic.

If the GPU and the NIC exchange data directly, an agent on the host OS doesn't see it. A host firewall doesn't see it. An eBPF program on the host's network stack doesn't see it. The data doesn't touch the host's memory or its kernel. The host prepared the path, and then the path stopped needing it.

For a single-tenant training cluster that may be fine. For an AI factory or GPU cloud serving many tenants on shared infrastructure it isn't. Tenant isolation, egress control and the record of who talked to what all need an enforcement point the data actually passes through.

## Two Decisions

When I talk about this with teams building AI platforms, I split it into two decisions, because they keep getting merged.

**Decision one: is there a network boundary in the AI platform?** Something that owns tenancy, ingress, egress, policy and inference-aware routing as one layer. That's a day-zero architecture choice. It doesn't depend on hardware, and it gets made whether or not anyone makes it on purpose. If nobody owns it, it ends up spread across a cloud load balancer, kube-proxy, an ingress controller, a service mesh and some scripts.

**Decision two: where does that boundary run?** On the host CPU, or on a DPU such as BlueField, in the same data path as the GPU traffic.

BNK is built for both answers. In host mode it runs on the server's own CPU and needs no DPU. It can be added to an existing cluster later. In DPU mode it runs on BlueField, beside the GPUs on the same PCIe complex, where it sees traffic that never touches the host.

The two modes have different timelines, and that matters. Host mode is the retrofit path. A DPU has to be in the bill of materials, because you can't fit one into every node of a running fleet after the fact.

GPU-initiated I/O makes decision two matter more over time. The more the data path moves off the host CPU, the more the DPU becomes the last point in the node where a tenant boundary can still be enforced on that traffic.

The same holds for the KV cache from Part 1. Once the cache tier moves off the node, onto NVMe over fabrics or a remote KV store, cache traffic shares the fabric with inference traffic, across tenants. One tenant's prompt prefix is now data crossing a shared network. It needs the same isolation and egress control as everything else, and it's exactly the kind of traffic that will increasingly move GPU to NIC without the host in between.

## Back at the Front Door

That's the series. Here's what I'd take from it.

**Part 1:** the same request can cost very different amounts depending on where it lands, because cache hits from different tiers aren't the same hit. The price is set at the front door.

**Part 2:** behind every pod IP is a host and a GPU, two computers joined by PCIe, talking through a ring and a doorbell, the same pattern that runs NICs and NVMe drives.

**Part 3:** the GPU's copy path costs nothing because setup carries all the cost, 685 calls up front and zero per copy. A gateway in front of the GPUs should be just as strict.

**Part 4:** a hand-built copy ran at two-thirds speed because of an idle clock nobody checked. Routing has to run on measured signals, not on the assumption that identical hardware behaves identically.

**Part 5:** watching the GPU from the wrong place slowed it down by a factor of almost 3,000. Observability belongs in the path, at the point where decisions are made.

**Part 6:** the data path is moving off the host CPU, so policy has to live where the data still goes.

The endpoint picker is the one place in all of this that decides which of those costs each request pays. That's why I think the routing layer has to understand what sits underneath it. The network in front of the GPUs isn't separate from the AI factory. It's where the factory decides how efficiently it runs.

---

**Under the Endpoint Picker**

1. [One Request, Five Prices](/blog/under-the-endpoint-picker-1-one-request-five-prices)
2. [What Sits Behind the Pod IP](/blog/under-the-endpoint-picker-2-what-sits-behind-the-pod-ip)
3. [Pay Once, Then Get Out of the Way](/blog/under-the-endpoint-picker-3-pay-once-then-get-out-of-the-way)
4. [Measure, Don't Assume](/blog/under-the-endpoint-picker-4-measure-dont-assume)
5. [Seeing Without Slowing Down](/blog/under-the-endpoint-picker-5-seeing-without-slowing-down)
6. When the GPU Stops Asking the CPU
