/** Editor adapter; drawing is shared with the store-independent public preview. */
import { emojiDataUri } from '../../lib/emoji/emojiSvg';
import { useSettingsStore, useUiStore } from '../../store';
import { useEmojiGlyphsReady } from '../hooks/useEmojiGlyphsReady';
import { ComponentSceneNode, type ComponentSceneNodeProps } from './ComponentSceneNode';

export type ComponentNodeProps = Omit<
  ComponentSceneNodeProps,
  | 'appearance'
  | 'diagnosticOverlayMode'
  | 'autoLabelsEnabled'
  | 'appMode'
  | 'readOnly'
  | 'badges'
  | 'onInspect'
>;
export function ComponentNode(props: ComponentNodeProps) {
  useEmojiGlyphsReady();
  const appearance = useSettingsStore((s) => s.componentAppearance);
  const diagnosticOverlayMode = useSettingsStore((s) => s.diagnosticOverlayMode);
  const autoLabelsEnabled = useSettingsStore((s) => s.automaticComponentLabels);
  const appMode = useSettingsStore((s) => s.appMode);
  return (
    <ComponentSceneNode
      {...props}
      appearance={appearance}
      diagnosticOverlayMode={diagnosticOverlayMode}
      autoLabelsEnabled={autoLabelsEnabled}
      appMode={appMode}
      badges={{
        short: emojiDataUri('bolt', 11) ?? '',
        tripped: emojiDataUri('bolt', 24) ?? '',
        blown: emojiDataUri('boom', 24) ?? '',
      }}
      onInspect={() => {
        useUiStore.getState().setInspectorOpen(true);
        useUiStore.getState().setInspectorCollapsed(false);
        useUiStore.getState().setActiveInspectorTab('properties');
      }}
    />
  );
}
