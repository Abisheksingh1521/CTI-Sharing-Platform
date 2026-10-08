/**
 * Application Fuzz Test Harness (Phase 14)
 * Bridges test framework to scripts/fuzz-security.js
 */

const { runFuzzer } = require('../../scripts/fuzz-security');

(async () => {
  try {
    await runFuzzer();
  } catch (err) {
    console.error('[ERROR] Fuzzer execution failed:', err);
    process.exit(1);
  }
})();
