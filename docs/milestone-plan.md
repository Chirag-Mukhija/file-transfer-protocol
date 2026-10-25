# One-month milestone plan

**Planning assumption:** about four weeks, with irregular weekend/holiday sessions and possible reviews. This plan prioritizes a demonstrable baseline and reserves delta synchronization as optional. Reorder dates around the actual deadline; no calendar dates are assumed beyond the starting review.

| Week | Focus | Concrete artifact / exit check |
|---|---|---|
| 1 | Understand TCP byte streams, framing, binary encoding, Node.js stream backpressure; read the rsync report's core algorithm. | Reviewable protocol sketch, glossary of concepts to revise, and resolved MVP scope. No code required until design review. |
| 2 | Specify frame fields, message/state machine, error cases, limits, and resume semantics. | Short protocol specification and test cases for malformed/truncated frames and normal transfer. |
| 3 | Implement the baseline sender/receiver and bounded streaming; add whole-file verification. | A repeatable local/LAN transfer demo with correct output for empty, small, and large files. |
| 4 | Add interruption/resume, run planned measurements, prepare demo and limitations. | Recovery demonstration, benchmark table with actual observations, and presentation explaining decisions and trade-offs. |

## Scope gates

1. If the sender/receiver baseline is not working by the start of Week 4, defer resumability or reduce its first version to safe restart-from-zero behavior and clearly document the gap.
2. Do not begin block-aware delta transfer until baseline correctness, recovery behavior, and at least a small benchmark set are complete.
3. Reserve a final session for repeatability checks and presentation; do not spend all available time on optional optimization.

## Concepts to revise

- TCP as a byte stream; connection lifecycle, EOF, timeouts, and the difference between TCP delivery and application message boundaries.
- Binary representation: integer widths, endianness, length-prefix framing, parsing partial reads, and validating untrusted lengths.
- Node.js `net` sockets, readable/writable streams, backpressure, and file streams.
- Checksums/digests: accidental corruption detection versus authentication.
- Temporary files, atomic rename, durable writes, and safe resume checkpoints.
- Experimental method: controlled variables, repeated measurements, baselines, and honest reporting of limitations.
- For the stretch goal: fixed blocks, rolling checksums, strong block signatures, and delta encoding from the rsync report.
