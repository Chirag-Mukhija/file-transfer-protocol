# Two-laptop setup and file-transfer guide

This guide walks through one transfer from a sending laptop to a receiving laptop. Both laptops need a copy of this repository and Node.js 20 or newer. The receiving laptop runs the LFTP/TCP receiver. The sending laptop runs a small localhost web helper; its dashboard lets you choose a file and watch the protocol messages.

> **Network safety:** This educational prototype has no login, authentication, or encryption. Use it only on a trusted private LAN. Do not expose the receiver or create a public Internet port-forward. The browser helper binds to localhost and should stay that way.

## What you need

- Two laptops connected to the same private Wi-Fi or wired LAN.
- Node.js 20 or newer installed on each laptop.
- A copy of this repository on each laptop.
- TCP port `9000` allowed by the receiving laptop's firewall for the private network.

The project has no third-party npm dependencies, so `npm install` is not required.

## Step 1: Get the code on both laptops

Run these commands on **each** laptop, in a terminal. If you already have the repository, open a terminal in its folder and run `git pull origin master` instead.

```sh
git clone https://github.com/Chirag-Mukhija/file-transfer-protocol.git
cd file-transfer-protocol
node --version
```

The Node version should be `v20` or newer. If `git clone` asks for credentials, complete the normal GitHub authentication for your account.

## Step 2: Find the receiving laptop's LAN address

On the **receiving laptop**, find its IPv4 address in the operating system's Wi-Fi/network settings. You can also use:

- Windows: `ipconfig`
- macOS or Linux: `ifconfig` or your network settings

Use the receiver's private LAN address, often shaped like `192.168.x.x` or `10.x.x.x`. Do **not** use `127.0.0.1` on the sending laptop; that address points back to the sending laptop itself.

## Step 3: Start the receiver

On the **receiving laptop**, from the repository directory, run:

```sh
npm run demo -- --dir ./received --tcp-host 0.0.0.0 --tcp-port 9000 --web-port 8080
```

Leave this terminal open during the transfer. The app starts the LFTP listener on TCP port 9000 and the local dashboard on port 8080. On that same receiver laptop, open:

```text
http://127.0.0.1:8080
```

This dashboard shows the receiver's view of offers, saved chunks, acknowledgments, verification, and completion. The receiver saves completed files in the `received` folder beside the repository.

If the operating system asks about the firewall, allow Node.js on the **private network** so the receiver can accept TCP connections on port 9000. Do not allow public network access or configure port forwarding.

## Step 4: Start the sender dashboard

On the **sending laptop**, open another terminal in the repository directory and run:

```sh
npm run web -- --web-port 8080
```

Leave this terminal open too. Open this URL on the sending laptop:

```text
http://127.0.0.1:8080
```

The dashboard is local to this laptop. The sending laptop and receiving laptop can both use port 8080 because they are separate machines. If port 8080 is already in use on one laptop, choose another web port, such as `8081`, and open that port in the browser on that same laptop.

## Step 5: Send a file

On the **sending laptop's** dashboard:

1. In **Receiver laptop IP**, enter the receiving laptop's LAN IPv4 address from Step 2.
2. Leave **TCP port** set to `9000`, unless you started the receiver with a different port.
3. Choose a file.
4. Click **Start transfer**.
5. Watch the sender dashboard show OFFER, READY, DATA chunks, ACKs, FINISH, and COMPLETE. Watch the receiver dashboard for the chunks being saved and verified.
6. When COMPLETE appears, check the receiver's `received` folder for the file.

The destination filename is the same as the source filename. The receiver never overwrites an existing destination. If that name already exists in `received`, choose a different filename or stop the receiver and start it again with a new output directory, for example `--dir ./received-2`.

The browser cannot open a raw TCP socket itself. It sends the selected file to the small helper running on localhost on the sending laptop. That helper then sends the file between laptops using LFTP over TCP. The helper temporarily stages the file on the sending laptop's disk; browser transfers are limited to 2 GiB. The transfer dashboard's packet motion is illustrative and is not a speed measurement.

## Optional: create a repeatable demo file

On either laptop, from the repository directory, run:

```sh
npm run make-demo-file
```

This creates an 8 MiB binary file at `demo-files/lan-protocol-demo.bin`. Choose it on the sender dashboard. The `demo-files` folder is ignored by Git.

## Resume after an interruption

1. Start a transfer and wait until the dashboards show at least one acknowledged chunk.
2. Interrupt the sending helper by pressing Ctrl+C in its terminal. A broken connection stops that attempt; the receiver keeps its saved prefix and transfer state.
3. Restart the sender helper on the sending laptop:

   ```sh
   npm run web -- --web-port 8080
   ```

4. Choose the **same unchanged source file** on the dashboard. Keep the receiver IP and TCP port the same.
5. Enter the transfer ID shown by the earlier attempt in **Resume ID**. Copy it before interrupting if you expect to reload or close the dashboard; the ID identifies the partial transfer.
6. Click **Start transfer** again. The receiver reports the saved offset in READY, and the sender continues from there.
7. Wait for the final SHA-256 verification and COMPLETE message.

The transfer ID is associated with the file name, size, and digest. If the source file changes, start a new transfer instead of reusing the old ID. The receiver's `.lftp-state` folder contains partial files and checkpoint metadata; do not edit it while the app is running.

## Step 6: Stop the applications

When finished, press Ctrl+C in each terminal. Keep the receiver and sender terminals separate: stopping the receiver ends incoming connections; stopping the sender helper ends its dashboard and any active send.

## Troubleshooting

| What you see | What to check |
|---|---|
| Dashboard does not open | Confirm the helper is running and use the correct local web port, such as `http://127.0.0.1:8080`. |
| “Connection refused” or the transfer cannot connect | Confirm the receiver is running, use its LAN IP (not `127.0.0.1`), and check private-network firewall access to TCP port 9000. |
| Dashboard opens but connection still fails | The dashboard uses localhost HTTP; the file protocol uses the receiver's LAN IP and TCP port. These are separate connections. |
| “Destination already exists” | The receiver intentionally refuses overwrite. Rename the source file or use a fresh receive directory. |
| Resume begins at byte zero | Confirm that you reused the same ID and unchanged source file, and that the receiver's `.lftp-state` data still exists. An interruption before the first acknowledged chunk has no saved bytes to resume. |
| Browser shows an error after interruption | Restart the sender helper, choose the same file, and retry with the same transfer ID. |

## What this demo demonstrates—and what it does not

It demonstrates the project's message sequence, bounded chunk transfer, receiver-reported resume offset, checkpoint-before-ACK behavior, final digest check, and no-overwrite destination rule. The selected design is small and inspectable for learning. It is not established to be faster, more secure, or more reliable than tools such as rsync or p2p-copy. No two-laptop performance comparison has been run; measure and report results before making performance claims.

For the design trade-offs and presentation talk track, see [demo setup and usage](docs/demo-setup-and-usage.md) and [presentation speech](docs/presentation-speech.md).
