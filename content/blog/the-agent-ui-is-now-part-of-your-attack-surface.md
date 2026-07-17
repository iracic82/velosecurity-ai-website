---
title: "The Agent UI Is Now Part of Your Attack Surface"
description: "MCP's stateless release candidate makes agent UIs a first-class part of the protocol. Most teams are about to treat this as a widget feature. It is a trust boundary."
date: "2026-07-17"
author: "Igor Racic"
tags: ["mcp", "mcp-apps", "a2ui", "agent-security", "architecture"]
image: "/blog/mcp-apps-attack-surface-og.png"
---

# The Agent UI Is Now Part of Your Attack Surface

## What the MCP Stateless Release Really Means for Agent Interfaces

Most of the discussion around MCP Apps is about widgets. Better weather cards, interactive PDF viewers, charts that render instead of stream. All real, all useful, and none of it is why the July 2026 release candidate matters.

What the new spec actually did is make the agent UI part of the protocol itself. That means infrastructure can finally inspect, govern, and secure it.

This matters because an agent that renders arbitrary UI to a human is an agent that can phish, spoof, and socially engineer. A fake MFA prompt. A fake OAuth approval dialog. A fake "reconnect your GitHub account" screen. A fake payment confirmation window. Every one of these is just HTML in front of a user who trusts the chat window it appeared in. No system prompt prevents any of it. If you work in security, you already know where this goes: the interface layer is an attack surface, and until now the agent ecosystem had no architectural answer for it.

The 2026-07-28 spec is that answer. This post is about what it actually changes, what practitioners keep getting wrong about MCP Apps in production, and why the comparison everyone makes with Google's A2UI misses the point.

## Why MCP Apps Exist at All

Ask an agent for the weather and watch what happens in most deployments today. The tool returns JSON. The model reads it, converts it to prose, and streams it back token by token. You paid inference costs for a weather report you could have rendered in a widget for free.

MCP Apps fixes this. The tool response references an HTML resource and the host renders it directly in a sandboxed frame. The user gets an interactive widget inside the chat, and the model no longer has to narrate the interface. The traditional pipeline of JSON to LLM narration to user is gone. Anthropic's engineers demoed a PDF viewer at the MCP Dev Summit this year where users fill fields, stamp documents, and sign, all inside the chat window.

The difference is easiest to see side by side:

```text
Traditional                MCP Apps

Tool                       Tool
  |                          |
JSON                       Structured content
  |                          |
LLM narrates               Sandboxed app renders
  |                          |
Tokens stream              Human interacts
  |                          |
Human reads                     ^
                                |
                          Consent path
                          Audit log
                          Gateway policy
```

Faster, cheaper, better UX. That part everyone gets. The security architecture underneath is what teams are about to miss.

## The Release Candidate in One Paragraph

The 2026-07-28 spec is the largest revision since MCP launched. The protocol is now stateless. The initialize handshake is gone. The session ID is gone. Every request is self-contained, carries its method in an `Mcp-Method` header, and can land on any server instance behind a plain round-robin load balancer. List responses carry TTLs so clients can cache them. W3C trace context propagates through every call. And extensions became first-class citizens with their own lifecycle, which is how MCP Apps went from experiment to official extension.

Each of these reads like an operations improvement. Together they are something else. They make agent traffic inspectable, routable, and enforceable. Not by exotic tooling, by the infrastructure you already run. Envoy, Kong, agentgateway, an API management layer, any reverse proxy can now make routing and authorization decisions on MCP traffic without understanding the application payload. Keep that thought, because it is the point of this post.

## Four Things Practitioners Get Wrong About MCP Apps

The failure patterns with Apps are consistent, and Anthropic's own engineers walked through most of them at the MCP Dev Summit this year. None of them are exotic. All of them come from treating the app as a frontend problem instead of a data flow problem.

### The three fields go to three different places

A tool result carries `content`, `structuredContent`, and `_meta`. They are not interchangeable.

`content` goes to the model. When your app renders the output, the model does not need a narration of it. It needs one line saying what was displayed.

`structuredContent` is typed data for your app. Here is the detail almost everyone misses: if `content` is also present, `structuredContent` is hidden from the model entirely.

`_meta` goes to the app only. The model never sees it. Internal IDs, prefetched data, view UUIDs, operational plumbing.

This is not plumbing trivia. It is a security boundary. Put a customer record in the wrong field and you have either leaked it into model context or silently hidden it from the app that needed it. The bugs this produces are quiet and hard to spot, which is the worst kind.

