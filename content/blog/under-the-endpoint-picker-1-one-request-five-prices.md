---
title: "Under the Endpoint Picker, Part 1: One Request, Five Prices"
description: "The same prompt can wait half a second or several seconds for its first token, on the same model and the same GPU type. The difference is where the request was sent, and that is decided before any GPU sees it."
date: "2026-11-03T09:06:00"
author: "Igor Racic"
tags: ["ai-infrastructure", "inference", "kv-cache", "f5-bnk", "routing"]
---

# One Request, Five Prices

## Under the Endpoint Picker, Part 1

> This is the first part of a six-part series about what happens to an inference request after the gateway picks a GPU. Part 1 sets out the problem. Parts 2 to 6 go below the pod IP to show where the costs come from, and each one comes back to what that means for the front door.

A customer sends a chat request to a pool of eight GPUs. All eight run the same model, from the same container image, on the same hardware. Any of them can answer.

On paper, that makes routing the easy part. Pick one, send it, done. Round robin was built for exactly this, and for web traffic it works fine.

In practice the eight aren't equal, because each one remembers different things. One of them already has most of this request's work done and sitting in memory. Another has it on a local SSD. A third has never seen anything like it. Sending the request to the right one is the difference between a first token in half a second and a first token in several seconds.

This part explains why, and what the gateway has to know to get it right.

## Two Passes and Something Left Over

An LLM answers a request in two passes.

Prefill reads the whole prompt at once. Every token of the system prompt, the chat history, the attached document and the user's question goes through the model in one big parallel pass. It's heavy on compute, and it's what sets time to first token. On a long prompt it takes seconds.

Decode then produces the answer one token at a time. Each step is small but has to read a lot of memory, so decode is limited by memory bandwidth, not compute. It sets how fast the answer streams.

Prefill leaves something behind: the KV cache. It holds the attention keys and values for every token of the prompt, and decode reads it on every step. Without it, the model would have to reprocess the whole prompt for each new token.

Here's the part that matters for routing. If you keep that cache after the request ends, the next request that starts with the same text can skip most of its prefill. The model picks up from the cached state and only processes what's new.

That's prefix caching, and real traffic is full of shared prefixes:

- a long system prompt that every request to a product carries
- the earlier turns of a chat, resent with every new message
- a document that a whole team is asking questions about
- an agent's tool definitions and instructions, sent on every step of a loop

For chat and agent traffic, most of the time-to-first-token savings in a modern serving stack come from this. An agent loop sends a near-identical prompt dozens of times with a few hundred new tokens at the end. With a cache hit each step is cheap. Without one, each step pays the full prefill again.

## Why the Cache Doesn't Stay on the GPU

The catch is size. Every request has its own KV cache, and it grows with the length of the context. On a large model, a hundred concurrent users can need around 20 GB of cache between them. That's on top of the model weights, in the same GPU memory.

So GPU memory fills up, and something has to give. Either the server evicts cache and recomputes later, or it pushes the cache down into memory that's cheaper and bigger, and slower.

The second option is now standard. Engines such as LMCache sit underneath vLLM or SGLang and manage the spill. The layout looks like this:

| Tier | Where it lives | How it gets back to the GPU |
|---|---|---|
| HBM | GPU memory | it's already there |
| L1 | a pool of host DRAM owned by the cache engine | copied over PCIe |
| L2 | pluggable: local NVMe, raw block device, object storage, remote KV store | read from storage, then copied over PCIe |

When the engine wants to keep cache, it gathers a batch of KV blocks out of GPU memory over CUDA IPC or shared memory and packs them into one chunk in host DRAM. Under memory pressure, L1 hands chunks down to the L2 backend. Chunks are typically 10 to 30 MiB, and the chunk size sets the request size every storage backend sees.

L2 backends plug in without changing the engine. A backend implements store, load, lookup and delete on chunk keys, gets a JSON config, and runs inside the engine's pool of worker threads. That's how people are trying faster storage paths without forking anything.

## Can Software Make the Disk Faster?

The obvious tuning question for the NVMe tier is kernel bypass. SPDK drives NVMe from user space with poll-mode drivers and no kernel block layer. That's the same idea as RDMA, applied to storage. If the kernel is overhead, take it out.

A public benchmark of an SPDK backend for LMCache tested exactly that on an AWS `c5d.metal` instance with one local NVMe, against the standard `O_DIRECT` file backend:

| Request size | SPDK vs kernel O_DIRECT | What limits it |
|---|---|---|
| 256 KiB, queue depth 1 and 4 | SPDK 2 to 10% faster, with better store tail latency | the software path |
| 10 to 30 MiB, queue depth 1 | no difference: both at about 1.6 GiB/s read and 0.75 GiB/s write | the drive |

