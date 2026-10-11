import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
const directory = mkdtempSync(resolve(tmpdir(), 'savings-browser-tests-'));
const java = process.env.JAVA_HOME ? resolve(process.env.JAVA_HOME, 'bin/java') : 'java';
const server = spawn(
  java,
  [
    '-jar',
    resolve('../backend/target/app-0.0.1-SNAPSHOT.jar'),
    '--server.port=8082',
    `--app.database.path=${resolve(directory, 'portfolio')}`
  ],
  { stdio: 'ignore' }
);
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.kill(signal));
server.on('error', () => {
  rmSync(directory, { recursive: true, force: true });
  process.exit(1);
});
server.on('exit', (code) => {
  rmSync(directory, { recursive: true, force: true });
  process.exit(code || 0);
});
