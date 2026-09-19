---
title: "GPUs Get Slower Under Load. Living Compute Changes Under Load."
description: "This is Part 1 of a series reporting a lab study that placed retrying AI agents in front of a simulated GPU backend and a digital twin of living neural tissue, with a gateway that could set the pace of stimulation. The twin follows trends seen in recordings of real organoids, every figure here comes from that software model, and Part 2 will report the analysis of those recordings."
date: "2026-09-19"
author: "Igor Racic"
tags: ["biocomputing", "organoid-intelligence", "agent-security", "scheduling", "digital-twin"]
image: "/blog/living-compute-under-load-og.png"
---

# GPUs Get Slower Under Load. Living Compute Changes Under Load.

## Part 1: An Agent Workload Study with a Digital Twin of Living Neural Tissue

> This is the first article in a series, and it reports a working prototype built on a software digital twin together with the research question it raises, without presenting measurements from living tissue. The twin was reshaped once already, when recordings of real organoids showed that my first model had the wrong picture of how tissue declines, and I describe that correction below. Part 2 will report the analysis of those recordings in its own right.

## Abstract

I built a small lab experiment in which software agents with a conventional retry policy sent classification requests through a single gateway to two very different backends. One was a simulated GPU inference service, and the other was a digital twin of living neural tissue on a microelectrode array (MEA). The twin models stimulation, evoked spiking and, for each organoid on the array, a remaining life that drains with time and with every stimulation pulse and that rest does not return, a behavior it takes from trends in recordings of real organoids. A simple readout then turns the twin's spikes into classifications for the agents. Without protection, three agents completed 111 classifications in 45 seconds at 59% accuracy and spent about 13% of the tissue's remaining life doing it. When the gateway enforced a 2.5 second interval between stimulations of the same array and answered early requests with HTTP 429 and a Retry-After header, the same agents completed 12 classifications and spent under 2%. The interval did not make an answer cheaper, since each classification cost a similar number of pulses either way, and twelve classifications are too few to say whether it made answers better. What it changed was the pace at which a finite, shared substrate was used up, and who had decided that pace. All of these figures are outputs of a deliberately simplified software model, so this first part offers a prototype and a question rather than evidence about living tissue.

## Introduction

Across my career as a network architect, security engineer, software developer and AI builder, compute has had a reassuring property, which is that it does not care how often it is asked to do something. Send a GPU one request or a thousand and the infrastructure problem changes shape, with longer queues, rising latency, exhausted memory and higher power draw, until requests are throttled or dropped. The accelerator still computes the thousandth request exactly as it computed the first, and much of our scheduling practice quietly depends on that property.

Living neural tissue does not share that property, because its response to a stimulus depends partly on what has been done to it recently. Neurons adapt to repeated input and can reorganize their connections, and those history dependent dynamics are what make biological networks computationally interesting. If such tissue ever sits behind an API, a request stops being a pure consumer of capacity and becomes something that can change the system serving it, which matters more now that the callers are increasingly autonomous agents.

