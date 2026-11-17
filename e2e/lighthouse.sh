#!/bin/sh
# Lighthouse (desktop and mobile) on every page of the web app; writes
# test-results/raw/lighthouse.json. Run by scripts/run-all-tests.sh.
set -e
node /e2e/forward.mjs > /tmp/forward.log 2>&1 &
FWD=$!
sleep 1
node /e2e/lighthouse.mjs
CODE=$?
kill $FWD 2>/dev/null
exit $CODE