### The token economics changed and pricing assumptions did not

MCP Apps has a primitive called `updateModelContext`. Your app pushes state to the model, a screenshot, a page number, a selection, and nothing gets sent until the next user turn. Call it a thousand times, only the last version counts.

The PDF viewer uses this. A user flips through 100 pages and consumes zero tokens. When they finally type a question, the model has exact context about what they are looking at. If your cost model still assumes every interaction round-trips through inference, it is wrong by an order of magnitude.

### Auth breaks three weeks later

The tempting shortcut is passing auth tokens through tool results so the app can call APIs directly. It works in the demo. Then a user reopens a chat from three weeks ago, the token has expired, and they are staring at a dead widget.

The pattern that survives production is boring. Anything that needs auth goes through tool calls, which reuse the host's existing auth infrastructure. The spec even supports app-visible-only tools that the model never sees, so internal app operations do not pollute the tool list and confuse the model. Unauthenticated data can be fetched directly like any web app, with declared domains.

### The state did not disappear, it became a policy object

The stateless protocol removed the session, and some teams read that as a loss. It is the opposite.

Hidden state is impossible to audit. A session ID buried in transport metadata is opaque to every policy engine between the client and the server. Nobody can validate what it grants, when it expires, or which tenant it belongs to.

Explicit state is another policy object. Servers that need state across calls now mint explicit handles, a `basket_id`, a `view_id`, a `draft_id`, and the model passes them back as ordinary arguments. Once those handles are visible protocol fields, a gateway can validate ownership, expiration, tenancy, and lifecycle instead of blindly trusting an opaque server session. For app state specifically, you implement get and set tools keyed to the view's unique ID, or accept the tradeoffs of browser local storage for non-critical data.

The state did not go away. It moved from a place where policy could not see it to a place where policy can act on it.

## A2UI Answers the Same Question Differently

Google's A2UI project gets compared to MCP Apps constantly, and almost every comparison treats them as two competing widget formats.

Both projects are answers to one question: how do you let an agent put an interface in front of a human without handing it arbitrary code execution?

A2UI's answer is to never send code. The agent emits a declarative JSON description of the UI, a flat list of components with ID references. The client renders it using its own native component catalog, Flutter, Angular, Lit, whatever it has. The agent can only request components the client has pre-approved. Their tagline is "safe like data, expressive like code," and the format is deliberately easy for an LLM to generate and update incrementally. A2UI sits at v0.9 in production with a v1.0 spec in release candidate now.

MCP Apps' answer is to send code but contain it. Real HTML runs in a sandboxed iframe. Templates are declared ahead of time so hosts can prefetch, cache, and security-review them before anything executes. And every action the UI takes flows through the same JSON-RPC channel and the same audit and consent path as a direct tool call.

A2UI trades expressiveness for a smaller attack surface: no code crosses the boundary, but you are limited to the component catalog and the ecosystem has to agree on it. MCP Apps trades containment complexity for full expressiveness: anything a web app can do, inside a sandbox the host controls.

Most teams compare them as UI frameworks. They are actually different security models. Pick based on the trust boundary you need, not on which demo looked better.

## Why the Stateless Core Is the Security Story

Here is where the release candidate and the apps story converge, and why I think this release matters more than the feature list suggests.

Before this spec, governing MCP traffic at a gateway meant deep packet inspection and sticky sessions. State lived in the transport where policy engines could not see it. Now every request is self-contained, names its operation in a header, and carries trace context end to end. A gateway can route, rate-limit, and apply policy per operation without opening the body. A `tools/list` response has an explicit TTL and cache scope. A UI action is indistinguishable from a tool call at the audit layer, because it is one.

I wrote earlier this year that you cannot prompt your way to agent security, that invariants need deterministic enforcement outside the model's reasoning loop. The interface layer was the obvious gap in that argument. The fake MFA prompt and the spoofed OAuth dialog were always the endgame of an ungoverned agent UI.

The 2026-07-28 spec closes the gap the same way every mature protocol eventually does. Not with model alignment. With pre-declared templates a host can review before execution, sandboxes with defined capabilities, consent paths every UI action must route through, and a wire format that Envoy, Kong, or any proxy in your stack can inspect and enforce.

For years we have treated agent security as a prompt engineering problem. It is not. It is becoming an infrastructure problem. And that is good news, because infrastructure is something we already know how to govern.

---

*Building agent infrastructure and want the enforcement layer to be deterministic? That is what we do at [VeloSecurity AI](https://velosecurity-ai.io). Get in touch.*
