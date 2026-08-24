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
  ChevronLeft,
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
  ShieldCheck,
  Download,
  Copy,
  Smartphone,
  Tablet,
  Monitor,
  RotateCcw,
  Radio
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
import { seedSampleCandidates, fetchCandidateById } from '../lib/api';
import { SUPABASE_URL, requestSupabaseSnapshot, sendSupabaseSnapshot } from '../lib/supabase';

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
  const [filterStatus, setFilterStatus] = useState<'all' | 'in_progress' | 'pending' | 'evaluated'>('all');
  const [selectedCandidate, setSelectedCandidate] = useState<CandidateSubmission | null>(null);
  const [isSeeding, setIsSeeding] = useState(false);
  const [copiedNotification, setCopiedNotification] = useState<string | null>(null);

  // Response viewing tabs inside modal
  const [activePreviewCandidateTab, setActivePreviewCandidateTab] = useState<'mcqs' | 'website'>('mcqs');
  const [mcqFilter, setMcqFilter] = useState<'all' | 'correct' | 'incorrect' | 'unanswered'>('all');
  const [activeWebsiteViewMode, setActiveWebsiteViewMode] = useState<'preview' | 'prompt' | 'code'>('preview');
  const [activeCodeSubTab, setActiveCodeSubTab] = useState<'html' | 'css' | 'js'>('html');
  const [websiteViewport, setWebsiteViewport] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [iframeKey, setIframeKey] = useState(0);

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

  const handleOpenEvaluationModal = async (cand: CandidateSubmission) => {
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

    // Attempt on-demand refresh to ensure full answers if needed
    if (!cand.answers || cand.answers.length === 0) {
      const detailed = await fetchCandidateById(cand.id);
      if (detailed && detailed.answers && detailed.answers.length > 0) {
        setSelectedCandidate(detailed);
      }
    }
  };

  // Switch between candidates within modal
  const handleSwitchCandidate = (direction: 'next' | 'prev') => {
    if (!selectedCandidate) return;
    const currentIdx = filteredCandidates.findIndex((c) => c.id === selectedCandidate.id);
    if (currentIdx === -1) return;

    let targetIdx = direction === 'next' ? currentIdx + 1 : currentIdx - 1;
    if (targetIdx < 0) targetIdx = filteredCandidates.length - 1;
    if (targetIdx >= filteredCandidates.length) targetIdx = 0;

    const nextCand = filteredCandidates[targetIdx];
    if (nextCand) {
      handleOpenEvaluationModal(nextCand);
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

    const calculatedTotalScore = rubric.mcqScore + rubric.websitePromptDesign + rubric.websitePromptFunctionality;

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
              <div style="font-size: 38px; font-weight: bold; color: #f43f5e; margin: 8px 0;">${calculatedTotalScore} / 100</div>
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
          subject: `Official CS Assessment Scorecard: ${selectedCandidate.details.fullName} (${calculatedTotalScore}/100)`,
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

  // Seed sample candidates on demand
  const handleSeedBatch = async () => {
    setIsSeeding(true);
    try {
      await seedSampleCandidates();
      onRefresh();
      confetti({ particleCount: 40, spread: 50, origin: { y: 0.8 } });
    } catch (err) {
      console.warn('Seed error:', err);
    } finally {
      setIsSeeding(false);
    }
  };

  // Export full cohort answers JSON
  const handleExportCohort = () => {
    const exportPayload = {
      exportDate: new Date().toISOString(),
      assessmentTitle: 'The Crucible • Tamil Nadu 11th & 12th CS Assessment',
      totalCandidates: candidates.length,
      candidates: candidates.map((c) => ({
        id: c.id,
        details: c.details,
        status: c.status,
        startedAt: c.startedAt,
        submittedAt: c.submittedAt,
        timeSpentSeconds: c.timeSpentSeconds,
        evaluation: c.evaluation,
        answersCount: c.answers?.length || 0,
        answers: c.answers
      }))
    };

    const blob = new Blob([JSON.stringify(exportPayload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `crucible-candidate-responses-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedNotification(label);
    setTimeout(() => setCopiedNotification(null), 2000);
  };

  // Metrics computation
  const totalCount = candidates.length;
  const inProgressCount = candidates.filter((c) => c.status === 'in_progress' || c.status === 'not_started').length;
  const submittedCount = candidates.filter((c) => c.status === 'submitted').length;
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
      (cand.details.schoolName && cand.details.schoolName.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;

    if (filterStatus === 'in_progress') return cand.status === 'in_progress' || cand.status === 'not_started';
    if (filterStatus === 'pending') return cand.status === 'submitted';
    if (filterStatus === 'evaluated') return cand.status === 'evaluated';
    return true;
  });

  const q25Answer = selectedCandidate?.answers?.find((a) => a.questionId === 'q25');

  // MCQ answer stats
  const answeredMcqs = DEFAULT_QUESTIONS.slice(0, 24).map((q) => {
    const ans = selectedCandidate?.answers?.find((a) => a.questionId === q.id);
    const isAnswered = ans && ans.selectedOptionIndex !== undefined;
    const isCorrect = isAnswered && ans?.selectedOptionIndex === q.correctOptionIndex;
    return { q, ans, isAnswered, isCorrect };
  });

  const correctMcqsCount = answeredMcqs.filter((m) => m.isCorrect).length;
  const incorrectMcqsCount = answeredMcqs.filter((m) => m.isAnswered && !m.isCorrect).length;
  const unansweredMcqsCount = answeredMcqs.filter((m) => !m.isAnswered).length;

  const filteredMcqs = answeredMcqs.filter((m) => {
    if (mcqFilter === 'correct') return m.isCorrect;
    if (mcqFilter === 'incorrect') return m.isAnswered && !m.isCorrect;
    if (mcqFilter === 'unanswered') return !m.isAnswered;
    return true;
  });

  return (
    <div className="w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-6 sm:space-y-8 flex-1">
      {/* 1. CREATOR COMMAND HEADER & METRICS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/50 dark:border-indigo-800/50 text-indigo-700 dark:text-indigo-300 text-xs font-semibold">
              <Shield className="w-3.5 h-3.5" />
              <span>The Crucible • Evaluator & Creator Console</span>
            </div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/60 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-300 text-xs font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              <span>Live Multi-Device Sync Active</span>
            </div>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Tamil Nadu CS Candidate Response Center
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
            Access and inspect full candidate responses across all 24 C++/Python/SQL MCQs and Question 25 website creations in real time from any candidate device.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap self-start sm:self-center">
          <button
            onClick={handleExportCohort}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl text-xs font-semibold bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-800 text-slate-700 dark:text-slate-300 shadow-sm transition-colors"
            title="Download full candidate answers and evaluations JSON"
          >
            <Download className="w-3.5 h-3.5 text-cyan-500" />
            <span>Export Responses</span>
          </button>

          <button
            disabled={isSeeding}
            onClick={handleSeedBatch}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 border border-indigo-200/80 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 shadow-sm transition-colors"
            title="Seed top sample CS scholars with complete answers"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
            <span>{isSeeding ? 'Seeding...' : 'Seed Sample Cohort'}</span>
          </button>

          <button
            onClick={onRefresh}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl text-xs font-semibold bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-800 text-slate-700 dark:text-slate-300 shadow-sm transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5 text-indigo-500" />
            <span>Sync Live</span>
          </button>
        </div>
      </div>

      {/* 2. COHORT SUMMARY STATS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-sm">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Total Candidates</span>
          <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{totalCount}</div>
          <span className="text-[11px] text-indigo-600 dark:text-indigo-400">All registered devices</span>
        </div>

        <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-sm">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Live Taking Test</span>
          <div className="text-2xl font-bold text-sky-600 dark:text-sky-400 mt-1">{inProgressCount}</div>
          <span className="text-[11px] text-sky-500">Active session sync</span>
        </div>

        <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-sm">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Submitted & Ready</span>
          <div className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">{submittedCount}</div>
          <span className="text-[11px] text-amber-500">Awaiting scoring</span>
        </div>

        <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-sm">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Evaluated & Verified</span>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{evaluatedCount}</div>
          <span className="text-[11px] text-emerald-500">Leaderboard published</span>
        </div>
      </div>

      {/* 2.5 SUPABASE CLOUD MULTI-DEVICE SYNC BANNER */}
      <div className="p-4 rounded-3xl bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-indigo-500/10 border border-emerald-500/30 dark:border-emerald-500/20 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30">
            <Radio className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-900 dark:text-white">Supabase Cloud Realtime Active</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500 text-white">LIVE 2-WAY SYNC</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
              Connected Project: <code className="text-emerald-600 dark:text-emerald-400 font-mono text-[11px]">{SUPABASE_URL}</code>. Responses from all student devices synchronize across devices instantly.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => {
              requestSupabaseSnapshot();
              sendSupabaseSnapshot(candidates);
              onRefresh();
            }}
            className="px-3.5 py-2 rounded-2xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-all flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Force Cloud Realtime Sync</span>
          </button>
        </div>
      </div>

      {/* 3. SEARCH & FILTER BAR */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search candidate by name, email, or school..."
            className="w-full pl-10 pr-4 py-2 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 self-end sm:self-auto flex-wrap">
          <button
            onClick={() => setFilterStatus('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              filterStatus === 'all'
                ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            All ({candidates.length})
          </button>

          <button
            onClick={() => setFilterStatus('in_progress')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              filterStatus === 'in_progress'
                ? 'bg-white dark:bg-slate-800 text-sky-600 dark:text-sky-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            In-Progress ({inProgressCount})
          </button>

          <button
            onClick={() => setFilterStatus('pending')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              filterStatus === 'pending'
                ? 'bg-white dark:bg-slate-800 text-amber-600 dark:text-amber-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            Submitted ({submittedCount})
          </button>

          <button
            onClick={() => setFilterStatus('evaluated')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              filterStatus === 'evaluated'
                ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            Evaluated ({evaluatedCount})
          </button>
        </div>
      </div>

      {/* 4. CANDIDATES PIPELINE TABLE */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 shadow-xl shadow-slate-900/5 dark:shadow-black/40 overflow-hidden">
        {filteredCandidates.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-sm space-y-3">
            <p>No student submissions found matching your search.</p>
            <button
              onClick={handleSeedBatch}
              className="px-4 py-2 rounded-2xl text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 transition-all inline-flex items-center gap-2"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Seed Sample CS Candidates</span>
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-200/80 dark:divide-slate-800/80">
            {filteredCandidates.map((cand) => {
              const isGraded = cand.status === 'evaluated' && cand.evaluation;
              const isInProgress = cand.status === 'in_progress' || cand.status === 'not_started';
              const mcqAnsweredCount = cand.answers?.filter((a) => a.questionId.startsWith('q') && a.questionId !== 'q25' && a.selectedOptionIndex !== undefined).length || 0;
              const hasQ25 = cand.answers?.some((a) => a.questionId === 'q25' && (a.websitePrompt || a.htmlCode));

              return (
                <div
                  key={cand.id}
                  className="p-5 sm:p-6 hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                >
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-base shrink-0 border ${
                      isGraded
                        ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border-emerald-200/60 dark:border-emerald-800/60'
                        : isInProgress
                        ? 'bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 border-sky-200/60 dark:border-sky-800/60'
                        : 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border-amber-200/60 dark:border-amber-800/60'
                    }`}>
                      {isGraded ? (
                        cand.evaluation!.totalScore
                      ) : isInProgress ? (
                        <Radio className="w-5 h-5 animate-pulse" />
                      ) : (
                        <Clock className="w-5 h-5" />
                      )}
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-base font-bold text-slate-900 dark:text-white">
                          {cand.details.fullName}
                        </h3>
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          ({cand.details.email})
                        </span>
                        {isGraded ? (
                          <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                            Grade: {cand.evaluation!.grade} • {cand.evaluation!.badge || 'Certified'}
                          </span>
                        ) : isInProgress ? (
                          <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-pulse" />
                            <span>Live on Device</span>
                          </span>
                        ) : (
                          <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                            Submitted • Ready for Score
                          </span>
                        )}
                        {cand.emailDispatched && (
                          <span className="text-[10px] font-medium text-slate-400 flex items-center gap-1">
                            <Mail className="w-3 h-3 text-emerald-500" />
                            <span>Score Emailed</span>
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
                        <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                          {cand.details.schoolName || 'Tamil Nadu HSS'}
                        </span>
                        <span>•</span>
                        <span>{cand.details.standard || '12th Computer Science'}</span>
                        <span>•</span>
                        <span>Phone: {cand.details.phone}</span>
                        {cand.details.githubProfile && (
                          <>
                            <span>•</span>
                            <a
                              href={cand.details.githubProfile.startsWith('http') ? cand.details.githubProfile : `https://${cand.details.githubProfile}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-cyan-400 hover:underline flex items-center gap-1 font-mono text-[11px]"
                            >
                              <span>GitHub</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </>
                        )}
                      </div>

                      {/* Response summary pill */}
                      <div className="flex items-center gap-2 pt-1 flex-wrap text-[11px]">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium">
                          📝 MCQs: {mcqAnsweredCount}/24 Answered
                        </span>
                        <span className={`px-2 py-0.5 rounded-md font-medium ${
                          hasQ25
                            ? 'bg-cyan-50 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-300 border border-cyan-200/50 dark:border-cyan-800/50'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                        }`}>
                          🌐 Q25 Website: {hasQ25 ? 'Provided' : 'Pending'}
                        </span>
                        {cand.timeSpentSeconds && (
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                            ⏱️ Duration: {Math.floor(cand.timeSpentSeconds / 60)}m {cand.timeSpentSeconds % 60}s
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                    <button
                      onClick={() => handleOpenEvaluationModal(cand)}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-2xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition-all hover:scale-105"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Inspect Responses & Score</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 5. MULTI-CANDIDATE DETAILED RESPONSE & EVALUATION MODAL */}
      <AnimatePresence>
        {selectedCandidate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6">
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
              className="relative w-full max-w-5xl max-h-[92vh] bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-8 border border-slate-200/80 dark:border-slate-800/80 shadow-2xl overflow-y-auto space-y-6 text-slate-900 dark:text-slate-100"
            >
              {/* Modal Header with Multi-Candidate Switcher Navigation */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/80 dark:border-slate-800/80">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                      Candidate: {selectedCandidate.details.fullName}
                    </h2>
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-cyan-950 text-cyan-300 font-cyber-mono font-semibold border border-cyan-500/40">
                      {selectedCandidate.details.standard || '12th CS'}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-medium">
                      {selectedCandidate.details.schoolName || 'Tamil Nadu HSS'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 font-rajdhani flex items-center gap-3 flex-wrap">
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

                {/* Candidate Switcher Dropdown & Controls */}
                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs">
                    <button
                      onClick={() => handleSwitchCandidate('prev')}
                      className="p-1.5 rounded-xl hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
                      title="Previous Candidate"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>

                    <select
                      value={selectedCandidate.id}
                      onChange={(e) => {
                        const target = filteredCandidates.find((c) => c.id === e.target.value);
                        if (target) handleOpenEvaluationModal(target);
                      }}
                      className="bg-transparent text-xs font-semibold px-2 py-1 text-slate-800 dark:text-slate-200 outline-none cursor-pointer"
                    >
                      {filteredCandidates.map((c, i) => (
                        <option key={c.id} value={c.id} className="dark:bg-slate-900">
                          {i + 1}. {c.details.fullName} ({c.evaluation?.totalScore ? `${c.evaluation.totalScore} pts` : 'Pending'})
                        </option>
                      ))}
                    </select>

                    <button
                      onClick={() => handleSwitchCandidate('next')}
                      className="p-1.5 rounded-xl hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
                      title="Next Candidate"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>

                  <button
                    onClick={() => setSelectedCandidate(null)}
                    className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* TABS: MCQS vs QUESTION 25 WEBSITE */}
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setActivePreviewCandidateTab('mcqs')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                      activePreviewCandidateTab === 'mcqs'
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <Code2 className="w-4 h-4" />
                    <span>24 Code MCQs ({correctMcqsCount * 3}/72 pts)</span>
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
                    <span>Question 25 Website Build</span>
                  </button>
                </div>

                {copiedNotification && (
                  <span className="text-xs text-emerald-500 font-semibold flex items-center gap-1 animate-fade-in">
                    <Check className="w-3.5 h-3.5" />
                    <span>{copiedNotification} copied!</span>
                  </span>
                )}
              </div>

              {/* VIEW 1: 24 MCQS INSPECTION & BREAKDOWN */}
              {activePreviewCandidateTab === 'mcqs' && (
                <div className="space-y-4">
                  {/* Filter Sub-Bar */}
                  <div className="flex items-center justify-between gap-3 flex-wrap bg-slate-50 dark:bg-slate-950 p-3 rounded-2xl border border-slate-200 dark:border-slate-800">
                    <div className="flex items-center gap-2 text-xs font-medium">
                      <span className="text-slate-400">Filter MCQs:</span>
                      <button
                        onClick={() => setMcqFilter('all')}
                        className={`px-2.5 py-1 rounded-lg transition-colors ${
                          mcqFilter === 'all'
                            ? 'bg-indigo-600 text-white font-bold'
                            : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        All (24)
                      </button>
                      <button
                        onClick={() => setMcqFilter('correct')}
                        className={`px-2.5 py-1 rounded-lg transition-colors ${
                          mcqFilter === 'correct'
                            ? 'bg-emerald-600 text-white font-bold'
                            : 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400'
                        }`}
                      >
                        Correct ({correctMcqsCount})
                      </button>
                      <button
                        onClick={() => setMcqFilter('incorrect')}
                        className={`px-2.5 py-1 rounded-lg transition-colors ${
                          mcqFilter === 'incorrect'
                            ? 'bg-rose-600 text-white font-bold'
                            : 'bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-400'
                        }`}
                      >
                        Incorrect ({incorrectMcqsCount})
                      </button>
                      <button
                        onClick={() => setMcqFilter('unanswered')}
                        className={`px-2.5 py-1 rounded-lg transition-colors ${
                          mcqFilter === 'unanswered'
                            ? 'bg-slate-700 text-white font-bold'
                            : 'bg-white dark:bg-slate-900 text-slate-500'
                        }`}
                      >
                        Unanswered ({unansweredMcqsCount})
                      </button>
                    </div>

                    <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Auto-Graded MCQ Score: <span className="text-indigo-600 dark:text-indigo-400 font-mono text-sm">{correctMcqsCount * 3} / 72</span> Points
                    </div>
                  </div>

                  {/* Question Cards List */}
                  <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                    {filteredMcqs.length === 0 ? (
                      <div className="py-8 text-center text-slate-400 text-xs">
                        No questions in this filter category.
                      </div>
                    ) : (
                      filteredMcqs.map(({ q, ans, isAnswered, isCorrect }) => {
                        return (
                          <div
                            key={`eval-mcq-${q.id}`}
                            className={`p-4 rounded-2xl border text-xs space-y-2.5 ${
                              !isAnswered
                                ? 'bg-slate-50/60 dark:bg-slate-950/40 border-slate-200 dark:border-slate-800'
                                : isCorrect
                                ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200/60 dark:border-emerald-800/40'
                                : 'bg-rose-50/40 dark:bg-rose-950/20 border-rose-200/60 dark:border-rose-800/40'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-900 dark:text-white">
                                  Q{q.qNumber}: {q.title}
                                </span>
                                <span className="px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-[10px] text-slate-700 dark:text-slate-300 font-semibold">
                                  {q.syllabusStandard} • {q.topic}
                                </span>
                              </div>
                              <span className={`font-semibold flex items-center gap-1 ${
                                !isAnswered
                                  ? 'text-slate-400'
                                  : isCorrect
                                  ? 'text-emerald-600 dark:text-emerald-400'
                                  : 'text-rose-600 dark:text-rose-400'
                              }`}>
                                {isCorrect ? <CheckCircle2 className="w-3.5 h-3.5" /> : !isAnswered ? <Clock className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                                {isCorrect ? `+${q.points || 3} Points` : isAnswered ? '0 Points' : 'Unanswered (0 pts)'}
                              </span>
                            </div>

                            <p className="text-slate-600 dark:text-slate-300 text-[11px]">
                              {q.description}
                            </p>

                            {q.codeSnippet && (
                              <pre className="p-2.5 rounded-xl bg-slate-950 text-emerald-300 font-mono text-[11px] overflow-x-auto max-h-28">
                                <code>{q.codeSnippet}</code>
                              </pre>
                            )}

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                              <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                                <span className="text-slate-400 block text-[10px]">Candidate's Selected Option:</span>
                                <span className={`font-bold mt-0.5 block ${
                                  !isAnswered
                                    ? 'text-slate-400'
                                    : isCorrect
                                    ? 'text-emerald-600 dark:text-emerald-400'
                                    : 'text-rose-600 dark:text-rose-400'
                                }`}>
                                  {ans?.selectedOptionIndex !== undefined && q.options
                                    ? q.options[ans.selectedOptionIndex]
                                    : 'No option chosen'}
                                </span>
                              </div>

                              <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                                <span className="text-slate-400 block text-[10px]">Correct Board Key:</span>
                                <span className="text-emerald-600 dark:text-emerald-400 font-bold mt-0.5 block">
                                  {q.correctOptionIndex !== undefined && q.options ? q.options[q.correctOptionIndex] : ''}
                                </span>
                              </div>
                            </div>

                            {q.explanation && (
                              <div className="p-2 rounded-lg bg-slate-100/60 dark:bg-slate-800/40 text-[10px] text-slate-500 dark:text-slate-400">
                                <strong>Explanation:</strong> {q.explanation}
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {/* VIEW 2: QUESTION 25 WEBSITE LIVE RENDER, PROMPT & CODE */}
              {activePreviewCandidateTab === 'website' && (
                <div className="space-y-4">
                  {/* Sub-Tabs: Live Render vs Candidate Prompt vs Source Code */}
                  <div className="flex items-center justify-between gap-2 flex-wrap bg-slate-50 dark:bg-slate-950 p-2.5 rounded-2xl border border-slate-200 dark:border-slate-800">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setActiveWebsiteViewMode('preview')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                          activeWebsiteViewMode === 'preview'
                            ? 'bg-indigo-600 text-white shadow-sm'
                            : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        Interactive Preview
                      </button>
                      <button
                        onClick={() => setActiveWebsiteViewMode('prompt')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                          activeWebsiteViewMode === 'prompt'
                            ? 'bg-indigo-600 text-white shadow-sm'
                            : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        Candidate's Prompt
                      </button>
                      <button
                        onClick={() => setActiveWebsiteViewMode('code')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                          activeWebsiteViewMode === 'code'
                            ? 'bg-indigo-600 text-white shadow-sm'
                            : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        Code Inspector
                      </button>
                    </div>

                    {/* Viewport switcher when in preview */}
                    {activeWebsiteViewMode === 'preview' && (
                      <div className="flex items-center gap-1 bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
                        <button
                          onClick={() => setWebsiteViewport('desktop')}
                          className={`p-1.5 rounded-lg transition-colors ${
                            websiteViewport === 'desktop' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                          }`}
                          title="Desktop View (100%)"
                        >
                          <Monitor className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setWebsiteViewport('tablet')}
                          className={`p-1.5 rounded-lg transition-colors ${
                            websiteViewport === 'tablet' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                          }`}
                          title="Tablet View (768px)"
                        >
                          <Tablet className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setWebsiteViewport('mobile')}
                          className={`p-1.5 rounded-lg transition-colors ${
                            websiteViewport === 'mobile' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                          }`}
                          title="Mobile View (375px)"
                        >
                          <Smartphone className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setIframeKey((k) => k + 1)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-white transition-colors"
                          title="Reload Sandbox"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Mode 1: Interactive Sandbox */}
                  {activeWebsiteViewMode === 'preview' && (
                    <div className="rounded-2xl overflow-hidden border border-slate-300 dark:border-slate-700 bg-slate-950 shadow-lg flex flex-col items-center">
                      <div className="w-full px-4 py-2 bg-slate-900 border-b border-slate-800 flex items-center justify-between text-xs text-slate-400 font-mono">
                        <span className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
                          <span>Candidate's Live Sandbox Output</span>
                        </span>
                        <span className="text-cyan-400 font-cyber-mono text-[11px]">
                          Viewport: {websiteViewport === 'desktop' ? '100% Fluid' : websiteViewport === 'tablet' ? '768px' : '375px'}
                        </span>
                      </div>

                      <div className="w-full flex justify-center p-2 bg-slate-900/50">
                        <iframe
                          key={iframeKey}
                          title="Candidate Website Live Preview"
                          srcDoc={q25Answer?.htmlCode || DEFAULT_QUESTIONS[24].websiteTemplate?.html || ''}
                          sandbox="allow-scripts"
                          style={{
                            width: websiteViewport === 'desktop' ? '100%' : websiteViewport === 'tablet' ? '768px' : '375px',
                            maxWidth: '100%',
                            height: '380px'
                          }}
                          className="border-0 bg-white rounded-xl shadow-md transition-all duration-300"
                        />
                      </div>
                    </div>
                  )}

                  {/* Mode 2: Candidate's Prompt */}
                  {activeWebsiteViewMode === 'prompt' && (
                    <div className="p-4 rounded-2xl bg-cyan-950/40 border border-cyan-500/40 text-xs space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-cyan-300 font-cyber-mono flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-cyan-400" />
                          <span>Candidate's Question 25 Prompt Specification:</span>
                        </span>
                        {q25Answer?.websitePrompt && (
                          <button
                            onClick={() => handleCopyText(q25Answer.websitePrompt || '', 'Prompt')}
                            className="px-2.5 py-1 rounded-lg bg-cyan-900/60 hover:bg-cyan-800 text-cyan-200 text-[11px] flex items-center gap-1 font-semibold transition-colors"
                          >
                            <Copy className="w-3 h-3" />
                            <span>Copy Prompt</span>
                          </button>
                        )}
                      </div>
                      <p className="text-slate-200 font-rajdhani text-sm leading-relaxed whitespace-pre-wrap bg-slate-950 p-4 rounded-xl border border-cyan-500/20">
                        {q25Answer?.websitePrompt || 'No prompt text submitted by candidate.'}
                      </p>
                    </div>
                  )}

                  {/* Mode 3: Source Code Inspector */}
                  {activeWebsiteViewMode === 'code' && (
                    <div className="rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 space-y-2">
                      <div className="px-4 py-2 bg-slate-900 border-b border-slate-800 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setActiveCodeSubTab('html')}
                            className={`px-2.5 py-1 rounded-md font-mono text-[11px] ${
                              activeCodeSubTab === 'html' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                            }`}
                          >
                            HTML Code
                          </button>
                          <button
                            onClick={() => setActiveCodeSubTab('css')}
                            className={`px-2.5 py-1 rounded-md font-mono text-[11px] ${
                              activeCodeSubTab === 'css' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                            }`}
                          >
                            CSS Code
                          </button>
                          <button
                            onClick={() => setActiveCodeSubTab('js')}
                            className={`px-2.5 py-1 rounded-md font-mono text-[11px] ${
                              activeCodeSubTab === 'js' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                            }`}
                          >
                            JavaScript Code
                          </button>
                        </div>

                        <button
                          onClick={() => {
                            const code =
                              activeCodeSubTab === 'html'
                                ? q25Answer?.htmlCode || ''
                                : activeCodeSubTab === 'css'
                                ? q25Answer?.cssCode || ''
                                : q25Answer?.jsCode || '';
                            handleCopyText(code, activeCodeSubTab.toUpperCase());
                          }}
                          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] flex items-center gap-1 font-semibold transition-colors"
                        >
                          <Copy className="w-3 h-3" />
                          <span>Copy Code</span>
                        </button>
                      </div>

                      <pre className="p-4 text-emerald-300 font-mono text-xs overflow-x-auto max-h-80 leading-relaxed">
                        <code>
                          {activeCodeSubTab === 'html'
                            ? q25Answer?.htmlCode || DEFAULT_QUESTIONS[24].websiteTemplate?.html || 'No HTML code'
                            : activeCodeSubTab === 'css'
                            ? q25Answer?.cssCode || '/* Custom CSS rules */'
                            : q25Answer?.jsCode || '// JavaScript logic'}
                        </code>
                      </pre>
                    </div>
                  )}
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
                      <option value="State Rank Gold">🏆 State Rank Gold (100 pts)</option>
                      <option value="Master CS Scholar">🌟 Master CS Scholar</option>
                      <option value="Python & C++ Pro">⚡ Python & C++ Pro</option>
                      <option value="Silver Scholar">🥈 Silver Scholar</option>
                      <option value="Bronze Scholar">🥉 Bronze Scholar</option>
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
                    <div className="flex items-center gap-2">
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={sendViaGmailOption}
                          onChange={(e) => setSendViaGmailOption(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-cyan-500"></div>
                      </label>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          const res = await signInWithGmail();
                          if (res?.user) {
                            setGmailUser(res.user);
                            setSendViaGmailOption(true);
                          }
                        } catch (err: any) {
                          console.warn('Gmail sign-in notice:', err.message);
                        }
                      }}
                      className="px-3 py-1.5 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold text-xs shadow-md shadow-cyan-500/20 transition-all active:scale-95 shrink-0"
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
                    Close
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
