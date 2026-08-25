import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Database,
  Copy,
  Check,
  X,
  ExternalLink,
  ShieldCheck,
  Terminal,
  KeyRound,
  Layers,
  Sparkles,
  Info
} from 'lucide-react';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../lib/supabase';

interface SupabaseSqlModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SupabaseSqlModal: React.FC<SupabaseSqlModalProps> = ({ isOpen, onClose }) => {
  const [copiedSql, setCopiedSql] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedCleanSql, setCopiedCleanSql] = useState(false);
  const [activeTab, setActiveTab] = useState<'sql' | 'credentials' | 'guide'>('sql');

  const sqlScript = `-- =========================================================================
-- THE CRUCIBLE // EVALPULSE - SUPABASE DATABASE INITIALIZATION SCRIPT
-- Run this in your Supabase SQL Editor: https://supabase.com/dashboard/project/_/sql
-- =========================================================================

-- 1. Create the 'candidates' table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.candidates (
    id TEXT PRIMARY KEY,
    candidate_code TEXT DEFAULT 'CANDIDATE-2025',
    full_name TEXT NOT NULL DEFAULT 'Candidate',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Safely add any missing columns (fixes ERROR 42703 if table already existed)
ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS candidate_code TEXT DEFAULT 'CANDIDATE-2025';
ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS full_name TEXT DEFAULT 'Candidate';
ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS email TEXT DEFAULT '';
ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS phone TEXT DEFAULT '';
ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'Full Stack Developer';
ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS school_name TEXT DEFAULT '';
ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS standard TEXT DEFAULT '';
ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS github_profile TEXT DEFAULT '';
ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'submitted';
ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS score NUMERIC DEFAULT NULL;
ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS grade TEXT DEFAULT NULL;
ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS badge TEXT DEFAULT NULL;
ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS evaluator_feedback TEXT DEFAULT NULL;
ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS evaluator_name TEXT DEFAULT NULL;
ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS evaluated_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT TRUE;
ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS time_spent_seconds INTEGER DEFAULT 1800;
ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS answers JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS evaluation JSONB DEFAULT NULL;
ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS details JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS raw_data JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.candidates ENABLE ROW LEVEL SECURITY;

-- 4. Create Public Security Policies for Read / Insert / Update across all devices
DROP POLICY IF EXISTS "Allow public read candidates" ON public.candidates;
CREATE POLICY "Allow public read candidates" 
ON public.candidates 
FOR SELECT 
USING (true);

DROP POLICY IF EXISTS "Allow public insert candidates" ON public.candidates;
CREATE POLICY "Allow public insert candidates" 
ON public.candidates 
FOR INSERT 
WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public update candidates" ON public.candidates;
CREATE POLICY "Allow public update candidates" 
ON public.candidates 
FOR UPDATE 
USING (true) 
WITH CHECK (true);

-- 5. Enable Realtime Replication for instant multi-device sync
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'candidates'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.candidates;
  END IF;
END $$;

-- 6. Query and verify all columns in SQL Editor:
SELECT 
    id, 
    full_name, 
    email, 
    score, 
    grade, 
    status, 
    updated_at 
FROM public.candidates 
ORDER BY updated_at DESC;`;

  const cleanRecreateSql = `-- CLEAN RESET & RECREATE SCRIPT (Deletes existing table and builds fresh schema)
DROP TABLE IF EXISTS public.candidates CASCADE;

CREATE TABLE public.candidates (
    id TEXT PRIMARY KEY,
    candidate_code TEXT DEFAULT 'CANDIDATE-2025',
    full_name TEXT NOT NULL,
    email TEXT DEFAULT '',
    phone TEXT DEFAULT '',
    role TEXT DEFAULT 'Full Stack Developer',
    school_name TEXT DEFAULT '',
    standard TEXT DEFAULT '',
    github_profile TEXT DEFAULT '',
    status TEXT DEFAULT 'submitted',
    score NUMERIC DEFAULT NULL,
    grade TEXT DEFAULT NULL,
    badge TEXT DEFAULT NULL,
    evaluator_feedback TEXT DEFAULT NULL,
    evaluator_name TEXT DEFAULT NULL,
    evaluated_at TIMESTAMPTZ DEFAULT NULL,
    is_published BOOLEAN DEFAULT TRUE,
    time_spent_seconds INTEGER DEFAULT 1800,
    answers JSONB DEFAULT '[]'::jsonb,
    evaluation JSONB DEFAULT NULL,
    details JSONB DEFAULT '{}'::jsonb,
    raw_data JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.candidates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read candidates" ON public.candidates FOR SELECT USING (true);
CREATE POLICY "Allow public insert candidates" ON public.candidates FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update candidates" ON public.candidates FOR UPDATE USING (true) WITH CHECK (true);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'candidates'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.candidates;
  END IF;
END $$;

SELECT id, full_name, email, score, grade, status, updated_at FROM public.candidates;`;

  const copyToClipboard = (text: string, setter: (val: boolean) => void) => {
    navigator.clipboard.writeText(text);
    setter(true);
    setTimeout(() => setter(false), 2000);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-md"
          />

          {/* Modal Card */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            className="relative w-full max-w-3xl bg-slate-900 border border-cyan-500/30 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] z-10"
          >
            {/* Modal Header */}
            <div className="p-4 sm:p-6 border-b border-cyan-500/20 bg-slate-950/60 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-cyan-600 flex items-center justify-center text-white shadow-md">
                  <Database className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-orbitron font-bold text-base sm:text-lg text-white">
                    Supabase Cloud Database & SQL Editor Source
                  </h3>
                  <p className="text-xs text-slate-400 font-rajdhani">
                    Universal Multi-Device Synchronization & Persistent SQL Storage
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tab Bar */}
            <div className="px-6 pt-3 border-b border-slate-800 bg-slate-950/40 flex gap-2">
              <button
                onClick={() => setActiveTab('sql')}
                className={`px-4 py-2 rounded-t-xl text-xs font-orbitron font-bold uppercase transition-colors border-b-2 ${
                  activeTab === 'sql'
                    ? 'border-cyan-400 text-cyan-300 bg-slate-900'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                SQL Editor Script
              </button>
              <button
                onClick={() => setActiveTab('credentials')}
                className={`px-4 py-2 rounded-t-xl text-xs font-orbitron font-bold uppercase transition-colors border-b-2 ${
                  activeTab === 'credentials'
                    ? 'border-cyan-400 text-cyan-300 bg-slate-900'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                URL & Anon Key Guide
              </button>
              <button
                onClick={() => setActiveTab('guide')}
                className={`px-4 py-2 rounded-t-xl text-xs font-orbitron font-bold uppercase transition-colors border-b-2 ${
                  activeTab === 'guide'
                    ? 'border-cyan-400 text-cyan-300 bg-slate-900'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                Multi-Device Sync Guide
              </button>
            </div>

            {/* Tab Contents */}
            <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4">
              {activeTab === 'sql' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <Terminal className="w-4 h-4 text-emerald-400" />
                      <span className="text-xs font-cyber-mono font-bold text-slate-200">
                        PostgreSQL Schema & Realtime Setup (Safe Migration)
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => copyToClipboard(cleanRecreateSql, setCopiedCleanSql)}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-cyber-mono text-[11px] border border-slate-700 transition-all active:scale-95"
                        title="Deletes existing candidates table and creates fresh structure"
                      >
                        {copiedCleanSql ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedCleanSql ? 'Copied Clean SQL' : 'Copy Clean Reset SQL'}</span>
                      </button>
                      <button
                        onClick={() => copyToClipboard(sqlScript, setCopiedSql)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-orbitron font-bold text-xs shadow-md transition-all active:scale-95"
                      >
                        {copiedSql ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedSql ? 'COPIED TO CLIPBOARD' : 'COPY SAFE SQL SCRIPT'}</span>
                      </button>
                    </div>
                  </div>

                  <div className="relative rounded-xl overflow-hidden border border-slate-700 bg-slate-950">
                    <pre className="p-4 text-xs font-cyber-mono text-emerald-300 overflow-x-auto leading-relaxed max-h-80">
                      {sqlScript}
                    </pre>
                  </div>

                  <div className="p-3.5 rounded-xl bg-cyan-950/40 border border-cyan-500/30 text-xs text-slate-300 font-rajdhani flex items-start gap-2.5">
                    <Info className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-cyan-200">How to execute in Supabase:</p>
                      <ol className="list-decimal ml-4 mt-1 space-y-1 text-slate-300">
                        <li>Log in to your <a href="https://supabase.com/dashboard" target="_blank" rel="noreferrer" className="text-cyan-400 underline inline-flex items-center gap-1">Supabase Dashboard <ExternalLink className="w-3 h-3" /></a></li>
                        <li>Click on your Project &rarr; Select <strong>SQL Editor</strong> on the left navigation bar.</li>
                        <li>Click <strong>New query</strong>, paste the script above, and click <strong>Run</strong>.</li>
                        <li>All candidate submissions, scores, and evaluations will be persistently saved and viewable!</li>
                      </ol>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'credentials' && (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-slate-950 border border-cyan-500/20 space-y-3">
                    <h4 className="font-orbitron font-bold text-sm text-cyan-300 flex items-center gap-2">
                      <KeyRound className="w-4 h-4 text-cyan-400" />
                      <span>How to obtain Vite Supabase URL & Anon Key</span>
                    </h4>
                    <p className="text-xs text-slate-300 font-rajdhani leading-relaxed">
                      Follow these 3 easy steps in your Supabase project dashboard:
                    </p>
                    
                    <div className="space-y-2 text-xs font-rajdhani text-slate-200">
                      <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                        <strong className="text-cyan-400">Step 1:</strong> Go to <a href="https://supabase.com/dashboard" target="_blank" rel="noreferrer" className="text-cyan-300 underline">supabase.com/dashboard</a> and open your project.
                      </div>
                      <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                        <strong className="text-cyan-400">Step 2:</strong> In the bottom left settings gear icon, click <strong>Project Settings</strong> &rarr; click <strong>API</strong>.
                      </div>
                      <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                        <strong className="text-cyan-400">Step 3:</strong> Copy the two values:
                        <ul className="list-disc ml-5 mt-1 space-y-1 text-slate-300">
                          <li><strong>Project URL</strong> (e.g. <code className="text-cyan-300 font-cyber-mono">https://bgiejmsrrajbqjltvmrd.supabase.co</code>) &rarr; set as <code className="text-cyan-300 font-cyber-mono">VITE_SUPABASE_URL</code></li>
                          <li><strong>Project API keys (anon / public)</strong> (e.g. <code className="text-cyan-300 font-cyber-mono">sb_publishable_...</code>) &rarr; set as <code className="text-cyan-300 font-cyber-mono">VITE_SUPABASE_ANON_KEY</code></li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* Active App Credentials Preview */}
                  <div className="space-y-3">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-cyber-mono font-bold text-slate-300">VITE_SUPABASE_URL</label>
                        <button
                          onClick={() => copyToClipboard(SUPABASE_URL, setCopiedUrl)}
                          className="text-[11px] font-cyber-mono text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                        >
                          {copiedUrl ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                          <span>{copiedUrl ? 'Copied' : 'Copy'}</span>
                        </button>
                      </div>
                      <input
                        type="text"
                        readOnly
                        value={SUPABASE_URL}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-cyber-mono text-cyan-300 focus:outline-none"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-cyber-mono font-bold text-slate-300">VITE_SUPABASE_ANON_KEY</label>
                        <button
                          onClick={() => copyToClipboard(SUPABASE_ANON_KEY, setCopiedKey)}
                          className="text-[11px] font-cyber-mono text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                        >
                          {copiedKey ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                          <span>{copiedKey ? 'Copied' : 'Copy'}</span>
                        </button>
                      </div>
                      <input
                        type="text"
                        readOnly
                        value={SUPABASE_ANON_KEY}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-cyber-mono text-cyan-300 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'guide' && (
                <div className="space-y-3 text-xs font-rajdhani text-slate-300 leading-relaxed">
                  <div className="p-4 rounded-xl bg-slate-950 border border-cyan-500/20 space-y-2">
                    <h4 className="font-orbitron font-bold text-sm text-cyan-300">
                      Why was there a difference between devices (4 vs 8 responses)?
                    </h4>
                    <p>
                      In single-device testing, responses submitted on your phone were initially stored in your phone browser&apos;s local cache (plus temporary Realtime broadcast). If another device opened later, it only loaded the 4 sample responses seeded on that device.
                    </p>
                    <p className="text-emerald-300 font-semibold">
                      Fix Applied: We added universal Supabase database table querying and automatic upserting! Now every submission and evaluation is written to both Supabase cloud database AND broadcasted across all devices, ensuring 100% exact parity across phones, laptops, and desktop computers!
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 sm:p-6 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between">
              <span className="text-xs font-cyber-mono text-slate-400">
                The Crucible // Database Layer
              </span>
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-orbitron font-bold text-xs uppercase transition-colors"
              >
                Done
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
