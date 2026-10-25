# Benchmark and test plan

**Status: planned, not executed.** This document defines questions and intended measurements. It contains no results or claims about performance.

## Correctness tests planned

- Empty file, tiny file, and file larger than available application memory.
- Binary content containing arbitrary bytes, including zero bytes.
- Receiver output digest matches source digest after successful completion.
- Connection closes during header, during payload, and immediately before finalization.
- Reconnect and resume from the recorded state; final output matches exactly once, with no gaps or duplicate bytes.
- Invalid version/type, truncated frame, impossible offset, oversized declared payload, and unexpected message ordering are rejected safely.
- Disk write failure and insufficient space produce a defined failure rather than false success.
- Destination path and filename inputs cannot escape the configured receive directory.

## Baseline and comparisons

- **Baseline candidate:** direct TCP streaming without application-level resume state, using the same runtime and comparable I/O settings.
- **MVP candidate:** custom framing plus bounded streaming, whole-file integrity verification, and resumability.
- **Optional extension:** block-aware/delta transfer for a file with a prior similar destination version. Compare only after baseline tests pass.

The precise baseline must be chosen before measurement so the comparison is fair and repeatable. Existing tools such as rsync can be an optional reference point, but a comparison is meaningful only if workload and semantics are documented.

## Workloads and measurements

Choose manageable files at multiple sizes (for example, a small file, tens of MB, and hundreds of MB, adjusted to available hardware). Include both incompressible/random data and a modified copy of an existing file if evaluating the delta extension.

Record per run:

- Source size, workload type, chunk size, and protocol/build revision.
- Elapsed transfer time and effective throughput (file bytes divided by elapsed time).
- Bytes sent on the wire if measurable, including protocol overhead where possible.
- Completion outcome and verified digest match.
- Time to resume and amount retransmitted after a controlled interruption.
- Peak memory observation and CPU use if collection is reliable.

Run each condition multiple times, report all trials or a summary with spread, and record machine, OS, Node.js version, LAN type, and approximate network conditions. Avoid treating one run as a general result.

## Controls and limitations to document

- Use the same sender/receiver machines, file set, and destination storage for comparisons.
- Separate connection/setup time from transfer time consistently, or state that it is included.
- Note filesystem cache and background load; do not compare unlike runs without qualification.
- LAN throughput can be dominated by storage, CPU, Wi-Fi conditions, and OS caching rather than protocol overhead.
- This is a small educational evaluation, not a broad performance study. No experiments have yet been run.
