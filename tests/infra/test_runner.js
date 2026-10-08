/**
 * Zero-Dependency E2E Test Runner and Assertion Library
 */

const ANSI = {
    reset: '\x1b[0m',
    bold: '\x1b[1m',
    dim: '\x1b[2m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    cyan: '\x1b[36m',
    magenta: '\x1b[35m'
};

class AssertionError extends Error {
    constructor(message) {
        super(message);
        this.name = 'AssertionError';
    }
}

function expect(actual) {
    return {
        toBe(expected) {
            if (actual !== expected) {
                throw new AssertionError(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(actual)}`);
            }
        },
        toEqual(expected) {
            const actualStr = JSON.stringify(actual);
            const expectedStr = JSON.stringify(expected);
            if (actualStr !== expectedStr) {
                throw new AssertionError(`Expected deeply equal:\n  Expected: ${expectedStr}\n  Received: ${actualStr}`);
            }
        },
        toBeGreaterThanOrEqual(expected) {
            if (!(actual >= expected)) {
                throw new AssertionError(`Expected ${actual} >= ${expected}`);
            }
        },
        toBeLessThanOrEqual(expected) {
            if (!(actual <= expected)) {
                throw new AssertionError(`Expected ${actual} <= ${expected}`);
            }
        },
        toBeGreaterThan(expected) {
            if (!(actual > expected)) {
                throw new AssertionError(`Expected ${actual} > ${expected}`);
            }
        },
        toBeLessThan(expected) {
            if (!(actual < expected)) {
                throw new AssertionError(`Expected ${actual} < ${expected}`);
            }
        },
        toContain(expected) {
            if (typeof actual === 'string' || Array.isArray(actual)) {
                if (!actual.includes(expected)) {
                    throw new AssertionError(`Expected target to contain ${JSON.stringify(expected)}`);
                }
            } else {
                throw new AssertionError(`Cannot check toContain on type ${typeof actual}`);
            }
        },
        toNotContain(expected) {
            if (typeof actual === 'string' || Array.isArray(actual)) {
                if (actual.includes(expected)) {
                    throw new AssertionError(`Expected target NOT to contain ${JSON.stringify(expected)}`);
                }
            }
        },
        toMatch(pattern) {
            const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;
            if (!regex.test(String(actual))) {
                throw new AssertionError(`Expected ${JSON.stringify(actual)} to match ${pattern}`);
            }
        },
        toBeTruthy() {
            if (!actual) {
                throw new AssertionError(`Expected truthy, received ${JSON.stringify(actual)}`);
            }
        },
        toBeFalsy() {
            if (actual) {
                throw new AssertionError(`Expected falsy, received ${JSON.stringify(actual)}`);
            }
        },
        toBeDefined() {
            if (actual === undefined) {
                throw new AssertionError(`Expected defined, received undefined`);
            }
        },
        toBeNull() {
            if (actual !== null) {
                throw new AssertionError(`Expected null, received ${JSON.stringify(actual)}`);
            }
        },
        async toThrow(expectedErrorPattern) {
            let threw = false;
            let error = null;
            if (typeof actual === 'function') {
                try {
                    await actual();
                } catch (e) {
                    threw = true;
                    error = e;
                }
            }
            if (!threw) {
                throw new AssertionError(`Expected function to throw, but it succeeded`);
            }
            if (expectedErrorPattern && error) {
                const regex = typeof expectedErrorPattern === 'string' ? new RegExp(expectedErrorPattern) : expectedErrorPattern;
                if (!regex.test(error.message)) {
                    throw new AssertionError(`Expected error message to match ${expectedErrorPattern}, got: ${error.message}`);
                }
            }
        }
    };
}

class TestSuite {
    constructor(name) {
        this.name = name;
        this.tests = [];
        this.beforeAllFns = [];
        this.afterAllFns = [];
        this.beforeEachFns = [];
        this.afterEachFns = [];
    }

    addTest(name, fn) {
        this.tests.push({ name, fn });
    }
}

class Runner {
    constructor() {
        this.suites = [];
        this.currentSuite = null;
    }

    describe(name, fn) {
        const suite = new TestSuite(name);
        this.suites.push(suite);
        const prevSuite = this.currentSuite;
        this.currentSuite = suite;
        fn();
        this.currentSuite = prevSuite;
    }

    test(name, fn) {
        if (!this.currentSuite) {
            this.describe('Default Suite', () => {
                this.currentSuite.addTest(name, fn);
            });
        } else {
            this.currentSuite.addTest(name, fn);
        }
    }

    beforeAll(fn) {
        if (this.currentSuite) this.currentSuite.beforeAllFns.push(fn);
    }

    afterAll(fn) {
        if (this.currentSuite) this.currentSuite.afterAllFns.push(fn);
    }

    beforeEach(fn) {
        if (this.currentSuite) this.currentSuite.beforeEachFns.push(fn);
    }

    afterEach(fn) {
        if (this.currentSuite) this.currentSuite.afterEachFns.push(fn);
    }

    async run(options = {}) {
        let total = 0;
        let passed = 0;
        let failed = 0;
        const startTime = Date.now();
        const results = [];

        console.log(`\n${ANSI.bold}${ANSI.cyan}✦ Running Test Suite ✦${ANSI.reset}\n`);

        for (const suite of this.suites) {
            console.log(`${ANSI.bold}${ANSI.magenta}● ${suite.name}${ANSI.reset}`);

            try {
                for (const fn of suite.beforeAllFns) await fn();
            } catch (err) {
                console.log(`  ${ANSI.red}✗ beforeAll failed:${ANSI.reset} ${err.message}`);
                failed += suite.tests.length;
                total += suite.tests.length;
                continue;
            }

            for (const t of suite.tests) {
                total++;
                const tStart = Date.now();
                try {
                    for (const fn of suite.beforeEachFns) await fn();
                    await t.fn();
                    for (const fn of suite.afterEachFns) await fn();

                    passed++;
                    const dur = Date.now() - tStart;
                    console.log(`  ${ANSI.green}✓${ANSI.reset} ${t.name} ${ANSI.dim}(${dur}ms)${ANSI.reset}`);
                    results.push({ suite: suite.name, test: t.name, status: 'pass', duration: dur });
                } catch (err) {
                    failed++;
                    const dur = Date.now() - tStart;
                    console.log(`  ${ANSI.red}✗ ${t.name}${ANSI.reset} ${ANSI.dim}(${dur}ms)${ANSI.reset}`);
                    console.log(`    ${ANSI.red}${err.message}${ANSI.reset}`);
                    if (options.verbose && err.stack) {
                        console.log(`    ${ANSI.dim}${err.stack.split('\n').slice(1, 4).join('\n    ')}${ANSI.reset}`);
                    }
                    results.push({ suite: suite.name, test: t.name, status: 'fail', duration: dur, error: err.message });
                }
            }

            try {
                for (const fn of suite.afterAllFns) await fn();
            } catch (err) {
                console.log(`  ${ANSI.red}✗ afterAll failed:${ANSI.reset} ${err.message}`);
            }

            console.log('');
        }

        const totalDuration = Date.now() - startTime;
        console.log(`${ANSI.bold}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${ANSI.reset}`);
        if (failed === 0) {
            console.log(`${ANSI.bold}${ANSI.green}✓ ALL TESTS PASSED${ANSI.reset} (${passed}/${total}) in ${totalDuration}ms`);
        } else {
            console.log(`${ANSI.bold}${ANSI.red}✗ TESTS FAILED${ANSI.reset} (${failed} failed, ${passed} passed of ${total}) in ${totalDuration}ms`);
        }
        console.log(`${ANSI.bold}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${ANSI.reset}\n`);

        return { total, passed, failed, durationMs: totalDuration, results };
    }
}

// Singleton global instance
const defaultRunner = new Runner();

module.exports = {
    Runner,
    defaultRunner,
    describe: (name, fn) => defaultRunner.describe(name, fn),
    test: (name, fn) => defaultRunner.test(name, fn),
    it: (name, fn) => defaultRunner.test(name, fn),
    beforeAll: (fn) => defaultRunner.beforeAll(fn),
    afterAll: (fn) => defaultRunner.afterAll(fn),
    beforeEach: (fn) => defaultRunner.beforeEach(fn),
    afterEach: (fn) => defaultRunner.afterEach(fn),
    expect
};
