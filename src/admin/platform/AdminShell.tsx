import {
  BookOpen,
  Clock3,
  Cpu,
  CreditCard,
  LayoutGrid,
  LogOut,
  Menu,
  Search,
  Settings2,
  ShieldCheck,
  Users,
  X,
  Zap,
} from 'lucide-react';
import { type ReactNode, useEffect, useRef, useState } from 'react';
import { useAdminResource } from './resource';
import type { Access, Person } from './types';

const navIcons: Record<string, typeof Users> = {
  '/admin/': LayoutGrid,
  '/admin/users/': Users,
  '/admin/permissions/': ShieldCheck,
  '/admin/settings/': Settings2,
  '/admin/audit/': Clock3,
  '/admin/standards/': BookOpen,
  '/admin/pro/': CreditCard,
  '/admin/components/': Cpu,
  '/admin/community/': Users,
};
const displayNames: Record<string, string> = {
  '/admin/permissions/': 'Access & roles',
  '/admin/settings/': 'Community settings',
  '/admin/audit/': 'Audit log',
};
export const roleName = (role: string) =>
  ({
    super_admin: 'Super admin',
    admin: 'Administrator',
    moderator: 'Moderator',
    individual: 'Individual',
  })[role] ?? role;
export const personInitials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase();
export function Pill({ children, tone = '' }: { children: ReactNode; tone?: string }) {
  return <span className={`pill ${tone}`}>{children}</span>;
}
export function AdminShell({
  access,
  title,
  children,
  actions,
  fail,
}: {
  access: Access | null;
  title: string;
  children: ReactNode;
  actions?: ReactNode;
  fail: (error: unknown) => void;
}) {
  const [open, setOpen] = useState(false);
  const [phone, setPhone] = useState(() => window.matchMedia('(max-width: 760px)').matches);
  const [search, setSearch] = useState(false);
  const menu = useRef<HTMLButtonElement>(null);
  const nav = useRef<HTMLElement>(null);
  const searchButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const media = window.matchMedia('(max-width: 760px)');
    const update = () => {
      setPhone(media.matches);
      if (!media.matches) setOpen(false);
    };
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  useEffect(() => {
    if (open) nav.current?.querySelector<HTMLAnchorElement>('nav a')?.focus();
  }, [open]);

  const order = [
    '/admin/users/',
    '/admin/permissions/',
    '/admin/pro/',
    '/admin/components/',
    '/admin/community/',
    '/admin/settings/',
    '/admin/audit/',
    '/admin/standards/',
  ];
  const links = access
    ? [
        { label: 'Overview', href: '/admin/' },
        ...[...access.navigation].sort((a, b) => order.indexOf(a.href) - order.indexOf(b.href)),
      ]
    : [];
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && open) {
        setOpen(false);
        menu.current?.focus();
      }
      if (access && (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setOpen(false);
        setSearch(true);
      }
      if (open && event.key === 'Tab') {
        const targets = [
          menu.current,
          ...Array.from(nav.current?.querySelectorAll<HTMLElement>('a, button') ?? []),
        ].filter((target): target is HTMLElement => Boolean(target));
        const at = targets.findIndex((target) => target === document.activeElement);
        const next = (at + (event.shiftKey ? -1 : 1) + targets.length) % targets.length;
        event.preventDefault();
        targets[next]?.focus();
      }
    };
    document.addEventListener('keydown', key);
    return () => document.removeEventListener('keydown', key);
  }, [access, open]);
  useEffect(() => {
    if (!access) {
      setOpen(false);
      setSearch(false);
    }
  }, [access]);
  return (
    <div className="platform-admin">
      <a className="skip" href="#admin-content">
        Skip to administration content
      </a>
      {open && (
        <button
          className="nav-scrim"
          aria-label="Close navigation"
          onClick={() => {
            setOpen(false);
            menu.current?.focus();
          }}
        />
      )}
      <aside
        ref={nav}
        className={`sidebar ${open ? 'open' : ''}`}
        aria-label="Workspace sidebar"
        aria-hidden={phone && !open ? true : undefined}
        inert={phone && !open ? true : undefined}
      >
        <a className="brand" href="/admin/">
          <span className="brand-icon">
            <Zap size={25} />
          </span>
          <span>
            ElectraSim<small>ADMINISTRATION</small>
          </span>
        </a>
        <div className="workspace-select">
          <span className="workspace-icon">E</span>
          <span>
            Platform workspace<small>ElectraSim</small>
          </span>
        </div>
        <span className="nav-heading">WORKSPACE</span>
        {access && (
          <nav aria-label="Administration">
            {links.map((link) => {
              const Icon = navIcons[link.href] ?? LayoutGrid;
              return (
                <a
                  key={link.href}
                  className="nav-link"
                  href={link.href}
                  aria-label={link.label}
                  aria-current={window.location.pathname === link.href ? 'page' : undefined}
                >
                  <Icon className="icon" />
                  <span>{displayNames[link.href] ?? link.label}</span>
                </a>
              );
            })}
          </nav>
        )}
        <div className="sidebar-footer">
          <a className="nav-link" href="/app/">
            <Zap className="icon" />
            Open simulator
          </a>
          {access && (
            <div className="operator">
              <span className="avatar navy">{personInitials(access.actor.name)}</span>
              <span>
                {access.actor.name}
                <small>{roleName(access.actor.globalRole)}</small>
              </span>
              <ShieldCheck className="icon" />
            </div>
          )}
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <button
            ref={menu}
            className="icon-button mobile-menu"
            aria-label="Open navigation"
            aria-expanded={open}
            onClick={() => {
              setOpen(!open);
              if (!open) nav.current?.querySelector<HTMLAnchorElement>('nav a')?.focus();
            }}
          >
            <Menu />
          </button>
          <div className="breadcrumb">
            <span>Workspace</span>
            <span aria-hidden="true">›</span>
            <strong>{title}</strong>
          </div>
          <div className="topbar-actions">
            {access && (
              <button
                ref={searchButton}
                className="command-search"
                aria-label="Search workspace"
                onClick={() => setSearch(true)}
              >
                <Search className="icon" />
                <span>Search workspace…</span>
                <kbd>Ctrl K</kbd>
              </button>
            )}
            {actions}
          </div>
        </header>
        <main id="admin-content" className="platform-content" tabIndex={-1}>
          {children}
        </main>
        <footer className="page-footer">
          <span>ElectraSim administration</span>
          <span>Signed in access · Changes are audited</span>
        </footer>
      </div>
      {search && access && (
        <CommandSearch
          access={access}
          fail={fail}
          close={() => {
            setSearch(false);
            searchButton.current?.focus();
          }}
        />
      )}
    </div>
  );
}
function CommandSearch({
  access,
  fail,
  close,
}: { access: Access; fail: (error: unknown) => void; close: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [query, setQuery] = useState('');
  const [lookup, setLookup] = useState('');
  useEffect(() => {
    dialog.current?.showModal();
    dialog.current?.querySelector('input')?.focus();
  }, []);
  useEffect(() => {
    const timer = setTimeout(() => setLookup(query.trim()), 250);
    return () => clearTimeout(timer);
  }, [query]);
  const { data, loading } = useAdminResource<{ items: Person[] }>(
    access.permissions.includes('platform.users.read') && lookup
      ? `admin/users?q=${encodeURIComponent(lookup)}&limit=5`
      : null,
    fail,
  );
  const links = [{ label: 'Overview', href: '/admin/' }, ...access.navigation].filter((link) =>
    `${link.label} ${displayNames[link.href] ?? ''}`.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <dialog
      ref={dialog}
      className="review-dialog"
      aria-labelledby="command-heading"
      onCancel={(event) => {
        event.preventDefault();
        dialog.current?.close();
        close();
      }}
    >
      <div className="dialog-heading">
        <h2 id="command-heading">Search workspace</h2>
        <button
          className="icon-button"
          aria-label="Close search"
          onClick={() => {
            dialog.current?.close();
            close();
          }}
        >
          <X />
        </button>
      </div>
      <label className="search-field">
        <Search className="icon" />
        <input
          aria-label="Search pages and accounts"
          value={query}
          maxLength={200}
          onChange={(event) => setQuery(event.currentTarget.value)}
        />
      </label>
      <div className="search-results">
        {links.map((link) => (
          <a key={link.href} className="command-result" href={link.href}>
            {displayNames[link.href] ?? link.label}
          </a>
        ))}
        {loading && <output>Searching accounts…</output>}
        {data?.items.map((user) => (
          <a
            key={user.id}
            className="command-result"
            href={`/admin/users/#${encodeURIComponent(user.id)}`}
          >
            {user.name}
            <small>{user.email}</small>
          </a>
        ))}
        {links.length === 0 && !loading && !data?.items.length && (
          <p>No matching pages or accounts.</p>
        )}
      </div>
    </dialog>
  );
}
export function SignOutIcon() {
  return <LogOut className="icon" />;
}
