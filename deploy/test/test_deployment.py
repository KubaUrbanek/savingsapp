import json
import os
import shlex
import subprocess
import tempfile
import unittest
from pathlib import Path

DEPLOY = Path(__file__).resolve().parents[1]
IMAGE = "ghcr.io/kubaurbanek/savingsapp@sha256:" + "b" * 64
OLD = "sha256:" + "a" * 64


class QnapDeploymentTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix="savingsapp-deploy-test-")
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.compose_file = self.root / "compose.yml"
        self.compose_file.write_text("services:\n  savingsapp:\n    image: savingsapp:latest\n")
        self.database = self.root / "database.json"
        self.database.write_text('{"version":2,"entries":["existing savings"]}')
        self.state_file = self.root / "state.json"
        self.state_file.write_text(json.dumps({"current": "old", "running": True, "calls": []}))
        self.bin = self.root / "bin"
        self.bin.mkdir()
        docker = self.bin / "docker"
        docker.write_text((DEPLOY / "test" / "fake_docker.py").read_text())
        docker.chmod(0o700)
        sleep = self.bin / "sleep"
        sleep.write_text("#!/bin/sh\nexit 0\n")
        sleep.chmod(0o700)
        self.env = {
            **os.environ,
            "PATH": str(self.bin) + os.pathsep + os.environ["PATH"],
            "FAKE_DOCKER_ROOT": str(self.root),
            "REGISTRY_TOKEN": "ephemeral-test-token",
            "HEALTH_ATTEMPTS": "2",
        }

    def configure(self, **changes):
        state = self.state()
        state.update(changes)
        self.state_file.write_text(json.dumps(state))

    def state(self):
        return json.loads(self.state_file.read_text())

    def run_deploy(self, image=IMAGE, resource_file=""):
        result = subprocess.run(
            ["sh", str(DEPLOY / "qnap-deploy.sh"), image, str(self.compose_file), "existing-project", "savingsapp", "actor", "docker", resource_file],
            env=self.env, text=True, capture_output=True, timeout=15,
        )
        state = self.state()
        if "registry_config" in state:
            self.assertFalse(Path(state["registry_config"]).exists(), "Registry credentials must be deleted")
        self.assertNotIn("ephemeral-test-token", result.stdout + result.stderr)
        self.assertFalse((self.root / ".savingsapp-deploy" / "lock").exists())
        self.assertEqual(self.database.read_text(), '{"version":2,"entries":["existing savings"]}')
        return result

    def assert_old_running(self):
        self.assertEqual(self.state()["current"], "old")
        self.assertTrue(self.state()["running"])

    def test_success_pulls_before_stopping_and_backs_up_before_starting(self):
        result = self.run_deploy()
        self.assertEqual(result.returncode, 0, result.stderr)
        calls = self.state()["calls"]
        pull = next(i for i, c in enumerate(calls) if c[0] == "pull")
        stop = next(i for i, c in enumerate(calls) if "stop" in c)
        backup = next(i for i, c in enumerate(calls) if c[0] == "cp")
        up = next(i for i, c in enumerate(calls) if "up" in c)
        self.assertLess(pull, stop)
        self.assertLess(stop, backup)
        self.assertLess(backup, up)
        self.assertIn("--no-deps", calls[up])
        self.assertIn("never", calls[up])
        self.assertIn("existing-project", calls[up])
        backups = list((self.root / ".savingsapp-deploy").glob("backup.*/database.json"))
        self.assertEqual(len(backups), 1)
        self.assertEqual(backups[0].read_bytes(), self.database.read_bytes())
        self.assertIn(IMAGE, (self.root / ".savingsapp-deploy/override.yml").read_text())
        self.assertEqual(self.compose_file.read_text(), "services:\n  savingsapp:\n    image: savingsapp:latest\n")

    def test_preserves_qnap_resource_file_before_image_override(self):
        resource = self.root / "resource settings.yml"
        resource.write_text("services:\n  savingsapp:\n    mem_limit: 512m\n")
        result = self.run_deploy(resource_file=str(resource))
        self.assertEqual(result.returncode, 0, result.stderr)
        for call in self.state()["calls"]:
            if call[0] == "compose" and call[1] != "version":
                files = [call[index + 1] for index, value in enumerate(call) if value == "-f"]
                self.assertEqual(files[:2], [str(self.compose_file), str(resource)])
                if "up" in call:
                    self.assertEqual(files[2], str(self.root / ".savingsapp-deploy/override.yml"))

    def test_missing_or_relative_resource_file_leaves_service_running(self):
        for resource in (str(self.root / "missing.yml"), "relative.yml"):
            with self.subTest(resource=resource):
                result = self.run_deploy(resource_file=resource)
                self.assertNotEqual(result.returncode, 0)
                self.assert_old_running()
                self.assertEqual(self.state()["calls"], [])

    def test_preflight_failures_leave_the_existing_service_running(self):
        for config in ({"failure": "ephemeral"}, {"failure": "pull"}, {"database": "./data.json"}, {"database": "/app/data/../secret.json"}, {"version": "1.29.2"}):
            with self.subTest(config=config):
                self.configure(failure=None, database="/app/data/investment-entries.json", version="2.39.0", calls=[])
                self.configure(**config)
                result = self.run_deploy()
                self.assertNotEqual(result.returncode, 0)
                self.assert_old_running()
                self.assertFalse(any("stop" in c for c in self.state()["calls"]))

    def test_failures_after_stopping_restore_previous_image_and_fail_pipeline(self):
        for failure in ("backup", "up", "health", "missing_health", "wrong_image"):
            with self.subTest(failure=failure):
                self.configure(failure=failure, calls=[])
                result = self.run_deploy()
                self.assertNotEqual(result.returncode, 0)
                self.assert_old_running()
                self.assertIn(OLD, (self.root / ".savingsapp-deploy/override.yml").read_text())
                self.assertIn("restoring the previous image", result.stderr)

    def test_requires_an_existing_single_running_service(self):
        for current, running in (("", True), ("old\nsecond", True), ("old", False)):
            with self.subTest(current=current):
                self.configure(current=current, running=running, calls=[])
                result = self.run_deploy()
                self.assertNotEqual(result.returncode, 0)
                self.assertFalse(any(c[0] == "pull" for c in self.state()["calls"]))

    def test_rejects_mutable_tag(self):
        result = self.run_deploy("ghcr.io/kubaurbanek/savingsapp:latest")
        self.assertNotEqual(result.returncode, 0)
        self.assertEqual(self.state()["calls"], [])

    def test_rollback_failure_is_reported_and_keeps_backup(self):
        self.configure(failure="rollback")
        result = self.run_deploy()
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("ROLLBACK FAILED", result.stderr)
        backups = list((self.root / ".savingsapp-deploy").glob("backup.*/database.json"))
        self.assertEqual(len(backups), 1)
        self.assertEqual(backups[0].read_bytes(), self.database.read_bytes())

    def test_handled_termination_rolls_back_and_releases_credentials_and_lock(self):
        self.configure(failure="health")
        (self.bin / "sleep").write_text('#!/bin/sh\nkill -TERM "$PPID"\n')
        result = self.run_deploy()
        self.assertNotEqual(result.returncode, 0)
        self.assert_old_running()
        self.assertIn("restoring the previous image", result.stderr)

    def test_concurrent_deployment_cannot_take_lock_or_stop_service(self):
        lock = self.root / ".savingsapp-deploy/lock"
        lock.mkdir(parents=True)
        result = subprocess.run(
            ["sh", str(DEPLOY / "qnap-deploy.sh"), IMAGE, str(self.compose_file), "existing-project", "savingsapp", "actor"],
            env=self.env, text=True, capture_output=True, timeout=15,
        )
        self.assertNotEqual(result.returncode, 0)
        self.assertTrue(lock.exists(), "Must not release another deployment's lock")
        self.assert_old_running()


