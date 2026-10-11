import json
import os
import shlex
import subprocess
import tempfile
import unittest
from pathlib import Path

DEPLOY = Path(__file__).resolve().parents[1]


class QnapInspectionTest(unittest.TestCase):
    def test_inspection_is_read_only_and_filters_environment_secrets(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            docker = root / 'docker'
            docker.write_text('''#!/usr/bin/env python3
import json, os, pathlib, sys
args = sys.argv[1:]
with pathlib.Path(os.environ['CALLS']).open('a') as file:
    file.write(json.dumps(args) + '\\n')
if args[0] == 'version':
    print('Docker server: 27.0.0')
elif args[:2] == ['compose', 'version']:
    print('Docker Compose version v2.29.0')
elif args[0] == 'port':
    print('8080/tcp -> 0.0.0.0:8090')
elif args[0] == 'inspect':
    fmt = args[2]
    if '.Config.Env' in fmt:
        print('API_SECRET=never-print-this-secret')
        print('APP_DATABASE_FILE=/app/data/investment-entries.json')
    elif '.Mounts' in fmt:
        print('volume savings-app /volume -> /app/data writable= true')
    elif fmt.startswith('{{index'):
        print(os.environ['PROJECT'])
    else:
        print('Running: true')
else:
    raise AssertionError('Mutating or unexpected command: ' + repr(args))
''')
            docker.chmod(0o700)
            for project in ('', '<no value>', 'savingsapp'):
                with self.subTest(project=project):
                    result = subprocess.run(
                        ['sh', str(DEPLOY / 'qnap-inspect.sh'), 'savingsapp-1', str(docker)],
                        env={**os.environ, 'PROJECT': project, 'CALLS': str(root / 'calls')},
                        text=True, capture_output=True, timeout=10,
                    )
                    self.assertEqual(result.returncode, 0 if project == 'savingsapp' else 1, result.stderr)
                    self.assertIn('APP_DATABASE_FILE=/app/data/investment-entries.json', result.stdout)
                    self.assertIn('8090', result.stdout)
                    self.assertNotIn('never-print-this-secret', result.stdout + result.stderr)
                    if not project or project == '<no value>':
                        self.assertIn('standalone container', result.stdout)

    def test_inspection_ssh_does_not_require_registry_or_compose_settings(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            ssh = root / 'ssh'
            ssh.write_text('''#!/usr/bin/env python3
import json, os, pathlib, sys
args = sys.argv[1:]
key = pathlib.Path(args[args.index('-i') + 1])
assert key.stat().st_mode & 0o777 == 0o600
pathlib.Path(os.environ['CAPTURE']).write_text(json.dumps({'args': args, 'stdin': sys.stdin.read(), 'key': str(key)}))
''')
            ssh.chmod(0o700)
            env = {key: value for key, value in os.environ.items()
                   if not key.startswith(('QNAP_', 'REGISTRY_')) and key != 'IMAGE'}
            env.update({
                'PATH': str(root) + os.pathsep + env['PATH'],
                'CAPTURE': str(root / 'capture'),
                'QNAP_OPERATION': 'inspect', 'QNAP_CONTAINER': 'savingsapp-1',
                'QNAP_HOST': 'qnap.tail6b5d67.ts.net', 'QNAP_SSH_USER': 'urbanekj',
                'QNAP_SSH_PRIVATE_KEY': 'test-key', 'QNAP_SSH_KNOWN_HOSTS': 'test-host',
                'QNAP_DOCKER_BIN': '/path with spaces/docker',
            })
            result = subprocess.run(['bash', str(DEPLOY / 'connect-qnap.sh')],
                                    cwd=DEPLOY.parent, env=env, text=True, capture_output=True, timeout=10)
            self.assertEqual(result.returncode, 0, result.stderr)
            capture = json.loads((root / 'capture').read_text())
            self.assertEqual(capture['stdin'], (DEPLOY / 'qnap-inspect.sh').read_text())
            self.assertEqual(shlex.split(capture['args'][-1]),
                             ['sh', '-s', '--', 'savingsapp-1', '/path with spaces/docker'])
            self.assertIn('StrictHostKeyChecking=yes', capture['args'])
            self.assertIn('BatchMode=yes', capture['args'])
            self.assertFalse(Path(capture['key']).parent.exists())


if __name__ == '__main__':
    unittest.main()
