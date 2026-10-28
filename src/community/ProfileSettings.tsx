import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError, profileRequest, profileResponse } from './client';
import { handleProblem, initials, LEARNING_LEVELS, type Profile } from './profile-policy';
export function ProfileSettings() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [draft, setDraft] = useState<Profile | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'login' | 'denied' | 'error'>(
    'loading',
  );
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [conflict, setConflict] = useState(false);
  const [claim, setClaim] = useState(false);
  const epoch = useRef(0);
  const pending = useRef(false);
  const latest = useRef<Profile | null>(null);
  const claimDialog = useRef<HTMLDialogElement>(null);
  const previousClaim = useRef(false);
  const saveButton = useRef<HTMLButtonElement>(null);
  const next = new URLSearchParams(location.search).get('next');
  const returnTo = next && /^\/u\/[a-z][a-z0-9_]{2,23}$/.test(next) ? next : null;
  const clear = useCallback((state: 'login' | 'denied' | 'error', message: string) => {
    epoch.current++;
    latest.current = null;
    setProfile(null);
    setDraft(null);
    setClaim(false);
    setConflict(false);
    setNotice('');
    setError(message);
    setStatus(state);
  }, []);
  const fail = useCallback(
    (cause: unknown) => {
      const message = cause instanceof Error ? cause.message : 'Profile unavailable; try again';
      if (cause instanceof ApiError && cause.status === 401) clear('login', message);
      else if (cause instanceof ApiError && cause.status === 403) clear('denied', message);
      else if (cause instanceof TypeError || (cause instanceof ApiError && cause.status >= 500))
        clear('error', message);
      else {
        setError(message);
        if (cause instanceof ApiError && cause.status === 409) {
          setConflict(true);
          setClaim(false);
        }
      }
    },
    [clear],
  );
  const load = useCallback(async () => {
    const token = ++epoch.current;
    setStatus('loading');
    setError('');
    setNotice('');
    setProfile(null);
    setDraft(null);
    setConflict(false);
    setClaim(false);
    try {
      const data = await profileRequest<{ profile: Profile }>('me/profile');
      if (token !== epoch.current) return;
      latest.current = data.profile;
      setProfile(data.profile);
      setDraft(data.profile);
      setStatus('ready');
    } catch (cause) {
      if (token === epoch.current) fail(cause);
    }
  }, [fail]);
  useEffect(() => {
    void load();
    return () => {
      epoch.current++;
    };
  }, [load]);
  useEffect(() => {
    if (status !== 'ready') return;
    let active = true;
    let checking = false;
    const check = async () => {
      if (pending.current || checking || document.visibilityState === 'hidden') return;
      checking = true;
      const token = epoch.current;
      try {
        const data = await profileRequest<{ profile: Profile }>('me/profile');
        if (!active || token !== epoch.current) return;
        if (latest.current?.userId !== data.profile.userId) {
          clear('login', 'Account changed. Reload your profile before editing.');
          return;
        }
        if (latest.current?.revision !== data.profile.revision) {
          setConflict(true);
          setClaim(false);
          setNotice('');
          setError(
            'Your profile changed in another session. Reload before reviewing and saving again.',
          );
        }
      } catch (cause) {
        if (active && token === epoch.current) fail(cause);
      } finally {
        checking = false;
      }
    };
    const timer = setInterval(() => {
      void check();
    }, 30000);
    window.addEventListener('focus', check);
    window.addEventListener('online', check);
    document.addEventListener('visibilitychange', check);
    return () => {
      active = false;
      clearInterval(timer);
      window.removeEventListener('focus', check);
      window.removeEventListener('online', check);
      document.removeEventListener('visibilitychange', check);
    };
  }, [status, clear, fail]);
  useEffect(() => {
    if (claim) {
      claimDialog.current?.showModal();
      claimDialog.current?.querySelector<HTMLButtonElement>('.primary')?.focus();
    } else if (previousClaim.current) {
      saveButton.current?.focus();
    }
    previousClaim.current = claim;
  }, [claim]);
  const accept = (value: Profile, keepDraft = false) => {
    latest.current = value;
    setProfile(value);
    setDraft((old) =>
      keepDraft && old
        ? {
            ...old,
            revision: value.revision,
            avatarUrl: value.avatarUrl,
            moderation: value.moderation,
          }
        : value,
    );
  };
  async function save() {
    if (!profile || !draft || pending.current || conflict) return;
    const issue = handleProblem(draft.handle ?? '');
    if (issue) {
      setError(issue);
      return;
    }
    if (!draft.displayName.trim()) {
      setError('Add a display name.');
      return;
    }
    const token = epoch.current;
    pending.current = true;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const {
        userId: _user,
        avatarUrl: _avatar,
        moderation: _moderation,
        createdAt: _created,
        updatedAt: _updated,
        ...fields
      } = draft;
      const data = await profileRequest<{ profile: Profile }>('me/profile', 'PATCH', {
        ...fields,
        revision: profile.revision,
      });
      if (token !== epoch.current) return;
      accept(data.profile);
      setClaim(false);
      setNotice('Profile saved.');
    } catch (cause) {
      if (token === epoch.current) fail(cause);
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  async function photo(file: File | null) {
    if (!profile || pending.current || conflict) return;
    const token = epoch.current;
    pending.current = true;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      let data: { profile: Profile };
      if (!file) data = await profileRequest('me/avatar', 'DELETE', { revision: profile.revision });
      else {
        if (
          !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) ||
          file.size > 2 * 1024 * 1024
        )
          throw new Error('Choose a JPG, PNG or WebP photo up to 2 MiB.');
        const image = await createImageBitmap(file);
        let blob: Blob;
        try {
          const ratio = Math.min(512 / image.width, 512 / image.height, 1);
          const canvas = document.createElement('canvas');
          canvas.width = Math.max(1, Math.round(image.width * ratio));
          canvas.height = Math.max(1, Math.round(image.height * ratio));
          const context = canvas.getContext('2d');
          if (!context) throw new Error('Photo processing is unavailable.');
          context.drawImage(image, 0, 0, canvas.width, canvas.height);
          blob = await new Promise<Blob>((resolve, reject) =>
            canvas.toBlob(
              (value) =>
                value ? resolve(value) : reject(new Error('This photo could not be processed.')),
              'image/png',
            ),
          );
        } finally {
          image.close();
        }
        if (token !== epoch.current) return;
        data = await profileResponse(
          await fetch('/api/me/avatar', {
            method: 'POST',
            credentials: 'same-origin',
            cache: 'no-store',
            headers: {
              'Content-Type': 'image/png',
              'X-Profile-Revision': String(profile.revision),
            },
            body: blob,
          }),
        );
      }
      if (token !== epoch.current) return;
      accept(data.profile, true);
      setNotice(
        file
          ? 'Photo saved. Your other edits are kept below.'
          : 'Photo removed. Your other edits are kept below.',
      );
    } catch (cause) {
      if (token === epoch.current) fail(cause);
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  function field<K extends keyof Profile>(key: K, value: Profile[K]) {
    setDraft((current) => (current ? { ...current, [key]: value } : null));
  }
  const avatar = (p: Profile, extra = '') => (
    <div className={`avatar ${extra}`}>
      {p.avatarUrl ? <img src={p.avatarUrl} alt="Your profile avatar" /> : initials(p.displayName)}
    </div>
  );
  return (
    <>
      <a className="skip" href="#main">
        Skip to content
      </a>
      <header className="site-header">
        <a className="brand" href="/">
          <span className="brand-mark">ϟ</span>ElectraSim
          <span className="community-word">community</span>
        </a>
        <nav aria-label="Account">
          <a href="/app/">Simulator ↗</a>
          {profile?.handle && <a href={`/u/${profile.handle}`}>Your profile ↗</a>}
          {status === 'ready' && (
            <button
              className="text-btn"
              disabled={busy}
              onClick={() => {
                const token = ++epoch.current;
                pending.current = true;
                setBusy(true);
                void profileRequest('auth/sign-out', 'POST', {})
                  .then(() => {
                    if (token === epoch.current) clear('login', 'Signed out.');
                  })
                  .catch(fail)
                  .finally(() => {
                    pending.current = false;
                    setBusy(false);
                  });
              }}
            >
              Sign out
            </button>
          )}
        </nav>
      </header>
      <main id="main" tabIndex={-1}>
        {error && (
          <p className="notice red" role="alert">
            {error}
          </p>
        )}
        {notice && <output className="notice">{notice}</output>}
        {status === 'loading' && <output>Loading your profile…</output>}
        {status === 'login' && (
          <section className="panel panel-body auth-panel">
            <p className="eyebrow">Your community identity</p>
            <h1>Sign in</h1>
            <p className="muted">Manage your profile and privacy.</p>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                if (pending.current) return;
                const form = new FormData(event.currentTarget);
                pending.current = true;
                setBusy(true);
                setError('');
                void profileRequest('auth/sign-in/email', 'POST', {
                  email: String(form.get('email')),
                  password: String(form.get('password')),
                })
                  .then(async () => {
                    if (returnTo) location.assign(returnTo);
                    else await load();
                  })
                  .catch(fail)
                  .finally(() => {
                    pending.current = false;
                    setBusy(false);
                  });
              }}
            >
              <div className="field">
                <label htmlFor="email">Email</label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="username"
                  required
                  disabled={busy}
                />
              </div>
              <div className="field">
                <label htmlFor="password">Password</label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  disabled={busy}
                />
              </div>
              <div className="actions">
                <button className="btn primary" disabled={busy}>
                  Sign in
                </button>
              </div>
            </form>
          </section>
        )}
        {(status === 'error' || status === 'denied') && (
          <section className="panel panel-body">
            <h1>{status === 'denied' ? 'Access unavailable' : 'Profile unavailable'}</h1>
            <p>Your session or account access may have changed.</p>
            <button
              className="btn"
              onClick={() => {
                void load();
              }}
            >
              Check access again
            </button>
          </section>
        )}
        {status === 'ready' && profile && draft && (
          <>
            <div className="page-heading">
              <div>
                <p className="eyebrow">Your community identity</p>
                <h1>Make yourself at home.</h1>
                <p>A little about you. Shared on your terms.</p>
              </div>
              {profile.handle && (
                <a className="btn" href={`/u/${profile.handle}`}>
                  View profile ↗
                </a>
              )}
            </div>
            {conflict && (
              <div className="notice amber">
                <p>
                  Reload the current profile before making another change. Reloading discards
                  unsaved edits.
                </p>
                <button
                  className="btn"
                  disabled={busy}
                  onClick={() => {
                    void load();
                  }}
                >
                  Reload current profile
                </button>
              </div>
            )}
            {profile.moderation !== 'visible' && (
              <p className="notice red">
                Your profile is {profile.moderation} after staff review. Edits won’t make it or its
                avatar public.{' '}
                {profile.moderation === 'hidden'
                  ? 'A moderator must review and restore it.'
                  : 'Removed profiles cannot be restored.'}
              </p>
            )}
            <div className="edit-layout">
              <form
                className="panel"
                onSubmit={(event) => {
                  event.preventDefault();
                  if (!profile.handle) {
                    const issue = handleProblem(draft.handle ?? '');
                    if (issue) {
                      setError(issue);
                      return;
                    }
                    setClaim(true);
                  } else void save();
                }}
              >
                <fieldset disabled={busy || conflict} className="profile-fields">
                  <section className="form-section">
                    <div className="section-heading">
                      <h2>Profile details</h2>
                      <p>The person behind the connections.</p>
                    </div>
                    <div className="avatar-editor">
                      {avatar(profile)}
                      <div>
                        <label className="btn" htmlFor="photo">
                          Choose photo
                        </label>
                        <input
                          id="photo"
                          type="file"
                          accept="image/png,image/jpeg,image/webp"
                          hidden
                          onChange={(event) => {
                            const file = event.currentTarget.files?.[0];
                            if (file) void photo(file);
                            event.currentTarget.value = '';
                          }}
                        />
                        {profile.avatarUrl && (
                          <button
                            type="button"
                            className="text-btn"
                            onClick={() => {
                              void photo(null);
                            }}
                          >
                            Remove photo
                          </button>
                        )}
                        <small>
                          JPG, PNG or WebP · Up to 2 MiB
                          <br />
                          Photos save immediately and are resized to 512 pixels.
                        </small>
                      </div>
                    </div>
                    <div className="field">
                      <label htmlFor="display-name">Display name</label>
                      <input
                        id="display-name"
                        value={draft.displayName}
                        required
                        maxLength={60}
                        onChange={(e) => field('displayName', e.target.value)}
                      />
                      <small>Your profile name is separate from your account sign-in name.</small>
                    </div>
                    <div className="field">
                      <label htmlFor="handle">
                        Handle {profile.handle ? '· Claimed' : '· Choose once'}
                      </label>
                      <div className="input-prefix">
                        <span>/u/</span>
                        <input
                          id="handle"
                          value={draft.handle ?? ''}
                          maxLength={24}
                          required
                          pattern="[a-z][a-z0-9_]{2,23}"
                          readOnly={Boolean(profile.handle)}
                          autoCapitalize="none"
                          autoComplete="off"
                          spellCheck={false}
                          onChange={(e) => field('handle', e.target.value)}
                          aria-describedby="handle-help"
                        />
                      </div>
                      <small id="handle-help">
                        {profile.handle
                          ? 'Your permanent community address. Handles cannot be renamed.'
                          : '3–24 lowercase letters, numbers or underscores. Start with a letter. Reserved and claimed handles are unavailable.'}
                      </small>
                    </div>
                    <div className="field">
                      <label htmlFor="bio">Bio · Optional</label>
                      <textarea
                        id="bio"
                        value={draft.bio}
                        maxLength={280}
                        onChange={(e) => field('bio', e.target.value)}
                      />
                      <small>{draft.bio.length}/280 characters · Plain text.</small>
                    </div>
                  </section>
                  <section className="form-section">
                    <div className="section-heading">
                      <h2>Your learning journey</h2>
                      <p>Optional details with separate visibility controls.</p>
                    </div>
                    <div className="field-row">
                      <div className="field">
                        <label htmlFor="institution">Institution</label>
                        <input
                          id="institution"
                          value={draft.institution}
                          maxLength={100}
                          onChange={(e) => field('institution', e.target.value)}
                        />
                      </div>
                      <div className="field">
                        <label htmlFor="level">Learning level</label>
                        <select
                          id="level"
                          value={draft.level}
                          onChange={(e) => field('level', e.target.value)}
                        >
                          {LEARNING_LEVELS.map((level) => (
                            <option key={level} value={level}>
                              {level || 'Prefer not to say'}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </section>
                  <section className="form-section">
                    <div className="section-heading">
                      <h2>Privacy & sharing</h2>
                      <p>You decide what the community sees.</p>
                    </div>
                    <div className="visibility-choices">
                      {(['public', 'private'] as const).map((value) => (
                        <label className="visibility-option" key={value}>
                          <input
                            type="radio"
                            name="visibility"
                            value={value}
                            checked={draft.visibility === value}
                            onChange={() => field('visibility', value)}
                          />
                          <span>
                            {value === 'public' ? 'Public profile' : 'Private profile'}
                            <small>
                              {value === 'public'
                                ? 'Visible to anyone with your profile address.'
                                : 'Your profile and avatar stay out of public view.'}
                            </small>
                          </span>
                        </label>
                      ))}
                    </div>
                    {(
                      [
                        [
                          'showInstitution',
                          'Show my institution',
                          'Only shown when your profile is public.',
                        ],
                        [
                          'showLevel',
                          'Show my learning level',
                          'Help others understand your learning journey.',
                        ],
                        [
                          'allowForks',
                          'Allow forks of future shared circuits',
                          'A default for future publishing. Your private circuit files stay private.',
                        ],
                      ] as const
                    ).map(([key, label, help]) => (
                      <label className="check-row" key={key}>
                        <input
                          type="checkbox"
                          checked={draft[key]}
                          onChange={(e) => field(key, e.target.checked)}
                        />
                        <span>
                          {label}
                          <small>{help}</small>
                        </span>
                      </label>
                    ))}
                  </section>
                  <div className="save-bar">
                    <p>
                      {draft.visibility === 'private'
                        ? 'Your profile is private. Visitors see an unavailable page.'
                        : 'Only your selected profile details will be public.'}
                    </p>
                    <button ref={saveButton} className="btn primary">
                      {busy ? 'Saving…' : 'Save profile'}
                    </button>
                  </div>
                </fieldset>
              </form>
              <aside className="preview-side">
                <section className="panel preview-mini">
                  <span className="eyebrow">Profile card preview</span>
                  {avatar({ ...draft, avatarUrl: profile.avatarUrl })}
                  <h3>{draft.displayName || 'Your name'}</h3>
                  <div className="handle">@{draft.handle || 'your_handle'}</div>
                  <p>{draft.bio || 'Your introduction goes here.'}</p>
                  <div className="meta">
                    <span>
                      {draft.visibility === 'public'
                        ? 'Public profile'
                        : 'Private · visible only to you'}
                    </span>
                  </div>
                </section>
                <section className="panel panel-body">
                  <h3>Your privacy, by default</h3>
                  <ul className="helper-list">
                    <li>Your email is never on your public profile.</li>
                    <li>Private circuit files stay private.</li>
                    <li>Your profile name doesn’t change your account details.</li>
                  </ul>
                </section>
              </aside>
            </div>
          </>
        )}
      </main>
      <footer>
        <span>ElectraSim / Your profile, your terms.</span>
        <a href="/app/">Open simulator ↗</a>
      </footer>
      {claim && draft && (
        <dialog
          ref={claimDialog}
          aria-labelledby="claim-title"
          onCancel={(event) => {
            event.preventDefault();
            if (!busy) {
              setClaim(false);
              saveButton.current?.focus();
            }
          }}
        >
          <h2 id="claim-title">Claim @{draft.handle}?</h2>
          <p>
            This will be your permanent community address. You can edit your display name later;
            handles cannot be renamed.
          </p>
          <div className="dialog-summary">/u/{draft.handle}</div>
          {error && (
            <p role="alert" className="error">
              {error}
            </p>
          )}
          <div className="actions">
            <button
              className="btn"
              disabled={busy}
              onClick={() => {
                setClaim(false);
                saveButton.current?.focus();
              }}
            >
              Keep editing
            </button>
            <button
              className="btn primary"
              disabled={busy || conflict}
              onClick={() => {
                void save();
              }}
            >
              Claim handle & save
            </button>
          </div>
        </dialog>
      )}
    </>
  );
}
