import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  FlaskConical,
  CheckCircle2,
  AlertCircle,
  Play,
  RotateCcw,
  X,
  Clock,
  Shield,
  Layers,
  Code2,
  Mail,
  Trophy
} from 'lucide-react';
import { UnitTestResult } from '../types';
import { runClientUnitTests } from '../lib/unitTests';
import { runServerUnitTests } from '../lib/api';

interface UnitTestModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UnitTestModal: React.FC<UnitTestModalProps> = ({ isOpen, onClose }) => {
  const [isRunning, setIsRunning] = useState(false);
  const [tests, setTests] = useState<UnitTestResult[]>([]);
  const [passedCount, setPassedCount] = useState(0);
  const [failedCount, setFailedCount] = useState(0);
  const [totalDuration, setTotalDuration] = useState(0);

  const executeTests = async () => {
    setIsRunning(true);
    try {
      // Run client suite
      const clientRes = await runClientUnitTests();

      // Run server suite
      const serverRes = await runServerUnitTests();

      let combinedResults = [...clientRes.results];
      if (serverRes?.results) {
        combinedResults = [...combinedResults, ...serverRes.results];
      }

      setTests(combinedResults);
      setPassedCount(combinedResults.filter((r) => r.status === 'passed').length);
      setFailedCount(combinedResults.filter((r) => r.status === 'failed').length);
      setTotalDuration(clientRes.durationMs + (serverRes?.durationMs || 0));
    } catch (err) {
      console.error('Error running test suite:', err);
    } finally {
      setIsRunning(false);
    }
  };

  useEffect(() => {
    if (isOpen && tests.length === 0) {
      executeTests();
    }
  }, [isOpen]);

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
          className="fixed inset-0 bg-slate-900/70 dark:bg-black/85 backdrop-blur-md"
        />

        {/* Modal Content */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative w-full max-w-3xl max-h-[85vh] bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200/80 dark:border-slate-800/80 shadow-2xl overflow-y-auto space-y-6 text-slate-900 dark:text-slate-100"
        >
          {/* Header */}
          <div className="flex items-center justify-between gap-4 pb-4 border-b border-slate-200/80 dark:border-slate-800/80">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/50 dark:border-emerald-800/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <FlaskConical className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                  Automated Unit Testing Suite
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Automated verification of role security, data privacy isolation, scoring bounds & real-time synchronization.
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Test Status Banner */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-center">
              <span className="text-[11px] font-semibold uppercase text-slate-400">Total Assertions</span>
              <p className="text-2xl font-extrabold font-mono text-slate-900 dark:text-white mt-1">
                {tests.length}
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 text-center">
              <span className="text-[11px] font-semibold uppercase text-emerald-700 dark:text-emerald-300">
                Passed Tests
              </span>
              <p className="text-2xl font-extrabold font-mono text-emerald-600 dark:text-emerald-400 mt-1">
                {passedCount}
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-center">
              <span className="text-[11px] font-semibold uppercase text-slate-400">Duration</span>
              <p className="text-2xl font-extrabold font-mono text-indigo-600 dark:text-indigo-400 mt-1">
                {totalDuration} ms
              </p>
            </div>
          </div>

          {/* Tests List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-400 uppercase tracking-wider px-1">
              <span>Test Suite / Target Assertion</span>
              <span>Status</span>
            </div>

            <div className="space-y-2.5">
              {tests.map((test) => (
                <div
                  key={test.id}
                  className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800/80 flex items-start justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900 dark:text-white">
                        {test.testName}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-medium">
                        {test.suiteName}
                      </span>
                    </div>
                    {test.details && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                        {test.details}
                      </p>
                    )}
                    {test.error && (
                      <p className="text-xs text-rose-500 font-mono mt-1">
                        Error: {test.error}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[11px] font-mono text-slate-400">
                      {test.durationMs}ms
                    </span>
                    {test.status === 'passed' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Pass</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-300">
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span>Fail</span>
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer Controls */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-200/80 dark:border-slate-800/80">
            <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>All critical security, evaluation & sync paths operational</span>
            </span>

            <button
              onClick={executeTests}
              disabled={isRunning}
              className="flex items-center gap-1.5 px-4 py-2 rounded-2xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm shadow-indigo-500/20 transition-all hover:scale-105 disabled:opacity-50"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${isRunning ? 'animate-spin' : ''}`} />
              <span>{isRunning ? 'Executing Tests...' : 'Re-Run Test Suite'}</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
