@echo off
REM Production Verification Script — MoneyGeneratorApp v1.3.1 (Windows)
REM
REM Usage (set variables before running, or pass inline):
REM   set API_URL=https://api.moneygenerator.app
REM   set AUTH_ADMIN_TOKEN=xxx
REM   set USER_EMAIL=user@example.com
REM   set USER_PASS=secret
REM   do-verify.bat
REM
REM Requires: curl (Windows 10+), PowerShell (for JSON token extraction)

SETLOCAL ENABLEDELAYEDEXPANSION

if not defined API_URL set API_URL=https://api.moneygenerator.app
set API=%API_URL%
set PASS_COUNT=0
set FAIL_COUNT=0

echo.
echo ========================================================
echo   MoneyGeneratorApp -- Production Verification v1.3.1
echo   API endpoint : %API%
echo ========================================================
echo.

REM ─────────────────────────────────────────────────────────────────────────────
REM Helper macros (using CALL :func pattern)
REM ─────────────────────────────────────────────────────────────────────────────

goto :main

:_pass
  echo   ^> PASS  %~1
  set /a PASS_COUNT+=1
  goto :eof

:_fail
  echo   X FAIL  %~1 -- %~2
  set /a FAIL_COUNT+=1
  goto :eof

:check_status
  REM %1=label  %2=expected  %3=actual
  if "%~3"=="%~2" (
    call :_pass "%~1 (HTTP %~3)"
  ) else (
    call :_fail "%~1" "expected HTTP %~2, got HTTP %~3"
  )
  goto :eof

:check_webhook
  REM %1=path  — expects 400 or any non-404
  set WH_PATH=%~1
  set WH_TMPFILE=%TEMP%\mgapp_wh.txt
  for /f "delims=" %%i in ('curl -s -o nul -w "%%{http_code}" -X POST "%API%%WH_PATH%" -H "Content-Type: application/json" -d "{}" 2^>^&1') do set WH_STATUS=%%i
  if "!WH_STATUS!"=="404" (
    call :_fail "POST %WH_PATH%" "HTTP 404 -- route not found (deployment issue?)"
  ) else if "!WH_STATUS!"=="400" (
    call :_pass "POST %WH_PATH% (HTTP 400 -- signature rejected, route reachable)"
  ) else (
    call :_pass "POST %WH_PATH% (HTTP !WH_STATUS! -- route reachable)"
  )
  goto :eof

:main

REM ── [1/10] Health check ──────────────────────────────────────────────────────
echo [1/10] Health check -- GET /health
set HEALTH_TMP=%TEMP%\mgapp_health.json
for /f "delims=" %%i in ('curl -s -o "%HEALTH_TMP%" -w "%%{http_code}" "%API%/health" 2^>^&1') do set HEALTH_STATUS=%%i
call :check_status "GET /health" "200" "!HEALTH_STATUS!"
if "!HEALTH_STATUS!"=="200" (
  findstr /c:"\"status\":\"ok\"" "%HEALTH_TMP%" >nul 2>&1
  if !ERRORLEVEL!==0 (
    call :_pass "Health body contains {\"status\":\"ok\"}"
  ) else (
    call :_fail "Health body content" "expected \"status\":\"ok\" in response"
  )
)

REM ── [2/10] Login ─────────────────────────────────────────────────────────────
echo.
echo [2/10] Login -- POST /auth/login
set USER_TOKEN=
if not defined USER_EMAIL (
  call :_fail "POST /auth/login" "USER_EMAIL not set; skipping login and dependent checks"
  goto :skip_login
)
if not defined USER_PASS (
  call :_fail "POST /auth/login" "USER_PASS not set; skipping login and dependent checks"
  goto :skip_login
)

set LOGIN_TMP=%TEMP%\mgapp_login.json
for /f "delims=" %%i in ('curl -s -o "%LOGIN_TMP%" -w "%%{http_code}" -X POST "%API%/auth/login" -H "Content-Type: application/json" -d "{\"email\":\"%USER_EMAIL%\",\"password\":\"%USER_PASS%\"}" 2^>^&1') do set LOGIN_STATUS=%%i
call :check_status "POST /auth/login" "200" "!LOGIN_STATUS!"
if "!LOGIN_STATUS!"=="200" (
  REM Extract token using inline PowerShell
  for /f "delims=" %%t in ('powershell -NoProfile -Command "try { (Get-Content '%LOGIN_TMP%' -Raw | ConvertFrom-Json).data.token } catch { '' }" 2^>nul') do set USER_TOKEN=%%t
  if defined USER_TOKEN (
    call :_pass "Login token captured"
  ) else (
    call :_fail "Login token extraction" "could not parse token from JSON response"
  )
)
:skip_login

REM ── [3/10] Authenticated profile ─────────────────────────────────────────────
echo.
echo [3/10] Authenticated profile -- GET /auth/me
if not defined USER_TOKEN (
  call :_fail "GET /auth/me" "no user token available (login failed or skipped)"
) else (
  set ME_TMP=%TEMP%\mgapp_me.json
  for /f "delims=" %%i in ('curl -s -o "%ME_TMP%" -w "%%{http_code}" "%API%/auth/me" -H "Authorization: Bearer !USER_TOKEN!" 2^>^&1') do set ME_STATUS=%%i
  call :check_status "GET /auth/me" "200" "!ME_STATUS!"
  if "!ME_STATUS!"=="200" (
    findstr /c:"\"success\":true" "%ME_TMP%" >nul 2>&1
    if !ERRORLEVEL!==0 (
      call :_pass "Session confirmed -- success:true in /auth/me"
    ) else (
      call :_fail "GET /auth/me body" "expected success:true in response"
    )
  )
)

