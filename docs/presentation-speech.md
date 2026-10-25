# Presentation speech: 11-slide Review 1 deck

Use this with `output/college/College_Mini_Project_Review_1.pptx`. Replace the bracketed names before presenting. Suggested pace: about 6–7 minutes of speaking plus a 2–3 minute live demo. The live demo is optional; if the room/network setup is unreliable, use the local loopback evidence stated on the final README and do not imply a live LAN transfer happened.

Keep the claims consistent: the prototype has completed local loopback transfers and one interrupted/resumed loopback transfer. The two-laptop demo is a demonstration plan until the team runs it. No comparative benchmark has been performed, so do not claim this protocol is faster or better than established tools.

## Four-speaker version

Assign speakers before the presentation. Each takes a block and hands off with the sentence shown. Avoid talking over the previous speaker; change speaker after the handoff line.

### Speaker 1 — slides 1–3: project and context

**Slide 1 — Title**

“Good morning. We are [student names], and our project is *Resumable LAN File Transfer Protocol*. We are studying how a small application-layer protocol can make file transfer behavior clear and recoverable between computers on a local network.”

**Slide 2 — Outline**

“We will introduce the problem, explain our research question, review four recent journal papers, compare their scope with our proposed prototype, and finish with our references.”

**Slide 3 — Introduction**

“TCP already transports an ordered stream of bytes. The application still needs to define where a message ends, which file those bytes belong to, and when the complete file is safe to use. Our prototype adds framed messages, bounded file chunks, a SHA-256 check, and a way to continue after a connection interruption. Our domain is computer networks. We have selected SDG 9 as a possible connection to reliable digital infrastructure, subject to our guide's approval.”

**Handoff to Speaker 2:** “I’ll hand over to [name] to explain the specific problem and the research we used to frame it.”

### Speaker 2 — slides 4–5: question and file-transfer literature

**Slide 4 — Problem Statement**

“A one-shot copy can move bytes, but our project asks what happens when the connection ends before completion. The receiver needs to know how much of the file it has accepted, and it needs to check the whole file before treating the result as complete. Our research question is: how do streaming, verification, and resume affect correctness, recovery, and throughput on a LAN compared with a one-shot TCP transfer? The objective is to implement and measure a minimal version; we do not yet have comparative results.”

**Slide 5 — Recent File Transfer Tools**

“The first paper is p2p-copy by Eberle, Nölp, and Oden, published in SoftwareX in 2026. It describes a much more feature-rich file-transfer tool, including pairing, encryption, integrity checks, and resume. This tells us the surrounding problem already has substantial solutions. Our project does not claim to replace them. Its narrower purpose is to make message framing and resume decisions small enough to study and demonstrate.”

**Handoff to Speaker 3:** “Next, [name] will cover what the transport and TCP measurement studies teach us about evaluating performance.”

### Speaker 3 — slides 6–8: transport and storage literature

**Slide 6 — Transfer Performance on High-Speed Links**

“Kempf and colleagues evaluated QUIC implementations on high-speed links. Their reported results varied across implementations, and their paper discusses the influence of operating-system buffers, CPU, packet processing, and network hardware. We use this as a reminder that a performance result depends on the system and network setup. It is not a direct comparison with our application-level LAN protocol.”

**Slide 7 — TCP Performance Measurement**

“Fesl and colleagues provide a dataset comparing TCP congestion-control variants using repeated iperf3 measurements. The useful lesson for our project is to document the measurement setup and repeat comparisons. Their work measures TCP transport behavior, while our question concerns the application behavior above TCP: framing, file verification, and resuming after a disconnect.”

**Slide 8 — Delta Compression for Backups**

“Zhang and colleagues study FaRE, which reduces repeated data in backup workloads using deduplication and local delta compression. This is related to a possible future extension for similar files. It also adds complexity and storage work, so we have kept delta transfer out of the first prototype. First we want to understand the simpler full-file transfer and resume path.”

**Handoff to Speaker 4:** “I’ll hand over to [name] to summarize how these papers shape our comparison and what we plan to demonstrate.”

### Speaker 4 — slides 9–11: comparison, demo, references

**Slide 9 — Comparison of Existing Approaches**

“Together these papers show that secure file-sharing tools, transport performance studies, and backup deduplication already address important parts of the broader space. Our scoped question is different: on a simple LAN, what behavior do bounded chunks, whole-file verification, and receiver-reported resume provide compared with one-shot TCP? Our contribution is an educational prototype and an evaluation plan, not a claim of a new or faster algorithm.”

**Optional live demo while slide 9 remains displayed**

“Here the browser is only the control panel. Because browsers do not open raw TCP sockets, a small sender helper on this laptop hands the selected file to our protocol implementation. The helper sends an OFFER with the file name, size, digest, and transfer ID. The receiver responds READY with its next byte offset. We now see DATA chunks and ACKs. The receiver saves each chunk and checkpoint before acknowledging it. At the end it checks SHA-256, publishes the file without overwriting an existing destination, and returns COMPLETE. If time permits, we can interrupt and resume from the receiver's saved offset. This is the protocol working; the comparison with other tools still requires planned benchmarks.”

