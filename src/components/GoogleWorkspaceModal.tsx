import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Mail,
  Folder,
  Users,
  HardDrive,
  CheckCircle2,
  X,
  Send,
  UserPlus,
  RefreshCw,
  Inbox,
  SendHorizontal,
  FileText,
  AlertTriangle,
  Layers,
  ShieldCheck,
  Upload,
  Download,
  ExternalLink,
  Trash2,
  Search,
  Plus,
  FileSpreadsheet,
  FileCode,
  Building,
  Phone,
  LogOut,
  Database
} from 'lucide-react';
import { EmailNotification, CandidateSubmission, Question } from '../types';
import {
  auth,
  signInWithGoogle,
  signOutGoogle,
  initGoogleAuth,
  getGoogleAccessToken
} from '../lib/google-auth';
import {
  sendEmailViaGmail,
  listRecentGmailMessages,
  fetchGmailProfile,
  GmailMessageSummary,
  GmailProfile
} from '../lib/gmail';
import {
  listDriveFiles,
  uploadFileToDrive,
  deleteDriveFile,
  findOrCreateFolder,
  DriveFileItem
} from '../lib/drive';
import {
  listGoogleContacts,
  createGoogleContact,
  deleteGoogleContact,
  GoogleContact
} from '../lib/contacts';

interface GoogleWorkspaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  emails: EmailNotification[];
  candidates: CandidateSubmission[];
  questions?: Question[];
  onAddEmailNotification?: (email: EmailNotification) => void;
  defaultTab?: 'drive' | 'contacts' | 'gmail' | 'outbox';
}

