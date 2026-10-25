# Live demo: setup, operation, and what to explain

This guide uses the existing college project and its shared Node.js implementation. It is meant for a live two-laptop demonstration and for personal use on a trusted local network. The browser interface is a thin teaching/control panel; the file data between laptops travels over the project's LFTP/TCP protocol.

## What is running where

```text
Sending laptop                                      Receiving laptop
┌────────────────────────────┐                     ┌────────────────────────────┐
│ Browser dashboard          │                     │ Browser dashboard          │
│   │ local HTTP handoff     │                     │   ▲ local event view       │
│   ▼                        │     LFTP over TCP    │   │                        │
│ Node sender helper ────────┼────────────────────>│ Node receiver              │
│   hashes + frames + chunks │  OFFER / DATA / ACK │   writes + checkpoints     │
└────────────────────────────┘ FINISH / COMPLETE   └──────────────┬─────────────┘
                                                                  ▼
                                                         verified output directory
```

Browsers do not offer ordinary websites a raw TCP socket API. The sending laptop therefore runs a small Node helper bound to localhost. The browser hands the selected file to that helper over local HTTP; the helper computes its digest and speaks LFTP over TCP to the receiver laptop. The receiving laptop also hosts a localhost dashboard that displays receiver-side progress. This keeps the actual inter-laptop transfer on the protocol being demonstrated.

The browser UI is for a demonstration and a convenient personal workflow. The direct command-line sender/receiver remain available. The prototype is unauthenticated and unencrypted; use a trusted private LAN only, keep the web helper on localhost, and stop both programs after the demo.

The browser helper stages the selected file to a temporary file on the sending laptop before the LFTP connection begins. Its upload limit is 2 GiB. This uses temporary disk space but does not load the whole file into process memory. The direct CLI sender does not use this browser staging step.

## Requirements

- Node.js 20 or newer on both laptops (`node --version`)
- This repository copied or checked out on both laptops
- Both laptops on the same reachable private LAN; know the receiver laptop's LAN IPv4 address
- TCP port 9000 allowed by the receiver laptop's private-network firewall
- The repository's files intact; no npm install is required because the prototype uses Node built-ins

Find the receiver's LAN address using the operating system's network settings. Do not use `127.0.0.1` in the sender dashboard: that address means the sender laptop itself. The dashboard web port is for localhost UI only; the inter-laptop protocol uses TCP 9000.

## Start the receiver laptop

From the repository directory, run:

```sh
npm run demo -- --dir ./received --tcp-host 0.0.0.0 --tcp-port 9000 --web-port 8080
```

Open `http://127.0.0.1:8080` on that same laptop to show the receive-side event log. `0.0.0.0` lets the protocol listener accept connections on the laptop's network interfaces. The HTTP dashboard remains bound to localhost.

If the firewall asks, allow Node.js on the private network for this demonstration. Keep the network profile private and do not create a public Internet port-forward. Stop the process with Ctrl+C when finished.

## Start the sending laptop

Open another terminal in the repository and run:

```sh
npm run web -- --web-port 8080
```

Open `http://127.0.0.1:8080` on that same laptop. Enter the receiver laptop's LAN IPv4 address and TCP port `9000`. Choose a file and click **Start transfer**. You can use your own file or create an 8 MiB binary demo file with:

```sh
npm run make-demo-file
```

That creates `demo-files/lan-protocol-demo.bin`. The UI will animate each DATA/ACK exchange and report byte offsets. Watch both dashboards: the sender shows frames sent and acknowledgments received; the receiver shows chunks synced to disk and acknowledged.

When finished, the verified file is in the receiver's `./received` directory. The receiver refuses to overwrite a file with the same name. For another run, choose a different filename or stop the receiver and point `--dir` to a fresh folder.

## Demonstrate an interrupted transfer and resume

1. Start a transfer of a large file and wait until several chunks appear in the log.
2. Interrupt the sender helper with Ctrl+C in its terminal. The receiver retains its partial file and checkpoint. The browser may show a stopped/failed request.
3. Start the sender helper again if it stopped: `npm run web -- --web-port 8080`.
4. Choose the same unchanged source file, enter the same receiver address and port, and paste the displayed transfer ID into **Resume ID**. If the browser page still has the ID, it is filled in automatically.
5. Start again. The receiver's READY offset should be greater than zero when a checkpoint was saved. The receiver continues from that prefix and checks the final SHA-256 digest.

