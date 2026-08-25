import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  Trophy,
  Medal,
  Search,
  Filter,
  Sparkles,
  Award,
  ArrowUpRight,
  Crown,
  Clock,
  School,
  Flame,
  RefreshCw,
  User,
  ShieldCheck,
  Zap,
  Play
} from 'lucide-react';
import { LeaderboardEntry } from '../types';

interface LeaderboardProps {
  entries: LeaderboardEntry[];
  onRefresh?: () => void;
  currentCandidateId?: string;
  isCreator?: boolean;
  onNavigate?: (view: any) => void;
}

export const Leaderboard: React.FC<LeaderboardProps> = ({
  entries,
  onRefresh,
  currentCandidateId,
  isCreator,
  onNavigate
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [standardFilter, setStandardFilter] = useState('all');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleManualRefresh = () => {
    setIsRefreshing(true);
    if (onRefresh) onRefresh();
    setTimeout(() => setIsRefreshing(false), 800);
  };

  const filteredEntries = entries.filter((entry) => {
    const roleText = entry.role || '';
    const schoolText = entry.schoolName || '';
    const nameText = entry.candidateName || '';
    const matchesSearch =
      nameText.toLowerCase().includes(searchQuery.toLowerCase()) ||
      schoolText.toLowerCase().includes(searchQuery.toLowerCase()) ||
      roleText.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;
    if (standardFilter !== 'all' && entry.standard && !entry.standard.includes(standardFilter)) {
      return false;
    }
    return true;
  });

  const topThree = filteredEntries.slice(0, 3);
  const myEntry = entries.find((e) => e.candidateId === currentCandidateId);

  return (
    <div className="w-full max-w-6xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-6 sm:space-y-8 flex-1">
      {/* 1. Header & Live Sync Controls */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left">
        <div>
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-rose-50 dark:bg-rose-950/60 border border-rose-200/50 dark:border-rose-800/50 text-rose-700 dark:text-rose-300 text-xs font-semibold mb-2">
            <Flame className="w-3.5 h-3.5 text-rose-500 animate-pulse" />
            <span>The Crucible • Tamil Nadu State Board CS Merit Rankings</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white font-orbitron">
            State Board CS Merit Leaderboard
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-xl font-rajdhani">
            Official candidate rankings across 11th & 12th Computer Science state curriculum evaluations updated dynamically in real time.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap justify-center">
          <button
            onClick={handleManualRefresh}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl text-xs font-semibold bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-800 text-slate-700 dark:text-slate-300 shadow-sm transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-indigo-500 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Refresh Live Rankings</span>
          </button>
        </div>
      </div>

      {/* Candidate Personal Ranking Alert Banner */}
      {myEntry && (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="p-4 rounded-3xl bg-gradient-to-r from-cyan-950/80 via-slate-900 to-indigo-950/80 border-2 border-cyan-400/60 shadow-xl shadow-cyan-950/30 flex flex-col sm:flex-row items-center justify-between gap-4 text-white"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 flex items-center justify-center font-orbitron font-black text-lg shadow-inner">
              #{myEntry.rank}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-cyan-300 font-cyber-mono">Your Verified Rank</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/20 text-cyan-200 border border-cyan-400/30">
                  {myEntry.badge || 'State Rank Gold'}
                </span>
              </div>
              <h3 className="font-bold text-base text-white">{myEntry.candidateName}</h3>
              <p className="text-xs text-slate-300 font-rajdhani">{myEntry.role || 'Full Stack Developer'} • Score: <strong className="text-cyan-300 font-mono">{myEntry.totalScore}/100</strong> (Grade: {myEntry.grade})</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onNavigate && (
              <button
                onClick={() => onNavigate('home')}
                className="px-4 py-2 rounded-2xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 text-xs font-orbitron font-bold uppercase transition-all shadow-md hover:scale-105"
              >
                View Candidate Home
              </button>
            )}
          </div>
        </motion.div>
      )}

      {/* 2. TOP 3 PODIUM */}
      {topThree.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 items-end">
          {/* #2 Rank (Silver) */}
          {topThree[1] && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="order-2 md:order-1 p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-lg shadow-slate-900/5 text-center relative overflow-hidden"
            >
              <div className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center font-bold text-sm mx-auto mb-2 border border-slate-200 dark:border-slate-700">
                #2
              </div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white truncate">
                {topThree[1].candidateName}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5 font-rajdhani">
                {topThree[1].role || topThree[1].schoolName || 'CS Candidate'}
              </p>
              <div className="mt-3 flex items-baseline justify-center gap-1">
                <span className="text-2xl font-black font-mono text-slate-800 dark:text-slate-200">
                  {topThree[1].totalScore}
                </span>
                <span className="text-xs text-slate-400">/ 100</span>
              </div>
              <div className="mt-2 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                🥈 {topThree[1].badge || 'Silver Scholar'}
              </div>
            </motion.div>
          )}

          {/* #1 Rank (Gold - Center & Elevated) */}
          {topThree[0] && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="order-1 md:order-2 p-6 rounded-3xl bg-gradient-to-b from-amber-500/10 via-white to-white dark:from-amber-500/10 dark:via-slate-900 dark:to-slate-900 border-2 border-amber-400/80 dark:border-amber-500/50 shadow-xl shadow-amber-500/10 text-center relative overflow-hidden md:-translate-y-2"
            >
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-400 text-white flex items-center justify-center font-black text-base mx-auto mb-2 shadow-md shadow-amber-500/30">
                <Crown className="w-6 h-6" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 font-cyber-mono">
                State Rank #1
              </span>
              <h3 className="font-extrabold text-lg text-slate-900 dark:text-white truncate mt-0.5 font-orbitron">
                {topThree[0].candidateName}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate font-rajdhani">
                {topThree[0].role || topThree[0].schoolName || 'CS Candidate'}
              </p>
              <div className="mt-3 flex items-baseline justify-center gap-1">
                <span className="text-3xl font-black font-mono text-amber-600 dark:text-amber-400">
                  {topThree[0].totalScore}
                </span>
                <span className="text-xs text-slate-400">/ 100 pts</span>
              </div>
              <div className="mt-2 inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                🏆 {topThree[0].badge || 'State Rank Gold'}
              </div>
            </motion.div>
          )}

          {/* #3 Rank (Bronze) */}
          {topThree[2] && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="order-3 p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-lg shadow-slate-900/5 text-center relative overflow-hidden"
            >
              <div className="w-10 h-10 rounded-2xl bg-amber-900/10 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 flex items-center justify-center font-bold text-sm mx-auto mb-2 border border-amber-800/20">
                #3
              </div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white truncate">
                {topThree[2].candidateName}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5 font-rajdhani">
                {topThree[2].role || topThree[2].schoolName || 'CS Candidate'}
              </p>
              <div className="mt-3 flex items-baseline justify-center gap-1">
                <span className="text-2xl font-black font-mono text-slate-800 dark:text-slate-200">
                  {topThree[2].totalScore}
                </span>
                <span className="text-xs text-slate-400">/ 100</span>
              </div>
              <div className="mt-2 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
                🥉 {topThree[2].badge || 'Bronze Scholar'}
              </div>
            </motion.div>
          )}
        </div>
      )}

      {/* 3. SEARCH & STANDARD FILTER */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3.5 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 shadow-sm">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search candidate name, school, or role..."
            className="w-full pl-10 pr-4 py-2 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 font-rajdhani"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={standardFilter}
            onChange={(e) => setStandardFilter(e.target.value)}
            className="px-3 py-2 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none font-rajdhani"
          >
            <option value="all">All Standards (11th & 12th)</option>
            <option value="12th">12th Standard CS</option>
            <option value="11th">11th Standard CS</option>
          </select>

          <div className="text-xs font-cyber-mono px-3 py-2 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
            {filteredEntries.length} Ranked
          </div>
        </div>
      </div>

      {/* 4. LEADERBOARD LIST TABLE */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 shadow-xl shadow-slate-900/5 dark:shadow-black/40 overflow-hidden">
        {filteredEntries.length === 0 ? (
          <div className="py-16 px-6 text-center space-y-4">
            <div className="w-14 h-14 rounded-3xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 flex items-center justify-center mx-auto text-2xl font-bold shadow-lg shadow-cyan-500/10">
              🏆
            </div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 font-orbitron">
              Leaderboard Ready for Submissions
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto font-rajdhani leading-relaxed">
              When candidates complete their 25 questions or evaluators grade submissions, ranks update automatically right here in real time.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              {onNavigate && (
                <button
                  onClick={() => onNavigate('assessment')}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-orbitron font-bold uppercase bg-gradient-to-r from-cyan-500 to-blue-500 text-slate-950 shadow-md cyber-glow-cyan hover:scale-105 transition-all"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Take Assessment Now</span>
                </button>
              )}
            </div>
          </div>
        ) : (
          <motion.div
            initial="hidden"
            animate="show"
            variants={{
              hidden: { opacity: 0 },
              show: {
                opacity: 1,
                transition: {
                  staggerChildren: 0.06,
                  delayChildren: 0.05
                }
              }
            }}
            className="divide-y divide-slate-200/80 dark:divide-slate-800/80"
          >
            {filteredEntries.map((entry, idx) => {
              const isMe = entry.candidateId === currentCandidateId;
              return (
                <motion.div
                  key={`leaderboard-entry-${entry.candidateId || idx}`}
                  variants={{
                    hidden: { opacity: 0, y: 18, scale: 0.98 },
                    show: {
                      opacity: 1,
                      y: 0,
                      scale: 1,
                      transition: {
                        duration: 0.35,
                        ease: [0.25, 1, 0.5, 1]
                      }
                    }
                  }}
                  whileHover={{ scale: 1.005, transition: { duration: 0.15 } }}
                  className={`p-4 sm:p-5 transition-colors flex items-center justify-between gap-4 ${
                    isMe
                      ? 'bg-cyan-500/10 border-l-4 border-l-cyan-400 dark:bg-cyan-950/30'
                      : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/40'
                  }`}
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 font-orbitron ${
                        entry.rank === 1
                          ? 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-300 shadow-sm shadow-amber-500/20'
                          : entry.rank === 2
                          ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300'
                          : entry.rank === 3
                          ? 'bg-amber-900/10 text-amber-800 dark:text-amber-300 border border-amber-800/20'
                          : 'bg-slate-50 dark:bg-slate-950 text-slate-500 border border-slate-200 dark:border-slate-800'
                      }`}
                    >
                      #{entry.rank}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white font-orbitron truncate">
                          {entry.candidateName}
                        </h4>
                        {isMe && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-400 text-slate-950 font-cyber-mono uppercase tracking-wider shadow-sm">
                            You
                          </span>
                        )}
                        {entry.badge && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/50 dark:border-indigo-800/50">
                            {entry.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-rajdhani truncate">
                        <span className="font-semibold text-cyan-500 dark:text-cyan-400">{entry.role || 'CS Candidate'}</span>
                        {entry.schoolName ? ` • ${entry.schoolName}` : ''}
                        {entry.standard ? ` (${entry.standard})` : ''}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 shrink-0">
                    <div className="text-right">
                      <span className="text-lg sm:text-xl font-black font-mono text-indigo-600 dark:text-cyan-400">
                        {entry.totalScore}
                      </span>
                      <span className="text-[10px] text-slate-400 ml-1 font-mono">/ 100</span>
                      <div className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 font-cyber-mono">
                        Grade: {entry.grade}
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </div>
    </div>
  );
};
