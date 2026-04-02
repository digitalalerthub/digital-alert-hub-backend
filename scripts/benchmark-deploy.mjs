const baseUrl = process.env.DEPLOYED_BACKEND_URL?.replace(/\/+$/, "");
const samples = Number(process.env.PERF_SAMPLES || 20);
const p95ThresholdMs = Number(process.env.PERF_P95_THRESHOLD_MS || 800);
const meanThresholdMs = Number(process.env.PERF_MEAN_THRESHOLD_MS || 400);
const endpointList = (process.env.PERF_ENDPOINTS || "/health,/")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);

if (!baseUrl) {
  console.error("Missing DEPLOYED_BACKEND_URL");
  process.exit(1);
}

if (!Number.isInteger(samples) || samples <= 0) {
  console.error("PERF_SAMPLES must be a positive integer");
  process.exit(1);
}

const fetchOnce = async (path) => {
  const startedAt = performance.now();
  const response = await fetch(`${baseUrl}${path}`, {
    headers: {
      Accept: "application/json, text/plain;q=0.9, */*;q=0.8",
    },
  });
  const durationMs = performance.now() - startedAt;

  if (!response.ok) {
    throw new Error(`${path} responded with status ${response.status}`);
  }

  await response.text();
  return durationMs;
};

const percentile = (values, ratio) => {
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(
    sorted.length - 1,
    Math.max(0, Math.ceil(sorted.length * ratio) - 1),
  );
  return sorted[index];
};

const average = (values) =>
  values.reduce((total, value) => total + value, 0) / values.length;

const benchmarkEndpoint = async (path) => {
  const durations = [];

  for (let index = 0; index < samples; index += 1) {
    durations.push(await fetchOnce(path));
  }

  const meanMs = average(durations);
  const p95Ms = percentile(durations, 0.95);

  console.log(
    `${path} mean=${meanMs.toFixed(1)}ms p95=${p95Ms.toFixed(1)}ms samples=${samples}`,
  );

  if (meanMs > meanThresholdMs) {
    throw new Error(
      `${path} mean latency ${meanMs.toFixed(1)}ms exceeded threshold ${meanThresholdMs}ms`,
    );
  }

  if (p95Ms > p95ThresholdMs) {
    throw new Error(
      `${path} p95 latency ${p95Ms.toFixed(1)}ms exceeded threshold ${p95ThresholdMs}ms`,
    );
  }
};

const main = async () => {
  console.log(`Running performance benchmark against ${baseUrl}`);

  for (const path of endpointList) {
    await benchmarkEndpoint(path);
  }

  console.log("Performance benchmark passed");
};

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exit(1);
});
