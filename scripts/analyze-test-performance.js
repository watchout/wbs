#!/usr/bin/env node

/**
 * Test Performance Analysis Script
 * Analyzes test execution times and generates performance report
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const RESULTS_FILE = path.join(__dirname, '../coverage/test-results.json');
const OUTPUT_FILE = path.join(__dirname, '../coverage/test-performance.json');
const PERF_THRESHOLD_MS = 5000; // Warn if individual test takes longer than 5 seconds

async function analyzeTestPerformance() {
  try {
    // Read test results
    if (!fs.existsSync(RESULTS_FILE)) {
      console.log('⚠️  Test results file not found, skipping performance analysis');
      return;
    }

    const results = JSON.parse(fs.readFileSync(RESULTS_FILE, 'utf-8'));
    
    const analysis = {
      timestamp: new Date().toISOString(),
      totalTests: 0,
      totalDuration: 0,
      slowTests: [],
      byFile: {}
    };

    // Process test results if they exist
    if (results.testResults) {
      for (const testFile of results.testResults) {
        const fileName = path.basename(testFile.name);
        analysis.byFile[fileName] = {
          duration: testFile.perfStats?.duration || 0,
          passedTests: testFile.numPassingTests || 0,
          failedTests: testFile.numFailingTests || 0,
          totalTests: testFile.numPassingTests + testFile.numFailingTests
        };

        analysis.totalTests += analysis.byFile[fileName].totalTests;
        analysis.totalDuration += analysis.byFile[fileName].duration;

        // Flag slow test files
        if (analysis.byFile[fileName].duration > PERF_THRESHOLD_MS) {
          analysis.slowTests.push({
            file: fileName,
            duration: analysis.byFile[fileName].duration,
            tests: analysis.byFile[fileName].totalTests
          });
        }
      }
    }

    // Sort slow tests by duration
    analysis.slowTests.sort((a, b) => b.duration - a.duration);

    // Write analysis to file
    fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(analysis, null, 2));

    // Output summary
    console.log('\n📊 Test Execution Performance Report');
    console.log('=====================================');
    console.log(`Total Tests: ${analysis.totalTests}`);
    console.log(`Total Duration: ${(analysis.totalDuration / 1000).toFixed(2)}s`);
    
    if (analysis.slowTests.length > 0) {
      console.log(`\n⚠️  Slow Tests (>${PERF_THRESHOLD_MS}ms):`);
      for (const test of analysis.slowTests.slice(0, 10)) {
        const avgTime = (test.duration / test.tests).toFixed(0);
        console.log(`  - ${test.file}: ${(test.duration / 1000).toFixed(2)}s (${test.tests} tests, avg ${avgTime}ms)`);
      }
    } else {
      console.log('\n✅ All tests completed within acceptable time limits');
    }

    // Average test time
    const avgTime = (analysis.totalDuration / analysis.totalTests).toFixed(0);
    console.log(`\nAverage test duration: ${avgTime}ms`);
    console.log(`Performance report saved to: ${OUTPUT_FILE}\n`);

  } catch (error) {
    console.error('❌ Error analyzing test performance:', error.message);
    process.exit(1);
  }
}

analyzeTestPerformance();
