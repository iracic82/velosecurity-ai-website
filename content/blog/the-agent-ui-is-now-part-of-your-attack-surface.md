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

Most of the discussion around MCP Apps is about widgets. That part is real and useful. It is also not why the July 2026 release candidate matters.

What the new spec actually did is make the agent UI part of the protocol itself. That means infrastructure can finally inspect and govern it.

This matters because an agent that renders arbitrary UI to a human is an agent that can phish. A fake MFA prompt. A fake OAuth approval dialog. A fake "reconnect your GitHub account" screen. A fake payment confirmation window. Every one of these is just HTML in front of a user who trusts the chat window it appeared in. No system prompt prevents any of it. If you work in security you already know where this goes: the interface layer is an attack surface. Until now the agent ecosystem had no architectural answer for it.

The 2026-07-28 spec is that answer. This post covers what it actually changes, what practitioners keep getting wrong about MCP Apps in production and why the comparison everyone makes with Google's A2UI misses the point.

## Why MCP Apps Exist at All

Ask an agent which of your container images ship a vulnerable OpenSSL build. In most deployments today the scanner returns a few hundred images as JSON. The model reads all of it. Then it writes you an essay about it, token by token. You paid inference costs for something that should have been a sortable table.

MCP Apps fixes this. The tool response references an HTML resource. The host renders it directly in a sandboxed frame. The user gets an interactive view inside the chat and the model no longer has to narrate the interface. The traditional pipeline of JSON to LLM narration to user is gone. Anthropic's engineers demoed a PDF viewer at the MCP Dev Summit this year where users fill fields, stamp documents and sign without leaving the chat window.

The difference is easiest to see side by side:

<svg viewBox="0 0 800 440" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Traditional narration pipeline compared with the MCP Apps rendering pipeline" style="width:100%;height:auto;max-width:760px;display:block;margin:2rem auto;">
  <defs>
    <marker id="arrGray" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="#475569"/></marker>
    <marker id="arrCyan" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="#00d4ff"/></marker>
    <marker id="arrPurple" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="#7c3aed"/></marker>
  </defs>
  <text x="170" y="36" fill="#64748b" font-size="15" font-weight="700" text-anchor="middle" font-family="ui-sans-serif,system-ui,sans-serif" letter-spacing="1">TRADITIONAL</text>
  <text x="470" y="36" fill="#00d4ff" font-size="15" font-weight="700" text-anchor="middle" font-family="ui-sans-serif,system-ui,sans-serif" letter-spacing="1">MCP APPS</text>
  <g font-family="ui-sans-serif,system-ui,sans-serif" font-size="14" text-anchor="middle">
    <rect x="70" y="58" width="200" height="42" rx="8" fill="#0b0f1a" stroke="#334155"/><text x="170" y="84" fill="#94a3b8">Tool</text>
    <line x1="170" y1="100" x2="170" y2="126" stroke="#475569" stroke-width="1.5" marker-end="url(#arrGray)"/>
    <rect x="70" y="130" width="200" height="42" rx="8" fill="#0b0f1a" stroke="#334155"/><text x="170" y="156" fill="#94a3b8">JSON</text>
    <line x1="170" y1="172" x2="170" y2="198" stroke="#475569" stroke-width="1.5" marker-end="url(#arrGray)"/>
    <rect x="70" y="202" width="200" height="42" rx="8" fill="#0b0f1a" stroke="#334155"/><text x="170" y="228" fill="#94a3b8">LLM narrates</text>
    <line x1="170" y1="244" x2="170" y2="270" stroke="#475569" stroke-width="1.5" marker-end="url(#arrGray)"/>
    <rect x="70" y="274" width="200" height="42" rx="8" fill="#0b0f1a" stroke="#334155"/><text x="170" y="300" fill="#94a3b8">Tokens stream</text>
    <line x1="170" y1="316" x2="170" y2="342" stroke="#475569" stroke-width="1.5" marker-end="url(#arrGray)"/>
    <rect x="70" y="346" width="200" height="42" rx="8" fill="#0b0f1a" stroke="#334155"/><text x="170" y="372" fill="#94a3b8">Human reads</text>
    <rect x="370" y="58" width="200" height="42" rx="8" fill="#0b0f1a" stroke="#00d4ff" stroke-opacity="0.55"/><text x="470" y="84" fill="#e2e8f0">Tool</text>
    <line x1="470" y1="100" x2="470" y2="150" stroke="#00d4ff" stroke-width="1.5" stroke-opacity="0.7" marker-end="url(#arrCyan)"/>
    <rect x="370" y="154" width="200" height="42" rx="8" fill="#0b0f1a" stroke="#00d4ff" stroke-opacity="0.55"/><text x="470" y="180" fill="#e2e8f0">Structured content</text>
    <line x1="470" y1="196" x2="470" y2="246" stroke="#00d4ff" stroke-width="1.5" stroke-opacity="0.7" marker-end="url(#arrCyan)"/>
    <rect x="370" y="250" width="200" height="42" rx="8" fill="#0b0f1a" stroke="#00d4ff" stroke-opacity="0.55"/><text x="470" y="276" fill="#e2e8f0">Sandboxed app renders</text>
    <line x1="470" y1="292" x2="470" y2="342" stroke="#00d4ff" stroke-width="1.5" stroke-opacity="0.7" marker-end="url(#arrCyan)"/>
    <rect x="370" y="346" width="200" height="42" rx="8" fill="#0b0f1a" stroke="#00d4ff" stroke-opacity="0.55"/><text x="470" y="372" fill="#e2e8f0">Human interacts</text>
    <rect x="614" y="216" width="166" height="110" rx="10" fill="#0b0f1a" stroke="#7c3aed" stroke-opacity="0.7"/>
    <text x="697" y="248" fill="#c4b5fd" font-size="13">Consent path</text>
    <text x="697" y="274" fill="#c4b5fd" font-size="13">Audit log</text>
    <text x="697" y="300" fill="#c4b5fd" font-size="13">Gateway policy</text>
    <line x1="614" y1="271" x2="578" y2="271" stroke="#7c3aed" stroke-width="1.5" marker-end="url(#arrPurple)"/>
  </g>
