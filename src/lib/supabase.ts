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
let isChannelSubscribed = false;
let isChannelInitializing = false;

type CandidateUpdateCallback = (candidate: CandidateSubmission | Partial<CandidateSubmission>) => void;
type CandidateListCallback = (candidates: CandidateSubmission[]) => void;
type PeerCountCallback = (count: number) => void;

const updateListeners: Set<CandidateUpdateCallback> = new Set();
const snapshotListeners: Set<CandidateListCallback> = new Set();
const peerListeners: Set<PeerCountCallback> = new Set();

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

    // Subscribe ONLY ONCE
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
}) {
  if (options?.onCandidateUpdated) updateListeners.add(options.onCandidateUpdated);
  if (options?.onSnapshotReceived) snapshotListeners.add(options.onSnapshotReceived);
  if (options?.onPeerCountChange) peerListeners.add(options.onPeerCountChange);

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
  };
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
 * Broadcast Candidate Final Submission across all devices via Supabase
 */
export async function broadcastCandidateSubmissionViaSupabase(candidate: Partial<CandidateSubmission>) {
  ensureChannelInitialized();
  try {
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
 * Broadcast Candidate Evaluation results across all devices via Supabase
 */
export async function broadcastCandidateEvaluationViaSupabase(candidate: Partial<CandidateSubmission>) {
  ensureChannelInitialized();
  try {
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
 * Send full candidate snapshot to peer devices via Supabase
 */
export async function sendSupabaseSnapshot(candidates: CandidateSubmission[]) {
  if (!syncChannel || !isChannelSubscribed || !Array.isArray(candidates) || candidates.length === 0) return;
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
