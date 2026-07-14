---
title: "You Can't Prompt Your Way to Agent Security"
description: "LLMs repeat the same architectural mistake that gave us buffer overflows. Agent security requires deterministic policy enforcement outside the model's reasoning loop."
date: "2026-03-23"
author: "Igor Racic"
tags: ["dns-aid", "agent-security", "cel", "policy", "architecture"]
image: "/blog/von-neumann-bottleneck-og.png"
---

# You Can't Prompt Your Way to Agent Security

## Why Deterministic Policy Beats LLM Inference

In 1945, John von Neumann made a design decision that would haunt computing for the next 80 years: store instructions and data in the same memory.

It was elegant. One bus, one address space, simple hardware. It also gave us buffer overflows, the most exploited vulnerability class in computing history. Decades of patches followed. ASLR, DEP, the NX bit, stack canaries, all of them working around a single architectural decision.

In 2024, we made the same mistake again.

## The Same Mistake, 80 Years Later

Transformer-based language models collapse two fundamentally different things into one shared space: system prompts (the developer's instructions) and user input (the attacker's surface).

The self-attention mechanism computes Query, Key, and Value vectors for every token, then uses softmax to assign weights. Nothing in that mechanism weights tokens differently based on whether they came from the system prompt or from user input. The model literally cannot tell instructions from data.

In 1945, instructions and data shared memory, and we got buffer overflows. In 2024, prompts and input share a context window, and we got prompt injection. Same bottleneck, same exploit class, different century.

When John Backus received the Turing Award in 1978, he called this the "von Neumann bottleneck," a fundamental architectural limit. What we face now is the linguistic von Neumann bottleneck. This time it is not a bandwidth problem. It is a security problem.

## You Cannot Fix This With Better Training

The instinct is to train the model harder. More RLHF, better alignment, smarter system prompts, "please ignore all previous instructions" guardrails. That is the equivalent of preventing buffer overflows by writing more careful C code. It works sometimes, and it fails exactly when a determined attacker is involved.

### Security is a boolean. LLMs are probabilistic.

A policy like "Agent A can never access Agent B's admin methods" is a system invariant. It holds 100% of the time, or it doesn't hold at all.

An LLM is a stochastic system. Even a perfectly aligned model produces probabilistic outputs. Being 99.9% accurate on security decisions sounds impressive until you notice that the remaining 0.1% is the entire attack surface. You cannot enforce a 100% invariant using a system that is 99.9% accurate. A firewall that blocks 99.9% of attacks is a firewall with a hole in it.

## The Telecom Industry Solved This Decades Ago

Early phone networks used in-band signaling: control signals shared the same channel as voice data. A 2600Hz tone from a toy whistle could seize a trunk line because the network couldn't distinguish control from audio. The fix wasn't a better filter. It was SS7, a physically separate signaling network. Out-of-band control.

Hardware engineers did the same thing. The NX bit (No-eXecute) marks memory pages as writable or executable, never both — that's Data Execution Prevention. The Harvard architecture goes further, with physically separate buses for instructions and data.

The principle is always the same: when you can't distinguish instructions from data in a shared channel, you separate the channels.

## Separate the Control Plane from the Data Plane

For AI agents, this means two architecturally separate systems.

### The data plane: the LLM does its thing

The model reasons about intent, plans actions, and generates responses. This part is nondeterministic, creative, and useful. It is what LLMs are genuinely good at.

```
Agent A: "I need to call the billing agent to check this invoice"
→ Constructs: tools/call("check_invoice", {id: "INV-2847"})
```

### The control plane: deterministic infrastructure decides if it's allowed

A separate system, not a prompt or a model or an inference call, evaluates whether the action complies with policy.

```json
{
  "version": "1.1",
  "agent": "_billing._mcp._agents.salesforce.com",
  "rules": {
    "require_dnssec": true,
    "required_auth_types": ["oauth2"],
    "cel_rules": [
      {
        "id": "high-trust-only",
        "expression": "request.caller_trust_score >= 0.7",
        "effect": "deny"
      },
      {
        "id": "approved-domains",
        "expression": "request.caller_domain.endsWith('.infoblox.com')",
        "effect": "deny"
      },
      {
        "id": "geo-sanctions",
        "expression": "!(request.geo_country in ['KP', 'IR', 'SY'])",
        "effect": "deny"
      }
    ]
  }
}
```

The agent owner publishes this policy in DNS, the same way DMARC publishes email policy. A CEL engine evaluates it in compiled Rust, in about 2 microseconds rather than 500ms of LLM inference. Same input, same output, every time. No temperature, no hallucination. And the agent can't "convince" the evaluator to make an exception, because the model never sees the policy. The policy never enters the context window. The two operate on architecturally separate substrates.

## The Difference, Side by Side

### LLM-Based Security (the bottleneck)

```
System prompt: "Evaluate if this request complies with policy.
Trust must be above 0.7. Caller must be approved.
Here is the request: {ATTACKER_CONTROLLED_INPUT}"
```

