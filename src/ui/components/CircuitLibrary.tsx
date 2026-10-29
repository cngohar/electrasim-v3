import { importJSON } from '@electrasim/domain/circuitFormat';
import { useEffect, useState } from 'react';
import { downloadText } from '../../lib/exportImport';
import { sameDocument } from '../../store/circuitAccess';
import { useCircuitLibraryStore } from '../../store/circuitLibraryStore';
import type { CircuitLibraryDocument } from '../../store/circuitLibraryStore';
import { openCircuitDocument } from '../../store/circuitOpening';
import { recoveryCopies } from '../../store/circuitRecovery';
import { clearHistory, useCircuitStore } from '../../store/circuitStore';
import {
  accessGeneration,
  apiJSON,
  authorizeCircuit,
  invalidateAccess,
  receiptIsCurrent,
  refreshAccess,
  useSimulatorAccess,
} from '../../store/simulatorAccess';
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
    const generation = accessGeneration();
    const owner = useSimulatorAccess.getState().userId;
    const list = await apiJSON<{ items: CircuitLibraryDocument[] }>('/circuits?limit=100');
    if (generation === accessGeneration() && owner === useSimulatorAccess.getState().userId)
      setItems(list.items);
  };
  useEffect(() => {
    setOwner(userId);
    setItems([]);
    const generation = accessGeneration();
    let active = true;
    if (userId)
      void apiJSON<{ items: CircuitLibraryDocument[] }>('/circuits?limit=100')
        .then((data) => {
          if (
            active &&
            generation === accessGeneration() &&
            userId === useSimulatorAccess.getState().userId
          )
            setItems(data.items);
        })
        .catch((e) => {
          if (active && generation === accessGeneration()) setMessage(e.message);
        });
    return () => {
      active = false;
    };
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
    const before = useCircuitStore.getState();
    const owner = useSimulatorAccess.getState().userId;
    const selection = useCircuitLibraryStore.getState().current;
    const { components, wires, globalVoltage, supply, faults } = before;
    const circuit = { components, wires, globalVoltage, supply, faults };
    const receipt = await authorizeCircuit(circuit);
    const unchanged = () =>
      receiptIsCurrent(receipt) &&
      owner === useSimulatorAccess.getState().userId &&
      sameDocument(before, useCircuitStore.getState()) &&
      selection === useCircuitLibraryStore.getState().current;
    if (!unchanged()) throw new Error('Circuit or access changed; review before saving.');
    let saved: CircuitLibraryDocument;
    try {
      saved = await apiJSON<CircuitLibraryDocument>(
        update && current ? `/circuits/${current.id}` : '/circuits',
        update ? 'PATCH' : 'POST',
        { name, circuit, ...(update && current ? { version: current.version } : {}) },
      );
    } catch (error) {
      invalidateAccess();
      throw error;
    }
    if (!unchanged())
      throw new Error('Circuit or access changed while saving. Reload the list before continuing.');
    setCurrent({ ...saved, circuit, readOnly: false });
    await refresh();
    setMessage('Circuit saved.');
  };

  return (
    <div className="table-account space-y-3 text-sm">
      <p>Account circuits are stored by the local development server.</p>
      {message && <output className="block">{message}</output>}
      <fieldset disabled={busy} className="table-account-fields space-y-2 disabled:opacity-60">
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
            <a
              href="/settings/profile/"
              className="mr-4 underline"
              target="_blank"
              rel="noreferrer noopener"
            >
              Profile & privacy
            </a>
            <button
              type="button"
              className="underline"
              onClick={() =>
                void run(async () => {
                  invalidateAccess();
                  useSimulatorAccess.setState({ userId: null });
                  await apiJSON('/auth/sign-out', 'POST', {});
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
            <a
              className="block underline"
              href="/settings/publications/"
              target="_blank"
              rel="noreferrer noopener"
            >
              Your publications
            </a>
            <a
              className="block underline"
              href="/c/explore"
              target="_blank"
              rel="noreferrer noopener"
            >
              Explore community circuits
            </a>
            {items.map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-2 border-t py-2">
                <span>
                  {item.name} · version {item.version}
                </span>
                <a
                  className="underline"
                  href={`/settings/publications/?source=${encodeURIComponent(item.id)}`}
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  Publish
                </a>
                <button
                  type="button"
                  className="underline"
                  onClick={() =>
                    void run(async () => {
                      const generation = accessGeneration();
                      const before = useCircuitStore.getState();
                      const doc = await apiJSON<CircuitLibraryDocument>(`/circuits/${item.id}`);
                      if (
                        generation !== accessGeneration() ||
                        userId !== useSimulatorAccess.getState().userId ||
                        !sameDocument(before, useCircuitStore.getState())
                      )
                        throw new Error('Circuit or account changed while loading. Please retry.');
                      openCircuitDocument(doc.circuit);
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
            <div key={backup.key} className="flex gap-3">
              <button
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
              <button
                type="button"
                className="underline"
                disabled={busy}
                onClick={() =>
                  void run(async () => {
                    if (
                      !window.confirm(
                        'Open this preserved original? Export your current drawing first if you need it.',
                      )
                    )
                      return;
                    openCircuitDocument(importJSON(backup.json));
                    clearHistory();
                    setCurrent(null);
                    setMessage('Original opened. Editing and running require fresh access.');
                  })
                }
              >
                Open original {i + 1}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
