#!/usr/bin/env node
/**
 * Master Test Runner for Later Gator Tranquil Cosmic Portal UI
 * Executes all 4 tiers of opaque-box E2E tests:
 *   - Tier 1: Feature Coverage (F1 to F7)
 *   - Tier 2: Boundary & Corner Cases (B1 to B5)
 *   - Tier 3: Pairwise Cross-Feature Interactions
 *   - Tier 4: Real-World Application Scenarios
 *
 * Usage:
 *   node tests/run_tests.js
 *   node tests/run_tests.js --tier=1
 *   node tests/run_tests.js --verbose
 */

const { defaultRunner } = require('./infra/test_runner');

// Parse CLI flags
const args = process.argv.slice(2);
const tierArg = args.find(a => a.startsWith('--tier='));
const targetTier = tierArg ? parseInt(tierArg.split('=')[1], 10) : null;
const isVerbose = args.includes('--verbose') || args.includes('-v');

console.log('✦ LATER, GATORS // TRANQUIL COSMIC PORTAL E2E TEST SUITE ✦');
console.log('Opaque-Box E2E Testing Track | Headless Chromium CDP Engine');
if (targetTier) {
    console.log(`Filtering execution to: Tier ${targetTier}\n`);
} else {
    console.log('Executing all 4 Tiers (Feature, Boundary, Pairwise, Scenarios)\n');
}

// Load test suites based on tier filter
if (!targetTier || targetTier === 1) {
    require('./tier1_feature/f1_branch_safety.test');
    require('./tier1_feature/f2_prohibited_words.test');
    require('./tier1_feature/f3_humane_empathy.test');
    require('./tier1_feature/f4_desktop_layout.test');
    require('./tier1_feature/f5_mobile_layout.test');
    require('./tier1_feature/f6_runtime_integrity.test');
    require('./tier1_feature/f7_celestial_audio.test');
}

if (!targetTier || targetTier === 2) {
    require('./tier2_boundary/b1_text_lengths.test');
    require('./tier2_boundary/b2_whitespace_reject.test');
    require('./tier2_boundary/b3_click_debounce.test');
    require('./tier2_boundary/b4_network_fallback.test');
    require('./tier2_boundary/b5_contrast_wcag.test');
}

if (!targetTier || targetTier === 3) {
    require('./tier3_pairwise/cross_feature.test');
}

if (!targetTier || targetTier === 4) {
    require('./tier4_scenarios/real_world_scenarios.test');
}

// Execute suites
defaultRunner.run({ verbose: isVerbose })
    .then(summary => {
        if (summary.failed > 0) {
            console.error(`\nTest suite finished with ${summary.failed} failures.`);
            process.exit(1);
        } else {
            console.log(`\nAll ${summary.passed} tests passed successfully.`);
            process.exit(0);
        }
    })
    .catch(err => {
        console.error('Fatal test runner error:', err);
        process.exit(1);
    });