</svg>

Faster and cheaper with a better UX. That part everyone gets. The security architecture underneath is what teams are about to miss.

## The Release Candidate in One Paragraph

The 2026-07-28 spec is the largest revision since MCP launched. The protocol is now stateless. The initialize handshake is gone. The session ID is gone. Every request is self-contained and carries its method in an `Mcp-Method` header. Any server instance behind a plain round-robin load balancer can answer it. List responses carry TTLs so clients can cache them. W3C trace context propagates through every call. Extensions became first-class citizens with their own lifecycle, which is how MCP Apps went from experiment to official extension.

Here is what that looks like on the wire. One self-contained request. No handshake before it and no session pinning after it:

```http
POST /mcp HTTP/1.1
MCP-Protocol-Version: 2026-07-28
Mcp-Method: tools/call
Mcp-Name: scan_images
Content-Type: application/json

{"jsonrpc":"2.0","id":1,"method":"tools/call",
 "params":{"name":"scan_images","arguments":{"registry":"prod"}}}
```

The operation is right there in the headers. A gateway can rate-limit `tools/call` for one tenant without parsing the body. Try doing that when the interesting bits live inside a session pinned to instance number three.

Each of these changes reads like an operations improvement. Together they are something else. They make agent traffic inspectable, routable and enforceable. Not by exotic tooling. By the infrastructure you already run. Envoy, Kong, agentgateway, an API management layer or any reverse proxy can now make routing and authorization decisions on MCP traffic without understanding the application payload. Keep that thought, because it is the point of this post.

## Four Things Practitioners Get Wrong About MCP Apps

The failure patterns with Apps are consistent and Anthropic's own engineers walked through most of them at the MCP Dev Summit this year. None of them are exotic. All of them come from treating the app as a frontend problem instead of a data flow problem.

### One tool result, three audiences

Look at what that image scanner actually returns:

```json
{
  "content": [
    { "type": "text", "text": "Displayed scan results: 41 of 380 images ship a vulnerable OpenSSL" }
  ],
  "structuredContent": {
    "total": 380,
    "affected": [ { "image": "payments-api:2.4.1", "openssl": "3.0.2" } ]
  },
  "_meta": {
    "viewId": "9f2c1a",
    "prefetchedDetails": "..."
  }
}
```

