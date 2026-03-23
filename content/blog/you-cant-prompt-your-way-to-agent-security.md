---
title: "You Can't Prompt Your Way to Agent Security"
description: "LLMs repeat the same architectural mistake that gave us buffer overflows. Agent security requires deterministic policy enforcement outside the model's reasoning loop."
date: "2026-03-23"
author: "Igor Racic"
tags: ["dns-aid", "agent-security", "cel", "policy", "architecture"]
image: "/blog/von-neumann-bottleneck-og.png"
---

# You Can't Prompt Your Way to Agent Security

## Why Deterministic Policy Beats LLM Inference — Every Time

In 1945, John von Neumann made a design decision that would haunt computing for the next 80 years: **store instructions and data in the same memory.**

Elegant. One bus, one address space, simple hardware.

It also gave us buffer overflows — the most exploited vulnerability class in computing history. Decades of patches. ASLR. DEP. NX bit. Stack canaries. All working around one architectural decision.

**In 2024, we made the same mistake again.**

---

## The Same Mistake, 80 Years Later

Transformer-based language models collapse two fundamentally different things into one shared space: **system prompts** (the developer's instructions) and **user input** (the attacker's surface).

The self-attention mechanism computes Query, Key, and Value vectors for every token, then uses softmax to assign weights. Here's the problem:

> **No mechanism exists to weight tokens differently based on whether they came from the system prompt or from user input.**

The model literally cannot tell instructions from data. Sound familiar?

**1945:** Instructions and data share memory → buffer overflow

**2024:** Prompts and input share context window → prompt injection

Same bottleneck. Same exploit class. Different century.

When John Backus received the Turing Award in 1978, he called this the "von Neumann bottleneck" — a fundamental architectural limit. We now face the **linguistic** von Neumann bottleneck. Not a bandwidth problem. A security problem.

---

## You Cannot Fix This With Better Training

The instinct is to train the model harder. More RLHF. Better alignment. Smarter system prompts. "Please ignore all previous instructions" guardrails.

This is the equivalent of preventing buffer overflows by writing more careful C code. It works sometimes. It fails exactly when a determined attacker is involved.

Here's the core issue:

### Security is a boolean. LLMs are probabilistic.

A policy like *"Agent A can never access Agent B's admin methods"* is a **system invariant**. It holds 100% of the time, or it doesn't hold.

An LLM is a stochastic system. Even perfectly aligned, it produces probabilistic outputs. 99.9% accurate on security decisions sounds impressive — until you realize the 0.1% **is the entire attack surface.**

> **You cannot enforce a 100% invariant using a system that is 99.9% accurate.**
>
> A firewall that blocks 99.9% of attacks is a firewall with a hole.

---

## The Telecom Industry Solved This Decades Ago

Early phone networks used **in-band signaling** — control signals shared the same channel as voice data. A 2600Hz tone from a toy whistle could seize a trunk line because the network couldn't distinguish control from audio.

The fix wasn't a better filter. It was **SS7** — a physically separate signaling network. Out-of-band control.

Hardware engineers did the same thing: the **NX bit** (No-eXecute) marks memory pages as writable OR executable, never both. Data Execution Prevention. The Harvard architecture goes further — physically separate buses for instructions and data.

**The principle is always the same: when you can't distinguish instructions from data in a shared channel, you separate the channels.**

---

## Separate the Control Plane from the Data Plane

For AI agents, this means two architecturally separate systems:

### The Data Plane — the LLM does its thing

The model reasons about intent, plans actions, generates responses. This is nondeterministic, creative, and useful. This is what LLMs are brilliant at.

```
Agent A: "I need to call the billing agent to check this invoice"
→ Constructs: tools/call("check_invoice", {id: "INV-2847"})
```

### The Control Plane — deterministic infrastructure decides if it's allowed

A separate system — not a prompt, not a model, not inference — evaluates whether the action complies with policy.

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

This policy is:

- **Published in DNS** by the agent owner — like DMARC publishes email policy
- **Evaluated by a CEL engine** — compiled Rust, 2 microseconds, not 500ms LLM inference
- **Deterministic** — same input, same output, every time. No temperature. No hallucination.
- **Non-bypassable** — the agent can't "convince" the evaluator to make an exception

**The model never sees the policy. The policy never enters the context window. They operate on architecturally separate substrates.**

---

## The Difference, Side by Side

### LLM-Based Security (the bottleneck)

```
System prompt: "Evaluate if this request complies with policy.
Trust must be above 0.7. Caller must be approved.
Here is the request: {ATTACKER_CONTROLLED_INPUT}"
```

- Rules and attacker input share the **same context window**
- Prompt injection can override the rules
- Model might "decide" to make an exception
- Can't reproduce or audit the decision
- **500ms latency. $0.003 per evaluation.**