<svg viewBox="0 0 800 320" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Conventional compute turns a request into a response and leaves the hardware unchanged, while living compute turns a request into a stimulation whose effect on the tissue carries into the next request" style="width:100%;height:auto;max-width:760px;display:block;margin:2rem auto;">
  <defs>
    <marker id="lc1ArrGray" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="#475569"/></marker>
    <marker id="lc1ArrCyan" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="#00d4ff"/></marker>
    <marker id="lc1ArrPurple" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="#7c3aed"/></marker>
  </defs>
  <g font-family="ui-sans-serif,system-ui,sans-serif" text-anchor="middle">
    <text x="400" y="26" fill="#64748b" font-size="13" font-weight="700" letter-spacing="1">CONVENTIONAL COMPUTE</text>
    <rect x="12" y="40" width="176" height="60" rx="8" fill="#0b0f1a" stroke="#334155"/>
    <text x="100" y="66" fill="#94a3b8" font-size="13">Request</text>
    <text x="100" y="86" fill="#64748b" font-size="11">from the agent</text>
    <line x1="188" y1="70" x2="202" y2="70" stroke="#475569" stroke-width="1.5" marker-end="url(#lc1ArrGray)"/>
    <rect x="206" y="40" width="176" height="60" rx="8" fill="#0b0f1a" stroke="#334155"/>
    <text x="294" y="66" fill="#94a3b8" font-size="13">Computation</text>
    <text x="294" y="86" fill="#64748b" font-size="11">kernels on silicon</text>
    <line x1="382" y1="70" x2="396" y2="70" stroke="#475569" stroke-width="1.5" marker-end="url(#lc1ArrGray)"/>
    <rect x="400" y="40" width="176" height="60" rx="8" fill="#0b0f1a" stroke="#334155"/>
    <text x="488" y="66" fill="#94a3b8" font-size="13">Response</text>
    <text x="488" y="86" fill="#64748b" font-size="11">tokens or tensors</text>
    <text x="682" y="66" fill="#64748b" font-size="12">hardware state</text>
    <text x="682" y="84" fill="#64748b" font-size="12">unchanged</text>
    <text x="400" y="144" fill="#00d4ff" font-size="13" font-weight="700" letter-spacing="1">LIVING COMPUTE</text>
    <rect x="12" y="158" width="176" height="60" rx="8" fill="#0b0f1a" stroke="#00d4ff" stroke-opacity="0.55"/>
    <text x="100" y="184" fill="#e2e8f0" font-size="13">Request</text>
    <text x="100" y="204" fill="#64748b" font-size="11">from the agent</text>
    <line x1="188" y1="188" x2="202" y2="188" stroke="#00d4ff" stroke-width="1.5" stroke-opacity="0.8" marker-end="url(#lc1ArrCyan)"/>
    <rect x="206" y="158" width="176" height="60" rx="8" fill="#0b0f1a" stroke="#00d4ff" stroke-opacity="0.55"/>
    <text x="294" y="184" fill="#e2e8f0" font-size="13">Stimulation</text>
    <text x="294" y="204" fill="#64748b" font-size="11">pulses into tissue</text>
    <line x1="382" y1="188" x2="396" y2="188" stroke="#00d4ff" stroke-width="1.5" stroke-opacity="0.8" marker-end="url(#lc1ArrCyan)"/>
    <rect x="400" y="158" width="176" height="60" rx="8" fill="#0b0f1a" stroke="#00d4ff" stroke-opacity="0.55"/>
    <text x="488" y="184" fill="#e2e8f0" font-size="13">Biological response</text>
    <text x="488" y="204" fill="#64748b" font-size="11">evoked spikes, read out</text>
    <line x1="576" y1="188" x2="590" y2="188" stroke="#00d4ff" stroke-width="1.5" stroke-opacity="0.8" marker-end="url(#lc1ArrCyan)"/>
    <rect x="594" y="158" width="176" height="60" rx="8" fill="#0b0f1a" stroke="#7c3aed" stroke-opacity="0.8"/>
    <text x="682" y="184" fill="#c4b5fd" font-size="13">Changed tissue state</text>
    <text x="682" y="204" fill="#64748b" font-size="11">wear, adaptation</text>
  </g>
  <path d="M682 218 C 682 290, 100 290, 100 222" fill="none" stroke="#7c3aed" stroke-width="1.5" stroke-opacity="0.8" marker-end="url(#lc1ArrPurple)"/>
  <text x="391" y="304" fill="#c4b5fd" font-size="12" text-anchor="middle" font-family="ui-sans-serif,system-ui,sans-serif">the changed state shapes the response to the next request</text>
</svg>

The figure above summarizes the distinction that motivated this study. With conventional compute, load affects how long a caller waits but not what the caller receives. With living compute, every request is also a stimulation, and the state it leaves behind shapes how the tissue responds to whatever arrives next.

## Background

Brain organoids are small cultures of neurons and other neural cells, grown in three dimensions from stem cells. When an organoid sits on a microelectrode array (MEA), electrical stimulation can be delivered through selected electrodes and the resulting activity recorded across the array as spikes. The interface starts to look computational, since an input is encoded as a stimulation pattern, transformed by the tissue's neural dynamics, and recovered as spikes that software converts into a digital readout.

Smirnova et al. (2023) describe organoid intelligence, or OI, as a research program aimed at developing biocomputing with brain organoids. Its goal is to study whether biological neural networks can become useful computational substrates, not to build a miniature brain. One practical route is reservoir computing, in which a fixed nonlinear system projects inputs into a rich internal state and only a simple readout is trained. Cai et al. (2023) demonstrated this with Brainoware, a brain organoid on a high density multielectrode array that served as the reservoir for speech recognition and for predicting a nonlinear equation.

It is worth stating plainly that current organoid computing runs tiny research workloads and is not a competitor to GPUs today. Operational characteristics make a more useful comparison, because a GPU is engineered to be reproducible and interchangeable within a pool. A biological network is stateful instead, and its behavior depends partly on its own history, so a scheduler has no basis for treating two pieces of tissue as interchangeable members of one pool.

## Research Question

Published work already addresses whether organoids can compute, so that was not my question. I wanted to know what happens to infrastructure assumptions when the thing behind the API is alive, and specifically when AI agents with ordinary retry behavior sit in front of it. Against conventional compute a retry costs only latency and some accelerator time, but against a stateful substrate it might alter the resource that produces the answer. Framed as an experiment, the question is whether agent retries create a feedback loop that degrades correctness as well as latency. If they do, a second question is whether a mechanism in the request path, rather than in each agent, can interrupt that loop. I also wanted to see which signals a scheduler would need to manage such a backend safely.

## Method

No living tissue was used at any point in this study. I built a software digital twin of the biological side, placed a simulated GPU inference service beside it, and put one gateway in front of both. To an agent the two backends were simply different kinds of compute behind one address, while to the gateway they were not alike at all.

