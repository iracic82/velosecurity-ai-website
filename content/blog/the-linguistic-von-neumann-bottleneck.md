---
title: "The Linguistic Von Neumann Bottleneck: Why AI Agent Security Can't Live Inside the Model"
description: "LLMs repeat the same architectural mistake that gave us buffer overflows. Agent security requires deterministic policy enforcement outside the model's reasoning loop."
date: "2026-03-23"
author: "Igor Racic"
tags: ["dns-aid", "agent-security", "cel", "policy", "architecture"]
image: "/blog/von-neumann-bottleneck-og.png"
---

# The Linguistic Von Neumann Bottleneck

## Why AI Agent Security Can't Live Inside the Model

In 1945, John von Neumann made a design decision that would haunt computing for the next 80 years: store instructions and data in the same memory. It was elegant — one bus, one address space, simple hardware. It also gave us buffer overflows, the most exploited vulnerability class in computing history.

In 2024, we made the same mistake again.

---

## The Pattern Repeats

Transformer-based language models collapse system prompts and user input into a single context window. The self-attention mechanism — the mathematical core of every modern LLM — computes Query, Key, and Value vectors for each token and uses softmax normalization to assign semantic weights. Crucially, **no mechanism exists to weight tokens differently based on whether they originated from the system prompt or from user input.**

This is the linguistic von Neumann bottleneck. Instructions and data share the same computational substrate, and the processor — the transformer — cannot tell them apart.

The consequences are predictable, because we've seen them before:

| 1945: Von Neumann Architecture | 2024: Transformer Architecture |
|---|---|
| Instructions and data share memory | System prompts and user input share context window |
| Processor can't distinguish code from data | Attention can't distinguish instructions from input |
| **Exploit:** Buffer overflow | **Exploit:** Prompt injection |
| Attacker who controls data controls execution | Attacker who controls input controls reasoning |

When John Backus received the Turing Award in 1978, he described the von Neumann bottleneck as a fundamental limit on how fast and safely programs could execute. Nearly fifty years later, we face the same bottleneck — not for data transfer rates, but for security invariants.

---

## Why You Can't Fix This Inside the Model

The instinct is to train the model to resist prompt injection. Add more RLHF. Improve alignment. Write better system prompts with "ignore all previous instructions" guardrails.

This is the equivalent of trying to prevent buffer overflows by writing more careful C code. It works sometimes. It fails at scale. And it fails precisely when it matters most — when a determined attacker is involved.

Here's the fundamental issue: **security requires determinism, not probability.**

A policy like "Agent A can never access Agent B's admin methods" is a system invariant. It must hold 100% of the time, across all inputs, in all conditions. It is a boolean — enforced, or not enforced.

An LLM is a stochastic system. Even with perfect alignment training, it produces probabilistic outputs. It might be 99.9% accurate at recognizing and blocking policy violations. But in security, the 0.1% is the entire attack surface.

**You cannot enforce a 100% invariant using a system that is 99.9% accurate.** A firewall that blocks 99.9% of attacks isn't secure — it's a firewall with a hole.