### CEL Policy Engine (control plane separation)

```
Expression: request.caller_trust_score >= 0.7
Context:    { caller_trust_score: 0.3 }
Result:     DENY
```

- Expression is compiled code, not natural language
- Context built from observed traffic, not user input
- No "context window" — data and code are architecturally separate
- Every decision is deterministic and reproducible
- **2µs latency. $0 per evaluation.**

---

## Four Layers, Zero LLM Involvement

[DNS-AID](https://dns-aid.org) enforces at four architectural layers. Each catches what the others miss:

### Layer 0: DNS — Block before TCP connect

The agent's name doesn't even resolve. Rogue agents never get an IP address. This happens at the DNS resolver — no HTTP connection, no TLS handshake, no data exchanged.

### Layer 1: Caller SDK — Block before sending

The calling agent evaluates the target's policy before sending the request. Stops data leakage before it happens. Prevents the caller from connecting to untrusted targets.

### Layer 2: Target Middleware — Block before processing

The target agent's middleware evaluates policy on every incoming request. Mandatory enforcement — works even if the caller doesn't cooperate or doesn't use the SDK.

### Layer 3: Agent Fabric — Block with verified context

A network proxy intercepts agent traffic and evaluates CEL rules against **verified** context — real source IP, real TLS certificate, actual JSON-RPC payload — not self-reported claims.

**The same CEL policy document governs all four layers.** The same expressions. What changes is the context: Layer 1 trusts the caller's claims. Layer 3 verifies them from traffic.

---

## The DMARC Precedent

This isn't theoretical. We solved the identical problem for email.

SMTP lets anyone send email claiming to be anyone. For decades, the fix was spam filters — ML classifying emails as legitimate or malicious. Probabilistic. Evadable. False positives everywhere.

**DMARC changed the architecture.** The domain owner publishes a policy in DNS:

> "Emails from my domain must pass SPF and DKIM. If they don't, reject them."

The receiving server evaluates this **deterministically**. No ML. The policy is a DNS TXT record, not a prompt.

DMARC succeeded because:

- **Sovereignty** — domain owners control their own policy
- **Determinism** — no false positives on policy checks
- **Graduated deployment** — `p=none` → `p=quarantine` → `p=reject`
- **No new infrastructure** — DNS already exists everywhere

[DNS-AID](https://dns-aid.org) follows the same playbook. Agent owners publish CEL policy in DNS. Evaluation is deterministic. Deployment starts permissive. DNS is already in every enterprise.

---

## Identity Without Inference

There's an adjacent problem: **agent identity**. When Agent A calls Agent B, how does B know who A really is?

The LLM approach: *"I am Agent A, trust me."* Self-asserted identity inside the data plane — the same channel the attacker controls.

The infrastructure approach: **cryptographic identity outside the model.**

- **DNSSEC** — the agent's DNS records are cryptographically signed. Invalid signature = agent doesn't exist. No LLM decides this.
- **DANE/TLSA** — the agent's TLS certificate is bound to its DNS name. Certificate pinning without external PKI.
- **OAuth 2.0 token exchange** (RFC 8693) — scoped, short-lived tokens with explicit delegation chains:

```json
{
  "sub": "agent:billing-bot",
  "act": {"sub": "user:jane.doe@example.com"},
  "scope": "read:invoices",
  "exp": 1711036800
}
```

The token carries **who** (sub), **on behalf of** (act), **what** (scope), and **until when** (exp). Cryptographically signed. Deterministically verified. The model never sees the validation logic.

This is the confused deputy problem solved at the infrastructure layer — not in a prompt.

---

## The Question to Ask Your Vendor

If you're evaluating agent security solutions, there's one question that cuts through the noise:

> **"Does your security enforcement involve an LLM in the decision path?"**

If yes — if they use a model to classify requests, decide agent trust, or evaluate policy compliance — they have a linguistic von Neumann bottleneck. The policy and the attack surface share the same reasoning engine.

### The right architecture:

- **LLMs** reason about intent and generate responses. Brilliant at this.
- **Deterministic infrastructure** enforces identity, trust, and authorization. Built for this.
- **They never share a context window.**

Hardware solved buffer overflows with the NX bit. Telecom solved in-band signaling with SS7. Email solved spoofing with DMARC.

The pattern is always the same. **Separate the planes.**

---

*[DNS-AID](https://dns-aid.org) is an open IETF standard ([draft-mozleywilliams-dnsop-dnsaid](https://datatracker.ietf.org/doc/draft-mozleywilliams-dnsop-dnsaid/)) for DNS-based agent discovery, identity, and policy enforcement. The CEL policy engine and four-layer enforcement model are open source at [github.com/infobloxopen/dns-aid-core](https://github.com/infobloxopen/dns-aid-core).*
