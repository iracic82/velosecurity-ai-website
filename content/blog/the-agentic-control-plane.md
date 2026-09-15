---
title: "The Agentic Control Plane"
description: "A model can be fully safe and the system built around it still isn't, once it can call tools, invoke MCP servers, and touch infrastructure. The security boundary moved to the execution path, and it needs a control plane of its own."
date: "2026-09-15"
author: "Igor Racic"
tags: ["agent-security", "policy", "architecture", "mcp", "agent-gateway"]
image: "/blog/agentic-control-plane-og.png"
---

# The Agentic Control Plane

## Why Securing the Model Is No Longer Enough

For the last few years, most of the conversation around AI security has focused on the model itself: can we prevent prompt injection, filter harmful output before it reaches a user, stop sensitive data from leaking into a response, get the model to behave the way we designed it to. Those are legitimate questions and a lot of good engineering has gone into answering them.

Agents change what's actually at stake. A language model that produces a bad answer is a contained problem: the damage stops at the chat window. A model that can call APIs, invoke MCP tools, modify infrastructure, send messages, create identities, update databases, or trigger downstream workflows is a different animal. The blast radius stopped being a wrong sentence and became whatever the agent happens to be plugged into. The security boundary moved, and a lot of our tooling hasn't caught up with it yet.

## A Safe Model Doesn't Guarantee a Safe System

Take a simple agent wired up to a handful of legitimate tools: `search_documents()`, `create_ticket()`, `send_email()`, `update_record()`. Every one of those tools can be properly authenticated. Every API call can be valid. Every individual action can look completely reasonable on its own, and the outcome can still be wrong. The agent retrieves the right document, pulls out genuinely sensitive information, and emails it to the wrong person. Nothing failed at the API layer. The model didn't generate anything malicious. Every tool did exactly what it was built to do. What failed was the composition of those calls, the order and context they happened in, and that's the part almost nobody is watching for yet.

<svg viewBox="0 0 800 335" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Four individually valid tool calls converging into one unsafe outcome" style="width:100%;height:auto;max-width:760px;display:block;margin:2rem auto;">
  <defs>
    <marker id="ac1ArrGray" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="#475569"/></marker>
  </defs>
  <text x="400" y="24" fill="#64748b" font-size="13" font-weight="700" text-anchor="middle" font-family="ui-sans-serif,system-ui,sans-serif" letter-spacing="1">FOUR VALID TOOL CALLS</text>
  <g font-family="ui-sans-serif,system-ui,sans-serif" text-anchor="middle">
    <rect x="20" y="46" width="170" height="54" rx="8" fill="#0b0f1a" stroke="#00d4ff" stroke-opacity="0.5"/>
    <text x="105" y="70" fill="#e2e8f0" font-size="12">search_documents()</text>
    <text x="105" y="89" fill="#64748b" font-size="11">valid, authenticated</text>
    <rect x="210" y="46" width="170" height="54" rx="8" fill="#0b0f1a" stroke="#00d4ff" stroke-opacity="0.5"/>
    <text x="295" y="70" fill="#e2e8f0" font-size="12">create_ticket()</text>
    <text x="295" y="89" fill="#64748b" font-size="11">valid, authorized</text>
    <rect x="400" y="46" width="170" height="54" rx="8" fill="#0b0f1a" stroke="#00d4ff" stroke-opacity="0.5"/>
    <text x="485" y="70" fill="#e2e8f0" font-size="12">send_email()</text>
    <text x="485" y="89" fill="#64748b" font-size="11">valid, authorized</text>
    <rect x="610" y="46" width="170" height="54" rx="8" fill="#0b0f1a" stroke="#00d4ff" stroke-opacity="0.5"/>
    <text x="695" y="70" fill="#e2e8f0" font-size="12">update_record()</text>
    <text x="695" y="89" fill="#64748b" font-size="11">valid, authorized</text>
  </g>
  <path d="M105 100 C 105 170, 300 190, 380 234" fill="none" stroke="#475569" stroke-width="1.5" marker-end="url(#ac1ArrGray)"/>
  <path d="M295 100 C 295 160, 340 190, 385 234" fill="none" stroke="#475569" stroke-width="1.5" marker-end="url(#ac1ArrGray)"/>
  <path d="M485 100 C 485 160, 450 190, 415 234" fill="none" stroke="#475569" stroke-width="1.5" marker-end="url(#ac1ArrGray)"/>
  <path d="M695 100 C 695 170, 480 190, 420 234" fill="none" stroke="#475569" stroke-width="1.5" marker-end="url(#ac1ArrGray)"/>
  <rect x="250" y="238" width="300" height="60" rx="10" fill="#0b0f1a" stroke="#7c3aed" stroke-opacity="0.75"/>
  <text x="400" y="263" fill="#c4b5fd" font-size="13" text-anchor="middle">The right document reaches</text>
  <text x="400" y="283" fill="#c4b5fd" font-size="13" text-anchor="middle">the wrong person</text>
  <text x="400" y="320" fill="#64748b" font-size="12" text-anchor="middle" font-style="italic">Every call passed. The path between them didn't.</text>