REM ── [4/10] Ops overview (admin) ──────────────────────────────────────────────
echo.
echo [4/10] Ops overview -- GET /api/v2/ops/overview
if not defined AUTH_ADMIN_TOKEN (
  call :_fail "GET /api/v2/ops/overview" "AUTH_ADMIN_TOKEN not set; skipping"
) else (
  for /f "delims=" %%i in ('curl -s -o nul -w "%%{http_code}" "%API%/api/v2/ops/overview" -H "Authorization: Bearer %AUTH_ADMIN_TOKEN%" 2^>^&1') do set OPS_STATUS=%%i
  call :check_status "GET /api/v2/ops/overview" "200" "!OPS_STATUS!"
  if "!OPS_STATUS!"=="401" (
    call :_fail "Ops overview auth" "HTTP 401 -- verify AUTH_ADMIN_TOKEN is valid"
  )
  if "!OPS_STATUS!"=="403" (
    call :_fail "Ops overview auth" "HTTP 403 -- token present but lacks admin/operator/support role"
  )
)

REM ── [5/10] Dashboard data ────────────────────────────────────────────────────
echo.
echo [5/10] Dashboard data -- GET /api/v1/dashboard
for /f "delims=" %%i in ('curl -s -o nul -w "%%{http_code}" "%API%/api/v1/dashboard?userId=smoke-verify" 2^>^&1') do set DASH_STATUS=%%i
call :check_status "GET /api/v1/dashboard" "200" "!DASH_STATUS!"

REM ── [6/10] Reports data ──────────────────────────────────────────────────────
echo.
echo [6/10] Reports data -- GET /api/v2/reporting/reports
set RPT_TMP=%TEMP%\mgapp_reports.json
if defined USER_TOKEN (
  for /f "delims=" %%i in ('curl -s -o "%RPT_TMP%" -w "%%{http_code}" "%API%/api/v2/reporting/reports" -H "Authorization: Bearer !USER_TOKEN!" 2^>^&1') do set RPT_STATUS=%%i
) else (
  for /f "delims=" %%i in ('curl -s -o "%RPT_TMP%" -w "%%{http_code}" "%API%/api/v2/reporting/reports" -H "x-user-id: smoke-verify" 2^>^&1') do set RPT_STATUS=%%i
)
call :check_status "GET /api/v2/reporting/reports" "200" "!RPT_STATUS!"

REM ── [7/10] Jobs / gig platforms ──────────────────────────────────────────────
echo.
echo [7/10] Jobs/gig platforms -- GET /api/v1/platforms and GET /api/v1/jobs
for /f "delims=" %%i in ('curl -s -o nul -w "%%{http_code}" "%API%/api/v1/platforms" 2^>^&1') do set PLAT_STATUS=%%i
call :check_status "GET /api/v1/platforms" "200" "!PLAT_STATUS!"

for /f "delims=" %%i in ('curl -s -o nul -w "%%{http_code}" "%API%/api/v1/jobs?userId=smoke-verify" 2^>^&1') do set JOBS_STATUS=%%i
call :check_status "GET /api/v1/jobs" "200" "!JOBS_STATUS!"

REM ── [8/10] Storefront public (unauthenticated) ────────────────────────────────
echo.
echo [8/10] Storefront public -- GET /catalog (unauthenticated)
set CAT_TMP=%TEMP%\mgapp_catalog.json
for /f "delims=" %%i in ('curl -s -o "%CAT_TMP%" -w "%%{http_code}" "%API%/catalog" 2^>^&1') do set CAT_STATUS=%%i
call :check_status "GET /catalog" "200" "!CAT_STATUS!"
if "!CAT_STATUS!"=="200" (
  findstr /c:"\"products\"" "%CAT_TMP%" >nul 2>&1
  if !ERRORLEVEL!==0 (
    call :_pass "Catalog body contains products array"
  ) else (
    call :_fail "Catalog body" "expected products array in response"
  )
)

REM ── [9/10] Webhook reachability ──────────────────────────────────────────────
echo.
echo [9/10] Webhook reachability (expect HTTP 400 signature error, NOT 404)
call :check_webhook "/webhooks/paypal"
call :check_webhook "/webhooks/plaid"
call :check_webhook "/api/connect/webhooks/accounts"
call :check_webhook "/api/payments/webhook"

REM ── [10/10] Invalid token → 401 ──────────────────────────────────────────────
echo.
echo [10/10] Token expiry simulation -- GET /auth/me with an invalid token
for /f "delims=" %%i in ('curl -s -o nul -w "%%{http_code}" "%API%/auth/me" -H "Authorization: Bearer this.is.a.deliberately.invalid.token" 2^>^&1') do set INVALID_STATUS=%%i
call :check_status "Invalid token rejection" "401" "!INVALID_STATUS!"

REM ── Summary ───────────────────────────────────────────────────────────────────
echo.
echo ========================================================
echo   Verification Summary
echo ========================================================
echo   PASS : !PASS_COUNT!
echo   FAIL : !FAIL_COUNT!
echo.

if !FAIL_COUNT! GTR 0 (
  echo   One or more checks failed.
  echo   See PRODUCTION_OPERATIONS_RUNBOOK.md ^> Failure Triggers for escalation steps.
  echo.
  exit /b 1
)

echo   All checks passed. Production environment healthy.
echo.
ENDLOCAL