export const GoogleWorkspaceModal: React.FC<GoogleWorkspaceModalProps> = ({
  isOpen,
  onClose,
  emails,
  candidates,
  questions = [],
  onAddEmailNotification,
  defaultTab = 'drive'
}) => {
  // Main Tabs: 'drive' | 'contacts' | 'gmail'
  const [activeMainTab, setActiveMainTab] = useState<'drive' | 'contacts' | 'gmail'>(
    defaultTab === 'contacts' ? 'contacts' : defaultTab === 'drive' ? 'drive' : 'gmail'
  );

  // Gmail Sub-Tabs: 'outbox' | 'compose' | 'feed'
  const [gmailSubTab, setGmailSubTab] = useState<'outbox' | 'compose' | 'feed'>(
    defaultTab === 'outbox' ? 'outbox' : 'outbox'
  );

  // Auth State
  const [googleUser, setGoogleUser] = useState<any>(auth.currentUser);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [gmailProfile, setGmailProfile] = useState<GmailProfile | null>(null);

  // Success / Status Banner
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // --- DRIVE STATE ---
  const [driveFiles, setDriveFiles] = useState<DriveFileItem[]>([]);
  const [isLoadingDrive, setIsLoadingDrive] = useState(false);
  const [driveError, setDriveError] = useState<string | null>(null);
  const [driveSearchQuery, setDriveSearchQuery] = useState('');
  const [isUploadingToDrive, setIsUploadingToDrive] = useState(false);

  // --- CONTACTS STATE ---
  const [contacts, setContacts] = useState<GoogleContact[]>([]);
  const [isLoadingContacts, setIsLoadingContacts] = useState(false);
  const [contactsError, setContactsError] = useState<string | null>(null);
  const [contactSearchQuery, setContactSearchQuery] = useState('');
  const [showAddContactModal, setShowAddContactModal] = useState(false);
  const [newContactGivenName, setNewContactGivenName] = useState('');
  const [newContactFamilyName, setNewContactFamilyName] = useState('');
  const [newContactEmail, setNewContactEmail] = useState('');
  const [newContactPhone, setNewContactPhone] = useState('');
  const [newContactOrg, setNewContactOrg] = useState('Tamil Nadu CS Higher Secondary');

  // --- GMAIL STATE ---
  const [selectedEmail, setSelectedEmail] = useState<EmailNotification | null>(
    emails.length > 0 ? emails[0] : null
  );
  const [gmailMessages, setGmailMessages] = useState<GmailMessageSummary[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [gmailError, setGmailError] = useState<string | null>(null);
  const [composeTo, setComposeTo] = useState('');
  const [composeSubject, setComposeSubject] = useState('');
  const [composeBody, setComposeBody] = useState('');
  const [templateType, setTemplateType] = useState<'custom' | 'scorecard' | 'interview' | 'congratulations'>('custom');

  // --- CONFIRMATION ACTION MODAL (MANDATORY for mutating operations) ---
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    actionType: 'send_email' | 'upload_drive' | 'create_contact' | 'delete_drive' | 'delete_contact';
    actionPayload: any;
  }>({
    isOpen: false,
    title: '',
    description: '',
    actionType: 'send_email',
    actionPayload: null
  });
  const [isExecutingAction, setIsExecutingAction] = useState(false);

  // Auth Listener
  useEffect(() => {
    const unsub = initGoogleAuth(
      async (user, token) => {
        setGoogleUser(user);
        try {
          const profile = await fetchGmailProfile(token);
          setGmailProfile(profile);
        } catch (e) {
          console.warn('Profile load note', e);
        }
      },
      () => {
        setGoogleUser(null);
        setGmailProfile(null);
      }
    );
    return () => unsub();
  }, []);

  // Sync active main tab
  useEffect(() => {
    if (!isOpen) return;
    if (getGoogleAccessToken()) {
      if (activeMainTab === 'drive') {
        loadDriveFiles();
      } else if (activeMainTab === 'contacts') {
        loadContacts();
      } else if (activeMainTab === 'gmail' && gmailSubTab === 'feed') {
        loadGmailFeed();
      }
    }
  }, [isOpen, activeMainTab, gmailSubTab]);

  useEffect(() => {
    if (emails.length > 0 && !selectedEmail) {
      setSelectedEmail(emails[0]);
    }
  }, [emails, selectedEmail]);

  const handleSignInGoogle = async () => {
    setIsAuthenticating(true);
    setAuthError(null);
    try {
      const res = await signInWithGoogle();
      if (res) {
        setGoogleUser(res.user);
        const profile = await fetchGmailProfile(res.accessToken);
        setGmailProfile(profile);
        if (activeMainTab === 'drive') loadDriveFiles();
        if (activeMainTab === 'contacts') loadContacts();
      }
    } catch (err: any) {
      setAuthError(err.message || 'Google Sign-in failed');
    } finally {
      setIsAuthenticating(false);
    }
  };

  // Helper to extract Google Cloud console API activation URL from error message
  const extractApiEnableUrl = (errorMsg: string | null) => {
    if (!errorMsg) return null;
    const match = errorMsg.match(/https:\/\/(?:console\.developers\.google\.com|console\.cloud\.google\.com)\/[^\s)]+/);
    if (match) return match[0];
    return null;
  };

  // Helper to trigger browser download
  const downloadFileLocally = (filename: string, content: string, mimeType: string) => {
    try {
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Local download error', e);
    }
  };

  // Helper to generate full assessment dossier object
  const generateAssessmentDossierJson = () => {
    return {
      platform: 'The Crucible - Tamil Nadu State Board Computer Science Evaluation',
      exportedAt: new Date().toISOString(),
      evaluatedBy: googleUser?.displayName || 'Lead CS Evaluator',
      candidateCount: candidates.length,
      questionCount: questions.length,
      candidates: candidates.map((c) => ({
        id: c.id,
        fullName: c.details.fullName,
        email: c.details.email,
        schoolName: c.details.schoolName,
        district: c.details.district,
        scores: c.scores,
        status: c.status,
        submittedAt: c.submittedAt,
        evaluation: c.evaluation
      })),
      curriculum: {
        standard: '11th & 12th State Board',
        languages: ['Python 3', 'C++', 'Modern Web Sandbox'],
        totalMarks: 100
      }
    };
  };

  // Helper to generate formatted merit dossier HTML
  const generateScorecardsHtml = () => {
    const evaluatedCandidates = candidates.filter((c) => c.status === 'evaluated');
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>The Crucible - Official TN CS Assessment Dossier</title>
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #0f172a; color: #f8fafc; padding: 40px; margin: 0; }
    .header { border-bottom: 2px solid #06b6d4; padding-bottom: 20px; margin-bottom: 30px; }
    h1 { color: #38bdf8; margin: 0 0 10px 0; }
    .meta { color: #94a3b8; font-size: 14px; }
    .badge { display: inline-block; background: #082f49; color: #38bdf8; border: 1px solid #0284c7; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; }
    table { width: 100%; border-collapse: collapse; margin-top: 15px; }
    th, td { text-align: left; padding: 10px; border-bottom: 1px solid #334155; }
    th { color: #94a3b8; font-size: 12px; text-transform: uppercase; }
  </style>
</head>
<body>
  <div class="header">
    <h1>The Crucible • Official Merit Registry</h1>
    <div class="meta">Tamil Nadu Higher Secondary CS Assessment • Exported: ${new Date().toLocaleString()}</div>
  </div>
  <div class="summary">
    <h2>Evaluated Merit Records (${evaluatedCandidates.length})</h2>
    <table>
      <thead>
        <tr>
          <th>Candidate Name</th>
          <th>District / School</th>
          <th>MCQ Score (75)</th>
          <th>Prompt Sandbox (25)</th>
          <th>Total Score (100)</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        ${evaluatedCandidates
          .map(
            (c) => `
          <tr>
            <td><strong>${c.details.fullName}</strong><br/><small style="color: #94a3b8">${c.details.email}</small></td>
            <td>${c.details.district || 'Tamil Nadu'}<br/><small style="color: #94a3b8">${c.details.schoolName || 'Govt Higher Secondary'}</small></td>
            <td>${c.scores?.mcq || 0}/75</td>
            <td>${c.scores?.websitePrompt || 0}/25</td>
            <td><strong style="color: #f43f5e; font-size: 16px;">${c.scores?.total || 0}/100</strong></td>
            <td><span class="badge">${c.evaluation?.badge || 'Certified'}</span></td>
          </tr>`
          )
          .join('')}
      </tbody>
    </table>
  </div>
</body>
</html>`;
  };

  const handleSignOutGoogle = async () => {
    await signOutGoogle();
    setGoogleUser(null);
    setGmailProfile(null);
    setDriveFiles([]);
    setDriveError(null);
    setContacts([]);
    setContactsError(null);
    setGmailMessages([]);
    setGmailError(null);
  };

  // --- DRIVE ACTIONS ---
  const loadDriveFiles = async () => {
    if (!getGoogleAccessToken()) return;
    setIsLoadingDrive(true);
    setDriveError(null);
    try {
      const files = await listDriveFiles(
        driveSearchQuery ? `name contains '${driveSearchQuery.replace(/'/g, "\\'")}' and trashed = false` : 'trashed = false',
        25
      );
      setDriveFiles(files);
    } catch (err: any) {
      console.error('Drive load error:', err);
      setDriveError(err.message || 'Failed to connect to Google Drive.');
    } finally {
      setIsLoadingDrive(false);
    }
  };

  const requestBackupAllToDrive = async () => {
    const assessmentDossier = generateAssessmentDossierJson();

    setConfirmModal({
      isOpen: true,
      title: 'Backup Assessment Registry to Google Drive',
      description: `Upload complete evaluation records of all ${candidates.length} candidates and official scoring registry to a dedicated folder on your Google Drive.`,
      actionType: 'upload_drive',
      actionPayload: {
        name: `The_Crucible_Assessment_Backup_${new Date().toISOString().split('T')[0]}.json`,
        mimeType: 'application/json',
        content: JSON.stringify(assessmentDossier, null, 2),
        description: 'Complete student evaluation archive exported from The Crucible TN CS Platform.'
      }
    });
  };

  const requestExportScorecardsHtmlToDrive = () => {
    const evaluatedCandidates = candidates.filter((c) => c.status === 'evaluated');
    if (evaluatedCandidates.length === 0) {
      alert('No evaluated candidates to export. Score submissions first.');
      return;
    }

    const htmlReport = generateScorecardsHtml();

    setConfirmModal({
      isOpen: true,
      title: 'Export Official Scorecards HTML to Google Drive',
      description: `Generate a standalone certified HTML merit dossier for ${evaluatedCandidates.length} evaluated students and upload directly to your Google Drive.`,
      actionType: 'upload_drive',
      actionPayload: {
        name: `The_Crucible_Merit_Dossier_${new Date().toISOString().split('T')[0]}.html`,
        mimeType: 'text/html',
        content: htmlReport,
        description: 'Official formatted HTML merit report exported from The Crucible.'
      }
    });
  };

  // --- CONTACTS ACTIONS ---
  const loadContacts = async () => {
    if (!getGoogleAccessToken()) return;
    setIsLoadingContacts(true);
    setContactsError(null);
    try {
      const data = await listGoogleContacts(50);
      setContacts(data);
    } catch (err: any) {
      console.error('Contacts load error:', err);
      setContactsError(err.message || 'Failed to connect to Google Contacts.');
    } finally {
      setIsLoadingContacts(false);
    }
  };

  const handleRequestAddCandidateAsContact = (c: CandidateSubmission) => {
    const [first, ...rest] = c.details.fullName.split(' ');
    setConfirmModal({
      isOpen: true,
      title: 'Save Candidate to Google Contacts',
      description: `Add ${c.details.fullName} (${c.details.email}) to your Google Contacts with academic profile information.`,
      actionType: 'create_contact',
      actionPayload: {
        givenName: first || c.details.fullName,
        familyName: rest.join(' ') || '',
        email: c.details.email,
        phoneNumber: c.details.phone || '',
        jobTitle: 'CS Scholar / Candidate',
        organization: c.details.schoolName || 'Tamil Nadu State Board'
      }
    });
  };

  const handleRequestCreateCustomContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContactGivenName || !newContactEmail) {
      alert('Please enter at least a First Name and Email.');
      return;
    }

    setConfirmModal({
      isOpen: true,
      title: 'Add New Google Contact',
      description: `Create contact for ${newContactGivenName} ${newContactFamilyName} (${newContactEmail}) in your Google Account.`,
      actionType: 'create_contact',
      actionPayload: {
        givenName: newContactGivenName,
        familyName: newContactFamilyName,
        email: newContactEmail,
        phoneNumber: newContactPhone,
        jobTitle: 'Scholar',
        organization: newContactOrg
      }
    });
  };

  // --- GMAIL ACTIONS ---
  const loadGmailFeed = async (query = '') => {
    if (!getGoogleAccessToken()) return;
    setIsLoadingMessages(true);
    setGmailError(null);
    try {
      const msgs = await listRecentGmailMessages(query, 12);
      setGmailMessages(msgs);
    } catch (err: any) {
      console.error('Gmail feed error:', err);
      setGmailError(err.message || 'Failed to load Gmail feed.');
    } finally {
      setIsLoadingMessages(false);
    }
  };

  const handleRequestSendOutboxEmail = (emailItem: EmailNotification) => {
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

    setConfirmModal({
      isOpen: true,
      title: 'Confirm Gmail Scorecard Dispatch',
      description: `Dispatch certified scorecard email to ${emailItem.recipientName} (${emailItem.recipientEmail}) via your connected Gmail.`,
      actionType: 'send_email',
      actionPayload: {
        to: emailItem.recipientEmail,
        subject: emailItem.subject,
        bodyHtml,
        emailId: emailItem.id
      }
    });
  };

  const handleRequestSendCustomCompose = (e: React.FormEvent) => {
    e.preventDefault();
    if (!composeTo || !composeSubject || !composeBody) {
      alert('Please fill in all fields.');
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

    setConfirmModal({
      isOpen: true,
      title: 'Confirm Custom Gmail Dispatch',
      description: `Send email to ${composeTo} with subject "${composeSubject}" directly through your Google Gmail account.`,
      actionType: 'send_email',
      actionPayload: {
        to: composeTo,
        subject: composeSubject,
        bodyHtml: formattedBodyHtml
      }
    });
  };

  // --- EXECUTE CONFIRMED ACTION ---
  const handleExecuteConfirmedAction = async () => {
    setIsExecutingAction(true);
    setStatusMessage(null);

    try {
      if (confirmModal.actionType === 'upload_drive') {
        const payload = confirmModal.actionPayload;
        try {
          // Optionally put in dedicated folder
          let folderId: string | undefined;
          try {
            folderId = await findOrCreateFolder('The Crucible - Assessment Archives');
          } catch {
            // root folder fallback
          }

          const uploaded = await uploadFileToDrive({
            name: payload.name,
            mimeType: payload.mimeType,
            content: payload.content,
            folderId,
            description: payload.description
          });

          setStatusMessage(`File "${uploaded.name}" successfully uploaded to Google Drive!`);
          setDriveError(null);
          await loadDriveFiles();
        } catch (uploadErr: any) {
          const errText = uploadErr.message || '';
          if (errText.includes('Google Drive API') || errText.includes('disabled') || errText.includes('not been used')) {
            setDriveError(errText);
            downloadFileLocally(payload.name, payload.content, payload.mimeType);
            setStatusMessage(`Google Drive API is pending activation — file "${payload.name}" downloaded to your computer!`);
          } else {
            throw uploadErr;
          }
        }
      } else if (confirmModal.actionType === 'delete_drive') {
        try {
          await deleteDriveFile(confirmModal.actionPayload.id);
          setStatusMessage('File removed from Google Drive.');
          await loadDriveFiles();
        } catch (delErr: any) {
          setDriveError(delErr.message || 'Failed to delete Drive file');
          throw delErr;
        }
      } else if (confirmModal.actionType === 'create_contact') {
        try {
          const created = await createGoogleContact(confirmModal.actionPayload);
          setStatusMessage(`Contact "${created.displayName}" successfully added to Google Contacts!`);
          setShowAddContactModal(false);
          setNewContactGivenName('');
          setNewContactFamilyName('');
          setNewContactEmail('');
          setNewContactPhone('');
          setContactsError(null);
          await loadContacts();
        } catch (cErr: any) {
          setContactsError(cErr.message || 'Failed to create Google contact.');
          throw cErr;
        }
      } else if (confirmModal.actionType === 'delete_contact') {
        try {
          await deleteGoogleContact(confirmModal.actionPayload.resourceName);
          setStatusMessage('Contact removed from Google Contacts.');
          await loadContacts();
        } catch (dcErr: any) {
          setContactsError(dcErr.message || 'Failed to delete Google contact.');
          throw dcErr;
        }
      } else if (confirmModal.actionType === 'send_email') {
        const payload = confirmModal.actionPayload;
        try {
          const res = await sendEmailViaGmail({
            to: payload.to,
            subject: payload.subject,
            bodyHtml: payload.bodyHtml
          });
          setStatusMessage(`Email successfully dispatched via Gmail! (ID: ${res.id})`);
          setGmailError(null);
          if (!payload.emailId && onAddEmailNotification) {
            onAddEmailNotification({
              id: `sent-${res.id}`,
              candidateId: 'manual',
              recipientName: payload.to.split('@')[0],
              recipientEmail: payload.to,
              subject: payload.subject,
              score: 100,
              grade: 'A+',
              feedback: 'Custom dispatch sent via connected Gmail',
              dispatchedAt: new Date().toISOString(),
              status: 'sent'
            });
          }
          setComposeTo('');
          setComposeSubject('');
          setComposeBody('');
        } catch (emailErr: any) {
          setGmailError(emailErr.message || 'Failed to dispatch email via Gmail.');
          throw emailErr;
        }
      }

      setConfirmModal((prev) => ({ ...prev, isOpen: false }));
    } catch (err: any) {
      console.warn('Action note:', err.message);
      // Keep confirmModal open or close based on whether fallback took care of it
      setConfirmModal((prev) => ({ ...prev, isOpen: false }));
    } finally {
      setIsExecutingAction(false);
    }
  };

  const filteredContacts = contacts.filter((c) => {
    const q = contactSearchQuery.toLowerCase();
    return (
      c.displayName.toLowerCase().includes(q) ||
      (c.email && c.email.toLowerCase().includes(q)) ||
      (c.organization && c.organization.toLowerCase().includes(q))
    );
  });

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-950/85 backdrop-blur-md"
        />

        {/* Workspace Hub Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 15 }}
          className="relative w-full max-w-5xl max-h-[92vh] bg-slate-950 rounded-3xl p-5 sm:p-8 border border-cyan-500/30 shadow-2xl shadow-cyan-950/50 overflow-hidden flex flex-col text-slate-100 cyber-grid-bg"
        >
          {/* Top Bar: Title & Google Auth */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-cyan-500/20 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-cyan-950/80 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shadow-md cyber-glow-cyan">
                <HardDrive className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold font-orbitron tracking-wider text-white">
                    Google Workspace Suite
                  </h2>
                  <span className="text-[10px] font-cyber-mono px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-500/40">
                    DRIVE • CONTACTS • GMAIL
                  </span>
                </div>
                <p className="text-xs text-slate-400 font-rajdhani mt-0.5">
                  Unified Google Drive cloud backup, Google Contacts directory, and Gmail dispatch engine.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              {googleUser ? (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-slate-900 border border-cyan-500/40 text-xs font-rajdhani">
                  <div className="w-6 h-6 rounded-full bg-cyan-500/20 border border-cyan-400 flex items-center justify-center text-cyan-300 font-bold text-[11px]">
                    {googleUser.displayName ? googleUser.displayName[0].toUpperCase() : 'G'}
                  </div>
                  <div className="hidden sm:block text-left">
                    <span className="block font-bold text-white leading-none">
                      {googleUser.displayName || 'Google Account'}
                    </span>
                    <span className="text-[10px] text-cyan-400 leading-tight">
                      {googleUser.email}
                    </span>
                  </div>
                  <button
                    onClick={handleSignOutGoogle}
                    className="p-1 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors ml-1"
                    title="Sign Out Google"
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
                  <span>{isAuthenticating ? 'Connecting...' : 'Connect Google'}</span>
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

          {/* Primary Navigation Tabs */}
          <div className="flex items-center gap-2 pt-3 pb-2 border-b border-cyan-500/10">
            <button
              onClick={() => setActiveMainTab('drive')}
              className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-orbitron font-bold uppercase transition-all ${
                activeMainTab === 'drive'
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-slate-950 shadow-md cyber-glow-cyan'
                  : 'text-slate-400 hover:text-cyan-300 bg-slate-900/70 border border-slate-800'
              }`}
            >
              <Folder className="w-4 h-4" />
              <span>Google Drive ({driveFiles.length})</span>
            </button>

            <button
              onClick={() => setActiveMainTab('contacts')}
              className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-orbitron font-bold uppercase transition-all ${
                activeMainTab === 'contacts'
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-slate-950 shadow-md cyber-glow-cyan'
                  : 'text-slate-400 hover:text-cyan-300 bg-slate-900/70 border border-slate-800'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Contacts Directory ({contacts.length})</span>
            </button>

            <button
              onClick={() => setActiveMainTab('gmail')}
              className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-orbitron font-bold uppercase transition-all ${
                activeMainTab === 'gmail'
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-slate-950 shadow-md cyber-glow-cyan'
                  : 'text-slate-400 hover:text-cyan-300 bg-slate-900/70 border border-slate-800'
              }`}
            >
              <Mail className="w-4 h-4" />
              <span>Gmail Communications</span>
            </button>
          </div>

          {/* Status Alert Banner */}
          {statusMessage && (
            <div className="mt-3 p-3 rounded-2xl bg-emerald-950/70 border border-emerald-500/50 flex items-center justify-between text-xs text-emerald-300">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>{statusMessage}</span>
              </div>
              <button
                onClick={() => setStatusMessage(null)}
                className="text-emerald-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 1: GOOGLE DRIVE */}
          {/* ========================================================================= */}
          {activeMainTab === 'drive' && (
            <div className="flex-1 overflow-y-auto pt-4 space-y-4 max-h-[500px]">
              {!googleUser ? (
                <div className="py-16 text-center space-y-4">
                  <div className="w-14 h-14 rounded-3xl bg-cyan-950 border border-cyan-500/40 flex items-center justify-center mx-auto text-cyan-400">
                    <Folder className="w-7 h-7" />
                  </div>
                  <h3 className="text-base font-bold font-orbitron text-white">
                    Connect Google Drive
                  </h3>
                  <p className="text-xs text-slate-400 font-rajdhani max-w-md mx-auto">
                    Sign in to seamlessly backup candidate dossiers, archive question banks, and export certified evaluation reports to your Google Drive.
                  </p>
                  <button
                    onClick={handleSignInGoogle}
                    className="inline-flex items-center gap-2 px-6 py-2.5 rounded-2xl bg-white text-slate-950 font-bold text-xs shadow hover:scale-105 transition-all"
                  >
                    Sign in with Google
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Action Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/80 p-4 rounded-2xl border border-cyan-500/20">
                    <div className="flex items-center gap-2 flex-1 max-w-sm">
                      <div className="relative w-full">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                        <input
                          type="text"
                          value={driveSearchQuery}
                          onChange={(e) => setDriveSearchQuery(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && loadDriveFiles()}
                          placeholder="Search files in Google Drive..."
                          className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-white font-rajdhani text-xs focus:ring-1 focus:ring-cyan-400"
                        />
                      </div>
                      <button
                        onClick={loadDriveFiles}
                        disabled={isLoadingDrive}
                        className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300"
                        title="Search / Refresh"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isLoadingDrive ? 'animate-spin' : ''}`} />
                      </button>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={requestBackupAllToDrive}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-orbitron font-bold uppercase bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-500/40 text-cyan-300 transition-all hover:scale-105"
                        title="Upload JSON archive to Google Drive"
                      >
                        <Database className="w-3.5 h-3.5" />
                        <span>Drive Backup JSON</span>
                      </button>

                      <button
                        onClick={requestExportScorecardsHtmlToDrive}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-orbitron font-bold uppercase bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-slate-950 shadow-md font-bold transition-all hover:scale-105"
                        title="Upload HTML dossier to Google Drive"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>Drive Dossier HTML</span>
                      </button>

                      <button
                        onClick={() => {
                          const dossier = generateAssessmentDossierJson();
                          downloadFileLocally(
                            `The_Crucible_Assessment_Backup_${new Date().toISOString().split('T')[0]}.json`,
                            JSON.stringify(dossier, null, 2),
                            'application/json'
                          );
                          setStatusMessage('Downloaded Assessment Backup JSON to local computer.');
                        }}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-orbitron font-bold uppercase bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-cyan-400 text-slate-300 hover:text-white transition-all"
                        title="Direct instant download without waiting for GCP"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Local JSON</span>
                      </button>

                      <button
                        onClick={() => {
                          const evaluated = candidates.filter((c) => c.status === 'evaluated');
                          if (evaluated.length === 0) {
                            alert('No evaluated candidates to export. Score submissions first.');
                            return;
                          }
                          const html = generateScorecardsHtml();
                          downloadFileLocally(
                            `The_Crucible_Merit_Dossier_${new Date().toISOString().split('T')[0]}.html`,
                            html,
                            'text/html'
                          );
                          setStatusMessage('Downloaded Official Merit Dossier HTML to local computer.');
                        }}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-orbitron font-bold uppercase bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-cyan-400 text-slate-300 hover:text-white transition-all"
                        title="Direct instant download without waiting for GCP"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Local HTML</span>
                      </button>
                    </div>
                  </div>

                  {/* Drive Error / Activation Notice Banner */}
                  {driveError && (
                    <motion.div
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-4 rounded-2xl bg-amber-950/40 border border-amber-500/50 text-amber-200 text-xs space-y-2.5 shadow-lg"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-2.5">
                          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                          <div className="space-y-1">
                            <h4 className="font-bold font-orbitron text-amber-300 text-xs tracking-wide">
                              Google Drive API Notice
                            </h4>
                            <p className="text-amber-200/90 font-rajdhani text-xs leading-relaxed">
                              {driveError}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => setDriveError(null)}
                          className="text-amber-400 hover:text-white p-1 rounded-lg hover:bg-amber-900/50"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-amber-500/20">
                        {extractApiEnableUrl(driveError) ? (
                          <a
                            href={extractApiEnableUrl(driveError)!}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold font-orbitron text-[11px] uppercase shadow transition-all hover:scale-105"
                          >
                            <span>Enable Drive API in Google Cloud</span>
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        ) : (
                          <a
                            href="https://console.cloud.google.com/apis/library/drive.googleapis.com"
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold font-orbitron text-[11px] uppercase shadow transition-all hover:scale-105"
                          >
                            <span>Enable Drive API</span>
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}

                        <button
                          onClick={loadDriveFiles}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-amber-500/40 text-amber-300 font-rajdhani font-semibold text-xs transition-all"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          <span>Retry Drive Sync</span>
                        </button>

                        <button
                          onClick={() => {
                            const dossier = generateAssessmentDossierJson();
                            downloadFileLocally(
                              `The_Crucible_Assessment_Backup_${new Date().toISOString().split('T')[0]}.json`,
                              JSON.stringify(dossier, null, 2),
                              'application/json'
                            );
                            setStatusMessage('Downloaded Assessment Backup JSON to local storage.');
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-950 hover:bg-cyan-900 border border-cyan-500/40 text-cyan-300 font-rajdhani font-semibold text-xs transition-all"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Download Local Backup JSON</span>
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {/* Drive Files Grid / List */}
                  {isLoadingDrive ? (
                    <div className="py-16 text-center text-xs text-cyan-400 font-cyber-mono animate-pulse">
                      Accessing Google Drive files...
                    </div>
                  ) : driveFiles.length === 0 ? (
                    <div className="py-16 text-center text-slate-500 text-xs font-rajdhani space-y-2">
                      <p>No matching files found in your Google Drive.</p>
                      <p className="text-[11px] text-slate-600">
                        Click "Backup Registry JSON" or "Export Dossier HTML" above to create an archive.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {driveFiles.map((file) => (
                        <div
                          key={file.id}
                          className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-cyan-500/40 transition-all space-y-2 text-left flex flex-col justify-between"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2 overflow-hidden">
                              <div className="w-8 h-8 rounded-xl bg-cyan-950 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
                                {file.mimeType.includes('folder') ? (
                                  <Folder className="w-4 h-4" />
                                ) : file.mimeType.includes('html') ? (
                                  <FileCode className="w-4 h-4" />
                                ) : file.mimeType.includes('json') ? (
                                  <FileText className="w-4 h-4" />
                                ) : (
                                  <FileSpreadsheet className="w-4 h-4" />
                                )}
                              </div>
                              <span className="font-bold text-xs text-white font-rajdhani truncate" title={file.name}>
                                {file.name}
                              </span>
                            </div>

                            <button
                              onClick={() => {
                                setConfirmModal({
                                  isOpen: true,
                                  title: 'Delete from Google Drive',
                                  description: `Are you sure you want to delete "${file.name}" from your Google Drive?`,
                                  actionType: 'delete_drive',
                                  actionPayload: { id: file.id }
                                });
                              }}
                              className="p-1 text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
                              title="Delete file"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-[10px] text-slate-400 font-cyber-mono">
                            <span>
                              {file.modifiedTime ? new Date(file.modifiedTime).toLocaleDateString() : 'Drive File'}
                            </span>
                            {file.webViewLink && (
                              <a
                                href={file.webViewLink}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center gap-1 text-cyan-400 hover:underline"
                              >
                                <span>Open Drive</span>
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 2: GOOGLE CONTACTS */}
          {/* ========================================================================= */}
          {activeMainTab === 'contacts' && (
            <div className="flex-1 overflow-y-auto pt-4 space-y-4 max-h-[500px]">
              {!googleUser ? (
                <div className="py-16 text-center space-y-4">
                  <div className="w-14 h-14 rounded-3xl bg-cyan-950 border border-cyan-500/40 flex items-center justify-center mx-auto text-cyan-400">
                    <Users className="w-7 h-7" />
                  </div>
                  <h3 className="text-base font-bold font-orbitron text-white">
                    Connect Google Contacts
                  </h3>
                  <p className="text-xs text-slate-400 font-rajdhani max-w-md mx-auto">
                    Sign in to access your Google Contacts directory, save candidate scholar profiles, and dispatch test scorecards directly.
                  </p>
                  <button
                    onClick={handleSignInGoogle}
                    className="inline-flex items-center gap-2 px-6 py-2.5 rounded-2xl bg-white text-slate-950 font-bold text-xs shadow hover:scale-105 transition-all"
                  >
                    Sign in with Google
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Action Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/80 p-4 rounded-2xl border border-cyan-500/20">
                    <div className="flex items-center gap-2 flex-1 max-w-sm">
                      <div className="relative w-full">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                        <input
                          type="text"
                          value={contactSearchQuery}
                          onChange={(e) => setContactSearchQuery(e.target.value)}
                          placeholder="Search contacts by name or email..."
                          className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-white font-rajdhani text-xs focus:ring-1 focus:ring-cyan-400"
                        />
                      </div>
                      <button
                        onClick={loadContacts}
                        disabled={isLoadingContacts}
                        className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300"
                        title="Refresh Contacts"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isLoadingContacts ? 'animate-spin' : ''}`} />
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setShowAddContactModal(true)}
                        className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-orbitron font-bold uppercase bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-slate-950 shadow-md transition-all hover:scale-105"
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        <span>Add Contact</span>
                      </button>
                    </div>
                  </div>

                  {/* Contacts Error / Activation Notice Banner */}
                  {contactsError && (
                    <motion.div
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-4 rounded-2xl bg-amber-950/40 border border-amber-500/50 text-amber-200 text-xs space-y-2.5 shadow-lg"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-2.5">
                          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                          <div className="space-y-1">
                            <h4 className="font-bold font-orbitron text-amber-300 text-xs tracking-wide">
                              Google People (Contacts) API Notice
                            </h4>
                            <p className="text-amber-200/90 font-rajdhani text-xs leading-relaxed">
                              {contactsError}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => setContactsError(null)}
                          className="text-amber-400 hover:text-white p-1 rounded-lg hover:bg-amber-900/50"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-amber-500/20">
                        {extractApiEnableUrl(contactsError) ? (
                          <a
                            href={extractApiEnableUrl(contactsError)!}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold font-orbitron text-[11px] uppercase shadow transition-all hover:scale-105"
                          >
                            <span>Enable People API in Google Cloud</span>
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        ) : (
                          <a
                            href="https://console.cloud.google.com/apis/library/people.googleapis.com"
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold font-orbitron text-[11px] uppercase shadow transition-all hover:scale-105"
                          >
                            <span>Enable People API</span>
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}

                        <button
                          onClick={loadContacts}
                          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-amber-500/40 text-amber-300 font-rajdhani font-semibold text-xs transition-all"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          <span>Retry Contacts Sync</span>
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {/* Add Contact Mini Form */}
                  {showAddContactModal && (
                    <motion.form
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      onSubmit={handleRequestCreateCustomContact}
                      className="p-4 rounded-2xl bg-slate-900 border border-cyan-500/40 space-y-3"
                    >
                      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                        <span className="text-xs font-bold font-orbitron text-cyan-300">
                          Create New Google Contact
                        </span>
                        <button
                          type="button"
                          onClick={() => setShowAddContactModal(false)}
                          className="text-slate-400 hover:text-white"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <input
                          type="text"
                          required
                          placeholder="First Name *"
                          value={newContactGivenName}
                          onChange={(e) => setNewContactGivenName(e.target.value)}
                          className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white font-rajdhani text-xs"
                        />
                        <input
                          type="text"
                          placeholder="Last Name"
                          value={newContactFamilyName}
                          onChange={(e) => setNewContactFamilyName(e.target.value)}
                          className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white font-rajdhani text-xs"
                        />
                        <input
                          type="email"
                          required
                          placeholder="Email Address *"
                          value={newContactEmail}
                          onChange={(e) => setNewContactEmail(e.target.value)}
                          className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white font-rajdhani text-xs"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <input
                          type="tel"
                          placeholder="Phone Number (e.g. +91 98765 43210)"
                          value={newContactPhone}
                          onChange={(e) => setNewContactPhone(e.target.value)}
                          className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white font-rajdhani text-xs"
                        />
                        <input
                          type="text"
                          placeholder="School / Organization"
                          value={newContactOrg}
                          onChange={(e) => setNewContactOrg(e.target.value)}
                          className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white font-rajdhani text-xs"
                        />
                      </div>

                      <div className="flex justify-end gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setShowAddContactModal(false)}
                          className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-rajdhani"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="px-4 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs font-orbitron uppercase"
                        >
                          Save to Google Contacts
                        </button>
                      </div>
                    </motion.form>
                  )}

                  {/* Candidate Quick Add Strip */}
                  {candidates.length > 0 && (
                    <div className="p-3 rounded-2xl bg-cyan-950/40 border border-cyan-500/20 space-y-2">
                      <div className="flex items-center justify-between text-xs font-cyber-mono text-cyan-300">
                        <span>Candidate Roster Sync:</span>
                        <span className="text-[10px] text-slate-400">1-Click add candidates to Google Contacts</span>
                      </div>
                      <div className="flex items-center gap-2 overflow-x-auto pb-1">
                        {candidates.slice(0, 5).map((cand) => (
                          <div
                            key={cand.id}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-800 shrink-0 text-xs"
                          >
                            <span className="font-bold text-white font-rajdhani">{cand.details.fullName}</span>
                            <button
                              onClick={() => handleRequestAddCandidateAsContact(cand)}
                              className="px-2 py-0.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500 text-cyan-300 hover:text-slate-950 text-[10px] font-bold transition-all"
                            >
                              + Contact
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Contacts Grid */}
                  {isLoadingContacts ? (
                    <div className="py-16 text-center text-xs text-cyan-400 font-cyber-mono animate-pulse">
                      Fetching Google Contacts...
                    </div>
                  ) : filteredContacts.length === 0 ? (
                    <div className="py-16 text-center text-slate-500 text-xs font-rajdhani">
                      No contacts found matching your search.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {filteredContacts.map((contact) => (
                        <div
                          key={contact.resourceName}
                          className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-cyan-500/40 transition-all space-y-2 text-left flex flex-col justify-between"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2.5 overflow-hidden">
                              {contact.photoUrl ? (
                                <img
                                  src={contact.photoUrl}
                                  alt=""
                                  referrerPolicy="no-referrer"
                                  className="w-9 h-9 rounded-full object-cover border border-cyan-500/30"
                                />
                              ) : (
                                <div className="w-9 h-9 rounded-full bg-cyan-950 border border-cyan-500/30 flex items-center justify-center text-cyan-300 font-bold text-xs shrink-0">
                                  {contact.displayName[0]?.toUpperCase() || 'C'}
                                </div>
                              )}
                              <div className="truncate">
                                <span className="font-bold text-xs text-white font-rajdhani block truncate">
                                  {contact.displayName}
                                </span>
                                <span className="text-[11px] text-cyan-400 font-mono block truncate">
                                  {contact.email || 'No email'}
                                </span>
                              </div>
                            </div>

                            <button
                              onClick={() => {
                                setConfirmModal({
                                  isOpen: true,
                                  title: 'Delete Google Contact',
                                  description: `Are you sure you want to remove "${contact.displayName}" from your Google Contacts?`,
                                  actionType: 'delete_contact',
                                  actionPayload: { resourceName: contact.resourceName }
                                });
                              }}
                              className="p-1 text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
                              title="Delete contact"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400 font-rajdhani">
                            <span>{contact.organization || contact.jobTitle || 'Contact'}</span>
                            {contact.email && (
                              <button
                                onClick={() => {
                                  setComposeTo(contact.email || '');
                                  setActiveMainTab('gmail');
                                  setGmailSubTab('compose');
                                }}
                                className="flex items-center gap-1 text-cyan-300 hover:text-white font-bold bg-cyan-950 px-2 py-0.5 rounded-md border border-cyan-500/30"
                              >
                                <Mail className="w-3 h-3" />
                                <span>Email</span>
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 3: GMAIL COMMUNICATIONS */}
          {/* ========================================================================= */}
          {activeMainTab === 'gmail' && (
            <div className="flex-1 flex flex-col pt-3 overflow-hidden">
              {/* Sub-tabs */}
              <div className="flex items-center gap-2 pb-2">
                <button
                  onClick={() => setGmailSubTab('outbox')}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-orbitron font-bold uppercase transition-all ${
                    gmailSubTab === 'outbox'
                      ? 'bg-cyan-500 text-slate-950 font-bold'
                      : 'text-slate-400 bg-slate-900/60'
                  }`}
                >
                  <Inbox className="w-3.5 h-3.5" />
                  <span>Outbox ({emails.length})</span>
                </button>

                <button
                  onClick={() => setGmailSubTab('compose')}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-orbitron font-bold uppercase transition-all ${
                    gmailSubTab === 'compose'
                      ? 'bg-cyan-500 text-slate-950 font-bold'
                      : 'text-slate-400 bg-slate-900/60'
                  }`}
                >
                  <SendHorizontal className="w-3.5 h-3.5" />
                  <span>Compose</span>
                </button>

                <button
                  onClick={() => setGmailSubTab('feed')}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-orbitron font-bold uppercase transition-all ${
                    gmailSubTab === 'feed'
                      ? 'bg-cyan-500 text-slate-950 font-bold'
                      : 'text-slate-400 bg-slate-900/60'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Live Feed</span>
                </button>
              </div>

              {/* Gmail Error / Activation Notice Banner */}
              {gmailError && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-2 p-4 rounded-2xl bg-amber-950/40 border border-amber-500/50 text-amber-200 text-xs space-y-2.5 shadow-lg shrink-0"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5">
                      <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <h4 className="font-bold font-orbitron text-amber-300 text-xs tracking-wide">
                          Gmail API Notice
                        </h4>
                        <p className="text-amber-200/90 font-rajdhani text-xs leading-relaxed">
                          {gmailError}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setGmailError(null)}
                      className="text-amber-400 hover:text-white p-1 rounded-lg hover:bg-amber-900/50"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-amber-500/20">
                    {extractApiEnableUrl(gmailError) ? (
                      <a
                        href={extractApiEnableUrl(gmailError)!}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold font-orbitron text-[11px] uppercase shadow transition-all hover:scale-105"
                      >
                        <span>Enable Gmail API in Google Cloud</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    ) : (
                      <a
                        href="https://console.cloud.google.com/apis/library/gmail.googleapis.com"
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold font-orbitron text-[11px] uppercase shadow transition-all hover:scale-105"
                      >
                        <span>Enable Gmail API</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}

                    <button
                      onClick={() => loadGmailFeed()}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-amber-500/40 text-amber-300 font-rajdhani font-semibold text-xs transition-all"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Retry Gmail Sync</span>
                    </button>
                  </div>
                </motion.div>
              )}

              {/* Subtab Outbox */}
              {gmailSubTab === 'outbox' && (
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 flex-1 overflow-hidden pt-2">
                  <div className="md:col-span-5 border-r border-cyan-500/20 pr-3 overflow-y-auto space-y-2 max-h-[440px]">
                    {emails.length === 0 ? (
                      <div className="py-16 text-center text-slate-500 text-xs font-rajdhani">
                        No candidate assessment emails in queue.
                      </div>
                    ) : (
                      emails.map((email) => {
                        const isSelected = selectedEmail?.id === email.id;
                        return (
                          <div
                            key={email.id}
                            onClick={() => setSelectedEmail(email)}
                            className={`p-3 rounded-2xl border cursor-pointer transition-all text-left ${
                              isSelected
                                ? 'bg-cyan-950/60 border-cyan-400 shadow-md'
                                : 'bg-slate-900/80 border-slate-800 hover:border-cyan-500/40'
                            }`}
                          >
                            <div className="flex items-center justify-between text-xs mb-1">
                              <span className="font-bold text-white font-rajdhani truncate">{email.recipientName}</span>
                              <span className="text-[11px] font-bold text-rose-400 font-cyber-mono">{email.score}/100</span>
                            </div>
                            <p className="text-[11px] text-slate-400 truncate mb-1 font-rajdhani">To: {email.recipientEmail}</p>
                            <div className="flex items-center justify-between text-[10px] text-slate-400 font-cyber-mono">
                              <span className="text-emerald-400 font-semibold">Ready to Dispatch</span>
                              <span>{new Date(email.dispatchedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  <div className="md:col-span-7 overflow-y-auto max-h-[440px] bg-slate-900/60 p-4 sm:p-5 rounded-2xl border border-cyan-500/20 flex flex-col justify-between">
                    {selectedEmail ? (
                      <div className="space-y-3">
                        <div className="space-y-1 pb-3 border-b border-cyan-500/20 text-xs font-rajdhani">
                          <div className="flex justify-between">
                            <span className="text-slate-400">To:</span>
                            <span className="font-semibold text-white">{selectedEmail.recipientName} &lt;{selectedEmail.recipientEmail}&gt;</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Subject:</span>
                            <span className="font-bold text-cyan-300 truncate max-w-[280px]">{selectedEmail.subject}</span>
                          </div>
                        </div>

                        <div className="bg-slate-950 rounded-2xl p-4 border border-cyan-500/30 space-y-3 text-left">
                          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                            <span className="font-bold text-xs text-rose-400 font-orbitron">The Crucible • Scorecard</span>
                            <span className="text-[10px] font-cyber-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 font-bold border border-cyan-500/30">STATE CS</span>
                          </div>
                          <p className="text-xs text-slate-300 font-rajdhani">
                            Dear <strong>{selectedEmail.recipientName}</strong>, your Tamil Nadu CS Assessment has been verified.
                          </p>
                          <div className="p-3 rounded-xl bg-gradient-to-br from-rose-950/60 to-cyan-950/60 border border-cyan-500/40 text-center">
                            <div className="text-2xl font-bold font-cyber-mono text-rose-400">{selectedEmail.score} / 100</div>
                            <div className="text-xs text-slate-200 font-rajdhani">Grade: {selectedEmail.grade} {selectedEmail.badge ? `• 🏆 ${selectedEmail.badge}` : ''}</div>
                          </div>
                          <p className="text-xs text-slate-300 italic font-rajdhani">"{selectedEmail.feedback}"</p>
                        </div>

                        <div className="pt-2 flex justify-end">
                          <button
                            onClick={() => {
                              if (!googleUser) handleSignInGoogle();
                              else handleRequestSendOutboxEmail(selectedEmail);
                            }}
                            className="flex items-center gap-2 px-5 py-2 rounded-2xl text-xs font-orbitron font-bold uppercase bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-slate-950 shadow-md transition-all hover:scale-105"
                          >
                            <Send className="w-3.5 h-3.5" />
                            <span>{googleUser ? 'Send via Connected Gmail' : 'Connect Google to Send'}</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="py-20 text-center text-slate-500 text-xs font-rajdhani">
                        Select an email on the left to preview.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Subtab Compose */}
              {gmailSubTab === 'compose' && (
                <form onSubmit={handleRequestSendCustomCompose} className="space-y-3 pt-2 flex-1 overflow-y-auto max-h-[440px]">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-cyber-mono text-cyan-300">Recipient Email *</label>
                        {contacts.length > 0 && (
                          <select
                            onChange={(e) => e.target.value && setComposeTo(e.target.value)}
                            className="text-[10px] bg-slate-900 border border-slate-700 text-cyan-300 rounded px-1.5 py-0.5"
                          >
                            <option value="">+ Pick from Google Contacts</option>
                            {contacts.filter((c) => c.email).map((c) => (
                              <option key={c.resourceName} value={c.email}>
                                {c.displayName} ({c.email})
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                      <input
                        type="email"
                        required
                        value={composeTo}
                        onChange={(e) => setComposeTo(e.target.value)}
                        placeholder="candidate@school.edu.in"
                        className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-cyan-500/40 text-white font-rajdhani text-xs focus:ring-1 focus:ring-cyan-400"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-cyber-mono text-cyan-300 mb-1">Subject Line *</label>
                      <input
                        type="text"
                        required
                        value={composeSubject}
                        onChange={(e) => setComposeSubject(e.target.value)}
                        placeholder="e.g. TN CS Evaluation Scorecard"
                        className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-cyan-500/40 text-white font-rajdhani text-xs focus:ring-1 focus:ring-cyan-400"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-cyber-mono text-cyan-300 mb-1">Email Body *</label>
                    <textarea
                      rows={6}
                      required
                      value={composeBody}
                      onChange={(e) => setComposeBody(e.target.value)}
                      placeholder="Write message to scholar..."
                      className="w-full p-3 rounded-xl bg-slate-900 border border-cyan-500/40 text-white font-rajdhani text-xs leading-relaxed focus:ring-1 focus:ring-cyan-400"
                    />
                  </div>

                  <div className="flex justify-end pt-2 border-t border-cyan-500/20">
                    <button
                      type="submit"
                      className="flex items-center gap-2 px-6 py-2 rounded-2xl text-xs font-orbitron font-bold uppercase bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-slate-950 shadow-md transition-all hover:scale-105"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Review & Send via Gmail</span>
                    </button>
                  </div>
                </form>
              )}

              {/* Subtab Feed */}
              {gmailSubTab === 'feed' && (
                <div className="space-y-3 pt-2 flex-1 overflow-y-auto max-h-[440px]">
                  {!googleUser ? (
                    <div className="py-16 text-center text-xs text-slate-400 font-rajdhani">
                      Connect Google to inspect live inbox messages.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-xs font-rajdhani text-slate-300">
                        <span>Connected: <strong className="text-cyan-300">{googleUser.email}</strong></span>
                        <button
                          onClick={() => loadGmailFeed()}
                          disabled={isLoadingMessages}
                          className="flex items-center gap-1 px-3 py-1 rounded-xl bg-slate-900 border border-cyan-500/30 text-cyan-300 text-xs font-cyber-mono"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${isLoadingMessages ? 'animate-spin' : ''}`} />
                          <span>Sync Feed</span>
                        </button>
                      </div>

                      {isLoadingMessages ? (
                        <div className="py-16 text-center text-xs text-cyan-400 font-cyber-mono animate-pulse">
                          Syncing Gmail feed...
                        </div>
                      ) : gmailMessages.length === 0 ? (
                        <div className="py-16 text-center text-xs text-slate-500 font-rajdhani">
                          No recent messages returned.
                        </div>
                      ) : (
                        <div className="divide-y divide-slate-800 rounded-2xl bg-slate-900/60 border border-cyan-500/20 overflow-hidden">
                          {gmailMessages.map((msg) => (
                            <div key={msg.id} className="p-3 text-left space-y-1 hover:bg-slate-900">
                              <div className="flex justify-between text-xs">
                                <span className="font-bold text-cyan-300 truncate max-w-[280px] font-rajdhani">{msg.subject || '(No Subject)'}</span>
                                <span className="text-[10px] text-slate-500 font-cyber-mono">{msg.date ? new Date(msg.date).toLocaleDateString() : ''}</span>
                              </div>
                              <p className="text-xs text-slate-300 font-rajdhani line-clamp-2">{msg.snippet}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </motion.div>
      </div>

      {/* EXPLICIT CONFIRMATION MODAL (Mandatory for mutating operations across Google Drive, Contacts, and Gmail) */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => !isExecutingAction && setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
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
                <h3 className="text-base font-bold font-orbitron text-white">{confirmModal.title}</h3>
                <p className="text-xs text-slate-400 font-rajdhani">Explicit Google Workspace confirmation</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 font-rajdhani leading-relaxed bg-slate-900 p-4 rounded-2xl border border-slate-800">
              {confirmModal.description}
            </p>

            <div className="p-3 rounded-xl bg-cyan-950/40 border border-cyan-500/30 text-[11px] text-cyan-300 font-rajdhani">
              💡 This action will interact directly with your connected Google Account ({googleUser?.email}).
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={isExecutingAction}
                onClick={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
                className="px-4 py-2 rounded-xl text-xs font-rajdhani font-semibold bg-slate-900 hover:bg-slate-800 text-slate-300 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isExecutingAction}
                onClick={handleExecuteConfirmedAction}
                className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-orbitron font-bold uppercase bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-slate-950 shadow-md transition-all hover:scale-105 disabled:opacity-50"
              >
                {isExecutingAction ? <span>Executing...</span> : <span>Confirm & Proceed</span>}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
