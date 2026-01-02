/**
 * Plane API Client
 * 
 * ミエルプラスプロジェクト用Plane連携ライブラリ
 */

require('dotenv').config();

const PLANE_API_KEY = process.env.PLANE_API_KEY;
const PLANE_WORKSPACE_SLUG = process.env.PLANE_WORKSPACE_SLUG || 'co';
const PLANE_PROJECT_ID = process.env.PLANE_PROJECT_ID || 'WBS';
const PLANE_BASE_URL = 'https://plane.arrowsworks.com/api/v1';

// プロジェクトIDのキャッシュ
let cachedProjectUUID = null;

/**
 * Plane APIリクエスト
 */
async function planeRequest(endpoint, options = {}) {
  const url = `${PLANE_BASE_URL}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'X-API-Key': PLANE_API_KEY,
      'Content-Type': 'application/json',
      ...options.headers
    }
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Plane API Error: ${response.status} - ${text}`);
  }

  return response.json();
}

/**
 * プロジェクトUUIDを取得
 */
async function getProjectUUID() {
  if (cachedProjectUUID) return cachedProjectUUID;

  const data = await planeRequest(`/workspaces/${PLANE_WORKSPACE_SLUG}/projects/`);
  const project = data.results.find(p => p.identifier === PLANE_PROJECT_ID);
  
  if (!project) {
    throw new Error(`Project ${PLANE_PROJECT_ID} not found`);
  }

  cachedProjectUUID = project.id;
  return cachedProjectUUID;
}

/**
 * State一覧を取得
 */
async function getStates() {
  const projectUUID = await getProjectUUID();
  const data = await planeRequest(
    `/workspaces/${PLANE_WORKSPACE_SLUG}/projects/${projectUUID}/states/`
  );
  return data.results;
}

/**
 * State名からIDを取得
 */
async function getStateId(stateName) {
  const states = await getStates();
  const state = states.find(s => s.name.toLowerCase() === stateName.toLowerCase());
  return state ? state.id : null;
}

/**
 * Issue一覧を取得
 */
async function listIssues(options = {}) {
  const projectUUID = await getProjectUUID();
  const states = await getStates();
  
  const data = await planeRequest(
    `/workspaces/${PLANE_WORKSPACE_SLUG}/projects/${projectUUID}/issues/`
  );

  // State名を付与
  const stateMap = new Map(states.map(s => [s.id, s]));
  
  return data.results.map(issue => ({
    id: `WBS-${issue.sequence_id}`,
    uuid: issue.id,
    name: issue.name,
    priority: issue.priority,
    state: stateMap.get(issue.state)?.name || 'Unknown',
    stateGroup: stateMap.get(issue.state)?.group || 'unknown',
    createdAt: issue.created_at,
    sequenceId: issue.sequence_id
  }));
}

/**
 * Issueを作成
 */
async function createIssue(name, options = {}) {
  const projectUUID = await getProjectUUID();
  
  const body = {
    name,
    priority: options.priority || 'medium',
    description_html: options.description ? `<p>${options.description}</p>` : '<p></p>'
  };

  // Stateを指定
  if (options.state) {
    const stateId = await getStateId(options.state);
    if (stateId) body.state = stateId;
  }

  const data = await planeRequest(
    `/workspaces/${PLANE_WORKSPACE_SLUG}/projects/${projectUUID}/issues/`,
    {
      method: 'POST',
      body: JSON.stringify(body)
    }
  );

  return {
    id: `WBS-${data.sequence_id}`,
    uuid: data.id,
    name: data.name,
    priority: data.priority
  };
}

/**
 * 複数Issueを一括作成
 */
async function createIssuesBatch(issues) {
  const results = [];
  for (const issue of issues) {
    try {
      const result = await createIssue(issue.name, issue);
      results.push({ success: true, ...result });
      // Rate limit対策
      await new Promise(r => setTimeout(r, 200));
    } catch (error) {
      results.push({ success: false, name: issue.name, error: error.message });
    }
  }
  return results;
}

/**
 * IssueのStateを更新
 */
async function updateIssueState(issueId, newState) {
  const projectUUID = await getProjectUUID();
  const stateId = await getStateId(newState);
  
  if (!stateId) {
    throw new Error(`State "${newState}" not found`);
  }

  // WBS-XX形式からUUIDを取得
  const issues = await listIssues();
  const issue = issues.find(i => i.id === issueId);
  
  if (!issue) {
    throw new Error(`Issue ${issueId} not found`);
  }

  await planeRequest(
    `/workspaces/${PLANE_WORKSPACE_SLUG}/projects/${projectUUID}/issues/${issue.uuid}/`,
    {
      method: 'PATCH',
      body: JSON.stringify({ state: stateId })
    }
  );

  return { id: issueId, newState };
}

module.exports = {
  listIssues,
  createIssue,
  createIssuesBatch,
  updateIssueState,
  getStates,
  getStateId
};

