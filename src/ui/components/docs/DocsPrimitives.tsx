import { ArrowUpRight } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import type { ComponentDef } from '../../../domain';
import { EmojiGlyph } from '../EmojiGlyph';

export function WireSeparator({ color = 'blue' }: { color?: 'blue' | 'slate' }) {
  const gradient =
    color === 'blue'
      ? 'from-blue-400 via-blue-200 dark:from-blue-500 dark:via-blue-900'
      : 'from-slate-300 via-slate-200 dark:from-slate-600 dark:via-slate-700';
  return (
    <div className="my-8 flex items-center gap-3">
      <div className={`h-px flex-1 bg-gradient-to-r ${gradient} to-transparent`} />
      <div
        className={`size-2 rounded-full border-2 ${color === 'blue' ? 'border-blue-400 bg-blue-100 dark:bg-blue-950' : 'border-slate-300 bg-slate-100 dark:border-slate-600 dark:bg-slate-800'}`}
      />
      <div className={`h-px flex-1 bg-gradient-to-l ${gradient} to-transparent`} />
    </div>
  );
}

export function SectionHeading({
  icon: Icon,
  color,
  children,
}: {
  icon: LucideIcon;
  color: string;
  children: ReactNode;
}) {
  return (
    <div className="mb-4 flex items-center gap-3">
      <div className={`grid size-8 place-items-center rounded-xl ${color} text-white shadow-sm`}>
        <Icon className="size-4" />
      </div>
      <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">{children}</h2>
    </div>
  );
}

export function Step({ n, title, desc }: { n: number; title: string; desc: string }) {
  return (
    <div className="flex gap-4 rounded-xl border border-slate-100 bg-white/60 p-4 transition hover:shadow-sm dark:border-slate-700 dark:bg-slate-800/60 dark:hover:border-slate-600">
      <div className="grid size-8 flex-shrink-0 place-items-center rounded-full bg-blue-600 text-sm font-bold text-white shadow-sm shadow-blue-600/20">
        {n}
      </div>
      <div>
        <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">{title}</div>
        <div className="mt-0.5 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
          {desc}
        </div>
      </div>
    </div>
  );
}

/** "Full guide on electrasim.com →" link — the bridge from the quick-reference
 *  in-app docs to the long-form content on the Astro site. */
export function ExternalLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50/60 px-2.5 py-1.5 text-[11px] font-semibold text-blue-700 transition hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-950/50 dark:text-blue-300 dark:hover:bg-blue-900/60"
    >
      {children}
      <ArrowUpRight className="size-3" />
    </a>
  );
}

export function ComponentCard({ definition }: { definition: ComponentDef }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-slate-100 bg-white/60 p-3 transition hover:border-blue-200 hover:shadow-sm dark:border-slate-700 dark:bg-slate-800/60 dark:hover:border-blue-800">
      <EmojiGlyph emoji={definition.icon} size={26} className="shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="text-xs font-semibold text-slate-800 dark:text-slate-100">
          {definition.label}
        </div>
        <div className="mt-0.5 text-[10px] leading-relaxed text-slate-500 dark:text-slate-400">
          {definition.description || 'No description.'}
        </div>
        <div className="mt-1.5 flex flex-wrap gap-1">
          {definition.ports.map((port) => (
            <span
              key={port.label}
              className={[
                'inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-medium',
                port.type === 'live'
                  ? 'bg-red-50 text-red-600 dark:bg-red-950/50 dark:text-red-300'
                  : port.type === 'neutral'
                    ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-300'
                    : 'bg-green-50 text-green-600 dark:bg-green-950/50 dark:text-green-300',
              ].join(' ')}
            >
              <span
                className={[
                  'size-1.5 rounded-full',
                  port.type === 'live'
                    ? 'bg-red-400'
                    : port.type === 'neutral'
                      ? 'bg-blue-400'
                      : 'bg-green-400',
                ].join(' ')}
              />
              {port.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