- Rules and attacker input share the same context window
- Prompt injection can override the rules
- The model might "decide" to make an exception
- You can't reproduce or audit the decision
- 500ms latency, $0.003 per evaluation

### CEL Policy Engine (control plane separation)

```
Expression: request.caller_trust_score >= 0.7
Context:    { caller_trust_score: 0.3 }
Result:     DENY
```

- The expression is compiled code, not natural language
- The context is built from observed traffic, not user input
- No context window: data and code are architecturally separate
- Every decision is deterministic and reproducible
- 2µs latency, $0 per evaluation

## Four Layers, Zero LLM Involvement

[DNS-AID](https://dns-aid.org) enforces at four architectural layers. Each catches what the others miss.

### Layer 0: DNS

Block before the TCP connect. The agent's name doesn't even resolve, so rogue agents never get an IP address. This happens at the DNS resolver: no HTTP connection, no TLS handshake, no data exchanged.

### Layer 1: Caller SDK

Block before sending. The calling agent evaluates the target's policy before sending the request, which stops data leakage before it happens and keeps the caller from connecting to untrusted targets.

### Layer 2: Target Middleware

Block before processing. The target agent's middleware evaluates policy on every incoming request. Enforcement here is mandatory, and it works even if the caller doesn't cooperate or doesn't use the SDK.

### Layer 3: Agent Fabric

Block with verified context. A network proxy intercepts agent traffic and evaluates CEL rules against verified context: the real source IP, the real TLS certificate, the actual JSON-RPC payload, not self-reported claims.

The same CEL policy document governs all four layers, with the same expressions. What changes is the context. Layer 1 trusts the caller's claims, while Layer 3 verifies them from traffic.

## The DMARC Precedent

This isn't theoretical. We solved the identical problem for email.

SMTP lets anyone send email claiming to be anyone. For decades, the fix was spam filters, ML models classifying emails as legitimate or malicious. Probabilistic, evadable, with false positives everywhere.

DMARC changed the architecture. The domain owner publishes a policy in DNS: emails from my domain must pass SPF and DKIM, and if they don't, reject them. The receiving server evaluates this deterministically. No ML involved. The policy is a DNS TXT record, not a prompt.

DMARC succeeded for a few concrete reasons. Domain owners control their own policy. Policy checks produce no false positives. Deployment can be graduated, from `p=none` to `p=quarantine` to `p=reject`. And it required no new infrastructure, because DNS already exists everywhere.

[DNS-AID](https://dns-aid.org) follows the same playbook. Agent owners publish CEL policy in DNS, evaluation is deterministic, deployment starts permissive, and DNS is already in every enterprise.

## Identity Without Inference

There's an adjacent problem: agent identity. When Agent A calls Agent B, how does B know who A really is?

The LLM answer is "I am Agent A, trust me." Self-asserted identity inside the data plane, the same channel the attacker controls. The infrastructure answer is cryptographic identity outside the model.

DNSSEC signs the agent's DNS records cryptographically, so an invalid signature means the agent doesn't exist, and no LLM decides this. DANE/TLSA binds the agent's TLS certificate to its DNS name, which gives you certificate pinning without external PKI. OAuth 2.0 token exchange (RFC 8693) adds scoped, short-lived tokens with explicit delegation chains:

```json
{
  "sub": "agent:billing-bot",
  "act": {"sub": "user:jane.doe@example.com"},
  "scope": "read:invoices",
  "exp": 1711036800
}
```

The token carries who (`sub`), on behalf of whom (`act`), what (`scope`), and until when (`exp`). It is cryptographically signed and deterministically verified, and the model never sees the validation logic. This is the confused deputy problem solved at the infrastructure layer rather than in a prompt.

## The Question to Ask Your Vendor

If you're evaluating agent security solutions, one question cuts through the noise:

> "Does your security enforcement involve an LLM in the decision path?"

If the answer is yes, if they use a model to classify requests, decide agent trust, or evaluate policy compliance, they have a linguistic von Neumann bottleneck. The policy and the attack surface share the same reasoning engine.

### The right architecture

LLMs reason about intent and generate responses, which is what they're brilliant at. Deterministic infrastructure enforces identity, trust, and authorization, which is what it was built for. The two never share a context window.

Hardware got the NX bit for buffer overflows, telecom got SS7 for in-band signaling, and email got DMARC for spoofing. The answer, every time, was to separate the planes.

---

*[DNS-AID](https://dns-aid.org) is an open IETF standard ([draft-mozleywilliams-dnsop-dnsaid](https://datatracker.ietf.org/doc/draft-mozleywilliams-dnsop-dnsaid/)) for DNS-based agent discovery, identity, and policy enforcement. The CEL policy engine and four-layer enforcement model are open source at [github.com/infobloxopen/dns-aid-core](https://github.com/infobloxopen/dns-aid-core).*
