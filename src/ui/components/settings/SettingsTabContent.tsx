import { useSettingsStore } from '../../../store';
import { AboutTab } from './AboutTab';
import {
  CanvasPresetSelector,
  ElectricToggle,
  RoutingStyleSelector,
  SchemeSelector,
  TabIntro,
  WireColorStandardSelector,
} from './SettingsControls';
import type { SettingsTab } from './types';

export function SettingsTabContent({ activeTab }: { activeTab: SettingsTab }) {
  switch (activeTab) {
    case 'editing':
      return <EditingSettings />;
    case 'display':
      return <DisplaySettings />;
    case 'simulation':
      return <SimulationSettings />;
    case 'about':
      return <AboutTab />;
  }
}

function EditingSettings() {
  const confirmDelete = useSettingsStore((state) => state.confirmDelete);
  const customWiringMode = useSettingsStore((state) => state.customWiringMode);
  const routingStyle = useSettingsStore((state) => state.routingStyle);
  const autoWireJoints = useSettingsStore((state) => state.autoWireJoints);
  const showRecentComponents = useSettingsStore((state) => state.showRecentComponents);
  const setSetting = useSettingsStore((state) => state.setSetting);

  return (
    <>
      <TabIntro
        icon="🔌"
        title="Editing Behaviour"
        desc="Controls how the canvas responds to your interactions — wire routing, confirmations, and placement."
      />
      <ElectricToggle
        label="Confirm before deleting"
        description="When enabled, a safety dialog appears before removing any component or wire. Disable to delete instantly with no prompt."
        preview={
          confirmDelete
            ? '⚠️ A confirmation dialog will appear before each deletion.'
            : '🗑️ Components and wires are deleted immediately — no dialog shown.'
        }
        checked={confirmDelete}
        onChange={(value) => setSetting('confirmDelete', value)}
      />
      <ElectricToggle
        label="Custom wiring mode"
        description="Click a port to start a polyline, click empty canvas to add corners, then click the destination port to commit. Each completed wire is one undo entry. Press Esc to cancel. Disable to use the standard single-click wiring."
        preview={
          customWiringMode
            ? '✏️ Click port → click corners → click port. Full manual control over wire routing.'
            : '⚡ Standard mode: click source port then destination port — path routed automatically.'
        }
        checked={customWiringMode}
        onChange={(value) => setSetting('customWiringMode', value)}
      />
      <RoutingStyleSelector
        value={routingStyle}
        onChange={(value) => setSetting('routingStyle', value)}
      />
      <ElectricToggle
        label="Auto joint at wire crossings"
        description="When two bezier wires cross each other, automatically place a connection joint (dot) at the crossing point. A standard schematic convention for marking intentional junctions. Applies to bezier wires only."
        preview={
          autoWireJoints
            ? '🔘 A joint dot is drawn wherever two bezier wires cross.'
            : '◯ Crossed wires are shown as plain crossings with no joint dot.'
        }
        checked={autoWireJoints}
        onChange={(value) => setSetting('autoWireJoints', value)}
      />
      <ElectricToggle
        label="Recent components in palette"
        description="Show a quick-access row of your six most recently placed components at the top of the palette. Disable for a cleaner, category-only palette."
        preview={
          showRecentComponents
            ? '🕘 The palette opens with your recently placed components on top.'
            : '📂 The palette shows regional essentials and categories only.'
        }
        checked={showRecentComponents}
        onChange={(value) => setSetting('showRecentComponents', value)}
      />
    </>
  );
}

