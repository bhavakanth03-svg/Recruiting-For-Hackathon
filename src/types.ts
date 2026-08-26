/**
 * The Crucible - Assessment Platform Types & Interfaces
 * Tamil Nadu State Board 11th & 12th Computer Science Assessment Suite
 */

export type UserRole = 'guest' | 'candidate' | 'creator';

export type AssessmentStatus = 'not_started' | 'in_progress' | 'submitted' | 'evaluated';

export interface CandidateDetails {
  fullName: string;
  email: string;
  phone: string;
  role: string;
  githubProfile?: string;
  standard?: string;
  schoolName?: string;
  registrationNumber?: string;
  notes?: string;
}

export type QuestionType = 'multiple_choice' | 'open_text' | 'code' | 'architecture' | 'website_prompt';

export interface Question {
  id: string;
  qNumber: number;
  syllabusStandard: '11th' | '12th' | 'WebDev';
  topic: string;
  language: 'C++' | 'Python' | 'SQL' | 'HTML/CSS/JS';
  title: string;
  codeSnippet?: string;
  description: string;
  type: QuestionType;
  points: number;
  options?: string[];
  correctOptionIndex?: number;
  starterCode?: string;
  websiteTemplate?: {
    html: string;
    css: string;
    js: string;
  };
  explanation?: string;
  hint?: string;
}

export interface CandidateAnswer {
  questionId: string;
  answerText?: string;
  selectedOptionIndex?: number;
  code?: string;
  codeOutput?: string;
  isCodePassed?: boolean;
  websitePrompt?: string;
  htmlCode?: string;
  cssCode?: string;
  jsCode?: string;
}

export interface EvaluationRubric {
  mcqScore: number;                 // Auto-calculated from 24 MCQs (e.g. 72 pts or scaled)
  websitePromptDesign: number;      // 0-15 pts: Visual hierarchy & responsive layout
  websitePromptFunctionality: number; // 0-15 pts: Interactivity & JavaScript logic
  totalScore: number;               // 0-100 pts
  grade: 'A+' | 'A' | 'B+' | 'B' | 'C' | 'D';
  badge?: string;
  feedback: string;
  internalNotes?: string;
  evaluatedAt: string;
  evaluatedBy: string;
  isPublishedToLeaderboard: boolean;
}

export interface CandidateSubmission {
  id: string;
  candidateCode: string;
  details: CandidateDetails;
  status: AssessmentStatus;
  answers: CandidateAnswer[];
  startedAt: string;
  submittedAt?: string;
  timeSpentSeconds: number;
  evaluation?: EvaluationRubric;
  emailDispatched?: boolean;
  emailDispatchedAt?: string;
  tabSwitchDetected?: boolean;
  tabSwitchCount?: number;
  submissionReason?: string;
  allowRewrite?: boolean;
  rewriteGrantedAt?: string;
  rewriteGrantedBy?: string;
  currentQuestionIndex?: number;
  lastActiveAt?: string;
}

export interface LeaderboardEntry {
  rank: number;
  candidateId: string;
  candidateName: string;
  role?: string;
  githubProfile?: string;
  schoolName?: string;
  standard?: string;
  totalScore: number;
  grade: string;
  badge?: string;
  submittedAt: string;
  evaluatedAt: string;
}

export interface EmailNotification {
  id: string;
  candidateId: string;
  recipientEmail: string;
  recipientName: string;
  subject: string;
  score: number;
  grade: string;
  badge?: string;
  feedback: string;
  dispatchedAt: string;
  status: 'sent' | 'delivered';
}

export interface UnitTestResult {
  id: string;
  suiteName: string;
  testName: string;
  status: 'passed' | 'failed' | 'running';
  durationMs: number;
  error?: string;
  details?: string;
}

export interface ServerEvent {
  type: 'CANDIDATE_SUBMITTED' | 'CANDIDATE_PROGRESS_UPDATED' | 'CANDIDATE_EVALUATED' | 'LEADERBOARD_UPDATED' | 'EMAIL_SENT' | 'PING';
  data: any;
  timestamp: string;
}

