import { useEffect, useRef, useState } from 'react';
import { ApiError, profileRequest as request } from './client';
import type { Profile } from './profile-policy';

type Saved = { id: string; name: string; version: number };
export type OwnerPublication = {
  id: string;
  slug: string;
  sourceCircuitId: string;
  title: string;
  description: string;
  tags: string[];
  allowForks: boolean;
  revision: number;
  versionNumber: number;
  currentVersionId: string;
  status: string;
  moderation: string;
};
type Detail = {
  publication: OwnerPublication;
  versions: {
    id: string;
    versionNumber: number;
    title: string;
    createdAt: number;
    fingerprint: string;
  }[];
};
export function PublicationSettings() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [circuits, setCircuits] = useState<Saved[]>([]);
  const [items, setItems] = useState<OwnerPublication[]>([]);
  const [source, setSource] = useState('');
  const [saved, setSaved] = useState<Saved | null>(null);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [allowForks, setAllowForks] = useState(true);
  const [status, setStatus] = useState('loading');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [conflict, setConflict] = useState(false);
  const epoch = useRef(0);
  const writing = useRef(false);
  const account = useRef<string | null>(null);
  const selection = useRef(0);
  function clear() {
    setProfile(null);
    setCircuits([]);
    setItems([]);
    setDetail(null);
    setSaved(null);
    setSource('');
    setTitle('');
    setDescription('');
    setTags('');
    setNotice('');
    selection.current++;
  }
  function fail(cause: unknown) {
    setError(cause instanceof Error ? cause.message : 'Publishing unavailable; try again');
    if (cause instanceof ApiError && cause.status === 409) setConflict(true);
    if (
      cause instanceof TypeError ||
      (cause instanceof ApiError &&
        (cause.status === 401 || cause.status === 403 || cause.status >= 500))
    ) {
      epoch.current++;
      account.current = null;
      clear();
      setStatus(cause instanceof ApiError && cause.status === 401 ? 'login' : 'error');
    }
  }
  async function load() {
    const token = ++epoch.current;
    clear();
    setStatus('loading');
    setError('');
    setConflict(false);
    try {
      const p = await request<{ profile: Profile }>('me/profile');
      const [list, publications] = await Promise.all([
        request<{ items: Saved[] }>('circuits?limit=100'),
        request<{ items: OwnerPublication[] }>('me/publications?limit=100'),
      ]);
      if (token !== epoch.current) return;
      account.current = p.profile.userId;
      setProfile(p.profile);
      setCircuits(list.items);
      setItems(publications.items);
      setStatus('ready');
      const initial = new URLSearchParams(location.search).get('source');
      if (initial && list.items.some((item) => item.id === initial))
        await choose(initial, list.items, publications.items, p.profile);
    } catch (cause) {
      if (token === epoch.current) fail(cause);
    }
  }
  async function choose(id: string, list = circuits, publications = items, p = profile) {
    const generation = ++selection.current;
    const token = epoch.current;
    setSource(id);
    setDetail(null);
    setSaved(null);
    setError('');
    setNotice('');
    setConflict(false);
    let existing = publications.find((item) => item.sourceCircuitId === id);
    const circuit = list.find((item) => item.id === id);
    if (!circuit && !existing) return;
    setTitle(circuit?.name ?? existing!.title);
    setDescription('');
    setTags('');
    setAllowForks(p?.allowForks ?? true);
    try {
      const fresh = await request<{ items: OwnerPublication[] }>(
        `me/publications?sourceCircuitId=${encodeURIComponent(id)}&limit=1`,
      );
      if (token !== epoch.current || generation !== selection.current) return;
      existing = fresh.items[0];
      // Capture a fresh saved revision; the drawing currently open in the editor is irrelevant.
      const [current, d] = await Promise.all([
        circuit
          ? request<Saved>(`circuits/${encodeURIComponent(id)}`)
          : Promise.resolve({ id, name: existing!.title, version: 0 }),
        existing
          ? request<Detail>(`me/publications/${encodeURIComponent(existing.id)}`)
          : Promise.resolve(null),
      ]);
      if (token !== epoch.current || generation !== selection.current) return;
      setSaved({ id: current.id, name: current.name, version: current.version });
      if (d) {
        setDetail(d);
        setTitle(d.publication.title);
        setDescription(d.publication.description);
        setTags(d.publication.tags.join(', '));
        setAllowForks(d.publication.allowForks);
      }
    } catch (cause) {
      if (token === epoch.current && generation === selection.current) fail(cause);
    }
  }
  // These initialization callbacks use setters and refs; selection data is supplied explicitly.
  // biome-ignore lint/correctness/useExhaustiveDependencies: mount lifecycle must not restart on each field edit
  useEffect(() => {
    void load();
    const recheck = async () => {
      if (writing.current || !account.current) return;
      const token = epoch.current;
      try {
        const p = await request<{ profile: Profile }>('me/profile');
        if (token === epoch.current && p.profile.userId !== account.current) await load();
      } catch (cause) {
        if (token === epoch.current) fail(cause);
      }
    };
    window.addEventListener('focus', recheck);
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') void recheck();
    }, 30000);
    return () => {
      epoch.current++;
      selection.current++;
      window.removeEventListener('focus', recheck);
      clearInterval(timer);
    };
  }, []);
  async function change(action: 'publish' | 'unpublish' | 'delete') {
    if (writing.current || conflict || !saved) return;
    const p = detail?.publication;
    if (action !== 'publish' && !p) return;
    if (
      action === 'delete' &&
      !window.confirm(
        'Remove this publication permanently? Its slug and versions will remain unavailable as a tombstone.',
      )
    )
      return;
    if (
      action === 'publish' &&
      !window.confirm(
        `Publish saved circuit version ${saved.version}? Its components, labels and wiring will be public. Unsaved drawing changes are excluded.`,
      )
    )
      return;
    const token = epoch.current;
    writing.current = true;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const path =
        action === 'publish'
          ? `community/publications${p ? `/${encodeURIComponent(p.id)}` : ''}`
          : `community/publications/${encodeURIComponent(p!.id)}${action === 'unpublish' ? '/unpublish' : ''}`;
      const body =
        action === 'publish'
          ? {
              sourceCircuitId: saved.id,
              sourceVersion: saved.version,
              ...(p ? { revision: p.revision } : {}),
              title,
              description,
              tags: tags.trim() ? tags.split(',').map((t) => t.trim()) : [],
              allowForks,
            }
          : { revision: p!.revision };
      const result = await request<{ publication: OwnerPublication }>(
        path,
        action === 'publish' ? (p ? 'PATCH' : 'POST') : action === 'delete' ? 'DELETE' : 'POST',
        body,
      );
      const d = await request<Detail>(
        `me/publications/${encodeURIComponent(result.publication.id)}`,
      );
      if (token !== epoch.current) return;
      if (
        d.publication.revision !== result.publication.revision ||
        d.publication.currentVersionId !== result.publication.currentVersionId
      )
        throw new ApiError(
          409,
          'Publication changed after this save. Reload and review the current snapshot.',
        );
      setDetail(d);
      setItems((previous) => [
        d.publication,
        ...previous.filter((item) => item.id !== d.publication.id),
      ]);
      setNotice(
        action === 'publish'
          ? `Published version ${d.publication.versionNumber}.${d.publication.moderation === 'hidden' ? ' It is held for staff review.' : ''}`
          : action === 'unpublish'
            ? 'Publication unpublished. All versions are unavailable publicly.'
            : 'Publication removed. Tombstone retained.',
      );
    } catch (cause) {
      if (token === epoch.current) fail(cause);
    } finally {
      writing.current = false;
      setBusy(false);
    }
  }
  const terminal =
    detail?.publication.status === 'deleted' || detail?.publication.moderation === 'removed';
  return (
    <>
      <a className="skip" href="#main">
        Skip to content
      </a>
      <header className="site-header">
        <a className="brand" href="/">
          ϟ ElectraSim
        </a>
        <nav aria-label="Account">
          <a href="/settings/profile/">Profile & privacy</a>
          <a href="/app/">Open simulator ↗</a>
        </nav>
      </header>
      <main id="main" className="publication-settings">
        <div className="page-heading">
          <span className="eyebrow">COMMUNITY / PUBLISHING</span>
          <h1>Share a saved circuit.</h1>
          <p>Publish a fixed copy. Keep developing your private circuit at your own pace.</p>
        </div>
        {error && (
          <p role="alert" className="note">
            {error}
          </p>
        )}
        {notice && <output className="note">{notice}</output>}
        {status === 'loading' && <output>Loading your circuits…</output>}
        {status === 'login' && (
          <section className="panel panel-body">
            <h2>Sign in to publish</h2>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                const form = new FormData(event.currentTarget);
                setBusy(true);
                void request('auth/sign-in/email', 'POST', {
                  email: String(form.get('email')),
                  password: String(form.get('password')),
                })
                  .then(load)
                  .catch(fail)
                  .finally(() => setBusy(false));
              }}
            >
              <label>
                Email
                <input name="email" type="email" autoComplete="username" required />
              </label>
              <label>
                Password
                <input name="password" type="password" autoComplete="current-password" required />
              </label>
              <button className="btn primary" disabled={busy}>
                Sign in
              </button>
            </form>
          </section>
        )}
        {status === 'error' && (
          <button className="btn" onClick={() => void load()}>
            Try again
          </button>
        )}
        {status === 'ready' && profile && (
          <>
            {(profile.visibility !== 'public' || profile.moderation !== 'visible') && (
              <p className="note">
                Published circuits are public even while your profile is private or unavailable.
                Author attribution will read “Community member”.
              </p>
            )}
            {!profile.handle && (
              <p className="note">
                Choose your community handle in <a href="/settings/profile/">Profile & privacy</a>{' '}
                before publishing.
              </p>
            )}
            <section className="panel panel-body">
              <label>
                Saved circuit
                <select
                  aria-label="Saved circuit"
                  value={source}
                  disabled={busy}
                  onChange={(e) => void choose(e.target.value)}
                >
                  <option value="">Choose a saved circuit</option>
                  {circuits.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                  {items
                    .filter((p) => !circuits.some((c) => c.id === p.sourceCircuitId))
                    .map((p) => (
                      <option key={p.id} value={p.sourceCircuitId}>
                        {p.title} (source deleted)
                      </option>
                    ))}
                </select>
              </label>
              {circuits.length === 0 && items.length === 0 && (
                <p>No saved circuits yet. Save one in the simulator to begin.</p>
              )}
              {source && !saved && !error && <output>Loading saved version…</output>}
              {saved && (
                <>
                  <p className="note">
                    {saved.version
                      ? `Publishing saved circuit version ${saved.version}. Unsaved editor changes stay private. Review labels and circuit content before sharing.`
                      : 'The private source circuit was deleted. You can still withdraw this publication and review its snapshot history.'}
                  </p>
                  {detail && (
                    <p>
                      Publication: <strong>{detail.publication.status}</strong> · Moderation:{' '}
                      <strong>{detail.publication.moderation}</strong> · Public version{' '}
                      {detail.publication.versionNumber}
                    </p>
                  )}
                  {detail?.publication.status === 'published' &&
                    detail.publication.moderation === 'visible' && (
                      <p>
                        <a href={`/c/${detail.publication.slug}`}>View published circuit ↗</a>
                      </p>
                    )}
                  {detail?.publication.moderation === 'hidden' && (
                    <p className="note">
                      Hidden by community policy or staff. Publishing an update cannot restore
                      visibility.
                    </p>
                  )}
                  {terminal ? (
                    <p className="note">
                      This publication is permanently removed. Its slug and snapshot history are
                      retained.
                    </p>
                  ) : (
                    !!saved.version && (
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          void change('publish');
                        }}
                      >
                        <fieldset disabled={busy || conflict}>
                          <label>
                            Publication title
                            <input
                              value={title}
                              required
                              maxLength={160}
                              onChange={(e) => setTitle(e.target.value)}
                            />
                          </label>
                          <label>
                            Description
                            <textarea
                              value={description}
                              maxLength={2000}
                              rows={4}
                              onChange={(e) => setDescription(e.target.value)}
                            />
                          </label>
                          <label>
                            Tags
                            <input
                              aria-label="Tags"
                              value={tags}
                              maxLength={206}
                              placeholder="lighting, learning"
                              onChange={(e) => setTags(e.target.value)}
                            />
                            <small>
                              Up to 8 tags, separated by commas. Use 2–24 letters, numbers or
                              hyphens.
                            </small>
                          </label>
                          <label className="check">
                            <input
                              type="checkbox"
                              checked={allowForks}
                              onChange={(e) => setAllowForks(e.target.checked)}
                            />
                            Allow forks when community forking becomes available
                          </label>
                          <p className="note">
                            Publishing records a snapshot; it does not certify electrical safety or
                            run a fresh assessment.
                          </p>
                          <button className="btn primary" disabled={!profile.handle}>
                            {detail ? 'Publish new version' : 'Publish circuit'}
                          </button>
                        </fieldset>
                      </form>
                    )
                  )}
                  {detail && detail.publication.status !== 'deleted' && (
                    <div className="actions">
                      {detail.publication.status === 'published' && (
                        <button
                          className="btn"
                          disabled={busy || conflict}
                          onClick={() => void change('unpublish')}
                        >
                          Unpublish
                        </button>
                      )}
                      <button
                        className="btn"
                        disabled={busy || conflict}
                        onClick={() => void change('delete')}
                      >
                        Remove publication
                      </button>
                    </div>
                  )}
                  {conflict && (
                    <p className="note">
                      Reload and review the latest saved circuit and publication before trying
                      again.
                    </p>
                  )}
                  <button className="btn" disabled={busy} onClick={() => void choose(source)}>
                    Reload publication
                  </button>
                  {detail && (
                    <section>
                      <h2>Snapshot history</h2>
                      <p>
                        Each published version stays fixed. Public access follows the publication’s
                        current visibility.
                      </p>
                      <ol className="publication-history">
                        {detail.versions.map((v) => (
                          <li key={v.id}>
                            <strong>
                              Version {v.versionNumber}: {v.title}
                            </strong>
                            <span>{new Date(v.createdAt).toLocaleString()}</span>
                            <code>{v.fingerprint.slice(0, 16)}…</code>
                          </li>
                        ))}
                      </ol>
                    </section>
                  )}
                </>
              )}
            </section>
            {items.length > 0 && (
              <section className="panel panel-body">
                <h2>Your publications</h2>
                <div className="publication-cards">
                  {items.map((p) => (
                    <article key={p.id}>
                      <h3>{p.title}</h3>
                      <p>
                        {p.status} · {p.moderation} · v{p.versionNumber}
                      </p>
                      <button
                        className="btn"
                        disabled={busy}
                        onClick={() => void choose(p.sourceCircuitId)}
                      >
                        Manage {p.title}
                      </button>
                    </article>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </main>
    </>
  );
}
