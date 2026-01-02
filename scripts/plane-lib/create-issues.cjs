#!/usr/bin/env node
/**
 * Plane Issue一括作成
 * 
 * Usage: node scripts/plane-lib/create-issues.cjs <json-file>
 * 
 * JSON形式:
 * [
 *   { "name": "タスク名", "priority": "high", "state": "Backlog" },
 *   ...
 * ]
 */

const fs = require('fs');
const { createIssuesBatch } = require('./plane-api-client.cjs');

async function main() {
  const jsonFile = process.argv[2];

  if (!jsonFile) {
    console.error('Usage: node create-issues.cjs <json-file>');
    process.exit(1);
  }

  try {
    const issues = JSON.parse(fs.readFileSync(jsonFile, 'utf8'));
    console.log(`\n📝 ${issues.length}件のIssueを作成します...\n`);

    const results = await createIssuesBatch(issues);

    let successCount = 0;
    let failCount = 0;

    for (const result of results) {
      if (result.success) {
        console.log(`✅ ${result.id}: ${result.name}`);
        successCount++;
      } else {
        console.log(`❌ ${result.name}: ${result.error}`);
        failCount++;
      }
    }

    console.log(`\n完了: 成功 ${successCount}件, 失敗 ${failCount}件\n`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();

