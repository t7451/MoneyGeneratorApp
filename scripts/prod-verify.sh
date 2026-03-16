#!/usr/bin/env bash
# Production Verification Script — MoneyGeneratorApp v1.3.1
# Usage:
#   API_URL=https://api.moneygenerator.app \
#   AUTH_ADMIN_TOKEN=xxx \
#   USER_EMAIL=user@example.com \
#   USER_PASS=secret \
#   bash scripts/prod-verify.sh
#
# All four env vars are optional with sensible fallbacks; the checks that
# depend on a missing value are automatically marked FAIL and skipped.

set -euo pipefail

API="${API_URL:-https://api.moneygenerator.app}"
ADMIN_TOKEN="${AUTH_ADMIN_TOKEN:-}"
USER_EMAIL="${USER_EMAIL:-}"
USER_PASS="${USER_PASS:-}"

PASS_COUNT=0
FAIL_COUNT=0
FAILURE_LIST=""

# ── helpers ──────────────────────────────────────────────────────────────────

_pass() {
  echo "  ✓ PASS  $1"
  PASS_COUNT=$((PASS_COUNT + 1))
}

_fail() {
  echo "  ✗ FAIL  $1 — $2"
  FAIL_COUNT=$((FAIL_COUNT + 1))
  FAILURE_LIST="${FAILURE_LIST}  - $1: $2\n"
}

# Check HTTP status code; call _pass or _fail appropriately.
check_status() {
  local label="$1" expected="$2" actual="$3"
  if [ "$actual" = "$expected" ]; then
    _pass "$label (HTTP $actual)"
  else
    _fail "$label" "expected HTTP $expected, got HTTP $actual"
  fi
}

# Extract a value from a JSON file.  Tries python3 first, then node.
json_field() {
  local file="$1" expr="$2"
  python3 -c "import json,sys; d=json.load(open('$file')); print($expr)" 2>/dev/null \
    || node -e "const d=require('$file');console.log($expr);" 2>/dev/null \
    || echo ""
}

TMPDIR="${TMPDIR:-/tmp}"

# ── banner ────────────────────────────────────────────────────────────────────

echo ""
echo "════════════════════════════════════════════════════════"
echo "  MoneyGeneratorApp  — Production Verification v1.3.1"
echo "  API endpoint : $API"
echo "════════════════════════════════════════════════════════"
echo ""

# ── [1/10] Health check ───────────────────────────────────────────────────────

echo "[1/10] Health check — GET /health"
HEALTH_STATUS=$(curl -s -o "$TMPDIR/mgapp_health.json" -w "%{http_code}" "$API/health")
check_status "GET /health" "200" "$HEALTH_STATUS"
if [ "$HEALTH_STATUS" = "200" ]; then
  if grep -q '"status":"ok"' "$TMPDIR/mgapp_health.json"; then
    _pass "Health body contains {\"status\":\"ok\"}"
  else
    _fail "Health body content" 'expected "status":"ok" in response body'
  fi
fi

# ── [2/10] Login ──────────────────────────────────────────────────────────────

echo ""
echo "[2/10] Login — POST /auth/login"
USER_TOKEN=""
if [ -z "$USER_EMAIL" ] || [ -z "$USER_PASS" ]; then
  _fail "POST /auth/login" "USER_EMAIL and/or USER_PASS not set; skipping login and dependent checks"
else
  LOGIN_STATUS=$(curl -s -o "$TMPDIR/mgapp_login.json" -w "%{http_code}" \
    -X POST "$API/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"${USER_EMAIL}\",\"password\":\"${USER_PASS}\"}")
  check_status "POST /auth/login" "200" "$LOGIN_STATUS"
  if [ "$LOGIN_STATUS" = "200" ]; then
    USER_TOKEN=$(json_field "$TMPDIR/mgapp_login.json" "d['data']['token']")
    if [ -n "$USER_TOKEN" ]; then
      _pass "Login token captured"
    else
      _fail "Login token extraction" "could not parse token from response (requires python3 or node)"
    fi
  fi
fi

# ── [3/10] Authenticated profile ─────────────────────────────────────────────

echo ""
echo "[3/10] Authenticated profile — GET /auth/me"
if [ -z "$USER_TOKEN" ]; then
  _fail "GET /auth/me" "no user token available (login failed or skipped)"
else
  ME_STATUS=$(curl -s -o "$TMPDIR/mgapp_me.json" -w "%{http_code}" \
    "$API/auth/me" \
    -H "Authorization: Bearer $USER_TOKEN")
  check_status "GET /auth/me" "200" "$ME_STATUS"
  if [ "$ME_STATUS" = "200" ]; then
    if grep -q '"success":true' "$TMPDIR/mgapp_me.json"; then
      _pass "Session confirmed — success:true in /auth/me"
    else
      _fail "GET /auth/me body" "expected success:true in response"
    fi
  fi
fi

# ── [4/10] Ops overview (admin) ───────────────────────────────────────────────

echo ""
echo "[4/10] Ops overview — GET /api/v2/ops/overview"
if [ -z "$ADMIN_TOKEN" ]; then
  _fail "GET /api/v2/ops/overview" "AUTH_ADMIN_TOKEN not set; skipping"
