---
title: "The Network Is Part of the Computer Now"
description: "Distributed AI training and inference live or die on the fabric between GPUs. A practical tour of RDMA, RoCEv2, GPUDirect, and NCCL, and why the network stopped being a connectivity layer."
date: "2026-08-30"
author: "Igor Racic"
tags: ["rdma", "networking", "gpudirect", "nccl", "ai-infrastructure"]
image: "/blog/rdma-ai-factory-og.png"
---

# The Network Is Part of the Computer Now

The public story of AI infrastructure is told through accelerators. Each generation promises more compute, more memory bandwidth, bigger clusters. That story is accurate. It is also incomplete. The moment a workload spans more than one server, the network starts deciding how much of that accelerator capacity turns into actual work.

Distributed training and large-scale inference are communication systems as much as they are compute systems. GPUs exchange gradients, activations, parameters, optimizer state, and routing decisions, usually in synchronized phases. A slow participant delays the whole group. A small amount of communication inefficiency multiplies across a cluster that costs more per hour than most companies spend on infrastructure per year.

> The network is no longer only a connectivity layer. In distributed AI it becomes part of the computer that executes the model.

Remote Direct Memory Access is the technology that made this shift possible. RDMA is not new, HPC and storage systems have leaned on it for two decades. What changed is how many infrastructure teams now have to understand it, because accelerator utilization depends directly on the quality of the data path between nodes.

## What RDMA Actually Changes

A conventional socket connection is built for generality. An application hands data to the OS, the kernel manages socket buffers and transport state, and the receiving system does the equivalent work before its application can touch the data. Modern kernels do this well. The CPU still has to participate in every flow.

RDMA changes the steady-state path. An application registers memory and talks to the network through an RDMA interface, usually called verbs. The RDMA-capable NIC understands those registered memory regions and does the transport work in hardware. People describe this with three phrases: kernel bypass, zero-copy, CPU offload. Each one needs a caveat.

Kernel bypass does not mean the kernel disappears. Drivers still allocate resources, enforce permissions, and pin memory. Zero-copy does not mean zero bytes move, it means data moves between source and destination memory without repeated staging through software buffers along the way. CPU offload means the NIC does the packetization, reliability, and memory placement that would otherwise burn host cycles.