<svg viewBox="0 0 800 390" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Three agents send requests to one gateway, which routes inference to a simulated GPU backend and stimulation to a digital twin of neural tissue on two microelectrode arrays, with a pacing interval, bounds checks, cleanup and a stimulation record enforced in the data path" style="width:100%;height:auto;max-width:760px;display:block;margin:2rem auto;">
  <defs>
    <marker id="lc2ArrCyan" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="#00d4ff"/></marker>
  </defs>
  <g font-family="ui-sans-serif,system-ui,sans-serif" text-anchor="middle">
    <text x="95" y="26" fill="#64748b" font-size="12" font-weight="700" letter-spacing="1">AGENTS</text>
    <text x="680" y="26" fill="#64748b" font-size="12" font-weight="700" letter-spacing="1">BACKENDS</text>
    <rect x="20" y="44" width="150" height="44" rx="8" fill="#0b0f1a" stroke="#334155"/>
    <text x="95" y="71" fill="#94a3b8" font-size="13">Agent 1</text>
    <rect x="20" y="104" width="150" height="44" rx="8" fill="#0b0f1a" stroke="#334155"/>
    <text x="95" y="131" fill="#94a3b8" font-size="13">Agent 2</text>
    <rect x="20" y="164" width="150" height="44" rx="8" fill="#0b0f1a" stroke="#334155"/>
    <text x="95" y="191" fill="#94a3b8" font-size="13">Agent 3</text>
    <text x="95" y="232" fill="#64748b" font-size="11">retry while the</text>
    <text x="95" y="248" fill="#64748b" font-size="11">readout is unsure</text>
    <line x1="170" y1="66" x2="296" y2="120" stroke="#00d4ff" stroke-width="1.5" stroke-opacity="0.75" marker-end="url(#lc2ArrCyan)"/>
    <line x1="170" y1="126" x2="296" y2="135" stroke="#00d4ff" stroke-width="1.5" stroke-opacity="0.75" marker-end="url(#lc2ArrCyan)"/>
    <line x1="170" y1="186" x2="296" y2="150" stroke="#00d4ff" stroke-width="1.5" stroke-opacity="0.75" marker-end="url(#lc2ArrCyan)"/>
    <rect x="300" y="90" width="170" height="90" rx="10" fill="#0b0f1a" stroke="#00d4ff" stroke-opacity="0.6"/>
    <text x="385" y="131" fill="#e2e8f0" font-size="14">Gateway</text>
    <text x="385" y="152" fill="#64748b" font-size="11">routes by path</text>
    <rect x="580" y="40" width="200" height="64" rx="8" fill="#0b0f1a" stroke="#00d4ff" stroke-opacity="0.5"/>
    <text x="680" y="68" fill="#e2e8f0" font-size="13">GPU backend</text>
    <text x="680" y="88" fill="#64748b" font-size="11">simulated inference</text>
    <path d="M470 115 L520 115 L520 72 L576 72" fill="none" stroke="#00d4ff" stroke-width="1.5" stroke-opacity="0.75" marker-end="url(#lc2ArrCyan)"/>
    <text x="548" y="64" fill="#64748b" font-size="10">tokens</text>
    <rect x="580" y="140" width="200" height="192" rx="10" fill="#0b0f1a" stroke="#00d4ff" stroke-opacity="0.5"/>
    <text x="680" y="164" fill="#e2e8f0" font-size="13">Neural tissue twin</text>
    <text x="680" y="182" fill="#64748b" font-size="11">software model, no tissue</text>
    <rect x="596" y="196" width="168" height="46" rx="6" fill="#0d1526" stroke="#1e3a4a"/>
    <text x="680" y="215" fill="#e2e8f0" font-size="12">MEA interface</text>
    <text x="680" y="232" fill="#64748b" font-size="10">stimulate and record</text>
    <line x1="636" y1="242" x2="636" y2="256" stroke="#475569" stroke-width="1.5"/>
    <line x1="724" y1="242" x2="724" y2="256" stroke="#475569" stroke-width="1.5"/>
    <rect x="596" y="256" width="80" height="40" rx="6" fill="#0d1526" stroke="#1e3a4a"/>
    <text x="636" y="281" fill="#94a3b8" font-size="12">Array A</text>
    <rect x="684" y="256" width="80" height="40" rx="6" fill="#0d1526" stroke="#1e3a4a"/>
    <text x="724" y="281" fill="#94a3b8" font-size="12">Array B</text>
    <text x="680" y="318" fill="#64748b" font-size="10">32 electrodes per array</text>
    <path d="M470 155 L520 155 L520 219 L576 219" fill="none" stroke="#00d4ff" stroke-width="1.5" stroke-opacity="0.75" marker-end="url(#lc2ArrCyan)"/>
    <text x="548" y="211" fill="#64748b" font-size="10">spikes</text>
  </g>
  <path d="M385 180 L385 236" stroke="#7c3aed" stroke-width="1.5" stroke-opacity="0.7" fill="none"/>
  <rect x="200" y="236" width="360" height="132" rx="10" fill="#0b0f1a" stroke="#7c3aed" stroke-opacity="0.7"/>
  <g font-family="ui-sans-serif,system-ui,sans-serif" text-anchor="middle" fill="#c4b5fd">
    <text x="380" y="260" font-size="11" font-weight="700" letter-spacing="1">ENFORCED IN THE DATA PATH</text>
    <text x="380" y="286" font-size="12">Pacing interval, 429 with Retry-After</text>
    <text x="380" y="308" font-size="12">Bounds checks on stimulation parameters</text>
    <text x="380" y="330" font-size="12">Cleanup when an agent goes silent</text>
    <text x="380" y="352" font-size="12">Hash chained record of every stimulation</text>
  </g>
