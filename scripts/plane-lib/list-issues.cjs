#!/usr/bin/env node
/**
 * Plane Issue一覧表示
 * 
 * Usage: node scripts/plane-lib/list-issues.cjs [--state <state>] [--priority <priority>]
 */

const { listIssues } = require('./plane-api-client.cjs');

async function main() {
  const args = process.argv.slice(2);
  const stateFilter = args.includes('--state') ? args[args.indexOf('--state') + 1] : null;
  const priorityFilter = args.includes('--priority') ? args[args.indexOf('--priority') + 1] : null;

  try {
    let issues = await listIssues();

    // フィルタ適用
    if (stateFilter) {
      issues = issues.filter(i => i.state.toLowerCase() === stateFilter.toLowerCase());
    }
    if (priorityFilter) {
      issues = issues.filter(i => i.priority === priorityFilter);
    }

    // 優先度順にソート
    const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3, none: 4 };
    issues.sort((a, b) => (priorityOrder[a.priority] || 4) - (priorityOrder[b.priority] || 4));

    // 表示
    console.log('\n📋 Plane Issues (WBS Project)\n');
    console.log('| ID | タイトル | 優先度 | 状態 |');
    console.log('|----|----------|--------|------|');

    for (const issue of issues) {
      const priorityEmoji = {
        urgent: '🔴',
        high: '🟠',
        medium: '🟡',
        low: '🟢',
        none: '⚪'
      }[issue.priority] || '⚪';

      console.log(`| ${issue.id} | ${issue.name} | ${priorityEmoji} ${issue.priority} | ${issue.state} |`);
    }

    console.log(`\n合計: ${issues.length}件\n`);

    // サマリー
    const byState = {};
    issues.forEach(i => {
      byState[i.state] = (byState[i.state] || 0) + 1;
    });
    console.log('State別:', Object.entries(byState).map(([k, v]) => `${k}: ${v}`).join(', '));

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();