<svg viewBox="0 0 800 440" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Conventional socket path compared with the RDMA steady state path" style="width:100%;height:auto;max-width:760px;display:block;margin:2rem auto;">
  <defs>
    <marker id="rArrGray" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="#475569"/></marker>
    <marker id="rArrCyan" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="#00d4ff"/></marker>
  </defs>
  <text x="170" y="36" fill="#64748b" font-size="15" font-weight="700" text-anchor="middle" font-family="ui-sans-serif,system-ui,sans-serif" letter-spacing="1">SOCKET PATH</text>
  <text x="470" y="36" fill="#00d4ff" font-size="15" font-weight="700" text-anchor="middle" font-family="ui-sans-serif,system-ui,sans-serif" letter-spacing="1">RDMA PATH</text>
  <g font-family="ui-sans-serif,system-ui,sans-serif" font-size="14" text-anchor="middle">
    <rect x="70" y="58" width="200" height="42" rx="8" fill="#0b0f1a" stroke="#334155"/><text x="170" y="84" fill="#94a3b8">App writes to socket</text>
    <line x1="170" y1="100" x2="170" y2="126" stroke="#475569" stroke-width="1.5" marker-end="url(#rArrGray)"/>
    <rect x="70" y="130" width="200" height="42" rx="8" fill="#0b0f1a" stroke="#334155"/><text x="170" y="156" fill="#94a3b8">Kernel buffer copy</text>
    <line x1="170" y1="172" x2="170" y2="198" stroke="#475569" stroke-width="1.5" marker-end="url(#rArrGray)"/>
    <rect x="70" y="202" width="200" height="42" rx="8" fill="#0b0f1a" stroke="#334155"/><text x="170" y="228" fill="#94a3b8">Transport processing</text>
    <line x1="170" y1="244" x2="170" y2="270" stroke="#475569" stroke-width="1.5" marker-end="url(#rArrGray)"/>
    <rect x="70" y="274" width="200" height="42" rx="8" fill="#0b0f1a" stroke="#334155"/><text x="170" y="300" fill="#94a3b8">NIC interrupt, copy up</text>
    <line x1="170" y1="316" x2="170" y2="342" stroke="#475569" stroke-width="1.5" marker-end="url(#rArrGray)"/>
    <rect x="70" y="346" width="200" height="42" rx="8" fill="#0b0f1a" stroke="#334155"/><text x="170" y="372" fill="#94a3b8">App reads buffer</text>
    <rect x="370" y="58" width="200" height="42" rx="8" fill="#0b0f1a" stroke="#00d4ff" stroke-opacity="0.55"/><text x="470" y="84" fill="#e2e8f0">Memory registered</text>
    <line x1="470" y1="100" x2="470" y2="150" stroke="#00d4ff" stroke-width="1.5" stroke-opacity="0.7" marker-end="url(#rArrCyan)"/>
    <rect x="370" y="154" width="200" height="42" rx="8" fill="#0b0f1a" stroke="#00d4ff" stroke-opacity="0.55"/><text x="470" y="180" fill="#e2e8f0">Work request posted</text>
    <line x1="470" y1="196" x2="470" y2="246" stroke="#00d4ff" stroke-width="1.5" stroke-opacity="0.7" marker-end="url(#rArrCyan)"/>
    <rect x="370" y="250" width="200" height="42" rx="8" fill="#0b0f1a" stroke="#00d4ff" stroke-opacity="0.55"/><text x="470" y="276" fill="#e2e8f0">RNIC moves data direct</text>
    <line x1="470" y1="292" x2="470" y2="342" stroke="#00d4ff" stroke-width="1.5" stroke-opacity="0.7" marker-end="url(#rArrCyan)"/>
    <rect x="370" y="346" width="200" height="42" rx="8" fill="#0b0f1a" stroke="#00d4ff" stroke-opacity="0.55"/><text x="470" y="372" fill="#e2e8f0">Completion queue signals</text>
    <rect x="614" y="216" width="166" height="110" rx="10" fill="#0b0f1a" stroke="#7c3aed" stroke-opacity="0.7"/>
    <text x="697" y="248" fill="#c4b5fd" font-size="13" text-anchor="middle">CPU cycles</text>
    <text x="697" y="274" fill="#c4b5fd" font-size="13" text-anchor="middle">saved on every</text>
    <text x="697" y="300" fill="#c4b5fd" font-size="13" text-anchor="middle">steady-state transfer</text>
  </g>
</svg>

The application posts work to queues, the device consumes them, and completion queues report when transfers finish. App and device coordinate through shared data structures instead of the CPU treating every packet arrival as its own software event.

## RNIC, ConnectX, and BlueField Are Not the Same Thing

This terminology gets muddled fast, so it is worth being precise. RNIC is the generic category: any RDMA-capable network interface controller, from any vendor. It is not an NVIDIA product name.

ConnectX is NVIDIA's family of high-performance adapters. Depending on the model, a ConnectX card can be called an RNIC or a SmartNIC, and it implements RoCE, InfiniBand, transport offload, and the GPUDirect RDMA data path.

BlueField is a different scope entirely. A BlueField DPU includes ConnectX-class RDMA and networking, then adds programmable Arm compute, local memory, and hardware accelerators for infrastructure services like security, isolation, storage, and telemetry. BlueField can be the RDMA endpoint and run an independent infrastructure environment beside the host CPU at the same time.

This distinction matters operationally. GPUDirect RDMA moves accelerator data through the networking engines while the DPU runs security policy, virtual switching, or storage services without loading any of that onto the host CPU. You get acceleration and a real separation of responsibilities in the same box.

## How an Operation Actually Reaches Remote Memory

Before any RDMA transfer happens, the application creates protection and communication objects. The API differs by stack, but the model is consistent everywhere: memory gets registered so the RNIC can translate and access it safely, queue pairs carry work requests, completion queues report finished work, and keys tied to registered memory limit which remote operations are allowed.

Ordinary virtual memory moves around, pages out, changes mappings. A device doing direct memory access needs stable ones. Registration pins the relevant pages and builds the translation metadata the device uses, which is why communication libraries cache registrations for buffers they reuse constantly instead of re-registering every time.

The application posts a request to a send or receive queue, the RNIC consumes it, transfers the data, and later writes a completion entry:

