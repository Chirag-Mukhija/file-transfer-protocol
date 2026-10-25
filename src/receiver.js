import net from 'node:net';
import path from 'node:path';
import { createHash, timingSafeEqual } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { mkdir, open, readFile, rename, stat, unlink, link } from 'node:fs/promises';
import {
  DATA_CHUNK_SIZE,
  ERROR_CODE,
  TYPE,
  decodeError,
  decodeOffer,
  decodeOffset,
  encodeError,
  encodeOffset,
  readFrames,
  writeFrame,
} from './protocol.js';

async function hashFile(filePath) {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(filePath)) hash.update(chunk);
  return hash.digest();
}

function safeBasename(name) {
  return name.length > 0 && name !== '.' && name !== '..' &&
    !name.includes('/') && !name.includes('\\') && !/[\u0000-\u001f\u007f]/u.test(name) &&
    path.basename(name) === name;
}

async function readState(statePath) {
  try {
    return JSON.parse(await readFile(statePath, 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
}

async function saveState(statePath, value) {
  const tempPath = `${statePath}.${process.pid}.${Date.now()}.tmp`;
  const handle = await open(tempPath, 'wx', 0o600);
  try {
    await handle.writeFile(`${JSON.stringify(value)}\n`, 'utf8');
    await handle.sync();
  } finally {
    await handle.close();
  }
  await rename(tempPath, statePath);
}

async function writeAt(handle, buffer, position) {
  let written = 0;
  while (written < buffer.length) {
    const result = await handle.write(buffer, written, buffer.length - written, position + written);
    if (result.bytesWritten === 0) throw new Error('Disk write made no progress');
    written += result.bytesWritten;
  }
}

async function reject(socket, transferId, code, message) {
  if (!socket.destroyed && socket.writable) {
    try {
      await writeFrame(socket, TYPE.ERROR, transferId, encodeError(code, message));
      socket.end();
    } catch {
      socket.destroy();
    }
  }
}

async function handleConnection(socket, receiveDir, onEvent = () => {}) {
  socket.setNoDelay(true);
  let transferId = Buffer.alloc(16);
  let iterator;
  let partialHandle;
  let partialPath;
  let statePath;
  let state;
  let expectedOffset = 0;

  try {
    iterator = readFrames(socket)[Symbol.asyncIterator]();
    const first = await iterator.next();
    if (first.done) return;
    if (first.value.type !== TYPE.OFFER) throw Object.assign(new Error('First message must be OFFER'), { code: ERROR_CODE.STATE_OR_OFFSET });
    transferId = first.value.transferId;
    const idHex = transferId.toString('hex');
    const offer = decodeOffer(first.value.payload);
    if (!safeBasename(offer.name)) throw Object.assign(new Error('Filename must be a safe basename'), { code: ERROR_CODE.METADATA });

    const stateDir = path.join(receiveDir, '.lftp-state');
    await mkdir(stateDir, { recursive: true });
    statePath = path.join(stateDir, `${idHex}.json`);
    partialPath = path.join(stateDir, `${idHex}.part`);
    const finalPath = path.join(receiveDir, offer.name);
    const signature = { transferId: idHex, name: offer.name, size: offer.size, digest: offer.digest.toString('hex') };
    onEvent({ direction: 'receive', phase: 'offer', transferId: idHex, name: offer.name, size: offer.size });
    state = await readState(statePath);

    if (state) {
      if (state.transferId !== signature.transferId || state.name !== signature.name || state.size !== signature.size || state.digest !== signature.digest) {
        throw Object.assign(new Error('Transfer ID is already associated with different file metadata'), { code: ERROR_CODE.METADATA });
      }
      if (state.completed) {
        const existing = await stat(finalPath).catch(() => null);
        if (!existing || existing.size !== offer.size || !timingSafeEqual(await hashFile(finalPath), offer.digest)) {
          throw Object.assign(new Error('Completed destination is missing or no longer matches'), { code: ERROR_CODE.UNAVAILABLE });
        }
        await writeFrame(socket, TYPE.COMPLETE, transferId, offer.digest);
        onEvent({ direction: 'receive', phase: 'complete', transferId: idHex, name: offer.name, size: offer.size, offset: offer.size });
        socket.end();
        return;
      }
    } else {
      const collision = await stat(finalPath).catch(() => null);
      if (collision) throw Object.assign(new Error('Destination already exists. The receiver does not overwrite files.'), { code: ERROR_CODE.METADATA });
      partialHandle = await open(partialPath, 'wx', 0o600);
      await partialHandle.sync();
      state = { ...signature, offset: 0, completed: false };
      await saveState(statePath, state);
    }

    if (!partialHandle) partialHandle = await open(partialPath, 'r+');
    const partialInfo = await partialHandle.stat();
    if (partialInfo.size < state.offset) {
      throw Object.assign(new Error('Saved partial file is shorter than its recorded checkpoint'), { code: ERROR_CODE.UNAVAILABLE });
    }
    if (partialInfo.size > state.offset) {
      await partialHandle.truncate(state.offset);
      await partialHandle.sync();
    }
    expectedOffset = state.offset;
    await writeFrame(socket, TYPE.READY, transferId, encodeOffset(expectedOffset));
    onEvent({ direction: 'receive', phase: 'ready', transferId: idHex, name: offer.name, size: offer.size, offset: expectedOffset });

    while (true) {
      const next = await iterator.next();
      if (next.done) return;
      const frame = next.value;
      if (!frame.transferId.equals(transferId)) throw Object.assign(new Error('Transfer ID changed within a connection'), { code: ERROR_CODE.STATE_OR_OFFSET });

      if (frame.type === TYPE.DATA) {
        if (frame.payload.length <= 8) throw Object.assign(new Error('DATA must include a positive number of file bytes'), { code: ERROR_CODE.STATE_OR_OFFSET });
        if (frame.payload.length > 8 + DATA_CHUNK_SIZE) throw Object.assign(new Error('DATA chunk exceeds the configured limit'), { code: ERROR_CODE.PROTOCOL });
        const offset = decodeOffset(frame.payload.subarray(0, 8));
        const fileBytes = frame.payload.subarray(8);
        if (offset !== expectedOffset) throw Object.assign(new Error(`Expected offset ${expectedOffset}, received ${offset}`), { code: ERROR_CODE.STATE_OR_OFFSET });
        if (fileBytes.length > offer.size - expectedOffset) throw Object.assign(new Error('DATA extends past the declared file size'), { code: ERROR_CODE.STATE_OR_OFFSET });

        await writeAt(partialHandle, fileBytes, expectedOffset);
        await partialHandle.sync();
        expectedOffset += fileBytes.length;
        state.offset = expectedOffset;
        await saveState(statePath, state);
        onEvent({ direction: 'receive', phase: 'chunk', transferId: idHex, name: offer.name, size: offer.size, offset: expectedOffset, bytes: fileBytes.length });
        await writeFrame(socket, TYPE.ACK, transferId, encodeOffset(expectedOffset));
        onEvent({ direction: 'receive', phase: 'ack-sent', transferId: idHex, name: offer.name, size: offer.size, offset: expectedOffset, bytes: fileBytes.length });
        continue;
      }

      if (frame.type === TYPE.FINISH) {
        if (frame.payload.length !== 0) throw Object.assign(new Error('FINISH payload must be empty'), { code: ERROR_CODE.PROTOCOL });
        if (expectedOffset !== offer.size) throw Object.assign(new Error('FINISH arrived before the complete file was received'), { code: ERROR_CODE.STATE_OR_OFFSET });

        await partialHandle.sync();
        const stagedSize = (await partialHandle.stat()).size;
        await partialHandle.close();
        partialHandle = null;
        if (stagedSize !== offer.size) throw Object.assign(new Error('Staged file length does not match OFFER'), { code: ERROR_CODE.DIGEST });
        onEvent({ direction: 'receive', phase: 'verify', transferId: idHex, name: offer.name, size: offer.size, offset: stagedSize });
        const actualDigest = await hashFile(partialPath);
        if (!timingSafeEqual(actualDigest, offer.digest)) {
          await unlink(partialPath).catch(() => {});
          await unlink(statePath).catch(() => {});
          throw Object.assign(new Error('SHA-256 does not match the sender file'), { code: ERROR_CODE.DIGEST });
        }

        try {
          await link(partialPath, finalPath);
        } catch (error) {
          if (error.code !== 'EEXIST') throw error;
          const existing = await stat(finalPath).catch(() => null);
          if (!existing || existing.size !== offer.size || !timingSafeEqual(await hashFile(finalPath), offer.digest)) {
            throw Object.assign(new Error('Destination already exists. The receiver does not overwrite files.'), { code: ERROR_CODE.METADATA });
          }
        }

        state.completed = true;
        state.offset = offer.size;
        await saveState(statePath, state);
        await unlink(partialPath).catch(() => {});
        await writeFrame(socket, TYPE.COMPLETE, transferId, actualDigest);
        onEvent({ direction: 'receive', phase: 'complete', transferId: idHex, name: offer.name, size: offer.size, offset: offer.size, digest: actualDigest.toString('hex') });
        socket.end();
        return;
      }

      if (frame.type === TYPE.ERROR) {
        const info = decodeError(frame.payload);
        throw new Error(`Sender reported error ${info.code}: ${info.message}`);
      }
      throw Object.assign(new Error(`Unexpected message ${frame.type} while receiving`), { code: ERROR_CODE.STATE_OR_OFFSET });
    }
  } catch (error) {
    const code = Number.isInteger(error.code) ? error.code : ERROR_CODE.STORAGE;
    console.error(`Transfer ${transferId.toString('hex')}: ${error.message}`);
    onEvent({ direction: 'receive', phase: 'error', transferId: transferId.toString('hex'), message: error.message });
    await reject(socket, transferId, code, error.message);
  } finally {
    if (partialHandle) await partialHandle.close().catch(() => {});
    if (!socket.destroyed && !socket.writableEnded) socket.end();
  }
}

export async function startReceiver({ host = '0.0.0.0', port = 9000, directory, onEvent }) {
  if (!directory) throw new Error('Receiver directory is required');
  const receiveDir = path.resolve(directory);
  await mkdir(receiveDir, { recursive: true });

  const server = net.createServer((socket) => {
    void handleConnection(socket, receiveDir, onEvent);
  });
  server.on('error', (error) => console.error(`Receiver error: ${error.message}`));
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, host, () => {
      server.off('error', reject);
      resolve();
    });
  });
  const address = server.address();
  console.log(`Receiver listening on ${host}:${address.port}`);
  console.log(`Saving verified files in ${receiveDir}`);
  console.log('Existing destination files are never overwritten.');
  return server;
}
