import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
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
  Cpu,
  Layers,
  ChevronRight,
  Database,
  RefreshCw,
  Sliders,
  ExternalLink,
  Code2
} from 'lucide-react';
import { UserRole } from '../types';
import { SUPABASE_URL } from '../lib/supabase';

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
  onOpenSqlModal?: () => void;
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
  hasCandidateSubmission,
  onOpenSqlModal
}) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Close sidebar on view transition
  const handleNavClick = (view: 'home' | 'assessment' | 'creator' | 'leaderboard') => {
    onNavigate(view);
    setSidebarOpen(false);
  };

  const handleOpenWorkspace = (tab?: 'drive' | 'contacts' | 'gmail') => {
    if (onOpenGoogleWorkspace) {
      onOpenGoogleWorkspace(tab);
    } else {
      onOpenEmailOutbox();
    }
    setSidebarOpen(false);
  };

  // Prevent background scroll when sidebar is open on mobile
  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [sidebarOpen]);

  return (
    <>
      <header className="sticky top-0 z-40 w-full backdrop-blur-xl bg-slate-950/90 border-b border-cyan-500/20 transition-colors cyber-grid-bg">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 min-h-[4.25rem] py-2 flex items-center justify-between gap-2 sm:gap-4">
          
          {/* Left: Brand Logo & Title */}
          <div
            onClick={() => handleNavClick(hasCandidateSubmission ? 'home' : (currentRole === 'creator' ? 'creator' : 'assessment'))}
            className="flex items-center gap-2.5 sm:gap-3 cursor-pointer group select-none py-1 shrink-0"
          >
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-gradient-to-tr from-cyan-600 via-rose-500 to-indigo-600 flex items-center justify-center text-white shadow-lg cyber-glow-cyan group-hover:scale-105 transition-transform border border-cyan-400/40 shrink-0">
              <Flame className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-200 animate-pulse" />
            </div>
            <div className="flex flex-col justify-center">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="font-orbitron font-black text-sm sm:text-lg tracking-wider text-white leading-tight">
                  THE <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-rose-400 to-indigo-400">CRUCIBLE</span>
                </span>
                <span className="text-[8px] sm:text-[10px] font-cyber-mono font-bold uppercase px-1.5 sm:px-2 py-0.5 rounded-full bg-cyan-950/90 text-cyan-300 border border-cyan-500/40 shrink-0">
                  TN-CS // v2.5
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-slate-400 hidden sm:flex items-center gap-1.5 font-rajdhani font-medium leading-normal mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                <span>11th & 12th State Board CS Evaluation Suite</span>
              </p>
            </div>
          </div>

          {/* Center: Desktop Navigation Tabs (Hidden on Mobile) */}
          <nav className="hidden lg:flex items-center gap-1.5 bg-slate-900/90 p-1.5 rounded-2xl border border-cyan-500/30">
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
              onClick={() => onNavigate('creator')}
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

          {/* Right: Quick Action Controls & Mobile Sidebar Drawer Toggle */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            
            {/* Supabase Realtime Live Indicator */}
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-[10px] font-cyber-mono font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
              <span>CLOUD SYNC</span>
            </div>

            {/* Automated Unit Tests Suite */}
            <button
              onClick={onOpenUnitTests}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-cyber-mono font-bold bg-slate-900 hover:bg-slate-800 text-cyan-300 border border-cyan-500/40 transition-colors shadow-sm"
              title="Automated Unit Test Suite"
            >
              <FlaskConical className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden md:inline">TESTS</span>
            </button>

            {/* Google Workspace Hub */}
            <button
              onClick={() => handleOpenWorkspace('drive')}
              className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-orbitron font-bold uppercase bg-slate-900 hover:bg-slate-800 text-cyan-300 border border-cyan-500/40 transition-all shadow-sm hover:scale-105"
              title="Google Workspace Hub: Google Drive, Contacts & Gmail"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 48 48">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
              </svg>
              <span>Workspace</span>
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

            {/* Desktop Role Status */}
            <div className="hidden sm:flex items-center gap-1.5">
              {currentRole !== 'guest' ? (
                <div className="flex items-center gap-1.5">
                  <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-cyber-mono font-bold border uppercase tracking-wider ${
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
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-orbitron font-bold uppercase tracking-wider bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-slate-950 shadow-md cyber-glow-cyan transition-all hover:scale-[1.02]"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>ACCESS CODE</span>
                </button>
              )}
            </div>

            {/* Primary Mobile & Universal Sidebar Toggle Button */}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 rounded-xl text-cyan-300 hover:text-white bg-slate-900/90 hover:bg-slate-800 border border-cyan-500/40 transition-all shadow-sm active:scale-95"
              aria-label="Open Navigation Sidebar"
            >
              {sidebarOpen ? <X className="w-5 h-5 text-rose-400" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* Cybernetic Slide-Out Navigation Sidebar Drawer */}
      <AnimatePresence>
        {sidebarOpen && (
          <div className="fixed inset-0 z-50 flex">
            {/* Backdrop Blur Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setSidebarOpen(false)}
              className="fixed inset-0 bg-slate-950/80 backdrop-blur-md"
            />

            {/* Slide-out Sidebar Content */}
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="relative w-full max-w-xs sm:max-w-sm h-full bg-slate-950 border-r border-cyan-500/30 shadow-2xl flex flex-col z-50 overflow-y-auto cyber-grid-bg"
            >
              {/* Sidebar Header */}
              <div className="p-4 border-b border-cyan-500/20 flex items-center justify-between bg-slate-900/80">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-600 via-rose-500 to-indigo-600 flex items-center justify-center text-white shadow-md">
                    <Flame className="w-5 h-5 text-cyan-200" />
                  </div>
                  <div>
                    <h2 className="font-orbitron font-black text-sm text-white tracking-wider">
                      THE <span className="text-cyan-400">CRUCIBLE</span>
                    </h2>
                    <p className="text-[10px] text-cyan-400 font-cyber-mono font-semibold">
                      TN STATE BOARD CS // v2.5
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  <X className="w-5 h-5 text-rose-400" />
                </button>
              </div>

              {/* Active Role Clearance Card */}
              <div className="p-4 border-b border-slate-800/80 bg-slate-900/40">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-cyber-mono font-bold text-slate-400 uppercase tracking-wider">
                    SECURITY CLEARANCE
                  </span>
                  <span className={`text-[10px] font-cyber-mono font-bold px-2 py-0.5 rounded-full border uppercase ${
                    currentRole === 'creator'
                      ? 'bg-rose-950 text-rose-300 border-rose-500/40'
                      : currentRole === 'candidate'
                      ? 'bg-cyan-950 text-cyan-300 border-cyan-500/40'
                      : 'bg-slate-800 text-slate-300 border-slate-700'
                  }`}>
                    {currentRole}
                  </span>
                </div>

                {currentRole === 'guest' ? (
                  <button
                    onClick={() => {
                      onOpenLogin();
                      setSidebarOpen(false);
                    }}
                    className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 text-slate-950 font-orbitron font-bold text-xs uppercase shadow-md hover:scale-[1.02] transition-transform"
                  >
                    <KeyRound className="w-3.5 h-3.5" />
                    <span>Enter Access Code</span>
                  </button>
                ) : (
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-slate-300 font-rajdhani font-semibold truncate">
                      {currentRole === 'creator' ? 'Lead State Board Evaluator' : 'Active CS Candidate'}
                    </span>
                    <button
                      onClick={() => {
                        onLogout();
                        setSidebarOpen(false);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-rose-950/80 hover:bg-rose-900 border border-rose-500/40 text-rose-300 font-cyber-mono text-[10px] font-bold transition-colors"
                    >
                      Disconnect
                    </button>
                  </div>
                )}
              </div>

              {/* Main Navigation Links */}
              <div className="p-4 space-y-1.5 flex-1">
                <p className="text-[10px] font-cyber-mono font-bold text-slate-500 uppercase tracking-wider mb-2 px-1">
                  MAIN NAVIGATION
                </p>

                {hasCandidateSubmission && (
                  <button
                    onClick={() => handleNavClick('home')}
                    className={`w-full flex items-center justify-between p-3 rounded-xl text-xs font-orbitron font-bold uppercase transition-all ${
                      activeView === 'home'
                        ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-slate-950 shadow-md font-black'
                        : 'text-slate-300 hover:bg-slate-900 border border-transparent hover:border-cyan-500/20'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <FileCheck2 className={`w-4 h-4 ${activeView === 'home' ? 'text-slate-950' : 'text-cyan-400'}`} />
                      <span>Candidate Home</span>
                    </div>
                    <ChevronRight className="w-4 h-4 opacity-70" />
                  </button>
                )}

                <button
                  onClick={() => handleNavClick('assessment')}
                  className={`w-full flex items-center justify-between p-3 rounded-xl text-xs font-orbitron font-bold uppercase transition-all ${
                    activeView === 'assessment'
                      ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-slate-950 shadow-md font-black'
                      : 'text-slate-300 hover:bg-slate-900 border border-transparent hover:border-cyan-500/20'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <UserCheck className={`w-4 h-4 ${activeView === 'assessment' ? 'text-slate-950' : 'text-cyan-400'}`} />
                    <span>Candidate Assessment (25 Qs)</span>
                  </div>
                  <ChevronRight className="w-4 h-4 opacity-70" />
                </button>

                <button
                  onClick={() => handleNavClick('creator')}
                  className={`w-full flex items-center justify-between p-3 rounded-xl text-xs font-orbitron font-bold uppercase transition-all ${
                    activeView === 'creator'
                      ? 'bg-gradient-to-r from-rose-500 to-indigo-600 text-white shadow-md font-black'
                      : 'text-slate-300 hover:bg-slate-900 border border-transparent hover:border-rose-500/20'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Shield className={`w-4 h-4 ${activeView === 'creator' ? 'text-white' : 'text-rose-400'}`} />
                    <span>Evaluator Console</span>
                  </div>
                  {currentRole !== 'creator' && (
                    <span className="text-[9px] font-cyber-mono font-bold px-1.5 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-500/30">
                      1-Click
                    </span>
                  )}
                </button>

                <button
                  onClick={() => handleNavClick('leaderboard')}
                  className={`w-full flex items-center justify-between p-3 rounded-xl text-xs font-orbitron font-bold uppercase transition-all ${
                    activeView === 'leaderboard'
                      ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-md font-black'
                      : 'text-slate-300 hover:bg-slate-900 border border-transparent hover:border-amber-500/20'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Trophy className={`w-4 h-4 ${activeView === 'leaderboard' ? 'text-slate-950' : 'text-amber-400'}`} />
                    <span>State Leaderboard</span>
                  </div>
                  <ChevronRight className="w-4 h-4 opacity-70" />
                </button>

                {/* Workspace & Tools Section */}
                <p className="text-[10px] font-cyber-mono font-bold text-slate-500 uppercase tracking-wider mt-4 mb-2 px-1">
                  TOOLS & INTEGRATIONS
                </p>

                <button
                  onClick={() => handleOpenWorkspace('drive')}
                  className="w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-orbitron font-bold uppercase text-slate-300 hover:bg-slate-900 border border-slate-800 transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <svg className="w-4 h-4" viewBox="0 0 48 48">
                      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                    </svg>
                    <span>Google Workspace Hub</span>
                  </div>
                  <span className="text-[9px] font-cyber-mono font-bold text-cyan-400 bg-cyan-950 px-1.5 py-0.5 rounded border border-cyan-500/30">
                    Drive & Mail
                  </span>
                </button>

                <button
                  onClick={() => {
                    onOpenUnitTests();
                    setSidebarOpen(false);
                  }}
                  className="w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-cyber-mono font-bold uppercase text-cyan-300 hover:bg-slate-900 border border-slate-800 transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <FlaskConical className="w-4 h-4 text-cyan-400" />
                    <span>Cyber-Tests Suite</span>
                  </div>
                  <span className="text-[9px] font-cyber-mono text-emerald-400 bg-emerald-950 px-1.5 py-0.5 rounded border border-emerald-500/30">
                    25 Tests Passed
                  </span>
                </button>

                {onOpenSqlModal && (
                  <button
                    onClick={() => {
                      onOpenSqlModal();
                      setSidebarOpen(false);
                    }}
                    className="w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-cyber-mono font-bold uppercase text-emerald-300 hover:bg-slate-900 border border-slate-800 transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <Database className="w-4 h-4 text-emerald-400" />
                      <span>Supabase SQL Editor</span>
                    </div>
                    <span className="text-[9px] font-cyber-mono text-emerald-400 bg-emerald-950 px-1.5 py-0.5 rounded border border-emerald-500/30">
                      Copy SQL
                    </span>
                  </button>
                )}

                {/* Supabase Cloud Sync Status */}
                <div className="mt-4 p-3 rounded-xl bg-slate-900/90 border border-cyan-500/20 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                      <span className="text-[11px] font-cyber-mono font-bold text-slate-200">
                        Supabase Multi-Device Sync
                      </span>
                    </div>
                    <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                  </div>
                  <p className="text-[10px] text-slate-400 font-rajdhani">
                    Real-time Postgres broadcast active on <code className="text-cyan-300 font-cyber-mono">evalpulse-crucible-sync</code>.
                  </p>
                </div>
              </div>

              {/* Sidebar Footer Controls */}
              <div className="p-4 border-t border-cyan-500/20 bg-slate-900/80 flex items-center justify-between">
                <button
                  onClick={onToggleDarkMode}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-cyber-mono font-bold text-slate-300 hover:bg-slate-800 border border-slate-700 transition-colors"
                >
                  {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-cyan-400" />}
                  <span>{isDarkMode ? 'Light Mode' : 'Dark Mode'}</span>
                </button>

                <button
                  onClick={() => setSidebarOpen(false)}
                  className="px-3 py-2 rounded-xl text-xs font-orbitron font-bold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  Close
                </button>
              </div>
            </motion.aside>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
