import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import { networkInterfaces } from 'node:os';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { get } from 'node:http';

const root = new URL('../', import.meta.url);

function request(hostname, port, path) {
  return new Promise((resolve, reject) => {
    const req = get({ hostname, port, path, timeout: 3000 }, (res) => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => resolve({ status: res.statusCode, body }));
      res.on('error', reject);
    });
    req.on('timeout', () => req.destroy(new Error('HTTP request timed out')));
    req.on('error', reject);
  });
}

test('documented local server does not expose Git metadata over a non-loopback interface', { timeout: 15000 }, async (t) => {
  const md = await readFile(new URL('README.md', root), 'utf8');
  const command = md.match(/^python3 -m http\.server \d+[^\n]*$/m)?.[0];
  assert.ok(command, 'README must supply the local server command');
  const address = Object.values(networkInterfaces()).flat()
    .find((entry) => entry.family === 'IPv4' && !entry.internal)?.address;
  assert.ok(address, 'reproduction requires a non-loopback IPv4 interface');
  const metadataPath = (await stat(new URL('.git', root))).isDirectory() ? '/.git/HEAD' : '/.git';
  const metadata = await readFile(new URL(`.${metadataPath}`, root), 'utf8');
  assert.ok(metadata.length > 0, 'checkout must contain Git metadata');

  // Let the OS choose a free port; preserve the documented binding options.
  const args = command.trim().split(/\s+/).slice(1);
  args[2] = '0';
  const server = spawn('python3', args, {
    cwd: root, env: { ...process.env, PYTHONUNBUFFERED: '1' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const closed = once(server, 'close');
  t.after(async () => { server.kill(); await closed; });
  let diagnostics = '';
  server.stderr.on('data', (chunk) => { diagnostics += chunk; });
  const port = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Server startup timed out: ${diagnostics}`)), 5000);
    let output = '';
    server.stdout.on('data', (chunk) => {
      output += chunk;
      const match = output.match(/Serving HTTP on .+ port (\d+)/);
      if (match) { clearTimeout(timer); resolve(Number(match[1])); }
    });
    server.once('error', (error) => { clearTimeout(timer); reject(error); });
    server.once('exit', () => { clearTimeout(timer); reject(new Error(`Server exited: ${diagnostics}`)); });
  });
  const local = await request('127.0.0.1', port, '/index.html');
  assert.equal(local.status, 200, 'documented server must actually serve the calculator');
  assert.equal(local.body, await readFile(new URL('index.html', root), 'utf8'));

  let remote;
  try {
    remote = await request(address, port, metadataPath);
  } catch (error) {
    if (error.code === 'ECONNREFUSED') return;
    throw error;
  }
  assert.equal(remote.status === 200 && remote.body === metadata, false,
    'Unauthenticated HTTP request to a non-loopback address retrieved checkout Git metadata');
});
