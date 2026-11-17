#!/bin/sh
# Forward localhost:4200/9595/3000 inside this container to the frontend, API
# and CMS containers, then run Playwright. Exit code is Playwright's.
set -e
node /e2e/forward.mjs &
FWD=$!
# wait until the forwarder listens
for i in $(seq 1 50); do
  if node -e "require('net').connect(9595,'127.0.0.1').on('connect',()=>process.exit(0)).on('error',()=>process.exit(1))"; then break; fi
  sleep 0.1
done
set +e
npx playwright test "$@"
CODE=$?
kill $FWD 2>/dev/null
exit $CODE
