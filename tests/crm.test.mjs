import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const server = await createServer({
  root: fileURLToPath(new URL('../', import.meta.url)),
  configFile: false,
  logLevel: 'error',
  appType: 'custom',
  server: { middlewareMode: true, watch: null },
  optimizeDeps: { noDiscovery: true, include: [], entries: [] },
  esbuild: { jsx: 'automatic' },
});
after(() => server.close());

const { getLeadGuidance } = await server.ssrLoadModule('/src/features/crm/leadGuidance.ts');
const { getLeadScore } = await server.ssrLoadModule('/src/features/crm/leadScore.ts');
const { getEditableLeadSources, getLeadSourceLabel } = await server.ssrLoadModule('/src/features/crm/leadSources.ts');
const { LeadConsultationPanel } = await server.ssrLoadModule('/src/features/crm/components/LeadConsultationPanel.tsx');
const { LeadOverviewStats } = await server.ssrLoadModule('/src/features/crm/components/LeadOverviewStats.tsx');

const untouched = {
  id: 1, status: 'interested', last_contacted: null,
  aiScore: { probability_score: 97.69, positive_factors: [], negative_factors: [] },
  aiAssessment: { model_status: 'scored', scoring_stage: 'initial', assessment_basis: 'profile_only', score_type: 'public_dataset_model_score',
    conversion_probability: .9769, features: { Has_Contact_Activity: false, Last_Engagement_Status: 'unknown', Call_Attempt_Count: 0 } },
};
const contacted = (response, score = .9, state = 'scored') => ({
  ...untouched, last_contacted: new Date().toISOString(),
  aiAssessment: { ...untouched.aiAssessment, scoring_stage: 'post_contact', model_status: state, conversion_probability: score,
    features: { Has_Contact_Activity: true, Last_Engagement_Status: response, Call_Attempt_Count: 1 } },
});

test('an untouched 97.69% lead still needs verification, even in the interested stage', () => {
  const guidance = getLeadGuidance(untouched);
  assert.equal(guidance.title, 'Xác minh nhu cầu trước');
  assert.match(guidance.reason, /chưa có liên hệ/);
  assert.equal(guidance.closed, false);
});
test('registration advice requires positive contact evidence and a current high score', () => {
  assert.equal(getLeadGuidance(contacted('positive_interaction')).title, 'Hỗ trợ khách đi đến đăng ký');
  assert.notEqual(getLeadGuidance(contacted('positive_interaction', .9, 'stale')).title, 'Hỗ trợ khách đi đến đăng ký');
});
test('a low score triggers questions about obstacles, not abandonment', () => {
  const guidance = getLeadGuidance(contacted('interested_need_time', .1));
  assert.equal(guidance.title, 'Tìm hiểu điều còn vướng');
  assert.equal(guidance.closed, false);
});
test('a recorded refusal takes precedence over an older positive snapshot', () => {
  const guidance = getLeadGuidance(contacted('positive_interaction'), [{ type: 'call', engagement_status: 'rejected' }]);
  assert.equal(guidance.title, 'Làm rõ lý do từ chối');
  assert.match(guidance.action, /khách đồng ý/);
});
test('internal notes and a legacy contact timestamp do not invent contact evidence', () => {
  const guidance = getLeadGuidance({ ...untouched, last_contacted: new Date().toISOString() }, [{ type: 'note', engagement_status: 'positive_interaction' }]);
  assert.equal(guidance.title, 'Xác minh nhu cầu trước');
});
test('closed leads do not receive acquisition guidance', () => {
  assert.equal(getLeadGuidance({ ...untouched, status: 'lost' }).closed, true);
  assert.equal(getLeadGuidance({ ...untouched, status: 'enrolled' }).closed, true);
});
test('the rendered initial score explains the assessment stage and next conversation', () => {
  const html = renderToStaticMarkup(createElement(LeadConsultationPanel, { lead: untouched, activities: [], onScore: () => {}, loading: false }));
  assert.match(html, /Xác minh nhu cầu trước/);
  assert.match(html, /Đánh giá ban đầu/);
  assert.match(html, /Gợi ý trao đổi/);
  assert.doesNotMatch(html, /Snapshot:/);
});
test('overview cards use actual registration counts, not AI-weighted revenue', () => {
  const html = renderToStaticMarkup(createElement(LeadOverviewStats, { data: { summary: { totalLeads: 10, enrolledCount: 4, activePipelineCount: 6, staleLeadsCount: 2, unassignedCount: 1, weightedPipelineValue: 987654321 } }, manager: true }));
  assert.match(html, /Đã đăng ký/);
  assert.match(html, /40/);
  assert.match(html, /1 lead chưa phân công/);
  assert.doesNotMatch(html, /987654321/);
});
test('a measured sub-one-percent score is not multiplied a second time', () => {
  assert.equal(getLeadScore({ aiScore: { probability_score: .5 } }), .5);
  assert.equal(getLeadScore({ aiScore: null }), null);
  assert.equal(getLeadScore(untouched), 97.69);
});
test('source labels match the API catalog while historical values remain unchanged', () => {
  const sources = [{ value: 'website_organic', label: 'Website Organic', legacy: false }, { value: 'Old campaign', label: 'Old campaign', legacy: true }];
  assert.equal(getLeadSourceLabel('website_organic', sources), 'Website Organic');
  assert.equal(getLeadSourceLabel('Unlisted historical value', sources), 'Unlisted historical value');
  assert.equal(getEditableLeadSources(sources).some(source => source.value === 'Old campaign'), false);
  assert.equal(getEditableLeadSources(sources, 'Old campaign').some(source => source.value === 'Old campaign'), true);
});
