export const VERSION = 1;
export const HEADER_SIZE = 28;
export const MAX_PAYLOAD_SIZE = 1024 * 1024;
export const DATA_CHUNK_SIZE = 256 * 1024;
export const MAGIC = Buffer.from('LFTP', 'ascii');

export const TYPE = Object.freeze({
  OFFER: 0x01,
  READY: 0x02,
  DATA: 0x03,
  ACK: 0x04,
  FINISH: 0x05,
  COMPLETE: 0x06,
  ERROR: 0x7f,
});

export const ERROR_CODE = Object.freeze({
  PROTOCOL: 1,
  STATE_OR_OFFSET: 2,
  METADATA: 3,
  STORAGE: 4,
  DIGEST: 5,
  UNAVAILABLE: 6,
});

export function encodeFrame(type, transferId, payload = Buffer.alloc(0)) {
  if (!Buffer.isBuffer(payload)) payload = Buffer.from(payload);
  if (payload.length > MAX_PAYLOAD_SIZE) {
    throw new Error(`Frame payload exceeds ${MAX_PAYLOAD_SIZE} bytes`);
  }
  if (!Buffer.isBuffer(transferId) || transferId.length !== 16) {
    throw new Error('Transfer ID must be exactly 16 bytes');
  }

  const header = Buffer.alloc(HEADER_SIZE);
  MAGIC.copy(header, 0);
  header.writeUInt8(VERSION, 4);
  header.writeUInt8(type, 5);
  header.writeUInt16BE(0, 6);
  header.writeUInt32BE(payload.length, 8);
  transferId.copy(header, 12);
  return payload.length === 0 ? header : Buffer.concat([header, payload]);
}

export async function* readFrames(socket) {
  let buffered = Buffer.alloc(0);
  const knownTypes = new Set(Object.values(TYPE));

  for await (const incoming of socket) {
    buffered = buffered.length === 0 ? incoming : Buffer.concat([buffered, incoming]);

    while (buffered.length >= HEADER_SIZE) {
      const header = buffered.subarray(0, HEADER_SIZE);
      if (!header.subarray(0, 4).equals(MAGIC)) throw new Error('Invalid frame magic');
      if (header.readUInt8(4) !== VERSION) throw new Error('Unsupported protocol version');
      if (header.readUInt16BE(6) !== 0) throw new Error('Unsupported frame flags');

      const type = header.readUInt8(5);
      if (!knownTypes.has(type)) throw new Error(`Unknown frame type 0x${type.toString(16)}`);
      const payloadLength = header.readUInt32BE(8);
      if (payloadLength > MAX_PAYLOAD_SIZE) throw new Error('Frame payload is too large');
      if (buffered.length < HEADER_SIZE + payloadLength) break;

      const transferId = Buffer.from(header.subarray(12, 28));
      const payload = Buffer.from(buffered.subarray(HEADER_SIZE, HEADER_SIZE + payloadLength));
      buffered = buffered.subarray(HEADER_SIZE + payloadLength);
      yield { type, transferId, payload };
    }
  }

  if (buffered.length !== 0) throw new Error('Connection ended in the middle of a frame');
}

export async function writeFrame(socket, type, transferId, payload = Buffer.alloc(0)) {
  const frame = encodeFrame(type, transferId, payload);
  if (!socket.write(frame)) {
    await new Promise((resolve, reject) => {
      const onDrain = () => { cleanup(); resolve(); };
      const onError = (error) => { cleanup(); reject(error); };
      const onClose = () => { cleanup(); reject(new Error('Connection closed while writing')); };
      const cleanup = () => {
        socket.off('drain', onDrain);
        socket.off('error', onError);
        socket.off('close', onClose);
      };
      socket.once('drain', onDrain);
      socket.once('error', onError);
      socket.once('close', onClose);
    });
  }
}

export function encodeOffset(offset) {
  if (!Number.isSafeInteger(offset) || offset < 0) throw new Error('Offset is outside the supported range');
  const payload = Buffer.alloc(8);
  payload.writeBigUInt64BE(BigInt(offset));
  return payload;
}

export function decodeOffset(payload) {
  if (payload.length !== 8) throw new Error('Offset message must contain exactly 8 bytes');
  const value = payload.readBigUInt64BE();
  if (value > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error('Offset is outside the supported range');
  return Number(value);
}

export function encodeOffer({ name, size, digest }) {
  const nameBytes = Buffer.from(name, 'utf8');
  if (nameBytes.length === 0 || nameBytes.length > 4096) throw new Error('Filename must be 1 to 4096 UTF-8 bytes');
  if (!Number.isSafeInteger(size) || size < 0) throw new Error('File size is outside the supported range');
  if (!Buffer.isBuffer(digest) || digest.length !== 32) throw new Error('SHA-256 digest must be 32 bytes');

  const payload = Buffer.alloc(2 + nameBytes.length + 8 + 32);
  payload.writeUInt16BE(nameBytes.length, 0);
  nameBytes.copy(payload, 2);
  payload.writeBigUInt64BE(BigInt(size), 2 + nameBytes.length);
  digest.copy(payload, 10 + nameBytes.length);
  return payload;
}

export function decodeOffer(payload) {
  if (payload.length < 42) throw new Error('OFFER payload is too short');
  const nameLength = payload.readUInt16BE(0);
  const expectedLength = 2 + nameLength + 8 + 32;
  if (nameLength === 0 || nameLength > 4096 || payload.length !== expectedLength) {
    throw new Error('OFFER payload has an invalid filename length');
  }
  const nameBytes = payload.subarray(2, 2 + nameLength);
  const name = new TextDecoder('utf-8', { fatal: true }).decode(nameBytes);
  const sizeBig = payload.readBigUInt64BE(2 + nameLength);
  if (sizeBig > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error('File size is outside the supported range');
  return {
    name,
    size: Number(sizeBig),
    digest: Buffer.from(payload.subarray(10 + nameLength, expectedLength)),
  };
}

export function encodeError(code, message) {
  const messageBytes = Buffer.from(String(message).slice(0, 500), 'utf8');
  const payload = Buffer.alloc(4 + messageBytes.length);
  payload.writeUInt16BE(code, 0);
  payload.writeUInt16BE(messageBytes.length, 2);
  messageBytes.copy(payload, 4);
  return payload;
}

export function decodeError(payload) {
  if (payload.length < 4) throw new Error('ERROR payload is too short');
  const messageLength = payload.readUInt16BE(2);
  if (payload.length !== 4 + messageLength) throw new Error('ERROR payload has an invalid message length');
  const message = new TextDecoder('utf-8', { fatal: true }).decode(payload.subarray(4));
  return { code: payload.readUInt16BE(0), message };
}

export function frameName(type) {
  return Object.entries(TYPE).find(([, value]) => value === type)?.[0] ?? `0x${type.toString(16)}`;
}