</svg>

### The Digital Twin

The twin simulates two microelectrode arrays, each carrying four organoids with eight electrodes apiece, for 32 recording channels per array, 16 of which can be stimulated through a 16 position trigger pattern. My first version treated an array as one uniform piece of tissue that tired within seconds and recovered with rest. Recordings of real organoids, shared with me for this work, did not look like that, and I rebuilt the model around the trends they did show. I report those trends here only in qualitative form, and no figure in this article comes from those recordings.

In the rebuilt twin each organoid has a life of its own. That life drains with time and with every stimulation pulse, at a pace that differs between organoids, and when it falls low enough the organoid goes silent in a step and stays silent, and rest does not return it. Whether stimulation or simply elapsed time drives that decline is something the recordings could not settle, because both accounts fit, so the twin does both and I treat the per pulse charge as a modeling choice rather than a finding. The pace is compressed so that a trend which takes real tissue days is visible within a lab session. Electrodes are very unequal, with well under half of them lively, some firing rarely and about a third recording nothing but artifact, and spontaneous firing comes in bursts rather than evenly. A stimulated electrode drives only other electrodes of its own organoid, so nothing propagates between organoids, and that fixed wiring acts as the reservoir because different inputs excite different channel combinations. Evoked spike counts are Poisson distributed with a mean that scales with the organoid's remaining life, and the evoked response fades faster than spontaneous firing does. Every pulse also leaves an artifact on all 32 channels for about ten milliseconds, and many of those artifacts are small, so a reader that filters by amplitude alone fails and the first ten milliseconds have to be discarded.

Two things in the twin are kinder than the tissue it imitates, and both exist so that a lab can be built on it. Its evoked responses are far clearer than real ones, clear enough for a simple readout to work, and it keeps a mild tiredness that rest does relieve, with a 20 second time constant, which the recordings did not show. A pulse above 20 microamperes removes a large share of an organoid's remaining life at once, which models damage and for which I have no data at all. These magnitudes are illustrative, and only the direction of each effect is meant to be realistic.

### Task, Readout and Agents

The task was to recognize four shapes drawn on a 4 by 4 grid, which maps directly onto the trigger pattern, so each lit cell fires one electrode with a fixed biphasic pulse of 5 microamperes. The readout counts spikes per channel from 10 to 200 milliseconds after the stimulus, discards artifacts and subtracts spontaneous baseline activity. A nearest centroid rule on cosine similarity, trained per array and checked against a negative control, then classifies the resulting vector. Chance accuracy is 25%, the trained readout names roughly two shapes in three, and confidence is the margin between the best and second best similarity scores. That is already far better than I would expect from tissue, where the same kind of readout separated stimulation patterns only modestly, and only early in the tissue's life.

Three agents ran concurrently for 45 seconds in each condition, as scripted policies rather than language models so that the runs stayed comparable. Each followed the pattern most agent frameworks encourage, choosing a shape at random, requesting a read through the gateway, and reading again, up to six attempts, whenever the margin fell below 0.08. A test harness recorded whether each final answer was correct, which neither the agents nor the gateway could see.

### Conditions

In the unprotected condition the gateway forwarded every read immediately, alternating between the two arrays. In the protected condition it treated an array as ineligible until 2.5 seconds had passed since its last stimulation. When no array was eligible, it answered with HTTP 429 and a Retry-After header, and the agents waited before trying again. Among eligible arrays it preferred the most responsive one, based on an estimate from a small broker service that owned each array. That estimate was built from evoked spike yield, because living tissue has no endpoint that reports its own state, and it typically sat 10 to 20% from the true value. Reported life therefore uses the twin's internal value, which only a twin can report.

### Safeguards

Three further safeguards did not affect the reported numbers but belong to the same argument about where controls should live. The gateway checked caller supplied stimulation parameters against illustrative bounds and returned a structured error naming the field and its limit, enough for an agent to correct a unit error such as 50 microamperes written for 5. Each broker disabled all stimulation when a session ended or went silent for eight seconds, so a crashed agent could not leave electrodes armed. It also kept an append only record of stimulation and cleanup in which each entry carries a hash of the previous one, which makes the record tamper evident though not tamper proof. These were infrastructure mechanisms in the experiment rather than features of any commercial platform.