At small requests, bypass helps a little. At the chunk sizes the cache actually uses, both paths hit the same wall, which is what one NVMe can do. The SSD sets the speed whatever software drives it.

Bypass may still earn its place on CPU cost per GiB/s, which wasn't measured yet, or across several drives in a RAID. There's also interesting work on NVMe drives with a key-value command set, where the drive itself holds the key-to-data mapping and the host stops keeping one. None of that changes the basic shape. You can't tune your way out of a storage tier. You can only avoid needing it.

## Five Prices for the Same Request

Now do the sums for one request whose prefix is cached somewhere in the pool.

Reading one 20 MiB chunk off that NVMe at 1.6 GiB/s takes about 12 ms. Then it still has to cross PCIe into GPU memory before decode can use it. A long prefix is several chunks.

From host DRAM, the same chunk is a PCIe copy and nothing else. That's a small fraction of the NVMe time.

From HBM, the cache is already in place. Decode can start right away.

If the cache sits in a remote KV store, the read crosses the network fabric first, competes with everything else on that fabric, and lands on whatever drive the store uses. Then it crosses PCIe.

On a miss, the GPU runs the full prefill. On a long prompt that's seconds of compute.

<svg viewBox="0 0 800 430" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="One request at the gateway can land in five places: an HBM hit, a host DRAM hit, a local NVMe hit, a remote KV store hit, or a miss with full prefill. Each costs more than the one above it." style="width:100%;height:auto;max-width:760px;display:block;margin:2rem auto;">
  <defs>
    <marker id="p1Arr" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="#00d4ff"/></marker>
  </defs>
  <g font-family="ui-sans-serif,system-ui,sans-serif">
    <rect x="20" y="170" width="160" height="90" rx="10" fill="#0d1526" stroke="#00d4ff"/>
    <text x="100" y="206" fill="#00d4ff" font-size="16" font-weight="700" text-anchor="middle">Gateway</text>
    <text x="100" y="230" fill="#94a3b8" font-size="13" text-anchor="middle">picks 1 of 8 GPUs</text>
    <line x1="180" y1="215" x2="244" y2="62" stroke="#00d4ff" stroke-width="1.4" stroke-opacity="0.7" marker-end="url(#p1Arr)"/>
    <line x1="180" y1="215" x2="244" y2="138" stroke="#00d4ff" stroke-width="1.4" stroke-opacity="0.7" marker-end="url(#p1Arr)"/>
    <line x1="180" y1="215" x2="244" y2="214" stroke="#00d4ff" stroke-width="1.4" stroke-opacity="0.7" marker-end="url(#p1Arr)"/>
    <line x1="180" y1="215" x2="244" y2="290" stroke="#00d4ff" stroke-width="1.4" stroke-opacity="0.7" marker-end="url(#p1Arr)"/>
    <line x1="180" y1="215" x2="244" y2="366" stroke="#00d4ff" stroke-width="1.4" stroke-opacity="0.7" marker-end="url(#p1Arr)"/>
    <rect x="250" y="34" width="530" height="56" rx="8" fill="#0b0f1a" stroke="#334155"/>
    <text x="272" y="58" fill="#e2e8f0" font-size="15" font-weight="700">HBM hit</text>
    <text x="272" y="78" fill="#94a3b8" font-size="13">Cache already on the GPU. Decode starts right away.</text>
    <rect x="250" y="110" width="530" height="56" rx="8" fill="#0b0f1a" stroke="#334155"/>
    <text x="272" y="134" fill="#e2e8f0" font-size="15" font-weight="700">Host DRAM hit</text>
    <text x="272" y="154" fill="#94a3b8" font-size="13">Chunks copied back to the GPU over PCIe.</text>
    <rect x="250" y="186" width="530" height="56" rx="8" fill="#0b0f1a" stroke="#334155"/>
    <text x="272" y="210" fill="#e2e8f0" font-size="15" font-weight="700">Local NVMe hit</text>
    <text x="272" y="230" fill="#94a3b8" font-size="13">About 12 ms to read each 20 MiB chunk, then PCIe.</text>
    <rect x="250" y="262" width="530" height="56" rx="8" fill="#0b0f1a" stroke="#334155"/>
    <text x="272" y="286" fill="#e2e8f0" font-size="15" font-weight="700">Remote KV store hit</text>
    <text x="272" y="306" fill="#94a3b8" font-size="13">Across the fabric, off a remote drive, then PCIe.</text>
    <rect x="250" y="338" width="530" height="56" rx="8" fill="#0b0f1a" stroke="#7c3aed"/>
    <text x="272" y="362" fill="#c4b5fd" font-size="15" font-weight="700">Miss</text>
    <text x="272" y="382" fill="#94a3b8" font-size="13">Full prefill. Seconds of GPU compute on a long prompt.</text>
  </g>
