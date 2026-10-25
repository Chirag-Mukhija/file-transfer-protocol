import net from 'node:net';
import path from 'node:path';
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { open, stat } from 'node:fs/promises';
import {
  DATA_CHUNK_SIZE,
  ERROR_CODE,
  TYPE,
  decodeError,
  decodeOffset,
  encodeOffer,
  encodeOffset,
  readFrames,
  writeFrame,
} from './protocol.js';

async function hashFile(filePath) {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(filePath)) hash.update(chunk);
  return hash.digest();
}

function readTransferId(value) {
  if (!/^[0-9a-f]{32}$/iu.test(value)) throw new Error('--id must be exactly 32 hexadecimal characters');
  return Buffer.from(value, 'hex');
}

async function nextFrame(iterator, expectedType) {
  const next = await iterator.next();
  if (next.done) throw new Error(`Connection closed before ${expectedType}`);
  const frame = next.value;
  if (frame.type === TYPE.ERROR) {
    const error = decodeError(frame.payload);
    throw Object.assign(new Error(`Receiver error ${error.code}: ${error.message}`), { remoteCode: error.code });
  }
  if (frame.type !== expectedType) throw new Error(`Expected ${expectedType}, received message type ${frame.type}`);
  return frame;
}

export async function sendFile({ host, port = 9000, file, id, name: offeredName, onEvent = () => {}, printResume = true }) {
  if (!host) throw new Error('Receiver host is required');
  if (!file) throw new Error('Source file is required');
  const filePath = path.resolve(file);
  const info = await stat(filePath);
  if (!info.isFile()) throw new Error('Source path must be a regular file');
  if (!Number.isSafeInteger(info.size)) throw new Error('Source file is too large for this prototype');

  const name = offeredName ?? path.basename(filePath);
  if (typeof name !== 'string' || !name || name === '.' || name === '..' || name.includes('/') || name.includes('\\')) {
    throw new Error('Transfer name must be a plain filename');
  }
  const digest = await hashFile(filePath);
  const transferId = id ? readTransferId(id) : randomBytes(16);
  const idHex = transferId.toString('hex');
  console.log(`Transfer ID: ${idHex}`);
  if (printResume) console.log(`If interrupted, resume with: npm run send -- --host ${host} --port ${port} --id ${idHex} "${filePath}"`);

  const socket = net.createConnection({ host, port });
  socket.setNoDelay(true);
  await new Promise((resolve, reject) => {
    socket.once('connect', resolve);
    socket.once('error', reject);
  });

  const iterator = readFrames(socket)[Symbol.asyncIterator]();
  try {
    await writeFrame(socket, TYPE.OFFER, transferId, encodeOffer({ name, size: info.size, digest }));
    onEvent({ direction: 'send', phase: 'offer', transferId: idHex, name, size: info.size });
    const ready = await nextFrame(iterator, TYPE.READY);
    if (!ready.transferId.equals(transferId)) throw new Error('Receiver replied with a different transfer ID');
    let offset = decodeOffset(ready.payload);
    if (offset > info.size) throw new Error('Receiver resume offset exceeds source file size');
    console.log(`Receiver is ready at byte ${offset} of ${info.size}`);
    onEvent({ direction: 'send', phase: 'ready', transferId: idHex, name, size: info.size, offset });

    const handle = await open(filePath, 'r');
    try {
      const buffer = Buffer.alloc(DATA_CHUNK_SIZE);
      while (offset < info.size) {
        const wanted = Math.min(buffer.length, info.size - offset);
        const { bytesRead } = await handle.read(buffer, 0, wanted, offset);
        if (bytesRead === 0) throw new Error('Source file became shorter during transfer');
        const payload = Buffer.concat([encodeOffset(offset), buffer.subarray(0, bytesRead)]);
        await writeFrame(socket, TYPE.DATA, transferId, payload);
        onEvent({ direction: 'send', phase: 'chunk-sent', transferId: idHex, name, size: info.size, offset, bytes: bytesRead });
        const ack = await nextFrame(iterator, TYPE.ACK);
        if (!ack.transferId.equals(transferId)) throw new Error('ACK has a different transfer ID');
        const nextOffset = decodeOffset(ack.payload);
        if (nextOffset !== offset + bytesRead) throw new Error(`Invalid ACK offset ${nextOffset}`);
        offset = nextOffset;
        onEvent({ direction: 'send', phase: 'ack', transferId: idHex, name, size: info.size, offset, bytes: bytesRead });
      }
    } finally {
      await handle.close();
    }

    await writeFrame(socket, TYPE.FINISH, transferId);
    onEvent({ direction: 'send', phase: 'finish', transferId: idHex, name, size: info.size, offset: info.size });
    const complete = await nextFrame(iterator, TYPE.COMPLETE);
    if (!complete.transferId.equals(transferId) || complete.payload.length !== 32 || !timingSafeEqual(complete.payload, digest)) {
      throw Object.assign(new Error('COMPLETE digest or transfer ID does not match source'), { code: ERROR_CODE.DIGEST });
    }
    console.log(`Transfer complete: ${name} (${info.size} bytes, SHA-256 ${digest.toString('hex')})`);
    onEvent({ direction: 'send', phase: 'complete', transferId: idHex, name, size: info.size, offset: info.size, digest: digest.toString('hex') });
  } catch (error) {
    onEvent({ direction: 'send', phase: 'error', transferId: idHex, name, size: info.size, message: error.message });
    throw error;
  } finally {
    socket.end();
  }
}