class SshBoundaryTest(unittest.TestCase):
    def test_strict_host_verification_secrets_cleanup_and_literal_remote_arguments(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            ssh = root / "ssh"
            ssh.write_text("""#!/usr/bin/env python3
import json, os, pathlib, sys
args = sys.argv[1:]
key = pathlib.Path(args[args.index('-i') + 1])
assert key.read_text().strip() == 'test-private-key'
assert key.stat().st_mode & 0o777 == 0o600
pathlib.Path(os.environ['SSH_CAPTURE']).write_text(json.dumps({'args': args, 'input': sys.stdin.read(), 'key': str(key)}))
""")
            ssh.chmod(0o700)
            dangerous_path = "/share/Container/path with spaces/$(touch should-never-exist)/compose.yml"
            env = {
                **os.environ, "PATH": str(root) + os.pathsep + os.environ["PATH"],
                "SSH_CAPTURE": str(root / "capture.json"), "QNAP_HOST": "nas.example.ts.net",
                "QNAP_SSH_USER": "deploy", "QNAP_COMPOSE_FILE": dangerous_path,
                "QNAP_COMPOSE_PROJECT": "savings", "QNAP_COMPOSE_SERVICE": "app",
                "QNAP_SSH_PRIVATE_KEY": "test-private-key", "QNAP_SSH_KNOWN_HOSTS": "verified-host-key",
                "IMAGE": IMAGE, "REGISTRY_USER": "actor", "REGISTRY_TOKEN": "ephemeral-test-token",
            }
            result = subprocess.run(["bash", str(DEPLOY / "connect-qnap.sh")], cwd=DEPLOY.parent, env=env, text=True, capture_output=True, timeout=15)
            self.assertEqual(result.returncode, 0, result.stderr)
            capture = json.loads((root / "capture.json").read_text())
            self.assertIn("StrictHostKeyChecking=yes", capture["args"])
            self.assertIn("BatchMode=yes", capture["args"])
            self.assertFalse(Path(capture["key"]).parent.exists())
            self.assertEqual(capture["input"], "ephemeral-test-token\n" + (DEPLOY / "qnap-deploy.sh").read_text())
            self.assertNotIn("ephemeral-test-token", " ".join(capture["args"]) + result.stdout + result.stderr)
            remote_args = shlex.split(capture["args"][-1].split("sh -s -- ", 1)[1])
            self.assertEqual(remote_args[1], dangerous_path)


if __name__ == "__main__":
    unittest.main()
