#!/usr/bin/env bash
#
# Pre-launch smoke — one command, three gates, run before announcing.
#
#   ./scripts/pre-launch-smoke.sh
#   BASE_URL=https://staging.crossbook.app ./scripts/pre-launch-smoke.sh
#   SMOKE_EMAIL_TO=you@example.com ./scripts/pre-launch-smoke.sh
#
# Gates (abort on first failure, non-zero exit):
#   1. Healthcheck   — GET $BASE_URL/api/healthcheck must be 200 + status "ok"
#   2. Tests         — pnpm test (Vitest)
#   3. Resend        — pnpm tsx scripts/test-resend.ts (real connectivity send)
#
# Read-only against production: the healthcheck endpoint never spends Anthropic
# tokens and never writes data. This does NOT replace the manual launch-day
# checklist in docs/LAUNCH_DAY_CHECKLIST.md — run this first, then that.

set -euo pipefail

BASE_URL="${BASE_URL:-https://crossbook.app}"
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

bold() { printf '\033[1m%s\033[0m\n' "$1"; }
green() { printf '\033[32m%s\033[0m\n' "$1"; }
red() { printf '\033[31m%s\033[0m\n' "$1"; }

fail() {
  red "✗ FAILED: $1"
  red "Pre-launch smoke aborted. Fix the above before launching."
  exit 1
}

bold "==> Pre-launch smoke against ${BASE_URL}"
echo

# --- Gate 1: Healthcheck ----------------------------------------------------
bold "[1/3] Healthcheck — ${BASE_URL}/api/healthcheck"
HEALTH_RAW="$(curl -sS --max-time 15 -w $'\n%{http_code}' "${BASE_URL}/api/healthcheck" || true)"
HEALTH_CODE="$(printf '%s' "$HEALTH_RAW" | tail -n1)"
HEALTH_BODY="$(printf '%s' "$HEALTH_RAW" | sed '$d')"

if command -v jq >/dev/null 2>&1 && printf '%s' "$HEALTH_BODY" | jq . >/dev/null 2>&1; then
  printf '%s' "$HEALTH_BODY" | jq '{status, checks}'
else
  echo "$HEALTH_BODY"
fi

if [ "$HEALTH_CODE" != "200" ]; then
  fail "healthcheck returned HTTP ${HEALTH_CODE:-<none>} (expected 200)"
fi
case "$HEALTH_BODY" in
  *'"status":"ok"'*) green "✓ Healthcheck OK (200, status=ok)" ;;
  *) fail "healthcheck body is not status=ok" ;;
esac
echo

# --- Gate 2: Tests ----------------------------------------------------------
bold "[2/3] Unit tests — pnpm test"
pnpm test || fail "pnpm test failed"
green "✓ Tests passed"
echo

# --- Gate 3: Resend ---------------------------------------------------------
bold "[3/3] Resend connectivity — pnpm tsx scripts/test-resend.ts"
echo "(needs RESEND_API_KEY in .env.local; sends one test email)"
if [ -n "${SMOKE_EMAIL_TO:-}" ]; then
  pnpm tsx scripts/test-resend.ts "$SMOKE_EMAIL_TO" || fail "Resend connectivity test failed"
else
  pnpm tsx scripts/test-resend.ts || fail "Resend connectivity test failed"
fi
green "✓ Resend send succeeded"
echo

green "================================================="
green " ALL PRE-LAUNCH SMOKE CHECKS PASSED"
green "================================================="
echo "Next: run the manual checklist in docs/LAUNCH_DAY_CHECKLIST.md"
