const baseUrl = process.env.SMOKE_BASE_URL || 'http://localhost:4000';
const operatorHeaders = process.env.SMOKE_OPERATOR_TOKEN
  ? { Authorization: `Bearer ${process.env.SMOKE_OPERATOR_TOKEN}` }
  : null;

async function checkJson(path, init) {
  const response = await fetch(`${baseUrl}${path}`, init);
  let body = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }

  return {
    ok: response.ok,
    status: response.status,
    body,
  };
}

async function main() {
  const checks = [];

  checks.push(['health', await checkJson('/health')]);
  checks.push(['catalog', await checkJson('/catalog')]);
  if (operatorHeaders) {
    checks.push(['ops overview', await checkJson('/api/v2/ops/overview', {
      headers: operatorHeaders,
    })]);
  }
  checks.push(['asset upload reservation', await checkJson('/api/v2/assets/upload-url', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      userId: 'smoke-user',
      purpose: 'receipt',
      filename: 'smoke-receipt.jpg',
      contentType: 'image/jpeg',
    }),
  })]);

  const failures = checks.filter(([, result]) => !result.ok);

  for (const [name, result] of checks) {
    console.log(JSON.stringify({ name, status: result.status, ok: result.ok, body: result.body }));
  }

  if (failures.length > 0) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});