Do not change the source file between attempts: the transfer ID is bound to its name, size, and digest. If resume state has been deleted or the transfer ID is unknown, start a fresh transfer with a new ID.

## Protocol choices to point at during the demo

| Choice | What it means on screen / in code | Why it was chosen for this prototype | Trade-off or limitation |
|---|---|---|---|
| TCP with an application frame | OFFER, READY, DATA, ACK, FINISH and COMPLETE messages | TCP gives reliable ordered bytes during one connection; LFTP adds file/message meaning | It is a teaching protocol, not a replacement for TCP or a production file-transfer tool |
| 28-byte fixed header with magic/version/type/length/ID | Each frame has a visible boundary and type | A TCP stream does not preserve `write()` message boundaries | Header and parsing rules add work; only version 1 is implemented |
| 256 KiB DATA chunks, at most one outstanding | The UI animates a DATA then an ACK | Simple flow control and bounded application in-flight data make the state machine easy to inspect | Stop-and-wait may underuse a high-latency link; it is not claimed to be fast |
| Receiver-reported contiguous byte offset | READY and ACK show the next byte needed | On reconnect, the sender can skip the prefix already recorded | Only sequential prefix resume is supported; no parallel or out-of-order chunks |
| Sync partial data, save checkpoint, then ACK | Receiver log describes disk/checkpoint before ACK | An ACK can serve as a useful resume boundary after the process is restarted | Syncing each chunk may cost throughput; sudden power-loss durability is not guaranteed |
| Whole-file SHA-256 before publishing | VERIFY then COMPLETE; digest appears in sender output | Both peers can check that the final byte sequence matches the offered file | Digest detects mismatch; it does not authenticate the sender or encrypt traffic |
| Safe basename, private receive folder, no overwrite | Receiver rejects path-like names and collisions | Limits path mistakes and accidental replacement in a simple prototype | No configurable rename/overwrite policy or cross-platform filename study yet |
| Manual transfer ID reuse | Resume ID field reconnects the same logical transfer | Makes the distinction between a transfer and a TCP connection visible | User has to preserve the ID; automatic discovery/retention is not implemented |

## How to discuss established tools fairly

The project's goal is to learn protocol design and measure a narrow behavior, not to replace rsync, SCP, FTP, p2p-copy, or a commercial sharing tool. p2p-copy's cited study describes secure transfers with resume and other features; mature tools also offer capabilities outside this MVP. The project's intended comparison is specifically a minimal custom transfer against a simple one-shot TCP baseline on the same LAN and machines.

The chosen design may be easier for a student to inspect because its frames, offsets, acknowledgments, and state transitions are explicit in a small codebase. That is a learning advantage, not evidence of higher speed, stronger security, or greater reliability than established tools. We have not run the proposed controlled comparison. Do not say “better” or quote performance gains until a repeatable benchmark has been performed and reported with its setup and limitations.

## Troubleshooting

- **Connection refused / timeout:** confirm receiver is running, use its LAN address, confirm TCP port 9000 and private-network firewall settings.
- **Dashboard opens but transfer cannot connect:** the dashboard uses localhost HTTP while the protocol uses the receiver's LAN IP and TCP port; these are separate paths.
- **Destination already exists:** choose a different source filename or a fresh receive directory; overwriting is intentionally disabled.
- **Resume starts at zero:** wrong/new transfer ID, receiver state was removed, or no DATA had yet been acknowledged. Inspect the receiver's `.lftp-state` directory only for learning; don't edit it during the demo.
- **Browser reports an error after interruption:** expected for a broken connection. Keep the ID, restart the local helper, and retry with the same unchanged file.
- **No animation:** reload the dashboard to reconnect its event stream. The transfer can still use the protocol path even if the view is disconnected.

## Claims supported by the current local demo

Previous loopback runs transferred generated binary files of 700,000 and 1,200,000 bytes; source and destination SHA-256 digests matched. The interrupted run resumed from the previously acknowledged 65,536-byte prefix. Those were loopback demonstrations, not a two-laptop LAN measurement. This web UI's first two-laptop run must be recorded as a new demonstration; do not present it as completed before you run it.