</svg>

Agent security stopped being a property of the model somewhere in the last couple of years. It's now a property of the entire execution path: user, agent, model, gateway, tool, API, system. Every hop in that chain adds its own context, its own identity, its own permissions, and often its own trust boundary that the previous hop knew nothing about.

<svg viewBox="0 0 800 260" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Execution path from user through agent, model, gateway, tool, and API, to system, with the control plane governing the middle hops" style="width:100%;height:auto;max-width:760px;display:block;margin:2rem auto;">
  <defs>
    <marker id="ac2ArrCyan" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="#00d4ff"/></marker>
  </defs>
  <g font-family="ui-sans-serif,system-ui,sans-serif" font-size="12" text-anchor="middle">
    <rect x="40" y="60" width="90" height="50" rx="8" fill="#0b0f1a" stroke="#334155"/><text x="85" y="90" fill="#94a3b8">User</text>
    <rect x="145" y="60" width="90" height="50" rx="8" fill="#0b0f1a" stroke="#334155"/><text x="190" y="90" fill="#94a3b8">Agent</text>
    <rect x="250" y="60" width="90" height="50" rx="8" fill="#0b0f1a" stroke="#334155"/><text x="295" y="90" fill="#94a3b8">Model</text>
    <rect x="355" y="60" width="90" height="50" rx="8" fill="#0b0f1a" stroke="#00d4ff" stroke-opacity="0.6"/><text x="400" y="90" fill="#e2e8f0">Gateway</text>
    <rect x="460" y="60" width="90" height="50" rx="8" fill="#0b0f1a" stroke="#00d4ff" stroke-opacity="0.6"/><text x="505" y="90" fill="#e2e8f0">Tool</text>
    <rect x="565" y="60" width="90" height="50" rx="8" fill="#0b0f1a" stroke="#00d4ff" stroke-opacity="0.6"/><text x="610" y="90" fill="#e2e8f0">API</text>
    <rect x="670" y="60" width="90" height="50" rx="8" fill="#0b0f1a" stroke="#334155"/><text x="715" y="90" fill="#94a3b8">System</text>
  </g>
  <g stroke="#00d4ff" stroke-width="1.5" stroke-opacity="0.75">
    <line x1="130" y1="85" x2="141" y2="85" marker-end="url(#ac2ArrCyan)"/>
    <line x1="235" y1="85" x2="246" y2="85" marker-end="url(#ac2ArrCyan)"/>
    <line x1="340" y1="85" x2="351" y2="85" marker-end="url(#ac2ArrCyan)"/>
    <line x1="445" y1="85" x2="456" y2="85" marker-end="url(#ac2ArrCyan)"/>
    <line x1="550" y1="85" x2="561" y2="85" marker-end="url(#ac2ArrCyan)"/>
    <line x1="655" y1="85" x2="666" y2="85" marker-end="url(#ac2ArrCyan)"/>
  </g>
  <rect x="345" y="150" width="320" height="46" rx="10" fill="#0b0f1a" stroke="#7c3aed" stroke-opacity="0.7"/>
  <text x="505" y="178" fill="#c4b5fd" font-size="13" text-anchor="middle">This is where the control plane has to live</text>
  <path d="M400 150 L400 122" stroke="#7c3aed" stroke-width="1.5" stroke-opacity="0.7" fill="none"/>
  <path d="M610 150 L610 122" stroke="#7c3aed" stroke-width="1.5" stroke-opacity="0.7" fill="none"/>
  <text x="400" y="228" fill="#64748b" font-size="11" text-anchor="middle">reasoning ends</text>
  <text x="610" y="228" fill="#64748b" font-size="11" text-anchor="middle">execution begins</text>