**Slide 10 — References**

“These are the four recent journal papers that informed our review: p2p-copy, a QUIC performance evaluation, a TCP measurement dataset, and FaRE for backup redundancy elimination. We selected journal work in the date range specified by our college guidelines. Our detailed references and the connection of each paper to the project are in the report.”

**Slide 11 — Thank You**

“Thank you. We welcome your questions, especially about the protocol state machine, the resume offset, and how we will measure the comparison fairly.”

## Solo-speaker version

This version is written to sound natural from one presenter. Keep the handoffs out; use a short pause between sections.

**Slide 1 — Title**

“Good morning. I’m [name], presenting our project, *Resumable LAN File Transfer Protocol*. We are studying how to make file transfer behavior clearer and recoverable between computers on a local network.”

**Slide 2 — Outline**

“I’ll introduce the problem and research question, summarize four recent journal papers, compare their scope with our prototype, and finish with the references.”

**Slide 3 — Introduction**

“TCP carries an ordered stream of bytes, but applications still need to define message boundaries and file completion. Our prototype adds framed messages, bounded chunks, a SHA-256 file check, and a way to continue after a connection interruption. Our domain is computer networks, and SDG 9 is a possible alignment that we will confirm with our guide.”

**Slide 4 — Problem Statement**

“If a connection ends halfway through a copy, the sender and receiver need a shared way to describe progress. The receiver also needs to check the complete file before treating it as finished. Our research question asks how streaming, verification, and resume affect correctness, recovery, and throughput on a LAN compared with one-shot TCP. The prototype is working locally, but comparative results have not yet been measured.”

**Slide 5 — Recent File Transfer Tools**

“Eberle, Nölp, and Oden's 2026 SoftwareX paper presents p2p-copy, which has features such as pairing, encryption, integrity checks, and resume. That is a richer tool than our prototype. We are not trying to replace it; our focus is a small, inspectable design for learning and measuring protocol behavior.”

**Slide 6 — Transfer Performance on High-Speed Links**

“Kempf and colleagues evaluate QUIC implementations on high-speed links. The results vary across implementations and depend on the operating system, CPU, packet processing, and hardware. This motivates documenting the setup for our own measurements. It is not a direct application-level comparison with our project.”

**Slide 7 — TCP Performance Measurement**

“Fesl and colleagues publish repeated TCP measurements using iperf3. We take the lesson that comparisons need a clear setup and repeated runs. Their work studies transport behavior; our question is about the application protocol above TCP.”

**Slide 8 — Delta Compression for Backups**

“Zhang and colleagues' FaRE reduces repeated data in backup workloads, while accounting for extra storage work. Similar-file delta transfer could be a future extension for us. We have left it out of the first version so we can first understand full-file transfer, verification, and resume.”

**Slide 9 — Comparison of Existing Approaches**

“These papers cover secure sharing, transport performance, and reducing repeated backup data. Our scoped question is what bounded chunks, whole-file verification, and a receiver-reported offset do on a simple LAN compared with one-shot TCP. The project's contribution is a learning prototype and planned evaluation, not a claim that our approach is faster or better.”

**Optional live demo while slide 9 remains displayed**

“The browser is a control panel; a local Node helper handles the raw TCP connection because browsers do not expose that kind of socket. The sender offers file metadata and a digest. The receiver replies with its next needed offset. The helper sends bounded DATA chunks and waits for ACKs. The receiver syncs each chunk and checkpoint before acknowledging it. At the end, it checks the SHA-256 digest and publishes the file without overwriting an existing one. The dashboard animates these events. This demonstrates our protocol path; it does not establish that it outperforms established tools.”

**Slide 10 — References**

“These four recent journal papers informed our review: p2p-copy, a QUIC evaluation, a TCP measurement dataset, and FaRE. We use them to place the project within existing work and to guide our evaluation plan.”

**Slide 11 — Thank You**

“Thank you. I’m happy to answer questions about the message sequence, what the digest tells us, how resume works, or how we plan to compare the prototype fairly.”

## Likely questions: short answers

- **Is it better or faster than rsync or p2p-copy?** “We have not measured that. Those are established tools with broader features. Our current goal is to learn and evaluate a deliberately small protocol against a simple one-shot TCP baseline.”
- **What exactly is resumed?** “The receiver reports the end of its saved contiguous prefix as a byte offset. The sender resumes reading at that position using the same transfer ID and unchanged source file.”
- **Does SHA-256 encrypt or authenticate the file?** “No. It detects content mismatch against the digest that was offered. It does not authenticate the peer or encrypt the transfer.”
- **Why ACK every chunk?** “It keeps the first state machine simple and limits outstanding data. It can cost throughput, so we need measurement before changing it.”
- **What happens if the destination file already exists?** “This prototype refuses to overwrite it.”
- **Has a two-laptop benchmark been completed?** “No. We have local loopback demonstrations. A LAN demonstration and controlled performance comparison remain future work.”
