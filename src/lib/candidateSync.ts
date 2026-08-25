import { CandidateSubmission } from '../types';

/**
 * Robust Canonical Candidate Merger
 * Merges two candidate lists or updates a candidate in a list by:
 * 1. Primary match on unique candidate 'id'
 * 2. Secondary match on case-insensitive normalized 'email'
 * 3. Deep-merging candidate details, answers, evaluations, and timestamps
 * 4. Preserving the newest timestamps and complete answer arrays
 */
export function mergeCandidateLists(
  existingList: CandidateSubmission[],
  incomingList: CandidateSubmission[]
): CandidateSubmission[] {
  if (!Array.isArray(existingList)) existingList = [];
  if (!Array.isArray(incomingList) || incomingList.length === 0) return existingList;

  // Map keyed by canonical ID
  const idMap = new Map<string, CandidateSubmission>();
  // Map keyed by normalized email
  const emailMap = new Map<string, string>(); // email -> canonical ID

  // 1. Index Existing Candidates
  existingList.forEach((cand) => {
    if (!cand || !cand.id) return;
    const cid = cand.id.trim();
    idMap.set(cid, cand);
    if (cand.details?.email) {
      const normEmail = cand.details.email.trim().toLowerCase();
      if (normEmail) emailMap.set(normEmail, cid);
    }
  });

  // 2. Merge Incoming Candidates
  incomingList.forEach((incoming) => {
    if (!incoming || !incoming.id) return;
    const incId = incoming.id.trim();
    const normEmail = incoming.details?.email?.trim().toLowerCase() || '';

    // Locate existing match by id or by email
    let targetId = idMap.has(incId) ? incId : (normEmail && emailMap.has(normEmail) ? emailMap.get(normEmail)! : null);

    if (targetId && idMap.has(targetId)) {
      const existing = idMap.get(targetId)!;

      // Determine which has more complete answers
      const existingAnswersCount = Array.isArray(existing.answers) ? existing.answers.length : 0;
      const incomingAnswersCount = Array.isArray(incoming.answers) ? incoming.answers.length : 0;
      const resolvedAnswers = incomingAnswersCount >= existingAnswersCount ? incoming.answers : existing.answers;

      // Determine status and evaluation (favor evaluated status if present)
      const isEvaluated = incoming.status === 'evaluated' || existing.status === 'evaluated';
      const resolvedStatus = isEvaluated ? 'evaluated' : (incoming.status || existing.status || 'submitted');
      const resolvedEvaluation = incoming.evaluation || existing.evaluation || null;

      // Timestamp resolution
      const timeSpent = Math.max(existing.timeSpentSeconds || 0, incoming.timeSpentSeconds || 0);

      const merged: CandidateSubmission = {
        ...existing,
        ...incoming,
        id: targetId, // maintain stable canonical id
        candidateCode: incoming.candidateCode || existing.candidateCode || 'CANDIDATE-2025',
        details: {
          ...existing.details,
          ...(incoming.details || {})
        },
        status: resolvedStatus,
        answers: resolvedAnswers,
        evaluation: resolvedEvaluation,
        timeSpentSeconds: timeSpent,
        startedAt: existing.startedAt || incoming.startedAt,
        submittedAt: incoming.submittedAt || existing.submittedAt,
        emailDispatched: incoming.emailDispatched || existing.emailDispatched,
        emailDispatchedAt: incoming.emailDispatchedAt || existing.emailDispatchedAt
      };

      idMap.set(targetId, merged);
      if (merged.details?.email) {
        emailMap.set(merged.details.email.trim().toLowerCase(), targetId);
      }
    } else {
      // New candidate
      idMap.set(incId, incoming);
      if (normEmail) {
        emailMap.set(normEmail, incId);
      }
    }
  });

  return Array.from(idMap.values());
}

/**
 * Merge a single candidate into an existing list
 */
export function mergeSingleCandidate(
  existingList: CandidateSubmission[],
  incoming: CandidateSubmission
): CandidateSubmission[] {
  if (!incoming || !incoming.id) return existingList;
  return mergeCandidateLists(existingList, [incoming]);
}
