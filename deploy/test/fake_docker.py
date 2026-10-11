#!/usr/bin/env python3
"""Stateful Docker boundary fake; production scripts are exercised unchanged."""
import json
import os
import re
import shutil
import sys
from pathlib import Path

root = Path(os.environ["FAKE_DOCKER_ROOT"])
state_file = root / "state.json"
state = json.loads(state_file.read_text())
args = sys.argv[1:]
state["calls"].append(args)
OLD = "sha256:" + "a" * 64
NEW = "sha256:" + "b" * 64
result = 0
output = ""

if args[0] == "compose":
    if args[1] == "version":
        output = state.get("version", "2.39.0")
    else:
        command_index = 1
        files = []
        while args[command_index] in ("-p", "-f"):
            if args[command_index] == "-f":
                files.append(Path(args[command_index + 1]))
            command_index += 2
        command = args[command_index]
        if command == "ps":
            output = state["current"] if state["running"] else ""
        elif command == "stop":
            state["running"] = False
        elif command == "up":
            image = re.search(r'image: "(.*)"', files[-1].read_text()).group(1)
            state["current"] = "old" if image == OLD else "new"
            state["running"] = not (
                (state.get("failure") == "up" and state["current"] == "new")
                or (state.get("failure") == "rollback" and state["current"] == "old")
            )
            result = 0 if state["running"] else 1
        else:
            raise AssertionError(args)
elif args[0] == "inspect":
    fmt, container = args[2], args[3]
    if fmt == "{{.State.Running}}":
        output = str(state["running"]).lower()
    elif fmt == "{{.Image}}":
        output = OLD if container == "old" else NEW
        if state.get("failure") == "wrong_image" and container == "new":
            output = OLD
    elif ".Config.Env" in fmt:
        output = "APP_DATABASE_FILE=" + state.get("database", "/app/data/investment-entries.json")
    elif ".Mounts" in fmt:
        output = "" if state.get("failure") == "ephemeral" else "/app/data"
    elif ".State.Health" in fmt:
        output = {"health": "unhealthy", "rollback": "unhealthy", "missing_health": "missing"}.get(state.get("failure"), "healthy")
    else:
        raise AssertionError(args)
elif args[0] == "login":
    token = sys.stdin.read().strip()
    assert token == "ephemeral-test-token"
    state["registry_config"] = os.environ["DOCKER_CONFIG"]
    (Path(state["registry_config"]) / "config.json").write_text("temporary credential")
elif args[0] == "pull":
    result = 1 if state.get("failure") == "pull" else 0
elif args[:2] == ["image", "inspect"]:
    output = NEW
elif args[0] == "cp":
    assert not state["running"], "Snapshot must be taken with the writer stopped"
    if state.get("failure") == "backup":
        result = 1
    else:
        shutil.copyfile(root / "database.json", args[-1])
else:
    raise AssertionError(args)

state_file.write_text(json.dumps(state))
print(output)
sys.exit(result)
