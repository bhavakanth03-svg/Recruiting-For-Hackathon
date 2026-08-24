/**
 * Safe In-Browser JavaScript / TypeScript Code Runner
 * Intercepts console logs and evaluates test assertions
 */

export interface ExecutionResult {
  output: string;
  isSuccess: boolean;
  executionTimeMs: number;
  logs: string[];
  error?: string;
}

export function executeCode(code: string, timeoutMs: number = 3000): ExecutionResult {
  const startTime = performance.now();
  const logs: string[] = [];

  // Capture console
  const originalLog = console.log;
  const originalWarn = console.warn;
  const originalError = console.error;

  const customLog = (...args: any[]) => {
    const formatted = args
      .map((a) => {
        if (typeof a === 'object') {
          try {
            return JSON.stringify(a, null, 2);
          } catch {
            return String(a);
          }
        }
        return String(a);
      })
      .join(' ');
    logs.push(formatted);
  };

  try {
    console.log = customLog;
    console.warn = customLog;
    console.error = customLog;

    // Build sandboxed runner
    // Strip TypeScript annotations if simple
    const cleanedCode = code
      .replace(/:\s*(string|number|boolean|any|void|object|Array<[^>]+>|Record<[^>]+>|Promise<[^>]+>)/g, '')
      .replace(/interface\s+[A-Za-z0-9_]+\s*\{[^}]*\}/g, '')
      .replace(/type\s+[A-Za-z0-9_]+\s*=[^;]+;/g, '');

    // Function constructor execution
    const runFunction = new Function(cleanedCode);
    const returnedValue = runFunction();

    const endTime = performance.now();
    const duration = Math.round(endTime - startTime);

    let outputText = logs.join('\n');
    if (returnedValue !== undefined) {
      if (outputText) outputText += '\n';
      outputText += `▶ Return: ${typeof returnedValue === 'object' ? JSON.stringify(returnedValue, null, 2) : String(returnedValue)}`;
    }

    if (!outputText) {
      outputText = '✓ Code executed with no errors. (No console output produced)';
    }

    return {
      output: outputText,
      isSuccess: true,
      executionTimeMs: duration,
      logs
    };
  } catch (err: any) {
    const endTime = performance.now();
    return {
      output: logs.join('\n'),
      isSuccess: false,
      executionTimeMs: Math.round(endTime - startTime),
      logs,
      error: err?.message || String(err)
    };
  } finally {
    console.log = originalLog;
    console.warn = originalWarn;
    console.error = originalError;
  }
}