</svg>

## Authentication Is Only the Beginning

Traditional application security is built around one question: can this identity perform this operation? Agentic systems force a second question alongside it: should this operation happen, right now, in this specific context? Those sound similar. They are not the same question at all.

Picture an agent that holds a valid, properly scoped permission to call `delete_resource()`. From an IAM standpoint there's nothing to flag. The agent authenticated correctly, the tool exists, the identity has the permission attached to it, and the API will happily accept the request. None of that tells you whether deleting this particular resource, because of this particular instruction, on behalf of this particular user, was actually what anyone intended to happen. Authentication answers who can act. Authorization answers what they're allowed to touch. What's missing is a layer that looks at the specific action, in the specific moment, and decides whether it should actually go through.

| Layer | Question it answers | In practice |
|---|---|---|
| Authentication | Is this really the identity it claims to be? | A signed token verifies the calling agent |
| Authorization | What is this identity allowed to touch? | The agent's role permits calling `delete_resource()` |
| Runtime policy | Should this specific action happen right now? | Deleting this resource, in this context, for this user, matches intent |

## Building the Control Plane Between Reasoning and Execution

As agents stop being chat interfaces and start acting as genuine participants in your infrastructure, you need a control layer sitting between reasoning and execution. Intent flows from the agent through an agent gateway, into MCP servers and APIs, and only then into infrastructure that actually changes state.

That control plane needs real context to make a decision. Who initiated the action, and which agent is carrying it out. Which tool is being invoked, and which identity is being delegated to make the call. What resource is about to change, and whether this is a read or a write. What the blast radius looks like if the action goes wrong, and whether it still matches the intent the user actually expressed. Whether it needs a human to approve it before anything happens at all.

This is a fundamentally different exercise from inspecting a prompt for bad phrasing. The model can reason about what it wants to do. The tool can execute what it's told. Policy has to govern the transition between the two, and it has to do that with information a prompt filter never sees.

## Discovery Has to Come First

There's another piece of this that doesn't get nearly enough attention, and it sits earlier in the chain than any of the policy questions above. Before an agent can safely invoke anything, it needs to know what it's actually talking to. That sounds trivial until you notice how much of agent discovery today is just another LLM guess: the model reads a description, decides a tool looks right, and calls it. Discovery can't stay a probabilistic decision made inside the reasoning loop. I've [written before](/blog/you-cant-prompt-your-way-to-agent-security) about why security invariants can't live inside a system that's fundamentally stochastic, and discovery is the same argument one layer earlier. Networks solved this decades ago with deterministic mechanisms for finding infrastructure and services. Agentic systems need the same thing: deterministic discovery, deterministic identity, and trust that doesn't depend on the model getting lucky.

Reasoning can stay probabilistic. Discovery shouldn't be. Once an agent has deterministically discovered a service or a tool, the gateway and policy layers downstream can actually reason about what interactions to permit, because they're reasoning about something real instead of something the model believes is real.

Put the pieces next to each other and a shape starts to form. Discovery establishes what exists and where to find it. Identity establishes who's actually involved in the exchange. Authorization establishes what that identity is allowed to touch. Runtime policy establishes what should happen in this specific instance. Observability tells you afterward what happened and why. None of that reads like a feature you bolt onto a model. It reads like infrastructure, because that's what it is.

