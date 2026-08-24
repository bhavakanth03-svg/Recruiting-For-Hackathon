import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Shield,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Award,
  Mail,
  User,
  ExternalLink,
  ChevronRight,
  Sparkles,
  Sliders,
  Layers,
  Code2,
  Cpu,
  MessagesSquare,
  X,
  Send,
  Trophy,
  Phone,
  School,
  Terminal,
  Check,
  RefreshCw,
  Globe,
  Eye,
  FileCode,
  ShieldCheck
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { CandidateSubmission, EvaluationRubric, Question } from '../types';
import { DEFAULT_QUESTIONS } from '../data/defaultData';
import {
  auth,
  initGmailAuth,
  signInWithGmail,
  sendEmailViaGmail,
  getGmailAccessToken
} from '../lib/gmail';

interface CreatorDashboardProps {
  candidates: CandidateSubmission[];
  onEvaluateCandidate: (
    candidateId: string,
    rubric: Partial<EvaluationRubric>,
    evaluatorName: string,
    publishToLeaderboard: boolean
  ) => Promise<boolean>;
  onRefresh: () => void;
  isEvaluating: boolean;
  onOpenEmailOutbox?: () => void;
  onOpenGoogleWorkspace?: (tab?: 'drive' | 'contacts' | 'gmail') => void;
}