One result, three audiences. Each field travels to a different destination:

<svg viewBox="0 0 800 320" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Routing of content to the model and structuredContent plus meta to the app" style="width:100%;height:auto;max-width:760px;display:block;margin:2rem auto;">
  <defs>
    <marker id="fArrCyan" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="#00d4ff"/></marker>
    <marker id="fArrPurple" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="#7c3aed"/></marker>
  </defs>
  <rect x="40" y="44" width="240" height="228" rx="12" fill="#0b0f1a" stroke="#334155"/>
  <text x="160" y="76" fill="#e2e8f0" font-size="14" font-weight="600" text-anchor="middle" font-family="ui-sans-serif,system-ui,sans-serif">Tool result</text>
  <g font-family="ui-monospace,Menlo,monospace" font-size="13" text-anchor="middle">
    <rect x="62" y="96" width="196" height="36" rx="6" fill="#0d1526" stroke="#1e3a4a"/><text x="160" y="119" fill="#00d4ff">content</text>
    <rect x="62" y="152" width="196" height="36" rx="6" fill="#0d1526" stroke="#1e3a4a"/><text x="160" y="175" fill="#00d4ff">structuredContent</text>
    <rect x="62" y="208" width="196" height="36" rx="6" fill="#0d1526" stroke="#1e3a4a"/><text x="160" y="231" fill="#00d4ff">_meta</text>
  </g>
  <rect x="580" y="60" width="180" height="56" rx="10" fill="#0b0f1a" stroke="#00d4ff" stroke-opacity="0.6"/>
  <text x="670" y="94" fill="#e2e8f0" font-size="14" font-weight="600" text-anchor="middle" font-family="ui-sans-serif,system-ui,sans-serif">Model</text>
  <rect x="580" y="170" width="180" height="86" rx="10" fill="#0b0f1a" stroke="#7c3aed" stroke-opacity="0.7"/>
  <text x="670" y="219" fill="#e2e8f0" font-size="14" font-weight="600" text-anchor="middle" font-family="ui-sans-serif,system-ui,sans-serif">App</text>
  <g font-family="ui-sans-serif,system-ui,sans-serif" font-size="12">
    <line x1="258" y1="114" x2="576" y2="90" stroke="#00d4ff" stroke-width="1.5" stroke-opacity="0.8" marker-end="url(#fArrCyan)"/>
    <text x="415" y="88" fill="#64748b" text-anchor="middle">one line of context</text>
    <line x1="258" y1="170" x2="576" y2="200" stroke="#7c3aed" stroke-width="1.5" stroke-opacity="0.9" marker-end="url(#fArrPurple)"/>
    <text x="415" y="172" fill="#64748b" text-anchor="middle">typed data to render</text>
    <line x1="258" y1="226" x2="576" y2="236" stroke="#7c3aed" stroke-width="1.5" stroke-opacity="0.9" marker-end="url(#fArrPurple)"/>
    <text x="415" y="248" fill="#64748b" text-anchor="middle">internal plumbing</text>
    <text x="400" y="302" fill="#64748b" text-anchor="middle" font-style="italic">_meta never reaches the model</text>
  </g>
</svg>

The single line in `content` is everything the model sees. The dataset in `structuredContent` is what the app renders. The view ID in `_meta` stays in the app layer and never enters model context.

Getting the split wrong is how apps leak. Dump the full image list into `content` and you have flooded the model with data nobody asked it to read. Park a customer record in `_meta` because it looked like metadata and the app that needed it renders an empty table. And the quirk that catches almost every first-time builder: the moment `content` is present, the model stops seeing `structuredContent` entirely. These bugs are quiet. Nothing crashes. The wrong audience just gets the wrong data.

### The token economics changed and pricing assumptions did not

MCP Apps has a primitive called `updateModelContext`. Your app pushes state to the model. A screenshot. A page number. A selection. Nothing gets sent until the next user turn. Call it a thousand times and only the last version counts.

The PDF viewer uses this. A user flips through 100 pages and consumes zero tokens. When they finally type a question the model has exact context about what they are looking at. If your cost model still assumes every interaction round-trips through inference, it is wrong by an order of magnitude.

### Auth breaks three weeks later

