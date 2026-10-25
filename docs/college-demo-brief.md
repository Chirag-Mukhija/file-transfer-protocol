# College project brief and demo notes

**Purpose:** a short explanation to help the student write, present, and demonstrate the college version. The protocol remains a review draft. A Node.js prototype now exists, and a local transfer plus an interrupted/resumed transfer have been demonstrated. No benchmark or LAN experiment has been run.

## Project identity

- **Working title:** Resumable LAN File Transfer Protocol
- **Domain area:** Computer Networks and Data Communication
- **Possible SDG mapping:** SDG 9, Industry, Innovation and Infrastructure. The project studies dependable local data movement as a small networking exercise. Confirm the title, domain, and SDG mapping with the guide before treating them as finalized.
- **Project type:** an educational application-layer protocol prototype over TCP. It does not replace TCP/IP or claim to outperform established tools.

## Short explanation

Computers on the same local network can send bytes over TCP, but an application still has to define what those bytes mean. This project proposes a small protocol for sending one file at a time. The sender and receiver exchange framed messages, the sender streams bounded chunks, and the receiver checks the complete file before publishing it. If a connection breaks, the receiver can report its saved byte offset so the sender can continue. The project will compare this behavior with a simple one-shot TCP transfer after the prototype works.

### One-minute presentation version

“Our project is a small file-transfer protocol for two computers on a local network. TCP already handles ordered delivery while a connection is active. The application still needs message boundaries, a way to check the complete file, and a plan for a connection that drops. Our proposed design sends bounded chunks, verifies the whole file with SHA-256, and resumes from the receiver's recorded offset. We will compare it with a simple one-shot TCP transfer for correctness, recovery behavior, and throughput. The design is based on existing work, and we are not claiming a new or faster protocol.”

Rewrite this in your own speaking style and make sure you can explain every term in it.

## What each part means

- **TCP:** the operating system's reliable, ordered byte stream for a live connection. It does not tell an application where its messages or files begin and end.
- **Application-layer protocol:** the rules this project adds above TCP, including message types and what each peer may send next.
- **Frame:** one application message with a header that tells the receiver the message type and payload length.
- **Bounded streaming:** reading and writing a limited portion of a file at a time, so memory use does not need to grow with total file size.
- **SHA-256 digest:** a summary computed from file contents. The receiver compares its own result with the sender's expected value to detect a mismatch. A digest alone does not authenticate the sender.
- **Resume offset:** a byte position. The receiver says how much of the file prefix it has accepted, and the sender continues at that position.

The proposed wire format and the detailed state transitions are in [the specification](protocol-specification.md). Use that as the common technical source instead of copying a second, slightly different protocol description here.

## Proposed behavior to explain on the architecture slide

1. The sender offers a file using a transfer ID, safe filename, size, and expected digest.
2. The receiver replies with the next byte offset it needs.
3. The sender sends one bounded data chunk at a time. The receiver writes and acknowledges progress.
4. The receiver checks the staged file's length and digest before making it the final file.
5. If the connection ends early, a later connection can offer the same transfer ID and ask the receiver where to continue.

These rules are implemented in the current prototype. Defaults such as chunk size and acknowledgment timing remain tentative in the specification because they have not been evaluated comparatively.

## Research question and comparison

**Research question:** How do bounded streaming, whole-file verification, and offset-based resume affect correctness, recovery behavior, and throughput on a LAN compared with a one-shot TCP copy?

The baseline and the proposed protocol should use the same sender/receiver machines, file inputs, destination storage, and timing definition. A controlled interruption can show whether the receiver preserves a usable prefix. Throughput and memory claims must come from the actual prototype and repeatable measurements. Planned tests and metrics are in [the benchmark plan](benchmark-and-test-plan.md).

The literature synthesis and four recent journal references are maintained once in [related-work.md](related-work.md) and cited in the PPT. The scoped gap describes only those selected papers. It does not claim no existing file-transfer tools or LAN studies exist.

## Likely questions and clear answers

**Why use TCP?**

TCP handles ordered delivery and network retransmission for a live connection. This lets the project focus on application framing, file verification, and recovery after the connection itself ends.

**Why build a custom protocol if tools already exist?**

The goal is to learn and measure application-protocol design choices, not to replace FTP, SCP, rsync, or other established tools.

**Does SHA-256 encrypt or authenticate a file?**

No. It lets both sides detect whether the received bytes match the expected file contents. Authentication and encryption are outside the proposed MVP.

**What is different from rsync?**

The first prototype sends the file's bytes in order. It does not find reusable matching blocks in an older destination file. Block-aware delta transfer is a possible extension after the basic transfer works.

**Is the project working or faster already?**

The prototype has completed local loopback transfers, including a manually interrupted and resumed transfer with matching final digests. No benchmark or LAN experiment has been run, so there is no evidence that it is faster. The PPT presents the proposed design and research plan, not performance results.

## Demonstration steps

1. Start the receiver and show its configured output directory.
2. Send a small binary file and show the sender's completion message and matching receiver file.
3. Show the receiver's independently computed digest matches the source digest.
4. Send a larger file while showing memory stays bounded by the implementation's buffering strategy.
5. Interrupt a transfer, reconnect with the same transfer ID, and show the receiver's offset followed by a verified completion.
6. If time permits, compare repeated runs with the one-shot TCP baseline and report the machine, operating system, runtime version, network, file size, chunk size, and all observed outcomes.

The first and fifth steps were run on loopback on 2026-10-25 using generated binary files of 700,000 and 1,200,000 bytes. In the interruption demonstration, 65,536 bytes had been acknowledged before reconnecting with the same transfer ID. The browser-to-local-helper-to-LFTP path was also exercised on loopback with a 1 MiB binary file, with receiver ACK/COMPLETE events and matching final digest. These were local demonstrations, not a two-laptop LAN run. The LAN, large-file memory, and baseline comparison steps remain planned and unmeasured.

## Submission checks

- Replace the four student and USN placeholders and both guide placeholders on the title slide.
- Confirm the final title, SDG, and domain area with the guide as required by the college rules.
- The supplied rules state that similarity and AI-generated content for the report and PPT should each be below 25%, with the plagiarism report attached to the report. This generated draft does not establish compliance. Review and rewrite the presentation in your own words, follow the guide's academic-integrity instructions, and use the institution's actual report. Do not report an unrun similarity check or invent a percentage.
- The selected four survey articles are 2024–2026 journal papers. The college rules exclude conference papers.
- Do not put planned test outcomes in the results tense. Add results only after running the tests.
