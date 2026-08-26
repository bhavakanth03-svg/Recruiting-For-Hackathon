import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Clock,
  CheckCircle2,
  AlertCircle,
  Play,
  RotateCcw,
  Sparkles,
  User,
  Mail,
  Phone,
  School,
  FileCode,
  Layers,
  Code2,
  Database,
  Globe,
  ArrowRight,
  ArrowLeft,
  Send,
  HelpCircle,
  KeyRound,
  ShieldCheck,
  ShieldAlert,
  Lock,
  Eye,
  Keyboard,
  Check,
  Laptop,
  Briefcase,
  GitBranch,
  ExternalLink,
  Award,
  AlertTriangle,
  RefreshCw
} from 'lucide-react';
import { CandidateDetails, CandidateAnswer, Question, CandidateSubmission } from '../types';
import { DEFAULT_QUESTIONS, CANDIDATE_ACCESS_CODE, CREATOR_ACCESS_CODE } from '../data/defaultData';
import { verifyAccessCode, syncCandidateProgress, checkCandidateProfile } from '../lib/api';
import { broadcastCandidateProgressViaSupabase, broadcastCandidateSubmissionViaSupabase } from '../lib/supabase';

interface CandidateAssessmentProps {
  initialDetails?: CandidateDetails;
  isAuthenticatedCandidate: boolean;
  onAuthenticated?: (role: 'candidate') => void;
  onSubmitAssessment: (
    details: CandidateDetails,
    answers: CandidateAnswer[],
    timeSpentSeconds: number,
    candidateId?: string,
    tabSwitchDetected?: boolean
  ) => Promise<void>;
  isSubmitting: boolean;
  existingCandidates?: CandidateSubmission[];
  currentSubmission?: CandidateSubmission | null;
  onViewExistingSubmission?: (candidate: CandidateSubmission) => void;
}