</svg>

Four of those five count as a cache hit. The gap between the best and worst of them is larger than the gap between some hits and the miss. "Is it cached?" is the wrong question. "Where is it cached, and what does it cost to get it back?" is the right one.

So the price of a request is set at the front door, before any GPU sees it. The model server can't fix a bad placement. By the time the request lands, the price is already fixed.

## What Goes Wrong With Simple Routing

Round robin ignores all of this. It spreads requests evenly by count, so a request with a hot prefix in HBM on GPU 3 is just as likely to land on GPU 6, which has to recompute it. It also treats a 128K-token summary and a two-word greeting as the same unit of work, which they very much aren't.

Least connections is a bit better. It notices that one server is busy. But it still counts requests rather than work, and it knows nothing about the cache.

The natural next step is prefix affinity: hash the prefix, and send it to the server that last served it. That's a real improvement, and it brings two new failure modes.

The first is tier blindness. A picker that only asks "does this server have the prefix?" counts an NVMe hit the same as an HBM hit. It will send a request to a server that has to pull 12 ms per chunk off an SSD while the server next to it holds the same prefix in GPU memory.

The second is hot-spotting. Popular prefixes are popular. If every request carrying the company-wide system prompt goes to the one server that cached it first, that server's queue grows until queueing costs more than the prefill you saved. Now you have one overloaded GPU and seven idle ones, and the cache made it worse.

Getting this right means weighing two things against each other on every request: how much prefill a server can save, and how long the request will wait behind that server's existing decode work.

## What the BNK Endpoint Picker Does

In BIG-IP Next for Kubernetes (BNK), the model pool is a standard Gateway API `InferencePool`, and it points at F5's Endpoint Picker (`F5EPP`). The picker runs inline on every request through the gateway's data path, using the same external-processing hook the Gateway API Inference Extension defines. With `failureMode: FailClose`, nothing silently falls back to round robin if the picker isn't there.

The picker doesn't guess what's cached. With NVIDIA Dynamo it reads KV-cache events from the serving stack as they happen, so it knows which server holds which prefix before the request arrives. It also reads the servers' own metrics.

With that, it scores each request on the things this part has been about. Load is counted in tokens, not requests, so a long prompt weighs what it costs. Each server's capacity is measured as how fast it's actually draining its decode work, instead of assuming identical GPUs behave identically. A cache hit is valued by the measured cost of fetching it from the tier it's in, so an HBM hit and an NVMe hit aren't treated as equal. And the trade-off between reusing cache and spreading load comes from numbers derived from the hardware, not weights someone set once and forgot.

The result is a request placed where its prefix is cheapest to reach, without piling everything onto whoever cached it first. The cache hit rate barely changes between a naive policy and this one. What changes is which hits the requests get.

## What the Rest of This Series Covers

That explains the problem at the front door. It doesn't explain why the prices are what they are. Why is a DRAM hit cheap? What actually happens when "the data crosses PCIe"? Why can't the host just copy faster?

To answer that, the next four parts go under the pod IP, into how a CPU actually drives an NVIDIA GPU. Each one comes back to what it means for routing and for the network in front of the GPUs.

- **Part 2** looks at what sits behind the pod IP: two computers, a ring buffer and a doorbell.
- **Part 3** shows why the GPU's copy path costs almost nothing once setup is done, and why a gateway should work the same way.
- **Part 4** follows a hand-built GPU copy that ran at two-thirds of CUDA's speed, and what the cause says about round robin.
- **Part 5** looks at why watching the GPU from the wrong place destroys performance, and where inference observability belongs.
- **Part 6** shows a GPU thread starting its own data transfer without the CPU, and asks where policy lives once the host steps out of the data path.

---

**Under the Endpoint Picker**

1. One Request, Five Prices
2. [What Sits Behind the Pod IP](/blog/under-the-endpoint-picker-2-what-sits-behind-the-pod-ip)
3. [Pay Once, Then Get Out of the Way](/blog/under-the-endpoint-picker-3-pay-once-then-get-out-of-the-way)
4. [Measure, Don't Assume](/blog/under-the-endpoint-picker-4-measure-dont-assume)
5. [Seeing Without Slowing Down](/blog/under-the-endpoint-picker-5-seeing-without-slowing-down)
6. [When the GPU Stops Asking the CPU](/blog/under-the-endpoint-picker-6-when-the-gpu-stops-asking-the-cpu)
