/**
 * InspectorLogsView — event log tab. Moved verbatim from the
 * previous monolithic `Inspector.tsx`.
 */

import type React from 'react';
import { useState } from 'react';
import { useUiStore } from '../../../store';

export function InspectorLogsView() {
  const logs = useUiStore((s) => s.logs);
  const addLog = useUiStore((s) => s.addLog);
  const clearLogs = useUiStore((s) => s.clearLogs);

  const [cliInput, setCliInput] = useState('');

  const handleSendCommand = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cliInput.trim()) return;
    addLog(`> ${cliInput.trim()}`, 'info');
    setCliInput('');
  };

  return (
    <div className="p-3.5 space-y-3 text-xs flex flex-col h-full">
      <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800 pb-2">
        <span className="font-bold text-slate-800 dark:text-slate-200">System Logs</span>
        <button
          type="button"
          onClick={clearLogs}
          className="text-[10px] font-bold text-slate-400 hover:text-slate-600"
        >
          Clear
        </button>
      </div>

      <div className="flex-1 min-h-[220px] overflow-y-auto rounded-xl border border-slate-800 bg-slate-950 p-3 font-mono text-[11px] text-slate-200">
        {logs.length === 0 ? (
          <div className="text-slate-500 italic py-8 text-center">No logs recorded.</div>
        ) : (
          logs.map((l) => (
            <div key={l.id} className="py-0.5 border-b border-slate-900/60 last:border-0">
              <span className={l.type === 'error' ? 'text-red-400' : 'text-blue-300'}>
                {l.message}
              </span>
            </div>
          ))
        )}
      </div>

      <form onSubmit={handleSendCommand} className="flex items-center gap-1.5 pt-1">
        <input
          type="text"
          value={cliInput}
          onChange={(e) => setCliInput(e.target.value)}
          placeholder="Command..."
          className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
        />
        <button
          type="submit"
          className="rounded-xl bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white"
        >
          Send
        </button>
      </form>
    </div>
  );
}
