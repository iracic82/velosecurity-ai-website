---
title: "Under the Endpoint Picker, Part 3: Pay Once, Then Get Out of the Way"
description: "CUDA makes 685 calls into the kernel and GPU firmware to set up a device, then runs a dozen copies with none at all. That split between setup and the hot path is the best argument I know for how a data path, including the gateway in front of the GPUs, should be built."
date: "2026-11-03T09:04:00"
author: "Igor Racic"
tags: ["ai-infrastructure", "gpu", "cuda", "f5-bnk", "data-plane"]
---

# Pay Once, Then Get Out of the Way

## Under the Endpoint Picker, Part 3

> Part 3 of a six-part series. [Part 2](/blog/under-the-endpoint-picker-2-what-sits-behind-the-pod-ip) showed how the CPU starts a GPU copy with a command, a ring entry and a doorbell. This part looks at who sets all of that up, and how little of it runs once the copy starts.

The doorbell from Part 2 doesn't mean anything on its own. Before the CPU can ring it, someone has to create a channel, build the ring, map the doorbell page into the process, allocate GPU memory, set up an address space the GPU understands, and bind a copy engine to the channel. That's a lot of privileged work.

Five layers of software share that job. What's striking is how many of them drop out once the copy starts. Counting exactly what each layer does turns out to be one of the cleanest arguments I know for how any data path should be built.

## Five Layers

| # | Layer | What it does | Runs in | On the hot path |
|---|---|---|---|---|
| 1 | `libcudart.so` | the CUDA Runtime, what your code calls | user space | yes |
| 2 | `libcuda.so` | the CUDA Driver API, closed source, about 110 MB | user space | yes |
| 3 | `nvidia.ko` | the Resource Manager kernel module, open source since 2022 | kernel | setup only |
| 4 | `nvidia-uvm.ko` | unified memory: address spaces and page faults | kernel | setup only |
| 5 | GSP-RM | Resource Manager firmware on the GPU's RISC-V core | the GPU | setup only |

The two user-space libraries are what applications see. The two kernel modules own the hardware and enforce isolation between processes. The firmware is the newest layer. NVIDIA moved most of the Resource Manager onto the GPU itself, to support secure boot, virtualization and confidential computing. The kernel module now forwards much of its work to the firmware as RPC messages, using a ring in host memory and a kick register. That's the queue-and-doorbell pattern from Part 2 again.

Processes talk to the kernel modules through three device files: `/dev/nvidiactl` for control, `/dev/nvidia0` (one per GPU), and `/dev/nvidia-uvm` for address spaces.

## What Setup Builds

Setup builds a tree of objects, each with a class ID. The tree for a process that wants to copy data looks roughly like this:

```text
root client
└── device
    ├── subdevice
    ├── user-mode aperture        (where the doorbell lives)
    ├── GPU memory allocation
    ├── host memory allocation
    ├── virtual address space
    └── channel group
        └── GPFIFO channel        (the ring from Part 2)
            └── copy engine object
```

Two verbs do all of it: allocate an object, or send a control command to one. That's a small API surface for a lot of state.

It also has sharp edges. Each mapping of a device file needs a fresh file descriptor, because a second `mmap` on the same one is refused. Channels have to be registered with the unified-memory module before they can run on an external address space. And the allocation call has two parameter layouts. If you use the older, smaller struct for channel creation, the call fails without telling you why. The 48-byte version is what libcuda actually sends.

None of this is fast, and none of it needs to be. It happens once per process.

## Counting What Happens

The interesting question is what happens after setup. To answer it you need to watch all five layers at once. A public tracing setup does that with three tools:

- a patched build of the open kernel module that logs every object allocation, control call and firmware RPC to ftrace
- an `LD_PRELOAD` shim plus `strace` around the application
- a merge of every stream onto one monotonic clock, so events from different layers line up

One trap is worth knowing. libcuda opens and maps the device files with raw `syscall` instructions, not through glibc. Library-level hooks never fire. To find the mappings you read `/proc/self/maps` instead.

With all of that in place, run a program that sets up, does twelve copies and tears down. On an H100 the counts are:

| | Setup | 12 copies | Teardown |
|---|---|---|---|
| Resource Manager ioctls | 361 | 0 | 3 |
| Unified-memory ioctls | 87 | 0 | 2 |
| Firmware RPCs | 237 | 0 | 183 |
| Doorbells | 193 | 12 | 0 |

Setup costs 685 calls into the kernel and the GPU firmware. The twelve copies cost zero. Each copy is a few stores into memory the process already has mapped, and one doorbell. The kernel never learns the copies happened.

