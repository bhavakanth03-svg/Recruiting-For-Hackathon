import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Trophy, Medal, Search, Filter, Sparkles, Award, ArrowUpRight, Crown, Clock, School, Flame } from 'lucide-react';
import { LeaderboardEntry } from '../types';

interface LeaderboardProps {
  entries: LeaderboardEntry[];
  onRefresh?: () => void;
}

export const Leaderboard: React.FC<LeaderboardProps> = ({ entries, onRefresh }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [standardFilter, setStandardFilter] = useState('all');

  const filteredEntries = entries.filter((entry) => {
    const roleText = entry.role || entry.targetRole || '';
    const schoolText = entry.schoolName || '';
    const matchesSearch =
      entry.candidateName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      schoolText.toLowerCase().includes(searchQuery.toLowerCase()) ||
      roleText.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;
    if (standardFilter !== 'all' && entry.standard && !entry.standard.includes(standardFilter)) {
      return false;
    }
    return true;
  });

  const topThree = entries.slice(0, 3);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="text-center max-w-xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-rose-50 dark:bg-rose-950/60 border border-rose-200/50 dark:border-rose-800/50 text-rose-700 dark:text-rose-300 text-xs font-semibold mb-3">
          <Flame className="w-3.5 h-3.5 text-rose-500" />
          <span>The Crucible • Tamil Nadu State Board CS Rankings</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          State Board CS Merit Leaderboard
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
          Official candidate rankings across 11th & 12th Computer Science state curriculum evaluations updated in real time.
        </p>
      </div>

      {/* 1. TOP 3 PODIUM */}
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
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
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
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                State Rank #1
              </span>
              <h3 className="font-extrabold text-lg text-slate-900 dark:text-white truncate mt-0.5">
                {topThree[0].candidateName}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
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
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
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

      {/* 2. SEARCH & STANDARD FILTER */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3.5 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 shadow-sm">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search student name or school..."
            className="w-full pl-10 pr-4 py-2 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={standardFilter}
            onChange={(e) => setStandardFilter(e.target.value)}
            className="px-3 py-2 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none"
          >
            <option value="all">All Standards (11th & 12th)</option>
            <option value="12th">12th Standard CS</option>
            <option value="11th">11th Standard CS</option>
          </select>
        </div>
      </div>

      {/* 3. LEADERBOARD LIST TABLE */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 shadow-xl shadow-slate-900/5 dark:shadow-black/40 overflow-hidden">
        {filteredEntries.length === 0 ? (
          <div className="py-16 px-6 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 flex items-center justify-center mx-auto text-xl font-bold">
              🏆
            </div>
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-200 font-orbitron">
              Leaderboard Ready
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto font-rajdhani">
              No candidate submissions have been evaluated and published to the leaderboard yet. Complete the assessment to secure the #1 rank!
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-200/80 dark:divide-slate-800/80">
            {filteredEntries.map((entry) => (
              <div
                key={entry.candidateId}
                className="p-4 sm:p-5 hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-4">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                    entry.rank === 1
                      ? 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-300'
                      : entry.rank === 2
                      ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300'
                      : entry.rank === 3
                      ? 'bg-amber-900/10 text-amber-800 dark:text-amber-300'
                      : 'bg-slate-50 dark:bg-slate-950 text-slate-500'
                  }`}>
                    #{entry.rank}
                  </div>

                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                        {entry.candidateName}
                      </h4>
                      {entry.badge && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/50 dark:border-indigo-800/50">
                          {entry.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-rajdhani">
                      <span className="font-semibold text-cyan-400">{entry.role || 'CS Candidate'}</span>
                      {entry.schoolName ? ` • ${entry.schoolName}` : ''}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <span className="text-lg font-black font-mono text-indigo-600 dark:text-indigo-400">
                      {entry.totalScore}
                    </span>
                    <span className="text-[10px] text-slate-400 ml-1">/ 100</span>
                    <div className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                      Grade: {entry.grade}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
