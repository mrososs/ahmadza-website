#!/usr/bin/env python3
"""check_adrs.py DIR — validate numbering, status, and supersession links."""
import pathlib
import re
import sys

ALLOWED = ("proposed", "accepted", "rejected", "deprecated", "superseded", "superceded")
files = sorted(pathlib.Path(sys.argv[1]).glob("[0-9][0-9][0-9][0-9]-*.md"))
numbers = {int(file.name[:4]) for file in files}
problems = [] if files else [f"no records found in {sys.argv[1]}"]

for position, file in enumerate(files, start=1):
    number, text = int(file.name[:4]), file.read_text(encoding="utf-8")
    if number != position:
        problems.append(f"{file.name}: expected {position:04d} (gap or duplicate)")
    found = re.search(r'^status:\s*"?(.+?)"?\s*$', text, re.M) or re.search(
        r"^## Status\s+(.+?)\s*$", text, re.M
    )
    status = found.group(1).lower() if found else ""
    if not status.startswith(ALLOWED):
        problems.append(f"{file.name}: status is {status or 'missing'!r}")
    if status.startswith(("superseded", "superceded")):
        targets = {int(value) for value in re.findall(r"\d{4}", status)}
        if not any(target in numbers and target > number for target in targets):
            problems.append(
                f"{file.name}: superseded, but the newer record is not named or does not exist"
            )

print("\n".join(problems) or f"{len(files)} records, no problems")
sys.exit(1 if problems else 0)
