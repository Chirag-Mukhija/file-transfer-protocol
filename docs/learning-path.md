# Learning path: build the protocol one decision at a time

This is the personal learning track. It uses the same project, specification, literature notes, and implementation as the college track. There are two ways to work with one shared codebase: the college track uses the current prototype decisions to reach a demonstrable submission; the learning track pauses before changes, explains the trade-offs, and lets you choose. When your learning choice changes behavior, we update the shared code and decision log instead of regenerating common pieces.

The key difference is how we work: the quick track keeps scope narrow so there is a demonstrable project; the learning track pauses at each design choice, tries small experiments, and gives you ownership of the decision. We will keep the reasoning and accepted changes in [the decision log](protocol-design-log.md).

## How each coding session will work

1. State the small behavior we are adding and the networking idea it teaches.
2. Sketch the inputs, outputs, state changes, and likely failure cases before coding.
3. Implement a small piece. Explain the important lines and data flow in plain language.
4. Run only the checks you ask for or the project milestone requires, and report exactly what ran.
5. Review the code together. You can ask for changes, trace a message through it, or explain it back in your words.
6. Record decisions and unknowns in the shared docs. Avoid maintaining duplicate copies of the same protocol description.

## Stages

### 0. Read and question the existing design

Learn the words first: byte stream, frame, payload length, state machine, digest, offset, checkpoint, backpressure, and atomic publish. Walk through one OFFER, READY, DATA, ACK, FINISH, and COMPLETE sequence in the specification. Mark anything that is unclear. Do not treat the tentative defaults as correct just because they are written down.

### 1. See TCP as a byte stream

Trace the existing sender and receiver's local TCP exchange first. Observe that one `write` does not promise one matching `data` event. Learn how `readFrames` buffers bytes until a complete application message is available. This stage teaches why framing exists before you decide whether to rewrite or extend the codec.

### 2. Build and test the frame codec

Review header encoding and parsing separately from file I/O. Decide what each field means, why its width is fixed, why byte order matters, and how invalid lengths are rejected. Use short examples to hand-calculate a header. Keep the 28-byte header and one-megabyte maximum as tentative defaults until you have a reason to change them.

### 3. Transfer a file with bounded streaming

Trace how the sender reads a bounded chunk and waits for its ACK before proceeding. Learn how the fixed chunk and stop-and-wait rule bound application-level in-flight data. Check how that differs from using Node streams and backpressure. Decide whether the prototype needs multiple in-flight chunks or whether stop-and-wait is easier to reason about.

### 4. Add file-level integrity and safe finalization

The prototype computes a digest at both ends and publishes only after the values match. Learn why TCP checksums and a whole-file digest serve different purposes. Decide what SHA-256 does and what it cannot do. Examine temporary files, sync operations, and the no-overwrite hard-link publish behavior without claiming power-loss guarantees the implementation does not provide.

### 5. Add recovery from a broken connection

Review the already demonstrated reconnect behavior, then trace a lost ACK and receiver restart scenario from the code. Decide how a transfer ID distinguishes the logical file from a TCP connection. Choose the progress unit and define what an ACK promises. The current prototype syncs data before ACK and persists a checkpoint; decide whether that cost and restart behavior suit the project.

### 6. Test failures before measuring speed

Test empty and binary files, partial headers, partial payloads, oversized lengths, incorrect offsets, early FINISH, digest mismatch, interrupted writes, duplicate offers, and destination-name collisions. Learn to write down expected state transitions before interpreting an observed result. No result should be described as a protocol guarantee unless the implementation and checks support it.

### 7. Evaluate and explain trade-offs

Define the one-shot baseline, select file sizes and repeat counts, record machine and network details, and decide whether connection setup is included in timing. Compare correctness and recovery first, then throughput and memory. Consider block-aware delta transfer only after the baseline passes its correctness and recovery checks.

## Design decisions for you to own

We will revisit these rather than silently treating the current defaults as settled:

- Which header fields are useful and whether every frame needs the transfer ID.
- Whether the version belongs in every frame and how unsupported versions fail.
- Maximum frame size and chunk size, based on simple memory and throughput measurements.
- How a transfer ID is generated and how long the receiver retains it.
- Whether resume means a single contiguous offset or a map of verified chunks.
- What exactly an ACK promises: received in memory, written to the file, or safely checkpointed.
- Whether whole-file hashing is enough for the prototype and how it differs from authentication.
- How destination collisions, partial-file expiration, source mutation, and receiver restarts should behave.
- Which failures deserve a protocol ERROR frame and which should simply close the connection.

## Shared artifacts and separate learning work

- **Shared sources of truth:** [protocol specification](protocol-specification.md), [architecture](architecture.md), [research notes](related-work.md), and [decision log](protocol-design-log.md).
- **College support:** [college demo brief](college-demo-brief.md) and the filled PPT in `output/college/`.
- **Learning support:** this path, small handwritten protocol sketches, code reviews, and decisions recorded after you approve them.
- **Code:** one canonical implementation initially. If your later design intentionally diverges, create a separate branch or revision after explaining the reason. Do not duplicate unchanged modules just to label a second version.

The next learning session should begin with one frame written out as bytes and a walk-through of what the receiver must do when only half its header has arrived.
