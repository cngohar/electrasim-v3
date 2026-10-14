import type { LogEntry } from '@electrasim/domain';
import { Terminal, X } from 'lucide-react';
import { useState } from 'react';
import { useUiStore } from '../../store';
import { useSurfacePresence } from '../hooks/useSurfacePresence';

interface Props {
  isPhone: boolean;
  open: boolean;
  simRunning: boolean;
  logs: LogEntry[];
}

type Filter = 'all' | 'error' | 'warning' | 'info';
const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'error', label: 'Errors' },
  { value: 'warning', label: 'Warnings' },
  { value: 'info', label: 'Info' },
];

/** Console stays reachable independently of selection, including on phones. */
export function LogPanel({ isPhone, open, simRunning, logs }: Props) {
  const [filter, setFilter] = useState<Filter>('all');
  const presence = useSurfacePresence(open);
  const errors = logs.filter((entry) => entry.type === 'error').length;
  const warnings = logs.filter((entry) => entry.type === 'warning').length;
  const filtered = logs.filter(
    (entry) =>
      filter === 'all' || entry.type === filter || (filter === 'info' && entry.type === 'success'),
  );
  const setOpen = (next: boolean) => {
    if (next && isPhone) {
      const ui = useUiStore.getState();
      ui.setInspectorCollapsed(true);
      ui.setDiagnosisOpen(false);
      if (ui.activeGuideId) ui.setGuideHidden(true);
    }
    useUiStore.getState().setLogOpen(next);
  };

  return (
    <>
      <button
        type="button"
        className="table-console-trigger"
        title="Toggle console"
        aria-label="Console"
        aria-expanded={open}
        aria-controls="workspace-console"
        onClick={() => setOpen(!open)}
      >
        <Terminal size={17} aria-hidden="true" />
        <span>Console</span>
        {errors > 0 && <span className="table-count error">{errors} errors</span>}
        {warnings > 0 && <span className="table-count warning">{warnings} warnings</span>}
      </button>
      {presence.mounted && (
        <section
          id="workspace-console"
          aria-label="Console messages"
          data-workspace-console
          data-canvas-occluder
          data-surface-state={presence.exiting ? 'closing' : 'open'}
          inert={presence.exiting}
          className="table-console table-surface"
        >
          <header className="table-surface-heading">
            <h2>Console</h2>
            <button type="button" aria-label="Close Console" onClick={() => setOpen(false)}>
              <X size={18} />
            </button>
          </header>
          <div className="table-console-controls">
            <fieldset className="table-segments" aria-label="Console filters">
              {FILTERS.map((item) => (
                <button
                  type="button"
                  key={item.value}
                  aria-pressed={filter === item.value}
                  onClick={() => setFilter(item.value)}
                >
                  {item.label}
                </button>
              ))}
            </fieldset>
            <button type="button" onClick={() => useUiStore.getState().clearLogs()}>
              Clear
            </button>
          </div>
          <div className="table-console-messages" role="log" aria-live="polite">
            {filtered.length === 0 && <p>No messages in this view.</p>}
            {filtered.map((entry) => (
              <div key={entry.id} className="table-console-entry">
                <span className={`table-log-type ${entry.type}`}>{entry.type}</span>
                <span>{entry.message}</span>
              </div>
            ))}
          </div>
          <footer className="table-surface-footer">
            {simRunning ? 'Simulation running' : 'Simulation stopped'} · Clearing messages keeps
            circuit faults and event history.
          </footer>
        </section>
      )}
    </>
  );
}