The telecom industry learned this lesson decades ago. Early phone networks used in-band signaling — control signals shared the same channel as voice data. A 2600Hz tone (a whistle from a Cap'n Crunch cereal box) could seize a trunk line because the network couldn't distinguish a control signal from audio data. The fix was SS7 — a physically separate signaling network. **Out-of-band control.**

---

## The Fix: Separate the Control Plane

The solution isn't smarter models. It's architecture.

Hardware engineers solved the original von Neumann bottleneck with the NX bit (No-eXecute) — marking memory pages as either writable or executable, never both. Data Execution Prevention. The Harvard architecture in embedded systems goes further: physically separate buses for instructions and data.

The principle is the same every time: **when you can't distinguish instructions from data in a shared channel, you separate the channels.**

For AI agents, this means:

- **The LLM decides what the agent wants to do** — this is the data plane. It's nondeterministic, creative, useful.
- **A separate system decides whether the agent is allowed to do it** — this is the control plane. It's deterministic, auditable, and non-bypassable.

The model never evaluates security policy. The security policy never enters the model's context window. They operate on architecturally separate substrates.

---

## What This Looks Like in Practice

We built [DNS-AID](https://dns-aid.org) to be this control plane for agent-to-agent communication.

### The Data Plane (agents do their thing)

```
Agent A (LLM): "I need to call the billing agent to check this invoice"
     → Constructs MCP request: tools/call("check_invoice", {id: "INV-2847"})
     → Nondeterministic. Creative. Useful.
```

### The Control Plane (DNS-AID decides if it's allowed)

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
        "effect": "deny",
        "message": "Caller trust score too low"
      },
      {
        "id": "approved-domains",
        "expression": "request.caller_domain.endsWith('.infoblox.com')",
        "effect": "deny",
        "message": "Only Infoblox agents allowed"
      },
      {
        "id": "geo-sanctions",
        "expression": "!(request.geo_country in ['KP', 'IR', 'SY'])",
        "effect": "deny",
        "message": "Sanctioned country"
      }
    ]
  }
}
```

This policy document is:

- **Published in DNS** by the agent owner (referenced via SVCB record, like DMARC publishes email policy)
- **Fetched and cached** by the caller and target independently
- **Evaluated by a CEL engine** — a Rust-based expression evaluator running in 2 microseconds, not a 500-millisecond LLM inference call
- **Deterministic** — same input, same output, every time, no temperature, no hallucination
- **Auditable** — every evaluation produces a log with rule ID, result, context, timestamp
- **Non-bypassable** — the CEL engine operates outside the agent's reasoning loop. The agent can't "convince" it to make an exception.

### Compare the Two Approaches

**LLM-based security (the bottleneck):**
```
System prompt: "You are a security evaluator. Check if this request
complies with our policy. Trust score must be above 0.7, caller must
be from an approved domain. Here is the request: {ATTACKER_INPUT}"

→ Rules and attacker input share the SAME CONTEXT WINDOW
→ Prompt injection can override the rules
→ Model might "decide" to make an exception
→ Decision can't be reproduced or audited
→ 500ms latency, $0.003 per evaluation
```

**DNS-AID CEL policy (control plane separation):**
```
CEL expression: request.caller_trust_score >= 0.7
Context: { caller_trust_score: 0.3 }
Result: DENY

