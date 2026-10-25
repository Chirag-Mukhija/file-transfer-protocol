import path from 'node:path';
import { mkdir, open } from 'node:fs/promises';

const outputPath = path.resolve(process.argv[2] ?? 'demo-files/lan-protocol-demo.bin');
const size = Number(process.argv[3] ?? 8 * 1024 * 1024);
if (!Number.isSafeInteger(size) || size < 1 || size > 512 * 1024 * 1024) {
  throw new Error('Size must be a positive integer no larger than 512 MiB.');
}
await mkdir(path.dirname(outputPath), { recursive: true });
const handle = await open(outputPath, 'w');
try {
  const block = Buffer.alloc(64 * 1024);
  for (let i = 0; i < block.length; i += 1) block[i] = (i * 31 + 17) % 256;
  let position = 0;
  while (position < size) {
    const length = Math.min(block.length, size - position);
    const { bytesWritten } = await handle.write(block, 0, length, position);
    if (!bytesWritten) throw new Error('Could not write the demo file.');
    position += bytesWritten;
  }
} finally {
  await handle.close();
}
console.log(`Created ${outputPath} (${size} bytes)`);