```c
ibv_post_send(qp, &wr, &bad_wr);   /* work request queued to the RNIC   */
/* RNIC performs the RDMA WRITE against remote_addr using rkey          */
ibv_poll_cq(cq, 1, &wc);           /* completion polled, no CPU copy    */
```

Queue-oriented design lets software submit many operations while the device progresses them asynchronously, and it cuts down the number of user-space to kernel-space transitions during active communication.

RDMA also supports one-sided operations: reads and writes where one endpoint accesses a permitted remote memory region directly. The remote CPU does not need to run a matching receive for every transfer. That power comes with a cost, one-sided operations demand careful memory registration and access control up front, because there is no receive-side code path to catch a mistake.

## RoCEv2 Brings RDMA to Routed Ethernet

RDMA describes a communication and memory-access model. It still needs a transport and a network underneath it. InfiniBand provides a purpose-built fabric. iWARP carries RDMA semantics over TCP. RoCE brings RDMA to Ethernet, and RoCEv2 is the version that matters for modern routed data centers.

| Technology | Network foundation | Where it fits | Character |
|---|---|---|---|
| InfiniBand | Purpose-built fabric | Large HPC and AI clusters | Integrated RDMA fabric with dedicated management |
| RoCEv2 | Ethernet, UDP, IP | Routed AI fabrics, general data centers | RDMA on Ethernet, engineered congestion behavior |
| iWARP | TCP, IP | Select enterprise deployments | RDMA semantics over reliable TCP |

RoCEv2 carries the InfiniBand transport protocol over UDP and IP. The IP layer makes the traffic routable, so operators can build leaf-spine fabrics, use Layer 3 boundaries, and spread traffic across equal-cost paths with switching and routing principles everyone already knows.

<svg viewBox="0 0 800 300" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="RoCEv2 protocol layers with end to end congestion signaling" style="width:100%;height:auto;max-width:760px;display:block;margin:2rem auto;">
  <defs>
    <marker id="cArrCyan" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="#00d4ff"/></marker>
    <marker id="cArrPurple" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="#7c3aed"/></marker>
  </defs>
  <g font-family="ui-sans-serif,system-ui,sans-serif" font-size="13" text-anchor="middle">
    <rect x="60" y="40" width="680" height="40" rx="6" fill="#0d1526" stroke="#1e3a4a"/><text x="400" y="65" fill="#00d4ff">InfiniBand transport (RDMA verbs, queue pairs)</text>
    <rect x="60" y="92" width="680" height="40" rx="6" fill="#0d1526" stroke="#1e3a4a"/><text x="400" y="117" fill="#e2e8f0">UDP</text>
    <rect x="60" y="144" width="680" height="40" rx="6" fill="#0d1526" stroke="#1e3a4a"/><text x="400" y="169" fill="#e2e8f0">IP (routable, ECMP, leaf-spine)</text>
    <rect x="60" y="196" width="680" height="40" rx="6" fill="#0d1526" stroke="#1e3a4a"/><text x="400" y="221" fill="#e2e8f0">Ethernet</text>
  </g>
  <path d="M 720 236 C 780 236 780 40 720 40" fill="none" stroke="#7c3aed" stroke-width="1.5" stroke-opacity="0.8" marker-end="url(#cArrPurple)"/>
  <text x="787" y="140" fill="#c4b5fd" font-size="12" text-anchor="middle" transform="rotate(90 787 140)">ECN mark to CE, sender rate cut</text>
</svg>

The word Ethernet can create a false sense of simplicity. A RoCEv2 fabric is not done just because every link comes up and every host can ping. It has to preserve low, predictable latency during synchronized bursts, classify traffic consistently, keep paths balanced, and signal congestion early enough for endpoints to actually react to it.

## Congestion Control Is Part of Compute Performance

AI collectives produce brutal traffic patterns. Thousands of endpoints can start transmitting at nearly the same instant, and many flows converge on the same egress port at once. That creates incast, microbursts, and queue pressure that either drops packets and spikes tail latency, or, if the network overreacts, leaves links sitting idle while throughput falls.

Explicit Congestion Notification lets a switch mark an IP packet when a queue crosses a configured threshold, without dropping it. The receiver sees the mark and sends a congestion notification back to the sender, which cuts its transmission rate. In RoCEv2 environments, DCQCN is the endpoint control loop most teams use to interpret those notifications and adjust sending rate accordingly.

