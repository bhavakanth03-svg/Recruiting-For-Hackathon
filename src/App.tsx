import React, { useState, useEffect, useRef, Suspense, lazy } from 'react';
import { Navbar } from './components/Navbar';
import { LoginModal } from './components/LoginModal';
import { ToastContainer, ToastMessage } from './components/ToastContainer';
import {
  UserRole,
  CandidateSubmission,
  LeaderboardEntry,
  EmailNotification,
  CandidateDetails,
  CandidateAnswer,
  ServerEvent
} from './types';
import {
  verifyAccessCode,
  fetchCandidates,
  fetchCandidateById,
  submitAssessment,
  evaluateCandidate,
  fetchLeaderboard,
  fetchEmails,
  subscribeToRealTimeEvents,
  computeLeaderboardFromCandidates,
  clearAllCandidatesData,
  grantCandidateRewrite
} from './lib/api';
import {
  mergeCandidateLists,
  mergeSingleCandidate
} from './lib/candidateSync';
import {
  initSupabaseSync,
  broadcastCandidateSubmissionViaSupabase,
  broadcastCandidateEvaluationViaSupabase,
  requestSupabaseSnapshot,
  sendSupabaseSnapshot
} from './lib/supabase';
import { INITIAL_CANDIDATE_SUBMISSIONS, INITIAL_EMAIL_NOTIFICATIONS } from './data/defaultData';
import { Sparkles, Shield, UserCheck, Trophy, ArrowRight, CheckCircle2, Lock, Flame, Phone, User } from 'lucide-react';

// Lazy loaded heavy components for optimal performance
const CandidateAssessment = lazy(() =>
  import('./components/CandidateAssessment').then((m) => ({ default: m.CandidateAssessment }))
);
const CandidateHome = lazy(() =>
  import('./components/CandidateHome').then((m) => ({ default: m.CandidateHome }))
);
const CreatorDashboard = lazy(() =>
  import('./components/CreatorDashboard').then((m) => ({ default: m.CreatorDashboard }))
);
const Leaderboard = lazy(() =>
  import('./components/Leaderboard').then((m) => ({ default: m.Leaderboard }))
);
const UnitTestModal = lazy(() =>
  import('./components/UnitTestModal').then((m) => ({ default: m.UnitTestModal }))
);
const GoogleWorkspaceModal = lazy(() =>
  import('./components/GoogleWorkspaceModal').then((m) => ({ default: m.GoogleWorkspaceModal }))
);
const SupabaseSqlModal = lazy(() =>
  import('./components/SupabaseSqlModal').then((m) => ({ default: m.SupabaseSqlModal }))
);

