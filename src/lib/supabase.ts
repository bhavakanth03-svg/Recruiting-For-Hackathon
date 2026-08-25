import { createClient, RealtimeChannel } from '@supabase/supabase-js';
import { CandidateSubmission } from '../types';

// Supabase URL & Key with environment variable resolution and static fallbacks
export const SUPABASE_URL =
  (typeof import.meta !== 'undefined' && (import.meta as any).env && (import.meta as any).env.VITE_SUPABASE_URL) ||
  'https://bgiejmsrrajbqjltvmrd.supabase.co';

export const SUPABASE_ANON_KEY =
  (typeof import.meta !== 'undefined' && (import.meta as any).env && (import.meta as any).env.VITE_SUPABASE_ANON_KEY) ||
  'sb_publishable_Is7RYdS71KAbQdRiMBRyZg_NdTcXSAb';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  realtime: {
    params: {
      eventsPerSecond: 20
    }
  }
});

const CHANNEL_NAME = 'evalpulse-crucible-sync';
let syncChannel: RealtimeChannel | null = null;
let isChannelSubscribed = false;
let isChannelInitializing = false;

type CandidateUpdateCallback = (candidate: CandidateSubmission | Partial<CandidateSubmission>) => void;
type CandidateListCallback = (candidates: CandidateSubmission[]) => void;
type PeerCountCallback = (count: number) => void;

const updateListeners: Set<CandidateUpdateCallback> = new Set();
const snapshotListeners: Set<CandidateListCallback> = new Set();
const peerListeners: Set<PeerCountCallback> = new Set();
const resetListeners: Set<() => void> = new Set();

/**
 * Ensures the singleton Supabase Realtime channel is initialized only once
 */
function ensureChannelInitialized() {
  if (syncChannel || isChannelInitializing) {
    return syncChannel;
  }

  isChannelInitializing = true;

  try {
    const channel = supabase.channel(CHANNEL_NAME, {
      config: {
        broadcast: { ack: true },
        presence: { key: 'evalpulse-client' }
      }
    });

    // 0. Listen for Candidate List Reset (Fresh start)
    channel.on('broadcast', { event: 'CANDIDATE_LIST_RESET' }, () => {
      try {
        localStorage.removeItem('evalpulse_all_candidates');
      } catch {}
      resetListeners.forEach((cb) => {
        try { cb(); } catch (e) { console.warn('Reset listener error:', e); }
      });
    });

    // 1. Listen for Live Candidate Progress
    channel.on('broadcast', { event: 'CANDIDATE_PROGRESS' }, (payload) => {
      if (payload?.payload?.candidate) {
        const candidate: CandidateSubmission = payload.payload.candidate;
        updateListeners.forEach((cb) => {
          try { cb(candidate); } catch (e) { console.warn('Listener error:', e); }
        });
      }
    });

    // 2. Listen for Candidate Final Submission
    channel.on('broadcast', { event: 'CANDIDATE_SUBMITTED' }, (payload) => {
      if (payload?.payload?.candidate) {
        const candidate: CandidateSubmission = payload.payload.candidate;
        updateListeners.forEach((cb) => {
          try { cb(candidate); } catch (e) { console.warn('Listener error:', e); }
        });
      }
    });

    // 3. Listen for Candidate Evaluation & Grading by Creator
    channel.on('broadcast', { event: 'CANDIDATE_EVALUATED' }, (payload) => {
      if (payload?.payload?.candidate) {
        const candidate: CandidateSubmission = payload.payload.candidate;
        updateListeners.forEach((cb) => {
          try { cb(candidate); } catch (e) { console.warn('Listener error:', e); }
        });
      }
    });

    // 4. Listen for Snapshot Requests & Replies
    channel.on('broadcast', { event: 'REQUEST_SYNC' }, () => {
      try {
        const savedRaw = localStorage.getItem('evalpulse_all_candidates');
        if (savedRaw) {
          const list: CandidateSubmission[] = JSON.parse(savedRaw);
          if (Array.isArray(list) && list.length > 0) {
            sendSupabaseSnapshot(list);
          }
        }
      } catch {}
    });

    channel.on('broadcast', { event: 'SYNC_SNAPSHOT' }, (payload) => {
      if (payload?.payload?.candidates && Array.isArray(payload.payload.candidates)) {
        const list: CandidateSubmission[] = payload.payload.candidates;
        snapshotListeners.forEach((cb) => {
          try { cb(list); } catch (e) { console.warn('Listener error:', e); }
        });
      }
    });

    // 5. Presence state tracking
    channel.on('presence', { event: 'sync' }, () => {
      try {
        const state = channel.presenceState();
        const peerCount = Object.keys(state).length;
        peerListeners.forEach((cb) => {
          try { cb(peerCount); } catch (e) { console.warn('Listener error:', e); }
        });
      } catch {}
    });

    // 6. Realtime Postgres DB Changes on 'candidates' Table
    try {
      supabase
        .channel('candidates-db-live')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'candidates' },
          (payload: any) => {
            if (payload?.new) {
              const row = payload.new;
              let candidate: CandidateSubmission | null = null;
              if (row.raw_data && typeof row.raw_data === 'object') {
                candidate = row.raw_data as CandidateSubmission;
              } else if (row.id) {
                candidate = {
                  id: row.id,
                  candidateCode: row.candidate_code || 'CANDIDATE-2025',
                  details: row.details || {
                    fullName: row.full_name || 'Candidate',
                    email: row.email || '',
                    phone: row.phone || '',
                    role: row.role || 'Full Stack Developer',
                    schoolName: row.school_name || '',
                    standard: row.standard || '',
                    githubProfile: row.github_profile || ''
                  },
                  status: row.status || 'submitted',
                  answers: row.answers || [],
                  evaluation: row.evaluation,
                  startedAt: row.started_at,
                  submittedAt: row.submitted_at || row.updated_at,
                  timeSpentSeconds: row.time_spent_seconds || 1800
                };
              }
              if (candidate) {
                updateListeners.forEach((cb) => {
                  try { cb(candidate!); } catch (e) {}
                });
              }
            }
          }
        )
        .subscribe();
    } catch {}

    // Subscribe to broadcast channel
    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        isChannelSubscribed = true;
        isChannelInitializing = false;
        try {
          await channel.track({
            onlineAt: new Date().toISOString()
          });
        } catch {}

        // Request initial snapshot from online peers
        requestSupabaseSnapshot();
      }
    });

    syncChannel = channel;
  } catch (err) {
    console.warn('Failed to initialize Supabase channel:', err);
    isChannelInitializing = false;
  }

  return syncChannel;
}