Priority Flow Control is different, a hop-by-hop pause for one Ethernet priority. A switch tells its neighbor to stop sending traffic for that priority while other priorities keep flowing. Useful for preventing loss on a protected class, and genuinely dangerous if scoped poorly, PFC can push congestion backward through the network, create head-of-line blocking, and contribute to pause storms.

Neither mechanism works in isolation. Thresholds depend on link speed, cable delay, buffer architecture, and traffic class. QoS policy has to classify RoCE and congestion-notification traffic consistently, and ECMP hashing needs enough entropy to actually spread large flows across paths instead of pinning them all to one link.

> A high link rate is only potential capacity. Congestion control decides how much of it stays useful once thousands of accelerators start talking at once.

## GPUDirect RDMA Shortens the Accelerator Path

Standard RDMA removes most of the host networking stack from the data path, but accelerator workloads add another boundary. The data usually starts life in GPU memory. Without a direct peer path, the system stages it through host memory before the RNIC transmits it, and the destination does the same thing in reverse.

GPUDirect RDMA lets a compatible peer device reach GPU memory over PCIe. A ConnectX adapter or BlueField DPU can move data straight from GPU memory into the network and into the peer GPU's memory, with no host-memory bounce buffer in between. The host still sets up and controls the transfer, it just does not have to carry every payload through its own memory hierarchy.

<svg viewBox="0 0 800 300" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Host memory bounce buffer path compared with the direct GPUDirect RDMA path" style="width:100%;height:auto;max-width:760px;display:block;margin:2rem auto;">
  <defs>
    <marker id="gArrGray" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="#475569"/></marker>
    <marker id="gArrCyan" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="#00d4ff"/></marker>
  </defs>
  <g font-family="ui-sans-serif,system-ui,sans-serif" font-size="13" text-anchor="middle">
    <text x="400" y="26" fill="#64748b" font-size="13" font-weight="700" letter-spacing="1">WITHOUT GPUDIRECT</text>
    <rect x="40" y="42" width="140" height="40" rx="8" fill="#0b0f1a" stroke="#334155"/><text x="110" y="67" fill="#94a3b8">GPU memory</text>
    <line x1="180" y1="62" x2="236" y2="62" stroke="#475569" stroke-width="1.5" marker-end="url(#gArrGray)"/>
    <rect x="240" y="42" width="140" height="40" rx="8" fill="#0b0f1a" stroke="#334155"/><text x="310" y="67" fill="#94a3b8">Host memory</text>
    <line x1="380" y1="62" x2="436" y2="62" stroke="#475569" stroke-width="1.5" marker-end="url(#gArrGray)"/>
    <rect x="440" y="42" width="140" height="40" rx="8" fill="#0b0f1a" stroke="#334155"/><text x="510" y="67" fill="#94a3b8">RNIC</text>
    <line x1="580" y1="62" x2="636" y2="62" stroke="#475569" stroke-width="1.5" marker-end="url(#gArrGray)"/>
    <rect x="640" y="42" width="140" height="40" rx="8" fill="#0b0f1a" stroke="#334155"/><text x="710" y="67" fill="#94a3b8">Network</text>
    <text x="400" y="140" fill="#00d4ff" font-size="13" font-weight="700" letter-spacing="1">WITH GPUDIRECT RDMA</text>
    <rect x="40" y="156" width="140" height="40" rx="8" fill="#0b0f1a" stroke="#00d4ff" stroke-opacity="0.55"/><text x="110" y="181" fill="#e2e8f0">GPU memory</text>
    <line x1="180" y1="176" x2="356" y2="176" stroke="#00d4ff" stroke-width="1.5" stroke-opacity="0.8" marker-end="url(#gArrCyan)"/>
    <text x="270" y="166" fill="#64748b" font-size="11">direct over PCIe</text>
    <rect x="440" y="156" width="140" height="40" rx="8" fill="#0b0f1a" stroke="#00d4ff" stroke-opacity="0.55"/><text x="510" y="181" fill="#e2e8f0">RNIC</text>
    <line x1="580" y1="176" x2="636" y2="176" stroke="#00d4ff" stroke-width="1.5" stroke-opacity="0.8" marker-end="url(#gArrCyan)"/>
    <rect x="640" y="156" width="140" height="40" rx="8" fill="#0b0f1a" stroke="#00d4ff" stroke-opacity="0.55"/><text x="710" y="181" fill="#e2e8f0">Network</text>
    <rect x="180" y="220" width="440" height="54" rx="10" fill="#0b0f1a" stroke="#7c3aed" stroke-opacity="0.7"/>
    <text x="400" y="252" fill="#c4b5fd" font-size="13">Host memory bandwidth and CPU cycles never touched</text>
  </g>
