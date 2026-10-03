import { useEffect, useState } from 'react';
import { downloadText } from '../../lib/exportImport';
import { useCircuitLibraryStore } from '../../store/circuitLibraryStore';
import type { CircuitLibraryDocument } from '../../store/circuitLibraryStore';
import { recoveryCopies } from '../../store/circuitRecovery';
import { clearHistory, useCircuitStore } from '../../store/circuitStore';
import {
  apiJSON,
  invalidateAccess,
  refreshAccess,
  useSimulatorAccess,
} from '../../store/simulatorAccess';
import { useUiStore } from '../../store/uiStore';
const inputClass =
  'w-full rounded border border-slate-300 bg-transparent p-2 text-sm dark:border-slate-600';
export function CircuitLibrary() {
  const userId = useSimulatorAccess((s) => s.userId);
  const name = useCircuitLibraryStore((s) => s.name);
  const current = useCircuitLibraryStore((s) => s.current);
  const setOwner = useCircuitLibraryStore((s) => s.setOwner);
  const setName = useCircuitLibraryStore((s) => s.setName);
  const setCurrent = useCircuitLibraryStore((s) => s.setCurrent);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [items, setItems] = useState<CircuitLibraryDocument[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [backups, setBackups] = useState<{ key: string; json: string }[]>([]);
  const run = async (work: () => Promise<void>) => {
    if (busy) return;
    setBusy(true);
    setMessage('');
    try {
      await work();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Request failed');
    } finally {
      setBusy(false);
    }
  };
  const refresh = async () => {
    const list = await apiJSON<{ items: CircuitLibraryDocument[] }>('/circuits?limit=100');
    setItems(list.items);
  };
  useEffect(() => {
    setOwner(userId);
    setItems([]);
    if (userId)
      void apiJSON<{ items: CircuitLibraryDocument[] }>('/circuits?limit=100')
        .then((data) => setItems(data.items))
        .catch((e) => setMessage(e.message));
  }, [setOwner, userId]);
  useEffect(() => {
    void recoveryCopies()
      .then(setBackups)
      .catch(() => {});
  }, []);
  const login = async (signup: boolean) => {
    invalidateAccess();
    await apiJSON(signup ? '/auth/sign-up/email' : '/auth/sign-in/email', 'POST', {
      email,
      password,
      ...(signup ? { name: email.split('@')[0] } : {}),
    });
    setPassword('');
    await refreshAccess();
  };
  const save = async (update: boolean) => {
    const { components, wires, globalVoltage, supply, faults } = useCircuitStore.getState();
    const circuit = { components, wires, globalVoltage, supply, faults };
    const saved = await apiJSON<CircuitLibraryDocument>(
      update && current ? `/circuits/${current.id}` : '/circuits',
      update ? 'PATCH' : 'POST',
      { name, circuit, ...(update && current ? { version: current.version } : {}) },
    );
    setCurrent({ ...saved, circuit, readOnly: false });
    await refresh();
    setMessage('Circuit saved.');
  };
  return (
    <div className="space-y-3 text-sm">
      <p>Account circuits are stored by the local development server.</p>
      {message && <output className="block">{message}</output>}
      <fieldset disabled={busy} className="space-y-2 disabled:opacity-60">
        {!userId ? (
          <>
            <label className="block">
              Email
              <input
                className={inputClass}
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
            <label className="block">
              Password
              <input
                className={inputClass}
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>
            <button
              type="button"
              className="mr-4 underline"
              onClick={() => void run(() => login(false))}
            >
              Sign in
            </button>
            <button type="button" className="underline" onClick={() => void run(() => login(true))}>
              Create account
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              className="underline"
              onClick={() =>
                void run(async () => {
                  await apiJSON('/auth/sign-out', 'POST', {});
                  invalidateAccess();
                  useSimulatorAccess.setState({ userId: null });
                })
              }
            >
              Sign out
            </button>
            <label className="block">
              Circuit name
              <input
                className={inputClass}
                value={name}
                maxLength={160}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
            <button
              type="button"
              className="mr-4 underline"
              onClick={() => void run(() => save(false))}
            >
              Save new circuit
            </button>
            {current && (
              <button
                type="button"
                className="underline"
                onClick={() => void run(() => save(true))}
              >
                Update saved circuit
              </button>
            )}
            <button type="button" className="block underline" onClick={() => void run(refresh)}>
              Refresh list
            </button>
            {items.map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-2 border-t py-2">
                <span>
                  {item.name} · version {item.version}
                </span>
                <button
                  type="button"
                  className="underline"
                  onClick={() =>
                    void run(async () => {
                      const doc = await apiJSON<CircuitLibraryDocument>(`/circuits/${item.id}`);
                      useUiStore.getState().setSimRunning(false);
                      useCircuitStore.getState().setCircuit(doc.circuit);
                      clearHistory();
                      setCurrent(doc);
                      setName(doc.name);
                      setMessage(
                        doc.readOnly
                          ? 'Opened read-only. Export or create a basic copy to continue.'
                          : 'Circuit loaded.',
                      );
                    })
                  }
                >
                  Load
                </button>
                <button
                  type="button"
                  className="underline"
                  onClick={() =>
                    void run(async () => {
                      if (!window.confirm(`Delete saved circuit “${item.name}”?`)) return;
                      await apiJSON(`/circuits/${item.id}`, 'DELETE', { version: item.version });
                      if (current?.id === item.id) setCurrent(null);
                      await refresh();
                    })
                  }
                >
                  Delete
                </button>
              </div>
            ))}
          </>
        )}
      </fieldset>
      {backups.length > 0 && (
        <div>
          <p>Preserved originals</p>
          {backups.map((backup, i) => (
            <button
              key={backup.key}
              type="button"
              className="block underline"
              onClick={() =>
                downloadText(
                  backup.json,
                  `circuit-backup-${i + 1}.electrasim.json`,
                  'application/json',
                )
              }
            >
              Download original {i + 1}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
