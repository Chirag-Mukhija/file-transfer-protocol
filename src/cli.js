import { startReceiver } from './receiver.js';
import { sendFile } from './sender.js';
import { startDemoServer } from './demo-server.js';

function parseOptions(args) {
  const options = {};
  const positional = [];
  for (let index = 0; index < args.length; index += 1) {
    const value = args[index];
    if (value === '--help' || value === '-h') options.help = true;
    else if (value.startsWith('--')) {
      const name = value.slice(2);
      if (!['host', 'port', 'dir', 'id', 'tcp-host', 'tcp-port', 'web-host', 'web-port'].includes(name)) throw new Error(`Unknown option: ${value}`);
      const optionValue = args[index + 1];
      if (!optionValue || optionValue.startsWith('--')) throw new Error(`Expected a value after ${value}`);
      options[name] = optionValue;
      index += 1;
    } else positional.push(value);
  }
  return { options, positional };
}

function parsePort(value) {
  const port = Number(value);
  if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error('--port must be an integer from 0 to 65535');
  return port;
}

function usage() {
  console.log(`Usage:
  npm run receive -- --dir ./received [--host 0.0.0.0] [--port 9000]
  npm run send -- --host <receiver-ip> [--port 9000] [--id <32-hex-id>] <file>
  npm run demo -- [--dir ./received] [--tcp-host 0.0.0.0] [--tcp-port 9000] [--web-port 8080]
  npm run web -- [--web-port 8080]`);
}

async function main() {
  const [command, ...args] = process.argv.slice(2);
  const { options, positional } = parseOptions(args);
  if (options.help) return usage();

  if (command === 'receive') {
    if (positional.length) throw new Error('receive does not accept positional arguments');
    const server = await startReceiver({ host: options.host ?? '0.0.0.0', port: parsePort(options.port ?? '9000'), directory: options.dir ?? './received' });
    const stop = () => server.close(() => process.exit(0));
    process.once('SIGINT', stop);
    process.once('SIGTERM', stop);
    return;
  }
  if (command === 'send') {
    if (positional.length !== 1) throw new Error('send requires exactly one source file');
    return sendFile({ host: options.host, port: parsePort(options.port ?? '9000'), file: positional[0], id: options.id });
  }
  if (command === 'demo' || command === 'web') {
    if (positional.length) throw new Error(`${command} does not accept positional arguments`);
    const webPort = parsePort(options['web-port'] ?? '8080');
    const { server, receiver } = await startDemoServer({
      directory: options.dir ?? './received',
      tcpHost: command === 'web' ? null : (options['tcp-host'] ?? '0.0.0.0'),
      tcpPort: parsePort(options['tcp-port'] ?? '9000'),
      webHost: options['web-host'] ?? '127.0.0.1',
      webPort,
    });
    const stop = () => {
      server.close();
      if (receiver) receiver.close(() => process.exit(0));
      else process.exit(0);
    };
    process.once('SIGINT', stop);
    process.once('SIGTERM', stop);
    return;
  }
  usage();
  throw new Error('Command must be receive or send');
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
