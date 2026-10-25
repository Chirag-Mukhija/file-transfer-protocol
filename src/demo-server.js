import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { createWriteStream } from 'node:fs';
import { mkdir, rm } from 'node:fs/promises';
import { Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { fileURLToPath } from 'node:url';
import { startReceiver } from './receiver.js';
import { sendFile } from './sender.js';

const MAX_BROWSER_UPLOAD = 2 * 1024 * 1024 * 1024;
const PUBLIC_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'public');
const LOCAL_HOSTS = new Set(['127.0.0.1', 'localhost', '::1']);

function safeName(value) {
  const name = value || 'transfer.bin';
  if (!name || name === '.' || name === '..' || name.includes('/') || name.includes('\\') || path.basename(name) !== name || /[\u0000-\u001f\u007f]/u.test(name)) throw new Error('Invalid filename');
  return name;
}

function json(response, status, value) {
  response.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
  response.end(JSON.stringify(value));
}

export async function startDemoServer({ directory = './received', tcpHost = '0.0.0.0', tcpPort = 9000, webHost = '127.0.0.1', webPort = 8080 }) {
  if (!LOCAL_HOSTS.has(webHost)) throw new Error('The demo web helper must bind to localhost only; keep webHost at 127.0.0.1');
  const events = [];
  const clients = new Set();
  const emit = (event) => {
    const item = { time: new Date().toISOString(), ...event };
    events.push(item);
    if (events.length > 120) events.shift();
    const line = `data: ${JSON.stringify(item)}\n\n`;
    for (const client of clients) client.write(line);
  };

  const receiver = tcpHost ? await startReceiver({ host: tcpHost, port: tcpPort, directory, onEvent: emit }) : null;
  const activeAddress = receiver?.address();
  const resolvedTcpPort = receiver ? (typeof activeAddress === 'object' ? activeAddress.port : tcpPort) : (tcpPort || 9000);

  const server = http.createServer(async (request, response) => {
    const url = new URL(request.url, 'http://localhost');
    if (request.method === 'GET' && url.pathname === '/') {
      try {
        const { readFile } = await import('node:fs/promises');
        response.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
        response.end(await readFile(path.join(PUBLIC_DIR, 'index.html')));
      } catch (error) { json(response, 500, { error: error.message }); }
      return;
    }
    if (request.method === 'GET' && url.pathname === '/api/config') {
      json(response, 200, { tcpPort: resolvedTcpPort, maxUpload: MAX_BROWSER_UPLOAD });
      return;
    }
    if (request.method === 'GET' && url.pathname === '/api/events') {
      response.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-cache', connection: 'keep-alive' });
      response.write(': connected\n\n');
      for (const event of events) response.write(`data: ${JSON.stringify(event)}\n\n`);
      clients.add(response);
      request.on('close', () => clients.delete(response));
      return;
    }
    if (request.method === 'POST' && url.pathname === '/api/send') {
      const host = url.searchParams.get('host');
      const port = Number(url.searchParams.get('port') || resolvedTcpPort);
      let name;
      try { name = safeName(url.searchParams.get('name')); }
      catch (error) { request.resume(); json(response, 400, { error: error.message }); return; }
      if (!host || !Number.isInteger(port) || port < 1 || port > 65535) {
        request.resume(); json(response, 400, { error: 'Provide a receiver address and valid TCP port.' }); return;
      }
      const tempPath = path.join(os.tmpdir(), `lftp-demo-${randomUUID()}.upload`);
      const id = url.searchParams.get('id') || undefined;
      let bytes = 0;
      const limiter = new Transform({
        transform(chunk, encoding, callback) {
          bytes += chunk.length;
          if (bytes > MAX_BROWSER_UPLOAD) callback(new Error('Browser handoff limit is 2 GiB'));
          else callback(null, chunk);
        },
      });
      try {
        await pipeline(request, limiter, createWriteStream(tempPath, { flags: 'wx', mode: 0o600 }));
        emit({ direction: 'send', phase: 'handoff-complete', name, size: bytes, message: 'Browser handed the file to the local sender helper.' });
        await sendFile({ host, port, file: tempPath, name, id, onEvent: emit, printResume: false });
        json(response, 200, { ok: true, name, size: bytes });
      } catch (error) {
        emit({ direction: 'send', phase: 'error', name, message: error.message });
        if (!response.headersSent) json(response, 502, { error: error.message });
        else response.end();
      } finally {
        await rm(tempPath, { force: true }).catch(() => {});
      }
      return;
    }
    request.resume();
    json(response, 404, { error: 'Not found' });
  });

  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(webPort, webHost, () => { server.off('error', reject); resolve(); });
  });
  const address = server.address();
  console.log(`Demo dashboard: http://${webHost}:${address.port}`);
  if (receiver) {
    console.log(`LFTP receiver: ${tcpHost}:${resolvedTcpPort}`);
    console.log(`Saving verified files in ${path.resolve(directory)}`);
  } else console.log('Sender-only localhost helper; it will connect to the receiver address entered in the dashboard.');
  console.log('The browser helper is localhost-only; file bytes travel to the other laptop over LFTP/TCP.');
  return { server, receiver };
}
