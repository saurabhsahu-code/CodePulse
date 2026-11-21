
import test from "node:test";
import assert from "node:assert/strict";

import { analyzeRepositoryHealth } from "../utils/healthAnalyzer.js";

const createMetadata = (overrides = {}) => ({
    pushedAt: new Date().toISOString(),
    archived: false,
    disabled: false,
    hasIssues: true,
    openIssues: 5,
    ...overrides,
});

const createTree = (overrides = {}) => ({
    totalFiles: 100,
    sourceFiles: 60,
    supportingFiles: 40,
    languages: { JavaScript: 60 },
    hasReadme: true,
    truncated: false,
    completeness: "complete",
    ...overrides,
});

const getPushDate = (daysAgo) =>
    new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString();

// Baseline repository health.
test("returns good overall status for a healthy repository", () => {
    const result = analyzeRepositoryHealth(
        createMetadata(),
        createTree()
    );

    assert.equal(result.overallStatus, "good");
});

// Maintenance status tests.
test("marks a repository updated within 30 days as good", () => {
    const result = analyzeRepositoryHealth(
        createMetadata({ pushedAt: getPushDate(30) }),
        createTree()
    );

    assert.equal(result.indicators.maintenance.status, "good");
});

test("marks a repository not updated for 60 days as moderate", () => {
    const result = analyzeRepositoryHealth(
        createMetadata({ pushedAt: getPushDate(60) }),
        createTree()
    );

    assert.equal(result.indicators.maintenance.status, "moderate");
});

test("marks a repository not updated for 90 days as moderate", () => {
    const result = analyzeRepositoryHealth(
        createMetadata({ pushedAt: getPushDate(90) }),
        createTree()
    );

    assert.equal(result.indicators.maintenance.status, "moderate");
});

test("marks a repository not updated for more than 90 days as needing attention", () => {
    const result = analyzeRepositoryHealth(
        createMetadata({ pushedAt: getPushDate(91) }),
        createTree()
    );

    assert.equal(result.indicators.maintenance.status, "needs_attention");
});

test("handles an invalid push date as unknown", () => {
    const result = analyzeRepositoryHealth(
        createMetadata({ pushedAt: "invalid-date" }),
        createTree()
    );

    assert.equal(result.indicators.maintenance.status, "unknown");
});

// Repository status tests.
test("marks an archived repository as informational", () => {
    const result = analyzeRepositoryHealth(
        createMetadata({ archived: true }),
        createTree()
    );

    assert.equal(result.indicators.repositoryStatus.status, "info");
    assert.equal(result.indicators.repositoryStatus.value, "archived");
});

test("marks a disabled repository as needing attention", () => {
    const result = analyzeRepositoryHealth(
        createMetadata({ disabled: true }),
        createTree()
    );

    assert.equal(
        result.indicators.repositoryStatus.status,
        "needs_attention"
    );
});

// Documentation and completeness tests.
test("marks missing README documentation as needing attention", () => {
    const result = analyzeRepositoryHealth(
        createMetadata(),
        createTree({ hasReadme: false })
    );

    assert.equal(
        result.indicators.documentation.status,
        "needs_attention"
    );
});

test("marks a truncated file tree as needing attention", () => {
    const result = analyzeRepositoryHealth(
        createMetadata(),
        createTree({
            truncated: true,
            completeness: "partial",
        })
    );

    assert.equal(
        result.indicators.analysisCompleteness.status,
        "needs_attention"
    );
});

// Overall status tests.
test("returns incomplete when an indicator has unknown status and none needs attention", () => {
    const result = analyzeRepositoryHealth(
        createMetadata({ pushedAt: null }),
        createTree()
    );

    assert.equal(result.overallStatus, "incomplete");
});

test("returns needs_attention when an indicator needs attention", () => {
    const result = analyzeRepositoryHealth(
        createMetadata(),
        createTree({ hasReadme: false })
    );

    assert.equal(result.overallStatus, "needs_attention");
});

test("marks enabled issue tracking as good", () => {
    const result = analyzeRepositoryHealth(
        createMetadata({ hasIssues: true }),
        createTree()
    );

    assert.equal(result.indicators.issueTracking.status, "good");
});

test("marks disabled issue tracking as informational", () => {
    const result = analyzeRepositoryHealth(
        createMetadata({ hasIssues: false }),
        createTree()
    );

    assert.equal(result.indicators.issueTracking.status, "info");
});

test("handles unavailable issue-tracking information", () => {
    const result = analyzeRepositoryHealth(
        createMetadata({ hasIssues: null }),
        createTree()
    );

    assert.equal(result.indicators.issueTracking.status, "unknown");
});

test("handles invalid open work-item counts", () => {
    const result = analyzeRepositoryHealth(
        createMetadata({ openIssues: -1 }),
        createTree()
    );

    assert.equal(result.indicators.openWorkItems.status, "unknown");
});

test("keeps open work-item counts informational", () => {
    const result = analyzeRepositoryHealth(
        createMetadata({ openIssues: 100 }),
        createTree()
    );

    assert.equal(result.indicators.openWorkItems.status, "info");
    assert.equal(result.indicators.openWorkItems.value, 100);
});

test("handles invalid codebase metrics", () => {
    const result = analyzeRepositoryHealth(
        createMetadata(),
        createTree({ totalFiles: null })
    );

    assert.equal(result.indicators.codebase.status, "unknown");
});

test("handles a future push date as unknown", () => {
    const futureDate = new Date(
        Date.now() + 24 * 60 * 60 * 1000
    ).toISOString();

    const result = analyzeRepositoryHealth(
        createMetadata({ pushedAt: futureDate }),
        createTree()
    );

    assert.equal(result.indicators.maintenance.status, "unknown");
});

test("handles missing file-tree completeness information", () => {
    const tree = createTree();
    delete tree.completeness;

    const result = analyzeRepositoryHealth(
        createMetadata(),
        tree
    );

    assert.equal(
        result.indicators.analysisCompleteness.status,
        "unknown"
    );

    assert.equal(
        result.indicators.analysisCompleteness.value,
        null
    );
});

test("handles empty completeness information as unknown", () => {
    const result = analyzeRepositoryHealth(
        createMetadata(),
        createTree({ completeness: "" })
    );

    assert.equal(
        result.indicators.analysisCompleteness.status,
        "unknown"
    );
});

test("prioritizes truncated file trees even when completeness is missing", () => {
    const tree = createTree({
        truncated: true,
        completeness: undefined,
    });

    const result = analyzeRepositoryHealth(
        createMetadata(),
        tree
    );

    assert.equal(
        result.indicators.analysisCompleteness.status,
        "needs_attention"
    );
});

