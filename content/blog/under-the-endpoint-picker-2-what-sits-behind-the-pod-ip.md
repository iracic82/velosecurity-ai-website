---
title: "Under the Endpoint Picker, Part 2: What Sits Behind the Pod IP"
description: "A pod IP in an inference pool looks like one endpoint. Behind it are two computers joined by PCIe, talking through a ring buffer and a single register write. The same pattern runs NICs, NVMe drives and the data path in front of the cluster."
date: "2026-11-03T09:05:00"
author: "Igor Racic"
tags: ["ai-infrastructure", "gpu", "pcie", "f5-bnk", "inference"]
---

# What Sits Behind the Pod IP

## Under the Endpoint Picker, Part 2

> Part 2 of a six-part series. [Part 1](/blog/under-the-endpoint-picker-1-one-request-five-prices) showed that one request can cost very different amounts depending on where its KV cache sits. This part looks at what "copied back over PCIe" actually means.

In Part 1, a host DRAM cache hit was cheap because the data is "copied back to the GPU over PCIe". That phrase hides a whole mechanism, and I want to take it apart, because it's the same one that runs network cards, NVMe drives and the data path in front of the cluster. Once you've seen it on a GPU, you see it everywhere.

From the gateway, a model server is a pod IP in an `InferencePool`. One address, one endpoint. Behind that address there are at least two computers.

## A GPU Is Another Computer

A discrete GPU isn't a coprocessor bolted onto the CPU. It's a separate machine that happens to sit at the far end of a PCIe link.

Take an H100. It has its own processors, the streaming multiprocessors (SMs) that run kernels. It has 80 GB of HBM that the host CPU can't address directly. It has its own MMU and its own page tables, so GPU virtual addresses mean nothing to the host unless someone sets up a matching mapping. And it has a RISC-V core running NVIDIA's GSP firmware, which handles most of the resource management that used to live in the host driver.

The host has its own CPU, its own DRAM and its own page tables. The two don't share a memory bus. Everything that passes between them goes over PCIe.

## Three Rules of the Link

PCIe has rules that shape everything built on it. Three of them explain most of this series.

**Every transfer has an initiator.** Either the CPU reaches out and touches the GPU, or the GPU reaches out and touches host memory. Nothing moves on its own. The side that starts a transfer pays for it.

**Writes are cheap and reads are expensive.** A write is "posted": the CPU sends it and moves on without waiting. A read is "non-posted": the CPU sends a request and stalls until the completion comes back, which takes 500 ns to a microsecond. At PCIe Gen5 x16, roughly 64 GB/s each way, a microsecond spent waiting is a lot of bandwidth thrown away. Good drivers almost never read across the bus on the hot path. They write, and let the other side write back.

**The two sides order memory differently.** When the CPU finishes a write, the GPU may not see it yet. It may still be sitting in a buffer on the CPU side, or reordered behind a later write. "I wrote it" and "they can see it" are different statements. Every handoff between the two needs a fence.

## Two Windows

The GPU exposes two regions of its address space to the host. They're called BARs, for base address registers.

**BAR0** holds control registers. Configuration, status, and, as we'll see, the doorbell.

**BAR1** is a window into GPU memory. It used to be 256 MB. With Resizable BAR it can cover most or all of the HBM. Through BAR1, the CPU can read and write GPU memory as if it were ordinary memory.

So why not just copy data that way? Because it's slow. Writes through BAR1 are memory-mapped I/O (MMIO). They're uncached, and each store is its own small PCIe transaction. MMIO tops out around 1 GB/s, since moving one megabyte means 262,144 separate 4-byte writes. That's fine for flipping a control bit. It's useless for moving a model's weights or a KV cache.

Bulk data goes the other way. The GPU has copy engines, dedicated DMA hardware that reaches into host memory and moves data at tens of GB/s without using any CPU time. The CPU doesn't copy anything. It describes the copy and asks the GPU to do it.

| | MMIO | DMA |
|---|---|---|
| Who starts it | the CPU | the GPU's copy engine |
| Typical speed | around 1 GB/s | tens of GB/s |
| Used for | control registers, the doorbell | moving data |
| CPU cost | one instruction per write | close to zero |

## How the CPU Asks

Asking takes a small amount of structure. There are two levels.

