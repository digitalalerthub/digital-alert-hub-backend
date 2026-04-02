const baseUrl = process.env.DEPLOYED_BACKEND_URL?.replace(/\/+$/, "");
const expectApiDocsEnabled = process.env.EXPECT_API_DOCS_ENABLED === "true";
const expectedRootText =
  process.env.EXPECT_ROOT_TEXT?.trim() || "API DigitalAlertHub activa";
const timeoutMs = Number(process.env.SMOKE_TIMEOUT_MS || 600000);
const intervalMs = Number(process.env.SMOKE_INTERVAL_MS || 10000);

if (!baseUrl) {
  console.error("Missing DEPLOYED_BACKEND_URL");
  process.exit(1);
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const fetchWithTimeout = async (url, options = {}) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        Accept: "application/json, text/plain;q=0.9, */*;q=0.8",
        ...(options.headers || {}),
      },
    });
  } finally {
    clearTimeout(timeout);
  }
};

const waitForHealth = async () => {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetchWithTimeout(`${baseUrl}/health`);

      if (response.ok) {
        const body = await response.json();

        if (body?.status === "ok") {
          console.log(`Health endpoint is ready at ${baseUrl}/health`);
          return;
        }
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown health-check error";
      console.log(`Health check still pending: ${message}`);
    }

    await sleep(intervalMs);
  }

  throw new Error(
    `Timed out waiting for ${baseUrl}/health after ${timeoutMs} ms`,
  );
};

const assertRootEndpoint = async () => {
  const response = await fetchWithTimeout(`${baseUrl}/`);
  const body = await response.text();

  if (!response.ok) {
    throw new Error(`Root endpoint failed with status ${response.status}`);
  }

  if (!body.includes(expectedRootText)) {
    throw new Error(
      `Root endpoint did not contain expected text: ${expectedRootText}`,
    );
  }

  console.log("Root endpoint returned the expected content");
};

const assertSecurityHeaders = async () => {
  const response = await fetchWithTimeout(`${baseUrl}/health`);

  if (!response.ok) {
    throw new Error(`Security header check failed with status ${response.status}`);
  }

  const expectHeader = (headerName, expectedValue) => {
    const currentValue = response.headers.get(headerName);

    if (!currentValue || !currentValue.includes(expectedValue)) {
      throw new Error(
        `Expected header ${headerName} to include "${expectedValue}", received "${currentValue}"`,
      );
    }
  };

  expectHeader("x-content-type-options", "nosniff");
  expectHeader("x-frame-options", "DENY");
  expectHeader("referrer-policy", "no-referrer");
  expectHeader("permissions-policy", "camera=()");
  expectHeader("content-security-policy", "default-src 'none'");
  expectHeader("server-timing", "app;dur=");
  expectHeader("x-response-time", "ms");

  console.log("Security and timing headers look correct");
};

const assertDocsEndpoint = async () => {
  const response = await fetchWithTimeout(`${baseUrl}/api/docs`, {
    redirect: "manual",
  });

  if (expectApiDocsEnabled) {
    if (!response.ok) {
      throw new Error(
        `Expected /api/docs to be enabled, received ${response.status}`,
      );
    }

    console.log("API docs endpoint is enabled as expected");
    return;
  }

  if (response.status !== 404) {
    throw new Error(
      `Expected /api/docs to be disabled in production, received ${response.status}`,
    );
  }

  console.log("API docs endpoint is disabled as expected");
};

const main = async () => {
  console.log(`Running smoke tests against ${baseUrl}`);
  await waitForHealth();
  await assertRootEndpoint();
  await assertSecurityHeaders();
  await assertDocsEndpoint();
  console.log("Smoke tests passed");
};

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exit(1);
});