export const CreatorDashboard: React.FC<CreatorDashboardProps> = ({
  candidates,
  onEvaluateCandidate,
  onRefresh,
  isEvaluating,
  onOpenEmailOutbox,
  onOpenGoogleWorkspace
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'evaluated'>('all');
  const [selectedCandidate, setSelectedCandidate] = useState<CandidateSubmission | null>(null);

  // Gmail State
  const [gmailUser, setGmailUser] = useState<any>(auth.currentUser);
  const [sendViaGmailOption, setSendViaGmailOption] = useState(true);
  const [showGmailConfirm, setShowGmailConfirm] = useState(false);
  const [isSendingGmail, setIsSendingGmail] = useState(false);

  useEffect(() => {
    const unsub = initGmailAuth(
      (user) => setGmailUser(user),
      () => setGmailUser(null)
    );
    return () => unsub();
  }, []);
  const [activePreviewCandidateTab, setActivePreviewCandidateTab] = useState<'mcqs' | 'website'>('mcqs');

  // Scoring Rubric State for the modal
  const [rubric, setRubric] = useState<{
    mcqScore: number;
    websitePromptDesign: number;
    websitePromptFunctionality: number;
    badge: string;
    feedback: string;
    internalNotes: string;
    publishToLeaderboard: boolean;
  }>({
    mcqScore: 72,
    websitePromptDesign: 14,
    websitePromptFunctionality: 13,
    badge: 'Master CS Scholar',
    feedback: 'Excellent algorithmic reasoning on C++ & Python State Board questions, and outstanding school portal website creation.',
    internalNotes: '',
    publishToLeaderboard: true
  });

  const totalScore = Math.min(
    100,
    Math.max(
      0,
      Number(rubric.mcqScore) +
      Number(rubric.websitePromptDesign) +
      Number(rubric.websitePromptFunctionality)
    )
  );

  const getCalculatedGrade = (score: number) => {
    if (score >= 95) return 'A+';
    if (score >= 90) return 'A';
    if (score >= 80) return 'B+';
    if (score >= 70) return 'B';
    if (score >= 60) return 'C';
    return 'D';
  };

  const handleOpenEvaluationModal = (cand: CandidateSubmission) => {
    setSelectedCandidate(cand);

    // Auto-compute auto-graded MCQ score (3 pts per question * 24 = 72 max)
    let autoMcqScore = 0;
    DEFAULT_QUESTIONS.slice(0, 24).forEach((q) => {
      const ans = cand.answers?.find((a) => a.questionId === q.id);
      if (ans?.selectedOptionIndex === q.correctOptionIndex) {
        autoMcqScore += 3;
      }
    });

    if (cand.evaluation) {
      setRubric({
        mcqScore: cand.evaluation.mcqScore !== undefined ? cand.evaluation.mcqScore : autoMcqScore,
        websitePromptDesign: cand.evaluation.websitePromptDesign || 14,
        websitePromptFunctionality: cand.evaluation.websitePromptFunctionality || 13,
        badge: cand.evaluation.badge || 'Master CS Scholar',
        feedback: cand.evaluation.feedback || '',
        internalNotes: cand.evaluation.internalNotes || '',
        publishToLeaderboard: cand.evaluation.isPublishedToLeaderboard
      });
    } else {
      setRubric({
        mcqScore: autoMcqScore,
        websitePromptDesign: 13,
        websitePromptFunctionality: 13,
        badge: autoMcqScore >= 66 ? 'Master CS Scholar' : 'Certified TN CS Scholar',
        feedback: 'Demonstrated solid grasp of Tamil Nadu 11th/12th Computer Science core concepts and clean web architecture.',
        internalNotes: '',
        publishToLeaderboard: true
      });
    }
  };

  const handleRequestSubmitEvaluation = () => {
    if (!selectedCandidate) return;
    if (sendViaGmailOption && gmailUser) {
      setShowGmailConfirm(true);
    } else {
      executeEvaluationSubmit();
    }
  };

  const executeEvaluationSubmit = async () => {
    if (!selectedCandidate) return;
    setIsSendingGmail(true);

    const totalScore = rubric.mcqScore + rubric.websitePromptDesign + rubric.websitePromptFunctionality;

    // If Gmail is active, send live email
    if (sendViaGmailOption && gmailUser && getGmailAccessToken()) {
      try {
        const bodyHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0f172a; color: #ffffff; padding: 24px; border-radius: 16px; border: 1px solid #06b6d4;">
            <h2 style="color: #38bdf8; margin-top: 0;">The Crucible • Official Tamil Nadu CS Assessment Scorecard</h2>
            <p style="color: #94a3b8;">Dear <strong>${selectedCandidate.details.fullName}</strong>,</p>
            <p style="color: #e2e8f0;">Your 25-question evaluation in The Crucible (Tamil Nadu Higher Secondary CS Assessment) has been officially evaluated and verified.</p>
            
            <div style="background: #1e293b; padding: 18px; border-radius: 12px; text-align: center; margin: 20px 0; border: 1px solid #334155;">
              <span style="color: #38bdf8; font-size: 12px; font-weight: bold; text-transform: uppercase;">Evaluated Total Score</span>
              <div style="font-size: 38px; font-weight: bold; color: #f43f5e; margin: 8px 0;">${totalScore} / 100</div>
              <div style="color: #e2e8f0; font-size: 14px; font-weight: bold;">Badge: 🏆 ${rubric.badge}</div>
            </div>

            <div style="background: #090d16; padding: 14px; border-radius: 8px; border: 1px solid #334155; margin: 16px 0;">
              <strong style="color: #38bdf8; font-size: 13px;">Official Evaluator Feedback:</strong>
              <p style="color: #cbd5e1; font-size: 13px; font-style: italic; margin-top: 6px;">"${rubric.feedback}"</p>
            </div>

            <p style="color: #94a3b8; font-size: 12px; margin-top: 24px;">Sent directly via Gmail on behalf of the Tamil Nadu CS Board Evaluator (${gmailUser.email}).</p>
          </div>
        `;

        await sendEmailViaGmail({
          to: selectedCandidate.details.email,
          subject: `Official CS Assessment Scorecard: ${selectedCandidate.details.fullName} (${totalScore}/100)`,
          bodyHtml
        });
      } catch (err: any) {
        console.warn('Gmail API delivery note:', err.message);
      }
    }

    const success = await onEvaluateCandidate(
      selectedCandidate.id,
      {
        mcqScore: rubric.mcqScore,
        websitePromptDesign: rubric.websitePromptDesign,
        websitePromptFunctionality: rubric.websitePromptFunctionality,
        badge: rubric.badge,
        feedback: rubric.feedback,
        internalNotes: rubric.internalNotes
      },
      gmailUser?.displayName || 'State Board Technical Evaluator',
      rubric.publishToLeaderboard
    );

    setIsSendingGmail(false);
    setShowGmailConfirm(false);

    if (success) {
      try {
        confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
      } catch {}
      setSelectedCandidate(null);
    }
  };

  // Metrics computation
  const totalCount = candidates.length;
  const pendingCount = candidates.filter((c) => c.status !== 'evaluated').length;
  const evaluatedCount = candidates.filter((c) => c.status === 'evaluated').length;
  const evaluatedScores = candidates
    .filter((c) => c.evaluation)
    .map((c) => c.evaluation!.totalScore);
  const avgScore = evaluatedScores.length
    ? Math.round(evaluatedScores.reduce((a, b) => a + b, 0) / evaluatedScores.length)
    : 0;

  // Filter list
  const filteredCandidates = candidates.filter((cand) => {
    const matchesSearch =
      cand.details.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cand.details.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cand.details.schoolName.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (filterStatus === 'pending') return cand.status !== 'evaluated';
    if (filterStatus === 'evaluated') return cand.status === 'evaluated';
    return true;
  });

  const q25Answer = selectedCandidate?.answers?.find((a) => a.questionId === 'q25');

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      {/* 1. CREATOR COMMAND HEADER & METRICS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/50 dark:border-indigo-800/50 text-indigo-700 dark:text-indigo-300 text-xs font-semibold mb-2">
            <Shield className="w-3.5 h-3.5" />
            <span>The Crucible • Evaluator & Creator Console</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Tamil Nadu CS Assessment Evaluator
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-xl">
            Review detailed candidate submissions across 24 C++/Python/SQL MCQs, inspect live rendered website prompt submissions, score rubrics, and trigger instant student score notification emails.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center">
          <button
            onClick={() => {
              if (onOpenGoogleWorkspace) onOpenGoogleWorkspace('drive');
              else if (onOpenEmailOutbox) onOpenEmailOutbox();
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-orbitron font-bold uppercase bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-slate-950 shadow-md cyber-glow-cyan transition-all hover:scale-105"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 48 48">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
            </svg>
            <span>Google Workspace Suite</span>
          </button>

          <button
            onClick={onRefresh}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl text-xs font-semibold bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-800 text-slate-700 dark:text-slate-300 shadow-sm transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5 text-indigo-500" />
            <span>Sync Pipeline</span>
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Total Candidates
          </p>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-extrabold text-slate-900 dark:text-white font-mono">{totalCount}</span>
            <span className="text-xs text-indigo-500 font-medium">Logged</span>
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-sm">
          <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
            Pending Grading
          </p>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-extrabold text-amber-600 dark:text-amber-400 font-mono">{pendingCount}</span>
            <span className="text-xs text-amber-600 font-medium">Queue</span>
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-sm">
          <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
            Graded & Scored
          </p>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">{evaluatedCount}</span>
            <span className="text-xs text-emerald-600 font-medium">Completed</span>
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Average Score
          </p>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-extrabold text-indigo-600 dark:text-indigo-400 font-mono">{avgScore}</span>
            <span className="text-xs text-slate-400 font-medium">/ 100</span>
          </div>
        </div>
      </div>

      {/* 2. FILTER & SEARCH CONTROLS */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3.5 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 shadow-sm">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search candidate by student name, email, or school..."
            className="w-full pl-10 pr-4 py-2 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 self-end sm:self-auto">
          <button
            onClick={() => setFilterStatus('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              filterStatus === 'all'
                ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            All ({candidates.length})
          </button>

          <button
            onClick={() => setFilterStatus('pending')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              filterStatus === 'pending'
                ? 'bg-white dark:bg-slate-800 text-amber-600 dark:text-amber-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            Pending ({pendingCount})
          </button>

          <button
            onClick={() => setFilterStatus('evaluated')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              filterStatus === 'evaluated'
                ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            Evaluated ({evaluatedCount})
          </button>
        </div>
      </div>

      {/* 3. CANDIDATES PIPELINE TABLE */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 shadow-xl shadow-slate-900/5 dark:shadow-black/40 overflow-hidden">
        {filteredCandidates.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-sm">
            No student submissions matching your search criteria.
          </div>
        ) : (
          <div className="divide-y divide-slate-200/80 dark:divide-slate-800/80">
            {filteredCandidates.map((cand) => {
              const isGraded = cand.status === 'evaluated' && cand.evaluation;

              return (
                <div
                  key={cand.id}
                  className="p-5 sm:p-6 hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                >
                  <div className="flex items-start gap-4">
                    <div className={`w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-sm shrink-0 border ${
                      isGraded
                        ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border-emerald-200/60 dark:border-emerald-800/60'
                        : 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border-amber-200/60 dark:border-amber-800/60'
                    }`}>
                      {isGraded ? cand.evaluation!.totalScore : <Clock className="w-5 h-5" />}
                    </div>

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-base font-bold text-slate-900 dark:text-white">
                          {cand.details.fullName}
                        </h3>
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          ({cand.details.email})
                        </span>
                        {isGraded && (
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                            Grade: {cand.evaluation!.grade}
                          </span>
                        )}
                        {cand.emailDispatched && (
                          <span className="text-[10px] font-medium text-slate-400 flex items-center gap-1">
                            <Mail className="w-3 h-3 text-emerald-500" />
                            <span>Score Emailed</span>
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400 mt-1 flex-wrap font-rajdhani">
                        <span className="font-semibold text-cyan-400">
                          {cand.details.role || 'CS Candidate'}
                        </span>
                        <span>•</span>
                        <span>{cand.details.phone}</span>
                        {cand.details.githubProfile && (
                          <>
                            <span>•</span>
                            <a
                              href={cand.details.githubProfile.startsWith('http') ? cand.details.githubProfile : `https://${cand.details.githubProfile}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-cyan-400 hover:underline flex items-center gap-1 font-cyber-mono text-[11px]"
                            >
                              <span>GitHub</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </>
                        )}
                        <span>•</span>
                        <span>
                          Submitted: {cand.submittedAt ? new Date(cand.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'In progress'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 self-end sm:self-center">
                    <button
                      onClick={() => handleOpenEvaluationModal(cand)}
                      className={`flex items-center gap-1.5 px-4 py-2 rounded-2xl text-xs font-bold transition-all hover:scale-105 shadow-sm ${
                        isGraded
                          ? 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-200 border border-slate-200 dark:border-slate-700'
                          : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-500/20'
                      }`}
                    >
                      <Sliders className="w-3.5 h-3.5" />
                      <span>{isGraded ? 'Review / Re-Score' : 'Evaluate & Score'}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 4. DETAILED EVALUATION & SCORING MODAL */}
      <AnimatePresence>
        {selectedCandidate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedCandidate(null)}
              className="fixed inset-0 bg-slate-900/70 dark:bg-black/85 backdrop-blur-md"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 15 }}
              className="relative w-full max-w-5xl max-h-[90vh] bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200/80 dark:border-slate-800/80 shadow-2xl overflow-y-auto space-y-6 text-slate-900 dark:text-slate-100"
            >
              {/* Modal Header */}
              <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-200/80 dark:border-slate-800/80">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                      Evaluating: {selectedCandidate.details.fullName}
                    </h2>
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-cyan-950 text-cyan-300 font-cyber-mono font-semibold border border-cyan-500/40">
                      {selectedCandidate.details.role || 'Candidate'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1 font-rajdhani flex items-center gap-3 flex-wrap">
                    <span>Email: <strong className="text-white">{selectedCandidate.details.email}</strong></span>
                    <span>•</span>
                    <span>Phone: <strong className="text-white">{selectedCandidate.details.phone}</strong></span>
                    {selectedCandidate.details.githubProfile && (
                      <>
                        <span>•</span>
                        <span>GitHub: <a href={selectedCandidate.details.githubProfile.startsWith('http') ? selectedCandidate.details.githubProfile : `https://${selectedCandidate.details.githubProfile}`} target="_blank" rel="noreferrer" className="text-cyan-400 underline font-mono">{selectedCandidate.details.githubProfile}</a></span>
                      </>
                    )}
                  </p>
                </div>

                <button
                  onClick={() => setSelectedCandidate(null)}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* TABS: MCQS vs QUESTION 25 WEBSITE */}
              <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
                <button
                  onClick={() => setActivePreviewCandidateTab('mcqs')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                    activePreviewCandidateTab === 'mcqs'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <Code2 className="w-4 h-4" />
                  <span>24 Code MCQs Breakdown</span>
                </button>

                <button
                  onClick={() => setActivePreviewCandidateTab('website')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                    activePreviewCandidateTab === 'website'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <Globe className="w-4 h-4" />
                  <span>Question 25 Website Build (Live Render)</span>
                </button>
              </div>

              {/* VIEW 1: 24 MCQS INSPECTION */}
              {activePreviewCandidateTab === 'mcqs' && (
                <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                  {DEFAULT_QUESTIONS.slice(0, 24).map((q, idx) => {
                    const ans = selectedCandidate.answers?.find((a) => a.questionId === q.id);
                    const isCorrect = ans?.selectedOptionIndex === q.correctOptionIndex;

                    return (
                      <div
                        key={q.id}
                        className={`p-3.5 rounded-2xl border text-xs space-y-2 ${
                          isCorrect
                            ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200/60 dark:border-emerald-800/40'
                            : 'bg-rose-50/40 dark:bg-rose-950/20 border-rose-200/60 dark:border-rose-800/40'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-800 dark:text-slate-200">
                            Q{idx + 1}: {q.title} ({q.topic})
                          </span>
                          <span className={`font-semibold flex items-center gap-1 ${isCorrect ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {isCorrect ? <CheckCircle2 className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                            {isCorrect ? '+3 Points' : '0 Points'}
                          </span>
                        </div>

                        {q.codeSnippet && (
                          <pre className="p-2.5 rounded-xl bg-slate-950 text-emerald-300 font-mono text-[11px] overflow-x-auto max-h-28">
                            <code>{q.codeSnippet}</code>
                          </pre>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                          <div className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                            <span className="text-slate-400 block">Candidate's Choice:</span>
                            <span className={isCorrect ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold'}>
                              {ans?.selectedOptionIndex !== undefined && q.options
                                ? q.options[ans.selectedOptionIndex]
                                : 'Unanswered'}
                            </span>
                          </div>

                          <div className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                            <span className="text-slate-400 block">Correct Answer:</span>
                            <span className="text-emerald-600 font-bold">
                              {q.correctOptionIndex !== undefined && q.options ? q.options[q.correctOptionIndex] : ''}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* VIEW 2: QUESTION 25 WEBSITE LIVE RENDER & PROMPT */}
              {activePreviewCandidateTab === 'website' && (
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-cyan-950/40 border border-cyan-500/40 text-xs space-y-1.5">
                    <span className="font-bold text-cyan-300 font-cyber-mono flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-cyan-400" />
                      <span>Candidate's Website Prompt (Question 25):</span>
                    </span>
                    <p className="text-slate-200 font-rajdhani text-sm leading-relaxed whitespace-pre-wrap bg-slate-950 p-3 rounded-xl border border-cyan-500/20">
                      {q25Answer?.websitePrompt || 'No prompt provided by candidate.'}
                    </p>
                  </div>

                  <div className="rounded-2xl overflow-hidden border border-slate-300 dark:border-slate-700 bg-white shadow-md">
                    <div className="px-4 py-2 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs text-slate-500 font-mono">
                      <span>Candidate's Theme Website Live Render</span>
                      <span className="text-cyan-400 font-semibold font-cyber-mono">Live Sandbox</span>
                    </div>
                    <iframe
                      title="Candidate Website Live Preview"
                      srcDoc={q25Answer?.htmlCode || DEFAULT_QUESTIONS[24].websiteTemplate?.html || ''}
                      sandbox="allow-scripts"
                      className="w-full h-[380px] border-0 bg-white"
                    />
                  </div>
                </div>
              )}

              {/* RUBRIC SCORING CONTROLS */}
              <div className="p-5 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-indigo-950 dark:text-indigo-200 flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <span>Grading Rubric & Score Weighting (100 Max)</span>
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500 dark:text-slate-400">Total Awarded:</span>
                    <span className="text-lg font-extrabold font-mono text-indigo-600 dark:text-indigo-400">
                      {totalScore}/100 ({getCalculatedGrade(totalScore)})
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Category 1: Auto MCQ Score */}
                  <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800">
                    <div className="flex justify-between text-xs font-semibold mb-1.5">
                      <span>24 MCQs Score</span>
                      <span className="font-mono text-indigo-600 dark:text-indigo-400">
                        {rubric.mcqScore} / 72 pts
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={72}
                      value={rubric.mcqScore}
                      onChange={(e) => setRubric({ ...rubric, mcqScore: Number(e.target.value) })}
                      className="w-full accent-indigo-600 cursor-pointer"
                    />
                  </div>

                  {/* Category 2: Website Prompt UI/Design */}
                  <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800">
                    <div className="flex justify-between text-xs font-semibold mb-1.5">
                      <span>Website UI & Layout</span>
                      <span className="font-mono text-emerald-600 dark:text-emerald-400">
                        {rubric.websitePromptDesign} / 14 pts
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={14}
                      value={rubric.websitePromptDesign}
                      onChange={(e) => setRubric({ ...rubric, websitePromptDesign: Number(e.target.value) })}
                      className="w-full accent-emerald-600 cursor-pointer"
                    />
                  </div>

                  {/* Category 3: Website Interactivity & Calculations */}
                  <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800">
                    <div className="flex justify-between text-xs font-semibold mb-1.5">
                      <span>Website Interactivity</span>
                      <span className="font-mono text-amber-600 dark:text-amber-400">
                        {rubric.websitePromptFunctionality} / 14 pts
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={14}
                      value={rubric.websitePromptFunctionality}
                      onChange={(e) => setRubric({ ...rubric, websitePromptFunctionality: Number(e.target.value) })}
                      className="w-full accent-amber-600 cursor-pointer"
                    />
                  </div>
                </div>

                {/* Badge selector & publish */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Award Honor Badge
                    </label>
                    <select
                      value={rubric.badge}
                      onChange={(e) => setRubric({ ...rubric, badge: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white"
                    >
                      <option value="Master CS Scholar">🏆 Master CS Scholar (State Rank)</option>
                      <option value="Python & C++ Pro">⚡ Python & C++ Pro</option>
                      <option value="Distinction Scholar">🌟 Distinction Scholar</option>
                      <option value="Certified TN CS Scholar">📜 Certified TN CS Scholar</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-2 pt-6">
                    <input
                      type="checkbox"
                      id="publishLeaderboard"
                      checked={rubric.publishToLeaderboard}
                      onChange={(e) =>
                        setRubric({ ...rubric, publishToLeaderboard: e.target.checked })
                      }
                      className="w-4 h-4 rounded text-indigo-600 accent-indigo-600 cursor-pointer"
                    />
                    <label
                      htmlFor="publishLeaderboard"
                      className="text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer"
                    >
                      Publish Score to Live State Leaderboard
                    </label>
                  </div>
                </div>

                {/* Gmail Dispatch Option */}
                <div className="p-3.5 rounded-2xl bg-cyan-950/40 border border-cyan-500/30 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-cyan-900/60 border border-cyan-400/40 flex items-center justify-center text-cyan-300">
                      <Mail className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-white font-rajdhani">
                          Deliver Scorecard via Google Gmail
                        </span>
                        {gmailUser && (
                          <span className="text-[10px] text-cyan-300 font-cyber-mono px-1.5 py-0.2 rounded bg-cyan-950 border border-cyan-500/40">
                            Active
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 font-rajdhani">
                        {gmailUser
                          ? `Will send from your authenticated Google address (${gmailUser.email})`
                          : 'Connect your Google account to deliver score report directly via Gmail API.'}
                      </p>
                    </div>
                  </div>

                  {gmailUser ? (
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={sendViaGmailOption}
                        onChange={(e) => setSendViaGmailOption(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-cyan-500"></div>
                    </label>
                  ) : (
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          await signInWithGmail();
                        } catch (err: any) {
                          alert(err.message);
                        }
                      }}
                      className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-900 font-bold text-xs shadow transition-all"
                    >
                      Connect Gmail
                    </button>
                  )}
                </div>

                {/* Feedback textarea */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Evaluator Feedback (Sent in email notification to student):
                  </label>
                  <textarea
                    rows={3}
                    value={rubric.feedback}
                    onChange={(e) => setRubric({ ...rubric, feedback: e.target.value })}
                    className="w-full p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white leading-relaxed focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-200/80 dark:border-slate-800/80">
                <p className="text-xs text-slate-500 dark:text-slate-400 font-rajdhani">
                  Submitting will record the certified score for <strong>{selectedCandidate.details.email}</strong>.
                </p>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSelectedCandidate(null)}
                    className="px-4 py-2.5 rounded-2xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 transition-colors"
                  >
                    Cancel
                  </button>

                  <button
                    disabled={isEvaluating || isSendingGmail}
                    onClick={handleRequestSubmitEvaluation}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-2xl text-xs font-bold bg-gradient-to-r from-cyan-500 via-indigo-600 to-rose-600 hover:from-cyan-400 hover:to-rose-500 text-white shadow-md shadow-cyan-500/20 transition-all hover:scale-105 disabled:opacity-50 font-orbitron uppercase"
                  >
                    {isEvaluating || isSendingGmail ? (
                      <span>Updating & Sending...</span>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        <span>Confirm Score & Dispatch</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* EXPLICIT GMAIL CONFIRMATION DIALOG (Mandated for mutating Workspace actions) */}
      {showGmailConfirm && selectedCandidate && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => !isSendingGmail && setShowGmailConfirm(false)}
            className="fixed inset-0 bg-black/80 backdrop-blur-md"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="relative w-full max-w-lg bg-slate-950 rounded-3xl p-6 border-2 border-cyan-400 shadow-2xl z-70 text-slate-100 space-y-4"
          >
            <div className="flex items-center gap-3 pb-3 border-b border-cyan-500/20">
              <div className="w-10 h-10 rounded-2xl bg-cyan-950 border border-cyan-400 flex items-center justify-center text-cyan-400 shadow-md">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold font-orbitron text-white">
                  Confirm Gmail Scorecard Dispatch
                </h3>
                <p className="text-xs text-slate-400 font-rajdhani">
                  Explicit user confirmation before sending evaluation email via Gmail.
                </p>
              </div>
            </div>

            <div className="space-y-2 text-xs font-rajdhani bg-slate-900 p-4 rounded-2xl border border-slate-800">
              <div className="flex justify-between">
                <span className="text-slate-400">Sending Google Account:</span>
                <span className="font-semibold text-cyan-300 font-mono">{gmailUser?.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Candidate Recipient:</span>
                <span className="font-semibold text-white">
                  {selectedCandidate.details.fullName} &lt;{selectedCandidate.details.email}&gt;
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Total Score:</span>
                <span className="font-bold text-rose-400 font-mono">
                  {rubric.mcqScore + rubric.websitePromptDesign + rubric.websitePromptFunctionality} / 100
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Honor Badge:</span>
                <span className="font-semibold text-amber-300">🏆 {rubric.badge}</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-cyan-950/40 border border-cyan-500/30 text-[11px] text-cyan-300 font-rajdhani">
              💡 An official HTML scorecard email will be sent directly through your Gmail account to the candidate.
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={isSendingGmail}
                onClick={() => setShowGmailConfirm(false)}
                className="px-4 py-2 rounded-xl text-xs font-rajdhani font-semibold bg-slate-900 hover:bg-slate-800 text-slate-300 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSendingGmail}
                onClick={executeEvaluationSubmit}
                className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-orbitron font-bold uppercase bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-slate-950 shadow-md cyber-glow-cyan transition-all hover:scale-105 disabled:opacity-50"
              >
                {isSendingGmail ? (
                  <span>Dispatching...</span>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Confirm & Send via Gmail</span>
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};
