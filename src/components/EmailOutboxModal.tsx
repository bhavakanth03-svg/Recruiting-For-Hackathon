import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Mail,
  CheckCircle2,
  X,
  Clock,
  ExternalLink,
  Award,
  Sparkles,
  Send,
  Flame,
  User,
  LogOut,
  RefreshCw,
  Inbox,
  SendHorizontal,
  FileText,
  AlertTriangle,
  Layers,
  ShieldCheck
} from 'lucide-react';
import { EmailNotification } from '../types';
import {
  auth,
  initGmailAuth,
  signInWithGmail,
  signOutGmail,
  sendEmailViaGmail,
  listRecentGmailMessages,
  fetchGmailProfile,
  getGmailAccessToken,
  GmailMessageSummary,
  GmailProfile
} from '../lib/gmail';

interface EmailOutboxModalProps {
  isOpen: boolean;
  onClose: () => void;
  emails: EmailNotification[];
  onAddEmailNotification?: (email: EmailNotification) => void;
}

export const EmailOutboxModal: React.FC<EmailOutboxModalProps> = ({
  isOpen,
  onClose,
  emails,
  onAddEmailNotification
}) => {
  // Tabs: 'outbox' | 'compose' | 'gmail_messages'
  const [activeTab, setActiveTab] = useState<'outbox' | 'compose' | 'gmail_messages'>('outbox');

  const [selectedEmail, setSelectedEmail] = useState<EmailNotification | null>(
    emails.length > 0 ? emails[0] : null
  );

  // Gmail Authentication State
  const [gmailUser, setGmailUser] = useState<any>(auth.currentUser);
  const [gmailProfile, setGmailProfile] = useState<GmailProfile | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Gmail Messages Explorer State
  const [gmailMessages, setGmailMessages] = useState<GmailMessageSummary[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [messageSearchQuery, setMessageSearchQuery] = useState('');

  // Compose State
  const [composeTo, setComposeTo] = useState('');
  const [composeSubject, setComposeSubject] = useState('');
  const [composeBody, setComposeBody] = useState('');
  const [templateType, setTemplateType] = useState<'custom' | 'scorecard' | 'interview' | 'congratulations'>('custom');

  // Confirmation Modal State (MANDATORY for mutating Workspace operations)
  const [showConfirmSendModal, setShowConfirmSendModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<{
    to: string;
    subject: string;
    bodyHtml: string;
    candidateEmailId?: string;
  } | null>(null);
  const [isSendingViaGmail, setIsSendingViaGmail] = useState(false);
  const [sendSuccessMessage, setSendSuccessMessage] = useState<string | null>(null);

  // Set default selected email when list changes
  useEffect(() => {
    if (emails.length > 0 && !selectedEmail) {
      setSelectedEmail(emails[0]);
    }
  }, [emails, selectedEmail]);

  // Auth Listener
  useEffect(() => {
    const unsubscribe = initGmailAuth(
      async (user, token) => {
        setGmailUser(user);
        try {
          const profile = await fetchGmailProfile(token);
          setGmailProfile(profile);
        } catch (err) {
          console.warn('Could not load Gmail profile', err);
        }
      },
      () => {
        setGmailUser(null);
        setGmailProfile(null);
      }
    );
    return () => unsubscribe();
  }, []);

  // Fetch recent messages when switching to Explorer tab
  useEffect(() => {
    if (isOpen && activeTab === 'gmail_messages' && getGmailAccessToken()) {
      handleLoadGmailMessages();
    }
  }, [isOpen, activeTab]);

  const handleSignInGoogle = async () => {
    setIsAuthenticating(true);
    setAuthError(null);
    try {
      const res = await signInWithGmail();
      if (res) {
        setGmailUser(res.user);
        const profile = await fetchGmailProfile(res.accessToken);
        setGmailProfile(profile);
      }
    } catch (err: any) {
      setAuthError(err.message || 'Google sign-in failed');
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleSignOutGoogle = async () => {
    await signOutGmail();
    setGmailUser(null);
    setGmailProfile(null);
    setGmailMessages([]);
  };

  const handleLoadGmailMessages = async (query = '') => {
    if (!getGmailAccessToken()) return;
    setIsLoadingMessages(true);
    try {
      const msgs = await listRecentGmailMessages(query, 12);
      setGmailMessages(msgs);
    } catch (err: any) {
      console.error('Failed to list messages:', err);
    } finally {
      setIsLoadingMessages(false);
    }
  };

  // Template switch
  const handleApplyTemplate = (type: 'custom' | 'scorecard' | 'interview' | 'congratulations') => {
    setTemplateType(type);
    if (type === 'scorecard') {
      setComposeSubject('Tamil Nadu CS Assessment: Official Scorecard & Evaluation Summary');
      setComposeBody(
        `Dear Candidate,\n\nYour Tamil Nadu State Board Computer Science assessment in The Crucible has been officially scored.\n\nScore: 92/100 (Master CS Scholar)\nEvaluation: Excellent execution across Python, C++, and the Web Interactive Sandbox.\n\nYou can access your rank on the state leaderboard.\n\nRegards,\nThe Crucible Evaluation Board`
      );
    } else if (type === 'interview') {
      setComposeSubject('Invitation: Technical Merit Interview & Viva Round');
      setComposeBody(
        `Dear Candidate,\n\nBased on your top-percentile performance in The Crucible Tamil Nadu CS Assessment, you are invited to the Technical Merit Round.\n\nPlease reply with your availability for the upcoming session.\n\nWarm regards,\nState Evaluation Committee`
      );
    } else if (type === 'congratulations') {
      setComposeSubject('Congratulations: Award of Honor Badge & Certificate');
      setComposeBody(
        `Dear Scholar,\n\nCongratulations on attaining a Distinction score in the Tamil Nadu Computer Science Crucible Assessment.\n\nYour certificate is officially validated and entered into the state merit registry.\n\nBest wishes,\nThe Crucible CS Directorate`
      );
    }
  };

  // Initiate Send with Confirmation Modal
  const handleRequestSendOutboxItem = (emailItem: EmailNotification) => {
    const bodyHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0f172a; color: #ffffff; padding: 24px; border-radius: 16px; border: 1px solid #06b6d4;">
        <h2 style="color: #38bdf8; margin-top: 0;">The Crucible • Official CS Evaluation Scorecard</h2>
        <p style="color: #94a3b8;">Dear <strong>${emailItem.recipientName}</strong>,</p>
        <p style="color: #e2e8f0;">Your 25-question evaluation in The Crucible (Tamil Nadu Higher Secondary CS Assessment) has been officially graded by the Lead Technical Evaluator.</p>
        
        <div style="background: #1e293b; padding: 18px; border-radius: 12px; text-align: center; margin: 20px 0; border: 1px solid #334155;">
          <span style="color: #38bdf8; font-size: 12px; font-weight: bold; text-transform: uppercase;">Evaluated Total Score</span>
          <div style="font-size: 36px; font-weight: bold; color: #f43f5e; margin: 8px 0;">${emailItem.score} / 100</div>
          <div style="color: #e2e8f0; font-size: 14px; font-weight: bold;">Grade: ${emailItem.grade} ${emailItem.badge ? `• 🏆 ${emailItem.badge}` : ''}</div>
        </div>

        <div style="background: #090d16; padding: 14px; border-radius: 8px; border: 1px solid #334155; margin: 16px 0;">
          <strong style="color: #38bdf8; font-size: 13px;">Evaluator Feedback:</strong>
          <p style="color: #cbd5e1; font-size: 13px; font-style: italic; margin-top: 6px;">"${emailItem.feedback}"</p>
        </div>

        <p style="color: #94a3b8; font-size: 12px; margin-top: 24px;">This official report is delivered via Google Gmail integration on behalf of the Lead Evaluator.</p>
      </div>
    `;

    setPendingAction({
      to: emailItem.recipientEmail,
      subject: emailItem.subject,
      bodyHtml,
      candidateEmailId: emailItem.id
    });
    setShowConfirmSendModal(true);
  };

  const handleRequestSendCustomCompose = (e: React.FormEvent) => {
    e.preventDefault();
    if (!composeTo || !composeSubject || !composeBody) {
      alert('Please fill in all recipient, subject, and message fields.');
      return;
    }

    const formattedBodyHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0f172a; color: #ffffff; padding: 24px; border-radius: 16px; border: 1px solid #06b6d4;">
        <h2 style="color: #38bdf8; margin-top: 0;">The Crucible • TN CS Directorate</h2>
        <div style="color: #e2e8f0; font-size: 14px; line-height: 1.6; white-space: pre-wrap;">
          ${composeBody.replace(/</g, '&lt;').replace(/>/g, '&gt;')}
        </div>
        <hr style="border: 0; border-top: 1px solid #334155; margin: 24px 0;" />
        <p style="color: #94a3b8; font-size: 12px;">Sent securely via Gmail Integration in The Crucible Assessment Engine.</p>
      </div>
    `;

    setPendingAction({
      to: composeTo,
      subject: composeSubject,
      bodyHtml: formattedBodyHtml
    });
    setShowConfirmSendModal(true);
  };

  const handleExecuteSendGmail = async () => {
    if (!pendingAction) return;

    setIsSendingViaGmail(true);
    setSendSuccessMessage(null);

    try {
      const result = await sendEmailViaGmail({
        to: pendingAction.to,
        subject: pendingAction.subject,
        bodyHtml: pendingAction.bodyHtml
      });

      setSendSuccessMessage(`Email successfully dispatched via Gmail! Message ID: ${result.id}`);

      // Add to local outbox log if it's a new compose
      if (!pendingAction.candidateEmailId && onAddEmailNotification) {
        onAddEmailNotification({
          id: `gmail-sent-${result.id}`,
          candidateId: 'manual',
          recipientName: pendingAction.to.split('@')[0],
          recipientEmail: pendingAction.to,
          subject: pendingAction.subject,
          score: 100,
          grade: 'A+',
          feedback: 'Custom dispatch sent via connected Gmail',
          dispatchedAt: new Date().toISOString(),
          status: 'sent'
        });
      }

      setShowConfirmSendModal(false);
      setPendingAction(null);
      setComposeTo('');
      setComposeSubject('');
      setComposeBody('');
    } catch (err: any) {
      alert(`Gmail Send Error: ${err.message}`);
    } finally {
      setIsSendingViaGmail(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-md"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative w-full max-w-5xl max-h-[90vh] bg-slate-950 rounded-3xl p-6 sm:p-8 border border-cyan-500/30 shadow-2xl shadow-cyan-950/50 overflow-hidden flex flex-col text-slate-100 cyber-grid-bg"
        >
          {/* Header & Gmail Google Auth Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-cyan-500/20 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-cyan-950/80 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shadow-md cyber-glow-cyan">
                <Mail className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold font-orbitron tracking-wider text-white">
                    Gmail Communications Suite
                  </h2>
                  <span className="text-[10px] font-cyber-mono px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-500/40">
                    OAUTH 2.0 CONNECTED
                  </span>
                </div>
                <p className="text-xs text-slate-400 font-rajdhani mt-0.5">
                  Send real-time certified score reports, candidate certificates, and direct evaluations using the Gmail API.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              {/* Google Sign-in / User Pill */}
              {gmailUser ? (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-slate-900 border border-cyan-500/40 text-xs font-rajdhani">
                  <div className="w-6 h-6 rounded-full bg-cyan-500/20 border border-cyan-400 flex items-center justify-center text-cyan-300 font-bold text-[11px]">
                    {gmailUser.displayName ? gmailUser.displayName[0].toUpperCase() : 'G'}
                  </div>
                  <div className="hidden sm:block text-left">
                    <span className="block font-bold text-white leading-none">
                      {gmailUser.displayName || 'Google User'}
                    </span>
                    <span className="text-[10px] text-cyan-400 leading-tight">
                      {gmailUser.email}
                    </span>
                  </div>
                  <button
                    onClick={handleSignOutGoogle}
                    className="p-1 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors ml-1"
                    title="Disconnect Google Account"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <button
                  disabled={isAuthenticating}
                  onClick={handleSignInGoogle}
                  className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-white hover:bg-slate-100 text-slate-900 font-semibold text-xs transition-all shadow-md hover:scale-[1.02] disabled:opacity-50"
                >
                  <svg className="w-4 h-4" viewBox="0 0 48 48">
                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                  </svg>
                  <span>{isAuthenticating ? 'Connecting...' : 'Sign in with Google'}</span>
                </button>
              )}

              <button
                onClick={onClose}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Navigation Sub-Tabs */}
          <div className="flex items-center gap-2 pt-3 pb-1">
            <button
              onClick={() => setActiveTab('outbox')}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-orbitron font-bold uppercase transition-all ${
                activeTab === 'outbox'
                  ? 'bg-cyan-500 text-slate-950 shadow-md cyber-glow-cyan'
                  : 'text-slate-400 hover:text-cyan-300 bg-slate-900/60'
              }`}
            >
              <Inbox className="w-3.5 h-3.5" />
              <span>Assessment Outbox ({emails.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('compose')}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-orbitron font-bold uppercase transition-all ${
                activeTab === 'compose'
                  ? 'bg-cyan-500 text-slate-950 shadow-md cyber-glow-cyan'
                  : 'text-slate-400 hover:text-cyan-300 bg-slate-900/60'
              }`}
            >
              <SendHorizontal className="w-3.5 h-3.5" />
              <span>Compose via Gmail</span>
            </button>

            <button
              onClick={() => setActiveTab('gmail_messages')}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-orbitron font-bold uppercase transition-all ${
                activeTab === 'gmail_messages'
                  ? 'bg-cyan-500 text-slate-950 shadow-md cyber-glow-cyan'
                  : 'text-slate-400 hover:text-cyan-300 bg-slate-900/60'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Live Gmail Feed</span>
            </button>
          </div>

          {/* Success Banner */}
          {sendSuccessMessage && (
            <div className="mt-2 p-3 rounded-2xl bg-emerald-950/70 border border-emerald-500/50 flex items-center justify-between text-xs text-emerald-300">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>{sendSuccessMessage}</span>
              </div>
              <button
                onClick={() => setSendSuccessMessage(null)}
                className="text-emerald-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* TAB 1: OUTBOX SPLIT VIEW */}
          {activeTab === 'outbox' && (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 flex-1 overflow-hidden pt-4">
              {/* Left Emails List */}
              <div className="md:col-span-5 border-b md:border-b-0 md:border-r border-cyan-500/20 pr-0 md:pr-4 overflow-y-auto space-y-2.5 max-h-[300px] md:max-h-[480px]">
                {emails.length === 0 ? (
                  <div className="py-16 text-center text-slate-500 text-xs font-rajdhani">
                    No candidate assessment emails in queue. Evaluators can score submissions to generate reports.
                  </div>
                ) : (
                  emails.map((email) => {
                    const isSelected = selectedEmail?.id === email.id;

                    return (
                      <div
                        key={email.id}
                        onClick={() => setSelectedEmail(email)}
                        className={`p-3.5 rounded-2xl border cursor-pointer transition-all text-left ${
                          isSelected
                            ? 'bg-cyan-950/60 border-cyan-400 shadow-md cyber-glow-cyan'
                            : 'bg-slate-900/80 border-slate-800 hover:border-cyan-500/40'
                        }`}
                      >
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="font-bold text-white font-rajdhani truncate">
                            {email.recipientName}
                          </span>
                          <span className="text-[11px] font-bold text-rose-400 font-cyber-mono">
                            {email.score}/100
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 truncate mb-1.5 font-rajdhani">
                          To: {email.recipientEmail}
                        </p>
                        <div className="flex items-center justify-between text-[10px] text-slate-400">
                          <span className="flex items-center gap-1 text-emerald-400 font-semibold font-cyber-mono">
                            <CheckCircle2 className="w-3 h-3" /> Ready to Dispatch
                          </span>
                          <span className="font-cyber-mono">
                            {new Date(email.dispatchedAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Right Email Preview Drawer */}
              <div className="md:col-span-7 overflow-y-auto max-h-[480px] bg-slate-900/60 p-5 sm:p-6 rounded-3xl border border-cyan-500/20 flex flex-col justify-between">
                {selectedEmail ? (
                  <div className="space-y-4">
                    {/* Headers */}
                    <div className="space-y-1.5 pb-4 border-b border-cyan-500/20 text-xs font-rajdhani">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">From:</span>
                        <span className="font-mono text-cyan-300">
                          {gmailUser?.email || 'The Crucible Evaluation Board'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">To:</span>
                        <span className="font-semibold text-white">
                          {selectedEmail.recipientName} &lt;{selectedEmail.recipientEmail}&gt;
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Date:</span>
                        <span className="text-slate-300 font-cyber-mono">
                          {new Date(selectedEmail.dispatchedAt).toLocaleString()}
                        </span>
                      </div>
                      <div className="pt-2">
                        <span className="text-slate-400 block">Subject:</span>
                        <span className="font-bold text-sm text-cyan-300 block mt-0.5">
                          {selectedEmail.subject}
                        </span>
                      </div>
                    </div>

                    {/* Email Card Preview */}
                    <div className="bg-slate-950 rounded-2xl p-5 border border-cyan-500/30 space-y-4">
                      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                        <span className="font-bold text-sm text-rose-400 font-orbitron">
                          The Crucible • Official Scorecard
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 font-bold border border-cyan-500/30 font-cyber-mono">
                          STATE CS
                        </span>
                      </div>

                      <p className="text-xs text-slate-300 font-rajdhani leading-relaxed">
                        Dear <strong>{selectedEmail.recipientName}</strong>,
                        <br />
                        Your 25-question evaluation in The Crucible (Tamil Nadu CS State Board Assessment) has been officially graded by the Lead Technical Evaluator.
                      </p>

                      {/* Score Box */}
                      <div className="p-4 rounded-2xl bg-gradient-to-br from-rose-950/60 to-cyan-950/60 border border-cyan-500/40 text-center space-y-1">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-300 font-cyber-mono">
                          Final Evaluated Score
                        </span>
                        <div className="text-3xl font-black font-cyber-mono text-rose-400">
                          {selectedEmail.score} / 100
                        </div>
                        <div className="text-xs font-bold text-slate-200 font-rajdhani">
                          Grade: {selectedEmail.grade} {selectedEmail.badge ? `• 🏆 ${selectedEmail.badge}` : ''}
                        </div>
                      </div>

                      {/* Evaluator Notes */}
                      <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs space-y-1">
                        <span className="font-bold text-cyan-300 font-cyber-mono">
                          Evaluator Feedback & Academic Notes:
                        </span>
                        <p className="text-slate-300 italic font-rajdhani">
                          "{selectedEmail.feedback}"
                        </p>
                      </div>
                    </div>

                    {/* Dispatch via Gmail Button */}
                    <div className="pt-3 flex items-center justify-between border-t border-cyan-500/20">
                      <span className="text-xs text-slate-400 font-rajdhani">
                        Deliver to student's inbox using Google Gmail API.
                      </span>

                      <button
                        onClick={() => {
                          if (!gmailUser) {
                            handleSignInGoogle();
                          } else {
                            handleRequestSendOutboxItem(selectedEmail);
                          }
                        }}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-orbitron font-bold uppercase bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-slate-950 shadow-md cyber-glow-cyan transition-all hover:scale-105"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>{gmailUser ? 'Send via Connected Gmail' : 'Sign in with Google to Send'}</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="py-20 text-center text-slate-500 text-xs font-rajdhani">
                    Select an email on the left to preview its content.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: COMPOSE VIA GMAIL */}
          {activeTab === 'compose' && (
            <form onSubmit={handleRequestSendCustomCompose} className="space-y-4 pt-4 flex-1 overflow-y-auto max-h-[480px]">
              {/* Quick Template Picker */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-cyber-mono text-cyan-400 mr-2">Quick Templates:</span>
                <button
                  type="button"
                  onClick={() => handleApplyTemplate('scorecard')}
                  className={`px-3 py-1 rounded-xl text-xs font-rajdhani transition-all ${
                    templateType === 'scorecard'
                      ? 'bg-cyan-500 text-slate-950 font-bold'
                      : 'bg-slate-900 text-slate-300 border border-slate-800'
                  }`}
                >
                  Scorecard Summary
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyTemplate('interview')}
                  className={`px-3 py-1 rounded-xl text-xs font-rajdhani transition-all ${
                    templateType === 'interview'
                      ? 'bg-cyan-500 text-slate-950 font-bold'
                      : 'bg-slate-900 text-slate-300 border border-slate-800'
                  }`}
                >
                  Viva / Interview Invite
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyTemplate('congratulations')}
                  className={`px-3 py-1 rounded-xl text-xs font-rajdhani transition-all ${
                    templateType === 'congratulations'
                      ? 'bg-cyan-500 text-slate-950 font-bold'
                      : 'bg-slate-900 text-slate-300 border border-slate-800'
                  }`}
                >
                  Honor Certificate
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-cyber-mono text-cyan-300 mb-1">
                    Recipient Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={composeTo}
                    onChange={(e) => setComposeTo(e.target.value)}
                    placeholder="candidate@school.edu.in"
                    className="w-full px-4 py-2.5 rounded-2xl bg-slate-900 border border-cyan-500/40 text-white font-rajdhani text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-cyber-mono text-cyan-300 mb-1">
                    Subject Line *
                  </label>
                  <input
                    type="text"
                    required
                    value={composeSubject}
                    onChange={(e) => setComposeSubject(e.target.value)}
                    placeholder="e.g. The Crucible CS Assessment Result"
                    className="w-full px-4 py-2.5 rounded-2xl bg-slate-900 border border-cyan-500/40 text-white font-rajdhani text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-cyber-mono text-cyan-300 mb-1">
                  Email Message Body *
                </label>
                <textarea
                  rows={8}
                  required
                  value={composeBody}
                  onChange={(e) => setComposeBody(e.target.value)}
                  placeholder="Compose your message to candidate..."
                  className="w-full p-4 rounded-2xl bg-slate-900 border border-cyan-500/40 text-white font-rajdhani text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-cyan-400"
                />
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-cyan-500/20">
                <span className="text-xs text-slate-400 font-rajdhani">
                  {gmailUser
                    ? `Sending as: ${gmailUser.email}`
                    : 'Requires Google Account sign-in to dispatch via Gmail API.'}
                </span>

                <button
                  type="submit"
                  className="flex items-center gap-2 px-6 py-2.5 rounded-2xl text-xs font-orbitron font-bold uppercase bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-slate-950 shadow-md cyber-glow-cyan transition-all hover:scale-105"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Review & Dispatch via Gmail</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 3: GMAIL FEED EXPLORER */}
          {activeTab === 'gmail_messages' && (
            <div className="space-y-4 pt-4 flex-1 overflow-y-auto max-h-[480px]">
              {!gmailUser ? (
                <div className="py-16 text-center space-y-4">
                  <div className="w-12 h-12 rounded-2xl bg-cyan-950 border border-cyan-500/30 flex items-center justify-center mx-auto text-cyan-400">
                    <Mail className="w-6 h-6" />
                  </div>
                  <h3 className="text-base font-bold font-orbitron text-white">
                    Connect Gmail to View Feed
                  </h3>
                  <p className="text-xs text-slate-400 font-rajdhani max-w-sm mx-auto">
                    Sign in with Google to explore real-time Gmail inbox logs, sent messages, and track student correspondence.
                  </p>
                  <button
                    onClick={handleSignInGoogle}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-white text-slate-950 font-bold text-xs shadow-md hover:scale-105 transition-all"
                  >
                    Sign in with Google
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-xs font-rajdhani text-slate-300">
                      <span>Connected: <strong className="text-cyan-300">{gmailUser.email}</strong></span>
                      {gmailProfile && (
                        <span className="text-[11px] text-slate-400 font-cyber-mono">
                          • {gmailProfile.messagesTotal} Total Messages in Account
                        </span>
                      )}
                    </div>

                    <button
                      onClick={() => handleLoadGmailMessages(messageSearchQuery)}
                      disabled={isLoadingMessages}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-cyber-mono bg-slate-900 border border-cyan-500/30 text-cyan-300 hover:bg-slate-800 transition-colors"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isLoadingMessages ? 'animate-spin' : ''}`} />
                      <span>Sync Gmail</span>
                    </button>
                  </div>

                  {isLoadingMessages ? (
                    <div className="py-16 text-center text-xs text-cyan-400 font-cyber-mono animate-pulse">
                      Synchronizing Gmail messages...
                    </div>
                  ) : gmailMessages.length === 0 ? (
                    <div className="py-16 text-center text-xs text-slate-500 font-rajdhani">
                      No recent messages returned. Click "Sync Gmail" to refresh.
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-800/80 rounded-2xl bg-slate-900/60 border border-cyan-500/20 overflow-hidden">
                      {gmailMessages.map((msg) => (
                        <div key={msg.id} className="p-3.5 hover:bg-slate-900 transition-colors text-left space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-cyan-300 font-rajdhani truncate max-w-[280px]">
                              {msg.subject || '(No Subject)'}
                            </span>
                            <span className="text-[10px] text-slate-500 font-cyber-mono">
                              {msg.date ? new Date(msg.date).toLocaleDateString() : msg.id}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-slate-400 font-rajdhani">
                            <span>From: {msg.from || 'Unknown'}</span>
                            {msg.to && <span>• To: {msg.to}</span>}
                          </div>
                          <p className="text-xs text-slate-300 font-rajdhani line-clamp-2">
                            {msg.snippet}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </motion.div>
      </div>

      {/* EXPLICIT USER CONFIRMATION DIALOG (Mandatory for mutating Workspace actions) */}
      {showConfirmSendModal && pendingAction && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => !isSendingViaGmail && setShowConfirmSendModal(false)}
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
                  Confirm Gmail Dispatch
                </h3>
                <p className="text-xs text-slate-400 font-rajdhani">
                  Explicit confirmation required before sending email via Gmail API.
                </p>
              </div>
            </div>

            <div className="space-y-2 text-xs font-rajdhani bg-slate-900 p-4 rounded-2xl border border-slate-800">
              <div className="flex justify-between">
                <span className="text-slate-400">Sending From:</span>
                <span className="font-semibold text-cyan-300 font-mono">{gmailUser?.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Recipient To:</span>
                <span className="font-semibold text-white">{pendingAction.to}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Subject:</span>
                <span className="font-semibold text-white truncate max-w-[240px]">{pendingAction.subject}</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-cyan-950/40 border border-cyan-500/30 text-[11px] text-cyan-300 font-rajdhani">
              💡 This action will immediately send an official message directly to the recipient's email address on behalf of your Google account.
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={isSendingViaGmail}
                onClick={() => setShowConfirmSendModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-rajdhani font-semibold bg-slate-900 hover:bg-slate-800 text-slate-300 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSendingViaGmail}
                onClick={handleExecuteSendGmail}
                className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-orbitron font-bold uppercase bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-slate-950 shadow-md cyber-glow-cyan transition-all hover:scale-105 disabled:opacity-50"
              >
                {isSendingViaGmail ? (
                  <span>Dispatching...</span>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Confirm & Send Email</span>
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