## Results

In the unprotected run, the three agents completed 111 classifications in 45 seconds with an accuracy of 59%, and in doing so spent about 13% of the remaining life of the organoids they stimulated, 15% on one array and 12% on the other. The agents saw only their own confidence margins, so none of them could tell which answers were the wrong ones, and nothing in the request path knew that the tissue was finite. With the 2.5 second interval enforced at the gateway, the same three agents completed 12 classifications over the same 45 second window and spent under 2% of that life. Ten of the twelve were correct, but twelve classifications are far too few to support a claim that the interval improved accuracy, and I do not make one. Over those windows the tissue received 1,248 stimulation pulses without protection and 156 with it, roughly 28 pulses per second against 3.5, while throughput fell by about a factor of nine.

| Measure | Unprotected | Interval enforced |
|---|---|---|
| Interval between stimulations of one array | None | 2.5 s |
| Array selection | Alternating | Most responsive eligible array |
| Classifications completed | 111 | 12 |
| Stimulation pulses delivered | 1,248 | 156 |
| Classification accuracy | 59% | 10 of 12, too few to compare |
| Remaining tissue life spent | about 13% | under 2% |

Per completed classification the two runs used a similar number of pulses, about eleven against thirteen, so the interval did not make an answer cheaper. Every pulse spends life in this model whoever sends it and however long they waited. What the interval changed was the pace, and with it how long a shared, finite substrate lasts and who made that decision. These figures are properties of a deliberately simplified model, not biological measurements or benchmarks of any real organoid system. The direction of the difference is worth carrying forward, while its size depends on parameters I chose.

### The Retry Feedback Loop

The dominant effect in the unprotected run is simply the stimulation rate, since three agents working without pause delivered pulses about eight times faster than the paced run did, and each pulse spent life. Behind it sits a slower feedback loop that emerges from two rules, one in the model and one in the agents. This study did not measure the loop's separate contribution, so what follows explains the mechanism rather than quantifying it.

As an organoid's life is spent its evoked response fades relative to the spontaneous background, and that lower signal to noise ratio narrows the margin between the best and second best class. A narrower margin falls below the confidence threshold more often, and the agent then does what it was designed to do, which is to retry and deliver more stimulation to the same tissue. Unlike tiredness, spent life does not come back, so each turn of the loop leaves the tissue permanently a little less able to answer the next request. Nothing in the twin injects this failure, and every step is locally reasonable, so the degradation appears only when the steps are composed.

<svg viewBox="0 0 800 416" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Feedback loop in which an agent retry leads to more stimulation, less remaining tissue life, lower signal to noise, lower confidence, and another retry" style="width:100%;height:auto;max-width:760px;display:block;margin:2rem auto;">
  <defs>
    <marker id="lc3ArrPurple" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="#7c3aed"/></marker>
  </defs>
  <g font-family="ui-sans-serif,system-ui,sans-serif" text-anchor="middle">
    <rect x="305" y="49" width="190" height="52" rx="10" fill="#0b0f1a" stroke="#7c3aed" stroke-opacity="0.95"/>
    <text x="400" y="72" fill="#c4b5fd" font-size="13">Agent retries</text>
    <text x="400" y="90" fill="#64748b" font-size="10">the policy works as designed</text>
    <rect x="552" y="146" width="190" height="52" rx="10" fill="#0b0f1a" stroke="#7c3aed" stroke-opacity="0.6"/>
    <text x="647" y="169" fill="#e2e8f0" font-size="13">More stimulation</text>
    <text x="647" y="187" fill="#64748b" font-size="10">same tissue, more pulses</text>
    <rect x="458" y="302" width="190" height="52" rx="10" fill="#0b0f1a" stroke="#7c3aed" stroke-opacity="0.6"/>
    <text x="553" y="325" fill="#e2e8f0" font-size="13">Less tissue life</text>
    <text x="553" y="343" fill="#64748b" font-size="10">spent, and not returned</text>
    <rect x="152" y="302" width="190" height="52" rx="10" fill="#0b0f1a" stroke="#7c3aed" stroke-opacity="0.6"/>
    <text x="247" y="325" fill="#e2e8f0" font-size="13">Lower signal to noise</text>
    <text x="247" y="343" fill="#64748b" font-size="10">evoked spikes near baseline</text>
    <rect x="58" y="146" width="190" height="52" rx="10" fill="#0b0f1a" stroke="#7c3aed" stroke-opacity="0.6"/>
    <text x="153" y="169" fill="#e2e8f0" font-size="13">Lower confidence</text>
    <text x="153" y="187" fill="#64748b" font-size="10">readout margin shrinks</text>
    <text x="400" y="208" fill="#c4b5fd" font-size="14">The agent's own retry rule</text>
    <text x="400" y="230" fill="#c4b5fd" font-size="14">closes the loop</text>
    <text x="400" y="394" fill="#64748b" font-size="12" font-style="italic">The loop emerges from two simple rules in the model rather than from any injected fault</text>
  </g>
  <g fill="none" stroke="#7c3aed" stroke-width="1.6" stroke-opacity="0.8">
    <path d="M495 75 C 580 75, 647 95, 647 142" marker-end="url(#lc3ArrPurple)"/>
    <path d="M647 198 C 647 250, 600 270, 580 298" marker-end="url(#lc3ArrPurple)"/>
    <path d="M458 328 L346 328" marker-end="url(#lc3ArrPurple)"/>
    <path d="M220 302 C 200 270, 153 250, 153 202" marker-end="url(#lc3ArrPurple)"/>
    <path d="M153 146 C 153 100, 220 75, 301 75" marker-end="url(#lc3ArrPurple)"/>
  </g>