→ Expression is compiled code, not natural language
→ Context is built from observed traffic, not user input
→ CEL has no "context window" — data and code are separate
→ Cannot be prompt-injected — there's no prompt
→ Every decision is deterministic and reproducible
→ 2µs latency, $0 per evaluation
```

---

## Four Enforcement Layers, Zero LLM Involvement

[DNS-AID](https://dns-aid.org) doesn't enforce policy at a single point. It enforces at four architectural layers, each catching what the others miss:

| Layer | Where | What It Does | Deterministic? | LLM? |
|---|---|---|---|---|
| **Layer 0: DNS** | DNS resolver | Blocks resolution before TCP connect — rogue agent never gets an IP | ✅ | ❌ |
| **Layer 1: Caller SDK** | Before request sent | Evaluates policy pre-flight — stops data leakage before it happens | ✅ | ❌ |
| **Layer 2: Target Middleware** | Before request processed | Mandatory enforcement — works even if caller doesn't cooperate | ✅ | ❌ |
| **Layer 3: Agent Fabric** | Network proxy | Deep inspection with verified context — source IP, real cert, actual payload | ✅ | ❌ |

The same CEL policy document governs all four layers. The same expressions evaluate at each point. What changes is the **context**: Layer 1 has self-reported context (the caller tells you who they are). Layer 3 has verified context (the proxy sees the actual traffic). But the policy logic is identical — deterministic, auditable, and completely outside the model.

---

## The DMARC Precedent

This isn't a thought experiment. We've solved this exact problem before — for email.

SMTP lets anyone send email claiming to be anyone. For decades, the industry tried to fix this with spam filters — ML models that classify emails as legitimate or malicious. Probabilistic. Evadable. Full of false positives.

Then DMARC changed the game. The domain owner publishes a policy in DNS: "emails from my domain must pass SPF alignment and DKIM signature verification. If they don't, reject them." The receiving mail server evaluates this deterministically. No ML involved. The policy is a DNS TXT record, not a prompt.

DMARC didn't make spam filters smarter. It moved authentication from the data plane (email content) to the control plane (DNS policy). It worked because:

- Domain owners control their own policy (sovereignty)
- Evaluation is deterministic (no false positives on policy checks)
- Deployment is graduated (`p=none` → `p=quarantine` → `p=reject`)
- No new infrastructure required (DNS already exists everywhere)

[DNS-AID](https://dns-aid.org) follows the same playbook for agents. Agent owners publish CEL policy in DNS. Callers and targets evaluate it deterministically. Deployment starts permissive and tightens over time. DNS is already deployed in every enterprise.

---

## Identity Without Inference

The original article on the von Neumann bottleneck touches on a critical adjacent problem: **agent identity**. When Agent A calls Agent B, how does B know who A really is?

The LLM approach: "I am Agent A, trust me." Self-asserted identity inside the data plane — the exact same channel the attacker controls.

The infrastructure approach: **cryptographic identity outside the model.**

[DNS-AID](https://dns-aid.org) uses three mechanisms, all operating outside the LLM's reasoning:

- **DNSSEC** — the agent's DNS records are cryptographically signed. If the signature doesn't validate, the agent doesn't exist. No LLM decides this — the resolver's DNSSEC validator is deterministic.
- **DANE/TLSA** — the agent's TLS certificate is bound to its DNS name via TLSA records. Certificate pinning without trusting external PKI. Deterministic validation.
- **OAuth 2.0 token exchange** (RFC 8693) — agents receive scoped, short-lived tokens with explicit delegation chains. The token carries `sub` (who), `act` (on behalf of), `scope` (what), and `exp` (until when). Cryptographically signed. Deterministically verified. The model never sees the token validation logic.

```json
{
  "sub": "agent:billing-bot",
  "act": {"sub": "user:jane.doe@example.com"},
  "scope": "read:invoices",
  "exp": 1711036800
}
```

This is the confused deputy problem solved at the infrastructure layer. The agent's identity, delegation chain, and permissions are in a signed token — not in a prompt that can be injected.

---

## What This Means for Agent Security Decisions

If you're evaluating how to secure agent-to-agent communication, here's the decision framework:

### Ask your vendor this question:

> **"Does your security enforcement involve an LLM in the decision path?"**

If the answer is yes — if they're using a model to classify requests as safe or malicious, to decide whether an agent should be allowed to call another agent, to evaluate whether a prompt is within policy — they have a linguistic von Neumann bottleneck.

The policy and the attack surface share the same reasoning engine. The attacker who controls the input controls the security decision. No amount of guardrails inside the model changes the architecture.

### The right architecture separates the planes:

- **LLMs** reason about intent, plan actions, generate responses. This is what they're brilliant at.
- **Deterministic infrastructure** enforces identity, trust, and authorization. This is what DNS, CEL, cryptographic signatures, and policy engines are built for.
- **They never share a context window.**

This is how hardware solved buffer overflows (NX bit, DEP). How telecom solved in-band signaling (SS7). How email solved spoofing (DMARC). And how agent communication will solve prompt-injection-as-a-service.

The von Neumann bottleneck isn't new. The fix isn't new either. Separate the planes.

---

*[DNS-AID](https://dns-aid.org) is an open IETF standard ([draft-mozleywilliams-dnsop-dnsaid](https://datatracker.ietf.org/doc/draft-mozleywilliams-dnsop-dnsaid/)) for DNS-based agent discovery, identity, and policy enforcement. The CEL policy engine, four-layer enforcement model, and SDK are open source at [github.com/infobloxopen/dns-aid-core](https://github.com/infobloxopen/dns-aid-core). Learn more at [dns-aid.org](https://dns-aid.org).*
