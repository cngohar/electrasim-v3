import { COMPONENT_DEFS, type ComponentInstance } from '@electrasim/domain';
import { useSettingsStore } from '../../store/settingsStore';
import { ComponentSymbol } from '../canvas/ComponentSymbol';
import { deviceImage } from '../canvas/deviceVectors';

export function ComponentPreview({ type, label }: { type: string; label: string }) {
  const appearance = useSettingsStore((s) => s.componentAppearance);
  const component: ComponentInstance = {
    id: 'preview',
    type,
    x: 0,
    y: 0,
    rotation: 0,
    state: { on: COMPONENT_DEFS[type]?.defaultOn ?? false },
  };
  const image = deviceImage(type);
  return (
    <span
      className="component-preview"
      role="img"
      aria-label={label}
      data-component-appearance={appearance}
    >
      {appearance !== 'symbols' && image && <img src={image} alt="" width="40" height="40" />}
      {(appearance !== 'icons' || !image) && (
        <svg viewBox="0 0 64 64" width="40" height="40" aria-hidden="true">
          <ComponentSymbol component={component} />
        </svg>
      )}
    </span>
  );
}
