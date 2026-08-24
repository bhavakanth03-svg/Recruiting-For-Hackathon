import React, { useState, useEffect, Suspense, lazy } from 'react';
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
  seedSampleStateRankCandidates
} from './lib/api';
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

  // Load initial data
  const loadData = async () => {
    try {
      const cands = await fetchCandidates(authToken);
      setCandidates(cands);

      const board = await fetchLeaderboard();
      setLeaderboard(board);

      const emailList = await fetchEmails();
      if (emailList.length > 0) setEmails(emailList);
    } catch {
      // Fallback in-memory
    }
  };

  useEffect(() => {
    loadData();
  }, [authToken]);

  // Active Multi-Device Background Polling & Visibility Sync
  useEffect(() => {
    const interval = setInterval(() => {
      loadData();
    }, 3000);

    const handleFocus = () => loadData();
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') loadData();
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [authToken]);

  // Real-Time SSE Event Listener Subscription
  useEffect(() => {
    const unsubscribe = subscribeToRealTimeEvents((event: ServerEvent) => {
      if (event.type === 'CANDIDATE_PROGRESS_UPDATED') {
        loadData();
      } else if (event.type === 'CANDIDATE_SUBMITTED') {
        addToast('notification', 'New Assessment Submitted', `${event.data.candidateName} submitted responses for ${event.data.role || 'CS Assessment'}.`);
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
  }, [currentCandidateSubmission]);

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
    candidateId?: string
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
        status: 'submitted'
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
        addToast('success', 'Assessment Submitted!', 'Your answers have been recorded. You can now view your post-submission Candidate Home.');
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
              onSeedSampleData={async () => {
                const res = await seedSampleStateRankCandidates();
                setLeaderboard(res.leaderboard);
                setCandidates(res.candidates);
                addToast('success', 'State Rank Scholars Loaded', 'Loaded top merit leaderboard entries.');
              }}
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
      </Suspense>

      {/* Floating Micro-Interaction Toast Container */}
      <ToastContainer toasts={toasts} onDismiss={handleDismissToast} />
    </div>
  );
}