<svg viewBox="0 0 800 200" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Five layer stack from discovery through identity, authorization, and runtime policy, to observability" style="width:100%;height:auto;max-width:760px;display:block;margin:2rem auto;">
  <defs>
    <marker id="ac3ArrCyan" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="#00d4ff"/></marker>
  </defs>
  <g font-family="ui-sans-serif,system-ui,sans-serif" font-size="13" text-anchor="middle">
    <rect x="35" y="60" width="130" height="60" rx="8" fill="#0b0f1a" stroke="#00d4ff" stroke-opacity="0.5"/>
    <text x="100" y="86" fill="#e2e8f0">Discovery</text><text x="100" y="104" fill="#64748b" font-size="10">what exists, where</text>
    <line x1="165" y1="90" x2="181" y2="90" stroke="#00d4ff" stroke-width="1.5" stroke-opacity="0.8" marker-end="url(#ac3ArrCyan)"/>
    <rect x="185" y="60" width="130" height="60" rx="8" fill="#0b0f1a" stroke="#00d4ff" stroke-opacity="0.5"/>
    <text x="250" y="86" fill="#e2e8f0">Identity</text><text x="250" y="104" fill="#64748b" font-size="10">who's involved</text>
    <line x1="315" y1="90" x2="331" y2="90" stroke="#00d4ff" stroke-width="1.5" stroke-opacity="0.8" marker-end="url(#ac3ArrCyan)"/>
    <rect x="335" y="60" width="130" height="60" rx="8" fill="#0b0f1a" stroke="#00d4ff" stroke-opacity="0.5"/>
    <text x="400" y="86" fill="#e2e8f0">Authorization</text><text x="400" y="104" fill="#64748b" font-size="10">what they can touch</text>
    <line x1="465" y1="90" x2="481" y2="90" stroke="#00d4ff" stroke-width="1.5" stroke-opacity="0.8" marker-end="url(#ac3ArrCyan)"/>
    <rect x="485" y="60" width="130" height="60" rx="8" fill="#0b0f1a" stroke="#00d4ff" stroke-opacity="0.5"/>
    <text x="550" y="86" fill="#e2e8f0">Runtime policy</text><text x="550" y="104" fill="#64748b" font-size="10">what should happen</text>
    <line x1="615" y1="90" x2="631" y2="90" stroke="#00d4ff" stroke-width="1.5" stroke-opacity="0.8" marker-end="url(#ac3ArrCyan)"/>
    <rect x="635" y="60" width="130" height="60" rx="8" fill="#0b0f1a" stroke="#00d4ff" stroke-opacity="0.5"/>
    <text x="700" y="86" fill="#e2e8f0">Observability</text><text x="700" y="104" fill="#64748b" font-size="10">what happened, why</text>
  </g>
  <text x="400" y="160" fill="#64748b" font-size="12" text-anchor="middle">Five different questions. Together they read as one control plane, not five features.</text>
</svg>

## The Security Model Is Moving Down the Stack

The question the industry has been asking is whether the model is safe. The question that actually matters is whether the agentic system built around it is safe, and that's a much harder thing to answer, because the answer was never sitting inside the LLM to begin with. It's distributed across identity, discovery, gateways, MCP servers, APIs, policy engines, infrastructure, and the specific context in which an action occurs.

None of the next generation of AI security gets solved with a better system prompt, and it doesn't get solved by wrapping another filter around the model either. What it needs is infrastructure that accepts reasoning will always be probabilistic and makes sure execution never is. The model gets to reason freely about what it wants to do. The agent gets to act on that reasoning. But it's the infrastructure underneath both of them that decides what's actually allowed to change, and that's where the real agent security boundary is forming right now.

---

*We think about this exact boundary at [VeloSecurity AI](https://velosecurity-ai.io), the layer between an agent's reasoning and the infrastructure it's allowed to touch. If your team is building agent systems and trying to work out where policy enforcement actually belongs, get in touch.*
