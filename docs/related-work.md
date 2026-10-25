# Related-work notes

## Tridgell and Mackerras, “The rsync algorithm” (1996)

Andrew Tridgell and Paul Mackerras, *The rsync algorithm*, Australian National University, Technical Report TR-CS-96-05, June 1996.

- [ANU research repository record and published report](https://openresearch-repository.anu.edu.au/items/15a1c428-0ad3-49d6-bb54-9238250cbbf0)
- [Authors' rsync technical report page](https://rsync.samba.org/tech_report/)
- [Direct report PDF (ANU repository)](https://openresearch-repository.anu.edu.au/server/api/core/bitstreams/3f35865c-c0c3-4741-bdeb-7a25fef5ddba/content)

### Initial note

The report describes updating one file to match another by identifying matching regions and transmitting unmatched data, even when the two files are on different machines. Its named ideas include rolling checksums, checksum searching, and pipelining. That gives this project a credible research connection for a possible delta-transfer extension.

### Relevance to this project

The rsync algorithm is **not** required for the MVP. The initial project should first establish a reliable baseline protocol with explicit framing, bounded streaming, whole-file verification, and recovery. A later extension could compare ordinary chunk transfer with a block-aware strategy when the destination has a similar prior version of the file. On a fast LAN, saved bytes may or may not justify extra CPU and protocol complexity; that is an empirical question.

### Reading questions

1. What metadata does the receiver need to send to let the sender find reusable blocks?
2. How does the rolling checksum permit efficient scanning at offsets that are not aligned to fixed blocks?
3. Which strong checksum role is distinct from the rolling checksum's fast candidate matching?
4. How do pipelining and network latency affect the algorithm's benefit?
5. Would a LAN workload with large files and small edits resemble the paper's motivating use case?

### Citation record

Tridgell, A., & Mackerras, P. (1996). *The rsync algorithm* (TR-CS-96-05). Department of Computer Science, Australian National University. Primary source links above. This is foundational background for the deferred delta-transfer extension and is not counted among the four recent journal studies below.

## Recent journal studies for the college review

The college review rules ask for journal papers from 2024–2026 and exclude conference papers. The four studies below are from Elsevier journals within that window. They cover related but different parts of the problem. The slide deck cites these as [1]–[4]. Their findings are not results from this project.

### 1. p2p-copy (2026)

Toni Eberle, Klaus Nölp, and Lena Oden, “p2p-copy: A secure high-performance file transfer tool for restricted network environments,” *SoftwareX*, vol. 35, article 102882, 2026. [Publisher page](https://www.sciencedirect.com/science/article/pii/S2352711026003730), DOI: [10.1016/j.softx.2026.102882](https://doi.org/10.1016/j.softx.2026.102882).

The paper presents a Python library and command-line tool using a relay and secure WebSocket connections. It combines pairing-code authentication, encryption, compression, integrity checks, and resume support. Its evaluation concerns Internet and data-center transfers. It shows that transfer tools combine these features, but its deployment and security goals differ from this project's single-file LAN prototype.

### 2. QUIC on the Fast Lane (2024)

Marcel Kempf, Benedikt Jaeger, Johannes Zirngibl, Kevin Ploch, and Georg Carle, “QUIC on the Fast Lane: Extending Performance Evaluations on High-rate Links,” *Computer Communications*, vol. 223, pp. 90–100, 2024. [Publisher page](https://www.sciencedirect.com/science/article/pii/S014036642400166X), DOI: [10.1016/j.comcom.2024.04.038](https://doi.org/10.1016/j.comcom.2024.04.038).

The authors benchmark QUIC implementations on dedicated high-rate links and report implementation-dependent goodput. Their analysis highlights the effects of operating-system buffer sizes, CPU architecture, packet processing, and network-interface offload. This motivates recording the test environment and repeating measurements. Their QUIC results do not predict this project's TCP/LAN performance.

### 3. Data center TCP dataset (2024)

Jan Fesl et al., “Data center TCP dataset,” *Data in Brief*, vol. 54, article 110522, 2024. [Publisher page](https://www.sciencedirect.com/science/article/pii/S2352340924004906), DOI: [10.1016/j.dib.2024.110522](https://doi.org/10.1016/j.dib.2024.110522).

The dataset compares 17 TCP congestion-control variants using 18 connection measurements. The paper describes a 16 Mbps test link, one logical iperf3 TCP flow at a time, and 50 repeated measurements per variant. It supports careful measurement and repeatability, while studying TCP transport behavior rather than application-level framing, end-to-end file verification, or reconnect/resume behavior.

### 4. FaRE for inline backups (2024)

Yucheng Zhang et al., “A fragmentation-aware redundancy elimination scheme for inline backup systems,” *Future Generation Computer Systems*, vol. 156, pp. 53–63, 2024. [Publisher page](https://www.sciencedirect.com/science/article/pii/S0167739X2400075X), DOI: [10.1016/j.future.2024.03.004](https://doi.org/10.1016/j.future.2024.03.004).

FaRE combines deduplication and delta compression for backup data, with a policy that accounts for chunk fragmentation and added storage I/O. The work shows a trade-off between reducing repeated data and the cost of finding or reading reusable content. This is relevant to a possible similar-file transfer extension, which remains outside the first prototype.

## Review synthesis and scoped gap

The selected papers address a feature-rich Internet transfer tool, transport performance on high-rate links, repeated TCP transport measurements, and redundancy reduction in backup storage. **For this mini-project, the scoped gap is an evaluation question:** within this selected set, none directly compares a minimal application-layer TCP transfer with bounded streaming, whole-file verification, and offset-based resume against a one-shot TCP baseline on a small LAN. This is not a claim that no prior LAN transfer study or tool exists, and it is not a claim of a novel protocol. The project should test the behavior and report only its own observed results.

The four recent journal papers satisfy the college review's publication-window and venue requirements as currently stated in the supplied guidelines. The 1996 rsync report remains foundational background for the deferred delta-transfer idea and does not count as one of the four recent studies.