function DisplaySettings() {
  const showTooltips = useSettingsStore((state) => state.showTooltips);
  const colorScheme = useSettingsStore((state) => state.colorScheme);
  const showGrid = useSettingsStore((state) => state.showGrid);
  const showMiniMap = useSettingsStore((state) => state.showMiniMap);
  const canvasPreset = useSettingsStore((state) => state.canvasPreset);
  const wireColorStandard = useSettingsStore((state) => state.wireColorStandard);
  const setSetting = useSettingsStore((state) => state.setSetting);

  return (
    <>
      <TabIntro
        icon="🖥️"
        title="Canvas Display"
        desc="Visual preferences — how the canvas looks, color mode, regional wire standards, and hover information."
      />
      <ElectricToggle
        label="Show component tooltips"
        description="Hover over any component to see its name, port types, and live energised state. Useful while learning the circuit layout."
        preview={
          showTooltips
            ? '💬 Hovering a component shows a tooltip with name, ports, and live state.'
            : '🔕 No tooltips shown on hover — cleaner canvas for experienced users.'
        }
        checked={showTooltips}
        onChange={(value) => setSetting('showTooltips', value)}
      />
      <SchemeSelector value={colorScheme} onChange={(value) => setSetting('colorScheme', value)} />
      <WireColorStandardSelector
        value={wireColorStandard}
        onChange={(value) => setSetting('wireColorStandard', value)}
      />
      <ElectricToggle
        label="Show dot grid"
        description="Display the background dot grid on the canvas. Disable for a clean, grid-free canvas."
        preview={
          showGrid
            ? '🔲 Dot grid visible — helps with alignment and component placement.'
            : '⬜ Grid hidden — minimal, distraction-free canvas.'
        }
        checked={showGrid}
        onChange={(value) => setSetting('showGrid', value)}
      />
      <ElectricToggle
        label="Show mini-map"
        description="Display a thumbnail overview of the full canvas in the bottom-right corner. Click it to pan to any area."
        preview={
          showMiniMap
            ? '🗺️ Mini-map visible — click any spot to jump the canvas there.'
            : '🔕 Mini-map hidden — full canvas area available.'
        }
        checked={showMiniMap}
        onChange={(value) => setSetting('showMiniMap', value)}
      />
      <CanvasPresetSelector
        value={canvasPreset}
        onChange={(value) => setSetting('canvasPreset', value)}
      />
    </>
  );
}

function SimulationSettings() {
  const currentFlowAnimation = useSettingsStore((state) => state.currentFlowAnimation);
  const activeLoadEffects = useSettingsStore((state) => state.activeLoadEffects);
  const reducedEffects = useSettingsStore((state) => state.reducedEffects);
  const ohmageddonMode = useSettingsStore((state) => state.ohmageddonMode);
  const setSetting = useSettingsStore((state) => state.setSetting);

  return (
    <>
      <TabIntro
        icon="⚡"
        title="Simulation Visuals"
        desc="Control how live electricity is rendered on the canvas — flow animations, load effects, and performance mode."
      />
      <ElectricToggle
        label="Current flow animation"
        description="Animated dashes move along energised wires showing current direction. Runs at 24 fps to balance visual clarity and CPU cost."
        preview={
          currentFlowAnimation
            ? '〰️ Dashes animate along live wires, indicating current direction and polarity.'
            : '─ Energised wires are highlighted statically — no moving dashes.'
        }
        checked={currentFlowAnimation}
        onChange={(value) => setSetting('currentFlowAnimation', value)}
      />
      <ElectricToggle
        label="Active load effects"
        description="Energised loads show visual feedback: bulbs glow, fans rotate, motors and bells pulse. Disable on low-end hardware for smoother performance."
        preview={
          activeLoadEffects
            ? '💡 Bulbs glow, fans spin, motors and bells pulse when energised by a live circuit.'
            : '○ Load components show a static energised colour with no animations.'
        }
        checked={activeLoadEffects}
        onChange={(value) => setSetting('activeLoadEffects', value)}
      />
      <ElectricToggle
        label="Reduced effects (performance mode)"
        description="Disables wire glow and flow animation to save CPU — critical on low-end devices. Also auto-activates when your circuit exceeds 50 components."
        preview={
          reducedEffects
            ? '🏎️ Performance mode ON — wire glow and flow animation suppressed for max fps.'
            : '✨ Full visuals ON — glow halos and animations active (auto-disables at 50+ components).'
        }
        checked={reducedEffects}
        onChange={(value) => setSetting('reducedEffects', value)}
      />
      {/*
       * Ohmageddon Mode (plan §23, §24).
       *
       * The label and description are the plan's own words. §23 shows the
       * control as `Ohmageddon Mode / [ OFF ]` with the line "Deliberately
       * difficult diagnostic challenges. Enable only if you want the challenge
       * to fight back." — reproduced rather than paraphrased, because the
       * warning is the point: §24 requires that a normal user can never
       * *accidentally* end up in this mode.
       *
       * The preview line states plainly what changes, and deliberately
       * reassures on the one thing that does not (§26: the simulation stays
       * honest), so nobody switches it off believing their circuits were lying
       * to them.
       */}
      <ElectricToggle
        label="😈 Ohmageddon Mode"
        description="Deliberately difficult diagnostic challenges. Enable only if you want the challenge to fight back. Adds red herrings, faults placed far from the symptom, and fewer hints to the Diagnosis Lab. The electrical simulation stays completely honest — only the diagnosis gets harder."
        preview={
          ohmageddonMode
            ? '😈 Rage tiers are selectable in the Diagnosis Lab. Expect decoys, remote faults and rationed hints.'
            : '🎓 Normal educational challenges only — no red herrings, no chaos, full hints.'
        }
        checked={ohmageddonMode}
        onChange={(value) => setSetting('ohmageddonMode', value)}
      />
    </>
  );
}
