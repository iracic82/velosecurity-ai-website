---
title: "If Networking Is 90% of Agentic Infrastructure, the Network Should Be the Platform"
description: "How F5 BIG-IP Next for Kubernetes runs a GPU cloud or AI factory as one programmable platform, from picking the site down to picking the GPU."
date: "2026-11-02"
author: "Igor Racic"
tags: ["ai-infrastructure", "kubernetes", "inference", "agent-security", "f5-bnk"]
---

# If Networking Is 90% of Agentic Infrastructure, the Network Should Be the Platform

## How F5 BIG-IP Next for Kubernetes Runs a GPU Cloud as One Programmable Platform

Michael Levan opens his post with "networking is 90% of what you need to get right" in agentic infrastructure. I agree. And if networking is 90% of the job, the network shouldn't be a pipe agents pass through. It should be the platform the AI factory runs on.

His post, ["Agent Substrate + Agentgateway: Your Secure Egress Path to Models"](https://www.cloudnativedeepdive.com/agent-substrate-agentgateway-your-secure-egress-path-to-models/), is a clear hands-on walkthrough of one slice of that: getting a sandboxed agent's traffic to a model. Read it first. This post zooms out to the platform that slice sits in, BIG-IP Next for Kubernetes (BNK), and to what a GPU cloud builds on it.

What you'll get from this post:

- The seven decisions BNK makes for one inference request, at one address.
- Why the architecture holds up: separate control and request paths, standard objects, one engine.
- The tiers of the platform and the F5 services that plug into each one.
- What a GPU cloud can sell on it, and where an agent sandbox fits.

## One Request, Seven Decisions, One Address

Start with what a customer of a GPU cloud actually calls: one OpenAI-compatible address in front of the GPUs they rent. Here's everything that happens to a chat request at that address on BNK.

<svg viewBox="0 0 800 500" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Seven decisions for one chat request: network firewall, API key, AI Guardrails, token budget, model choice, Endpoint Picker and metering. The first four can stop the request before it reaches a GPU." style="width:100%;height:auto;max-width:760px;display:block;margin:2rem auto;">
  <g font-family="ui-sans-serif,system-ui,sans-serif">
    <rect x="20" y="14" width="760" height="54" rx="8" fill="#0b0f1a" stroke="#334155"/>
    <circle cx="52" cy="41" r="15" fill="#0d1526" stroke="#7c3aed"/><text x="52" y="46" fill="#c4b5fd" font-size="14" font-weight="700" text-anchor="middle">0</text>
    <text x="84" y="36" fill="#e2e8f0" font-size="15" font-weight="700">F5 network firewall</text>
    <text x="84" y="56" fill="#94a3b8" font-size="13">Source and port checked before any HTTP is parsed</text>
    <rect x="664" y="28" width="100" height="26" rx="13" fill="#0d1526" stroke="#7c3aed"/><text x="714" y="46" fill="#c4b5fd" font-size="13" font-weight="600" text-anchor="middle">dropped</text>
    <rect x="20" y="78" width="760" height="54" rx="8" fill="#0b0f1a" stroke="#334155"/>
    <circle cx="52" cy="105" r="15" fill="#0d1526" stroke="#7c3aed"/><text x="52" y="110" fill="#c4b5fd" font-size="14" font-weight="700" text-anchor="middle">1</text>
    <text x="84" y="100" fill="#e2e8f0" font-size="15" font-weight="700">API key</text>
    <text x="84" y="120" fill="#94a3b8" font-size="13">Checked against the provider's own key service</text>
    <rect x="664" y="92" width="100" height="26" rx="13" fill="#0d1526" stroke="#7c3aed"/><text x="714" y="110" fill="#c4b5fd" font-size="13" font-weight="600" text-anchor="middle">401</text>
    <rect x="20" y="142" width="760" height="54" rx="8" fill="#0b0f1a" stroke="#334155"/>
    <circle cx="52" cy="169" r="15" fill="#0d1526" stroke="#7c3aed"/><text x="52" y="174" fill="#c4b5fd" font-size="14" font-weight="700" text-anchor="middle">2</text>
    <text x="84" y="164" fill="#e2e8f0" font-size="15" font-weight="700">F5 AI Guardrails</text>
    <text x="84" y="184" fill="#94a3b8" font-size="13">The prompt is scanned before it goes further</text>
    <rect x="664" y="156" width="100" height="26" rx="13" fill="#0d1526" stroke="#7c3aed"/><text x="714" y="174" fill="#c4b5fd" font-size="13" font-weight="600" text-anchor="middle">blocked</text>
    <rect x="20" y="206" width="760" height="54" rx="8" fill="#0b0f1a" stroke="#334155"/>
    <circle cx="52" cy="233" r="15" fill="#0d1526" stroke="#7c3aed"/><text x="52" y="238" fill="#c4b5fd" font-size="14" font-weight="700" text-anchor="middle">3</text>
    <text x="84" y="228" fill="#e2e8f0" font-size="15" font-weight="700">Token budget per user</text>
    <text x="84" y="248" fill="#94a3b8" font-size="13">Over budget: a cheaper model, or a 429</text>
    <rect x="664" y="220" width="100" height="26" rx="13" fill="#0d1526" stroke="#7c3aed"/><text x="714" y="238" fill="#c4b5fd" font-size="13" font-weight="600" text-anchor="middle">429</text>
    <line x1="20" y1="276" x2="780" y2="276" stroke="#475569" stroke-dasharray="5 5"/>
    <text x="400" y="296" fill="#64748b" font-size="12" font-style="italic" text-anchor="middle">Nothing stopped above this line ever reaches a GPU</text>
    <rect x="20" y="310" width="760" height="54" rx="8" fill="#0b0f1a" stroke="#334155"/>
    <circle cx="52" cy="337" r="15" fill="#0d1526" stroke="#00d4ff"/><text x="52" y="342" fill="#00d4ff" font-size="14" font-weight="700" text-anchor="middle">4</text>
    <text x="84" y="332" fill="#e2e8f0" font-size="15" font-weight="700">Model choice</text>
    <text x="84" y="352" fill="#94a3b8" font-size="13">Off-peak model on a schedule, or a frontier provider such as Amazon Bedrock</text>
    <rect x="664" y="324" width="100" height="26" rx="13" fill="#0d1526" stroke="#00d4ff"/><text x="714" y="342" fill="#00d4ff" font-size="13" font-weight="600" text-anchor="middle">routed</text>
    <rect x="20" y="374" width="760" height="54" rx="8" fill="#0b0f1a" stroke="#334155"/>
    <circle cx="52" cy="401" r="15" fill="#0d1526" stroke="#00d4ff"/><text x="52" y="406" fill="#00d4ff" font-size="14" font-weight="700" text-anchor="middle">5</text>
    <text x="84" y="396" fill="#e2e8f0" font-size="15" font-weight="700">F5 Endpoint Picker</text>
    <text x="84" y="416" fill="#94a3b8" font-size="13">The GPU that already holds the prompt in its KV cache</text>
    <rect x="664" y="388" width="100" height="26" rx="13" fill="#0d1526" stroke="#00d4ff"/><text x="714" y="406" fill="#00d4ff" font-size="13" font-weight="600" text-anchor="middle">placed</text>
    <rect x="20" y="438" width="760" height="54" rx="8" fill="#0b0f1a" stroke="#334155"/>
    <circle cx="52" cy="465" r="15" fill="#0d1526" stroke="#00d4ff"/><text x="52" y="470" fill="#00d4ff" font-size="14" font-weight="700" text-anchor="middle">6</text>
    <text x="84" y="460" fill="#e2e8f0" font-size="15" font-weight="700">Metering</text>
    <text x="84" y="480" fill="#94a3b8" font-size="13">Tokens counted from the model's own answer, per user</text>
    <rect x="664" y="452" width="100" height="26" rx="13" fill="#0d1526" stroke="#00d4ff"/><text x="714" y="470" fill="#00d4ff" font-size="13" font-weight="600" text-anchor="middle">billed</text>
  </g>
</svg>

All seven run in TMM, the traffic engine BNK takes from BIG-IP. The firewall goes first, at the network layer. Steps 1 to 6 are one policy iRule per endpoint, built from whichever policies the provider switched on. The iRule makes plain sideband calls to the key service, to F5 AI Guardrails and to the usage store, and asks the Endpoint Picker for a GPU over gRPC ext_proc.

The order matters. A request with a bad source, a bad key, a harmful prompt or an empty budget is refused before a GPU sees it, so refusals cost the provider no GPU time. And because metering reads the token count from the model's own answer, the bill matches what the customer's SDK reported.

## An Architecture Built from Standard Parts

### A control path and a request path that never mix

```text
control:  provider API -> adapter -> Kubernetes objects -> BNK controller -> TMM
request:  client -> TMM address -> the picker's GPU choice -> GPU
```

Creating, changing and deleting an endpoint goes down the first line. Every prompt and every streamed token goes down the second. The provider's console and API are never in the request path; TMM only calls the key service and sends usage records.

### Every endpoint is a set of ordinary objects

| Object | What it does for the endpoint |
|---|---|
| Gateway | The endpoint's address and listeners |
| HTTPRoute | Sends `/v1` to the model pool |
| InferencePool + F5EPP | The pool of model servers and the cache-aware picker in front of it |
| iRule + policy | The per-request logic for steps 1 to 6 |
| F5BigFwPolicy | The endpoint's own network firewall |

Each object is labelled with the endpoint it belongs to, so a platform team reads the whole thing with `kubectl` and the tools it already has. Delete the endpoint and exactly its objects go.

### The provider keeps its own API

Customers keep using the provider's console and API. A small adapter turns those API calls into BNK objects, and it needs nothing beyond the Kubernetes API and the BNK, Gateway API and Inference Extension CRDs. It ships as one Helm chart.

### One engine, on the node or on the DPU

The same TMM carries ingress, policy, routing and metering, and it runs on Kubernetes nodes or on BlueField DPUs. A provider starts in host mode and moves the work onto DPUs when it wants enforcement the tenant's host can't reach.

## The Platform, Tier by Tier

That endpoint is one slice of a bigger platform. BNK covers the whole path, from choosing the site down to choosing the GPU.

<svg viewBox="0 0 800 500" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Four stacked tiers: site selection, provider border on BlueField DPUs, tenant gateway and inference. A side rail lists the network, security, AI and programmability services BNK carries." style="width:100%;height:auto;max-width:760px;display:block;margin:2rem auto;">
  <g font-family="ui-sans-serif,system-ui,sans-serif">
    <rect x="20" y="14" width="480" height="104" rx="8" fill="#0b0f1a" stroke="#334155"/>
    <text x="40" y="38" fill="#00d4ff" font-size="12" font-weight="700" letter-spacing="1">TIER 1 · WHERE</text>
    <text x="40" y="62" fill="#e2e8f0" font-size="15" font-weight="700">Site and factory selection</text>
    <text x="40" y="84" fill="#94a3b8" font-size="13">BNK's own GSLB and DNS: wide IPs, topology records,</text>
    <text x="40" y="102" fill="#94a3b8" font-size="13">data centers and monitors</text>
    <rect x="20" y="132" width="480" height="104" rx="8" fill="#0b0f1a" stroke="#7c3aed"/>
    <text x="40" y="156" fill="#c4b5fd" font-size="12" font-weight="700" letter-spacing="1">TIER 2 · PROVIDER BORDER</text>
    <text x="40" y="180" fill="#e2e8f0" font-size="15" font-weight="700">BNK on BlueField DPUs</text>
    <text x="40" y="202" fill="#94a3b8" font-size="13">Zero-trust mode with NVIDIA DPF and NICo; per-tenant</text>
    <text x="40" y="220" fill="#94a3b8" font-size="13">fabric VRFs, L4 to L7 and security at the border</text>
    <rect x="20" y="250" width="480" height="104" rx="8" fill="#0b0f1a" stroke="#334155"/>
    <text x="40" y="274" fill="#00d4ff" font-size="12" font-weight="700" letter-spacing="1">TIER 3 · TENANT GATEWAY</text>
    <text x="40" y="298" fill="#e2e8f0" font-size="15" font-weight="700">Tenancy, AI Gateway, agent traffic</text>
    <text x="40" y="320" fill="#94a3b8" font-size="13">VRF per tenant on EVPN, per-tenant egress and SNAT,</text>
    <text x="40" y="338" fill="#94a3b8" font-size="13">keys, budgets, model routing; MCP and A2A over HTTP routes</text>
    <rect x="20" y="368" width="480" height="104" rx="8" fill="#0b0f1a" stroke="#334155"/>
    <text x="40" y="392" fill="#00d4ff" font-size="12" font-weight="700" letter-spacing="1">TIER 4 · INFERENCE</text>
    <text x="40" y="416" fill="#e2e8f0" font-size="15" font-weight="700">F5 Endpoint Picker</text>
    <text x="40" y="438" fill="#94a3b8" font-size="13">KV-cache aware GPU choice with NVIDIA Dynamo,</text>
    <text x="40" y="456" fill="#94a3b8" font-size="13">prefill and decode</text>
    <rect x="516" y="14" width="264" height="458" rx="8" fill="#0d1526" stroke="#334155"/>
    <g font-size="12">
      <text x="532" y="38" fill="#00d4ff" font-weight="700" letter-spacing="1">NETWORK</text>
      <text x="532" y="58" fill="#94a3b8">L4 to L7 on HTTP, gRPC, TLS, TCP, UDP</text>
      <text x="532" y="75" fill="#94a3b8">GSLB and DNS</text>
      <text x="532" y="92" fill="#94a3b8">VRFs and dynamic routing</text>
      <text x="532" y="109" fill="#94a3b8">Per-tenant egress and SNAT</text>
      <text x="532" y="126" fill="#94a3b8">NAT and carrier-grade NAT</text>
      <text x="532" y="143" fill="#94a3b8">IPsec and GRE tunnels</text>
      <text x="532" y="172" fill="#c4b5fd" font-weight="700" letter-spacing="1">SECURITY</text>
      <text x="532" y="192" fill="#94a3b8">Network firewall</text>
      <text x="532" y="209" fill="#94a3b8">DDoS protection, including behavioral</text>
      <text x="532" y="226" fill="#94a3b8">Intrusion prevention</text>
      <text x="532" y="243" fill="#94a3b8">Web application security</text>
      <text x="532" y="260" fill="#94a3b8">IP intelligence</text>
      <text x="532" y="277" fill="#94a3b8">Access policy</text>
      <text x="532" y="306" fill="#00d4ff" font-weight="700" letter-spacing="1">AI</text>
      <text x="532" y="326" fill="#94a3b8">AI Gateway: keys, budgets, model routing</text>
      <text x="532" y="343" fill="#94a3b8">F5 Endpoint Picker</text>
      <text x="532" y="360" fill="#94a3b8">Analyzer</text>
      <text x="532" y="377" fill="#94a3b8">Guardrail callouts via iRule sideband</text>
      <text x="532" y="406" fill="#c4b5fd" font-weight="700" letter-spacing="1">PROGRAMMABILITY</text>
      <text x="532" y="426" fill="#94a3b8">iRules and data groups</text>
      <text x="532" y="443" fill="#94a3b8">ext_proc callouts</text>
      <text x="532" y="460" fill="#94a3b8">HSL log streaming, OpenTelemetry</text>
    </g>
    <text x="400" y="494" fill="#64748b" font-size="12" font-style="italic" text-anchor="middle">Every tier is declared as BNK resources in Kubernetes, and traffic runs through one engine, TMM</text>
  </g>
</svg>

Tier 1 decides which site or factory gets the request, and BNK does that itself with GSLB and DNS. A GSLB wide IP answers for the service name, data centers and servers describe the sites, monitors track their health, and topology records steer clients by where they are. DNS zones, views and a DNS cache run alongside. Put BNK in each factory and you have the shape of AI Grid: distributed sites run as one inference service.

Tier 2 is for providers who rent bare metal to strangers. In NVIDIA's zero-trust model BNK runs on BlueField DPUs as provider fabric ingress (`f5-ingress`), managed out of band through NVIDIA DPF and NICo, NVIDIA's open-source infrastructure controller. It's never managed through the tenant's host, and tenants are kept apart by per-tenant fabric VRFs, so isolation lives on hardware the tenant doesn't control. In this mode BNK's job is the fabric edge: ingress, L4 to L7 services and security. The security services are declared like everything else, with kinds such as `F5BigFwPolicy` for firewall rules and `F5BigDdosProfile` for DDoS vectors and behavioral detection.

Tiers 3 and 4 are where agent traffic lives. In tier 3, BNK is the VTEP on a BGP EVPN-VXLAN fabric, so each tenant is a VRF with its own VNI, and VRFs can be set to strict isolation. Each tenant gets its own egress and SNAT pool, and the AI Gateway runs on the same tenant gateway. In tier 4, TMM asks the F5 Endpoint Picker over gRPC ext_proc which GPU worker should take the request.

### Every F5 function plugs in

The services in that list are the same F5 engine BIG-IP customers already run, declared as Kubernetes resources: GSLB and DNS, network firewall, DDoS protection, intrusion prevention, web application security, IPsec, carrier-grade NAT, access policy and IP intelligence. For a telco putting AI factories at the network edge, the service provider toolkit is there too: deep packet inspection, policy enforcement and zero-rating, with Diameter, GTP, SIP, NGAP and RADIUS support. When a provider needs logic none of these cover, it writes an iRule, and the platform grows with it.

## What a GPU Cloud Sells on It

Renting GPUs is the base business. On BNK the provider can also charge for what sits in front of them: inference endpoints, tokens and policies. A firewall per endpoint, with matches streamed to the customer's SIEM. Guardrails on every prompt. Per-user token budgets. Frontier models behind the same address the customer already calls.

Cache-aware routing adds to that. When the Endpoint Picker sends a prompt to the GPU that already holds its prefix, that GPU skips the prefill it would otherwise redo, so the same GPUs answer more requests.

Tenancy lines up across layers: a VRF, a BNK gateway with its own address and SNAT range, AI Gateway keys and budgets, and a GPU queue in the scheduler. NVIDIA's cloud partner reference architecture leaves the tenant access network to partners, and this is how BNK fills that slot. Token and request logs stream over HSL to the provider's billing pipeline, and an OpenTelemetry collector handles telemetry.

Per-tenant logic is an iRule away. This one takes request priority away from the caller before the Endpoint Picker sees it; a controller fills the lookup tables.

```tcl
when HTTP_REQUEST {
  # the caller never sets its own priority
  HTTP::header remove "x-gateway-inference-objective"
  set caller ""
  if { [HTTP::header exists "x-caller-key"] } {
    set h [b64encode [sha256 [HTTP::header value "x-caller-key"]]]
    HTTP::header remove "x-caller-key"
    if { [info exists static::callers($h)] } { set caller $static::callers($h) }
  }
  # unknown or suspect callers are shed first when the GPU pool is saturated
  if { $caller eq "" || [info exists static::suspect($caller)] } {
    HTTP::header insert "x-gateway-inference-objective" "suspect-traffic"
  }
}
```

## The Essentials in Kubernetes

You need BNK installed and licensed, the Gateway API and Inference Extension CRDs, and a model server pool. Names are placeholders.

### Turn the AI features on

The AI Gateway and intelligent load balancing are switched on in the CNEInstance, BNK's top-level resource. This is a fragment of a larger resource.

```yaml
apiVersion: k8s.f5.com/v1
kind: CNEInstance
metadata:
  name: f5-bnk-f5-cne-controller
  namespace: f5-bnk
spec:
  aiGateway:
    enabled: true      # AI Gateway console and admin API
  intelligentLB:
    enabled: true      # deploys the Analyzer
  eppNamespaces: [models]   # namespaces where F5EPP resources live
```

### Put the model pool behind the Endpoint Picker

A standard `InferencePool`, selected by labels, points at F5's Endpoint Picker (`F5EPP`). With `failureMode: FailClose` the request fails if the picker is down, so nothing silently falls back to round robin.

```yaml
apiVersion: inference.k8s.f5.com/v1alpha1
kind: F5EPP
metadata: {name: model-pool-epp, namespace: models}
spec:
  poolRef: {name: model-pool}
  engine: dynamo               # reads Dynamo KV-cache events from NATS
  natsURL: nats://dynamo-nats.dynamo-system.svc:4222   # your Dynamo NATS service
---
apiVersion: inference.networking.k8s.io/v1
kind: InferencePool
metadata: {name: model-pool, namespace: models}
spec:
  selector:
    matchLabels:
      app: llm-decode
      trust.example.com/state: trusted   # used by the runtime pattern below
  targetPorts: [{number: 8000}]
  endpointPickerRef: {name: model-pool-epp, port: {number: 9002}, failureMode: FailClose}
---
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata: {name: model-route, namespace: models}
spec:
  parentRefs: [{name: inference-gateway, namespace: f5-bnk}]
  rules:
  - matches: [{path: {type: PathPrefix, value: /v1}}]
    backendRefs:
    - {group: inference.networking.k8s.io, kind: InferencePool, name: model-pool, port: 8000}
```

That `trusted` label is also a security hook. A controller fed by Tetragon's eBPF events and the sandbox's audit trail can relabel a GPU worker that misbehaves, and the Endpoint Picker stops choosing it within seconds while the pod stays up for forensics. The same controller can have BNK answer a compromised caller with a 403 and add its address to the firewall.

### Call it

The client sees an OpenAI-compatible endpoint; the Anthropic Messages API works too.

```bash
curl https://ai-gw.example.com/v1/chat/completions \
  -H "Authorization: Bearer $VIRTUAL_KEY" -H 'Content-Type: application/json' \
  -d '{"model":"auto","messages":[{"role":"user","content":"Write a two-line poem about BGP"}]}'
```

## Where the Sandbox Plugs In

Isolating the agent's process is the sandbox's job. The design I'd recommend pairs a sandbox, Agent Substrate or NVIDIA OpenShell, with BNK as the tenant gateway behind it.

OpenShell is worth describing precisely. Each sandbox gets its own supervisor, which in Kubernetes runs as its own pod (`os-supervisor-<sandbox>`), paired with the sandbox workload by the `openshell.ai/boundary-pair` label. The supervisor enforces that sandbox's policy (OPA/Rego) on configured HTTP, GraphQL and MCP traffic, writes an OCSF audit trail per sandbox, and its provider profile can inject a credential for a named destination. NVIDIA's condition for "no network path except through the supervisor" is that the cluster CNI enforces NetworkPolicy ingress and egress in the sandbox namespace. So OpenShell works per sandbox, at process level. It isn't a shared egress point for many pods or for a tenant.

Point the sandbox's allowed destination at the tenant's AI Gateway, by FQDN for Substrate, since its egress policy can't name an IP. An OpenShell provider profile can inject the virtual key for that destination. With Substrate, atenet-egress injects the actor JWT, and since the AI Gateway validates JWTs from your issuer, that JWT is checked at BNK. From there the tenant's VRF, SNAT range and gateway are BNK's.

## The Slice Levan Covers

Levan's post walks one path through tier 3: a sandboxed agent calling a hosted model. In Agent Substrate, agents run as Actors in sandboxes, and all their outbound traffic goes through atenet-egress. For model concerns he adds a dedicated agentgateway LLM gateway:

```text
actor -> atunnel -> atenet-egress (policy, injects actor JWT)
      -> agentgateway LLM gateway -> OpenAI / Anthropic
```

agentgateway does model routing and failover, budgets, rate limits and prompt guarding, and it implements the endpoint picker protocol too. Splitting egress and model concerns across components is the layout his article chose. On BNK the same slice runs through one engine, inside the tiers above.

## What Comes Next

Here's where I'd take the platform. Agent identity and per-task authorization belong in policy, with a declarative layer next to iRules, CEL evaluated over an ext_authz callout.

Egress should follow the task: open only to what the task may reach, and closed when it's done. Every decision should land in a signed record per tenant. And a quarantine should come with a provable stop, so you can show a workload sent nothing after it was stopped.

Across sites, AI Grid takes the same model up a level: GSLB picks the factory on GPU-aware signals, and BNK in each one picks the model and the GPU.

## Try It

Start with the BNK documentation for the CNEInstance and enable `intelligentLB` and the AI Gateway. Build an `InferencePool` that points at the F5 Endpoint Picker, attach a policy iRule and an `F5BigFwPolicy` to its Gateway, and put a sandbox in front, Substrate or OpenShell, with egress allowed only to that address (by FQDN for Substrate).

Agent egress to a model is one slice of an AI factory. Build the platform first, and the slice comes with it.
