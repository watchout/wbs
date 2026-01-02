#!/usr/bin/env node
/**
 * Plane Issue状態更新
 * 
 * Usage: node scripts/plane-lib/update-issue.cjs <issue-id> <new-state>
 * 
 * States: Backlog, Todo, "In Progress", Done, Cancelled
 */

const { updateIssueState } = require('./plane-api-client.cjs');

async function main() {
  const issueId = process.argv[2];
  const newState = process.argv[3];

  if (!issueId || !newState) {
    console.error('Usage: node update-issue.cjs <issue-id> <new-state>');
    console.error('States: Backlog, Todo, "In Progress", Done, Cancelled');
    process.exit(1);
  }

  try {
    console.log(`\n🔄 ${issueId} を "${newState}" に更新中...\n`);

    const result = await updateIssueState(issueId, newState);

    console.log(`✅ ${result.id} → ${result.newState}\n`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();