The first level is the command. The CPU writes a short list of copy-engine "methods" into a buffer in memory, called a pushbuffer. A copy is a handful of methods: source address, destination address, length, launch, and a semaphore release so the CPU can tell when it's done.

The second level is a ring called the GPFIFO. Each entry is 8 bytes and points at a pushbuffer: its address and its length. The CPU owns the ring's write index, called `GPPut`. The GPU owns its read index, `GPGet`. When the two are equal, the ring is empty.

Writing an entry and moving `GPPut` forward doesn't wake the GPU up. The GPU isn't polling host memory. The CPU has to tell it, and it does that by ringing a doorbell: one 32-bit store of a channel token to a register in BAR0. On Hopper the doorbell sits at offset `0x90` in a 64 KiB user-mode aperture.

<svg viewBox="0 0 800 300" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="The CPU writes a command into a pushbuffer, an entry into the GPFIFO ring, moves GPPut forward, then writes one token to the doorbell register. The GPU's front end then fetches the entry and the command, and its copy engine runs the DMA." style="width:100%;height:auto;max-width:760px;display:block;margin:2rem auto;">
  <defs>
    <marker id="p2Arr" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="#00d4ff"/></marker>
  </defs>
  <g font-family="ui-sans-serif,system-ui,sans-serif">
    <text x="20" y="28" fill="#64748b" font-size="13" font-weight="700" letter-spacing="1">CPU SIDE</text>
    <text x="20" y="196" fill="#64748b" font-size="13" font-weight="700" letter-spacing="1">GPU SIDE</text>
    <line x1="20" y1="168" x2="780" y2="168" stroke="#334155" stroke-dasharray="5 5"/>
    <text x="780" y="162" fill="#64748b" font-size="12" text-anchor="end">PCIe</text>
    <rect x="20" y="44" width="170" height="80" rx="8" fill="#0b0f1a" stroke="#334155"/>
    <text x="105" y="74" fill="#e2e8f0" font-size="14" font-weight="700" text-anchor="middle">1. Command</text>
    <text x="105" y="96" fill="#94a3b8" font-size="12" text-anchor="middle">methods in a</text>
    <text x="105" y="112" fill="#94a3b8" font-size="12" text-anchor="middle">pushbuffer</text>
    <rect x="215" y="44" width="170" height="80" rx="8" fill="#0b0f1a" stroke="#334155"/>
    <text x="300" y="74" fill="#e2e8f0" font-size="14" font-weight="700" text-anchor="middle">2. Ring entry</text>
    <text x="300" y="96" fill="#94a3b8" font-size="12" text-anchor="middle">8 bytes in the</text>
    <text x="300" y="112" fill="#94a3b8" font-size="12" text-anchor="middle">GPFIFO</text>
    <rect x="410" y="44" width="170" height="80" rx="8" fill="#0b0f1a" stroke="#334155"/>
    <text x="495" y="74" fill="#e2e8f0" font-size="14" font-weight="700" text-anchor="middle">3. GPPut</text>
    <text x="495" y="96" fill="#94a3b8" font-size="12" text-anchor="middle">write index moved</text>
    <text x="495" y="112" fill="#94a3b8" font-size="12" text-anchor="middle">forward, fenced</text>
    <rect x="605" y="44" width="175" height="80" rx="8" fill="#0d1526" stroke="#00d4ff"/>
    <text x="692" y="74" fill="#00d4ff" font-size="14" font-weight="700" text-anchor="middle">4. Doorbell</text>
    <text x="692" y="96" fill="#94a3b8" font-size="12" text-anchor="middle">one 32-bit store</text>
    <text x="692" y="112" fill="#94a3b8" font-size="12" text-anchor="middle">to BAR0 + 0x90</text>
    <line x1="692" y1="124" x2="692" y2="208" stroke="#00d4ff" stroke-width="1.5" marker-end="url(#p2Arr)"/>
    <rect x="510" y="212" width="270" height="70" rx="8" fill="#0b0f1a" stroke="#334155"/>
    <text x="645" y="240" fill="#e2e8f0" font-size="14" font-weight="700" text-anchor="middle">5. Front end fetches</text>
    <text x="645" y="262" fill="#94a3b8" font-size="12" text-anchor="middle">reads the entry, then the command</text>
    <line x1="510" y1="247" x2="400" y2="247" stroke="#00d4ff" stroke-width="1.5" marker-end="url(#p2Arr)"/>
    <rect x="130" y="212" width="265" height="70" rx="8" fill="#0b0f1a" stroke="#334155"/>
    <text x="262" y="240" fill="#e2e8f0" font-size="14" font-weight="700" text-anchor="middle">6. Copy engine</text>
    <text x="262" y="262" fill="#94a3b8" font-size="12" text-anchor="middle">DMA at tens of GB/s</text>
  </g>
