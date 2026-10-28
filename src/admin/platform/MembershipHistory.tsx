import { useState } from 'react';
import { type Row, grantState } from '../client';
import { Pill } from './AdminShell';
import { Pagination } from './ReadViews';
import { useAdminResource } from './resource';
import type { Tools } from './types';

export function MembershipHistory({ userId, fail }: Tools & { userId: string }) {
  const [offset, setOffset] = useState(0);
  const { data, loading } = useAdminResource<{ items: Row[]; total: number }>(
    `admin/pro/memberships?userId=${encodeURIComponent(userId)}&limit=20&offset=${offset}`,
    fail,
  );
  return (
    <>
      <div className="panel-heading">
        <div>
          <h3>Membership history</h3>
          <p>Manual grants and their current access state.</p>
        </div>
        <a className="btn primary" href={`/admin/pro/?assignUser=${encodeURIComponent(userId)}`}>
          Assign membership
        </a>
      </div>
      <p className="note">
        Plan benefit changes affect existing grants. Membership never grants staff permissions.
      </p>
      {loading && <output>Loading memberships…</output>}
      {data && (
        <>
          {!data.items.length && <p>No membership grants. Basic access is the default.</p>}
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Plan</th>
                  <th>State</th>
                  <th>Starts</th>
                  <th>Ends</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {data.items.map((row) => (
                  <tr key={String(row.id)}>
                    <td>{String(row.planName ?? row.planId)}</td>
                    <td>
                      <Pill tone={grantState(row) === 'active' ? 'green' : ''}>
                        {grantState(row)}
                      </Pill>
                    </td>
                    <td>{new Date(Number(row.startsAt)).toLocaleString()}</td>
                    <td>
                      {row.noExpiry ? 'No expiry' : new Date(Number(row.endsAt)).toLocaleString()}
                    </td>
                    <td>
                      <a href={`/admin/pro/?grant=${encodeURIComponent(String(row.id))}`}>
                        Manage grant
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination offset={offset} total={data.total} change={setOffset} />
        </>
      )}
    </>
  );
}
