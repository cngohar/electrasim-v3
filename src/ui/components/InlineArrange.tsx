import {
  AlignCenterHorizontal,
  AlignCenterVertical,
  AlignEndHorizontal,
  AlignEndVertical,
  AlignStartHorizontal,
  AlignStartVertical,
  RotateCcw,
  RotateCw,
  SpaceIcon,
} from 'lucide-react';
import { useCircuitStore, useUiStore } from '../../store';
import { useConfigurationLockReason } from '../../store/electricalEditing';
import { isCircuitReadOnly, useSimulatorAccess } from '../../store/simulatorAccess';
import { alignSelected, distributeSelected } from '../canvas-actions';

/** Inline commands operate on the current selection and share the canvas undo history. */
export function InlineArrange({ componentId }: { componentId: string }) {
  const ids = useCircuitStore((s) => s.selectedComponentIds);
  const selected = useCircuitStore((s) => s.selectedComponentId);
  const configurationLocked = useConfigurationLockReason();
  useSimulatorAccess();
  const circuit = useCircuitStore((s) => s);
  const locked =
    configurationLocked ?? (isCircuitReadOnly(circuit) ? 'This circuit is read-only.' : null);
  const count = ids.includes(componentId) ? ids.length : selected === componentId ? 1 : 0;
  if (!count) return null;
  const rotate = (angle: number) => {
    if (count > 1) useCircuitStore.getState().rotateSelected(angle);
    else useCircuitStore.getState().rotateComponent(componentId, angle);
    useUiStore.getState().setContextMenu(null);
  };
  const align = [
    ['left', 'Align left edges', AlignStartHorizontal],
    ['center-h', 'Align horizontal centres', AlignCenterHorizontal],
    ['right', 'Align right edges', AlignEndHorizontal],
    ['top', 'Align top edges', AlignStartVertical],
    ['center-v', 'Align vertical centres', AlignCenterVertical],
    ['bottom', 'Align bottom edges', AlignEndVertical],
  ] as const;
  return (
    <div className="table-inline-arrange">
      {count >= 2 && (
        <fieldset disabled={!!locked}>
          <legend>Align</legend>
          <div>
            {align.map(([direction, label, Icon]) => (
              <button
                key={direction}
                type="button"
                aria-label={label}
                title={locked ?? label}
                onClick={() => {
                  alignSelected(direction);
                  useUiStore.getState().setContextMenu(null);
                }}
              >
                <Icon size={16} />
              </button>
            ))}
          </div>
        </fieldset>
      )}
      {count >= 3 && (
        <fieldset disabled={!!locked}>
          <legend>Distribute</legend>
          <div>
            {(['horizontal', 'vertical'] as const).map((direction) => (
              <button
                key={direction}
                type="button"
                aria-label={`Distribute ${direction === 'horizontal' ? 'horizontally' : 'vertically'}`}
                title={locked ?? `Distribute ${direction}`}
                onClick={() => {
                  distributeSelected(direction);
                  useUiStore.getState().setContextMenu(null);
                }}
              >
                <SpaceIcon
                  size={16}
                  style={direction === 'vertical' ? { rotate: '90deg' } : undefined}
                />
              </button>
            ))}
          </div>
        </fieldset>
      )}
      <fieldset disabled={!!locked}>
        <legend>Rotate</legend>
        <div>
          <button
            type="button"
            aria-label="Rotate counterclockwise 90 degrees"
            title={locked ?? 'Rotate −90°'}
            onClick={() => rotate(-90)}
          >
            <RotateCcw size={16} />
          </button>
          <button
            type="button"
            aria-label="Rotate clockwise 90 degrees"
            title={locked ?? 'Rotate +90°'}
            onClick={() => rotate(90)}
          >
            <RotateCw size={16} />
          </button>
          <button
            type="button"
            aria-label="Rotate 180 degrees"
            title={locked ?? 'Rotate 180°'}
            onClick={() => rotate(180)}
          >
            180°
          </button>
        </div>
      </fieldset>
    </div>
  );
}
