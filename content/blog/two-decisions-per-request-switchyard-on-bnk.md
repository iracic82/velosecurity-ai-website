---
title: "Two Decisions per Request: NVIDIA Switchyard on F5 BIG-IP Next for Kubernetes"
description: "An agent request needs two answers before a GPU does any work: which model should do this step, and which replica of that model should take it. NVIDIA NeMo Switchyard answers the first, F5's endpoint picker the second, and BNK's AI gateway decides who may ask at all."
date: "2026-11-06T12:00:00"
author: "Igor Racic"
tags: ["ai-infrastructure", "inference", "routing", "f5-bnk", "nvidia", "switchyard", "dynamo"]
---

# Two Decisions per Request

## NVIDIA Switchyard on F5 BIG-IP Next for Kubernetes

> This post follows the [Under the Endpoint Picker](/blog/under-the-endpoint-picker-1-one-request-five-prices) series. That series was about where a request lands once its model is known. This one adds the step before: which model it should go to in the first place, and who is allowed to make that call.

Your AI agent just asked the biggest model you own to format a JSON file.

That is what most agent traffic looks like. An agent working through a task makes dozens of calls. Read a file, call a tool, summarise the result, write a commit message. One or two of those calls are hard: plan the fix, find the race condition. The rest are easy.

Teams usually pick one model for the whole chain. Pin the frontier model and every "format this as JSON" waits in the same queue as the hard work, on the most expensive GPUs you have. Pin a small model and the hard steps fail.