else
  OPS_STATUS=$(curl -s -o "$TMPDIR/mgapp_ops.json" -w "%{http_code}" \
    "$API/api/v2/ops/overview" \
    -H "Authorization: Bearer $ADMIN_TOKEN")
  check_status "GET /api/v2/ops/overview" "200" "$OPS_STATUS"
  if [ "$OPS_STATUS" = "401" ] || [ "$OPS_STATUS" = "403" ]; then
    _fail "Ops overview auth" \
      "HTTP $OPS_STATUS — verify AUTH_ADMIN_TOKEN has admin/operator/support role"
  fi
fi

# ── [5/10] Dashboard data ─────────────────────────────────────────────────────

echo ""
echo "[5/10] Dashboard data — GET /api/v1/dashboard"
# /api/v1/dashboard accepts ?userId and returns without requiring Bearer auth
DASH_STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
  "$API/api/v1/dashboard?userId=smoke-verify")
check_status "GET /api/v1/dashboard" "200" "$DASH_STATUS"

# ── [6/10] Reports data ───────────────────────────────────────────────────────

echo ""
echo "[6/10] Reports data — GET /api/v2/reporting/reports"
# Accepts Bearer token or x-user-id header; use whichever is available.
if [ -n "$USER_TOKEN" ]; then
  RPT_STATUS=$(curl -s -o "$TMPDIR/mgapp_reports.json" -w "%{http_code}" \
    "$API/api/v2/reporting/reports" \
    -H "Authorization: Bearer $USER_TOKEN")
else
  RPT_STATUS=$(curl -s -o "$TMPDIR/mgapp_reports.json" -w "%{http_code}" \
    "$API/api/v2/reporting/reports" \
    -H "x-user-id: smoke-verify")
fi
check_status "GET /api/v2/reporting/reports" "200" "$RPT_STATUS"

# ── [7/10] Jobs / gig platforms ───────────────────────────────────────────────

echo ""
echo "[7/10] Jobs/gig platforms — GET /api/v1/platforms"
PLAT_STATUS=$(curl -s -o "$TMPDIR/mgapp_platforms.json" -w "%{http_code}" \
  "$API/api/v1/platforms")
check_status "GET /api/v1/platforms" "200" "$PLAT_STATUS"

# Also probe /api/v1/jobs to confirm the aggregated job list endpoint is live.
JOBS_STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
  "$API/api/v1/jobs?userId=smoke-verify")
check_status "GET /api/v1/jobs" "200" "$JOBS_STATUS"

# ── [8/10] Storefront public endpoint ────────────────────────────────────────

echo ""
echo "[8/10] Storefront public — GET /catalog (unauthenticated)"
CAT_STATUS=$(curl -s -o "$TMPDIR/mgapp_catalog.json" -w "%{http_code}" \
  "$API/catalog")
check_status "GET /catalog" "200" "$CAT_STATUS"
if [ "$CAT_STATUS" = "200" ]; then
  if grep -q '"products"' "$TMPDIR/mgapp_catalog.json"; then
    _pass "Catalog body contains products array"
  else
    _fail "Catalog body" "expected products array in response"
  fi
fi

# ── [9/10] Webhook reachability ───────────────────────────────────────────────

echo ""
echo "[9/10] Webhook reachability (expect HTTP 400 signature error, NOT 404)"

_check_webhook() {
  local path="$1"
  local wh_status
  wh_status=$(curl -s -o /dev/null -w "%{http_code}" \
    -X POST "$API$path" \
    -H "Content-Type: application/json" \
    -d '{}')
  if [ "$wh_status" = "404" ]; then
    _fail "POST $path" "HTTP 404 — route not found (deployment issue?)"
  elif [ "$wh_status" = "400" ]; then
    _pass "POST $path (HTTP 400 — signature rejected, route reachable)"
  else
    # 200 (no signature required in non-prod) or other non-404 is acceptable
    _pass "POST $path (HTTP $wh_status — route reachable)"
  fi
}

_check_webhook "/webhooks/paypal"
_check_webhook "/webhooks/plaid"
_check_webhook "/api/connect/webhooks/accounts"
_check_webhook "/api/payments/webhook"

# ── [10/10] Invalid token → 401 ──────────────────────────────────────────────

echo ""
echo "[10/10] Token expiry simulation — GET /auth/me with an invalid token"
INVALID_STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
  "$API/auth/me" \
  -H "Authorization: Bearer this.is.a.deliberately.invalid.token")
check_status "Invalid token rejection" "401" "$INVALID_STATUS"

# ── Summary ───────────────────────────────────────────────────────────────────

echo ""
echo "════════════════════════════════════════════════════════"
echo "  Verification Summary"
echo "════════════════════════════════════════════════════════"
echo "  ✓ PASS : $PASS_COUNT"
echo "  ✗ FAIL : $FAIL_COUNT"

if [ "$FAIL_COUNT" -gt 0 ]; then
  echo ""
  echo "  Failures:"
  printf "%b" "$FAILURE_LIST"
  echo ""
  echo "  See PRODUCTION_OPERATIONS_RUNBOOK.md → Failure Triggers for escalation steps."
  echo ""
  exit 1
fi

echo ""
echo "  All checks passed. Production environment healthy."
echo ""
