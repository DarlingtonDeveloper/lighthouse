/**
 * scripts/eval.ts
 * ----------------
 * CLI entry point for the Lighthouse evaluation suite.
 *
 * Usage: npm run eval
 *
 * Runs detectTechStack against a ground truth test set and reports
 * accuracy, confidence calibration, and schema validation results.
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

// Load .env.local (Next.js does this automatically, but tsx does not)
try {
  const envPath = resolve(__dirname, '..', '.env.local');
  const envContent = readFileSync(envPath, 'utf-8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const value = trimmed.slice(eqIdx + 1).trim();
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
} catch {
  console.warn('Warning: .env.local not found, using existing environment variables');
}

import { runEval } from '../lib/eval/runner';

async function main() {
  console.log('Running Lighthouse eval...\n');

  const report = await runEval();

  // --- Summary ---
  console.log(
    `\nSites: ${report.sites_completed}/${report.total_sites} completed, ${report.sites_errored} errored`,
  );
  console.log(`Overall accuracy: ${report.overall_accuracy.toFixed(1)}%`);
  console.log(`Schema pass rate: ${report.schema_pass_rate.toFixed(1)}%\n`);

  // --- Per-field accuracy ---
  console.log('Field accuracy:');
  for (const [field, stats] of Object.entries(report.field_accuracy)) {
    console.log(
      `  ${field.padEnd(22)} ${stats.correct}/${stats.total} (${stats.pct.toFixed(0)}%)`,
    );
  }

  // --- Confidence calibration ---
  console.log('\nConfidence calibration:');
  for (const [level, stats] of Object.entries(report.calibration)) {
    if (stats.total === 0) continue;
    console.log(
      `  ${level.padEnd(10)} ${stats.correct}/${stats.total} (${stats.pct.toFixed(0)}% accurate)`,
    );
  }

  // --- Failure detail ---
  const failures = report.sites.filter(
    (s) => s.accuracy < 100 || !s.schema_valid,
  );
  if (failures.length > 0) {
    console.log('\n--- Failures ---');
    for (const site of failures) {
      console.log(
        `\n${site.domain} (${site.accuracy.toFixed(0)}% accurate, schema: ${site.schema_valid ? 'pass' : 'FAIL'})`,
      );
      if (site.schema_error) console.log(`  Schema error: ${site.schema_error}`);
      if (site.error) console.log(`  Pipeline error: ${site.error}`);
      for (const f of site.fields.filter((f) => !f.correct)) {
        console.log(
          `  x ${f.field}: expected "${f.expected}", got "${f.detected}" (confidence: ${f.confidence})`,
        );
      }
    }
  }

  // --- Write full report ---
  const reportPath = `eval-report-${new Date().toISOString().slice(0, 10)}.json`;
  writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\nFull report written to ${reportPath}`);
}

main().catch(console.error);