</svg>

The savings show up in several places at once. Host memory bandwidth stays free, CPU work drops, extra copies disappear, and end-to-end latency falls. The bigger point is that the data path now matches where the valuable state actually lives. Tensors sit in GPU memory, so the network reaches GPU memory directly instead of going the long way around.

Direct does not mean topology-independent. The GPU and the peer device need a real PCIe relationship, and platform firmware, IOMMU behavior, peer-memory support, drivers, and container configuration all decide whether the fast path is actually available. A system can have every capable component installed and still silently fall back to the slow path if one layer is misconfigured.

## NCCL Turns Model Synchronization Into Network Traffic

Distributed AI frameworks do not usually ask the network to move arbitrary buffers, they rely on collective operations. AllReduce combines values from every rank and returns the result to all of them. AllGather collects distinct inputs at every rank. ReduceScatter combines data and distributes partitions of the result. Broadcast copies data from one root rank to everyone else.

NCCL is NVIDIA's collective communication library for multi-GPU systems. It discovers topology, builds communication graphs, picks algorithms and protocols, and uses whatever transport is available: shared memory, NVLink, PCIe peer access, InfiniBand, RoCE. Where the topology allows it, NCCL uses GPUDirect RDMA for inter-node communication automatically.

This layer matters because collective performance is not the sum of independent point-to-point links. An AllReduce can run as a ring, a tree, or another topology-aware pattern, and the right choice depends on message size, rank count, link hierarchy, and locality. NCCL turns the logical collective into a concrete schedule of transfers that actually exercises the fabric.

A network problem can therefore show up looking exactly like a model-training problem. A hot rail, an unavailable GPUDirect path, or a NUMA mismatch lengthens collective phases. GPUs sit waiting at synchronization points, utilization drops, and job completion time climbs even though every kernel involved is fast.

## PCIe Topology and Locality

The network diagram usually starts at the server edge, but the real data path starts inside the box. A GPU might share a PCIe switch with the RNIC, reach it through the CPU root complex, or in a dual-socket system, have to cross a NUMA boundary to get there. These paths are not equivalent.

<svg viewBox="0 0 800 260" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Preferred PCIe path on a shared switch compared with a costly cross NUMA path" style="width:100%;height:auto;max-width:760px;display:block;margin:2rem auto;">
  <defs>
    <marker id="pArrCyan" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="#00d4ff"/></marker>
    <marker id="pArrGray" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="#475569"/></marker>
  </defs>
  <g font-family="ui-sans-serif,system-ui,sans-serif" font-size="13">
    <text x="200" y="26" fill="#00d4ff" font-size="13" font-weight="700" text-anchor="middle" letter-spacing="1">PREFERRED</text>
    <rect x="80" y="40" width="240" height="120" rx="10" fill="#0b0f1a" stroke="#00d4ff" stroke-opacity="0.5"/>
    <text x="200" y="60" fill="#64748b" font-size="11" text-anchor="middle">PCIe switch</text>
    <rect x="100" y="76" width="90" height="40" rx="6" fill="#0d1526" stroke="#1e3a4a"/><text x="145" y="101" fill="#e2e8f0" text-anchor="middle">GPU</text>
    <rect x="210" y="76" width="90" height="40" rx="6" fill="#0d1526" stroke="#1e3a4a"/><text x="255" y="101" fill="#e2e8f0" text-anchor="middle">RNIC</text>
    <line x1="190" y1="96" x2="206" y2="96" stroke="#00d4ff" stroke-width="2" stroke-opacity="0.85" marker-end="url(#pArrCyan)"/>
    <text x="200" y="145" fill="#64748b" font-size="11" text-anchor="middle">one hop, full peer bandwidth</text>
    <text x="600" y="26" fill="#64748b" font-size="13" font-weight="700" text-anchor="middle" letter-spacing="1">COSTLY</text>
    <rect x="420" y="40" width="120" height="120" rx="10" fill="#0b0f1a" stroke="#334155"/>
    <text x="480" y="60" fill="#64748b" font-size="11" text-anchor="middle">Socket 0</text>
    <rect x="440" y="76" width="80" height="40" rx="6" fill="#0d1526" stroke="#1e3a4a"/><text x="480" y="101" fill="#94a3b8" text-anchor="middle">GPU</text>
    <rect x="560" y="40" width="120" height="120" rx="10" fill="#0b0f1a" stroke="#334155"/>
    <text x="620" y="60" fill="#64748b" font-size="11" text-anchor="middle">Socket 1</text>
    <rect x="580" y="76" width="80" height="40" rx="6" fill="#0d1526" stroke="#1e3a4a"/><text x="620" y="101" fill="#94a3b8" text-anchor="middle">RNIC</text>
    <line x1="520" y1="96" x2="576" y2="96" stroke="#475569" stroke-width="2" marker-end="url(#pArrGray)"/>
    <text x="550" y="86" fill="#64748b" font-size="10" text-anchor="middle">CPU link</text>
    <text x="550" y="145" fill="#64748b" font-size="11" text-anchor="middle">cross-NUMA, reduced bandwidth</text>
  </g>
