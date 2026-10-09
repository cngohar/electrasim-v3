/**
 * ComponentNode — the per-component SVG node renderer (body, glyph, ports,
 * fault overlays, spark states).
 *
 * Physical device artwork shares canonical terminal geometry with the domain.
 * Safety overlays and keyboard targets remain independent of detail level.
 */

import {
  COMPONENT_DEFS,
  COMP_H,
  COMP_W,
  type ComponentInstance,
  type SimulationResult,
  checkFastCompatibility,
  instanceLabel,
  isAutomaticProtection,
} from '@electrasim/domain';
import type { MouseEvent, PointerEvent } from 'react';
import { emojiDataUri } from '../../lib/emoji/emojiSvg';
import { useSettingsStore } from '../../store';
import { useEmojiGlyphsReady } from '../hooks/useEmojiGlyphsReady';
import { ComponentSymbol } from './ComponentSymbol';
import { DeviceArtwork } from './DeviceArtwork';
import type { CanvasTheme, PortLoc } from './types';

const PORT_R = 5;

// Twemoji replicas for the fault/status badges drawn inside this SVG scene.
// Resolved at render time (not module scope) because the artwork table loads
// lazily, outside the initial bundle — see src/lib/emoji/emojiSvg.ts.
const shortCircuitBadgeUri = () => emojiDataUri('bolt', 11) ?? '';
const trippedBadgeUri = () => emojiDataUri('bolt', 24) ?? '';
const blownBadgeUri = () => emojiDataUri('boom', 24) ?? '';

/** Truncate a canvas label so it fits the component box without overflowing. */
function fitLabel(label: string, fontSize: number): string {
  // Usable width inside the component box (leave padding on both sides).
  const usablePx = COMP_W - 14;
  // Conservative glyph advance calculation
  const avgAdvance = fontSize * 0.6;
  const maxChars = Math.max(5, Math.floor(usablePx / avgAdvance));
  if (label.length <= maxChars) return label;
  return `${label.slice(0, Math.max(1, maxChars - 1))}…`;
}

export interface ComponentNodeProps {
  component: ComponentInstance;
  componentsById: ReadonlyMap<string, ComponentInstance>;
  simulation?: SimulationResult | null;
  theme: CanvasTheme;
  selected: boolean;
  flagged?: boolean;
  compatibilityReview?: 'incompatible' | 'unassessed';
  energized: boolean;
  error: boolean;
  wireMode: boolean;
  pendingFrom: PortLoc | null;
  customPathFrom: PortLoc | null;
  activeLoadEffects: boolean;
  reducedDetails: boolean;
  traceComponentIds?: Set<string> | null;
  onPointerDown: (component: ComponentInstance, event: PointerEvent<SVGGElement>) => void;
  onSelect?: (id: string | null) => void;
  onToggleSwitch?: (id: string) => void;
  onSetSwitchState?: (id: string, on: boolean) => void;
  onPortClick: (componentId: string, portIndex: number) => void;
  onHoverChange: (id: string | null) => void;
  onContextMenu: (id: string, event: MouseEvent<SVGGElement>) => void;
}