</svg>

Against a conventional backend a retry is a nearly harmless way to buy confidence, because the second inference runs on hardware in the same condition as the first. Against the twin, each retry spent a little of the resource that decided whether later answers would be trustworthy, and spent it for good. The failure was also quiet, since every request succeeded quickly with a well formed answer, and overload protections that watch latency and error rates would have seen nothing wrong.

## Discussion

### Health, History and a Different 429

Under load a GPU becomes slower, but in this experiment load used the living compute model up, which changes what the systems in front of it need to know. A scheduler such as the one in Kubernetes asks where capacity is available. A scheduler for biological compute would also have to ask which specimen is currently appropriate to stimulate, which is a question about health and history. The table below pairs familiar accelerator signals with signals a biological backend would plausibly require, although the right hand column is a hypothesis rather than a specification.

| Conventional accelerator signal | Biological compute signal |
|---|---|
| Utilization | Remaining life of each organoid, and its responsiveness |
| Queue depth | Stimulation history |
| Memory headroom | Recovery since the last stimulation |
| Latency | Experimental protocol and its limits |
| Power draw | Electrode state |
| Equivalence across devices of one model | Variability between biological specimens |

The protected run relied on an ordinary mechanism, since HTTP 429 with a Retry-After header is how many APIs already ask clients to slow down, but its meaning changed. A 429 normally tells a caller that it has consumed too much of a shared resource in some window, after which the allowance refills, but here nothing refills. The refusal says that the resource is finite, that an operator has set the pace at which it may be spent, and that this caller is ahead of that pace. That shift moves the reason for refusal from the caller's behavior to the backend's condition, and it puts the decision in the request path rather than in each agent.

### Observation That Perturbs the System

Observability changed too, since a GPU's temperature, memory errors and utilization counters can be read continuously without affecting the workload, while the responsiveness of neural tissue can only be estimated by stimulating it. In the twin, better estimates required more measurements, and each measurement was itself a stimulation that spent a little of the life being measured. Our observability culture assumes measurement is cheap, with metrics scraped every few seconds and synthetic probes running around the clock. In biological compute that habit would turn the health check into part of the load it is meant to measure.

### Why FLOPS, TOPS and Watts Mislead

Comparing organoids with GPUs on FLOPS, TOPS or watts is tempting, usually starting from the commonly cited estimate that the human brain runs on roughly 20 watts, but that figure does not transfer to organoid systems. An organoid depends on culture systems, environmental control, microelectrode arrays, signal acquisition and conventional computers, none of which appear in the energy budget of a brain. Current organoid systems have not been characterized well enough for a like for like comparison, so I would not claim that they are more efficient than GPUs. The more defensible claim is that the two optimize for different things, deterministic numerical throughput on one side and adaptation, plasticity and nonlinear dynamics on the other.

### Heterogeneous Rather Than Replacement

For these reasons I find heterogeneous computing a more useful frame than replacement. Silicon remains exceptionally good at deterministic arithmetic and at moving large volumes of data, while biological networks may eventually prove useful for specialized adaptive tasks where their dynamics offer something silicon does not. CPUs did not disappear when GPUs arrived, nor GPUs when specialized AI accelerators arrived, so if biological computing becomes practical I expect it to join the stack as a coprocessor rather than replace it.

