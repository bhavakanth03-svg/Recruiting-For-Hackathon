import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, UserCheck, KeyRound, ArrowRight, Eye, EyeOff, AlertCircle, X, Terminal, Lock, Cpu, Sparkles } from 'lucide-react';
import { UserRole } from '../types';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthenticate: (code: string) => Promise<{ success: boolean; role?: UserRole; message?: string }>;
}

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose, onAuthenticate }) => {
  const [accessCode, setAccessCode] = useState('');
  const [activeTab, setActiveTab] = useState<'candidate' | 'creator'>('candidate');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessCode.trim()) {
      setErrorMessage('Please enter your authorized security access code.');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    try {
      const res = await onAuthenticate(accessCode.trim());
      if (res.success) {
        onClose();
      } else {
        setErrorMessage(res.message || 'Access authorization failed. Invalid security code.');
      }
    } catch {
      setErrorMessage('Authentication gateway error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Cyber Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-950/85 backdrop-blur-lg"
        />

        {/* Modal Terminal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 12 }}
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-md bg-slate-900/95 border border-cyan-500/40 rounded-3xl p-6 sm:p-8 shadow-2xl cyber-glow-cyan text-slate-100 overflow-hidden cyber-corner-box cyber-grid-bg"
        >
          {/* Cyber Scanline Layer */}
          <div className="absolute inset-0 cyber-scanlines pointer-events-none opacity-40" />

          {/* Ambient Cyber Neon Highlights */}
          <div className="absolute -top-20 -right-20 w-44 h-44 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-20 -left-20 w-44 h-44 bg-rose-500/15 rounded-full blur-3xl pointer-events-none" />

          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-cyan-400 hover:bg-slate-800/80 border border-slate-700/60 transition-colors z-10"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Header */}
          <div className="text-center mb-6 relative z-10">
            <div className="w-13 h-13 rounded-2xl bg-slate-950/80 border border-cyan-500/50 flex items-center justify-center text-cyan-400 mx-auto mb-3 shadow-inner cyber-glow-cyan">
              <KeyRound className="w-6 h-6 animate-pulse" />
            </div>
            
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-cyan-950/70 border border-cyan-500/40 text-cyan-300 text-[11px] font-cyber-mono font-semibold tracking-wider uppercase mb-2">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping"></span>
              <span>SECURE ACCESS GATEWAY</span>
            </div>

            <h2 className="text-xl font-bold font-orbitron tracking-wide text-white">
              THE CRUCIBLE TERMINAL
            </h2>
            <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto font-rajdhani">
              Enter your assigned encrypted access code to unlock student test room or evaluator console.
            </p>
          </div>

          {/* Role Mode Selector */}
          <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-950/90 rounded-2xl mb-5 border border-slate-800 relative z-10">
            <button
              type="button"
              onClick={() => {
                setActiveTab('candidate');
                setAccessCode('');
                setErrorMessage('');
              }}
              className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all uppercase tracking-wider font-orbitron ${
                activeTab === 'candidate'
                  ? 'bg-gradient-to-r from-cyan-600 to-cyan-500 text-slate-950 shadow-md cyber-glow-cyan'
                  : 'text-slate-400 hover:text-cyan-300 hover:bg-slate-900/50'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>Candidate</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('creator');
                setAccessCode('');
                setErrorMessage('');
              }}
              className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all uppercase tracking-wider font-orbitron ${
                activeTab === 'creator'
                  ? 'bg-gradient-to-r from-rose-600 to-rose-500 text-white shadow-md cyber-glow-rose'
                  : 'text-slate-400 hover:text-rose-300 hover:bg-slate-900/50'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Evaluator</span>
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4 relative z-10">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider font-cyber-mono flex items-center gap-1.5">
                  <Terminal className="w-3 h-3 text-cyan-400" />
                  <span>{activeTab === 'candidate' ? 'Candidate Security Code' : 'Creator Master Key'}</span>
                </label>
                <span className="text-[10px] text-slate-500 font-cyber-mono">ENCRYPTED</span>
              </div>

              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={accessCode}
                  onChange={(e) => {
                    setAccessCode(e.target.value);
                    setErrorMessage('');
                  }}
                  placeholder="Enter confidential access code..."
                  className="w-full pl-4 pr-11 py-3 rounded-2xl bg-slate-950 border border-cyan-500/40 text-cyan-300 placeholder:text-slate-600 text-sm font-cyber-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-cyan-400/40 focus:border-cyan-400 transition-all"
                  autoFocus
                />

                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3.5 text-slate-400 hover:text-cyan-300 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Quick 1-Click Code Autofill Presets */}
            <div className="flex items-center gap-2 pt-1">
              <span className="text-[10px] text-slate-400 font-cyber-mono">PRESETS:</span>
              {activeTab === 'candidate' ? (
                <button
                  type="button"
                  onClick={() => setAccessCode('CANDIDATE-2025')}
                  className="px-2.5 py-1 rounded-lg bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-500/40 text-cyan-300 font-cyber-mono text-[11px] font-bold transition-all"
                >
                  CANDIDATE-2025
                </button>
              ) : (
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setAccessCode('CREATOR-2025')}
                    className="px-2.5 py-1 rounded-lg bg-rose-950/80 hover:bg-rose-900 border border-rose-500/40 text-rose-300 font-cyber-mono text-[11px] font-bold transition-all"
                  >
                    CREATOR-2025
                  </button>
                  <button
                    type="button"
                    onClick={() => setAccessCode('bhavakanth1047@gmail.com')}
                    className="px-2.5 py-1 rounded-lg bg-indigo-950/80 hover:bg-indigo-900 border border-indigo-500/40 text-indigo-300 font-cyber-mono text-[11px] font-bold transition-all"
                  >
                    bhavakanth1047@gmail.com
                  </button>
                </div>
              )}
            </div>

            {/* Error Feedback */}
            {errorMessage && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 text-xs text-rose-400 bg-rose-950/60 p-3 rounded-xl border border-rose-500/40 font-rajdhani"
              >
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{errorMessage}</span>
              </motion.div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className={`w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-2xl font-orbitron font-bold text-xs uppercase tracking-widest transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 shadow-lg ${
                activeTab === 'candidate'
                  ? 'bg-gradient-to-r from-cyan-500 via-cyan-400 to-blue-500 text-slate-950 cyber-glow-cyan hover:from-cyan-400 hover:to-blue-400'
                  : 'bg-gradient-to-r from-rose-500 via-rose-600 to-indigo-600 text-white cyber-glow-rose hover:from-rose-400 hover:to-indigo-500'
              }`}
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin"></span>
                  <span>Verifying Clearance...</span>
                </span>
              ) : (
                <>
                  <span>Authenticate & Unlock</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Security Telemetry Footer */}
          <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500 font-cyber-mono relative z-10">
            <span className="flex items-center gap-1">
              <Lock className="w-3 h-3 text-cyan-400" />
              <span>TLS-256 AES GATE</span>
            </span>
            <span className="text-slate-400">TN SCERT CS PROTOCOL</span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
