import { COMPONENT_DEFS } from '@electrasim/domain';
import { ArrowLeft, BookOpen } from 'lucide-react';
import { APP_VERSION } from '../../../version';
import { DOCS_TOC } from './data';

interface HeaderProps {
  tocOpen: boolean;
  onClose: () => void;
  onToggleContents: () => void;
}

export function DocsHeader({ tocOpen, onClose, onToggleContents }: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-100/80 bg-white/80 backdrop-blur-xl dark:border-slate-700/80 dark:bg-slate-900/85">
      <div className="mx-auto flex max-w-3xl items-center gap-3 px-6 py-3">
        <button
          type="button"
          onClick={onClose}
          className="grid size-8 place-items-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:text-white"
          title="Back to editor (Esc)"
          aria-label="Back to editor"
        >
          <ArrowLeft className="size-4" />
        </button>
        <div className="flex items-center gap-2">
          <div className="grid size-7 place-items-center rounded-lg bg-blue-600 text-white shadow-sm shadow-blue-600/30">
            <BookOpen className="size-3.5" />
          </div>
          <div>
            <div className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Documentation
            </div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400">
              ElectraSim — Interactive Wiring Lab
            </div>
          </div>
        </div>
        <div className="flex-1" />
        <button
          type="button"
          onClick={onToggleContents}
          aria-expanded={tocOpen}
          className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[10px] font-semibold text-slate-600 transition hover:bg-slate-50 md:hidden dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
        >
          Contents
        </button>
      </div>
    </header>
  );
}

export function DocsNavigation({
  tocOpen,
  onNavigate,
}: {
  tocOpen: boolean;
  onNavigate: () => void;
}) {
  return (
    <>
      <nav
        className="sticky top-20 hidden h-fit w-44 flex-shrink-0 md:block"
        aria-label="Documentation"
      >
        <div className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">
          Contents
        </div>
        <div className="mt-3 space-y-1">
          {DOCS_TOC.map((item) => (
            <a
              key={item.id}
              href={`#${item.id}`}
              className="group flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-slate-600 transition hover:bg-blue-50 hover:text-blue-700 dark:text-slate-400 dark:hover:bg-blue-950/50 dark:hover:text-blue-300"
            >
              <item.icon className="size-3.5 text-slate-400 group-hover:text-blue-500 dark:text-slate-500 dark:group-hover:text-blue-400" />
              {item.label}
            </a>
          ))}
        </div>
        <div className="mt-4 h-px bg-gradient-to-r from-slate-200 to-transparent dark:from-slate-700" />
        <div className="mt-3 text-[10px] text-slate-400 dark:text-slate-500">
          v{APP_VERSION} · {Object.keys(COMPONENT_DEFS).length} components
        </div>
      </nav>

      {tocOpen && (
        <nav
          className="fixed inset-x-0 top-[53px] z-20 border-b border-slate-100 bg-white/95 p-4 shadow-lg backdrop-blur-xl md:hidden dark:border-slate-700 dark:bg-slate-900/95"
          aria-label="Documentation"
        >
          {DOCS_TOC.map((item) => (
            <a
              key={item.id}
              href={`#${item.id}`}
              onClick={onNavigate}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-blue-50 hover:text-blue-700 dark:text-slate-300 dark:hover:bg-blue-950/50 dark:hover:text-blue-300"
            >
              <item.icon className="size-4 text-slate-400 dark:text-slate-500" />
              {item.label}
            </a>
          ))}
        </nav>
      )}
    </>
  );
}
