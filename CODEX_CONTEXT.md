# Context for the next Codex task

This project is a research-oriented student mini project: design and eventually build a custom application-layer file-transfer protocol for two machines on a local network.

## Agreed direction

- Build on TCP; do not attempt to replace TCP/IP.
- Intended MVP: custom binary framing, bounded streaming, whole-file integrity verification, and interrupted-transfer recovery.
- Node.js is the likely language.
- Block-aware synchronization inspired by the 1996 rsync algorithm report is a stretch goal, after the baseline works.
- The student knows CRUD web application basics and some TCP/IP/HTTP, but has not designed a protocol before. Explain the important choices as the project progresses.
- Time is roughly one month with irregular weekend/holiday availability. Make visible, reviewable progress quickly and keep scope realistic.

## Current state

This repository currently contains a documentation scaffold only. No application code, protocol implementation, test results, or benchmark results exist. Tentative decisions and open questions are listed in `docs/protocol-design-log.md`; do not present them as settled.

## Start here

Read `README.md` and the documents under `docs/`. Continue with a small, presentable next artifact: refine the protocol specification and state machine, resolve only the decisions required for a minimal prototype, and explain assumptions. Do not silently expand scope. Do not claim experiments or results that have not been run. If implementation begins, work in small steps with clear explanations suitable for a student new to protocol design.