</svg>

Tools like `nvidia-smi topo -m` show GPU, NIC, NVLink, and NUMA relationships. PCIe inventory tools show the root-port tree. Communication benchmarks confirm whether the expected path is actually delivering the expected throughput. None of these views is sufficient alone, the physical topology tells you what should be possible, measurement tells you what the system is actually doing.

Locality also shapes process placement. A training process should use CPU cores, memory, GPUs, and RNIC ports that all belong to the same locality domain. Poor affinity creates hidden cross-socket traffic that seems harmless at small scale and becomes a synchronized delay across the whole job once you scale it up.

## The AI Factory as a Coordinated System

An AI Factory gets summarized as GPUs, storage, and switches. A more useful description is a pipeline that turns power and data into trained models, inferences, and tokens, where every layer affects how efficiently the expensive accelerator layer actually performs.

<svg viewBox="0 0 800 200" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Coordinated communication stack from framework through NCCL, GPUDirect RDMA, RNIC or DPU, to the fabric" style="width:100%;height:auto;max-width:760px;display:block;margin:2rem auto;">
  <defs>
    <marker id="sArrCyan" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="#00d4ff"/></marker>
  </defs>
  <g font-family="ui-sans-serif,system-ui,sans-serif" font-size="12" text-anchor="middle">
    <rect x="10" y="70" width="140" height="60" rx="8" fill="#0b0f1a" stroke="#00d4ff" stroke-opacity="0.5"/><text x="80" y="96" fill="#e2e8f0">Framework</text><text x="80" y="114" fill="#64748b" font-size="10">comm intent</text>
    <line x1="150" y1="100" x2="176" y2="100" stroke="#00d4ff" stroke-width="1.5" stroke-opacity="0.8" marker-end="url(#sArrCyan)"/>
    <rect x="180" y="70" width="140" height="60" rx="8" fill="#0b0f1a" stroke="#00d4ff" stroke-opacity="0.5"/><text x="250" y="96" fill="#e2e8f0">NCCL</text><text x="250" y="114" fill="#64748b" font-size="10">topology-aware</text>
    <line x1="320" y1="100" x2="346" y2="100" stroke="#00d4ff" stroke-width="1.5" stroke-opacity="0.8" marker-end="url(#sArrCyan)"/>
    <rect x="350" y="70" width="140" height="60" rx="8" fill="#0b0f1a" stroke="#00d4ff" stroke-opacity="0.5"/><text x="420" y="96" fill="#e2e8f0">GPUDirect RDMA</text><text x="420" y="114" fill="#64748b" font-size="10">GPU mem to wire</text>
    <line x1="490" y1="100" x2="516" y2="100" stroke="#00d4ff" stroke-width="1.5" stroke-opacity="0.8" marker-end="url(#sArrCyan)"/>
    <rect x="520" y="70" width="140" height="60" rx="8" fill="#0b0f1a" stroke="#00d4ff" stroke-opacity="0.5"/><text x="590" y="96" fill="#e2e8f0">ConnectX / BlueField</text><text x="590" y="114" fill="#64748b" font-size="10">RNIC or DPU</text>
    <line x1="660" y1="100" x2="686" y2="100" stroke="#00d4ff" stroke-width="1.5" stroke-opacity="0.8" marker-end="url(#sArrCyan)"/>
    <rect x="690" y="70" width="105" height="60" rx="8" fill="#0b0f1a" stroke="#00d4ff" stroke-opacity="0.5"/><text x="742" y="96" fill="#e2e8f0">RoCEv2 /</text><text x="742" y="112" fill="#e2e8f0">InfiniBand</text>
    <text x="400" y="164" fill="#64748b" font-size="11" text-anchor="middle">low GPU utilization can trace back to any single box in this chain</text>
  </g>
