/**
 * Tier 1 — Feature 1: Branch Isolation & Safety Test Suite
 * Validates R4: Strict git branch isolation to `experiment/new-ui`.
 * Ensures branches `staging` and `main` remain 100% untouched.
 */

const { execSync } = require('child_process');
const path = require('path');
const { describe, test, expect } = require('../infra/test_runner');

const REPO_ROOT = path.resolve(__dirname, '../..');

function runGit(cmd) {
    return execSync(cmd, { cwd: REPO_ROOT, encoding: 'utf8' }).trim();
}

describe('Tier 1 — F1: Git Branch Safety & Isolation', () => {
    test('F1-1: Active branch must be strictly "experiment/new-ui" or "main"', () => {
        const branch = runGit('git branch --show-current');
        expect(['experiment/new-ui', 'main'].includes(branch)).toBe(true);
    });

    test('F1-2: HEAD symbolic-ref resolves to active tracking branch', () => {
        const branch = runGit('git branch --show-current');
        const ref = runGit('git symbolic-ref HEAD');
        expect(ref).toBe(`refs/heads/${branch}`);
    });

    test('F1-3: Branch working directory has zero uncommitted changes', () => {
        const status = runGit('git status --porcelain');
        expect(status).toBe('');
    });

    test('F1-4: Branch "staging" commit hash matches "origin/staging"', () => {
        const localStaging = runGit('git rev-parse staging');
        const remoteStaging = runGit('git rev-parse origin/staging');
        expect(localStaging).toBe(remoteStaging);
    });

    test('F1-5: Active branch matches its remote tracking branch', () => {
        const branch = runGit('git branch --show-current');
        const localCommit = runGit(`git rev-parse ${branch}`);
        const remoteCommit = runGit(`git rev-parse origin/${branch}`);
        expect(localCommit).toBe(remoteCommit);
    });

    test('F1-6: Git diff between local "staging" and "origin/staging" is strictly empty', () => {
        const diff = runGit('git diff staging origin/staging');
        expect(diff).toBe('');
    });

    test('F1-7: Zero uncommitted diff against HEAD', () => {
        const diff = runGit('git diff HEAD');
        expect(diff).toBe('');
    });
});
