# Problem statement and research question

## Context

Existing file-transfer tools already solve the practical problem. This project is not intended to replace FTP, SCP, or rsync. Its educational goal is to make application-layer protocol decisions visible: how a byte stream is framed into messages, how large payloads are streamed, how a receiver knows a file is complete, and how a transfer can continue after a connection failure.

## Problem statement

A basic file copy over a TCP connection can move bytes, but it does not by itself define a reusable application protocol. The application must agree on message boundaries and meaning, constrain resource use, identify the intended output, detect an incomplete or mismatched file, and decide what happens when a connection drops. Designing and evaluating those behaviors provides a focused way to study protocol engineering beyond CRUD request/response patterns.

## Working research question

**For large files transferred between two machines on a LAN, how do chunked streaming, end-to-end integrity verification, and resumable transfer affect correctness, recovery behavior, and throughput compared with a simple one-shot transfer baseline?**

### Subquestions

- Does bounded streaming keep memory usage independent of total file size in the chosen implementation?
- After a deliberately interrupted transfer, can the receiver resume without missing, duplicating, or silently corrupting bytes?
- What throughput and completion-time differences appear across file sizes and chunk sizes in repeated LAN trials?
- What overhead is introduced by control frames and integrity verification?
- If time permits, when does block-aware delta transfer reduce bytes sent for similar files, and what CPU cost does it add?

## Scope and assumptions

**Provisional MVP:** one sender, one receiver, one file per transfer, TCP transport, binary application frames, bounded streaming, whole-file integrity verification, and restart/resume support.

**Assumptions to validate:** both peers are on a trusted LAN; the first version need not handle hostile peers; files can be staged at a receiver-selected or configured destination; the sender and receiver can be restarted between resume attempts; Node.js will be used.

## Intended contribution

A clear protocol specification and a small prototype, followed by a reproducible evaluation of correctness, interruption recovery, throughput, and resource behavior. Any conclusion must be limited to the tested machines, network, file set, and implementation. No performance or novelty claim is made before experiments.