<svg viewBox="0 0 800 330" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="One AI workload branching to a CPU, a GPU or accelerator, and a biological coprocessor, with the biological coprocessor joining the existing stack rather than replacing it" style="width:100%;height:auto;max-width:760px;display:block;margin:2rem auto;">
  <defs>
    <marker id="lc4ArrCyan" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="#00d4ff"/></marker>
    <marker id="lc4ArrPurple" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="#7c3aed"/></marker>
  </defs>
  <g font-family="ui-sans-serif,system-ui,sans-serif" text-anchor="middle">
    <text x="125" y="26" fill="#64748b" font-size="12" font-weight="700" letter-spacing="1">ONE WORKLOAD</text>
    <text x="590" y="26" fill="#64748b" font-size="12" font-weight="700" letter-spacing="1">HETEROGENEOUS STACK</text>
    <rect x="40" y="130" width="170" height="64" rx="10" fill="#0b0f1a" stroke="#00d4ff" stroke-opacity="0.5"/>
    <text x="125" y="158" fill="#e2e8f0" font-size="14">AI workload</text>
    <text x="125" y="178" fill="#64748b" font-size="11">agents and pipelines</text>
    <rect x="430" y="44" width="320" height="56" rx="8" fill="#0b0f1a" stroke="#00d4ff" stroke-opacity="0.5"/>
    <text x="590" y="68" fill="#e2e8f0" font-size="13">CPU</text>
    <text x="590" y="88" fill="#64748b" font-size="11">control flow and orchestration</text>
    <rect x="430" y="134" width="320" height="56" rx="8" fill="#0b0f1a" stroke="#00d4ff" stroke-opacity="0.5"/>
    <text x="590" y="158" fill="#e2e8f0" font-size="13">GPU or accelerator</text>
    <text x="590" y="178" fill="#64748b" font-size="11">dense tensor math at scale</text>
    <rect x="430" y="224" width="320" height="56" rx="8" fill="#0b0f1a" stroke="#7c3aed" stroke-opacity="0.8"/>
    <text x="590" y="248" fill="#c4b5fd" font-size="13">Biological coprocessor</text>
    <text x="590" y="268" fill="#64748b" font-size="11">adaptive dynamics, research stage</text>
    <text x="400" y="314" fill="#64748b" font-size="12">A biological coprocessor would join the stack for specific workloads rather than replace it</text>
  </g>
  <g fill="none" stroke-width="1.5">
    <path d="M210 162 C 320 162, 320 72, 426 72" stroke="#00d4ff" stroke-opacity="0.75" marker-end="url(#lc4ArrCyan)"/>
    <path d="M210 162 L426 162" stroke="#00d4ff" stroke-opacity="0.75" marker-end="url(#lc4ArrCyan)"/>
    <path d="M210 162 C 320 162, 320 252, 426 252" stroke="#7c3aed" stroke-opacity="0.85" stroke-dasharray="5 4" marker-end="url(#lc4ArrPurple)"/>
  </g>
</svg>

### Agents and Physical Consequences

After building this experiment I became less interested in whether organoids will become important computers and more interested in how AI agents increasingly call systems where requests have physical consequences. A request to a GPU consumes electricity and time, while a request to a laboratory robot, an instrument or biological tissue can change something in the world, sometimes including the substrate that serves it. Agents retry and parallelize their work, which is valuable when the environment is software but risky when it is physical and stateful. The safety boundary therefore needs infrastructure between intention and execution, where policy decides whether an action is permitted and admission control and state aware scheduling decide when and where it can safely run.

<svg viewBox="0 0 800 256" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Governed execution path from agent through policy, admission control, and state aware scheduling, to a physical system" style="width:100%;height:auto;max-width:760px;display:block;margin:2rem auto;">
  <defs>
    <marker id="lc5ArrCyan" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="#00d4ff"/></marker>
  </defs>
  <g font-family="ui-sans-serif,system-ui,sans-serif" text-anchor="middle">
    <rect x="20" y="50" width="136" height="80" rx="8" fill="#0b0f1a" stroke="#334155"/>
    <text x="88" y="86" fill="#94a3b8" font-size="12">Agent</text>
    <text x="88" y="106" fill="#64748b" font-size="10">intention</text>
    <line x1="156" y1="90" x2="172" y2="90" stroke="#00d4ff" stroke-width="1.5" stroke-opacity="0.8" marker-end="url(#lc5ArrCyan)"/>
    <rect x="176" y="50" width="136" height="80" rx="8" fill="#0b0f1a" stroke="#00d4ff" stroke-opacity="0.5"/>
    <text x="244" y="86" fill="#e2e8f0" font-size="12">Policy</text>
    <text x="244" y="106" fill="#64748b" font-size="10">is it permitted</text>
    <line x1="312" y1="90" x2="328" y2="90" stroke="#00d4ff" stroke-width="1.5" stroke-opacity="0.8" marker-end="url(#lc5ArrCyan)"/>
    <rect x="332" y="50" width="136" height="80" rx="8" fill="#0b0f1a" stroke="#00d4ff" stroke-opacity="0.5"/>
    <text x="400" y="80" fill="#e2e8f0" font-size="12">Admission</text>
    <text x="400" y="97" fill="#e2e8f0" font-size="12">control</text>
    <text x="400" y="114" fill="#64748b" font-size="10">is it safe now</text>
    <line x1="468" y1="90" x2="484" y2="90" stroke="#00d4ff" stroke-width="1.5" stroke-opacity="0.8" marker-end="url(#lc5ArrCyan)"/>
    <rect x="488" y="50" width="136" height="80" rx="8" fill="#0b0f1a" stroke="#00d4ff" stroke-opacity="0.5"/>
    <text x="556" y="80" fill="#e2e8f0" font-size="12">State aware</text>
    <text x="556" y="97" fill="#e2e8f0" font-size="12">scheduling</text>
    <text x="556" y="114" fill="#64748b" font-size="10">which unit, when</text>
    <line x1="624" y1="90" x2="640" y2="90" stroke="#00d4ff" stroke-width="1.5" stroke-opacity="0.8" marker-end="url(#lc5ArrCyan)"/>
    <rect x="644" y="50" width="136" height="80" rx="8" fill="#0b0f1a" stroke="#7c3aed" stroke-opacity="0.8"/>
    <text x="712" y="86" fill="#c4b5fd" font-size="12">Physical system</text>
    <text x="712" y="106" fill="#64748b" font-size="10">real consequences</text>
  </g>
  <g stroke="#7c3aed" stroke-width="1.5" stroke-opacity="0.7" fill="none">
    <path d="M244 130 L244 160"/>
    <path d="M400 130 L400 160"/>
    <path d="M556 130 L556 160"/>
  </g>
  <rect x="176" y="160" width="448" height="44" rx="10" fill="#0b0f1a" stroke="#7c3aed" stroke-opacity="0.7"/>
  <text x="400" y="187" fill="#c4b5fd" font-size="13" text-anchor="middle" font-family="ui-sans-serif,system-ui,sans-serif">Infrastructure between intention and execution</text>
  <text x="400" y="238" fill="#64748b" font-size="12" text-anchor="middle" font-family="ui-sans-serif,system-ui,sans-serif">Without these layers, a retry travels straight from intention to consequence</text>
