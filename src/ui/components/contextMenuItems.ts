import { assessFaultTarget, getAvailableFaultsForTarget } from '@electrasim/domain';
/**
 * Context-menu item builders — the target-aware menu entry lists.
 *
 * Split verbatim from the former monolithic `ContextMenu.tsx`. Pure data
 * builders (no JSX): the presentational dialog lives in `ContextMenu.tsx`.
 */

import { COMPONENT_DEFS } from '@electrasim/domain';
import {
  ArrowRightLeft,
  BookOpen,
  Copy,
  Download,
  HelpCircle,
  Keyboard,
  MousePointerClick,
  Power,
  RefreshCcw,
  RotateCw,
  Route,
  Scissors,
  Settings,
  ShieldCheck,
  Sliders,
  Trash2,
  Unlink,
  X,
  Zap,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { type ContextMenuState, useCircuitStore, useSettingsStore, useUiStore } from '../../store';
import {
  requestClearAll,
  requestClearWires,
  requestDeleteComponent,
  requestDeleteWire,
  requestReset,
} from '../canvas-actions';

export interface MenuItem {
  icon: LucideIcon;
  label: string;
  shortcut?: string;
  action: () => void;
  danger?: boolean;
  disabled?: boolean;
  momentaryId?: string;
}

export interface SeparatorItem {
  separator: true;
}

export type MenuEntry = MenuItem | SeparatorItem;

export function isSeparator(e: MenuEntry): e is SeparatorItem {
  return 'separator' in e;
}

// ─── Item builder ────────────────────────────────────────────────────────────

export function buildItems(target: ContextMenuState['target']): MenuEntry[] {
  const items: MenuEntry[] = [];
  const close = () => useUiStore.getState().setContextMenu(null);
  const simRunning = useUiStore.getState().simRunning;
  const cs = useCircuitStore.getState();

  // Manual fault-injection menu items only appear in Pro Electrician Mode
  // and while the master "Faults" toggle is armed. Student Mode keeps the
  // context menu free of fault controls to avoid dangerous confusion.
  const { appMode, manualFaultInjection } = useSettingsStore.getState();
  const faultsArmed = appMode === 'pro' && manualFaultInjection;

  // ── Cancel wiring (shown whenever a wire is in progress) ───────────────
  const ui = useUiStore.getState();
  const hasPendingWire = !!ui.pendingWireFrom || !!ui.pendingCustomPath;
  if (hasPendingWire) {
    items.push({
      icon: X,
      label: 'Cancel Wiring',
      shortcut: 'Esc',
      action: () => {
        const s = useUiStore.getState();
        if (s.pendingCustomPath) s.cancelCustomPath();
        s.setPendingWireFrom(null);
        s.setMode('idle');
        close();
      },
      danger: true,
    });
    items.push({ separator: true });
  }

  // ── Context-specific items ─────────────────────────────────────────────

  if (target.kind === 'component') {
    const comp = useCircuitStore.getState().components.find((c) => c.id === target.id);
    const def = comp ? COMPONENT_DEFS[comp.type] : null;

    items.push({
      icon: MousePointerClick,
      label: 'Select',
      action: () => {
        useCircuitStore.getState().selectComponent(target.id);
        close();
      },
    });

    if (def?.isSwitch) {
      const isOn = comp?.state.on === true;
      const nextChangeoverPort = def.changeover
        ? def.ports[isOn ? def.changeover.offPortIndex : def.changeover.onPortIndex]?.label
        : null;
      items.push({
        icon: Power,
        label: def.isMomentary
          ? isOn
            ? 'Release button'
            : 'Press and hold'
          : nextChangeoverPort
            ? `Switch to ${nextChangeoverPort}`
            : isOn
              ? 'Turn Off'
              : 'Turn On',
        momentaryId: def.isMomentary ? target.id : undefined,
        action: () => {
          if (!def.isMomentary) useCircuitStore.getState().toggleSwitch(target.id);
          close();
        },
      });
    }

    items.push({
      icon: Zap,
      label: 'Start Wire From Here',
      shortcut: 'W',
      action: () => {
        const compDef = comp ? COMPONENT_DEFS[comp.type] : null;
        if (compDef && compDef.ports.length > 0) {
          useUiStore.getState().setMode('wiring');
          useUiStore.getState().setPendingWireFrom({ componentId: target.id, portIndex: 0 });
        }
        close();
      },
    });

    const selectedComponentIds = useCircuitStore.getState().selectedComponentIds;
    const isMultiSelected =
      selectedComponentIds.length > 1 && selectedComponentIds.includes(target.id);
    const compGroup = useCircuitStore
      .getState()
      .componentGroups.find((g) => g.componentIds.includes(target.id));

    if (isMultiSelected) {
      items.push({
        icon: Copy,
        label: `Group Selected (${selectedComponentIds.length} components)`,
        shortcut: 'Ctrl+G',
        action: () => {
          useCircuitStore
            .getState()
            .createGroup(
              `Group ${useCircuitStore.getState().componentGroups.length + 1}`,
              selectedComponentIds,
            );
          useUiStore
            .getState()
            .addLog(`Grouped ${selectedComponentIds.length} components`, 'success');
          close();
        },
      });
      items.push({
        icon: RotateCw,
        label: 'Rotate All Selected 90°',
        shortcut: 'Shift+R',
        disabled: simRunning,
        action: () => {
          useCircuitStore.getState().rotateSelected(90);
          useUiStore
            .getState()
            .addLog(`Rotated ${selectedComponentIds.length} components 90°`, 'info');
          close();
        },
      });
      items.push({
        icon: Trash2,
        label: `Delete Selected (${selectedComponentIds.length} items)`,
        shortcut: 'Del',
        danger: true,
        disabled: simRunning,
        action: () => {
          useCircuitStore.getState().removeSelected();
          useUiStore.getState().addLog(`Deleted ${selectedComponentIds.length} components`, 'info');
          close();
        },
      });
      items.push({ separator: true });
    } else if (compGroup) {
      items.push({
        icon: Unlink,
        label: `Ungroup '${compGroup.name}'`,
        shortcut: 'Ctrl+Shift+G',
        action: () => {
          useCircuitStore.getState().ungroup(compGroup.id);
          useUiStore.getState().addLog(`Ungrouped '${compGroup.name}'`, 'info');
          close();
        },
      });
      items.push({ separator: true });
    }

    items.push({
      icon: RotateCw,
      label: 'Rotate 90°',
      shortcut: 'R / Shift+R',
      disabled: simRunning,
      action: () => {
        useCircuitStore.getState().rotateComponent(target.id, 90);
        useUiStore.getState().addLog(`Rotated ${def?.label ?? 'component'} 90°`, 'info');
        close();
      },
    });

    // ── Fault Simulation Injection (Pro + master toggle only) ──────
    if (faultsArmed) {
      items.push({ separator: true });

      if (comp?.state.fault) {
        items.push({
          icon: ShieldCheck,
          label: 'Clear Injected Fault',
          action: async () => {
            if (!(await useCircuitStore.getState().setComponentFault(target.id, undefined))) return;
            useUiStore
              .getState()
              .addLog(`Cleared fault on ${def?.label ?? 'component'}`, 'success');
            close();
          },
        });
      }

      for (const fault of getAvailableFaultsForTarget(cs, { type: 'component', id: target.id })) {
        const coverage = assessFaultTarget(cs, fault.id, { type: 'component', id: target.id });
        items.push({
          icon: Scissors,
          label: `Inject ${fault.id === 'short-circuit' ? 'Short Circuit' : fault.label}${coverage.coverage === 'not-assessed' ? ' (not assessed)' : ''}`,
          disabled: comp?.state.fault === fault.id,
          action: async () => {
            if (!(await useCircuitStore.getState().setComponentFault(target.id, fault.id))) return;
            useUiStore.getState().addLog(`${fault.label}: ${coverage.reason}`, 'warning');
            close();
          },
        });
      }
    } // end faultsArmed (component)

    items.push({ separator: true });

    items.push({
      icon: Trash2,
      label: 'Delete Component',
      shortcut: 'Del',
      danger: true,
      disabled: simRunning,
      action: () => {
        requestDeleteComponent(target.id);
        close();
      },
    });
  }

  if (target.kind === 'wire') {
    const wire = useCircuitStore.getState().wires.find((w) => w.id === target.id);

    items.push({
      icon: Sliders,
      label: 'Inspect Wire Properties',
      action: () => {
        useCircuitStore.getState().selectWire(target.id);
        useCircuitStore.getState().selectComponent(null);
        useUiStore.getState().setInspectorCollapsed(false);
        close();
      },
    });

    items.push({
      icon: ArrowRightLeft,
      label: 'Swap From / To Terminals',
      action: () => {
        useCircuitStore.getState().swapWireEndpoints(target.id);
        useUiStore.getState().addLog('Reversed wire connection terminals', 'info');
        close();
      },
    });

    items.push({
      icon: Route,
      label: 'Reroute Wire',
      shortcut: 'R',
      action: () => {
        useCircuitStore.getState().selectWire(target.id);
        const ui = useUiStore.getState();
        ui.setMode('wiring');
        ui.setReroute({ wireId: target.id, end: 'to', source: 'armed' });
        ui.addLog('Reroute armed — click a port to reconnect.', 'info');
        close();
      },
    });

    // ── Wire Fault Simulation Options (Pro + master toggle only) ──
    if (faultsArmed) {
      items.push({ separator: true });

      if (
        wire?.fault ||
        cs.faults.some(
          (fault) =>
            !fault.resolved && fault.target.type === 'wire' && fault.target.id === target.id,
        )
      ) {
        items.push({
          icon: ShieldCheck,
          label: 'Clear Wire Fault',
          action: async () => {
            if (!(await useCircuitStore.getState().setWireFault(target.id, undefined))) return;
            useUiStore.getState().addLog('Cleared fault from wire', 'success');
            close();
          },
        });
      }

      for (const fault of getAvailableFaultsForTarget(cs, { type: 'wire', id: target.id })) {
        const coverage = assessFaultTarget(cs, fault.id, { type: 'wire', id: target.id });
        items.push({
          icon: Scissors,
          label: `Inject ${fault.id === 'short-circuit' ? 'Short Circuit' : fault.label}${coverage.coverage === 'not-assessed' ? ' (not assessed)' : ''}`,
          disabled: wire?.fault === fault.id,
          action: async () => {
            if (
              !(await useCircuitStore
                .getState()
                .injectFault({ type: fault.id, target: { type: 'wire', id: target.id } }))
            )
              return;
            useUiStore.getState().addLog(`${fault.label}: ${coverage.reason}`, 'warning');
            close();
          },
        });
      }
    } // end faultsArmed (wire)

    items.push({ separator: true });

    items.push({
      icon: Trash2,
      label: 'Delete Wire',
      shortcut: 'Del',
      danger: true,
      disabled: simRunning,
      action: () => {
        requestDeleteWire(target.id);
        close();
      },
    });
  }

  if (target.kind === 'canvas') {
    items.push({
      icon: Zap,
      label: 'Wire Mode',
      shortcut: 'W',
      action: () => {
        useUiStore.getState().setMode('wiring');
        close();
      },
    });

    items.push({
      icon: MousePointerClick,
      label: 'Select Mode',
      shortcut: 'V',
      action: () => {
        useUiStore.getState().setMode('idle');
        close();
      },
    });

    items.push({ separator: true });

    items.push({
      icon: Unlink,
      label: 'Clear All Wires',
      disabled: simRunning,
      action: () => {
        requestClearWires();
        close();
      },
      danger: true,
    });

    items.push({
      icon: Trash2,
      label: 'Clear All Components',
      disabled: simRunning,
      action: () => {
        requestClearAll();
        close();
      },
      danger: true,
    });

    items.push({
      icon: RefreshCcw,
      label: 'Reset to Default Circuit',
      disabled: simRunning,
      action: () => {
        requestReset();
        close();
      },
      danger: true,
    });
  }

  // ── Shared items ───────────────────────────────────────────────────────

  if (items.length > 0 && !isSeparator(items[items.length - 1])) {
    items.push({ separator: true });
  }

  items.push({
    icon: HelpCircle,
    label: 'What is ElectraSim?',
    action: () => {
      useUiStore.getState().setWelcomeOpen(true);
      close();
    },
  });

  items.push({
    icon: Download,
    label: 'Import / Export',
    shortcut: 'Ctrl+E',
    action: () => {
      useUiStore.getState().setImportExportOpen(true);
      close();
    },
  });

  items.push({
    icon: BookOpen,
    label: 'Documentation',
    action: () => {
      useUiStore.getState().setDocsOpen(true);
      close();
    },
  });

  items.push({
    icon: Keyboard,
    label: 'Keyboard Shortcuts',
    action: () => {
      useUiStore.getState().setDocsOpen(true, 'shortcuts');
      close();
    },
  });

  items.push({
    icon: Settings,
    label: 'Settings',
    action: () => {
      useUiStore.getState().setSettingsOpen(true);
      close();
    },
  });

  return items;
}

// ─── Component ───────────────────────────────────────────────────────────────