/**
 * Register callbacks for Supabase Realtime synchronization
 */
export function initSupabaseSync(options?: {
  role?: 'candidate' | 'creator' | 'guest';
  candidateName?: string;
  onCandidateUpdated?: CandidateUpdateCallback;
  onSnapshotReceived?: CandidateListCallback;
  onPeerCountChange?: PeerCountCallback;
  onCandidateListReset?: () => void;
}) {
  if (options?.onCandidateUpdated) updateListeners.add(options.onCandidateUpdated);
  if (options?.onSnapshotReceived) snapshotListeners.add(options.onSnapshotReceived);
  if (options?.onPeerCountChange) peerListeners.add(options.onPeerCountChange);
  if (options?.onCandidateListReset) resetListeners.add(options.onCandidateListReset);

  ensureChannelInitialized();

  if (isChannelSubscribed) {
    requestSupabaseSnapshot();
    if (options?.role) {
      try {
        syncChannel?.track({
          role: options.role,
          name: options.candidateName || 'User',
          onlineAt: new Date().toISOString()
        });
      } catch {}
    }
  }

  return () => {
    if (options?.onCandidateUpdated) updateListeners.delete(options.onCandidateUpdated);
    if (options?.onSnapshotReceived) snapshotListeners.delete(options.onSnapshotReceived);
    if (options?.onPeerCountChange) peerListeners.delete(options.onPeerCountChange);
    if (options?.onCandidateListReset) resetListeners.delete(options.onCandidateListReset);
  };
}

/**
 * Fetch all candidate responses directly from Supabase DB table
 */