</svg>

In this study the gateway played that role in a narrow form, with one pacing rule and a preference for the most responsive array, and even that simple mechanism changed how fast the tissue was used up by nearly an order of magnitude. Controls inside each agent can be omitted by the next agent, whereas controls in the request path apply to every caller, which is the main lesson I took away. The same reasoning extends to any backend that remembers what was done to it.

## Limitations

The most important limitation is that this study used a digital twin and no living tissue, so every figure is an output of a software model. The twin follows trends I saw in recordings of real organoids, but those recordings are few, they come from experiments designed for other purposes and without unstimulated controls, and they could not separate the effect of stimulation from the effect of age. The twin's per pulse charge is therefore an assumption, as is its mild recoverable tiredness, which the recordings did not show, and its damage threshold, for which I have no data. Its evoked responses are much clearer than those of real tissue, so the readout's accuracy says nothing about what tissue can do. The pace of decline is compressed, the magnitudes are illustrative, and the 2.5 second interval was chosen because it suited the model. The numbers are therefore not benchmarks of organoid computing or of the gateway.

The experimental design is also small in ways that limit what the results can support. Each condition was run once with three scripted agents over 45 seconds, and the paced run completed only twelve classifications, which is why I compare pulses and life spent, which follow from the model's arithmetic, and decline to compare accuracy. The GPU backend was simulated and never performed the classification task, and the two conditions differed in both the interval and the array selection strategy, so the contribution of each change cannot be isolated. I make no claim about energy efficiency in either direction. Research with human neural tissue also raises ethical questions that are outside the scope of this study.

I should also record that this article was revised, since its first draft described a twin whose tissue tired in seconds and recovered with rest, and reported that pacing restored accuracy. The recordings did not support that mechanism, I rebuilt the model, and the result changed from one about correctness to one about how fast a finite resource is spent. Part 2 of this series will report the analysis of those recordings in its own right, with the agreement of the people who shared them: what declines and how, what a simple readout can and cannot recover from real tissue, and which questions the recordings leave open.

## Conclusion

This experiment does not show that neurons are about to displace GPUs, and its twin makes no quantitative prediction about real organoids. What it does show, within the limits of a model, is that retrying agents behind a stateless request path can quietly use up a finite, stateful backend, and that nothing in a conventional request path would notice. Moving knowledge of backend state into that path did not make answers cheaper, and I cannot say that it made them better. It set the pace at which the substrate was spent, and it put that decision with an operator rather than with whichever agent retried hardest. When compute becomes biological, a request stops being only a request and becomes an intervention, and assumptions that cloud infrastructure has accumulated over decades, such as cheap retries and free health checks, would need to be reconsidered. GPUs taught us how to schedule scarce compute, and living compute may eventually teach us how to schedule scarce state, which seems to me the more interesting frontier.

## References

1. Cai, H. et al. "Brain organoid reservoir computing for artificial intelligence." Nature Electronics, 2023.
2. Smirnova, L. et al. "Organoid intelligence (OI): the new frontier in biocomputing and intelligence-in-a-dish." Frontiers in Science, 2023.

---

*This study used a software digital twin and no living tissue at any stage. No commercial platform was evaluated, and every figure is the output of a simplified model rather than a biological measurement. The twin's behavior follows trends in recordings of real organoids shared by FinalSpark, whom I thank, and no figure from those recordings appears here. Part 2 of this series will report the analysis of those recordings.*
