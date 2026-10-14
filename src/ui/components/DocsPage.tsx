import { useEffect, useMemo, useState } from 'react';
import { useUiStore } from '../../store';
import { Modal } from './Modal';
import { DocsContent } from './docs/DocsContent';
import { DocsHeader, DocsNavigation } from './docs/DocsNavigation';
import { buildComponentGroups } from './docs/data';

interface Props {
  open: boolean;
  onClose: () => void;
}

export function DocsPage({ open, onClose }: Props) {
  const scrollTarget = useUiStore((state) => state.docsScrollTo);
  const groups = useMemo(buildComponentGroups, []);
  const [tocOpen, setTocOpen] = useState(false);

  useEffect(() => {
    if (!open || !scrollTarget) return;
    const frame = requestAnimationFrame(() => {
      document.getElementById(scrollTarget)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      useUiStore.getState().setDocsOpen(true, null);
    });
    return () => cancelAnimationFrame(frame);
  }, [open, scrollTarget]);

  return (
    <Modal open={open} onClose={onClose} ariaLabel="Documentation" widthClass="max-w-5xl">
      <div className="table-docs">
        <DocsHeader
          tocOpen={tocOpen}
          onClose={onClose}
          onToggleContents={() => setTocOpen((value) => !value)}
        />
        <div className="table-docs-body">
          <DocsNavigation tocOpen={tocOpen} onNavigate={() => setTocOpen(false)} />
          <DocsContent groups={groups} />
        </div>
      </div>
    </Modal>
  );
}
