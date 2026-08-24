import { createClient, RealtimeChannel } from '@supabase/supabase-js';
import { CandidateSubmission } from '../types';

export const SUPABASE_URL = 'https://bgiejmsrrajbqjltvmrd.supabase.co';
export const SUPABASE_ANON_KEY = 'sb_publishable_Is7RYdS71KAbQdRiMBRyZg_NdTcXSAb';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  realtime: {
    params: {
      eventsPerSecond: 20
    }
  }
});

const CHANNEL_NAME = 'evalpulse-crucible-sync';
let syncChannel: RealtimeChannel | null = null;
let isSubscribed = false;

type CandidateUpdateCallback = (candidate: CandidateSubmission | Partial<CandidateSubmission>) => void;
type CandidateListCallback = (candidates: CandidateSubmission[]) => void;
type PeerCountCallback = (count: number) => void;

const updateListeners: Set<CandidateUpdateCallback> = new Set();
const snapshotListeners: Set<CandidateListCallback> = new Set();
const peerListeners: Set<PeerCountCallback> = new Set();

/**
 * Initialize Supabase Realtime Channel for multi-device instant synchronization
 */
export function initSupabaseSync(options?: {
  role?: 'candidate' | 'creator' | 'guest';
  candidateName?: string;
  onCandidateUpdated?: CandidateUpdateCallback;
  onSnapshotReceived?: CandidateListCallback;
  onPeerCountChange?: PeerCountCallback;
}) {
  if (options?.onCandidateUpdated) updateListeners.add(options.onCandidateUpdated);
  if (options?.onSnapshotReceived) snapshotListeners.add(options.onSnapshotReceived);
  if (options?.onPeerCountChange) peerListeners.add(options.onPeerCountChange);

  if (syncChannel && isSubscribed) {
    // Already active, trigger sync request
    requestSupabaseSnapshot();
    return syncChannel;
  }

  syncChannel = supabase.channel(CHANNEL_NAME, {
    config: {
      broadcast: { ack: true },
      presence: { key: options?.role || 'user' }
    }
  });

  // 1. Listen for Live Candidate Progress (as candidate writes responses/MCQs/Q25)
  syncChannel.on('broadcast', { event: 'CANDIDATE_PROGRESS' }, (payload) => {
    if (payload?.payload?.candidate) {
      const candidate: CandidateSubmission = payload.payload.candidate;
      updateListeners.forEach((cb) => cb(candidate));
    }
  });

  // 2. Listen for Candidate Final Submission
  syncChannel.on('broadcast', { event: 'CANDIDATE_SUBMITTED' }, (payload) => {
    if (payload?.payload?.candidate) {
      const candidate: CandidateSubmission = payload.payload.candidate;
      updateListeners.forEach((cb) => cb(candidate));
    }
  });

  // 3. Listen for Candidate Evaluation & Grading by Creator
  syncChannel.on('broadcast', { event: 'CANDIDATE_EVALUATED' }, (payload) => {
    if (payload?.payload?.candidate) {
      const candidate: CandidateSubmission = payload.payload.candidate;
      updateListeners.forEach((cb) => cb(candidate));
    }
  });

  // 4. Listen for Snapshot Requests & Replies
  syncChannel.on('broadcast', { event: 'REQUEST_SYNC' }, () => {
    // If we have saved candidates in localStorage or memory, share with the requesting device
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

  syncChannel.on('broadcast', { event: 'SYNC_SNAPSHOT' }, (payload) => {
    if (payload?.payload?.candidates && Array.isArray(payload.payload.candidates)) {
      const list: CandidateSubmission[] = payload.payload.candidates;
      snapshotListeners.forEach((cb) => cb(list));
    }
  });

  // 5. Presence state tracking for active cross-device users
  syncChannel.on('presence', { event: 'sync' }, () => {
    if (syncChannel) {
      const state = syncChannel.presenceState();
      const peerCount = Object.keys(state).length;
      peerListeners.forEach((cb) => cb(peerCount));
    }
  });

  syncChannel.subscribe(async (status) => {
    if (status === 'SUBSCRIBED') {
      isSubscribed = true;
      try {
        await syncChannel?.track({
          role: options?.role || 'user',
          name: options?.candidateName || 'Anonymous Device',
          onlineAt: new Date().toISOString()
        });
      } catch {}

      // Request latest candidates snapshot from any active peer or server
      requestSupabaseSnapshot();
    }
  });

  return syncChannel;
}

/**
 * Broadcast Candidate live progress across all devices via Supabase
 */
export async function broadcastCandidateProgressViaSupabase(candidate: Partial<CandidateSubmission>) {
  if (!syncChannel) initSupabaseSync();
  try {
    if (syncChannel) {
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
 * Broadcast Candidate Final Submission across all devices via Supabase
 */
export async function broadcastCandidateSubmissionViaSupabase(candidate: Partial<CandidateSubmission>) {
  if (!syncChannel) initSupabaseSync();
  try {
    if (syncChannel) {
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
 * Broadcast Candidate Evaluation results across all devices via Supabase
 */
export async function broadcastCandidateEvaluationViaSupabase(candidate: Partial<CandidateSubmission>) {
  if (!syncChannel) initSupabaseSync();
  try {
    if (syncChannel) {
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
  if (!syncChannel) return;
  try {
    await syncChannel.send({
      type: 'broadcast',
      event: 'REQUEST_SYNC',
      payload: { requestedAt: new Date().toISOString() }
    });
  } catch {}
}

/**
 * Send full candidate snapshot to peer devices via Supabase
 */
export async function sendSupabaseSnapshot(candidates: CandidateSubmission[]) {
  if (!syncChannel || !Array.isArray(candidates) || candidates.length === 0) return;
  try {
    await syncChannel.send({
      type: 'broadcast',
      event: 'SYNC_SNAPSHOT',
      payload: {
        candidates,
        timestamp: new Date().toISOString()
      }
    });
  } catch {}
}
