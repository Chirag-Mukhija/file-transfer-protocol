# LAN File Transfer Protocol (working title)

A research-oriented mini project to design and eventually prototype a small custom application-layer protocol for transferring files between two machines on a local network.

> **Status: college review draft plus working command-line and browser-demo prototype.** The college PPT and student-facing project notes are prepared. A basic sender/receiver, a localhost browser dashboard, and local transfer/resume demonstrations now exist. No benchmark has been run; protocol choices remain provisional unless explicitly marked otherwise.

## Current status

- Project direction selected: custom file transfer over TCP on a LAN.
- Research anchor identified: Tridgell and Mackerras's 1996 report on the rsync algorithm.
- Initial architecture, data flow, research question, and a one-month plan are documented.
- MVP scope is framed around binary framing, streamed payloads, integrity verification, and interrupted-transfer recovery.
- Block-aware synchronization is a stretch goal, not part of the initial MVP.

## Problem and research direction

See [problem statement and research question](docs/problem-and-research-question.md). The project investigates how a deliberately small application-layer protocol can make file transfer behavior explicit and measurable: framing, streaming, integrity checks, and recovery after an interrupted connection.

**Working research question:** For large files transferred between two machines on a LAN, how do chunked streaming, end-to-end integrity verification, and resumable transfer affect correctness, recovery behavior, and throughput compared with a simple one-shot transfer baseline?

This is a project question, not a claim that the proposed protocol is novel or will outperform established tools.

## Proposed MVP

- Client and receiver communicate over TCP.
- A custom binary frame format carries control messages and file data.
- File bytes are streamed in bounded chunks rather than loaded into memory at once.
- Receiver verifies whole-file integrity before marking a transfer complete.
- Transfer state can be used to resume an interrupted transfer; the proposed MVP semantics are documented in the protocol specification.
- A Node.js command-line sender and receiver implement the current draft for local demonstration.

### Out of scope for the first MVP

- Replacing TCP/IP or building a general-purpose transport.
- Public Internet deployment, NAT traversal, or multi-peer coordination.
- Production-grade authentication/encryption; security design must be reviewed before any real deployment.
- Delta/block-aware synchronization. This is a research extension inspired by rsync and should be attempted only after the baseline works.

## Repository map

- [`docs/problem-and-research-question.md`](docs/problem-and-research-question.md): motivation, scope, and research question.
- [`docs/related-work.md`](docs/related-work.md): rsync background plus four recent journal studies and a scoped research gap.
- [`docs/architecture.md`](docs/architecture.md): components and proposed data-flow diagrams.
- [`docs/protocol-design-log.md`](docs/protocol-design-log.md): open questions and provisional decisions.
- [`docs/protocol-specification.md`](docs/protocol-specification.md): proposed wire format, transfer rules, failure behavior, and sender/receiver state machines.
- [`docs/college-demo-brief.md`](docs/college-demo-brief.md): plain-language project explanation, likely presentation questions, and a planned demo path.
- [`docs/demo-setup-and-usage.md`](docs/demo-setup-and-usage.md): two-laptop setup, browser demo instructions, protocol decisions/trade-offs, and truthful comparison guidance.
- [`docs/presentation-speech.md`](docs/presentation-speech.md): slidewise four-speaker script with handoffs and a complete solo-presenter version.
- [`docs/learning-path.md`](docs/learning-path.md): staged build-and-review plan using the shared protocol and code.
- [`docs/milestone-plan.md`](docs/milestone-plan.md): one-month, part-time plan.
- [`docs/benchmark-and-test-plan.md`](docs/benchmark-and-test-plan.md): planned correctness and performance evaluation; no results yet.

The filled template deck is [available here](output/college/College_Mini_Project_Review_1.pptx). It still needs the students' names/USNs and the guide's name/designation. Review the submission requirements in [the college demo brief](docs/college-demo-brief.md) before submission.

For step-by-step setup and file transfer on two laptops, see [usage.md](usage.md).

## Next steps

1. Replace the student/USN and guide placeholders in the college deck; agree on the title, domain, and SDG mapping with the guide.
2. Read the rsync report's algorithm and rolling-checksum sections; record which ideas are relevant to a LAN use case.
3. Review the wire format and sender/receiver state machines in [the protocol specification](docs/protocol-specification.md), then record changes in the decision log.
4. Walk through the shared prototype module by module using the student-led [learning path](docs/learning-path.md); keep one implementation and update it only after you choose a design change.
5. Run the planned correctness evaluation and benchmark separately before reporting measured results.

## Run the prototype

Requires Node.js 20 or newer. On the receiver machine:

```sh
npm run receive -- --dir ./received --host 0.0.0.0 --port 9000
```

On the sender machine, use the receiver's LAN address:

```sh
npm run send -- --host 192.168.1.20 --port 9000 ./path/to/file
```

The sender prints a transfer ID and a resume command. If the connection drops, rerun the same command with `--id <printed-id>` and the unchanged source file. The receiver refuses to overwrite an existing destination. The prototype has no authentication or encryption and is for a trusted local demonstration only. Detailed behavior and caveats are in [the protocol specification](docs/protocol-specification.md).

For the presentation dashboard, run `npm run demo -- --dir ./received --tcp-host 0.0.0.0 --tcp-port 9000 --web-port 8080` on the receiving laptop, then `npm run web -- --web-port 8080` on the sending laptop. Open `http://127.0.0.1:8080` on each laptop. The dashboard's **local HTTP handoff** feeds the sender helper; the actual laptop-to-laptop bytes use LFTP over TCP. See [demo setup and usage](docs/demo-setup-and-usage.md) for firewall, resume, troubleshooting, and caveats.

The demo file generator is `npm run make-demo-file` (8 MiB by default). The slidewise talk track is in [presentation-speech.md](docs/presentation-speech.md), with both four-speaker handoffs and a solo version.

## Demonstration actually run

On 2026-10-25, the command-line prototype was run against loopback (`127.0.0.1`). A 700,000-byte binary file completed and source/destination SHA-256 values matched. A second 1,200,000-byte binary transfer was interrupted after the receiver acknowledged 65,536 bytes; resuming with the same transfer ID started at byte 65,536, completed, and produced a matching digest. The browser helper path was also exercised locally with a 1 MiB generated binary file; the receiver dashboard event feed included ACK and COMPLETE, and its saved digest matched the source. These are local functional demonstrations, not a two-laptop LAN measurement or performance result. They do not establish reliability across operating systems or power loss.

## Limitations and assumptions

- A single sender and receiver on a trusted LAN are assumed for the initial exploration.
- TCP already provides ordered, reliable delivery within a live connection; application-level integrity checks and resumability address different concerns (corruption detection/end-to-end validation and continuity across connections).
- The project has about one month and irregular weekend/holiday availability. Scope must be reduced if the baseline cannot be completed early enough to evaluate it.
- The research anchor is an established algorithm paper; the project's contribution is an educational protocol design and measured comparison, not a claim of a new synchronization algorithm.