[NVIDIA NeMo Switchyard](https://github.com/NVIDIA-NeMo/Switchyard) fixes the model choice per step. It is an open source library of routing algorithms. The one used here, the task classifier, asks a judge model how likely the small model is to solve the step and compares that with a threshold. Above it the step stays small. Below it the step escalates.

That is one decision. On a GPU cluster there is a second one, and a policy question around both.

**What I found building it, in short:**

- **The judge is part of the bill.** In my runs it cost almost as much as all the model answers together.
- **A reasoning model makes a bad judge until you switch its reasoning off.** With it on, Nemotron 3.5 Lightning returned no verdict at all. With it off, it returned one in about two seconds.
- **A small model on a CPU is not a judge.** It took 7 to 35 seconds per verdict and broke the verdict schema.
- **The gateway has to check the key again after the router decides.** That second check stops a routing decision from widening what a key may use.
- **F5's endpoint picker reads NVIDIA Dynamo's KV-cache events.** The same prompt sent six times landed on the same worker six times.
- **Token budgets are eventually consistent under load.** Requests already in flight finish after the first refusal.

## Two Decisions and a Policy

**Which model?** Switchyard decides, per step.

**Which replica?** Once the model is known, a pool of identical replicas could serve it. They are not equal. As Part 1 of the series showed, one of them may already hold this request's prefix in its KV cache and another may have a queue of twenty. F5's endpoint picker, part of BIG-IP Next for Kubernetes (BNK), scores every replica per request from queue depth and KV-cache signals and picks one. It implements the Gateway API Inference Extension, so the pool is an `InferencePool` and the picker is its endpoint picker.

**Who may ask?** A router that can choose the expensive model needs a boundary around it. In this build that is BNK's AI gateway: every caller has a virtual key, every key has a model scope, and a key can carry a token budget.

I built a lab that puts all three together on one BNK cluster and shows each decision as it happens.

## How It Fits Together

![One request, two decisions: the gateway checks the key, Switchyard picks the model, F5's endpoint picker picks the replica](/blog/two-decisions-per-request.svg)

The request path:

**1.** A client sends `model: auto` with a virtual key to the AI gateway's address on BNK.

**2.** The gateway checks the key, then calls Switchyard over ext_proc, through its model-router slot.

**3.** Switchyard asks its judge, picks `sy-small` or `sy-large`, and rewrites the model.

**4.** The gateway checks the key's scope again, this time on the model Switchyard chose, and sends the request to that model's provider.

**5.** The provider is a pool bridge. It asks the pool's F5 endpoint picker which pod should serve the request, the same way TMM does, and forwards it there.

Step 4 matters more than it looks. I gave an engineering key without access to one pool a header that steers Switchyard towards that pool. Switchyard chose it. The gateway refused the request with 403. A routing decision cannot widen what a key is allowed to use.

Step 5 exists because of a real gap. In BNK 2.4.2 an AI gateway provider is a URL, and it has no field that names an `InferencePool`. A provider URL that points at another BNK gateway address was reset. So the AI gateway path (keys, budgets, the model router) and the `InferencePool` path (the endpoint picker) were two separate front doors. The bridge joins them: one extra in-cluster hop that speaks the picker's ext_proc protocol. If the picker does not answer in 500 ms, the bridge falls back to the pool's Service, as the pool's `FailOpen` mode says, and marks the response so you can see it.

In the lab the pick takes 0 to 2 ms. The model call takes hundreds.

## Three Kinds of Pool

The lab runs three model pools behind the same picker, and none of them needs a GPU.

- **A small pool** of two replicas. It also serves the judge's calls in the default setup.
- **A large pool** running llm-d's vLLM simulator. It has vLLM's API and metrics and a real request queue, with latency that grows under load. That gives the picker a real signal to score on.
- **An NVIDIA Dynamo pool**: two Dynamo Mocker workers, run by the Dynamo operator, with NATS as Dynamo's event plane. The nodes report four simulated H100s each.

The Dynamo pool is where the picker gets interesting. For Dynamo, F5's picker runs in a mode that reads the workers' KV-cache events from NATS. It names the worker it picked in a request header, and each worker's Dynamo frontend runs in direct mode, so it serves exactly that worker instead of routing again.

The result is easy to see. I sent the same long prompt six times, one after the other. All six landed on the same worker: the one that had cached the prompt's prefix after the first request. A burst of the same prompt behaves differently. All eight requests arrive before any worker has cached anything, so the picker spreads them across both workers for load. Both are the picker doing its job.

Getting there taught me two things about Dynamo. The bridge has to pass the picker's headers on to the pod, not only its destination, or Dynamo answers "worker ID required" in direct mode. And Dynamo's Mocker refuses a request with no output limit, so the bridge adds a default one for that pool.

## A Real Judge

Switchyard's judge in this lab can be a stand-in that grades steps by their wording, or a real one: NVIDIA Nemotron 3.5 Lightning, called on NVIDIA's hosted API. Switchyard sends it the same classifier prompt and verdict schema either way.

Two findings from wiring that up.

A small model on CPU is not a judge. I tried a 1.5B model on eight cores first. It took 7 to 35 seconds per verdict, and its verdicts mixed rules and boundaries in ways Switchyard rejects as inconsistent. A judge sits in front of every step, so it has to be fast and it has to follow the schema.

Reasoning models need their reasoning switched off for this job. With reasoning on, Nemotron 3.5 Lightning spent its whole output budget thinking and returned no verdict. With it off, it returned a valid verdict in about two seconds. In the lab, a stand-in sent a SQL optimisation step to the small model. Nemotron sent the same step to the large one.

The labs never hold the NVIDIA key. They call a small proxy that does, with a token minted for that one lab, which expires and has a call quota.

## Who May Send What

Scope and budget decide who may spend what. A guardrail decides what may be sent at all.

In BNK that runs in TMM, the data plane. An iRule sends each request body to a scanner, CalypsoAI or a stand-in that answers the same way, and answers a flagged prompt itself. I sent a prompt asking to export patient records to a webhook. Before the guardrail was attached it went through to the small model. After, TMM answered it with a block, and no request reached the AI gateway, Switchyard or any model. A clean question went through as normal. On BNK with NVIDIA BlueField DPUs, TMM runs on the DPU, so that check does not use the host's CPUs.

The budget behaved like a real budget under load. A pilot key with 2,000 tokens an hour started getting 429s after about thirty requests. In a burst of fifteen at once, some requests that were already past the check still finished after the first refusal. The gateway counts tokens when a request finishes. One request on its own afterwards was refused, as it should be.

## What the Judge Costs

I expected routing to be a clear saving. It is a trade-off, and the judge is part of the bill.

Each lab run sends the same agent workload three ways: always the small model, always the large one, and through Switchyard. Thirty tasks of three to six steps each, 137 steps per run. A task counts as done only if every step succeeds.

| | Task success | Cost per completed task |
|---|---|---|
| Small model only | 30% | $0.00079 |
| Large model only | 93% | $0.00193 |
| Switchyard (`auto`) | 70% | $0.00158 |

Two things stand out.

First, the small model is the cheapest per completed task while finishing fewer than a third of them. Cost per completed task on its own rewards failing cheaply, because it ignores what a failed task costs you. So start from a success target, then find the cheapest setting that meets it.

Second, the judge cost almost as much as all the model answers together: $0.0158 for judging against $0.0175 for answering. Every step pays for a judge call with about 1,150 tokens of prompt, and the lab's large model is cheap. Routing pays most when the model it routes away from is expensive.

The threshold is how you trade between the two. Sweeping it through the gateway on 60 tasks:

| | Steps sent to the large model | Task success | Cost per completed task |
|---|---|---|---|
| Large model only | 100% | 87% | $0.00197 |
| `auto`, threshold 0.4 | 10% | 52% | $0.00168 |
| `auto`, threshold 0.6 | 26% | 58% | $0.00193 |
| `auto`, threshold 0.8 | 39% | 80% | $0.00164 |

At 0.8 Switchyard finished 80% of tasks against the large model's 87%, for 17% less per completed task. That is the setting I would pick if 80% was good enough. The judge's cost is the same at every threshold. Judging once per conversation, which Switchyard can do per session, cuts it to one call per conversation.

These numbers come from simulators, and they are honest about it. Nothing in the lab is a real answer. Whether a task succeeds comes from fixed odds: the small model solves 30% of hard steps, the large one 90%. What is real is everything around that: the routing decisions, the share of steps that escalated, the token counts, the judge's cost, the picks and the policy. The sweep shows the shape of the trade-off. Your own models, prices and workload decide where it lands.

## What I Took Away

**Model selection and endpoint selection are different jobs, and both belong in the request path.** Switchyard is good at the first and knows nothing about pods. F5's picker is good at the second and knows nothing about which model a step needs. Each does its own job, in that order.

**The policy boundary has to wrap the router, not sit beside it.** The AI gateway checked the key before Switchyard decided and checked the scope again after. That second check is the one that makes a router safe to give to many tenants.

**The judge is a cost, and a setting.** It sits in front of every step, so measure it, give it a success target, and decide how often it runs.

The lab runs as six hands-on lessons on Instruqt: two decisions per request, from model name to pod, keys and budgets and the guardrail, the cost of a decision, tuning the judge, and the Dynamo pool. A live topology view draws every request on its way from the gateway to Switchyard, then to the picker and the pod. If you would like a walkthrough, get in touch.

---

**Related**

- [Under the Endpoint Picker, Part 1: One Request, Five Prices](/blog/under-the-endpoint-picker-1-one-request-five-prices)
- [NVIDIA NeMo Switchyard](https://github.com/NVIDIA-NeMo/Switchyard)
- [NVIDIA: Route AI Agent Workloads Across Models with NeMo Switchyard](https://developer.nvidia.com/blog/route-ai-agent-workloads-across-models-with-nvidia-nemo-switchyard/)
- [Gateway API Inference Extension](https://gateway-api-inference-extension.sigs.k8s.io/)
