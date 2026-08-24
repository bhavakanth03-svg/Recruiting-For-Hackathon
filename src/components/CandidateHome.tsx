import React, { useEffect } from 'react';
import { motion } from 'motion/react';
import {
  CheckCircle2,
  Clock,
  Award,
  Mail,
  Trophy,
  FileText,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  ChevronRight,
  Printer,
  Calendar,
  Layers,
  Code2,
  Cpu,
  MessagesSquare,
  AlertCircle,
  School,
  Globe,
  Flame,
  User,
  Phone
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { CandidateSubmission } from '../types';

interface CandidateHomeProps {
  submission: CandidateSubmission;
  onNavigateToLeaderboard: () => void;
  onOpenEmailOutbox: () => void;
}

export const CandidateHome: React.FC<CandidateHomeProps> = ({
  submission,
  onNavigateToLeaderboard,
  onOpenEmailOutbox
}) => {
  const isEvaluated = submission.status === 'evaluated' && !!submission.evaluation;

  // Trigger confetti if evaluated
  useEffect(() => {
    if (isEvaluated) {
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 }
        });
      } catch {
        // Ignored
      }
    }
  }, [isEvaluated]);

  const evaluation = submission.evaluation;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      {/* 1. HERO POST-SUBMISSION STATUS BANNER */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl p-6 sm:p-10 bg-gradient-to-br from-rose-950 via-slate-900 to-indigo-950 text-white border border-rose-500/20 shadow-2xl shadow-rose-950/40"
      >
        {/* Ambient background blur circles */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-rose-500/20 border border-rose-400/30 text-rose-300 text-xs font-semibold mb-3">
              <Flame className="w-3.5 h-3.5 text-rose-400" />
              <span>The Crucible • 25 Questions Logged</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-orbitron font-bold tracking-wider">
              Welcome back, {submission.details.fullName}
            </h1>
            <div className="flex items-center gap-3 text-xs text-slate-300 font-rajdhani mt-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full bg-rose-950/80 border border-rose-500/40 text-rose-300 font-semibold font-cyber-mono">
                {submission.details.role || 'Candidate'}
              </span>
              <span>•</span>
              <span>{submission.details.email}</span>
              <span>•</span>
              <span>{submission.details.phone}</span>
              {submission.details.githubProfile && (
                <>
                  <span>•</span>
                  <a
                    href={submission.details.githubProfile.startsWith('http') ? submission.details.githubProfile : `https://${submission.details.githubProfile}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-cyan-400 hover:underline flex items-center gap-1 font-cyber-mono"
                  >
                    <span>GitHub</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </>
              )}
            </div>
          </div>

          <div className="flex sm:flex-col items-end gap-2 bg-white/5 backdrop-blur-md p-4 rounded-2xl border border-white/10 shrink-0">
            <span className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">Student Test ID</span>
            <span className="font-mono text-xs text-rose-300 font-bold">{submission.id}</span>
            <span className="text-[10px] text-slate-400 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {submission.submittedAt ? new Date(submission.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Logged'}
            </span>
          </div>
        </div>
      </motion.div>

      {/* 2. REAL-TIME EVALUATION STATUS CARD */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200/80 dark:border-slate-800/80 shadow-xl shadow-slate-900/5 dark:shadow-black/40"
      >
        {isEvaluated && evaluation ? (
          /* STATE A: EVALUATION COMPLETE WITH SCORE */
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-slate-200/80 dark:border-slate-800/80">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/50 dark:border-emerald-800/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                  <Award className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                      Evaluation Complete
                    </h2>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
                      Grade: {evaluation.grade}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Evaluated by {evaluation.evaluatedBy} on {new Date(evaluation.evaluatedAt).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {/* Big Score Counter Badge */}
              <div className="flex items-baseline gap-1 bg-gradient-to-br from-indigo-50 to-rose-50 dark:from-indigo-950/50 dark:to-rose-950/50 px-5 py-3 rounded-2xl border border-indigo-200/60 dark:border-indigo-800/60">
                <span className="text-3xl font-extrabold text-indigo-600 dark:text-indigo-400 font-mono">
                  {evaluation.totalScore}
                </span>
                <span className="text-sm text-slate-500 dark:text-slate-400 font-semibold">/ 100 pts</span>
              </div>
            </div>

            {/* Rubric Category Breakdown Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800/80">
                <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-medium mb-1">
                  <Code2 className="w-3.5 h-3.5 text-indigo-500" />
                  <span>24 Code MCQs</span>
                </div>
                <div className="flex items-baseline justify-between mt-2">
                  <span className="text-lg font-bold text-slate-900 dark:text-white font-mono">
                    {evaluation.mcqScore !== undefined ? evaluation.mcqScore : evaluation.technicalAccuracy}
                  </span>
                  <span className="text-[11px] text-slate-400">/ 72 pts</span>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800/80">
                <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-medium mb-1">
                  <Globe className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Website Prompt Design</span>
                </div>
                <div className="flex items-baseline justify-between mt-2">
                  <span className="text-lg font-bold text-slate-900 dark:text-white font-mono">
                    {evaluation.websitePromptDesign || 14}
                  </span>
                  <span className="text-[11px] text-slate-400">/ 14 pts</span>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800/80">
                <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-medium mb-1">
                  <Cpu className="w-3.5 h-3.5 text-amber-500" />
                  <span>Website Interactivity</span>
                </div>
                <div className="flex items-baseline justify-between mt-2">
                  <span className="text-lg font-bold text-slate-900 dark:text-white font-mono">
                    {evaluation.websitePromptFunctionality || 13}
                  </span>
                  <span className="text-[11px] text-slate-400">/ 14 pts</span>
                </div>
              </div>
            </div>

            {/* Evaluator Written Feedback */}
            <div className="p-5 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50">
              <div className="flex items-center gap-2 mb-2 text-xs font-bold text-indigo-950 dark:text-indigo-200">
                <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>Evaluator Feedback & Academic Remarks:</span>
              </div>
              <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed italic">
                "{evaluation.feedback}"
              </p>
              {evaluation.badge && (
                <div className="mt-3 flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Assigned Badge:</span>
                  <span className="px-2.5 py-1 rounded-xl text-xs font-bold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                    🏆 {evaluation.badge}
                  </span>
                </div>
              )}
            </div>

            {/* Email Notification Status */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800/80 text-xs">
              <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                <Mail className="w-4 h-4 text-emerald-500" />
                <span>
                  Official evaluation score report delivered to: <strong>{submission.details.email}</strong>
                </span>
              </div>
              <button
                onClick={onOpenEmailOutbox}
                className="text-indigo-600 dark:text-indigo-400 hover:underline font-semibold flex items-center gap-1"
              >
                <span>View Email Receipt</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>
          </div>
        ) : (
          /* STATE B: UNDER EVALUATION BY CREATOR */
          <div className="py-6 text-center space-y-4">
            <div className="relative w-16 h-16 mx-auto">
              <div className="w-16 h-16 rounded-full border-4 border-indigo-200 dark:border-indigo-900/60 border-t-indigo-600 animate-spin" />
              <Clock className="w-6 h-6 text-indigo-600 dark:text-indigo-400 absolute inset-0 m-auto" />
            </div>

            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                Under Review by State Board CS Evaluator
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1.5 max-w-md mx-auto leading-relaxed">
                Your answers to the 24 Code MCQs and Question 25 School Portal Website prompt are currently being scored in the Evaluator Console.
              </p>
            </div>

            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/50 dark:border-emerald-800/50 text-emerald-700 dark:text-emerald-300 text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              <span>Real-Time Synchronization Active: This page updates automatically!</span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 max-w-md mx-auto text-xs text-slate-600 dark:text-slate-400">
              <p>💡 <em>Tip: You will receive an instant email score card at <strong>{submission.details.email}</strong> as soon as grading is completed.</em></p>
            </div>
          </div>
        )}
      </motion.div>

      {/* 3. QUICK ACTION TILES */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div
          onClick={onNavigateToLeaderboard}
          className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 hover:border-indigo-400 dark:hover:border-indigo-600/60 shadow-lg shadow-slate-900/5 cursor-pointer transition-all hover:scale-[1.01] group"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200/50 dark:border-amber-800/50 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <Trophy className="w-5 h-5" />
            </div>
            <ChevronRight className="w-5 h-5 text-slate-400 group-hover:translate-x-1 transition-transform" />
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">View State Board Leaderboard</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            See candidate ranks and top CS performers across Tamil Nadu schools.
          </p>
        </div>

        <div
          onClick={() => window.print()}
          className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 hover:border-indigo-400 dark:hover:border-indigo-600/60 shadow-lg shadow-slate-900/5 cursor-pointer transition-all hover:scale-[1.01] group"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="w-10 h-10 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200/50 dark:border-rose-800/50 flex items-center justify-center text-rose-600 dark:text-rose-400">
              <Printer className="w-5 h-5" />
            </div>
            <ChevronRight className="w-5 h-5 text-slate-400 group-hover:translate-x-1 transition-transform" />
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">Print / Save Score Card</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Generate an archival PDF certificate with school details and evaluation rubric.
          </p>
        </div>
      </div>

      {/* Creator Attribution */}
      <div className="pt-4 border-t border-slate-200/60 dark:border-slate-800/60 flex flex-wrap items-center justify-center gap-4 text-xs font-rajdhani text-slate-500 dark:text-slate-400">
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300">
          <User className="w-3.5 h-3.5 text-cyan-500" />
          <span>Created by : <strong className="text-slate-900 dark:text-cyan-300 font-semibold">Bhavakanth k</strong></span>
        </div>
        <a
          href="tel:6380650379"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:text-cyan-600 dark:hover:text-cyan-300 transition-colors"
        >
          <Phone className="w-3.5 h-3.5 text-cyan-500" />
          <span>Creator's mobile no : <strong className="text-slate-900 dark:text-cyan-300 font-mono">6380650379</strong></span>
        </a>
      </div>
    </div>
  );
};