Even the firmware calls during setup have nothing to do with moving data. Of the 192 control commands sent across 68 different sub-commands, none relates to transfers. They're all about getting the device into a state where transfers can happen without help.

## Sixty Bytes

Decode what the doorbell points at for one 256 MiB `cudaMemcpy` and you get seven copy-engine methods:

```text
OFFSET_IN_VA            source address
OFFSET_OUT_VA           destination address
LINE_LENGTH_IN          0x10000000   (256 MiB)
LAUNCH_DMA              0x182        copy
SET_SEMAPHORE_VA        completion address
SET_SEMAPHORE_PAYLOAD   completion value
LAUNCH_DMA              0x14         release the semaphore, with a timestamp
```

Sixty bytes of command move 256 MiB of data. There's no direction field. Swap the source and destination and the same stream copies the other way.

Pinned host memory follows the same pattern. Registering a 4 MiB buffer with `cudaHostRegister` produces three map operations in the unified-memory module at registration time: a 4 KiB head, the 4,190,208-byte middle, and a 4 KiB tail. After that, copies to and from that buffer don't touch the kernel either.

## The Shape of a Good Data Path

This is the cleanest control plane and data plane split I've come across, and it was designed for performance, not for a slide.

The control plane is big, slow, chatty and privileged. It talks to the kernel, the kernel talks to the firmware, and objects are allocated, mapped, registered and checked. It can be as complicated as it likes, because it runs once.

The data plane is small and boring. A few stores and one MMIO write per operation, all in user space, against structures the control plane already set up. No locks shared with other processes, no system calls and no RPCs.

The two never mix. The data plane doesn't call back into the control plane to ask permission. If something about the setup needs to change, that's a control-plane operation, done separately, and then the data plane goes back to being boring.

## The Same Split in BNK

BNK is built the same way, one layer out.

The control plane is Kubernetes. Tenants, VRFs, routes, gateway listeners, firewall policy, the `InferencePool` and the `F5EPP` that points at it are all custom resources. Controllers turn them into configuration for TMM, BNK's data plane, once. When something changes, the controllers reprogram TMM. That's setup.

The data plane is TMM handling requests. A request arrives at a VIP and gets matched to a tenant and a route. The endpoint picker scores it inline and TMM forwards it directly to a pod IP. There's no kube-proxy translation, no NodePort hop, and no second L7 proxy chained behind the first. In a typical Kubernetes ingress stack there are around five hops between the outside world and the model server: an external load balancer, kube-proxy, an ingress or gateway proxy, maybe a service mesh sidecar, and the pod. Each hop adds latency, and each one is a place for latency to hide when you go looking for it.

The endpoint picker fits the same model. It doesn't call out to a remote service per request to decide where to go. It keeps the cache and load state from the serving stack up to date as events arrive, and scoring a request is a local operation in the request path.

## Where Designs Go Wrong

This is also why I push back on a common pattern in AI gateway designs: something chatty on the per-request path. A sidecar that calls an external policy service on every request. A gateway that looks up a key in a remote database for each call instead of caching it. A routing layer that asks the model servers for their state when a request arrives, instead of keeping that state current in the background.

Each of these makes the hot path depend on the control plane. Each adds a network round trip, a failure mode and a queue to every request. And each one is easy to miss in a demo, because it only hurts at real concurrency, which is exactly when inference is most expensive.

NVIDIA's driver stack spends 685 calls up front so a copy needs none. The path in front of the GPU deserves the same discipline. Anything that can be decided ahead of time should be. Anything that has to be decided per request should be decided locally, from state that's already there.

## Next

The copy path is cheap and simple, and it's entirely user space. That makes it look easy to rebuild. Part 4 tries exactly that, with a hand-written copy and no CUDA at all. It comes out at two-thirds of CUDA's speed, for a reason nobody would guess, and the reason says a lot about how round robin thinks about GPUs.

---

**Under the Endpoint Picker**

1. [One Request, Five Prices](/blog/under-the-endpoint-picker-1-one-request-five-prices)
2. [What Sits Behind the Pod IP](/blog/under-the-endpoint-picker-2-what-sits-behind-the-pod-ip)
3. Pay Once, Then Get Out of the Way
4. [Measure, Don't Assume](/blog/under-the-endpoint-picker-4-measure-dont-assume)
5. [Seeing Without Slowing Down](/blog/under-the-endpoint-picker-5-seeing-without-slowing-down)
6. [When the GPU Stops Asking the CPU](/blog/under-the-endpoint-picker-6-when-the-gpu-stops-asking-the-cpu)