export async function fetchCandidatesFromSupabase(): Promise<CandidateSubmission[]> {
  try {
    const { data, error } = await supabase
      .from('candidates')
      .select('*')
      .order('updated_at', { ascending: false });

    if (error) {
      // Table might not exist yet if user hasn't run the SQL script
      console.warn('Supabase candidates table query status:', error.message);
      return [];
    }

    if (Array.isArray(data) && data.length > 0) {
      const parsed: CandidateSubmission[] = data.map((row: any) => {
        if (row.raw_data && typeof row.raw_data === 'object' && row.raw_data.id) {
          return row.raw_data as CandidateSubmission;
        }
        return {
          id: row.id,
          candidateCode: row.candidate_code || 'CANDIDATE-2025',
          details: row.details || {
            fullName: row.full_name || 'Candidate',
            email: row.email || '',
            phone: row.phone || '',
            role: row.role || 'Full Stack Developer',
            schoolName: row.school_name || '',
            standard: row.standard || '',
            githubProfile: row.github_profile || ''
          },
          status: row.status || 'submitted',
          answers: Array.isArray(row.answers) ? row.answers : [],
          evaluation: row.evaluation || (row.score !== null && row.score !== undefined ? {
            mcqScore: row.score || 0,
            websitePromptDesign: 14,
            websitePromptFunctionality: 13,
            totalScore: row.score || 0,
            grade: row.grade || 'A',
            badge: row.badge || 'Certified CS Scholar',
            feedback: row.evaluator_feedback || '',
            evaluatedAt: row.evaluated_at || new Date().toISOString(),
            evaluatedBy: row.evaluator_name || 'Evaluator',
            isPublishedToLeaderboard: row.is_published !== false
          } : undefined),
          startedAt: row.started_at || row.created_at || new Date().toISOString(),
          submittedAt: row.submitted_at || row.updated_at || new Date().toISOString(),
          timeSpentSeconds: Number(row.time_spent_seconds) || 1800
        };
      });
      return parsed;
    }
  } catch (err) {
    console.warn('Supabase DB fetch error:', err);
  }
  return [];
}

/**
 * Upsert a candidate submission directly to Supabase DB table
 */
export async function saveCandidateToSupabase(candidate: CandidateSubmission) {
  if (!candidate || !candidate.id) return;
  try {
    const payload = {
      id: candidate.id,
      candidate_code: candidate.candidateCode || 'CANDIDATE-2025',
      full_name: candidate.details?.fullName || 'Candidate',
      email: candidate.details?.email || '',
      phone: candidate.details?.phone || '',
      role: candidate.details?.role || 'Full Stack Developer',
      school_name: candidate.details?.schoolName || '',
      standard: candidate.details?.standard || '',
      github_profile: candidate.details?.githubProfile || '',
      status: candidate.status || 'submitted',
      score: candidate.evaluation?.totalScore ?? null,
      grade: candidate.evaluation?.grade ?? null,
      badge: candidate.evaluation?.badge ?? null,
      evaluator_feedback: candidate.evaluation?.feedback ?? null,
      evaluator_name: candidate.evaluation?.evaluatedBy ?? null,
      evaluated_at: candidate.evaluation?.evaluatedAt ?? null,
      is_published: candidate.evaluation?.isPublishedToLeaderboard ?? true,
      time_spent_seconds: candidate.timeSpentSeconds ?? 0,
      answers: candidate.answers || [],
      evaluation: candidate.evaluation || null,
      details: candidate.details || {},
      raw_data: candidate,
      updated_at: new Date().toISOString()
    };

    const { error } = await supabase
      .from('candidates')
      .upsert(payload, { onConflict: 'id' });

    if (error) {
      console.warn('Supabase DB upsert notification:', error.message);
    }
  } catch (err) {
    console.warn('Supabase DB upsert exception:', err);
  }
}

/**
 * Upsert a batch of candidates to Supabase DB
 */
export async function saveCandidateBatchToSupabase(candidatesList: CandidateSubmission[]) {
  if (!Array.isArray(candidatesList) || candidatesList.length === 0) return;
  try {
    const rows = candidatesList.map((candidate) => ({
      id: candidate.id,
      candidate_code: candidate.candidateCode || 'CANDIDATE-2025',
      full_name: candidate.details?.fullName || 'Candidate',
      email: candidate.details?.email || '',
      phone: candidate.details?.phone || '',
      role: candidate.details?.role || 'Full Stack Developer',
      school_name: candidate.details?.schoolName || '',
      standard: candidate.details?.standard || '',
      github_profile: candidate.details?.githubProfile || '',
      status: candidate.status || 'submitted',
      score: candidate.evaluation?.totalScore ?? null,
      grade: candidate.evaluation?.grade ?? null,
      badge: candidate.evaluation?.badge ?? null,
      evaluator_feedback: candidate.evaluation?.feedback ?? null,
      evaluator_name: candidate.evaluation?.evaluatedBy ?? null,
      evaluated_at: candidate.evaluation?.evaluatedAt ?? null,
      is_published: candidate.evaluation?.isPublishedToLeaderboard ?? true,
      time_spent_seconds: candidate.timeSpentSeconds ?? 0,
      answers: candidate.answers || [],
      evaluation: candidate.evaluation || null,
      details: candidate.details || {},
      raw_data: candidate,
      updated_at: new Date().toISOString()
    }));

    const { error } = await supabase
      .from('candidates')
      .upsert(rows, { onConflict: 'id' });

    if (error) {
      console.warn('Supabase batch upsert notification:', error.message);
    }
  } catch (err) {
    console.warn('Supabase batch upsert exception:', err);
  }
}

