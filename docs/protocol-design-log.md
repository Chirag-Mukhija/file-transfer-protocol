# Protocol design questions and decision log

Use this document to turn assumptions into explicit, reviewable decisions. Status labels: **Tentative** means a working default for discussion; **Open** means no choice has been made; **Deferred** means outside the MVP unless time allows.

The detailed working defaults for framing, message types, stop-and-wait streaming, integrity, and contiguous-offset resume are now collected in [protocol-specification.md](protocol-specification.md). This log remains the place to record accepted changes. Its broad questions below should be read together with that draft: a proposed answer is not an approved or measured answer.

## Current working assumptions

| Topic | Working position | Status / rationale |
|---|---|---|
| Transport | TCP | Tentative. Reliable ordered byte stream lets the project focus on application framing and transfer behavior. |
| Network scope | Two peers on a trusted LAN | Tentative scope limit; peer discovery and hostile-network security are excluded initially. |
| Language | Node.js | Tentative, based on the student's existing experience. |
| Payload handling | Bounded streaming chunks | MVP requirement; chunk size and write/backpressure behavior are open. |
| Integrity | Whole-file digest checked by receiver | MVP requirement; algorithm and when/how digest is supplied are open. |
| Recovery | Resume an interrupted transfer | MVP requirement; offset-based versus chunk-map model and checkpoint durability are open. |
| Delta synchronization | Block-aware matching inspired by rsync | Deferred stretch goal after baseline evaluation. |

## Open protocol questions

### Framing and negotiation

- What fixed header fields are essential? Is a magic value and explicit version necessary for the first prototype?
- Which byte order and integer widths will be used for payload lengths, offsets, and sizes?
- What maximum frame/payload size will be enforced?
- How are incompatible versions and unknown message types reported?
- Is capability negotiation needed for a single-version, single-feature MVP?

### Transfer identity and files

- Is a transfer identified by a random ID, a content digest, or both?
- How will the receiver constrain filenames and destination paths to prevent path traversal?
- What metadata is needed: name, size, modification time, media type, permissions? Keep the MVP minimal.
- Should files be written to a temporary name and atomically renamed only after verification?

### Streaming, acknowledgment, and recovery

- What chunk size(s) will be compared?
- Should every chunk be acknowledged, or should ACKs confirm periodic durable checkpoints?
- Is a resume offset enough, or should the protocol track per-chunk receipt/checksums?
- How does sender discover the receiver's durable offset after reconnect?
- How are duplicate, overlapping, missing, or out-of-range chunks handled?
- What timeout, retry, abort, and cleanup policy is appropriate?

### Integrity and security

- Which digest is available in the chosen Node.js runtime and appropriate for accidental corruption detection?
- Is digest validation whole-file only, or also per-chunk for recovery diagnostics?
- What threat model applies? A checksum does not authenticate a peer or protect traffic from an active attacker.
- Is TLS explicitly out of MVP, or should the later design include a TLS-wrapped mode?

### Evaluation

- What simple baseline will be used (for example, one-shot TCP streaming with no resume metadata)?
- Which file sizes and workloads are representative and feasible to repeat?
- How will machine load, connection setup, warm/cold filesystem cache, and run-to-run variation be handled?
- Which metrics can be collected reliably without overclaiming (throughput, completion time, bytes transferred, recovery outcome, memory)?

## Decision log

| Date | Decision / change | Reason | Evidence or follow-up |
|---|---|---|---|
| 2026-10-25 | Start with custom TCP-based LAN file transfer; keep rsync-inspired delta mode as stretch scope. | Fits the one-month learning project and makes baseline behavior measurable before adding algorithmic complexity. | Revisit after reading the report and confirming course expectations. |
| 2026-10-25 | Create documentation-only scaffold; do not implement yet. | Current review milestone is to present a clear project direction and design plan. | Begin implementation only after design review and scope confirmation. |
| 2026-10-25 | Draft a minimal version-1 wire format and state machine in `protocol-specification.md`. | Resolve enough protocol behavior to review an implementable MVP while keeping parameter and policy choices explicitly tentative. | Design review needed; no implementation or experiment has been run. |
| 2026-10-25 | For the college prototype, use Node.js, stop-and-wait DATA/ACK, same transfer ID for manual resume, and refuse destination overwrite. | These choices make the first local demo small and explainable; they do not imply these are the best performance choices. | Implemented in `src/`; local transfer and interruption/resume demos ran on loopback. Revise after student-led review and evaluation. |

The two earlier entries are historical decisions for the documentation-only stage; the project has since moved into a prototype. The current protocol specification is the source of truth for behavior. The code is shared by the college and learning tracks; the learning track changes how we approach and explain the code, not by maintaining a second implementation.
