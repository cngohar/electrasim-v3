import { useEffect, useState } from 'react';
import type { Profile } from '../../community/profile-policy';
import { Pill, personInitials } from './AdminShell';
import { useAdminResource } from './resource';
import type { Tools } from './types';
type Summary = Pick<
  Profile,
  'userId' | 'handle' | 'displayName' | 'visibility' | 'moderation' | 'revision' | 'updatedAt'
>;
type Report = {
  id: string;
  reason: string;
  details: string;
  status: string;
  revision: number;
  resolution: string | null;
  createdAt: number;
};
type Detail = {
  version: number;
  profile: Summary & { bio: string; avatarUrl: string | null };
  reports: Report[];
  history: { id: string; action: string; reason: string; createdAt: number }[];
};
const selectedId = () => {
  try {
    return decodeURIComponent(location.hash.slice(1));
  } catch {
    return '';
  }
};
const actionNames: Record<string, string> = {
  'community.profiles.hide': 'Profile hidden',
  'community.profiles.restore': 'Profile restored',
  'community.profiles.remove': 'Profile removed',
  'community.profiles.avatar': 'Avatar removed',
  'community.profiles.auto-hide': 'Profile hidden automatically',
  'community.reports.resolve': 'Report outcome recorded',
};
export function ProfilesView({ access, review, fail, conflict }: Tools) {
  const [selected, setSelected] = useState(selectedId);
  const [tab, setTab] = useState<'profiles' | 'reports'>(
    access.permissions.includes('community.profiles.read') ? 'profiles' : 'reports',
  );
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState('');
  const [state, setState] = useState('all');
  const [reportState, setReportState] = useState('open');
  const [offset, setOffset] = useState(0);
  useEffect(() => {
    const change = () => setSelected(selectedId());
    window.addEventListener('hashchange', change);
    return () => window.removeEventListener('hashchange', change);
  }, []);
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(query.trim());
      setOffset(0);
    }, 250);
    return () => clearTimeout(timer);
  }, [query]);
  const canProfiles = access.permissions.includes('community.profiles.read');
  const canReports = access.permissions.includes('community.reports.read');
  const profiles = useAdminResource<{ version: number; items: Summary[]; total: number }>(
    !selected && tab === 'profiles' && canProfiles
      ? `admin/community/profiles?q=${encodeURIComponent(search)}&moderation=${state}&offset=${offset}&limit=20`
      : null,
    fail,
  );
  const reports = useAdminResource<{
    version: number;
    items: {
      id: string;
      targetUserId: string;
      displayName: string;
      handle: string | null;
      reason: string;
      status: string;
      createdAt: number;
    }[];
    total: number;
  }>(
    !selected && tab === 'reports' && canReports
      ? `admin/community/reports?status=${reportState}&offset=${offset}&limit=20`
      : null,
    fail,
  );
  const detail = useAdminResource<Detail>(
    selected && canProfiles ? `admin/community/profiles/${encodeURIComponent(selected)}` : null,
    fail,
  );
  const data = detail.data?.profile.userId === selected ? detail.data : null;
  const list = tab === 'profiles' ? profiles : reports;
  function moderation(action: string) {
    if (!data || conflict) return;
    review({
      path: `admin/community/profiles/${encodeURIComponent(selected)}/moderate`,
      method: 'POST',
      data: { version: data.version, profileRevision: data.profile.revision, action },
      summary: [
        `${action === 'avatar' ? 'Remove avatar' : `${action[0].toUpperCase() + action.slice(1)} profile`}: ${data.profile.displayName} (@${data.profile.handle ?? 'unclaimed'})`,
        `Reviewing profile revision ${data.profile.revision}.`,
        action === 'restore'
          ? 'Restoration preserves the owner’s private visibility setting.'
          : action === 'remove'
            ? 'Removal retains a tombstone and cannot be restored. Private circuits and account access are preserved.'
            : action === 'avatar'
              ? 'Remove the current photo. Profile moderation remains unchanged.'
              : 'Hide identity and avatar from public views. Owner edits cannot restore visibility.',
      ],
    });
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">COMMUNITY / PROFILES</span>
          <h1>Keep the community welcoming.</h1>
          <p>Review profiles and reports. Record a clear reason for each decision.</p>
        </div>
        {selected && (
          <a className="btn" href="/admin/community/">
            Back to profiles & reports
          </a>
        )}
      </div>
      {conflict && (
        <output className="note">
          Profile or administration changed. Reload administration, then review the current values
          with a new reason.
        </output>
      )}
      {!selected && (
        <>
          <div className="actions">
            {canProfiles && (
              <button
                className={`btn ${tab === 'profiles' ? 'primary' : ''}`}
                onClick={() => {
                  setTab('profiles');
                  setOffset(0);
                }}
              >
                Profiles
              </button>
            )}
            {canReports && (
              <button
                className={`btn ${tab === 'reports' ? 'primary' : ''}`}
                onClick={() => {
                  setTab('reports');
                  setOffset(0);
                }}
              >
                Profile reports
              </button>
            )}
          </div>
          <section className="panel">
            <div className="community-filters">
              {tab === 'profiles' ? (
                <>
                  <label>
                    Search profiles
                    <input
                      value={query}
                      maxLength={100}
                      placeholder="Name or handle prefix"
                      onChange={(e) => setQuery(e.target.value)}
                    />
                  </label>
                  <label>
                    Moderation
                    <select
                      value={state}
                      onChange={(e) => {
                        setState(e.target.value);
                        setOffset(0);
                      }}
                    >
                      {['all', 'visible', 'hidden', 'removed'].map((value) => (
                        <option key={value} value={value}>
                          {value}
                        </option>
                      ))}
                    </select>
                  </label>
                </>
              ) : (
                <label>
                  Report status
                  <select
                    value={reportState}
                    onChange={(e) => {
                      setReportState(e.target.value);
                      setOffset(0);
                    }}
                  >
                    {['open', 'resolved', 'dismissed', 'all'].map((value) => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </div>
            {list.loading && <output>Loading {tab}…</output>}
            {list.data?.items.length === 0 && <p className="note">No matching {tab}.</p>}
            <div className="community-list">
              {tab === 'profiles'
                ? profiles.data?.items.map((p) => (
                    <a
                      className="community-list-row"
                      key={p.userId}
                      href={`#${encodeURIComponent(p.userId)}`}
                    >
                      <span>
                        <strong>{p.displayName}</strong>
                        <small>@{p.handle ?? 'unclaimed'}</small>
                      </span>
                      <span>
                        <Pill tone={p.moderation === 'visible' ? 'green' : 'red'}>
                          {p.moderation}
                        </Pill>{' '}
                        <Pill>{p.visibility}</Pill>
                      </span>
                    </a>
                  ))
                : reports.data?.items.map((r) => (
                    <div className="community-list-row" key={r.id}>
                      <span>
                        <strong>
                          {canProfiles ? (
                            <a href={`#${encodeURIComponent(r.targetUserId)}`}>{r.displayName}</a>
                          ) : (
                            r.displayName
                          )}
                        </strong>
                        <small>
                          {r.reason} · {new Date(r.createdAt).toLocaleDateString()}
                        </small>
                      </span>
                      <Pill>{r.status}</Pill>
                    </div>
                  ))}
            </div>
            <div className="community-pagination">
              <span>
                {list.data?.total ?? 0} matching {tab}
              </span>
              <div className="actions">
                <button
                  className="btn"
                  disabled={offset === 0 || list.loading}
                  onClick={() => setOffset((value) => Math.max(0, value - 20))}
                >
                  Previous
                </button>
                <button
                  className="btn"
                  disabled={list.loading || !list.data || offset + 20 >= list.data.total}
                  onClick={() => setOffset((value) => value + 20)}
                >
                  Next
                </button>
              </div>
            </div>
          </section>
        </>
      )}
      {selected && detail.loading && <output>Loading profile…</output>}
      {selected && !canProfiles && <p>You do not have permission to inspect profile details.</p>}
      {data && (
        <div className="community-detail">
          <section className="panel community-profile-card">
            <div className="community-person">
              <span className="avatar">
                {data.profile.avatarUrl ? (
                  <img src={data.profile.avatarUrl} alt="Profile avatar" />
                ) : (
                  personInitials(data.profile.displayName)
                )}
              </span>
              <div>
                <h2>{data.profile.displayName}</h2>
                <p>
                  @{data.profile.handle ?? 'unclaimed'} · Revision {data.profile.revision}
                </p>
              </div>
            </div>
            <div className="actions">
              <Pill tone={data.profile.moderation === 'visible' ? 'green' : 'red'}>
                {data.profile.moderation}
              </Pill>
              <Pill>{data.profile.visibility}</Pill>
            </div>
            <div className="community-bio">
              <span className="eyebrow">PROFILE BIO</span>
              <p>{data.profile.bio || 'No bio added.'}</p>
            </div>
            <div className="actions">
              {access.permissions.includes('community.profiles.moderate') && (
                <>
                  {data.profile.moderation === 'visible' && (
                    <button className="btn" disabled={conflict} onClick={() => moderation('hide')}>
                      Hide profile
                    </button>
                  )}
                  {data.profile.moderation === 'hidden' && (
                    <button
                      className="btn primary"
                      disabled={conflict}
                      onClick={() => moderation('restore')}
                    >
                      Restore profile
                    </button>
                  )}
                  {data.profile.moderation !== 'removed' && (
                    <button
                      className="btn"
                      disabled={conflict}
                      onClick={() => moderation('remove')}
                    >
                      Remove profile
                    </button>
                  )}
                  {data.profile.avatarUrl && (
                    <button
                      className="btn"
                      disabled={conflict}
                      onClick={() => moderation('avatar')}
                    >
                      Remove avatar
                    </button>
                  )}
                </>
              )}
              {data.profile.handle && (
                <a className="btn" href={`/u/${data.profile.handle}`}>
                  Check public view ↗
                </a>
              )}
            </div>
            <p className="note">
              {data.profile.moderation === 'removed' ? 'Removed · Tombstone retained. ' : ''}Profile
              moderation preserves private circuit work and membership. Hidden author identity uses
              neutral attribution on future visible publications.
            </p>
          </section>
          {canReports && (
            <section className="panel community-profile-card">
              <h2>Profile reports</h2>
              {data.reports.length === 0 ? (
                <p>No profile reports.</p>
              ) : (
                data.reports.map((r) => (
                  <article className="community-report" key={r.id}>
                    <div>
                      <strong>{r.reason}</strong>
                      <p>{r.details}</p>
                      <small>Member report · {new Date(r.createdAt).toLocaleDateString()}</small>{' '}
                      <Pill>{r.status}</Pill>
                      {r.resolution && <p>Decision: {r.resolution}</p>}
                    </div>
                    {r.status === 'open' &&
                      access.permissions.includes('community.reports.review') && (
                        <div className="actions">
                          {(['resolved', 'dismissed'] as const).map((outcome) => (
                            <button
                              className="btn"
                              key={outcome}
                              disabled={conflict}
                              onClick={() =>
                                review({
                                  path: `admin/community/reports/${encodeURIComponent(r.id)}/resolve`,
                                  method: 'POST',
                                  data: {
                                    version: data.version,
                                    reportRevision: r.revision,
                                    outcome,
                                  },
                                  summary: [
                                    `${outcome === 'resolved' ? 'Resolve' : 'Dismiss'} report: ${r.reason}`,
                                    `Profile: ${data.profile.displayName}. Report revision ${r.revision}.`,
                                    'Recording a report outcome does not change profile visibility.',
                                  ],
                                })
                              }
                            >
                              {outcome === 'resolved' ? 'Resolve report' : 'Dismiss report'}
                            </button>
                          ))}
                        </div>
                      )}
                  </article>
                ))
              )}
            </section>
          )}
          {access.permissions.includes('community.audit.read') && (
            <section className="panel community-profile-card">
              <h2>Profile action history</h2>
              {data.history.length === 0 ? (
                <p>No profile actions recorded.</p>
              ) : (
                <ol className="history">
                  {data.history.map((h) => (
                    <li key={h.id}>
                      <strong>{actionNames[h.action] ?? h.action}</strong>
                      <p>{h.reason}</p>
                      <small>{new Date(h.createdAt).toLocaleString()}</small>
                    </li>
                  ))}
                </ol>
              )}
            </section>
          )}
        </div>
      )}
    </>
  );
}
