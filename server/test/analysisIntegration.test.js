import test from "node:test";
import assert from "node:assert/strict";

import {
  analyzeRepository,
  createUnavailableMetrics,
} from "../controllers/analysisController.js";

test("analysisController: analyzeRepository validates URL and handles missing repositoryUrl", async () => {
  let statusCode = null;
  let jsonResult = null;

  const req = {
    body: {},
  };

  const res = {
    status(code) {
      statusCode = code;
      return this;
    },
    json(data) {
      jsonResult = data;
      return this;
    },
  };

  await analyzeRepository(req, res);

  assert.equal(statusCode, 400);
  assert.equal(jsonResult.success, false);
  assert.match(jsonResult.message, /URL is required/i);
});

test("analysisController: analyzeRepository rejects invalid GitHub URL format", async () => {
  let statusCode = null;
  let jsonResult = null;

  const req = {
    body: {
      repositoryUrl: "http://insecure-domain.com/user/repo",
    },
  };

  const res = {
    status(code) {
      statusCode = code;
      return this;
    },
    json(data) {
      jsonResult = data;
      return this;
    },
  };

  await analyzeRepository(req, res);

  assert.equal(statusCode, 400);
  assert.equal(jsonResult.success, false);
  assert.match(jsonResult.message, /valid HTTPS GitHub repository URL/i);
});

test("analysisController (Req 9): unexpected metrics-service exception returns HTTP 200 with unavailable metrics and preserves core analysis", async (t) => {
  // Mock globalThis.fetch to provide mock GitHub metadata, commits, and tree
  const originalFetch = globalThis.fetch;

  t.mock.method(globalThis, "fetch", async (url) => {
    const urlStr = String(url);

    // 1. Repo metadata endpoint
    if (urlStr.includes("/repos/testowner/testrepo") && !urlStr.includes("/commits") && !urlStr.includes("/git/trees")) {
      return {
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => ({
          id: 123456,
          name: "testrepo",
          full_name: "testowner/testrepo",
          owner: { login: "testowner" },
          description: "Integration test repo",
          html_url: "https://github.com/testowner/testrepo",
          private: false,
          stargazers_count: 10,
          forks_count: 2,
          open_issues_count: 1,
          default_branch: "main",
          created_at: "2026-01-01T00:00:00Z",
          updated_at: "2026-11-20T00:00:00Z",
          pushed_at: "2026-11-20T00:00:00Z",
          archived: false,
          disabled: false,
          has_issues: true,
          language: "JavaScript",
        }),
      };
    }

    // 2. Commits endpoint
    if (urlStr.includes("/commits")) {
      return {
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => [
          {
            sha: "commit-sha-1",
            html_url: "https://github.com/testowner/testrepo/commit/commit-sha-1",
            author: { login: "testuser" },
            commit: {
              author: { name: "Test User", date: "2026-11-20T00:00:00Z" },
            },
          },
        ],
      };
    }

    // 3. Tree endpoint
    if (urlStr.includes("/git/trees")) {
      return {
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => ({
          truncated: false,
          tree: [
            {
              path: "src/index.js",
              mode: "100644",
              type: "blob",
              sha: "1111111111111111111111111111111111111111",
              size: 200,
            },
            {
              path: "README.md",
              mode: "100644",
              type: "blob",
              sha: "2222222222222222222222222222222222222222",
              size: 300,
            },
          ],
        }),
      };
    }

    return {
      ok: false,
      status: 404,
      json: async () => ({ message: "Not found" }),
    };
  });

  let statusCode = null;
  let jsonResult = null;

  const req = {
    body: {
      repositoryUrl: "https://github.com/testowner/testrepo",
    },
  };

  const res = {
    status(code) {
      statusCode = code;
      return this;
    },
    json(data) {
      jsonResult = data;
      return this;
    },
  };

  // Inject a metrics collector that unexpectedly throws an unhandled exception
  const throwingMetricsCollector = async () => {
    throw new Error("Critical internal database or metrics worker failure!");
  };

  await analyzeRepository(req, res, {
    collectMetrics: throwingMetricsCollector,
  });

  // Verify response is HTTP 200, NOT HTTP 500!
  assert.equal(statusCode, 200);
  assert.equal(jsonResult.success, true);

  // Core analysis results are fully preserved
  assert.ok(jsonResult.data.metadata);
  assert.equal(jsonResult.data.metadata.fullName, "testowner/testrepo");
  assert.ok(jsonResult.data.tree);
  assert.ok(jsonResult.data.health);
  assert.ok(jsonResult.data.activity);
  assert.ok(jsonResult.data.anomalies);

  // Metrics block is isolated and marked as unavailable with internal error explanation
  assert.ok(jsonResult.data.metrics);
  assert.equal(jsonResult.data.metrics.status, "unavailable");
  assert.equal(jsonResult.data.metrics.dataCompleteness, "unavailable");
  assert.equal(jsonResult.data.metrics.isComplete, false);
  assert.equal(jsonResult.data.metrics.summary.totalLines, 0);
  assert.match(
    jsonResult.data.metrics.explanation,
    /unexpected internal error/i
  );

  // Restore fetch
  globalThis.fetch = originalFetch;
});

test("analysisController: createUnavailableMetrics returns standardized schema with limits", () => {
  const result = createUnavailableMetrics(
    [{ path: "a.js" }, { path: "b.js" }],
    "Custom failure reason"
  );

  assert.equal(result.status, "unavailable");
  assert.equal(result.dataCompleteness, "unavailable");
  assert.equal(result.isComplete, false);
  assert.equal(result.fileCounts.eligibleSourceFiles, 2);
  assert.equal(result.limits.perFileTimeoutMs, 6000);
  assert.equal(result.limits.globalTimeoutMs, 20000);
  assert.equal(result.explanation, "Custom failure reason");

  // Comment metrics fallback fields
  assert.equal(result.summary.singleLineCommentLines, 0);
  assert.equal(result.summary.blockCommentLines, 0);
  assert.equal(result.summary.totalCommentLines, 0);
  assert.equal(result.summary.commentLinePercentage, 0);
  assert.equal(result.summary.commentSupportedFiles, 0);
  assert.equal(result.summary.commentUnsupportedFiles, 0);
  assert.equal(result.fileCounts.commentSupported, 0);
  assert.equal(result.fileCounts.commentUnsupported, 0);
});
