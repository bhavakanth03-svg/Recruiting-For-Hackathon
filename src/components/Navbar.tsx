import React from 'react';
import { motion } from 'motion/react';
import {
  Sparkles,
  Shield,
  UserCheck,
  Moon,
  Sun,
  Trophy,
  Mail,
  FlaskConical,
  LogOut,
  KeyRound,
  FileCheck2,
  Menu,
  X,
  Flame,
  Radio,
  Cpu
} from 'lucide-react';
import { UserRole } from '../types';

interface NavbarProps {
  currentRole: UserRole;
  activeView: 'home' | 'assessment' | 'creator' | 'leaderboard';
  onNavigate: (view: 'home' | 'assessment' | 'creator' | 'leaderboard') => void;
  onOpenLogin: () => void;
  onLogout: () => void;
  onOpenUnitTests: () => void;
  onOpenEmailOutbox: () => void;
  onOpenGoogleWorkspace?: (tab?: 'drive' | 'contacts' | 'gmail') => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  unreadEmailCount: number;
  hasCandidateSubmission: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentRole,
  activeView,
  onNavigate,
  onOpenLogin,
  onLogout,
  onOpenUnitTests,
  onOpenEmailOutbox,
  onOpenGoogleWorkspace,
  isDarkMode,
  onToggleDarkMode,
  unreadEmailCount,
  hasCandidateSubmission
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  const handleOpenWorkspace = (tab?: 'drive' | 'contacts' | 'gmail') => {
    if (onOpenGoogleWorkspace) {
      onOpenGoogleWorkspace(tab);
    } else {
      onOpenEmailOutbox();
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full backdrop-blur-xl bg-slate-950/90 border-b border-cyan-500/20 transition-colors cyber-grid-bg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 min-h-[4.25rem] py-2 flex items-center justify-between gap-4">
        {/* Brand Logo: The Crucible Cybernetic */}
        <div
          onClick={() => onNavigate(hasCandidateSubmission ? 'home' : (currentRole === 'creator' ? 'creator' : 'assessment'))}
          className="flex items-center gap-3 cursor-pointer group select-none py-1"
        >
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-600 via-rose-500 to-indigo-600 flex items-center justify-center text-white shadow-lg cyber-glow-cyan group-hover:scale-105 transition-transform border border-cyan-400/40 shrink-0">
            <Flame className="w-5 h-5 text-cyan-200 animate-pulse" />
          </div>
          <div className="flex flex-col justify-center">
            <div className="flex items-center gap-2">
              <span className="font-orbitron font-black text-base sm:text-lg tracking-wider text-white leading-tight">
                THE <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-rose-400 to-indigo-400">CRUCIBLE</span>
              </span>
              <span className="text-[9px] sm:text-[10px] font-cyber-mono font-bold uppercase px-2 py-0.5 rounded-full bg-cyan-950/90 text-cyan-300 border border-cyan-500/40 shrink-0">
                TN-CS // v2.5
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:flex items-center gap-1.5 font-rajdhani font-medium leading-normal mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
              <span>11th & 12th State Board CS Evaluation Suite</span>
            </p>
          </div>
        </div>

        {/* Desktop Navigation Tabs */}
        <nav className="hidden md:flex items-center gap-1.5 bg-slate-900/90 p-1.5 rounded-2xl border border-cyan-500/30">
          {hasCandidateSubmission && (
            <button
              onClick={() => onNavigate('home')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all uppercase tracking-wider font-orbitron ${
                activeView === 'home'
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-slate-950 shadow-md cyber-glow-cyan'
                  : 'text-slate-400 hover:text-cyan-300'
              }`}
            >
              <FileCheck2 className="w-3.5 h-3.5" />
              <span>Candidate Home</span>
            </button>
          )}

          <button
            onClick={() => onNavigate('assessment')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all uppercase tracking-wider font-orbitron ${
              activeView === 'assessment'
                ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-slate-950 shadow-md cyber-glow-cyan'
                : 'text-slate-400 hover:text-cyan-300'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>Assessment (25 Qs)</span>
          </button>

          <button
            onClick={() => {
              if (currentRole === 'creator') {
                onNavigate('creator');
              } else {
                onOpenLogin();
              }
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all uppercase tracking-wider font-orbitron ${
              activeView === 'creator'
                ? 'bg-gradient-to-r from-rose-500 to-indigo-600 text-white shadow-md cyber-glow-rose'
                : 'text-slate-400 hover:text-rose-300'
            }`}
          >
            <Shield className="w-3.5 h-3.5 text-rose-400" />
            <span>Evaluator Console</span>
          </button>

          <button
            onClick={() => onNavigate('leaderboard')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all uppercase tracking-wider font-orbitron ${
              activeView === 'leaderboard'
                ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-md cyber-glow-amber'
                : 'text-slate-400 hover:text-amber-300'
            }`}
          >
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            <span>Leaderboard</span>
          </button>
        </nav>

        {/* Right Actions & Controls */}
        <div className="flex items-center gap-2">
          {/* Automated Unit Tests Button */}
          <button
            onClick={onOpenUnitTests}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-cyber-mono font-bold bg-slate-900 hover:bg-slate-800 text-cyan-300 border border-cyan-500/40 transition-colors shadow-sm"
            title="Automated Unit Test Suite"
          >
            <FlaskConical className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">CYBER-TESTS</span>
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
          </button>

          {/* Google Workspace Hub (Drive, Contacts, Gmail) */}
          <button
            onClick={() => handleOpenWorkspace('drive')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-orbitron font-bold uppercase bg-slate-900 hover:bg-slate-800 text-cyan-300 border border-cyan-500/40 transition-all shadow-sm hover:scale-105"
            title="Google Workspace Hub: Google Drive, Google Contacts & Gmail"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 48 48">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
            </svg>
            <span className="hidden sm:inline">Workspace</span>
            <span className="text-[10px] text-cyan-400 font-cyber-mono">Suite</span>
          </button>

          {/* Email Outbox Button */}
          <button
            onClick={() => handleOpenWorkspace('gmail')}
            className="relative p-2 rounded-xl text-slate-300 hover:bg-slate-800 border border-slate-800 transition-colors"
            title="Gmail & Assessment Notifications"
          >
            <Mail className="w-4 h-4 text-cyan-400" />
            {unreadEmailCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-600 text-white rounded-full text-[10px] flex items-center justify-center font-bold font-cyber-mono animate-bounce">
                {unreadEmailCount}
              </span>
            )}
          </button>

          {/* Dark Mode Toggle */}
          <button
            onClick={onToggleDarkMode}
            className="p-2 rounded-xl text-slate-300 hover:bg-slate-800 border border-slate-800 transition-colors"
            aria-label="Toggle theme"
          >
            {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-cyan-400" />}
          </button>

          {/* Role Status & Switch */}
          {currentRole !== 'guest' ? (
            <div className="flex items-center gap-1.5 pl-1">
              <div className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-cyber-mono font-bold border uppercase tracking-wider ${
                currentRole === 'creator'
                  ? 'bg-rose-950/60 text-rose-300 border-rose-500/50 cyber-glow-rose'
                  : 'bg-cyan-950/60 text-cyan-300 border-cyan-500/50 cyber-glow-cyan'
              }`}>
                {currentRole === 'creator' ? <Shield className="w-3.5 h-3.5 text-rose-400" /> : <UserCheck className="w-3.5 h-3.5 text-cyan-400" />}
                <span>{currentRole}</span>
              </div>
              <button
                onClick={onLogout}
                className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 border border-slate-800 hover:border-rose-500/40 transition-colors"
                title="Disconnect Role Clearance"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenLogin}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-orbitron font-bold uppercase tracking-wider bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-slate-950 shadow-md cyber-glow-cyan transition-all hover:scale-[1.02]"
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>ACCESS CODE</span>
            </button>
          )}

          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-xl text-slate-300 hover:bg-slate-800 border border-slate-800 transition-colors"
          >
            {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="md:hidden border-t border-slate-800 bg-slate-950/95 backdrop-blur-xl px-4 py-3 space-y-2"
        >
          {hasCandidateSubmission && (
            <button
              onClick={() => {
                onNavigate('home');
                setMobileMenuOpen(false);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-orbitron font-bold uppercase text-slate-200 hover:bg-slate-900"
            >
              <FileCheck2 className="w-4 h-4 text-cyan-400" />
              <span>Candidate Home (Post-Submission)</span>
            </button>
          )}

          <button
            onClick={() => {
              onNavigate('assessment');
              setMobileMenuOpen(false);
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-orbitron font-bold uppercase text-slate-200 hover:bg-slate-900"
          >
            <UserCheck className="w-4 h-4 text-cyan-400" />
            <span>Assessment Room (25 Questions)</span>
          </button>

          <button
            onClick={() => {
              if (currentRole === 'creator') {
                onNavigate('creator');
              } else {
                onOpenLogin();
              }
              setMobileMenuOpen(false);
            }}
            className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-orbitron font-bold uppercase text-slate-200 hover:bg-slate-900"
          >
            <div className="flex items-center gap-2.5">
              <Shield className="w-4 h-4 text-rose-400" />
              <span>Evaluator Console</span>
            </div>
            {currentRole !== 'creator' && (
              <span className="text-[10px] text-amber-300 font-cyber-mono bg-amber-950 px-2 py-0.5 rounded border border-amber-500/40">
                Master Key
              </span>
            )}
          </button>

          <button
            onClick={() => {
              onNavigate('leaderboard');
              setMobileMenuOpen(false);
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-orbitron font-bold uppercase text-slate-200 hover:bg-slate-900"
          >
            <Trophy className="w-4 h-4 text-amber-400" />
            <span>Leaderboard</span>
          </button>

          <div className="pt-2 border-t border-slate-800/80 grid grid-cols-2 gap-2">
            <button
              onClick={() => {
                handleOpenWorkspace('drive');
                setMobileMenuOpen(false);
              }}
              className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-orbitron font-bold uppercase bg-slate-900 border border-cyan-500/40 text-cyan-300"
            >
              <span>Workspace Hub</span>
            </button>

            <button
              onClick={() => {
                onOpenUnitTests();
                setMobileMenuOpen(false);
              }}
              className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-cyber-mono font-bold uppercase bg-slate-900 border border-slate-700 text-slate-300"
            >
              <FlaskConical className="w-3.5 h-3.5 text-cyan-400" />
              <span>Unit Tests</span>
            </button>
          </div>
        </motion.div>
      )}
    </header>
  );
};
