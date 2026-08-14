const { onSchedule } = require("firebase-functions/v2/scheduler");
const logger = require("firebase-functions/logger");

const DEFAULT_REGION = "us-central1";
const DEFAULT_JOB_NAMES = ["dark-fight-sim", "dark-group-fight-sim", "dark-team-fight-sim"];
const METADATA_TOKEN_URL =
  "http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token";
const CLOUD_PLATFORM_SCOPE = "https://www.googleapis.com/auth/cloud-platform";

class CloudRunApiError extends Error {
  constructor({ status, message, url, body }) {
    super(`${status} ${message}`);
    this.name = "CloudRunApiError";
    this.status = status;
    this.url = url;
    this.body = body;
  }
}

function getProjectId() {
  const firebaseProjectId = process.env.FIREBASE_CONFIG
    ? JSON.parse(process.env.FIREBASE_CONFIG || "{}")?.projectId
    : "";

  return (
    process.env.FIGHT_JOBS_PROJECT_ID ||
    process.env.GCLOUD_PROJECT ||
    process.env.GCP_PROJECT ||
    firebaseProjectId ||
    "dark-coin-dc4a3"
  );
}

function getFightJobNames() {
  return String(process.env.FIGHT_JOB_NAMES || DEFAULT_JOB_NAMES.join(","))
    .split(",")
    .map((name) => name.trim())
    .filter(Boolean);
}

async function getMetadataAccessToken() {
  const response = await fetch(`${METADATA_TOKEN_URL}?scopes=${encodeURIComponent(CLOUD_PLATFORM_SCOPE)}`, {
    headers: { "Metadata-Flavor": "Google" },
  });

  if (!response.ok) {
    throw new Error(`Could not get metadata access token: ${response.status} ${await response.text()}`);
  }

  const token = await response.json();
  if (!token?.access_token) throw new Error("Metadata token response did not include access_token.");
  return token.access_token;
}

async function runApiRequest(url, accessToken, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  const text = await response.text();
  let payload = {};

  try {
    payload = text ? JSON.parse(text) : {};
  } catch (error) {
    payload = { raw: text };
  }

  if (!response.ok) {
    throw new CloudRunApiError({
      status: response.status,
      message: payload?.error?.message || text || response.statusText,
      url,
      body: payload,
    });
  }

  return payload;
}

function serializeError(error) {
  return {
    name: error?.name || "Error",
    message: error?.message || String(error),
    status: error?.status || null,
    url: error?.url || null,
    body: error?.body || null,
    stack: error?.stack || null,
  };
}

function isActiveExecution(execution) {
  if (!execution || execution.completionTime || execution.deleteTime) return false;

  return (
    execution.reconciling ||
    Number(execution.runningCount || 0) > 0 ||
    Number(execution.pendingCount || 0) > 0 ||
    Number(execution.taskCount || 0) > 0
  );
}

async function hasActiveExecution({ projectId, region, jobName, accessToken }) {
  const parent = `projects/${projectId}/locations/${region}/jobs/${jobName}`;
  const url = `https://run.googleapis.com/v2/${parent}/executions?pageSize=5`;
  const payload = await runApiRequest(url, accessToken);
  const executions = Array.isArray(payload.executions) ? payload.executions : [];
  return executions.some(isActiveExecution);
}

async function startCloudRunJob({ projectId, region, jobName, accessToken }) {
  const jobResource = `projects/${projectId}/locations/${region}/jobs/${jobName}`;
  const url = `https://run.googleapis.com/v2/${jobResource}:run`;
  return runApiRequest(url, accessToken, {
    method: "POST",
    body: JSON.stringify({}),
  });
}

exports.scheduleFightSimJobs = onSchedule(
  {
    schedule: "every 15 minutes",
    region: DEFAULT_REGION,
    timeZone: "America/Los_Angeles",
    timeoutSeconds: 300,
    memory: "256MiB",
    maxInstances: 1,
  },
  async () => {
    const projectId = getProjectId();
    const region = process.env.FIGHT_JOBS_REGION || DEFAULT_REGION;
    const jobNames = getFightJobNames();
    const accessToken = await getMetadataAccessToken();

    logger.info("Checking Cloud Run fight jobs", { projectId, region, jobNames });

    const results = await Promise.all(
      jobNames.map(async (jobName) => {
        try {
          let active = false;
          active = await hasActiveExecution({ projectId, region, jobName, accessToken });

          if (active) {
            logger.info("Skipping fight job because it is already running", { jobName });
            return { jobName, skipped: true };
          }

          const operation = await startCloudRunJob({ projectId, region, jobName, accessToken });
          logger.info("Started fight job", {
            jobName,
            operationName: operation?.name || null,
          });
          return { jobName, skipped: false, operationName: operation?.name || null };
        } catch (error) {
          if (error?.status === 404) {
            logger.warn(`Skipping fight job because it does not exist yet: ${jobName}`, {
              jobName,
              error: serializeError(error),
            });
            return { jobName, skipped: true, missing: true };
          }

          logger.error(
            `Failed to start fight job ${jobName}: ${error?.message || error}`,
            { jobName, error: serializeError(error) }
          );
          return { jobName, failed: true, error: serializeError(error) };
        }
      })
    );

    const failures = results.filter((result) => result.failed);
    if (failures.length) {
      const summary = failures
        .map((failure) => `${failure.jobName}: ${failure.error?.message || "unknown error"}`)
        .join("; ");
      throw new Error(`${failures.length} Cloud Run fight job(s) failed to start. ${summary}`);
    }

    return results;
  }
);