</svg>

The doorbell write is the only thing that crosses PCIe as a signal. Everything else is the CPU writing into memory, and the GPU reading it once it has been told to look.

Completion comes back the same way in reverse. At the end of the copy, the GPU writes a 4-byte value the CPU chose to an address the CPU chose. That's the semaphore. The CPU watches that address. A flag on the release makes sure every earlier write from the copy has landed before the semaphore value does, so when the CPU sees it, the data is really there.

## How Long Each Part Takes

For a 4 MiB copy, all of the submission work together (command, entry, index, doorbell) takes about 350 ns. The transfer itself takes about 130 µs. Asking costs roughly 1/370th of doing.

That ratio is the whole point of the design. The expensive part, moving data, is done by hardware that's good at it. The CPU's part is a handful of stores. Part 3 shows how far that goes: once setup is done, the operating system isn't involved in a copy at all.

## The Fence Rule

There's one rule you can't skip. The BAR mappings the CPU uses are write-combined, which means the CPU is allowed to buffer stores and send them in a different order than they were written. That's good for throughput and dangerous for correctness.

If the doorbell overtakes the ring entry, the GPU's front end wakes up, reads an entry that isn't fully written yet, and fetches garbage. You get Xid 32, NVIDIA's error for a bad command stream. The worst part is that it only happens sometimes, under load, on some machines, which makes it miserable to chase.

The fix is a store fence after each step: after the pushbuffer, after the ring entry, after `GPPut`, and after the doorbell. Four fences, every time. Leave one out and the system works until it doesn't.

## The Pattern Is Everywhere

Queue, doorbell, completion. If you've written a NIC driver or worked with NVMe, you've seen this before.

An NVMe drive has submission queues and completion queues, and the host rings a doorbell register to say new commands are waiting. An RDMA NIC has work queues and completion queues, and the application posts work and rings a doorbell. A SmartNIC or DPU moves packets the same way. The GPU is one more device on the same pattern, with a copy engine where the NIC has a transport engine.

That matters for how we picture an AI node. A GPU server isn't one fast box. It's a host and several GPUs, each with its own memory and its own engines, joined by PCIe links where reads are slow and every handoff needs a fence. The fabric to the next node is another link of the same kind, with the NIC doing the same doorbell dance. GPUDirect RDMA exists to let the NIC and the GPU skip the host's memory in that dance.

## What It Means at the Front Door

From the gateway, the inference pool is a list of pod IPs. Behind each one is this machinery: a host, a GPU, a queue and a doorbell, and a cache split between GPU memory, host DRAM and disk.

When the endpoint picker sends a request to a server whose prefix is in host DRAM, it's choosing a few PCIe copies before decode can start. When it sends one to a server that has the prefix in HBM, it's choosing none. When it sends one to a server with no prefix at all, it's choosing a full prefill. None of that is visible in a pod IP, a connection count or a round-robin counter.

That's why BNK's picker reads cache and load signals from the serving stack instead of treating the pool as a list of interchangeable addresses. The pod IP is where the network ends. It isn't where the cost ends.

It's also why I think of BNK's data path the same way as the GPU's. TMM moves packets with queues and doorbells, does as little as possible per packet, and leaves the expensive decisions to setup. Part 3 shows how strict NVIDIA's own stack is about that split, and why the gateway in front should be just as strict.

---

**Under the Endpoint Picker**

1. [One Request, Five Prices](/blog/under-the-endpoint-picker-1-one-request-five-prices)
2. What Sits Behind the Pod IP
3. [Pay Once, Then Get Out of the Way](/blog/under-the-endpoint-picker-3-pay-once-then-get-out-of-the-way)
4. [Measure, Don't Assume](/blog/under-the-endpoint-picker-4-measure-dont-assume)
5. [Seeing Without Slowing Down](/blog/under-the-endpoint-picker-5-seeing-without-slowing-down)
6. [When the GPU Stops Asking the CPU](/blog/under-the-endpoint-picker-6-when-the-gpu-stops-asking-the-cpu)
