// The AI service and DB store percentages on a 0..100 scale, including values
// below 1%. Missing scores are distinct from a measured zero.
export function getLeadScore(lead: any): number | null {
  const probability = lead?.aiAssessment?.conversion_probability;
  if (typeof probability === 'number' && Number.isFinite(probability) && probability >= 0 && probability <= 1) {
    return Math.round(probability * 10000) / 100;
  }
  const value = lead?.aiScore?.probability_score;
  if (value === null || value === undefined || value === '') return null;
  const score = Number(value);
  return Number.isFinite(score) && score >= 0 && score <= 100 ? score : null;
}

export function getLeadAssessmentLabel(lead: any): string {
  const assessment = lead?.aiAssessment;
  if (assessment?.scoring_stage === 'initial') return 'Đánh giá ban đầu';
  if (assessment?.assessment_basis === 'response_pending') return 'Đã liên hệ, chưa có kết quả';
  if (assessment?.scoring_stage === 'post_contact') return 'Đánh giá sau tương tác';
  return 'Cần cập nhật đánh giá';
}

export function getScoreTagColor(score: number | null): string {
  if (score === null) return 'default';
  return score >= 80 ? 'green' : score >= 50 ? 'orange' : 'red';
}