export const CandidateAssessment: React.FC<CandidateAssessmentProps> = ({
  initialDetails,
  isAuthenticatedCandidate,
  onAuthenticated,
  onSubmitAssessment,
  isSubmitting,
  existingCandidates,
  currentSubmission,
  onViewExistingSubmission
}) => {
  const TOTAL_TIME_SECONDS = 60 * 60;

  // Persistent Candidate ID across devices / sessions
  const [candidateId, setCandidateId] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('evalpulse_candidate_id');
      if (saved) return saved;
      const newId = `cand-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
      localStorage.setItem('evalpulse_candidate_id', newId);
      return newId;
    }
    return `cand-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
  });

  // Locked Profile State (if student has already completed their single attempt)
  const [lockedCandidateProfile, setLockedCandidateProfile] = useState<CandidateSubmission | null>(() => {
    if (currentSubmission && (currentSubmission.status === 'submitted' || currentSubmission.status === 'evaluated')) {
      return currentSubmission;
    }
    return null;
  });
  const [isCheckingProfile, setIsCheckingProfile] = useState(false);
  const [isCheckingRewriteStatus, setIsCheckingRewriteStatus] = useState(false);

  // Anti-Cheat Tab Switching Warning State (No Auto-Submit)
  const [tabSwitchCount, setTabSwitchCount] = useState<number>(0);
  const [showTabSwitchWarning, setShowTabSwitchWarning] = useState<boolean>(false);

  // Step state: 'gate' (requires access code) -> 'registration' -> 'testing' -> 'review'
  const [step, setStep] = useState<'gate' | 'registration' | 'testing' | 'review'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('evalpulse_active_step');
      if (saved && ['gate', 'registration', 'testing', 'review'].includes(saved)) {
        return saved as 'gate' | 'registration' | 'testing' | 'review';
      }
    }
    return isAuthenticatedCandidate ? (initialDetails?.fullName ? 'testing' : 'registration') : 'gate';
  });

  // Access Code Gate State
  const [accessCodeInput, setAccessCodeInput] = useState('');
  const [gateError, setGateError] = useState('');
  const [isVerifyingCode, setIsVerifyingCode] = useState(false);

  // Candidate Registration Profile State
  const [details, setDetails] = useState<CandidateDetails>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('evalpulse_candidate_details');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && typeof parsed === 'object' && parsed.fullName) {
            return parsed;
          }
        }
      } catch {
        // ignore
      }
    }
    return (
      initialDetails || {
        fullName: '',
        email: '',
        phone: '',
        role: 'Full Stack Developer',
        githubProfile: '',
        notes: ''
      }
    );
  });
  const [registrationErrors, setRegistrationErrors] = useState<Record<string, string>>({});

  // Assessment Progress State
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('evalpulse_current_q');
      if (saved) {
        const parsed = parseInt(saved, 10);
        if (!isNaN(parsed) && parsed >= 0 && parsed < DEFAULT_QUESTIONS.length) {
          return parsed;
        }
      }
    }
    return 0;
  });

  // Initialize 25 question answers with local persistence
  const [answers, setAnswers] = useState<Record<string, CandidateAnswer>>(() => {
    const initial: Record<string, CandidateAnswer> = {};
    DEFAULT_QUESTIONS.forEach((q) => {
      if (q.type === 'multiple_choice') {
        initial[q.id] = { questionId: q.id, selectedOptionIndex: undefined };
      } else if (q.type === 'website_prompt') {
        initial[q.id] = {
          questionId: q.id,
          websitePrompt: '',
          htmlCode: q.websiteTemplate?.html || '',
          cssCode: q.websiteTemplate?.css || '',
          jsCode: q.websiteTemplate?.js || ''
        };
      } else {
        initial[q.id] = { questionId: q.id, answerText: '' };
      }
    });

    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('evalpulse_candidate_answers');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && typeof parsed === 'object') {
            return { ...initial, ...parsed };
          }
        }
      } catch {
        // ignore
      }
    }
    return initial;
  });

  // Active Tab for Q25 Website Builder: 'preview' | 'html' | 'css' | 'js' | 'prompt'
  const [activeWebTab, setActiveWebTab] = useState<'preview' | 'html' | 'css' | 'js' | 'prompt'>('preview');

  // Timer State (60 Minutes for 25 Questions)
  const [timeRemaining, setTimeRemaining] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('evalpulse_time_remaining');
      if (saved) {
        const parsed = parseInt(saved, 10);
        if (!isNaN(parsed) && parsed > 0 && parsed <= TOTAL_TIME_SECONDS) {
          return parsed;
        }
      }
    }
    return TOTAL_TIME_SECONDS;
  });
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [lastAutoSavedTime, setLastAutoSavedTime] = useState<string | null>(null);

  // Keyboard navigation feedback
  const [recentKeyPress, setRecentKeyPress] = useState<string | null>(null);

  // Sync state changes to localStorage continuously
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('evalpulse_active_step', step);
    }
  }, [step]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('evalpulse_candidate_details', JSON.stringify(details));
    }
  }, [details]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('evalpulse_candidate_answers', JSON.stringify(answers));
      const now = new Date();
      setLastAutoSavedTime(`${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`);
    }
  }, [answers]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('evalpulse_current_q', currentQuestionIndex.toString());
    }
  }, [currentQuestionIndex]);

  useEffect(() => {
    if (typeof window !== 'undefined' && step === 'testing') {
      localStorage.setItem('evalpulse_time_remaining', timeRemaining.toString());
    }
  }, [timeRemaining, step]);

  const handleResetDraft = () => {
    if (window.confirm('Are you sure you want to reset your assessment draft and start fresh? All entered responses will be cleared.')) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('evalpulse_active_step');
        localStorage.removeItem('evalpulse_candidate_details');
        localStorage.removeItem('evalpulse_candidate_answers');
        localStorage.removeItem('evalpulse_current_q');
        localStorage.removeItem('evalpulse_time_remaining');
      }
      setStep('registration');
      setCurrentQuestionIndex(0);
      setTimeRemaining(TOTAL_TIME_SECONDS);
      const freshAnswers: Record<string, CandidateAnswer> = {};
      DEFAULT_QUESTIONS.forEach((q) => {
        if (q.type === 'multiple_choice') {
          freshAnswers[q.id] = { questionId: q.id, selectedOptionIndex: undefined };
        } else if (q.type === 'website_prompt') {
          freshAnswers[q.id] = {
            questionId: q.id,
            websitePrompt: '',
            htmlCode: q.websiteTemplate?.html || '',
            cssCode: q.websiteTemplate?.css || '',
            jsCode: q.websiteTemplate?.js || ''
          };
        } else {
          freshAnswers[q.id] = { questionId: q.id, answerText: '' };
        }
      });
      setAnswers(freshAnswers);
    }
  };

  // Handle Authentication Gate Submit
  const handleVerifyAccessCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessCodeInput.trim()) {
      setGateError('Please enter your candidate access code to unlock The Crucible test.');
      return;
    }

    setIsVerifyingCode(true);
    setGateError('');

    try {
      const res = await verifyAccessCode(accessCodeInput.trim());
      if (res.success) {
        if (onAuthenticated) onAuthenticated('candidate');
        setStep('registration');
      } else {
        setGateError(res.message || 'Invalid access code. Access denied.');
      }
    } catch (err: any) {
      // Fallback local check
      const code = accessCodeInput.trim();
      if (code === CANDIDATE_ACCESS_CODE) {
        if (onAuthenticated) onAuthenticated('candidate');
        setStep('registration');
      } else {
        setGateError('Invalid access code. Access denied.');
      }
    } finally {
      setIsVerifyingCode(false);
    }
  };

  // Start timer once testing begins
  useEffect(() => {
    if (step === 'testing') {
      setIsTimerRunning(true);
    }
  }, [step]);

  useEffect(() => {
    let interval: any = null;
    if (isTimerRunning && timeRemaining > 0) {
      interval = setInterval(() => {
        setTimeRemaining((prev) => Math.max(0, prev - 1));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, timeRemaining]);

  // Global Keyboard Shortcuts for MCQ selection and navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Disable shortcuts when student is typing in an input or textarea
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }

      if (step !== 'testing') return;

      const curQ = DEFAULT_QUESTIONS[currentQuestionIndex];

      // MCQ Option selection via keys: 1, 2, 3, 4 or A, B, C, D
      if (curQ.type === 'multiple_choice' && curQ.options) {
        let optIdx: number | null = null;
        const key = e.key.toUpperCase();

        if (key === '1' || key === 'A') optIdx = 0;
        else if (key === '2' || key === 'B') optIdx = 1;
        else if (key === '3' || key === 'C') optIdx = 2;
        else if (key === '4' || key === 'D') optIdx = 3;

        if (optIdx !== null && optIdx < curQ.options.length) {
          e.preventDefault();
          handleSelectOption(curQ.id, optIdx);
          setRecentKeyPress(key);
          setTimeout(() => setRecentKeyPress(null), 800);
          return;
        }
      }

      // Next / Previous Navigation keys
      if (e.key === 'ArrowRight' || e.key.toLowerCase() === 'n') {
        e.preventDefault();
        if (currentQuestionIndex < DEFAULT_QUESTIONS.length - 1) {
          setCurrentQuestionIndex((prev) => prev + 1);
        }
      } else if (e.key === 'ArrowLeft' || e.key.toLowerCase() === 'p') {
        e.preventDefault();
        if (currentQuestionIndex > 0) {
          setCurrentQuestionIndex((prev) => prev - 1);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [step, currentQuestionIndex]);

  // Check if current stored submission or matching profile already exists on load
  useEffect(() => {
    if (currentSubmission && (currentSubmission.status === 'submitted' || currentSubmission.status === 'evaluated')) {
      setLockedCandidateProfile(currentSubmission);
    }
  }, [currentSubmission]);

  // Anti-Cheat: Tab Switch Detection & Warning (NO AUTO-SUBMISSION)
  useEffect(() => {
    if (step !== 'testing' && step !== 'review') return;

    const handleVisibilityChange = () => {
      if (document.hidden || document.visibilityState === 'hidden') {
        setTabSwitchCount((prev) => {
          const nextCount = prev + 1;
          // Send progress update with warning count logged for evaluator
          const formattedAnswers = Object.values(answers) as CandidateAnswer[];
          const timeSpent = TOTAL_TIME_SECONDS - timeRemaining;
          syncCandidateProgress({
            id: candidateId,
            candidateCode: 'CANDIDATE-2025',
            details,
            status: 'in_progress',
            answers: formattedAnswers,
            timeSpentSeconds: timeSpent,
            tabSwitchDetected: true,
            tabSwitchCount: nextCount
          });
          return nextCount;
        });
        setShowTabSwitchWarning(true);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [step, answers, details, timeRemaining, candidateId]);

  const handleStartRewrite = () => {
    setAnswers({});
    try {
      localStorage.removeItem('evalpulse_candidate_answers');
      localStorage.removeItem('evalpulse_candidate_submission');
    } catch {}
    setTimeRemaining(TOTAL_TIME_SECONDS);
    setLockedCandidateProfile(null);
    setCurrentQuestionIndex(0);
    setStep('testing');
    setTabSwitchCount(0);
    setShowTabSwitchWarning(false);

    syncCandidateProgress({
      id: candidateId,
      candidateCode: 'CANDIDATE-2025',
      details,
      status: 'in_progress',
      answers: [],
      timeSpentSeconds: 0,
      startedAt: new Date().toISOString(),
      tabSwitchDetected: false,
      tabSwitchCount: 0,
      allowRewrite: true
    });
  };

  const handleCheckRewriteStatus = async () => {
    setIsCheckingRewriteStatus(true);
    try {
      const res = await checkCandidateProfile({
        email: details.email || lockedCandidateProfile?.details?.email,
        phone: details.phone || lockedCandidateProfile?.details?.phone,
        candidateId: lockedCandidateProfile?.id || candidateId
      });

      if (res.allowRewrite || (res.existingCandidate && res.existingCandidate.allowRewrite)) {
        if (res.existingCandidate) {
          setLockedCandidateProfile(res.existingCandidate);
        }
      }
    } catch (err) {
      console.warn('Check rewrite error:', err);
    } finally {
      setIsCheckingRewriteStatus(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleRegistrationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};
    if (!details.fullName.trim()) errors.fullName = 'Candidate name is required';
    if (!details.email.trim() || !details.email.includes('@')) errors.email = 'Valid e-mail address is required';
    if (!details.phone.trim()) errors.phone = 'Phone number is required';
    if (!details.role || !details.role.trim()) errors.role = 'Candidate role is required';

    if (Object.keys(errors).length > 0) {
      setRegistrationErrors(errors);
      return;
    }

    setRegistrationErrors({});
    setIsCheckingProfile(true);

    try {
      // 1. Check local & props candidates for already submitted attempts from this profile
      const normEmail = details.email.trim().toLowerCase();
      const normPhone = details.phone.replace(/\D/g, '');
      const localMatch = existingCandidates?.find((c) => {
        if (c.status !== 'submitted' && c.status !== 'evaluated') return false;
        if (c.id === candidateId) return true;
        if (c.details.email && c.details.email.trim().toLowerCase() === normEmail) return true;
        if (normPhone && normPhone.length >= 7 && c.details.phone) {
          const cp = c.details.phone.replace(/\D/g, '');
          if (cp && (cp === normPhone || cp.endsWith(normPhone) || normPhone.endsWith(cp))) return true;
        }
        return false;
      });

      if (localMatch) {
        if (localMatch.allowRewrite) {
          setLockedCandidateProfile(null);
        } else {
          setLockedCandidateProfile(localMatch);
          setIsCheckingProfile(false);
          return;
        }
      }

      // 2. Query backend API for profile duplication verification
      const checkRes = await checkCandidateProfile({
        email: details.email,
        phone: details.phone,
        candidateId
      });

      if (checkRes.alreadySubmitted && checkRes.existingCandidate && !checkRes.allowRewrite) {
        setLockedCandidateProfile(checkRes.existingCandidate);
        setIsCheckingProfile(false);
        return;
      }
    } catch (err) {
      console.warn('Profile check error:', err);
    } finally {
      setIsCheckingProfile(false);
    }

    setStep('testing');

    // Instantly sync candidate registration across all devices so creator dashboard immediately sees the student
    const progressPayload: Partial<CandidateSubmission> = {
      id: candidateId,
      candidateCode: 'CANDIDATE-2025',
      details,
      status: 'in_progress',
      answers: Object.values(answers) as CandidateAnswer[],
      timeSpentSeconds: TOTAL_TIME_SECONDS - timeRemaining,
      startedAt: new Date().toISOString()
    };
    syncCandidateProgress(progressPayload);
    broadcastCandidateProgressViaSupabase(progressPayload);
  };

  // Real-time live auto-sync to server & Supabase Cloud across devices during testing
  useEffect(() => {
    if (step !== 'testing' || !details.fullName) return;
    const timer = setTimeout(() => {
      const payload: Partial<CandidateSubmission> = {
        id: candidateId,
        candidateCode: 'CANDIDATE-2025',
        details,
        status: 'in_progress',
        answers: Object.values(answers) as CandidateAnswer[],
        timeSpentSeconds: TOTAL_TIME_SECONDS - timeRemaining
      };
      syncCandidateProgress(payload);
      broadcastCandidateProgressViaSupabase(payload);
    }, 1200);
    return () => clearTimeout(timer);
  }, [answers, details, step, candidateId, timeRemaining]);

  const currentQuestion = DEFAULT_QUESTIONS[currentQuestionIndex];

  const handleSelectOption = (qId: string, optIndex: number) => {
    setAnswers((prev) => ({
      ...prev,
      [qId]: { ...prev[qId], questionId: qId, selectedOptionIndex: optIndex }
    }));
  };

  const handleUpdateWebsiteCode = (field: 'htmlCode' | 'cssCode' | 'jsCode' | 'websitePrompt', value: string) => {
    setAnswers((prev) => ({
      ...prev,
      q25: {
        ...prev['q25'],
        questionId: 'q25',
        [field]: value
      }
    }));
  };

  const handleFinalSubmit = async () => {
    const formattedAnswers = Object.values(answers);
    const timeSpent = TOTAL_TIME_SECONDS - timeRemaining;
    await onSubmitAssessment(details, formattedAnswers, timeSpent, candidateId);
  };

  // Generate live iframe srcDoc for Q25
  const getCompiledWebsiteHtml = () => {
    const html = answers['q25']?.htmlCode || DEFAULT_QUESTIONS[24].websiteTemplate?.html || '';
    const css = answers['q25']?.cssCode || '';
    const js = answers['q25']?.jsCode || '';

    if (html.includes('</head>')) {
      return html
        .replace('</head>', `<style>${css}</style></head>`)
        .replace('</body>', `<script>${js}</script></body>`);
    }

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <script src="https://cdn.tailwindcss.com"></script>
  <style>${css}</style>
</head>
<body>
  ${html}
  <script>${js}</script>
</body>
</html>`;
  };

  const getLanguageBadge = (lang: Question['language']) => {
    switch (lang) {
      case 'C++':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60">
            <Code2 className="w-3 h-3" />
            <span>11th C++ Core</span>
          </span>
        );
      case 'Python':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
            <Layers className="w-3 h-3" />
            <span>12th Python</span>
          </span>
        );
      case 'SQL':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60">
            <Database className="w-3 h-3" />
            <span>12th DBMS / SQL</span>
          </span>
        );
      case 'HTML/CSS/JS':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60">
            <Globe className="w-3 h-3" />
            <span>Interactive Web Prompt</span>
          </span>
        );
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 flex-1 flex flex-col">
      {/* 0. LOCKED PROFILE STATE (CANDIDATE CANNOT WRITE TEST AGAIN FROM SAME PROFILE) */}
      {lockedCandidateProfile && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-xl mx-auto bg-slate-900/95 border border-amber-500/50 rounded-3xl p-6 sm:p-10 shadow-2xl cyber-glow-amber text-slate-100 space-y-6 text-center cyber-corner-box cyber-grid-bg relative overflow-hidden"
        >
          <div className="absolute inset-0 cyber-scanlines pointer-events-none opacity-20" />
          <div className="w-16 h-16 rounded-3xl bg-amber-500/10 border border-amber-500/40 flex items-center justify-center text-amber-400 mx-auto shadow-inner relative z-10">
            <Lock className="w-8 h-8 text-amber-400" />
          </div>

          <div className="relative z-10 space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-950/80 border border-amber-500/50 text-amber-300 text-xs font-cyber-mono font-bold tracking-wider uppercase">
              <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
              <span>SINGLE ATTEMPT ENFORCED • PROFILE LOCKED</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black font-orbitron tracking-wider text-white">
              Assessment Already Completed
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 font-rajdhani leading-relaxed max-w-md mx-auto">
              A finalized test record already exists for <strong className="text-amber-300 font-semibold">{lockedCandidateProfile.details?.fullName || 'this candidate'}</strong>. Candidates cannot write the examination again from the same profile.
            </p>
          </div>

          {/* Existing Submission summary card */}
          <div className="p-4 sm:p-5 rounded-2xl bg-slate-950/90 border border-slate-800 text-left space-y-3 text-xs font-rajdhani relative z-10">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-slate-400 font-medium">Candidate Profile:</span>
              <span className="text-white font-bold">{lockedCandidateProfile.details?.fullName} ({lockedCandidateProfile.details?.role})</span>
            </div>
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-slate-400 font-medium">Registered E-mail:</span>
              <span className="text-cyan-300 font-mono">{lockedCandidateProfile.details?.email}</span>
            </div>
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-slate-400 font-medium">Mobile Contact:</span>
              <span className="text-slate-200 font-mono">{lockedCandidateProfile.details?.phone}</span>
            </div>
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-slate-400 font-medium">Submission Timestamp:</span>
              <span className="text-slate-200 font-mono">{lockedCandidateProfile.submittedAt ? new Date(lockedCandidateProfile.submittedAt).toLocaleString() : 'Finalized'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400 font-medium">Examination Status:</span>
              <span className={`px-2.5 py-0.5 rounded-full font-cyber-mono text-[10px] font-bold ${
                lockedCandidateProfile.status === 'evaluated'
                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/50'
                  : 'bg-indigo-950 text-indigo-300 border border-indigo-500/50'
              }`}>
                {lockedCandidateProfile.status === 'evaluated'
                  ? `Evaluated: ${lockedCandidateProfile.evaluation?.totalScore ?? '--'}/100 (Grade ${lockedCandidateProfile.evaluation?.grade ?? 'A'})`
                  : 'Submitted & In Evaluator Review'}
              </span>
            </div>
            {lockedCandidateProfile.allowRewrite ? (
              <div className="p-4 rounded-2xl bg-cyan-950/90 border-2 border-cyan-400 text-cyan-200 text-left space-y-3 relative z-10 shadow-xl cyber-glow-cyan animate-pulse">
                <div className="flex items-center gap-2 text-cyan-300 font-orbitron font-bold text-sm">
                  <RotateCcw className="w-5 h-5 text-cyan-400" />
                  <span>✨ Rewrite Feature by Creator: Authorization Granted!</span>
                </div>
                <p className="text-xs text-cyan-100/90 font-rajdhani leading-relaxed">
                  The assessment creator has authorized you to rewrite your assessment. You can now start a fresh 60-minute attempt.
                </p>
                <button
                  type="button"
                  onClick={handleStartRewrite}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-400 via-teal-400 to-emerald-400 hover:from-cyan-300 hover:to-emerald-300 text-slate-950 font-orbitron font-bold text-xs uppercase tracking-wider shadow-lg transition-all hover:scale-[1.01]"
                >
                  <RotateCcw className="w-4 h-4 text-slate-950" />
                  <span>Start Rewrite Assessment Now</span>
                </button>
              </div>
            ) : (
              <div className="p-3.5 rounded-2xl bg-slate-950/90 border border-slate-800 text-left space-y-2 relative z-10 text-xs font-rajdhani">
                <div className="flex items-center justify-between text-slate-300 font-semibold">
                  <span>Rewrite Status:</span>
                  <span className="text-amber-400 font-mono">Requires Creator Authorization</span>
                </div>
                <p className="text-slate-400 text-[11px]">
                  If you were previously auto-submitted or need a retake, please contact the assessment creator to enable the <strong>"Rewrite Feature by Creator"</strong>.
                </p>
                <button
                  type="button"
                  disabled={isCheckingRewriteStatus}
                  onClick={handleCheckRewriteStatus}
                  className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white font-cyber-mono text-[11px] font-semibold transition-all disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isCheckingRewriteStatus ? 'animate-spin' : ''}`} />
                  <span>{isCheckingRewriteStatus ? 'Checking Creator Status...' : 'Check Rewrite Authorization'}</span>
                </button>
              </div>
            )}
          </div>

          <div className="space-y-2.5 relative z-10 pt-2">
            <button
              type="button"
              onClick={() => {
                if (onViewExistingSubmission) {
                  onViewExistingSubmission(lockedCandidateProfile);
                }
              }}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-slate-950 font-orbitron font-bold text-xs uppercase tracking-wider shadow-lg cyber-glow-cyan transition-all hover:scale-[1.01]"
            >
              <Award className="w-4 h-4" />
              <span>View My Completed Scorecard & Results</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setLockedCandidateProfile(null);
                setDetails({
                  fullName: '',
                  email: '',
                  phone: '',
                  role: 'Full Stack Developer',
                  githubProfile: '',
                  notes: ''
                });
                const newId = `cand-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
                setCandidateId(newId);
                localStorage.setItem('evalpulse_candidate_id', newId);
                localStorage.removeItem('evalpulse_candidate_details');
                localStorage.removeItem('evalpulse_candidate_answers');
                localStorage.removeItem('evalpulse_current_q');
                localStorage.removeItem('evalpulse_time_remaining');
                localStorage.removeItem('evalpulse_candidate_submission');
                setStep('registration');
              }}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-2xl bg-slate-950/80 hover:bg-slate-800 border border-slate-700 text-slate-400 hover:text-white font-cyber-mono text-xs font-semibold transition-all"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
              <span>Register as a Different Candidate</span>
            </button>
          </div>
        </motion.div>
      )}

      {/* STEP 1: ACCESS CODE GATE (REQUIRED BEFORE TEST) */}
      {!lockedCandidateProfile && step === 'gate' && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md mx-auto bg-slate-900/95 border border-cyan-500/40 rounded-3xl p-8 sm:p-10 shadow-2xl cyber-glow-cyan text-slate-100 space-y-6 text-center cyber-corner-box cyber-grid-bg relative overflow-hidden"
        >
          <div className="absolute inset-0 cyber-scanlines pointer-events-none opacity-30" />
          <div className="w-14 h-14 rounded-2xl bg-slate-950 border border-cyan-500/60 flex items-center justify-center text-cyan-400 mx-auto shadow-inner cyber-glow-cyan relative z-10">
            <KeyRound className="w-7 h-7 animate-pulse" />
          </div>

          <div className="relative z-10">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-500/50 text-cyan-300 text-xs font-cyber-mono font-bold tracking-wider mb-2 uppercase">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping"></span>
              <span>TN CS // 25-QUESTION GAUNTLET</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black font-orbitron tracking-wider text-white">
              THE CRUCIBLE
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-2 font-rajdhani leading-relaxed">
              Enter your assigned confidential Candidate Access Code to unlock the 25-question examination (24 Code MCQs + 1 Live Website Build Challenge).
            </p>
          </div>

          <form onSubmit={handleVerifyAccessCode} className="space-y-4 relative z-10">
            <div className="text-left">
              <label className="block text-[11px] font-bold text-slate-300 mb-1.5 uppercase tracking-wider font-cyber-mono">
                Candidate Security Key *
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={accessCodeInput}
                  onChange={(e) => {
                    setAccessCodeInput(e.target.value);
                    setGateError('');
                  }}
                  placeholder="Enter candidate security code..."
                  className="w-full px-4 py-3.5 rounded-2xl bg-slate-950 border border-cyan-500/40 text-cyan-300 font-cyber-mono font-bold tracking-widest text-center text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400/40 focus:border-cyan-400 transition-all placeholder:text-slate-600"
                  autoFocus
                />
              </div>
              {gateError && (
                <div className="flex items-center gap-1.5 text-xs text-rose-400 bg-rose-950/50 p-2.5 rounded-xl border border-rose-500/40 mt-2 font-rajdhani">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{gateError}</span>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={isVerifyingCode}
              className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-2xl bg-gradient-to-r from-cyan-500 via-cyan-400 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-slate-950 font-orbitron font-bold text-xs uppercase tracking-widest shadow-lg cyber-glow-cyan transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
            >
              {isVerifyingCode ? (
                <span className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin"></span>
                  <span>Verifying Clearance...</span>
                </span>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Unlock Assessment Room</span>
                </>
              )}
            </button>

            {/* 1-Click Quick Access Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  setAccessCodeInput('CANDIDATE-2025');
                  if (onAuthenticated) onAuthenticated('candidate');
                  setStep('registration');
                }}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-cyan-950/60 hover:bg-cyan-900/60 border border-cyan-500/40 text-cyan-300 font-cyber-mono text-xs font-semibold transition-all hover:border-cyan-400"
              >
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                <span>One-Click Instant Access (Key: CANDIDATE-2025)</span>
              </button>
            </div>

            {/* Creator Attribution */}
            <div className="pt-4 border-t border-cyan-500/20 flex flex-col gap-2 text-center text-xs font-rajdhani text-slate-400">
              <div className="flex items-center justify-center gap-2 text-slate-300">
                <User className="w-3.5 h-3.5 text-cyan-400" />
                <span>Created by : <strong className="text-cyan-300 font-semibold">Bhavakanth k</strong></span>
              </div>
              <a
                href="tel:6380650379"
                className="flex items-center justify-center gap-2 text-slate-300 hover:text-cyan-300 transition-colors"
              >
                <Phone className="w-3.5 h-3.5 text-cyan-400" />
                <span>Creator's mobile no : <strong className="text-cyan-300 font-mono">6380650379</strong></span>
              </a>
            </div>
          </form>
        </motion.div>
      )}

      {/* 1. STEP 2: CANDIDATE REGISTRATION AND DETAILS */}
      {!lockedCandidateProfile && step === 'registration' && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-2xl mx-auto bg-slate-900/90 rounded-3xl p-6 sm:p-10 border border-cyan-500/30 shadow-2xl shadow-cyan-950/40 backdrop-blur-xl cyber-grid-bg"
        >
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-cyan-950/80 border border-cyan-500/50 text-cyan-300 text-xs font-cyber-mono font-semibold mb-3 cyber-glow-cyan">
              <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
              <span>ACCESS CODE VERIFIED • CANDIDATE ENROLLMENT</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-orbitron font-bold tracking-wider text-white">
              Candidate registration and details
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 font-rajdhani font-medium mt-2 max-w-md mx-auto">
              Please enter your candidate credentials below. Your official score report, certificate badge, and grading breakdown will be sent directly to your email.
            </p>
          </div>

          <form onSubmit={handleRegistrationSubmit} className="space-y-4">
            {/* Row 1: Name & E-mail */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-cyber-mono font-semibold text-cyan-300 uppercase tracking-wider mb-1.5">
                  Name *
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type="text"
                    value={details.fullName}
                    onChange={(e) => setDetails({ ...details, fullName: e.target.value })}
                    placeholder="e.g. Kavitha Ramasamy"
                    className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-950/80 border border-slate-700 focus:border-cyan-400 text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/20 transition-all font-rajdhani font-semibold placeholder:text-slate-600"
                  />
                </div>
                {registrationErrors.fullName && (
                  <p className="text-xs text-rose-400 mt-1 font-cyber-mono">{registrationErrors.fullName}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-cyber-mono font-semibold text-cyan-300 uppercase tracking-wider mb-1.5">
                  E-mail *
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type="email"
                    value={details.email}
                    onChange={(e) => setDetails({ ...details, email: e.target.value })}
                    placeholder="kavitha@example.edu.in"
                    className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-950/80 border border-slate-700 focus:border-cyan-400 text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/20 transition-all font-rajdhani font-semibold placeholder:text-slate-600"
                  />
                </div>
                {registrationErrors.email && (
                  <p className="text-xs text-rose-400 mt-1 font-cyber-mono">{registrationErrors.email}</p>
                )}
              </div>
            </div>

            {/* Row 2: Phone Number & Role */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-cyber-mono font-semibold text-cyan-300 uppercase tracking-wider mb-1.5">
                  Phone Number *
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type="tel"
                    value={details.phone}
                    onChange={(e) => setDetails({ ...details, phone: e.target.value })}
                    placeholder="+91 98401 23456"
                    className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-950/80 border border-slate-700 focus:border-cyan-400 text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/20 transition-all font-rajdhani font-semibold placeholder:text-slate-600"
                  />
                </div>
                {registrationErrors.phone && (
                  <p className="text-xs text-rose-400 mt-1 font-cyber-mono">{registrationErrors.phone}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-cyber-mono font-semibold text-cyan-300 uppercase tracking-wider mb-1.5">
                  Role *
                </label>
                <div className="relative">
                  <Briefcase className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type="text"
                    value={details.role || ''}
                    onChange={(e) => setDetails({ ...details, role: e.target.value })}
                    placeholder="e.g. Full Stack Developer / 12th CS Student"
                    className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-950/80 border border-slate-700 focus:border-cyan-400 text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/20 transition-all font-rajdhani font-semibold placeholder:text-slate-600"
                  />
                </div>
                {registrationErrors.role && (
                  <p className="text-xs text-rose-400 mt-1 font-cyber-mono">{registrationErrors.role}</p>
                )}
              </div>
            </div>

            {/* Quick role suggestions */}
            <div className="flex items-center gap-1.5 flex-wrap pt-1">
              <span className="text-[11px] text-slate-500 font-cyber-mono">Quick Roles:</span>
              {['Full Stack Developer', 'Frontend Developer', 'Backend Developer', 'Software Engineer', '12th CS Student', '11th CS Student'].map((r) => (
                <button
                  type="button"
                  key={r}
                  onClick={() => setDetails({ ...details, role: r })}
                  className={`text-[11px] px-2.5 py-0.5 rounded-lg border transition-colors font-rajdhani font-medium ${
                    details.role === r
                      ? 'bg-cyan-950 text-cyan-300 border-cyan-500/60 font-bold'
                      : 'bg-slate-950/60 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-200'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>

            {/* Row 3: GitHub Profile (Optional) */}
            <div>
              <label className="block text-xs font-cyber-mono font-semibold text-cyan-300 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                <span>GitHub Profile (Optional)</span>
                <span className="text-[10px] text-slate-500 lowercase">e.g. https://github.com/username</span>
              </label>
              <div className="relative">
                <GitBranch className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="text"
                  value={details.githubProfile || ''}
                  onChange={(e) => setDetails({ ...details, githubProfile: e.target.value })}
                  placeholder="https://github.com/your-handle"
                  className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-950/80 border border-slate-700 focus:border-cyan-400 text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/20 transition-all font-rajdhani font-semibold placeholder:text-slate-600"
                />
              </div>
            </div>

            {/* Instructions box with Anti-Cheat clause */}
            <div className="p-4 rounded-2xl bg-slate-950/90 border border-cyan-500/20 text-xs text-slate-300 space-y-1.5 font-rajdhani">
              <span className="font-bold text-white flex items-center gap-1.5 font-orbitron text-[11px] text-cyan-400">
                <Keyboard className="w-4 h-4 text-cyan-400" />
                <span>Test Instructions & Anti-Cheat Regulations:</span>
              </span>
              <p>• <strong>Anti-Cheat Proctoring</strong>: Leaving the test screen or switching tabs is monitored. Violations trigger warnings and are recorded in your evaluation proctoring log.</p>
              <p>• <strong>Single Attempt & Rewrite Feature</strong>: Completed profiles are locked to prevent duplicate attempts. To retake or rewrite, authorization must be granted by the assessment creator via the Rewrite Feature.</p>
              <p>• <strong>Questions 1-24</strong>: Code-based MCQs from 11th C++ & 12th Python/SQL. Choose options by clicking OR pressing <code className="bg-slate-800 text-cyan-300 px-1 py-0.5 rounded font-mono">A</code>, <code className="bg-slate-800 text-cyan-300 px-1 py-0.5 rounded font-mono">B</code>, <code className="bg-slate-800 text-cyan-300 px-1 py-0.5 rounded font-mono">C</code>, <code className="bg-slate-800 text-cyan-300 px-1 py-0.5 rounded font-mono">D</code> or <code className="bg-slate-800 text-cyan-300 px-1 py-0.5 rounded font-mono">1</code>-<code className="bg-slate-800 text-cyan-300 px-1 py-0.5 rounded font-mono">4</code>.</p>
              <p>• <strong>Question 25</strong>: Website prompt challenge with real-time sandbox preview.</p>
            </div>

            <button
              type="submit"
              disabled={isCheckingProfile}
              className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-slate-950 font-orbitron font-bold text-xs uppercase tracking-wider shadow-lg cyber-glow-cyan transition-all hover:scale-[1.01] active:scale-[0.99] mt-6 disabled:opacity-50"
            >
              {isCheckingProfile ? (
                <span className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin"></span>
                  <span>Verifying Candidate Profile...</span>
                </span>
              ) : (
                <>
                  <span>Begin Assessment (60 Minutes)</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </motion.div>
      )}

      {/* 2. STEP 3: LIVE ASSESSMENT TESTING STEP (25 QUESTIONS) */}
      {step === 'testing' && (
        <div className="space-y-6">
          {/* ANTI-CHEAT LIVE PROCTORING ALERT BANNER */}
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 rounded-2xl bg-amber-500/10 dark:bg-amber-950/40 border border-amber-500/30 text-amber-800 dark:text-amber-300 text-xs font-rajdhani">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
              <span>
                <strong className="font-semibold text-amber-400 font-cyber-mono uppercase text-[11px]">Anti-Cheat Active:</strong> Switching browser tabs or minimizing this window triggers proctoring warnings and logs violation events for the evaluator.
              </span>
            </div>
            <div className="inline-flex items-center gap-1.5 font-cyber-mono font-bold text-[10px] px-2.5 py-1 rounded-lg bg-amber-950/70 border border-amber-500/50 text-amber-300 shrink-0">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping"></span>
              <span>PROCTORING ACTIVE {tabSwitchCount > 0 ? `• ${tabSwitchCount} WARNING${tabSwitchCount > 1 ? 'S' : ''}` : ''}</span>
            </div>
          </div>

          {/* Top Bar: Timer, Candidate Header, Question Stepper */}
          <div className="flex flex-wrap items-center justify-between gap-4 p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center text-white font-bold text-sm shadow-md shadow-indigo-500/20">
                {currentQuestionIndex + 1}/25
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">The Crucible • TN CS</p>
                <p className="text-sm font-bold text-slate-900 dark:text-white truncate max-w-[200px]">
                  {details.fullName}
                </p>
              </div>
            </div>

            {/* Auto-save status indicator */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>Auto-Saved {lastAutoSavedTime ? `at ${lastAutoSavedTime}` : 'locally'}</span>
              </div>
              <button
                type="button"
                onClick={handleResetDraft}
                className="text-[11px] text-slate-400 hover:text-rose-500 underline transition-colors px-2 py-1"
                title="Reset active draft and start over"
              >
                Reset Draft
              </button>
            </div>

            {/* Keyboard shortcut badge reminder */}
            <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-[11px] text-slate-600 dark:text-slate-300">
              <Keyboard className="w-3.5 h-3.5 text-indigo-500" />
              <span>Keys <strong className="font-mono">[A]-[D]</strong> or <strong className="font-mono">[1]-[4]</strong> to select • <strong className="font-mono">[←]</strong>/<strong className="font-mono">[→]</strong> navigate</span>
            </div>

            {/* Live Countdown Timer */}
            <div className={`flex items-center gap-2 px-4 py-2 rounded-2xl border font-mono font-bold text-sm ${
              timeRemaining < 300
                ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900/50 animate-pulse'
                : 'bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-800'
            }`}>
              <Clock className="w-4 h-4 text-indigo-500" />
              <span>{formatTime(timeRemaining)}</span>
              <span className="text-[10px] text-slate-400 uppercase font-sans font-medium hidden sm:inline">remaining</span>
            </div>

            {/* Stepper Grid for 25 Questions */}
            <div className="w-full flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100 dark:border-slate-800/60">
              {DEFAULT_QUESTIONS.map((q, idx) => {
                const isAnswered =
                  (q.type === 'multiple_choice' && answers[q.id]?.selectedOptionIndex !== undefined) ||
                  (q.type === 'website_prompt' && answers[q.id]?.htmlCode && answers[q.id]?.htmlCode!.trim().length > 30);

                const isCurrent = currentQuestionIndex === idx;

                return (
                  <button
                    key={`q-step-${q.id}`}
                    onClick={() => setCurrentQuestionIndex(idx)}
                    className={`w-7 h-7 sm:w-8 sm:h-8 rounded-xl text-[11px] sm:text-xs font-semibold flex items-center justify-center transition-all ${
                      isCurrent
                        ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/30 ring-2 ring-indigo-500/20 scale-105'
                        : isAnswered
                        ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300/50 dark:border-emerald-800/50'
                        : idx === 24
                        ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-300/50 dark:border-purple-800/50'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                    title={`Question ${idx + 1}: ${q.topic}`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>
          </div>

          {/* MAIN QUESTION CARD */}
          <motion.div
            key={currentQuestion.id}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.15 }}
            className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200/80 dark:border-slate-800/80 shadow-xl shadow-slate-900/5 dark:shadow-black/40 space-y-6"
          >
            {/* Header / Badges / Section */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                {getLanguageBadge(currentQuestion.language)}
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  {currentQuestion.topic}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {recentKeyPress && (
                  <span className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950 px-2 py-0.5 rounded-md animate-bounce">
                    Key [{recentKeyPress}] Selected
                  </span>
                )}
                <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-3 py-1 rounded-full border border-indigo-200/50 dark:border-indigo-800/50">
                  {currentQuestion.points} Points
                </span>
              </div>
            </div>

            {/* Title & Description */}
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white leading-snug">
                {currentQuestion.title}
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-2 leading-relaxed whitespace-pre-line">
                {currentQuestion.description}
              </p>
            </div>

            {/* CODE SNIPPET DISPLAY (FOR QUESTIONS 1-24) */}
            {currentQuestion.codeSnippet && (
              <div className="rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 shadow-inner">
                <div className="px-4 py-2 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between text-xs text-slate-400 font-mono">
                  <span className="flex items-center gap-1.5">
                    <FileCode className="w-3.5 h-3.5 text-indigo-400" />
                    <span>{currentQuestion.language} Snippet</span>
                  </span>
                  <span className="text-[11px] text-slate-500">Tamil Nadu SCERT Curriculum</span>
                </div>
                <pre className="p-4 sm:p-5 text-xs sm:text-sm font-mono leading-relaxed overflow-x-auto text-emerald-300 bg-slate-950">
                  <code>{currentQuestion.codeSnippet}</code>
                </pre>
              </div>
            )}

            {/* Question Hint Toggle */}
            {currentQuestion.hint && (
              <div>
                <button
                  onClick={() => setShowHint(!showHint)}
                  className="flex items-center gap-1.5 text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                  <span>{showHint ? 'Hide Concept Hint' : 'View Concept Hint'}</span>
                </button>
                {showHint && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="mt-2 p-3 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 text-xs text-indigo-900 dark:text-indigo-200 leading-relaxed"
                  >
                    💡 {currentQuestion.hint}
                  </motion.div>
                )}
              </div>
            )}

            {/* OPTION SELECTION FOR MCQS (QUESTIONS 1-24) */}
            {currentQuestion.type === 'multiple_choice' && currentQuestion.options && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                  <span>Select the correct output / option:</span>
                  <span className="text-[11px] text-slate-400 font-normal hidden sm:inline">
                    Click an option or press <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono text-[10px]">A</kbd>-<kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono text-[10px]">D</kbd>
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-2.5">
                  {currentQuestion.options.map((option, optIdx) => {
                    const isSelected = answers[currentQuestion.id]?.selectedOptionIndex === optIdx;
                    const letter = ['A', 'B', 'C', 'D'][optIdx] || `${optIdx + 1}`;

                    return (
                      <div
                        key={`option-${currentQuestion.id}-${optIdx}`}
                        onClick={() => handleSelectOption(currentQuestion.id, optIdx)}
                        className={`p-3.5 sm:p-4 rounded-2xl border cursor-pointer transition-all flex items-start gap-3.5 select-none ${
                          isSelected
                            ? 'bg-indigo-50/90 dark:bg-indigo-950/50 border-indigo-500 text-indigo-900 dark:text-indigo-200 shadow-sm ring-1 ring-indigo-500/20 scale-[1.005]'
                            : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-indigo-200 dark:hover:border-indigo-800 hover:bg-slate-100/60 dark:hover:bg-slate-900'
                        }`}
                      >
                        {/* Option Letter Key Badge */}
                        <div
                          className={`w-7 h-7 rounded-xl font-mono text-xs font-bold flex items-center justify-center shrink-0 transition-colors ${
                            isSelected
                              ? 'bg-indigo-600 text-white shadow-sm'
                              : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          {letter}
                        </div>

                        <div className="flex-1 pt-0.5">
                          <span className="text-xs sm:text-sm font-mono leading-relaxed">{option}</span>
                        </div>

                        {isSelected && (
                          <div className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                            <Check className="w-3 h-3" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* QUESTION 25: PROMPT TYPE (BUILD A WEBSITE ON YOUR FAVOURITE THEME) */}
            {currentQuestion.type === 'website_prompt' && (
              <div className="space-y-6 pt-2">
                {/* 1. DEDICATED TYPEBOX DIRECTLY UNDER THE QUESTION */}
                <div className="p-5 rounded-3xl bg-slate-950/90 border-2 border-cyan-500/40 shadow-xl space-y-3 cyber-grid-bg">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-cyber-mono font-bold text-cyan-300 uppercase tracking-wider flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-cyan-400 animate-pulse" />
                      <span>Your Website Prompt (Typebox) *</span>
                    </label>
                    <span className="text-[11px] font-cyber-mono text-cyan-400/80 bg-cyan-950/80 px-2.5 py-0.5 rounded-full border border-cyan-500/30">
                      {answers['q25']?.websitePrompt?.trim().length || 0} characters
                    </span>
                  </div>

                  <textarea
                    rows={5}
                    value={answers['q25']?.websitePrompt || ''}
                    onChange={(e) => handleUpdateWebsiteCode('websitePrompt', e.target.value)}
                    placeholder="Type your prompt here... (e.g. Build a futuristic cybernetic website on my favorite theme: Deep Space Exploration with glowing neon telemetry monitors, dynamic mission countdown, starship hangar showcase, and interactive audio transmission logs)"
                    className="w-full p-4 rounded-2xl bg-slate-900 border border-cyan-500/40 focus:border-cyan-300 text-white font-rajdhani text-sm leading-relaxed focus:outline-none focus:ring-4 focus:ring-cyan-500/20 transition-all placeholder:text-slate-600 resize-y"
                  />
                  <div className="flex items-center justify-between text-[11px] text-slate-400 font-rajdhani">
                    <span>💡 Describe your favorite theme, components, color scheme, navigation, and features in the typebox above.</span>
                  </div>
                </div>

                {/* 2. INTERACTIVE SANDBOX & LIVE CODE EDITOR */}
                <div className="space-y-4 pt-2">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
                    <div className="flex items-center gap-1.5">
                      <Laptop className="w-4 h-4 text-cyan-400" />
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200 font-cyber-mono">
                        Live Sandbox & Code Editor (Optional Customization)
                      </span>
                    </div>

                    {/* Tabs: Preview vs HTML vs CSS vs JS */}
                    <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                      <button
                        onClick={() => setActiveWebTab('preview')}
                        className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                          activeWebTab === 'preview'
                            ? 'bg-white dark:bg-slate-900 text-cyan-600 dark:text-cyan-400 shadow-sm font-bold'
                            : 'text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Live Preview</span>
                      </button>
                      <button
                        onClick={() => setActiveWebTab('html')}
                        className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                          activeWebTab === 'html'
                            ? 'bg-white dark:bg-slate-900 text-cyan-600 dark:text-cyan-400 shadow-sm font-bold'
                            : 'text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        <span>HTML5</span>
                      </button>
                      <button
                        onClick={() => setActiveWebTab('css')}
                        className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                          activeWebTab === 'css'
                            ? 'bg-white dark:bg-slate-900 text-cyan-600 dark:text-cyan-400 shadow-sm font-bold'
                            : 'text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        <span>CSS</span>
                      </button>
                      <button
                        onClick={() => setActiveWebTab('js')}
                        className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                          activeWebTab === 'js'
                            ? 'bg-white dark:bg-slate-900 text-cyan-600 dark:text-cyan-400 shadow-sm font-bold'
                            : 'text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        <span>JavaScript</span>
                      </button>
                    </div>
                  </div>

                {/* TAB 1: LIVE IFRAME PREVIEW */}
                {activeWebTab === 'preview' && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span>Real-time rendered web page preview:</span>
                      <button
                        onClick={() => setActiveWebTab('html')}
                        className="text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
                      >
                        Edit Code & Design →
                      </button>
                    </div>
                    <div className="rounded-2xl overflow-hidden border border-slate-300 dark:border-slate-700 bg-white shadow-md">
                      <div className="px-4 py-2 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between text-[11px] text-slate-500 font-mono">
                        <div className="flex items-center gap-1.5">
                          <div className="w-2.5 h-2.5 rounded-full bg-rose-400" />
                          <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                          <span className="ml-2">https://school-portal.tnschools.gov.in</span>
                        </div>
                        <span>Rendered View</span>
                      </div>
                      <iframe
                        title="Website Prompt Live Preview"
                        srcDoc={getCompiledWebsiteHtml()}
                        sandbox="allow-scripts"
                        className="w-full h-[450px] border-0 bg-white"
                      />
                    </div>
                  </div>
                )}

                {/* TAB 2: HTML EDITOR */}
                {activeWebTab === 'html' && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span className="font-mono">index.html (HTML5 Structure with Tailwind CSS)</span>
                      <button
                        onClick={() => handleUpdateWebsiteCode('htmlCode', DEFAULT_QUESTIONS[24].websiteTemplate?.html || '')}
                        className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1"
                      >
                        <RotateCcw className="w-3 h-3" /> Reset Template
                      </button>
                    </div>
                    <textarea
                      rows={14}
                      value={answers['q25']?.htmlCode || ''}
                      onChange={(e) => handleUpdateWebsiteCode('htmlCode', e.target.value)}
                      spellCheck={false}
                      className="w-full p-4 rounded-2xl bg-slate-950 text-emerald-300 font-mono text-xs leading-relaxed focus:outline-none border border-slate-800 resize-y"
                    />
                  </div>
                )}

                {/* TAB 3: CSS EDITOR */}
                {activeWebTab === 'css' && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span className="font-mono">styles.css (Custom CSS Styling)</span>
                    </div>
                    <textarea
                      rows={14}
                      value={answers['q25']?.cssCode || ''}
                      onChange={(e) => handleUpdateWebsiteCode('cssCode', e.target.value)}
                      placeholder="/* Custom CSS Rules, Keyframe Animations, Color Themes */"
                      spellCheck={false}
                      className="w-full p-4 rounded-2xl bg-slate-950 text-cyan-300 font-mono text-xs leading-relaxed focus:outline-none border border-slate-800 resize-y"
                    />
                  </div>
                )}

                {/* TAB 4: JS EDITOR */}
                {activeWebTab === 'js' && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span className="font-mono">app.js (Interactivity, Cut-Off Math, Event Listeners)</span>
                    </div>
                    <textarea
                      rows={14}
                      value={answers['q25']?.jsCode || ''}
                      onChange={(e) => handleUpdateWebsiteCode('jsCode', e.target.value)}
                      placeholder="// JavaScript event handlers, marks validation and calculations"
                      spellCheck={false}
                      className="w-full p-4 rounded-2xl bg-slate-950 text-amber-300 font-mono text-xs leading-relaxed focus:outline-none border border-slate-800 resize-y"
                    />
                  </div>
                )}
                </div>
              </div>
            )}

            {/* Navigation Controls: Previous / Next / Review */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-6 border-t border-slate-200/80 dark:border-slate-800/80">
              <button
                type="button"
                disabled={currentQuestionIndex === 0}
                onClick={() => setCurrentQuestionIndex((prev) => Math.max(0, prev - 1))}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 disabled:opacity-40 disabled:pointer-events-none transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Previous [←]</span>
              </button>

              <div className="flex items-center gap-3">
                {currentQuestionIndex < DEFAULT_QUESTIONS.length - 1 ? (
                  <button
                    type="button"
                    onClick={() => setCurrentQuestionIndex((prev) => Math.min(DEFAULT_QUESTIONS.length - 1, prev + 1))}
                    className="flex items-center gap-1.5 px-5 py-2.5 rounded-2xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm shadow-indigo-500/20 transition-all hover:scale-105"
                  >
                    <span>Next Question [→]</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setStep('review')}
                    className="flex items-center gap-1.5 px-6 py-2.5 rounded-2xl text-xs font-bold bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white shadow-md shadow-indigo-500/20 transition-all hover:scale-105"
                  >
                    <Send className="w-4 h-4" />
                    <span>Review All 25 Answers & Submit</span>
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* 3. STEP 4: REVIEW & FINAL SUBMISSION */}
      {step === 'review' && (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-3xl mx-auto bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-10 border border-slate-200/80 dark:border-slate-800/80 shadow-2xl space-y-6"
        >
          <div className="text-center">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/50 dark:border-indigo-800/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mx-auto mb-3">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Review Assessment (25 Questions)</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
              Please verify your responses across 24 Code MCQs and Question 25 Website Build Challenge before final submission.
            </p>
          </div>

          {/* 25 Question Checklist Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 max-h-80 overflow-y-auto">
            {DEFAULT_QUESTIONS.map((q, idx) => {
              const isAnswered =
                (q.type === 'multiple_choice' && answers[q.id]?.selectedOptionIndex !== undefined) ||
                (q.type === 'website_prompt' && (
                  Boolean(answers[q.id]?.websitePrompt && answers[q.id]?.websitePrompt!.trim().length > 0) ||
                  Boolean(answers[q.id]?.htmlCode && answers[q.id]?.htmlCode!.trim().length > 30)
                ));

              return (
                <div
                  key={q.id}
                  onClick={() => {
                    setCurrentQuestionIndex(idx);
                    setStep('testing');
                  }}
                  className="flex items-center justify-between text-xs p-2 rounded-xl border border-slate-200/60 dark:border-slate-800/60 bg-white dark:bg-slate-900 cursor-pointer hover:border-indigo-400 transition-colors"
                >
                  <span className="font-semibold text-slate-700 dark:text-slate-300 truncate max-w-[180px]">
                    Q{idx + 1}: {q.topic}
                  </span>
                  {isAnswered ? (
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1 text-[11px]">
                      <CheckCircle2 className="w-3 h-3" /> Answered
                    </span>
                  ) : (
                    <span className="text-amber-500 font-medium flex items-center gap-1 text-[11px]">
                      <AlertCircle className="w-3 h-3" /> Unanswered
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          <div className="p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 text-xs text-indigo-900 dark:text-indigo-200">
            ✉️ <strong>Score & Evaluation Dispatch:</strong> Once submitted, your answers will be reviewed by the Technical Evaluator. Your total score, grade, and feedback badge will be dispatched to <strong>{details.email}</strong>.
          </div>

          <div className="flex items-center justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={() => setStep('testing')}
              className="px-4 py-2.5 rounded-2xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 transition-colors"
            >
              Back to Questions
            </button>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleFinalSubmit}
              className="flex items-center gap-2 px-6 py-3 rounded-2xl text-xs font-bold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-md shadow-emerald-600/20 transition-all hover:scale-105 disabled:opacity-50"
            >
              {isSubmitting ? (
                <span>Submitting to The Crucible...</span>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Confirm & Submit Assessment</span>
                </>
              )}
            </button>
          </div>
        </motion.div>
      )}

      {/* TAB SWITCH WARNING MODAL (WARNING ONLY - NO AUTO-SUBMIT) */}
      <AnimatePresence>
        {showTabSwitchWarning && (
          <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="max-w-md w-full bg-slate-900 border-2 border-amber-500 rounded-3xl p-6 sm:p-8 text-center space-y-5 shadow-2xl cyber-glow-amber relative z-50"
            >
              <div className="w-16 h-16 rounded-3xl bg-amber-500/20 border border-amber-500 flex items-center justify-center text-amber-400 mx-auto shadow-inner animate-pulse">
                <AlertTriangle className="w-8 h-8 text-amber-400" />
              </div>

              <div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-950 border border-amber-500 text-amber-300 text-xs font-cyber-mono font-bold uppercase tracking-wider mb-2">
                  PROCTORING WARNING #{tabSwitchCount}
                </span>
                <h3 className="text-xl sm:text-2xl font-black font-orbitron text-white">
                  Tab Switch Detected
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 font-rajdhani mt-2 leading-relaxed">
                  You navigated away or minimized The Crucible examination screen. Please remain focused on your test. This event has been recorded in your proctoring logs.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-950/90 border border-amber-900/60 text-xs text-amber-300/90 font-cyber-mono text-left space-y-1">
                <p>• Avoid navigating outside this active assessment window.</p>
                <p>• Proctoring Warnings Recorded: <strong className="text-white font-bold">{tabSwitchCount}</strong></p>
              </div>

              <button
                type="button"
                onClick={() => setShowTabSwitchWarning(false)}
                className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-orbitron font-bold text-xs uppercase tracking-wider shadow-lg transition-all hover:scale-[1.01] active:scale-[0.99]"
              >
                I Understand & Resume Test
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
