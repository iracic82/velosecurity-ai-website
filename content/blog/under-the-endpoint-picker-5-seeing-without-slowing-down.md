---
title: "Under the Endpoint Picker, Part 5: Seeing Without Slowing Down"
description: "Watch the GPU doorbell from the wrong place and copy bandwidth drops from 55 GB/s to 0.02. Watch it from the right place and nothing changes. Inference observability follows the same rule."
date: "2026-11-03T09:02:00"
author: "Igor Racic"
tags: ["ai-infrastructure", "gpu", "observability", "f5-bnk", "inference"]
---

# Seeing Without Slowing Down

## Under the Endpoint Picker, Part 5

> Part 5 of a six-part series. [Part 3](/blog/under-the-endpoint-picker-3-pay-once-then-get-out-of-the-way) and [Part 4](/blog/under-the-endpoint-picker-4-measure-dont-assume) depended on seeing exactly what CUDA submits to the GPU. This part is about how that seeing works, and what it teaches about observability in front of the GPUs.

Everything in the last two parts depends on one capability: catching each doorbell write and reading the command it points at. The 60-byte copy, the missing clock boost, the count of zero kernel calls per copy all came from watching the hot path closely.

That sounds like it should be easy. The doorbell is one store to a known address. Watch the address, catch the store, read the ring. In practice it took two failed approaches and some unusual hardware tricks. Each failure is a good lesson about observation in general.

## The Obvious Way

The standard tool for "tell me when this memory is written" is page protection. Mark the page holding the doorbell read-only with `mprotect`. When libcuda stores to it, the CPU faults. A signal handler runs, records what it needs, and then lets the store happen.

There's a little dance to replay the store. In the fault handler you make the page writable again and set the CPU's trap flag. The faulting store executes, the trap fires right after it, and the trap handler makes the page read-only again for the next time.

That leaves a choice of where to take the snapshot of the ring and the command.

**Snapshot in the fault handler, before the store.** The doorbell hasn't been written yet, so the GPU hasn't moved. The ring entry and the command are exactly as libcuda left them. The picture is complete and correct.

The cost is enormous. Every copy now runs through a page fault, a signal handler, a single-step trap and a second handler. Copy bandwidth goes from 55 GB/s to 0.02 GB/s, almost 3,000 times slower. You can see everything, but what you're looking at isn't the system you meant to study anymore.

**Snapshot in the trap handler, after the store.** The fault handler does almost nothing, so most of the overhead goes away and the copy runs at full speed.

But the doorbell has already been written. By the time the trap handler runs, the GPU's front end, the PBDMA unit, has already fetched the ring entry. `GPGet` has caught up with `GPPut`, and the ring looks empty. Reading the doorbell register back doesn't help either, because it reads as zero. The GPU reacts to the doorbell faster than a signal handler can start.

So one approach is correct but too slow, and the other is fast but too late. That isn't a tuning problem. Both are watching from the wrong place.

## Catch It Before It Leaves

The approach that works comes from published research on reverse-engineering NVIDIA's command streams. It moves the observer from the application into the kernel, and uses hardware built into every x86 CPU for this exact job.

It has four steps:

1. **Divert.** When a process maps the user-mode aperture that holds the doorbell (a 64 KiB region), a small kernel module backs that mapping with ordinary write-back RAM instead of the real register. The process doesn't know. Its doorbell store now lands in memory the GPU never sees.
2. **Arm.** The module sets x86 debug register DR0 to watch the doorbell's 4 bytes for writes. Debug registers are hardware breakpoints. The check happens in silicon on every store, at no cost until one matches.
3. **Trap.** When libcuda rings the doorbell, the store goes to the shadow RAM and the CPU raises a debug exception right after it, with interrupts off. Because the store hit RAM instead of the register, the GPU hasn't been told anything. The ring is exactly as libcuda left it.
4. **Inspect and forward.** The handler decodes the doorbell token, reads `GPPut` from the channel's control area, finds the newest ring entry, decodes the pushbuffer address and length from it, and logs it all to ftrace. Then it writes the token to the real doorbell register. The GPU wakes up and runs the copy as if nothing happened.