/**
 * Broadcast Candidate live progress across all devices via Supabase
 */
export async function broadcastCandidateProgressViaSupabase(candidate: Partial<CandidateSubmission>) {
  ensureChannelInitialized();
  try {
    if (syncChannel && isChannelSubscribed) {
      await syncChannel.send({
        type: 'broadcast',
        event: 'CANDIDATE_PROGRESS',
        payload: {
          candidate,
          timestamp: new Date().toISOString()
        }
      });
    }
  } catch (err) {
    console.warn('Supabase broadcast progress error:', err);
  }
}

/**
 * Broadcast Candidate Final Submission across all devices via Supabase & Save to DB
 */
export async function broadcastCandidateSubmissionViaSupabase(candidate: Partial<CandidateSubmission>) {
  ensureChannelInitialized();
  try {
    if (candidate && candidate.id) {
      saveCandidateToSupabase(candidate as CandidateSubmission);
    }
    if (syncChannel && isChannelSubscribed) {
      await syncChannel.send({
        type: 'broadcast',
        event: 'CANDIDATE_SUBMITTED',
        payload: {
          candidate,
          timestamp: new Date().toISOString()
        }
      });
    }
  } catch (err) {
    console.warn('Supabase broadcast submission error:', err);
  }
}

/**
 * Broadcast Candidate Evaluation results across all devices via Supabase & Save to DB
 */
export async function broadcastCandidateEvaluationViaSupabase(candidate: Partial<CandidateSubmission>) {
  ensureChannelInitialized();
  try {
    if (candidate && candidate.id) {
      saveCandidateToSupabase(candidate as CandidateSubmission);
    }
    if (syncChannel && isChannelSubscribed) {
      await syncChannel.send({
        type: 'broadcast',
        event: 'CANDIDATE_EVALUATED',
        payload: {
          candidate,
          timestamp: new Date().toISOString()
        }
      });
    }
  } catch (err) {
    console.warn('Supabase broadcast evaluation error:', err);
  }
}

/**
 * Request candidate list snapshot from other online devices via Supabase
 */
export async function requestSupabaseSnapshot() {
  if (!syncChannel || !isChannelSubscribed) return;
  try {
    await syncChannel.send({
      type: 'broadcast',
      event: 'REQUEST_SYNC',
      payload: { requestedAt: new Date().toISOString() }
    });
  } catch {}
}

/**
 * Delete all candidates from Supabase DB table
 */
export async function deleteAllCandidatesFromSupabase(): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('candidates')
      .delete()
      .neq('id', '___non_existent_id___'); // PostgreSQL delete-all condition
    if (error) {
      console.warn('Supabase DB delete-all notice:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('Supabase DB delete-all exception:', err);
    return false;
  }
}

/**
 * Broadcast Candidate List Reset event across all devices via Supabase
 */
export async function broadcastCandidateListResetViaSupabase() {
  ensureChannelInitialized();
  try {
    if (syncChannel && isChannelSubscribed) {
      await syncChannel.send({
        type: 'broadcast',
        event: 'CANDIDATE_LIST_RESET',
        payload: {
          timestamp: new Date().toISOString()
        }
      });
    }
  } catch (err) {
    console.warn('Supabase broadcast reset error:', err);
  }
}

/**
 * Send full candidate snapshot to peer devices via Supabase & Save to DB
 */
export async function sendSupabaseSnapshot(candidates: CandidateSubmission[]) {
  if (!Array.isArray(candidates) || candidates.length === 0) return;
  try {
    saveCandidateBatchToSupabase(candidates);
    if (syncChannel && isChannelSubscribed) {
      await syncChannel.send({
        type: 'broadcast',
        event: 'SYNC_SNAPSHOT',
        payload: {
          candidates,
          timestamp: new Date().toISOString()
        }
      });
    }
  } catch {}
}