export default function App() {
  // Dark mode state
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('evalpulse_theme');
      if (stored) return stored === 'dark';
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  // Role & Authentication state
  const [currentRole, setCurrentRole] = useState<UserRole>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('evalpulse_role') as UserRole) || 'guest';
    }
    return 'guest';
  });
  const [authToken, setAuthToken] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('evalpulse_token') || '';
    }
    return '';
  });

  // Navigation View: 'home' | 'assessment' | 'creator' | 'leaderboard'
  const [activeView, setActiveView] = useState<'home' | 'assessment' | 'creator' | 'leaderboard'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('evalpulse_active_view');
      if (saved && ['home', 'assessment', 'creator', 'leaderboard'].includes(saved)) {
        return saved as 'home' | 'assessment' | 'creator' | 'leaderboard';
      }
    }
    return 'assessment';
  });

  // Modal states
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isUnitTestModalOpen, setIsUnitTestModalOpen] = useState(false);
  const [isWorkspaceModalOpen, setIsWorkspaceModalOpen] = useState(false);
  const [isSqlModalOpen, setIsSqlModalOpen] = useState(false);
  const [workspaceDefaultTab, setWorkspaceDefaultTab] = useState<'drive' | 'contacts' | 'gmail' | 'outbox'>('drive');

  // Application Data States
  const [candidates, setCandidates] = useState<CandidateSubmission[]>(INITIAL_CANDIDATE_SUBMISSIONS);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [emails, setEmails] = useState<EmailNotification[]>(INITIAL_EMAIL_NOTIFICATIONS);
  const [currentCandidateSubmission, setCurrentCandidateSubmission] = useState<CandidateSubmission | null>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('evalpulse_candidate_submission');
        if (saved) return JSON.parse(saved);
      } catch {
        // ignore
      }
    }
    return null;
  });

  // Loading & Action states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Persist active view
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('evalpulse_active_view', activeView);
    }
  }, [activeView]);

  // Persist candidate submission
  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (currentCandidateSubmission) {
        localStorage.setItem('evalpulse_candidate_submission', JSON.stringify(currentCandidateSubmission));
      }
    }
  }, [currentCandidateSubmission]);

  // Apply dark mode class to html element
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('evalpulse_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('evalpulse_theme', 'light');
    }
  }, [isDarkMode]);

  const addToast = (type: ToastMessage['type'], title: string, message?: string) => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, type, title, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  };

  const handleDismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Track candidate IDs that have already triggered a submission toast to prevent repeated popups
  const notifiedSubmissionIdsRef = useRef<Set<string>>(new Set());

  // Load & Synchronize Candidates directly from Supabase Cloud DB as Single Source of Truth
  const loadData = async () => {
    try {
      const cands = await fetchCandidates(authToken);
      if (Array.isArray(cands)) {
        // Seed known submissions so existing records don't trigger toasts on load/sync
        cands.forEach((c) => {
          if (c.id && (c.status === 'submitted' || c.status === 'evaluated')) {
            notifiedSubmissionIdsRef.current.add(c.id);
          }
        });
        setCandidates(cands);
        setLeaderboard(computeLeaderboardFromCandidates(cands));
        try {
          localStorage.setItem('evalpulse_all_candidates', JSON.stringify(cands));
        } catch {}
      }

      const emailList = await fetchEmails();
      if (emailList.length > 0) setEmails(emailList);
    } catch {
      // Fallback in-memory
    }
  };

  useEffect(() => {
    loadData();
  }, [authToken]);

  // Active Multi-Device Background Polling & Multi-Event Visibility Sync
  useEffect(() => {
    // 5-second interval for background sync fallback alongside real-time Supabase push events
    const interval = setInterval(() => {
      loadData();
    }, 5000);

    const handleFocus = () => loadData();
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') loadData();
    };
    const handleOnline = () => loadData();
    const handlePageShow = () => loadData();

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('online', handleOnline);
    window.addEventListener('pageshow', handlePageShow);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('pageshow', handlePageShow);
    };
  }, [authToken]);

  // Real-Time SSE Event Listener Subscription
  useEffect(() => {
    const unsubscribe = subscribeToRealTimeEvents((event: ServerEvent) => {
      if (event.type === 'CANDIDATE_PROGRESS_UPDATED') {
        loadData();
      } else if (event.type === 'CANDIDATE_SUBMITTED') {
        const candId = event.data?.candidateId;
        if (candId && !notifiedSubmissionIdsRef.current.has(candId)) {
          notifiedSubmissionIdsRef.current.add(candId);
          if (currentRole === 'creator') {
            addToast('notification', 'New Assessment Submitted', `${event.data.candidateName} submitted responses for ${event.data.role || 'CS Assessment'}.`);
          }
        }
        loadData();
      } else if (event.type === 'CANDIDATE_EVALUATED') {
        // If the evaluated candidate matches our active session submission, update live!
        if (currentCandidateSubmission && currentCandidateSubmission.id === event.data.candidateId) {
          setCurrentCandidateSubmission((prev) =>
            prev ? { ...prev, status: 'evaluated', evaluation: event.data.evaluation } : null
          );
          addToast('success', 'Your Assessment Score is Ready!', `Score: ${event.data.score}/100 (${event.data.grade}). Check your candidate home page.`);
        }
        loadData();
      } else if (event.type === 'LEADERBOARD_UPDATED') {
        fetchLeaderboard().then((board) => setLeaderboard(board));
      } else if (event.type === 'EMAIL_SENT') {
        fetchEmails().then((em) => setEmails(em));
      }
    });

    return () => {
      unsubscribe();
    };
  }, [currentCandidateSubmission, currentRole]);

  // Supabase Real-Time Multi-Device Cloud Synchronization
  const currentCandidateRef = useRef(currentCandidateSubmission);
  useEffect(() => {
    currentCandidateRef.current = currentCandidateSubmission;
  }, [currentCandidateSubmission]);

  useEffect(() => {
    const cleanup = initSupabaseSync({
      role: currentRole === 'creator' ? 'creator' : 'candidate',
      onCandidateUpdated: (incoming) => {
        if (!incoming || !incoming.id) return;
        setCandidates((prev) => {
          const updated = mergeSingleCandidate(prev, incoming as CandidateSubmission);
          setLeaderboard(computeLeaderboardFromCandidates(updated));
          try {
            localStorage.setItem('evalpulse_all_candidates', JSON.stringify(updated));
          } catch {}
          return updated;
        });

        // Only show new submission notification ONCE when a genuine new submission arrives
        if (incoming.status === 'submitted' && !notifiedSubmissionIdsRef.current.has(incoming.id)) {
          notifiedSubmissionIdsRef.current.add(incoming.id);
          if (currentRole === 'creator') {
            addToast('notification', 'New Assessment Submitted', `${incoming.details?.fullName || 'Candidate'} submitted test.`);
          }
        }

        // If this device is that candidate, update active state
        const activeCand = currentCandidateRef.current;
        if (activeCand && (activeCand.id === incoming.id || (activeCand.details?.email && incoming.details?.email && activeCand.details.email.toLowerCase() === incoming.details.email.toLowerCase()))) {
          setCurrentCandidateSubmission((prev) => prev ? { ...prev, ...incoming, details: { ...prev.details, ...(incoming.details || {}) } } : null);
        }
      },
      onSnapshotReceived: (cloudList) => {
        if (Array.isArray(cloudList)) {
          cloudList.forEach((c) => {
            if (c.id && (c.status === 'submitted' || c.status === 'evaluated')) {
              notifiedSubmissionIdsRef.current.add(c.id);
            }
          });
          setCandidates(cloudList);
          setLeaderboard(computeLeaderboardFromCandidates(cloudList));
          try {
            localStorage.setItem('evalpulse_all_candidates', JSON.stringify(cloudList));
          } catch {}
        }
      },
      onCandidateListReset: () => {
        notifiedSubmissionIdsRef.current.clear();
        setCandidates([]);
        setLeaderboard([]);
        setCurrentCandidateSubmission(null);
        try {
          localStorage.removeItem('evalpulse_all_candidates');
          localStorage.removeItem('evalpulse_candidate_submission');
        } catch {}
        addToast('info', 'Live Reset Broadcast', 'Candidate logs have been reset for live launch.');
      }
    });

    // Request snapshot on launch
    requestSupabaseSnapshot();

    return () => {
      cleanup();
    };
  }, [currentRole]);

  // Role Authentication Handler
  const handleAuthenticate = async (code: string) => {
    const res = await verifyAccessCode(code);
    if (res.success && res.role) {
      setCurrentRole(res.role);
      setAuthToken(res.token || '');
      localStorage.setItem('evalpulse_role', res.role);
      localStorage.setItem('evalpulse_token', res.token || '');

      addToast('success', 'Access Granted', `Authenticated as ${res.label}`);

      if (res.role === 'creator') {
        setActiveView('creator');
      } else {
        if (currentCandidateSubmission) {
          setActiveView('home');
        } else {
          setActiveView('assessment');
        }
      }
      return { success: true, role: res.role };
    }
    return { success: false, message: res.message || 'Invalid access code.' };
  };

  const handleLogout = () => {
    setCurrentRole('guest');
    setAuthToken('');
    localStorage.removeItem('evalpulse_role');
    localStorage.removeItem('evalpulse_token');
    addToast('info', 'Logged Out', 'Switched back to guest mode.');
    setActiveView('assessment');
  };

  // Candidate Assessment Submission Handler
  const handleSubmitAssessment = async (
    details: CandidateDetails,
    answers: CandidateAnswer[],
    timeSpentSeconds: number,
    candidateId?: string,
    tabSwitchDetected?: boolean
  ) => {
    setIsSubmitting(true);
    try {
      const candId = candidateId || (typeof window !== 'undefined' ? localStorage.getItem('evalpulse_candidate_id') : undefined) || undefined;
      const submissionPayload: Partial<CandidateSubmission> = {
        id: candId,
        details,
        answers,
        timeSpentSeconds,
        candidateCode: 'CANDIDATE-2025',
        status: 'submitted',
        tabSwitchDetected: !!tabSwitchDetected,
        submissionReason: tabSwitchDetected ? 'Auto-submitted due to tab switch violation' : 'Standard candidate submission'
      };

      const res = await submitAssessment(submissionPayload);
      if (res.success && res.candidate) {
        setCurrentCandidateSubmission(res.candidate);
        localStorage.setItem('evalpulse_candidate_submission', JSON.stringify(res.candidate));
        // Clear active draft keys upon successful submission
        localStorage.removeItem('evalpulse_active_step');
        localStorage.removeItem('evalpulse_candidate_answers');
        localStorage.removeItem('evalpulse_current_q');
        localStorage.removeItem('evalpulse_time_remaining');

        setCandidates((prev) => [res.candidate!, ...prev.filter((c) => c.id !== res.candidate!.id)]);
        
        // Broadcast immediately to Supabase Cloud for all cross-device evaluators
        broadcastCandidateSubmissionViaSupabase(res.candidate);

        if (tabSwitchDetected) {
          addToast('notification', 'Assessment Auto-Submitted', 'Tab switch detected! Examination finalized and locked as per proctoring rules.');
        } else {
          addToast('success', 'Assessment Submitted!', 'Your answers have been recorded. You can now view your post-submission Candidate Home.');
        }
        setActiveView('home');
      } else {
        addToast('error', 'Submission Failed', res.message || 'Please check your connection and try again.');
      }
    } catch {
      addToast('error', 'Submission Error', 'An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Creator Evaluation Handler
  const handleEvaluateCandidate = async (
    candidateId: string,
    rubric: any,
    evaluatorName: string,
    publishToLeaderboard: boolean
  ) => {
    setIsEvaluating(true);
    try {
      const res = await evaluateCandidate(candidateId, rubric, evaluatorName, publishToLeaderboard);
      if (res.success && res.candidate) {
        // Update local candidates
        setCandidates((prev) =>
          prev.map((c) => (c.id === candidateId ? res.candidate : c))
        );

        // Broadcast evaluation immediately via Supabase Cloud
        broadcastCandidateEvaluationViaSupabase(res.candidate);

        if (res.emailNotification) {
          setEmails((prev) => [res.emailNotification, ...prev]);
        }

        // If currently viewing as this candidate, update their session
        if (currentCandidateSubmission && currentCandidateSubmission.id === candidateId) {
          setCurrentCandidateSubmission(res.candidate);
        }

        const updatedBoard = await fetchLeaderboard();
        setLeaderboard(updatedBoard);

        addToast('success', 'Evaluation Finalized', `Candidate scored ${res.candidate.evaluation?.totalScore}/100. Notification email dispatched.`);
        return true;
      } else {
        addToast('error', 'Evaluation Failed', res.message || 'Error updating score.');
        return false;
      }
    } catch {
      addToast('error', 'Evaluation Error', 'Failed to submit score.');
      return false;
    } finally {
      setIsEvaluating(false);
    }
  };

  // Reset all candidates across cloud and devices for fresh launch
  const handleClearAllCandidates = async () => {
    try {
      const res = await clearAllCandidatesData();
      setCandidates([]);
      setLeaderboard([]);
      setCurrentCandidateSubmission(null);
      addToast('success', 'Clean Slate Initialized', res.message || 'Candidate logs wiped for tomorrow\'s live launch.');
      return true;
    } catch (err) {
      addToast('error', 'Reset Error', 'Failed to reset candidate logs.');
      return false;
    }
  };

  // Creator Rewrite Authorization Handler
  const handleGrantRewrite = async (candidateOrId: CandidateSubmission | string) => {
    try {
      const candidateId = typeof candidateOrId === 'string' ? candidateOrId : candidateOrId.id;
      const candidateObj = typeof candidateOrId === 'object' ? candidateOrId : candidates.find(c => c.id === candidateId);
      const email = candidateObj?.details?.email;
      const phone = candidateObj?.details?.phone;

      const res = await grantCandidateRewrite({
        candidate: candidateObj,
        candidateId,
        email,
        phone,
        fullName: candidateObj?.details?.fullName,
        grantedBy: 'assessment_creator'
      });
      if (res.success && res.candidate) {
        setCandidates((prev) =>
          prev.map((c) => (c.id === candidateId || (email && c.details?.email?.toLowerCase() === email.toLowerCase()) ? res.candidate! : c))
        );
        if (currentCandidateSubmission && (currentCandidateSubmission.id === candidateId || (email && currentCandidateSubmission.details?.email?.toLowerCase() === email.toLowerCase()))) {
          setCurrentCandidateSubmission(res.candidate);
        }
        addToast('success', 'Rewrite Feature Granted', `Rewrite authorization granted for ${res.candidate.details.fullName}.`);
        return true;
      } else {
        addToast('error', 'Rewrite Grant Failed', res.message || 'Could not grant rewrite.');
        return false;
      }
    } catch {
      addToast('error', 'Rewrite Error', 'Failed to grant rewrite authorization.');
      return false;
    }
  };

  return (
    <div className="min-h-[100dvh] w-full max-w-full overflow-x-hidden bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors flex flex-col font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Navigation Header */}
      <Navbar
        currentRole={currentRole}
        activeView={activeView}
        onNavigate={setActiveView}
        onOpenLogin={() => setIsLoginModalOpen(true)}
        onLogout={handleLogout}
        onOpenUnitTests={() => setIsUnitTestModalOpen(true)}
        onOpenEmailOutbox={() => {
          setWorkspaceDefaultTab('gmail');
          setIsWorkspaceModalOpen(true);
        }}
        onOpenGoogleWorkspace={(tab) => {
          setWorkspaceDefaultTab(tab || 'drive');
          setIsWorkspaceModalOpen(true);
        }}
        isDarkMode={isDarkMode}
        onToggleDarkMode={() => setIsDarkMode(!isDarkMode)}
        unreadEmailCount={emails.length}
        hasCandidateSubmission={!!currentCandidateSubmission}
        onOpenSqlModal={() => setIsSqlModalOpen(true)}
      />

      {/* Main View Container */}
      <main className="flex-1 w-full flex flex-col">
        <Suspense
          fallback={
            <div className="min-h-[60vh] flex-1 flex flex-col items-center justify-center gap-3 p-6 text-center">
              <div className="w-10 h-10 rounded-full border-3 border-cyan-500/30 border-t-cyan-400 animate-spin" />
              <p className="text-xs text-slate-500 font-cyber-mono">Loading The Crucible modules...</p>
            </div>
          }
        >
          {/* VIEW 1: CANDIDATE HOME PAGE (AFTER SUBMISSION) */}
          {activeView === 'home' && currentCandidateSubmission && (
            <CandidateHome
              submission={currentCandidateSubmission}
              onNavigateToLeaderboard={() => setActiveView('leaderboard')}
              onOpenEmailOutbox={() => {
                setWorkspaceDefaultTab('gmail');
                setIsWorkspaceModalOpen(true);
              }}
              onRetakeAssessment={() => setActiveView('assessment')}
            />
          )}

          {/* VIEW 2: CANDIDATE ASSESSMENT ROOM */}
          {activeView === 'assessment' && (
            <CandidateAssessment
              initialDetails={currentCandidateSubmission?.details}
              isAuthenticatedCandidate={currentRole === 'candidate' || currentRole === 'creator' || (typeof window !== 'undefined' && Boolean(localStorage.getItem('evalpulse_candidate_details') || localStorage.getItem('evalpulse_active_step')))}
              onAuthenticated={(role) => {
                setCurrentRole(role);
                setAuthToken(`candidate-token-${Date.now()}`);
                localStorage.setItem('evalpulse_role', role);
                localStorage.setItem('evalpulse_token', `candidate-token-${Date.now()}`);
              }}
              onSubmitAssessment={handleSubmitAssessment}
              isSubmitting={isSubmitting}
              existingCandidates={candidates}
              currentSubmission={currentCandidateSubmission}
              onViewExistingSubmission={(sub) => {
                setCurrentCandidateSubmission(sub);
                setActiveView('home');
              }}
            />
          )}

          {/* VIEW 3: CREATOR EVALUATION CONSOLE */}
          {activeView === 'creator' && (
            <>
              {currentRole === 'creator' ? (
                <CreatorDashboard
                  candidates={candidates}
                  onEvaluateCandidate={handleEvaluateCandidate}
                  onRefresh={loadData}
                  onClearAllCandidates={handleClearAllCandidates}
                  onGrantRewrite={handleGrantRewrite}
                  onOpenSqlModal={() => setIsSqlModalOpen(true)}
                  isEvaluating={isEvaluating}
                  onOpenEmailOutbox={() => {
                    setWorkspaceDefaultTab('gmail');
                    setIsWorkspaceModalOpen(true);
                  }}
                  onOpenGoogleWorkspace={(tab) => {
                    setWorkspaceDefaultTab(tab || 'drive');
                    setIsWorkspaceModalOpen(true);
                  }}
                />
              ) : (
                <div className="max-w-md mx-auto px-4 py-16 text-center space-y-4">
                  <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800/50 flex items-center justify-center text-amber-600 dark:text-amber-400 mx-auto">
                    <Lock className="w-6 h-6" />
                  </div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                    Creator Access Required
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
                    Only verified creators and technical evaluators can inspect candidate answers, assign rubric scores, and publish official leaderboard rankings.
                  </p>
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                    <button
                      onClick={() => {
                        const token = `creator-token-${Date.now()}`;
                        setCurrentRole('creator');
                        setAuthToken(token);
                        localStorage.setItem('evalpulse_role', 'creator');
                        localStorage.setItem('evalpulse_token', token);
                        addToast('success', 'Creator Mode Active', 'Welcome, Evaluator Bhavakanth K.');
                      }}
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-bold bg-gradient-to-r from-rose-600 to-indigo-600 hover:from-rose-500 hover:to-indigo-500 text-white shadow-md shadow-rose-500/20 transition-all hover:scale-105"
                    >
                      <Sparkles className="w-4 h-4 text-amber-300" />
                      <span>1-Click Unlock Creator Console</span>
                    </button>
                    <button
                      onClick={() => setIsLoginModalOpen(true)}
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all"
                    >
                      <span>Enter Custom Key</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {/* VIEW 4: LIVE LEADERBOARD */}
          {activeView === 'leaderboard' && (
            <Leaderboard
              entries={leaderboard}
              onRefresh={loadData}
              currentCandidateId={currentCandidateSubmission?.id}
              isCreator={currentRole === 'creator'}
              onNavigate={setActiveView}
            />
          )}
        </Suspense>
      </main>

      {/* Cyber Footer */}
      <footer className="w-full border-t border-cyan-500/20 py-6 px-4 text-center text-xs text-slate-400 bg-slate-950/90 cyber-grid-bg">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex flex-col sm:flex-row items-center gap-2">
            <span className="font-orbitron font-bold text-white tracking-wider">THE CRUCIBLE</span>
            <span className="hidden sm:inline text-cyan-500">•</span>
            <span className="font-rajdhani text-slate-300">Tamil Nadu State Board Computer Science Assessment Engine</span>
          </div>

          {/* Creator Attribution & Contact */}
          <div className="flex flex-wrap items-center justify-center gap-3 font-rajdhani text-xs">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-cyan-500/30 text-slate-200">
              <User className="w-3.5 h-3.5 text-cyan-400" />
              <span>Created by : <strong className="text-cyan-300 font-semibold">Bhavakanth k</strong></span>
            </div>
            <a
              href="tel:6380650379"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-cyan-500/30 text-slate-200 hover:border-cyan-400 hover:text-cyan-300 transition-colors"
            >
              <Phone className="w-3.5 h-3.5 text-cyan-400" />
              <span>Creator's mobile no : <strong className="text-cyan-300 font-mono">6380650379</strong></span>
            </a>
          </div>

          <div className="flex items-center gap-3 text-[11px] font-cyber-mono text-slate-500">
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></span>
              <span>TLS-256 RBAC ACTIVE</span>
            </span>
            <span>•</span>
            <span className="text-cyan-400">STATE BOARD SCERT</span>
          </div>
        </div>
      </footer>

      {/* Modals & Drawers */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onAuthenticate={handleAuthenticate}
      />

      <UnitTestModal
        isOpen={isUnitTestModalOpen}
        onClose={() => setIsUnitTestModalOpen(false)}
      />

      <Suspense fallback={null}>
        {isWorkspaceModalOpen && (
          <GoogleWorkspaceModal
            isOpen={isWorkspaceModalOpen}
            onClose={() => setIsWorkspaceModalOpen(false)}
            emails={emails}
            candidates={candidates}
            defaultTab={workspaceDefaultTab}
            onAddEmailNotification={(newEmail) => setEmails((prev) => [newEmail, ...prev])}
          />
        )}
        {isSqlModalOpen && (
          <SupabaseSqlModal
            isOpen={isSqlModalOpen}
            onClose={() => setIsSqlModalOpen(false)}
          />
        )}
      </Suspense>

      {/* Floating Micro-Interaction Toast Container */}
      <ToastContainer toasts={toasts} onDismiss={handleDismissToast} />
    </div>
  );
}
