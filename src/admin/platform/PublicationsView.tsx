import { useEffect, useState } from 'react';
import type { OwnerPublication } from '../../community/PublicationSettings';
import { Pill } from './AdminShell';
import { useAdminResource } from './resource';
import type { Tools } from './types';
type Report = {
  id: string;
  reason: string;
  details: string;
  status: string;
  revision: number;
  resolution: string | null;
  versionId: string;
};
const actionNames: Record<string, string> = {
  'community.publications.hide': 'Publication hidden',
  'community.publications.restore': 'Publication restored',
  'community.publications.remove': 'Publication removed',
  'community.publications.auto-hide': 'Publication hidden automatically',
  'community.reports.resolve': 'Report outcome recorded',
};
type Detail = {
  version: number;
  publication: OwnerPublication;
  reports: Report[];
  history: { id: string; action: string; reason: string }[];
  versions: { id: string; versionNumber: number; title: string; fingerprint: string }[];
};
function selectedId() {
  try {
    return decodeURIComponent(location.hash.slice(1));
  } catch {
    return '';
  }
}
export function PublicationsView({ access, review, fail, conflict }: Tools) {
  const [selected, setSelected] = useState(selectedId);
  const [tab, setTab] = useState('publications');
  const [state, setState] = useState('all');
  const [q, setQ] = useState('');
  const [offset, setOffset] = useState(0);
  const [versionId, setVersionId] = useState('');
  const canRead = access.permissions.includes('community.publications.read');
  const canReports = access.permissions.includes('community.reports.read');
  useEffect(() => {
    const change = () => {
      setSelected(selectedId());
      setVersionId('');
    };
    window.addEventListener('hashchange', change);
    return () => window.removeEventListener('hashchange', change);
  }, []);
  const list = useAdminResource<{
    version: number;
    items: (OwnerPublication & { publicationId?: string; reason?: string })[];
    total: number;
  }>(
    !selected && (tab === 'publications' ? canRead : canReports)
      ? `admin/community/${tab === 'publications' ? `publications?q=${encodeURIComponent(q)}&moderation=${state}` : `publication-reports?status=${state}`}&offset=${offset}&limit=20`
      : null,
    fail,
  );
  const detail = useAdminResource<Detail>(
    selected && canRead ? `admin/community/publications/${encodeURIComponent(selected)}` : null,
    fail,
  );
  const snapshot = useAdminResource<{
    snapshot: {
      id: string;
      title: string;
      circuit: unknown;
      fingerprint: string;
      requirements: string[];
    };
  }>(
    selected && versionId && canRead
      ? `admin/community/publications/${encodeURIComponent(selected)}/versions/${encodeURIComponent(versionId)}`
      : null,
    fail,
  );
  const data = detail.data?.publication.id === selected ? detail.data : null;
  function moderate(action: string) {
    if (!data || conflict) return;
    review({
      path: `admin/community/publications/${encodeURIComponent(selected)}/moderate`,
      method: 'POST',
      data: { version: data.version, publicationRevision: data.publication.revision, action },
      summary: [
        `${action[0].toUpperCase() + action.slice(1)} publication: ${data.publication.title}`,
        `Reviewing publication revision ${data.publication.revision}.`,
        action === 'restore'
          ? 'Restoration preserves the owner’s unpublish or deletion choice.'
          : action === 'remove'
            ? 'Removal is permanent. Slug and immutable snapshots retain their tombstones.'
            : 'Hide every public version. Private working circuits remain available to their owner.',
      ],
    });
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">COMMUNITY / PUBLICATIONS</span>
          <h1>Review shared circuits.</h1>
          <p>Inspect fixed public snapshots and record reasons for moderation.</p>
        </div>
        {selected && (
          <a className="btn" href="/admin/community/?section=publications">
            Back to publications & reports
          </a>
        )}
      </div>
      {conflict && (
        <p className="note">
          Publication or administration changed. Reload administration and review the current values
          with a new reason.
        </p>
      )}
      {!selected && (
        <section className="panel community-profile-card">
          <div className="actions">
            {canRead && (
              <button
                className="btn"
                onClick={() => {
                  setTab('publications');
                  setState('all');
                  setOffset(0);
                }}
              >
                Publications
              </button>
            )}
            {canReports && (
              <button
                className="btn"
                onClick={() => {
                  setTab('reports');
                  setState('open');
                  setOffset(0);
                }}
              >
                Publication reports
              </button>
            )}
          </div>
          <div className="community-filters">
            {tab === 'publications' && (
              <label>
                Search publications
                <input
                  value={q}
                  maxLength={100}
                  onChange={(e) => {
                    setQ(e.target.value);
                    setOffset(0);
                  }}
                  placeholder="Title prefix"
                />
              </label>
            )}
            <label>
              {tab === 'publications' ? 'Moderation' : 'Report status'}
              <select
                value={state}
                onChange={(e) => {
                  setState(e.target.value);
                  setOffset(0);
                }}
              >
                {(tab === 'publications'
                  ? ['all', 'visible', 'hidden', 'removed']
                  : ['open', 'resolved', 'dismissed', 'all']
                ).map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </label>
          </div>
          {list.loading && <output>Loading {tab}…</output>}
          {list.data?.items.length === 0 && <p>No matching {tab}.</p>}
          <div className="community-list">
            {list.data?.items.map((p) => (
              <div className="community-list-row" key={p.id}>
                <span>
                  <strong>
                    {canRead ? (
                      <a href={`#${encodeURIComponent(p.publicationId ?? p.id)}`}>{p.title}</a>
                    ) : (
                      p.title
                    )}
                  </strong>
                  <small>{p.reason ?? `Version ${p.versionNumber}`}</small>
                </span>
                <span>
                  <Pill>{p.status}</Pill>
                  {p.moderation && <Pill>{p.moderation}</Pill>}
                </span>
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
                disabled={!offset || list.loading}
                onClick={() => setOffset(offset - 20)}
              >
                Previous
              </button>
              <button
                className="btn"
                disabled={list.loading || !list.data || offset + 20 >= list.data.total}
                onClick={() => setOffset(offset + 20)}
              >
                Next
              </button>
            </div>
          </div>
        </section>
      )}
      {selected && detail.loading && <output>Loading publication…</output>}
      {selected && !canRead && <p>You do not have permission to inspect publication details.</p>}
      {data && (
        <div className="community-detail">
          <section className="panel community-profile-card">
            <h2>{data.publication.title}</h2>
            <div className="actions">
              <Pill>{data.publication.status}</Pill>
              <Pill tone={data.publication.moderation === 'visible' ? 'green' : 'red'}>
                {data.publication.moderation}
              </Pill>
              <span>Revision {data.publication.revision}</span>
            </div>
            <p>{data.publication.description || 'No description.'}</p>
            <p>Tags: {data.publication.tags.join(', ') || 'None'}</p>
            <p>Slug: {data.publication.slug}</p>
            <p className="note">
              Only published snapshots are available here. Publishing does not certify electrical
              safety.
            </p>
            <div className="actions">
              {access.permissions.includes('community.publications.moderate') && (
                <>
                  {data.publication.moderation === 'visible' && (
                    <button className="btn" disabled={conflict} onClick={() => moderate('hide')}>
                      Hide publication
                    </button>
                  )}
                  {data.publication.moderation === 'hidden' && (
                    <button className="btn" disabled={conflict} onClick={() => moderate('restore')}>
                      Restore publication
                    </button>
                  )}
                  {data.publication.moderation !== 'removed' && (
                    <button className="btn" disabled={conflict} onClick={() => moderate('remove')}>
                      Remove publication
                    </button>
                  )}
                </>
              )}
            </div>
            <h3>Immutable versions</h3>
            <label>
              Inspect snapshot
              <select value={versionId} onChange={(e) => setVersionId(e.target.value)}>
                <option value="">Choose a published version</option>
                {data.versions.map((v) => (
                  <option key={v.id} value={v.id}>
                    Version {v.versionNumber}: {v.title}
                  </option>
                ))}
              </select>
            </label>
            {snapshot.loading && <output>Loading snapshot…</output>}
            {snapshot.data?.snapshot.id === versionId && (
              <details open>
                <summary>Published snapshot JSON</summary>
                <p>
                  Required benefits at publication:{' '}
                  {snapshot.data.snapshot.requirements.join(', ') || 'Basic'}
                </p>
                <pre className="publication-json">
                  {JSON.stringify(snapshot.data.snapshot.circuit, null, 2)}
                </pre>
              </details>
            )}
          </section>
          {canReports && (
            <section className="panel community-profile-card">
              <h2>Publication reports</h2>
              {data.reports.length === 0 && <p>No publication reports.</p>}
              {data.reports.map((r) => (
                <article className="community-report" key={r.id}>
                  <div>
                    <strong>{r.reason}</strong>
                    <p>{r.details}</p>
                    <Pill>{r.status}</Pill>
                    {r.resolution && <p>Decision: {r.resolution}</p>}
                    <button className="btn" onClick={() => setVersionId(r.versionId)}>
                      Inspect reported snapshot
                    </button>
                  </div>
                  {r.status === 'open' &&
                    access.permissions.includes('community.reports.review') && (
                      <div className="actions">
                        {['resolved', 'dismissed'].map((outcome) => (
                          <button
                            key={outcome}
                            className="btn"
                            disabled={conflict}
                            onClick={() =>
                              review({
                                path: `admin/community/publication-reports/${encodeURIComponent(r.id)}/resolve`,
                                method: 'POST',
                                data: {
                                  version: data.version,
                                  reportRevision: r.revision,
                                  outcome,
                                },
                                summary: [
                                  `${outcome === 'resolved' ? 'Resolve' : 'Dismiss'} report: ${r.reason}`,
                                  `Publication: ${data.publication.title}. Report revision ${r.revision}.`,
                                  'A report outcome does not change publication visibility.',
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
              ))}
            </section>
          )}
          {access.permissions.includes('community.audit.read') && (
            <section className="panel community-profile-card">
              <h2>Publication action history</h2>
              {data.history.length === 0 && <p>No publication actions recorded.</p>}
              <ol className="history">
                {data.history.map((h) => (
                  <li key={h.id}>
                    <strong>{actionNames[h.action] ?? h.action}</strong>
                    <p>{h.reason}</p>
                  </li>
                ))}
              </ol>
            </section>
          )}
        </div>
      )}
    </>
  );
}