export function ComponentNode({
  component,
  componentsById,
  simulation,
  theme,
  selected,
  flagged,
  compatibilityReview,
  energized,
  error,
  wireMode,
  pendingFrom,
  customPathFrom,
  activeLoadEffects,
  reducedDetails,
  traceComponentIds,
  onPointerDown,
  onSelect,
  onToggleSwitch,
  onSetSwitchState,
  onPortClick,
  onHoverChange,
  onContextMenu,
}: ComponentNodeProps) {
  // Fault badges and pictograph icons come from the lazily-loaded Twemoji
  // table; re-render once it arrives (no-op after the first load).
  useEmojiGlyphsReady();
  const appearance = useSettingsStore((s) => s.componentAppearance);
  const definition = COMPONENT_DEFS[component.type];
  // Catalogue labels embed a *default* rating ("RCBO (32A 30mA)"); an instance
  // may override it via `state.customMaxAmps`. Draw the instance's real rating
  // so the canvas agrees with the inspector, the brief and the Diagnosis Lab.
  const baseLabel = instanceLabel(component);
  const displayLabel =
    definition?.isLoad && component.state.customPowerWatts !== undefined
      ? `${baseLabel.replace(/\s*\([^)]*W[^)]*\)/g, '')} (${component.state.customPowerWatts}W)`
      : baseLabel;
  if (!definition) return null;

  const coilState = simulation?.coilStates?.[component.id];
  const isOn =
    coilState ??
    simulation?.timerContactStates?.[component.id] ??
    simulation?.protectionContactStates?.[component.id] ??
    (component.state.on === true && (!definition.isDimmer || (component.state.speed ?? 3) > 0));
  const isTripped = component.state.isTripped === true;
  const active = energized || (definition.isSwitch && (Boolean(definition.changeover) || isOn));
  const fault = component.state.fault;
  const faultColor =
    fault === 'short-circuit'
      ? '#ef4444'
      : fault === 'open-circuit'
        ? '#dc2626'
        : fault === 'reverse-polarity'
          ? '#f97316'
          : fault === 'earth-fault'
            ? '#eab308'
            : fault === 'smooth-dc-residual'
              ? '#8b5cf6'
              : fault === 'arc-fault'
                ? '#dc2626'
                : null;
  const stroke = faultColor
    ? faultColor
    : error
      ? '#ef4444'
      : selected
        ? theme.component.selectedRing
        : active
          ? theme.component.accent
          : theme.component.border;
  const x = component.x - COMP_W / 2;
  const y = component.y - COMP_H / 2;
  const rotation = (component.rotation ?? 0) % 360;

  const isBulbLike =
    component.type.includes('bulb') ||
    component.type.includes('light') ||
    component.type.includes('lamp') ||
    component.type === 'tube-light';

  const showBulbGlow = activeLoadEffects && energized && isBulbLike;
  const changeoverPositionIndex = definition.changeover
    ? isOn
      ? definition.changeover.onPortIndex
      : definition.changeover.offPortIndex
    : null;
  const changeoverPosition =
    changeoverPositionIndex === null ? null : definition.ports[changeoverPositionIndex]?.label;

  const isDimmedByTrace = traceComponentIds != null && !traceComponentIds.has(component.id);
  const isHighlightedInTrace = Boolean(traceComponentIds?.has(component.id));

  const diagnosticOverlayMode = useSettingsStore((s) => s.diagnosticOverlayMode);
  // Temperature needs a declared thermal law. A solved power/current value
  // alone cannot supply a temperature or destruction prediction.
  const autoLabelsEnabled = useSettingsStore((s) => s.automaticComponentLabels);
  const compThermal = simulation?.legacyObservation
    ? undefined
    : simulation?.thermalData?.[component.id];
  const showHeatOnlyCard =
    diagnosticOverlayMode === 'heat' && Number.isFinite(compThermal?.temperature);
  const powerW =
    compThermal?.powerWatts ?? simulation?.componentCalculations?.[component.id]?.powerWatts ?? 0;
  const tempC = compThermal?.temperature ?? 0;
  const thermalColor =
    compThermal?.colorCode ??
    (tempC >= 75 ? '#ef4444' : tempC >= 55 ? '#f97316' : tempC >= 40 ? '#eab308' : '#22c55e');

  return (
    <g
      data-component-id={component.id}
      data-component-appearance={appearance}
      data-render-detail={reducedDetails ? 'reduced' : 'full'}
      data-compatibility={compatibilityReview}
      transform={`translate(${x} ${y}) rotate(${rotation} ${COMP_W / 2} ${COMP_H / 2})`}
      opacity={isDimmedByTrace ? 0.2 : 1}
      onPointerEnter={() => onHoverChange(component.id)}
      onPointerLeave={() => onHoverChange(null)}
      onContextMenu={(event) => onContextMenu(component.id, event)}
    >
      {compatibilityReview && (
        <g
          pointerEvents="none"
          aria-label={`Electrical compatibility ${compatibilityReview}; inspect this component`}
        >
          <title>
            Electrical compatibility {compatibilityReview}. Inspect the component for ratings and
            supply findings.
          </title>
          <rect
            x={0}
            y={-16}
            width={COMP_W}
            height={13}
            rx={3}
            fill={compatibilityReview === 'incompatible' ? '#b91c1c' : '#92400e'}
          />
          <text x={COMP_W / 2} y={-6} textAnchor="middle" fontSize={8} fill="white">
            {compatibilityReview === 'incompatible' ? '! Incompatible' : '? Unassessed'}
          </text>
        </g>
      )}
      {showHeatOnlyCard && (
        <g pointerEvents="none">
          <rect
            x={-6}
            y={-6}
            width={COMP_W + 12}
            height={COMP_H + 12}
            rx={14}
            fill={thermalColor}
            fillOpacity={0.22}
            stroke={thermalColor}
            strokeWidth={2}
            strokeDasharray={tempC > 65 ? '4 2' : undefined}
            className={tempC > 65 ? 'animate-pulse' : undefined}
          />
          <g transform={`translate(${COMP_W / 2}, ${COMP_H + 14})`}>
            <rect
              x={-30}
              y={-9}
              width={60}
              height={16}
              rx={8}
              fill="#0f172a"
              stroke={thermalColor}
              strokeWidth={1.2}
            />
            <text
              x={0}
              y={2.5}
              textAnchor="middle"
              fontSize="8.5"
              fontWeight="bold"
              fill={thermalColor}
            >
              {Math.round(tempC)}°C · {powerW < 10 ? powerW.toFixed(1) : Math.round(powerW)}W
            </text>
          </g>
        </g>
      )}
      {isHighlightedInTrace && (
        <rect
          x={-5}
          y={-5}
          width={COMP_W + 10}
          height={COMP_H + 10}
          rx={12}
          fill="none"
          stroke="#3b82f6"
          strokeWidth={2.5}
          strokeDasharray="6 3"
          className="animate-pulse"
          pointerEvents="none"
        />
      )}
      <g
        role="button"
        data-component-hitbox
        data-component-type={component.type}
        tabIndex={0}
        aria-label={`${displayLabel} ${component.id}${selected ? ', selected' : ''}${
          definition.isSwitch
            ? definition.isMomentary
              ? `, ${isOn ? 'pressed' : 'released'}`
              : changeoverPosition
                ? `, position ${changeoverPosition}`
                : `, ${isOn ? 'on' : 'off'}`
            : ''
        }${isTripped ? ', tripped' : ''}`}
        aria-pressed={definition.isSwitch && !definition.isMomentary ? isOn : undefined}
        style={{ cursor: wireMode ? 'crosshair' : 'grab' }}
        onPointerDown={(event) => onPointerDown(component, event)}
        onClick={(event) => {
          event.stopPropagation();
          if (!event.shiftKey) onSelect?.(component.id);
        }}
        onDoubleClick={(event) => {
          event.stopPropagation();
          if (definition.isSwitch && !definition.isMomentary && coilState === undefined)
            onToggleSwitch?.(component.id);
        }}
        onKeyDown={(event) => {
          if (event.key !== 'Enter' && event.key !== ' ') return;
          event.preventDefault();
          event.stopPropagation();
          onSelect?.(component.id);
          if (definition.isSwitch && !definition.isMomentary && coilState === undefined) {
            if (coilState === undefined) onToggleSwitch?.(component.id);
          }
        }}
      >
        {flagged && (
          <rect
            x={-5}
            y={-5}
            width={COMP_W + 10}
            height={COMP_H + 10}
            rx={(theme.component.rounded || 8) + 4}
            ry={(theme.component.rounded || 8) + 4}
            fill="none"
            stroke="#ef4444"
            strokeWidth={2.5}
            strokeDasharray="6 4"
            className="animate-pulse"
            pointerEvents="none"
          />
        )}
        <rect
          data-device-frame
          width={COMP_W}
          height={COMP_H}
          rx={theme.component.rounded}
          ry={theme.component.rounded}
          fill={theme.component.bg}
          stroke={stroke}
          strokeWidth={selected || error ? 2 : active ? 1.5 : 1}
        />
        {appearance !== 'symbols' && (
          <g transform={appearance === 'both' ? 'translate(0 9) scale(.64)' : undefined}>
            <DeviceArtwork
              component={
                coilState === undefined
                  ? component
                  : { ...component, state: { ...component.state, on: coilState } }
              }
              energized={energized && fault !== 'open-circuit'}
              compact={reducedDetails && !selected}
              animate={activeLoadEffects}
            />
          </g>
        )}
        {appearance !== 'icons' && (
          <svg
            x={appearance === 'both' ? 55 : 21}
            y={appearance === 'both' ? 10 : 0}
            width={appearance === 'both' ? 38 : 58}
            height={appearance === 'both' ? 38 : 58}
            viewBox="0 0 64 64"
            color={theme.component.text}
            pointerEvents="none"
            aria-hidden="true"
          >
            <ComponentSymbol
              component={{ ...component, state: { ...component.state, on: isOn } }}
            />
          </svg>
        )}
        {(active || error) && (
          <circle cx={COMP_W - 8} cy={8} r={3} fill={error ? '#ef4444' : theme.component.accent} />
        )}
        {fault && (
          <>
            <rect
              width={COMP_W}
              height={COMP_H}
              rx={theme.component.rounded}
              ry={theme.component.rounded}
              fill="none"
              stroke={faultColor ?? '#ef4444'}
              strokeWidth={2.5}
              strokeOpacity={0.6}
              strokeDasharray="4 3"
              pointerEvents="none"
            />
            <rect
              x={COMP_W - 20}
              y={-1}
              width={20}
              height={13}
              rx={4}
              fill={faultColor ?? '#ef4444'}
              pointerEvents="none"
            />
            {fault === 'short-circuit' ? (
              <image
                href={shortCircuitBadgeUri()}
                x={COMP_W - 15.5}
                y={0.5}
                width={11}
                height={11}
                style={{ userSelect: 'none', pointerEvents: 'none' }}
              />
            ) : (
              <text
                x={COMP_W - 10}
                y={9}
                textAnchor="middle"
                fontSize="7"
                fontWeight="bold"
                fill="#fff"
                style={{ userSelect: 'none', pointerEvents: 'none' }}
              >
                {fault === 'open-circuit' ? '✂' : fault === 'reverse-polarity' ? '↔' : '⚠'}
              </text>
            )}
          </>
        )}
        {isTripped && !fault && (
          <>
            <rect
              width={COMP_W}
              height={COMP_H}
              rx={theme.component.rounded}
              ry={theme.component.rounded}
              fill="none"
              stroke="#f59e0b"
              strokeWidth={2.5}
              strokeOpacity={0.7}
              strokeDasharray="4 3"
              pointerEvents="none"
            />
            <rect
              x={COMP_W - 20}
              y={-1}
              width={20}
              height={13}
              rx={4}
              fill="#f59e0b"
              pointerEvents="none"
            />
            <text
              x={COMP_W - 10}
              y={9}
              textAnchor="middle"
              fontSize="7"
              fontWeight="bold"
              fill="#fff"
              style={{ userSelect: 'none', pointerEvents: 'none' }}
            >
              !
            </text>
          </>
        )}
        {definition.isSwitch && !error && (
          <circle
            cx={COMP_W - 8}
            cy={COMP_H - 8}
            r={3.5}
            fill={
              isTripped
                ? '#f59e0b'
                : definition.changeover
                  ? isOn
                    ? '#3b82f6'
                    : '#f59e0b'
                  : isOn
                    ? '#22c55e'
                    : '#ef4444'
            }
            stroke="#fff"
            strokeWidth={0.8}
          />
        )}
        {showBulbGlow &&
          (() => {
            const isCfl = component.type === 'bulb-cfl';
            const isFluorescent = component.type === 'tube-light';
            const isIncandescent = component.type === 'bulb-incandescent';
            const isHalogen = component.type === 'bulb-halogen';
            const isSmartRgb = component.type === 'bulb-smart-rgb';

            if (isCfl) {
              return (
                <g pointerEvents="none" className="electrasim-cfl-startup">
                  <circle cx={COMP_W / 2} cy={28} r={24} fill="#bae6fd" opacity={0.35} />
                  <circle cx={COMP_W / 2} cy={28} r={16} fill="#38bdf8" opacity={0.65} />
                  <circle cx={COMP_W / 2} cy={28} r={8} fill="#ffffff" opacity={0.9} />
                </g>
              );
            }
            if (isFluorescent) {
              return (
                <g pointerEvents="none" className="electrasim-fluorescent-startup">
                  <rect
                    x={10}
                    y={16}
                    width={COMP_W - 20}
                    height={24}
                    rx={6}
                    fill="#ecfeff"
                    opacity={0.4}
                  />
                  <rect
                    x={14}
                    y={20}
                    width={COMP_W - 28}
                    height={16}
                    rx={4}
                    fill="#67e8f9"
                    opacity={0.7}
                  />
                  <circle
                    cx={14}
                    cy={28}
                    r={3}
                    fill="#f97316"
                    opacity={0.85}
                    className="animate-ping"
                  />
                  <circle
                    cx={COMP_W - 14}
                    cy={28}
                    r={3}
                    fill="#f97316"
                    opacity={0.85}
                    className="animate-ping"
                  />
                </g>
              );
            }
            if (isIncandescent) {
              return (
                <g pointerEvents="none" className="electrasim-incandescent-startup">
                  <circle cx={COMP_W / 2} cy={28} r={26} fill="#ea580c" opacity={0.25} />
                  <circle cx={COMP_W / 2} cy={28} r={18} fill="#f97316" opacity={0.5} />
                  <circle cx={COMP_W / 2} cy={28} r={10} fill="#fef08a" opacity={0.85} />
                </g>
              );
            }
            if (isHalogen) {
              return (
                <g pointerEvents="none" className="electrasim-halogen-startup">
                  <circle cx={COMP_W / 2} cy={28} r={28} fill="#fed7aa" opacity={0.3} />
                  <circle cx={COMP_W / 2} cy={28} r={19} fill="#fde047" opacity={0.7} />
                  <circle cx={COMP_W / 2} cy={28} r={9} fill="#ffffff" opacity={0.95} />
                </g>
              );
            }
            if (isSmartRgb) {
              return (
                <g pointerEvents="none" className="electrasim-rgb-startup">
                  <circle cx={COMP_W / 2} cy={28} r={26} fill="#a855f7" opacity={0.3} />
                  <circle cx={COMP_W / 2} cy={28} r={17} fill="#06b6d4" opacity={0.55} />
                  <circle cx={COMP_W / 2} cy={28} r={9} fill="#f43f5e" opacity={0.85} />
                </g>
              );
            }
            return (
              <g pointerEvents="none" className="electrasim-led-startup">
                <circle cx={COMP_W / 2} cy={28} r={22} fill="#facc15" opacity={0.22} />
                <circle cx={COMP_W / 2} cy={28} r={14} fill="#fde047" opacity={0.6} />
                <circle cx={COMP_W / 2} cy={28} r={6} fill="#ffffff" opacity={0.9} />
              </g>
            );
          })()}
        {component.state.isBlown && (
          <g pointerEvents="none">
            <path
              d={`M${COMP_W / 2 - 22} 11l-5-7M${COMP_W / 2 + 22} 11l5-7M${COMP_W / 2} 8V0`}
              stroke="#f97316"
              strokeWidth="2"
              strokeLinecap="round"
              className="electrasim-blown-sparks"
            />
            <g className="electrasim-blown-smoke">
              <circle cx={COMP_W / 2 - 8} cy={12} r={5} />
              <circle cx={COMP_W / 2 + 2} cy={8} r={6} />
              <circle cx={COMP_W / 2 + 11} cy={14} r={4} />
            </g>
            {(() => {
              // "TRIPPED" vs "BLOWN": a device that automatically interrupts a
              // fault has operated and can be reset; anything else has failed.
              // An isolator is `isProtection` but does not trip, so the flag
              // alone would mislabel it.
              const isProtectionDevice = isAutomaticProtection(component.type);
              const label = isProtectionDevice ? 'TRIPPED' : 'BLOWN';
              const iconUri = isProtectionDevice ? trippedBadgeUri() : blownBadgeUri();
              const badgeBg = isProtectionDevice ? '#d97706' : '#ef4444';
              const pulseColor = isProtectionDevice ? '#f59e0b' : '#ef4444';

              return (
                <>
                  <rect
                    width={COMP_W}
                    height={COMP_H}
                    rx={theme.component.rounded}
                    ry={theme.component.rounded}
                    fill="#18181b"
                    fillOpacity={0.88}
                    stroke={badgeBg}
                    strokeWidth={2}
                    className="electrasim-shattered-body"
                  />
                  <path
                    d={`M${COMP_W / 2} 10l-4 13 8 8-11 8 5 13M${COMP_W / 2} 31l-14-6M${COMP_W / 2} 31l14-7`}
                    fill="none"
                    stroke="#e2e8f0"
                    strokeOpacity={0.75}
                    strokeWidth={1.4}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="electrasim-shattered-cracks"
                  />
                  <circle cx={COMP_W / 2} cy={COMP_H / 2} r={24} fill={pulseColor} opacity={0.35} />
                  <image
                    href={iconUri}
                    x={COMP_W / 2 - 12}
                    y={COMP_H / 2 - 12}
                    width={24}
                    height={24}
                    style={{ userSelect: 'none' }}
                  />
                  <rect
                    x={COMP_W / 2 - 27}
                    y={-9}
                    width={54}
                    height={15}
                    rx={7.5}
                    fill={badgeBg}
                    stroke="#ffffff"
                    strokeWidth={1}
                  />
                  <text
                    x={COMP_W / 2}
                    y={2}
                    textAnchor="middle"
                    fontSize="8"
                    fontWeight="bold"
                    fill="#ffffff"
                    style={{ userSelect: 'none' }}
                  >
                    {label}
                  </text>
                </>
              );
            })()}
          </g>
        )}
        <text
          x={COMP_W / 2}
          y={67}
          textAnchor="middle"
          fontSize={7.5}
          fontFamily="var(--canvas-mono)"
          fill="var(--canvas-text)"
          style={{ userSelect: 'none', pointerEvents: 'none' }}
        >
          <title>
            {displayLabel} · {component.id}
          </title>
          {fitLabel(
            autoLabelsEnabled && component.state.autoLabel
              ? `[${component.state.autoLabel}] ${definition.label.replace(/\s*\([^)]*\)/g, '')}`
              : definition.label.replace(/\s*\([^)]*\)/g, ''),
            7.5,
          )}
        </text>
      </g>

      {definition.isMomentary && (
        <g
          role="button"
          data-momentary-control={component.id}
          tabIndex={0}
          aria-label={`Press and hold ${definition.label} ${component.id}`}
          aria-pressed={isOn}
          style={{ cursor: 'pointer' }}
          onPointerDown={(event) => {
            if (event.button > 0) return;
            event.stopPropagation();
            event.currentTarget.setPointerCapture?.(event.pointerId);
            onSetSwitchState?.(component.id, true);
          }}
          onPointerUp={(event) => {
            event.stopPropagation();
            onSetSwitchState?.(component.id, false);
          }}
          onPointerCancel={(event) => {
            event.stopPropagation();
            onSetSwitchState?.(component.id, false);
          }}
          onLostPointerCapture={() => onSetSwitchState?.(component.id, false)}
          onClick={(event) => event.stopPropagation()}
          onBlur={() => onSetSwitchState?.(component.id, false)}
          onKeyDown={(event) => {
            if (event.key !== 'Enter' && event.key !== ' ') return;
            event.preventDefault();
            event.stopPropagation();
            if (!event.repeat) onSetSwitchState?.(component.id, true);
          }}
          onKeyUp={(event) => {
            if (event.key !== 'Enter' && event.key !== ' ') return;
            event.preventDefault();
            event.stopPropagation();
            onSetSwitchState?.(component.id, false);
          }}
        >
          <rect
            x={29}
            y={5}
            width={42}
            height={34}
            rx={9}
            fill={isOn ? theme.component.accent : theme.component.bg}
            fillOpacity={isOn ? 0.2 : 0.01}
            stroke={isOn ? theme.component.accent : theme.component.border}
            strokeOpacity={isOn ? 0.85 : 0.35}
            strokeWidth={isOn ? 1.5 : 1}
          />
        </g>
      )}

      {definition.ports.map((port, portIndex) => {
        const activeSource = pendingFrom ?? customPathFrom;
        const pending =
          activeSource?.componentId === component.id && activeSource.portIndex === portIndex;
        const appMode = useSettingsStore.getState().appMode ?? 'basic';
        const compat =
          activeSource && !pending
            ? checkFastCompatibility(
                activeSource,
                { componentId: component.id, portIndex },
                componentsById as Map<string, ComponentInstance>,
                appMode,
              )
            : null;

        const isValid = compat?.status === 'valid';
        const isWarning = compat?.status === 'warning';
        const isInvalid = compat?.status === 'invalid';

        const showPortLabel = Boolean(port.label && (!reducedDetails || selected));
        const isSelectedPosition = changeoverPositionIndex === portIndex;
        const labelInsideLeftEdge = port.relX === 0;

        let portStroke = theme.wire[port.type];
        let portStrokeWidth = 1.5;
        let portRadius = PORT_R;
        const portFill = pending ? theme.wire[port.type] : theme.port.bgIdle;

        if (pending) {
          portRadius = PORT_R + 2;
        } else if (isValid) {
          portStroke = '#22c55e';
          portStrokeWidth = 2.5;
          portRadius = PORT_R + 1;
        } else if (isWarning) {
          portStroke = '#f59e0b';
          portStrokeWidth = 2.5;
          portRadius = PORT_R + 1;
        } else if (isInvalid && activeSource) {
          portStroke = '#ef4444';
          portStrokeWidth = 1;
        }

        const portCircle = (
          <g data-port-group={portIndex}>
            {/* Visual Port Pin Circle */}
            <circle
              data-port-index={portIndex}
              cx={port.relX * COMP_W}
              cy={port.relY * COMP_H}
              r={portRadius}
              fill={portFill}
              stroke={portStroke}
              strokeWidth={portStrokeWidth}
              pointerEvents="none"
            />
            {!reducedDetails && (
              <path
                d={`M${port.relX * COMP_W - 2} ${port.relY * COMP_H}h4`}
                stroke={portStroke}
                strokeWidth={0.9}
                pointerEvents="none"
              />
            )}
            {/* Expanded Touchscreen Target Area (28px diameter target padding) */}
            <circle
              data-port-touch-target
              cx={port.relX * COMP_W}
              cy={port.relY * COMP_H}
              r={14}
              fill="transparent"
              tabIndex={0}
              role="button"
              aria-label={`${port.label ?? port.type} port on ${definition.label} ${component.id}${compat?.message ? ` (${compat.message})` : ''}`}
              style={{ cursor: 'crosshair', touchAction: 'none' }}
              onPointerDown={(event) => {
                if (event.button === 0) event.stopPropagation();
              }}
              onClick={(event) => {
                event.stopPropagation();
                onPortClick(component.id, portIndex);
              }}
              onKeyDown={(event) => {
                if (event.key !== 'Enter' && event.key !== ' ') return;
                event.preventDefault();
                event.stopPropagation();
                onPortClick(component.id, portIndex);
              }}
            >
              {compat?.message && <title>{compat.message}</title>}
            </circle>
          </g>
        );

        return (
          <g key={portIndex} opacity={activeSource && isInvalid && !pending ? 0.45 : 1}>
            {showPortLabel && (
              <text
                data-port-label={port.label}
                x={port.relX * COMP_W + (port.relX === 0 ? 9 : port.relX === 1 ? -9 : 0)}
                y={port.relY * COMP_H + (port.relY === 0 ? 12 : port.relY === 1 ? -9 : 2.5)}
                textAnchor={labelInsideLeftEdge ? 'start' : port.relX === 1 ? 'end' : 'middle'}
                fontSize="7"
                fontWeight={isSelectedPosition ? 700 : 600}
                fontFamily={theme.monoFont ?? theme.font}
                fill={isSelectedPosition ? theme.component.accent : theme.component.subtext}
                style={{ userSelect: 'none', pointerEvents: 'none' }}
              >
                {port.label}
              </text>
            )}
            {portCircle}
          </g>
        );
      })}
    </g>
  );
}