<svg viewBox="0 0 800 250" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="The four-step doorbell catch: divert the doorbell page to shadow RAM, arm a debug register, trap the store before the GPU sees it, then inspect and forward the token to the real doorbell." style="width:100%;height:auto;max-width:760px;display:block;margin:2rem auto;">
  <defs>
    <marker id="p5Arr" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="#00d4ff"/></marker>
  </defs>
  <g font-family="ui-sans-serif,system-ui,sans-serif">
    <rect x="20" y="40" width="170" height="110" rx="10" fill="#0b0f1a" stroke="#334155"/>
    <text x="105" y="72" fill="#e2e8f0" font-size="15" font-weight="700" text-anchor="middle">1. Divert</text>
    <text x="105" y="98" fill="#94a3b8" font-size="12" text-anchor="middle">doorbell page backed</text>
    <text x="105" y="116" fill="#94a3b8" font-size="12" text-anchor="middle">by plain RAM</text>
    <line x1="190" y1="95" x2="216" y2="95" stroke="#00d4ff" stroke-width="1.5" marker-end="url(#p5Arr)"/>
    <rect x="220" y="40" width="170" height="110" rx="10" fill="#0b0f1a" stroke="#334155"/>
    <text x="305" y="72" fill="#e2e8f0" font-size="15" font-weight="700" text-anchor="middle">2. Arm</text>
    <text x="305" y="98" fill="#94a3b8" font-size="12" text-anchor="middle">x86 debug register</text>
    <text x="305" y="116" fill="#94a3b8" font-size="12" text-anchor="middle">DR0 on the doorbell</text>
    <line x1="390" y1="95" x2="416" y2="95" stroke="#00d4ff" stroke-width="1.5" marker-end="url(#p5Arr)"/>
    <rect x="420" y="40" width="170" height="110" rx="10" fill="#0d1526" stroke="#00d4ff"/>
    <text x="505" y="72" fill="#00d4ff" font-size="15" font-weight="700" text-anchor="middle">3. Trap</text>
    <text x="505" y="98" fill="#94a3b8" font-size="12" text-anchor="middle">store lands in RAM,</text>
    <text x="505" y="116" fill="#94a3b8" font-size="12" text-anchor="middle">GPU sees nothing yet</text>
    <line x1="590" y1="95" x2="616" y2="95" stroke="#00d4ff" stroke-width="1.5" marker-end="url(#p5Arr)"/>
    <rect x="620" y="40" width="160" height="110" rx="10" fill="#0b0f1a" stroke="#334155"/>
    <text x="700" y="72" fill="#e2e8f0" font-size="15" font-weight="700" text-anchor="middle">4. Forward</text>
    <text x="700" y="98" fill="#94a3b8" font-size="12" text-anchor="middle">decode, log, then</text>
    <text x="700" y="116" fill="#94a3b8" font-size="12" text-anchor="middle">ring the real doorbell</text>
    <text x="400" y="200" fill="#94a3b8" font-size="13" text-anchor="middle">Result: 174 of 174 doorbells decoded, a few µs per trap, copy bandwidth unchanged.</text>
  </g>
</svg>

The ring entry decode is a few lines of bit manipulation. The pushbuffer address is split across the two 32-bit words of the entry, with a 40-bit limit, and the length is a count of 4-byte words.

Result: 174 doorbells in, 174 decoded, none missed. Each trap costs a few microseconds. Copy bandwidth doesn't change, because the copy itself is untouched, and only the doorbell write is delayed.

## The Sharp Edges

It's a research tool, and its limits are instructive too.

There are only four debug registers per CPU, and they're shared by everything on the machine. If something else has claimed them first, such as Xorg or a local model server, the arm step quietly fails. You get an empty trace and no error. The fix is to stop those first, but you have to know to do it.

Hardware breakpoints are per thread. Threads created after arming don't inherit them, so their doorbells slip past.

And the tool found a real bug in its own teardown: a freed mapping still cached after the channel was destroyed. The clue was a fault address ending in `0x208c`, which is the `GPPut` offset inside the channel's control area. Even the debugger needed debugging.

None of that matters for the lesson. What matters is the property that made it work: the observer sits exactly where the event happens, sees it before anyone acts on it, and does nothing on any other path.

## Where to Watch Inference

Inference teams want the same thing from their stack. Which tenant sent this request? How many tokens went in and how many came out? What was the time to first token? Which model, which GPU, did the prefix hit? Why did the router pick that server?

The common answers bolt observers on from the side:

- a sidecar in each model-server pod that intercepts traffic
- a tap or mirror port on the fabric
- scraping the model server's logs and metrics after the fact
- a separate tracing proxy chained into the request path

Each one maps onto one of the two failed doorbell approaches. Sidecars and extra proxies are the first approach: they see the request, and every request pays for an extra hop, an extra copy and an extra queue. Log scraping and fabric taps are the second approach: cheap on the hot path, but they see the request after the routing decision has already been made. They can tell you which GPU served a request. They can't tell you why, or what the alternatives were.

## In the Path, at the Decision

BNK sits on the path of every inference request, because it is the path. It terminates the client connection, so it knows the tenant and the credentials. It applies the firewall and the token budget. It runs the endpoint picker, so it knows every candidate server and the score each one got. It forwards to the chosen pod and sees the response tokens come back.

Recording at that point adds no hop, because the request is already there. It's captured at the moment the decision is made, with the reasons attached: this tenant, this prompt length, these candidates, this prefix location, this choice, this time to first token. That's the equivalent of the debug-register trap. It watches at the exact point the event happens, before anything acts on it, and touches nothing else.

That isn't an argument against model-server metrics. The picker reads them, and they're essential. It's an argument about where the view of a request should be assembled. If you want to understand routing, the router is the only place that saw all the options. If you want to bill tokens per tenant, the gateway is the only place that knows both the tenant and the tokens without joining two data sources afterwards.

The doorbell work shows how big the stakes are. The same observation, from a different place, cost almost 3,000 times the bandwidth. Observability you add after the fact is either slow or late. It has to be built into the path where decisions are made.

## Next

Every part so far has had the CPU doing the asking: building commands, ringing doorbells, waiting on semaphores. Part 6 reverses that. A thread on the GPU rings its own doorbell and starts a copy with no CPU involved. It's an experiment today, but it shows where the data path is going, and it raises a hard question about where policy will have to live.

---

**Under the Endpoint Picker**

1. [One Request, Five Prices](/blog/under-the-endpoint-picker-1-one-request-five-prices)
2. [What Sits Behind the Pod IP](/blog/under-the-endpoint-picker-2-what-sits-behind-the-pod-ip)
3. [Pay Once, Then Get Out of the Way](/blog/under-the-endpoint-picker-3-pay-once-then-get-out-of-the-way)
4. [Measure, Don't Assume](/blog/under-the-endpoint-picker-4-measure-dont-assume)
5. Seeing Without Slowing Down
6. [When the GPU Stops Asking the CPU](/blog/under-the-endpoint-picker-6-when-the-gpu-stops-asking-the-cpu)
