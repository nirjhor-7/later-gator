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
    test('F1-1: Active branch must be strictly "experiment/new-ui"', () => {
        const branch = runGit('git branch --show-current');
        expect(branch).toBe('experiment/new-ui');
    });

    test('F1-2: HEAD symbolic-ref resolves to refs/heads/experiment/new-ui', () => {
        const ref = runGit('git symbolic-ref HEAD');
        expect(ref).toBe('refs/heads/experiment/new-ui');
    });

    test('F1-3: Branch "main" commit hash matches "origin/main"', () => {
        const localMain = runGit('git rev-parse main');
        const remoteMain = runGit('git rev-parse origin/main');
        expect(localMain).toBe(remoteMain);
    });

    test('F1-4: Branch "staging" commit hash matches "origin/staging"', () => {
        const localStaging = runGit('git rev-parse staging');
        const remoteStaging = runGit('git rev-parse origin/staging');
        expect(localStaging).toBe(remoteStaging);
    });

    test('F1-5: Git diff between local "main" and "origin/main" is strictly empty', () => {
        const diff = runGit('git diff main origin/main');
        expect(diff).toBe('');
    });

    test('F1-6: Git diff between local "staging" and "origin/staging" is strictly empty', () => {
        const diff = runGit('git diff staging origin/staging');
        expect(diff).toBe('');
    });

    test('F1-7: Both "main" and "staging" match their respective remote tracking branches', () => {
        const mainCommit = runGit('git rev-parse main');
        const remoteMain = runGit('git rev-parse origin/main');
        const stagingCommit = runGit('git rev-parse staging');
        const remoteStaging = runGit('git rev-parse origin/staging');
        expect(mainCommit).toBe(remoteMain);
        expect(stagingCommit).toBe(remoteStaging);
    });
});