The tempting shortcut is passing auth tokens through tool results so the app can call APIs directly. It works in the demo. Then a user reopens a chat from three weeks ago. The token has expired and they are staring at a dead widget.

The pattern that survives production is boring. Anything that needs auth goes through tool calls, which reuse the host's existing auth infrastructure. The spec even supports app-visible-only tools that the model never sees, so internal app operations do not pollute the tool list. Unauthenticated data can be fetched directly like any web app, with declared domains.

### The state did not disappear, it became a policy object

The stateless protocol removed the session and some teams read that as a loss. It is the opposite.

Hidden state is impossible to audit. A session ID buried in transport metadata is opaque to every policy engine between the client and the server. Nobody can validate what it grants, when it expires or which tenant it belongs to.

Explicit state is another policy object. Servers that need state across calls now mint explicit handles and the model passes them back as ordinary arguments:

```text
Turn 1:  create_change_request()        →  { "changeId": "chg_4471" }
Turn 2:  add_firewall_rule(chg_4471)    →  rule staged
Turn 3:  submit_for_approval(chg_4471)  →  pending review
```

Once `chg_4471` is a visible protocol field, a gateway can validate ownership, expiration, tenancy and lifecycle instead of blindly trusting an opaque server session. For app state specifically you implement get and set tools keyed to the view's unique ID, or accept the tradeoffs of browser local storage for non-critical data.

The state did not go away. It moved from a place where policy could not see it to a place where policy can act on it.

## A2UI Answers the Same Question Differently

Google's A2UI project gets compared to MCP Apps constantly and almost every comparison treats them as two competing widget formats.

Both projects are answers to one question: how do you let an agent put an interface in front of a human without handing it arbitrary code execution?

A2UI's answer is to never send code. The agent emits a declarative JSON description of the UI as a flat list of components with ID references. The client renders it using its own native component catalog. Flutter, Angular, Lit, whatever it has. The agent can only request components the client has pre-approved. Their tagline is "safe like data, expressive like code" and the format is deliberately easy for an LLM to generate incrementally. A2UI sits at v0.9 in production with a v1.0 spec in release candidate now.

MCP Apps' answer is to send code but contain it. Real HTML runs in a sandboxed iframe. Templates are declared ahead of time so hosts can prefetch, cache and security-review them before anything executes. Every action the UI takes flows through the same JSON-RPC channel and the same audit and consent path as a direct tool call.

Side by side, the trade looks like this:

| | MCP Apps | A2UI |
|---|---|---|
| What crosses the boundary | Sandboxed HTML | Declarative JSON |
| Who renders it | Iframe the host controls | Client's native component catalog |
| Expressiveness | Anything a web app can do | Limited to the approved catalog |
| Trust model | Contain the code | Never send code |
| Where governance lives | Template review, consent path, gateway | Catalog approval |

Most teams compare them as UI frameworks. They are actually different security models. Pick based on the trust boundary you need, not on which demo looked better.

## Why the Stateless Core Is the Security Story

Here is where the release candidate and the apps story converge and why I think this release matters more than the feature list suggests.

Before this spec, governing MCP traffic at a gateway meant deep packet inspection and sticky sessions. State lived in the transport where policy engines could not see it. Now every request is self-contained, names its operation in a header and carries trace context end to end. A gateway can route, rate-limit and apply policy per operation without opening the body. A `tools/list` response has an explicit TTL and cache scope. A UI action is indistinguishable from a tool call at the audit layer, because it is one.

I wrote earlier this year that you cannot prompt your way to agent security. Invariants need deterministic enforcement outside the model's reasoning loop. The interface layer was the obvious gap in that argument. The fake MFA prompt and the spoofed OAuth dialog were always the endgame of an ungoverned agent UI.

The 2026-07-28 spec closes the gap the same way every mature protocol eventually does. Not with model alignment. With pre-declared templates a host can review before execution. With sandboxes that have defined capabilities. With consent paths every UI action must route through. With a wire format that Envoy, Kong or any proxy in your stack can inspect and enforce.

For years we have treated agent security as a prompt engineering problem. It is not. It is becoming an infrastructure problem. That is good news, because infrastructure is something we already know how to govern.

---

*Building agent infrastructure and want the enforcement layer to be deterministic? That is what we do at [VeloSecurity AI](https://velosecurity-ai.io). Get in touch.*