</svg>

The value of this layered view is that it connects symptoms to causes. Low GPU utilization can come from the model, the collective algorithm, GPU locality, the PCIe hierarchy, an RNIC setting, an ECN threshold, or an oversubscribed fabric. The layers are separable for design and operations, they are not separable in performance.

BlueField adds one more architectural option here. Infrastructure services can move off the host CPU entirely and into a programmable DPU trust domain, networking, security, storage, and isolation, accelerated and managed beside the application environment. The host gets to focus on application and accelerator orchestration while the DPU protects and operates the server edge.

## What This Means for How You Build

Start from the communication pattern, not a target port speed. Data parallelism creates frequent gradient synchronization. Tensor parallelism demands latency-sensitive communication within each layer. Pipeline parallelism introduces activation transfers and stage dependencies. Expert parallelism creates all-to-all traffic. The traffic pattern should drive the network design, not the other way around.

Preserve locality from process to port. Map GPUs, CPU sockets, PCIe switches, RNIC ports, and network rails, then align process placement to that map, and confirm NCCL actually sees the topology your hardware team intended. Locality is a requirement that has to survive provisioning, firmware updates, containerization, and scheduler decisions, not a one-time tuning pass.

Treat congestion as a control system you can observe. Document how switch queue thresholds, ECN marking, endpoint rate control, PFC scope, cable delay, and buffer headroom relate to each other, then monitor the signals that reveal the loop: ECN marks, congestion notifications, pause frames, queue occupancy, drops, retransmissions, per-flow throughput. A control loop nobody can observe is not a control loop you can trust at scale.

Measure the path in layers. Validate PCIe peer access, host-to-device bandwidth, RDMA bandwidth, GPUDirect RDMA bandwidth, collective performance, and application throughput separately. A single end-to-end benchmark proves a problem exists. Layered tests tell you where it lives, and make regressions easy to catch before they cost you a training run.

Decide deliberately what runs on the host and what runs on a DPU. That decision depends on trust boundaries, operational ownership, performance targets, and failure behavior. BlueField earns its place when programmable infrastructure processing and isolation solve a real architectural need, not as a default upgrade path for every RDMA adapter you buy.

For decades, data-center networks were optimized around applications running on CPUs. Distributed AI moves the center of gravity. The accelerator is the scarce resource now, and everything around it exists to feed it, connect it, protect it, and keep it productive. Network engineers need to understand accelerator locality and collectives. GPU engineers need to understand queues and congestion. Security and platform teams need to understand direct data paths and DPU trust boundaries. The AI Factory designs that actually work are the ones built where those disciplines meet.

| Term | Working definition |
|---|---|
| RDMA | Direct data movement between registered memory regions, transport work offloaded to the NIC |
| RNIC | Generic term for a NIC that implements RDMA transport and memory access |
| ConnectX | NVIDIA's RNIC and SmartNIC adapter family |
| BlueField | NVIDIA DPU combining ConnectX-class networking with programmable Arm compute |
| RoCEv2 | RDMA over Converged Ethernet v2, InfiniBand transport carried over UDP and IP |
| GPUDirect RDMA | Direct PCIe path between GPU memory and a peer device, no host staging |
| NCCL | NVIDIA's topology-aware collective communication library for multi-GPU systems |

---

*We spend a lot of time thinking about trust boundaries in agent infrastructure at [VeloSecurity AI](https://velosecurity-ai.io), and the AI Factory data path is the ground floor of that conversation. If your team is wrestling with GPU locality, congestion, or where infrastructure services should live relative to the host, get in touch.*
