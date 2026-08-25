/**
 * ComponentPropertiesView — selected-component properties tab.
 * Moved verbatim from the previous monolithic `Inspector.tsx`.
 */

import {
  Activity,
  FlaskConical,
  HelpCircle,
  Lock,
  RotateCcw,
  RotateCw,
  ShieldCheck,
  Sliders,
  Trash2,
} from 'lucide-react';
import {
  COMPONENT_DEFS,
  type ComponentInstance,
  type SimulationResult,
  getComponentHelp,
} from '../../../domain';
import { getStandard, recommendCurveForLoad, recommendMcbrating } from '../../../domain/standards';
import {
  setMomentarySwitchState,
  useCircuitStore,
  useSettingsStore,
  useUiStore,
} from '../../../store';
import { requestDeleteComponent } from '../../canvas-actions';
import { AnimatedNumber } from '../AnimatedNumber';
import { ComponentVoltageSparkline } from '../ComponentVoltageSparkline';
import { getComponentImage } from '../componentImages';
import { VALID_VARIANT_FAMILIES } from './variantFamilies';

export function ComponentPropertiesView({
  selectedComp,
  simResult,
}: {
  selectedComp: ComponentInstance;
  simResult: SimulationResult | null;
}) {
  const def = COMPONENT_DEFS[selectedComp.type];
  if (!def) return null;

  const isOn = selectedComp.state.on === true;
  const setPreviewVariant = useUiStore((s) => s.setPreviewVariant);
  const helpData = getComponentHelp(selectedComp.type, def.category);
  const simRunning = useUiStore((s) => s.simRunning);
  const globalVoltage = useCircuitStore((s) => s.globalVoltage);

  // Pro-mode gating + standard-driven protection recommendations.
  const appMode = useSettingsStore((s) => s.appMode);
  const manualFaultInjection = useSettingsStore((s) => s.manualFaultInjection);
  const regulationStandard = useSettingsStore((s) => s.regulationStandard);
  const isPro = appMode === 'pro';
  const faultsArmed = isPro && manualFaultInjection;
  // The per-component "Operating Voltage" is a design override for breaker
  // sizing (Pro feature). In Student mode it is read-only and reflects the
  // actual circuit supply so it can never diverge from the global voltage.
  const isSource = Boolean(
    def.isSource ||
      selectedComp.type.includes('supply') ||
      selectedComp.type.includes('mains') ||
      selectedComp.type.includes('terminal'),
  );
  const standard = getStandard(regulationStandard);

  // Recommended breaker: pick the smallest standard rating >= 1.25 × design
  // current (P/V) and the correct trip curve for motor / inductive loads.
  const loadPower = selectedComp.state.customPowerWatts ?? def.powerWatts ?? 0;
  const loadVoltage = selectedComp.state.customVoltage ?? def.maxVolts ?? standard.nominalVoltage;
  const protectionRecommendation = recommendMcbrating(loadPower, loadVoltage, standard);
  const recommendedCurve = recommendCurveForLoad(selectedComp.type, standard);
  const isProtectionOrSupply =
    def.isProtection ||
    def.isSource ||
    def.isJunction ||
    selectedComp.type.includes('mains') ||
    selectedComp.type.includes('supply') ||
    selectedComp.type.includes('terminal') ||
    selectedComp.type.includes('board');
  const showProtectionBadge = isPro && !isProtectionOrSupply && loadPower > 0;

  // Get live simulation data for this component
  const isEnergized = simResult?.energizedComponents.has(selectedComp.id) ?? false;
  const compCalc = simResult?.componentCalculations?.[selectedComp.id];
  const liveVoltage = compCalc?.voltage ?? 0;
  const liveCurrent = compCalc?.currentAmps ?? 0;
  const livePower = compCalc?.powerWatts ?? 0;

  // Determine fault state for visual feedback
  const isFaulted =
    selectedComp.state.isBlown || selectedComp.state.isTripped || selectedComp.state.fault;
  const isOvervoltage = liveVoltage > (selectedComp.state.customMaxVolts ?? def.maxVolts ?? 250);
  const isOvercurrent = liveCurrent > (selectedComp.state.customMaxAmps ?? def.maxAmps ?? 16);
  const isOverload = livePower > (selectedComp.state.customPowerWatts ?? def.powerWatts ?? 1000);

  const handleResetToDefault = () => {
    useCircuitStore.getState().updateComponentState(selectedComp.id, {
      customPowerWatts: undefined,
      customMaxAmps: undefined,
      customMaxVolts: undefined,
      customVoltage: undefined,
      customCableMm2: undefined,
      isBlown: false,
      blownReason: undefined,
      on: def.defaultOn ?? false,
      speed: undefined,
    });
  };

  const familyList = VALID_VARIANT_FAMILIES[selectedComp.type] || [];
  const variantEntries = Object.entries(COMPONENT_DEFS).filter(([key]) => familyList.includes(key));

  return (
    <div className="p-3.5 space-y-3.5 text-xs">
      {/* Component Image Card - Fully fitted without clipping */}
      <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-slate-950 dark:border-slate-800 shadow-inner group">
        <div className="relative h-32 w-full overflow-hidden bg-slate-900/90 flex items-center justify-center p-2">
          <img
            src={getComponentImage(selectedComp.type, def.category)}
            alt={def.label}
            referrerPolicy="no-referrer"
            className="h-full w-full max-h-28 object-contain drop-shadow-md"
          />
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/90 via-slate-950/40 to-transparent p-1.5 pointer-events-none" />
          <span className="absolute bottom-1 left-2 right-2 text-[10px] font-medium text-slate-200 truncate">
            {def.description || def.label}
          </span>
          <button
            type="button"
            title={`View ${def.label} Real-World Technical Specifications`}
            onClick={() => useUiStore.getState().setActiveComponentInfoType(selectedComp.type)}
            className="absolute top-2 right-2 px-2 py-1 bg-slate-900/80 hover:bg-sky-600 text-sky-400 hover:text-white rounded-lg border border-slate-700/80 transition cursor-pointer flex items-center gap-1 text-[10px] font-semibold shadow-md z-10"
          >
            <HelpCircle className="size-3.5" />
            <span>Specs</span>
          </button>
        </div>
      </div>

      {/* RCD residual-current type selector (RCD / RCBO only) */}
      {(selectedComp.type.includes('rcd') ||
        selectedComp.type.includes('rcbo') ||
        selectedComp.type.includes('afdd')) &&
        (() => {
          const currentType = selectedComp.state.rcdType ?? 'A';
          const options = [
            {
              type: 'AC' as const,
              hint: 'AC sine only',
              note: 'Legacy — not for new installs',
            },
            { type: 'A' as const, hint: '+ pulsating DC', note: 'Modern baseline (≤6 mA DC ok)' },
            { type: 'F' as const, hint: '+ mixed frequency', note: 'VSD loads (≤10 mA DC ok)' },
            { type: 'B' as const, hint: '+ SMOOTH DC', note: 'EV/PV (BS EN 62423)' },
          ];
          return (
            <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3 dark:border-slate-800 dark:bg-slate-950/60 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  Residual Current Type
                </span>
                <span className="rounded-full bg-sky-100 px-2 py-0.5 font-mono text-[10px] font-bold text-sky-700 dark:bg-sky-950 dark:text-sky-300">
                  Type {currentType}
                </span>
              </div>
              <div className="grid grid-cols-4 gap-1">
                {options.map((option) => (
                  <button
                    key={option.type}
                    type="button"
                    title={option.note}
                    onClick={() =>
                      useCircuitStore
                        .getState()
                        .updateComponentState(selectedComp.id, { rcdType: option.type })
                    }
                    className={`rounded-lg border p-1 text-center transition ${
                      currentType === option.type
                        ? 'border-sky-500 bg-sky-600 text-white dark:bg-sky-600'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300'
                    }`}
                  >
                    <span className="block text-[10px] font-bold">{option.type}</span>
                    <span
                      className={`block text-[8px] leading-tight ${
                        currentType === option.type
                          ? 'text-sky-100'
                          : 'text-slate-400 dark:text-slate-500'
                      }`}
                    >
                      {option.hint}
                    </span>
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">
                Smooth DC residual faults (EV/PV/VFD leakage) are invisible to Types AC/A/F — only
                Type B trips (BS 7671 Reg 531.3.3).
              </p>
            </div>
          );
        })()}

      {/* Variants Selection Gallery (Moved to top above Fault Simulation & Telemetry) */}
      {variantEntries.length > 1 && (
        <div className="space-y-1.5">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Available Family Variants ({variantEntries.length})
          </div>

          <div className="grid grid-cols-2 gap-1.5 max-h-44 overflow-y-auto pr-0.5 custom-scrollbar">
            {variantEntries.map(([vType, vDef]) => {
              const isSelected = selectedComp.type === vType;
              return (
                <div key={vType} className="relative flex items-center group">
                  <button
                    type="button"
                    onClick={() => {
                      useCircuitStore.getState().updateComponentType(selectedComp.id, vType);
                      setPreviewVariant(null);
                    }}
                    onMouseEnter={() => setPreviewVariant(vType, selectedComp.id)}
                    onMouseLeave={() => setPreviewVariant(null)}
                    className={`w-full rounded-lg border py-1.5 pl-2 pr-6 text-left transition ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50 text-blue-700 font-bold dark:border-blue-500 dark:bg-blue-950/40 dark:text-blue-300'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-blue-300 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300'
                    }`}
                  >
                    <span className="truncate block text-[10px]">{vDef.label}</span>
                  </button>
                  <button
                    type="button"
                    title={`View ${vDef.label} Specifications`}
                    onClick={(e) => {
                      e.stopPropagation();
                      useUiStore.getState().setActiveComponentInfoType(vType);
                    }}
                    className="absolute right-1 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-sky-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition cursor-pointer z-10"
                  >
                    <HelpCircle className="size-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Live Telemetry with Visual Feedback */}
      <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900 space-y-2">
        <div className="font-bold text-slate-800 dark:text-slate-200 text-[11px] uppercase tracking-wider flex items-center gap-1.5">
          <Activity className="size-3.5 text-blue-500" />
          Live Telemetry
          {isEnergized && (
            <span className="ml-auto rounded-full px-2 py-0.5 text-[9px] font-bold uppercase bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300">
              ENERGIZED
            </span>
          )}
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div
            className={`rounded-lg border p-2 text-center transition ${
              isOvervoltage
                ? 'border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-950/40'
                : 'border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800'
            }`}
          >
            <div
              className={`text-[9px] ${isOvervoltage ? 'text-red-600 dark:text-red-400' : 'text-slate-500 dark:text-slate-400'}`}
            >
              Voltage
            </div>
            <div
              className={`font-mono text-sm font-bold ${isOvervoltage ? 'text-red-600 dark:text-red-400' : 'text-slate-800 dark:text-slate-200'}`}
            >
              <AnimatedNumber
                value={simRunning ? liveVoltage : 0}
                decimals={1}
                suffix="V"
                duration={250}
              />
            </div>
          </div>
          <div
            className={`rounded-lg border p-2 text-center transition ${
              isOvercurrent
                ? 'border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-950/40'
                : 'border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800'
            }`}
          >
            <div
              className={`text-[9px] ${isOvercurrent ? 'text-red-600 dark:text-red-400' : 'text-slate-500 dark:text-slate-400'}`}
            >
              Current
            </div>
            <div
              className={`font-mono text-sm font-bold ${isOvercurrent ? 'text-red-600 dark:text-red-400' : 'text-slate-800 dark:text-slate-200'}`}
            >
              <AnimatedNumber
                value={simRunning ? liveCurrent : 0}
                decimals={2}
                suffix="A"
                duration={250}
              />
            </div>
          </div>
          <div
            className={`rounded-lg border p-2 text-center transition ${
              isOverload
                ? 'border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-950/40'
                : 'border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800'
            }`}
          >
            <div
              className={`text-[9px] ${isOverload ? 'text-red-600 dark:text-red-400' : 'text-slate-500 dark:text-slate-400'}`}
            >
              Power
            </div>
            <div
              className={`font-mono text-sm font-bold ${isOverload ? 'text-red-600 dark:text-red-400' : 'text-slate-800 dark:text-slate-200'}`}
            >
              <AnimatedNumber
                value={simRunning ? livePower : 0}
                decimals={0}
                suffix="W"
                duration={250}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Real-time Voltage Fluctuation Sparkline (Last 30 Seconds) */}
      <ComponentVoltageSparkline
        componentId={selectedComp.id}
        componentLabel={def.label}
        liveVoltage={liveVoltage}
        isEnergized={isEnergized}
        simRunning={simRunning}
        nominalVoltage={selectedComp.state.customVoltage ?? 230}
      />

      {/* Recommended Protection badge (Pro Mode only).
          Suggests the optimal MCB rating/curve for the attached load under
          the currently selected international standard. */}
      {showProtectionBadge && (
        <div
          data-recommended-protection
          className="rounded-xl border border-emerald-200 bg-emerald-50/80 p-3 dark:border-emerald-800 dark:bg-emerald-950/40 space-y-2"
        >
          <div className="flex items-center justify-between">
            <span className="font-bold text-emerald-900 dark:text-emerald-200 text-[11px] uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="size-3.5 text-emerald-600" />
              Recommended Protection
            </span>
            <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-[9px] font-bold text-white uppercase tracking-wide">
              {standard.shortLabel}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            <div className="rounded-lg border border-emerald-200 bg-white px-2 py-1.5 text-center dark:border-emerald-900 dark:bg-slate-900">
              <div className="text-[8px] uppercase tracking-wide text-slate-500 dark:text-slate-400">
                MCB Rating
              </div>
              <div className="font-mono text-sm font-bold text-emerald-700 dark:text-emerald-300">
                {protectionRecommendation.ratingAmps} A
              </div>
            </div>
            <div className="rounded-lg border border-emerald-200 bg-white px-2 py-1.5 text-center dark:border-emerald-900 dark:bg-slate-900">
              <div className="text-[8px] uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Curve
              </div>
              <div className="font-mono text-sm font-bold text-emerald-700 dark:text-emerald-300">
                {recommendedCurve}
              </div>
            </div>
            <div className="rounded-lg border border-emerald-200 bg-white px-2 py-1.5 text-center dark:border-emerald-900 dark:bg-slate-900">
              <div className="text-[8px] uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Design Ib
              </div>
              <div className="font-mono text-sm font-bold text-emerald-700 dark:text-emerald-300">
                {protectionRecommendation.designCurrentAmps.toFixed(2)} A
              </div>
            </div>
          </div>
          <p className="text-[10px] text-emerald-800 dark:text-emerald-300/80">
            Sized for {loadPower} W @ {loadVoltage} V per {standard.citation}. Curve{' '}
            {recommendedCurve} accommodates this load type&apos;s inrush.
          </p>
        </div>
      )}

      {/* Manual fault controls moved to the dedicated Fault Lab tab
          (Pro). Keep a one-tap pointer here so the old location stays
          discoverable. */}
      {faultsArmed && (
        <button
          type="button"
          onClick={() => useUiStore.getState().setFaultLabOpen(true)}
          className="flex w-full items-center gap-2 rounded-xl border border-amber-200 bg-amber-50/80 px-3 py-2.5 text-left shadow-sm transition hover:bg-amber-100/80 dark:border-amber-800 dark:bg-amber-950/40 dark:hover:bg-amber-950/70"
        >
          <FlaskConical className="size-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <span className="min-w-0 flex-1">
            <span className="block text-[11px] font-bold text-amber-900 dark:text-amber-200">
              Fault Lab
            </span>
            <span className="block text-[10px] leading-snug text-amber-800/90 dark:text-amber-300/70">
              Inject faults & tune blow thresholds — now with canvas animations
            </span>
          </span>
          {selectedComp.state.fault && (
            <span className="shrink-0 rounded-md bg-red-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-red-700 dark:bg-red-950/60 dark:text-red-300">
              {selectedComp.state.fault}
            </span>
          )}
        </button>
      )}

      {/* Switch Control Toggle */}
      {def.isSwitch && (
        <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3 dark:border-slate-800 dark:bg-slate-950/60 flex items-center justify-between">
          <div>
            <div className="font-bold text-slate-800 dark:text-slate-200">Switch Contact State</div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400">
              {def.isMomentary ? 'Hold to close the contact' : 'Toggle contact position'}
            </div>
          </div>
          {def.isMomentary ? (
            <button
              type="button"
              aria-label="Press and hold"
              aria-pressed={isOn}
              onClick={(event) => event.preventDefault()}
              onPointerDown={(event) => {
                if (event.button > 0) return;
                event.currentTarget.setPointerCapture?.(event.pointerId);
                setMomentarySwitchState(selectedComp.id, true);
              }}
              onPointerUp={() => setMomentarySwitchState(selectedComp.id, false)}
              onPointerCancel={() => setMomentarySwitchState(selectedComp.id, false)}
              onLostPointerCapture={() => setMomentarySwitchState(selectedComp.id, false)}
              onKeyDown={(event) => {
                if ((event.key !== 'Enter' && event.key !== ' ') || event.repeat) return;
                event.preventDefault();
                setMomentarySwitchState(selectedComp.id, true);
              }}
              onKeyUp={(event) => {
                if (event.key !== 'Enter' && event.key !== ' ') return;
                event.preventDefault();
                setMomentarySwitchState(selectedComp.id, false);
              }}
              onBlur={() => setMomentarySwitchState(selectedComp.id, false)}
              className={`rounded-full px-3 py-1 text-xs font-bold transition shadow-2xs ${
                isOn
                  ? 'bg-amber-500 text-white'
                  : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
              }`}
            >
              {isOn ? 'PRESSED' : 'RELEASED'}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => useCircuitStore.getState().toggleSwitch(selectedComp.id)}
              className={`rounded-full px-3 py-1 text-xs font-bold transition shadow-2xs ${
                isOn
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
              }`}
            >
              {isOn ? 'CLOSED (ON)' : 'OPEN (OFF)'}
            </button>
          )}
        </div>
      )}

      {/* Battery Chemistry Selector */}
      {(def.isSource ||
        selectedComp.type.includes('battery') ||
        selectedComp.type.includes('cell') ||
        selectedComp.type.includes('dc')) && (
        <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3 dark:border-slate-800 dark:bg-slate-950/60 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-800 dark:text-slate-200">Battery Chemistry</span>
            <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400 capitalize">
              {selectedComp.state.batteryChemistry ?? 'alkaline'}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {(['alkaline', 'li-ion', 'lead-acid'] as const).map((chem) => (
              <button
                key={chem}
                type="button"
                onClick={() =>
                  useCircuitStore.getState().updateComponentState(selectedComp.id, {
                    batteryChemistry: chem,
                  })
                }
                className={`rounded-lg border py-1.5 text-[10px] font-bold capitalize transition ${
                  (selectedComp.state.batteryChemistry ?? 'alkaline') === chem
                    ? 'border-blue-500 bg-blue-600 text-white shadow-xs'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300'
                }`}
              >
                {chem}
              </button>
            ))}
          </div>
          <p className="text-[10px] text-slate-500 dark:text-slate-400">
            {(selectedComp.state.batteryChemistry ?? 'alkaline') === 'alkaline'
              ? 'Alkaline: Standard Rint = 0.15 Ω, normal discharge curve'
              : (selectedComp.state.batteryChemistry ?? 'alkaline') === 'li-ion'
                ? 'Li-ion: High energy Rint = 0.02 Ω, flat discharge curve'
                : 'Lead-acid: High surge Rint = 0.01 Ω, heavy load capacity'}
          </p>
        </div>
      )}

      {/* Supply Voltage with Active Simulation Lock */}
      {(def.isSource ||
        selectedComp.type.includes('supply') ||
        selectedComp.type.includes('mains') ||
        selectedComp.type.includes('ac') ||
        selectedComp.type.includes('battery')) && (
        <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3 dark:border-slate-800 dark:bg-slate-950/60 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-800 dark:text-slate-200">Supply Voltage</span>
            {simRunning && (
              <span className="flex items-center gap-1 text-[10px] font-bold text-amber-600 dark:text-amber-400">
                <Lock className="size-3" /> Locked during simulation
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <input
              type="number"
              disabled={simRunning}
              value={
                selectedComp.state.customVoltage ?? (def.isSource ? 230 : (def.maxVolts ?? 230))
              }
              onChange={(e) => {
                const val = Number(e.target.value);
                useCircuitStore.getState().updateComponentState(selectedComp.id, {
                  customVoltage: val,
                });
                if (def.isSource) {
                  useCircuitStore.getState().setGlobalSupplyVoltage(val);
                }
              }}
              className={`w-full rounded-lg border px-2.5 py-1.5 font-mono text-xs ${
                simRunning
                  ? 'cursor-not-allowed bg-slate-100 text-slate-400 dark:bg-slate-800/60 dark:text-slate-500 border-slate-200 dark:border-slate-700'
                  : 'bg-white text-slate-900 dark:bg-slate-900 dark:text-slate-100 border-slate-200 dark:border-slate-700'
              }`}
            />
            <span className="font-bold text-slate-600 dark:text-slate-400">V</span>
          </div>
          {simRunning ? (
            <p className="text-[10px] text-amber-600 dark:text-amber-400">
              Supply voltage cannot be changed while simulation is active.
            </p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {[12, 24, 110, 230, 400].map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => {
                    useCircuitStore.getState().updateComponentState(selectedComp.id, {
                      customVoltage: v,
                    });
                    if (def.isSource) useCircuitStore.getState().setGlobalSupplyVoltage(v);
                  }}
                  className="rounded border border-slate-200 px-2 py-0.5 text-[10px] font-mono font-semibold hover:bg-slate-100 dark:border-slate-800 dark:hover:bg-slate-800"
                >
                  {v}V
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Component Parameters & Full Customization */}
      <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3 dark:border-slate-800 dark:bg-slate-950/60 space-y-2.5">
        <div className="font-bold text-slate-800 dark:text-slate-200 text-[11px] uppercase tracking-wider">
          Custom Electrical Specifications
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[9px] text-slate-500 dark:text-slate-400 mb-0.5">
              Power (Watts)
            </label>
            <input
              type="number"
              aria-label="Power rating in watts"
              value={selectedComp.state.customPowerWatts ?? def.powerWatts ?? 60}
              onChange={(e) =>
                useCircuitStore.getState().updateComponentState(selectedComp.id, {
                  customPowerWatts: Number(e.target.value),
                })
              }
              className="w-full rounded border border-slate-200 px-2 py-1 font-mono text-xs dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            />
          </div>

          <div>
            <label className="block text-[9px] text-slate-500 dark:text-slate-400 mb-0.5">
              Operating Voltage (V)
            </label>
            <input
              type="number"
              aria-label="Operating voltage in volts"
              disabled={!isPro}
              title={
                isPro
                  ? isSource
                    ? 'Sets this supply source and the global circuit voltage'
                    : 'Pro: per-component design voltage for breaker sizing. Does not change the global circuit supply.'
                  : `Circuit supply is ${globalVoltage}V. Switch to Pro to override this component's design voltage.`
              }
              value={
                isPro
                  ? (selectedComp.state.customVoltage ?? def.maxVolts ?? globalVoltage)
                  : globalVoltage
              }
              onChange={(e) =>
                useCircuitStore.getState().updateComponentState(selectedComp.id, {
                  customVoltage: Number(e.target.value),
                })
              }
              className={`w-full rounded border px-2 py-1 font-mono text-xs dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 ${
                isPro
                  ? 'border-slate-200 dark:border-slate-700'
                  : 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-500'
              }`}
            />
            {!isPro && (
              <p className="mt-0.5 text-[8px] text-slate-400 dark:text-slate-500">
                Synced to circuit supply ({globalVoltage}V) · Pro mode unlocks a per-component
                override.
              </p>
            )}
          </div>

          <div>
            <label className="block text-[9px] text-slate-500 dark:text-slate-400 mb-0.5">
              Current Rating (A)
            </label>
            <input
              type="number"
              aria-label="Current rating in amps"
              value={selectedComp.state.customMaxAmps ?? def.maxAmps ?? 16}
              onChange={(e) =>
                useCircuitStore.getState().updateComponentState(selectedComp.id, {
                  customMaxAmps: Number(e.target.value),
                })
              }
              className="w-full rounded border border-slate-200 px-2 py-1 font-mono text-xs dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            />
          </div>

          <div>
            <label className="block text-[9px] text-slate-500 dark:text-slate-400 mb-0.5">
              Cable Size (mm²)
            </label>
            <input
              type="number"
              step="0.5"
              aria-label="Cable size in mm2"
              value={selectedComp.state.customCableMm2 ?? def.recommendedCableMm2 ?? 2.5}
              onChange={(e) =>
                useCircuitStore.getState().updateComponentState(selectedComp.id, {
                  customCableMm2: Number(e.target.value),
                })
              }
              className="w-full rounded border border-slate-200 px-2 py-1 font-mono text-xs dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            />
          </div>
        </div>
      </div>

      {/* Rotation & Action Buttons */}
      <div className="pt-1 space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            disabled={simRunning}
            onClick={() => useCircuitStore.getState().rotateComponent(selectedComp.id, -90)}
            className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 transition"
          >
            <RotateCcw className="size-3.5" />
            <span>Rotate -90°</span>
          </button>
          <button
            type="button"
            disabled={simRunning}
            onClick={() => useCircuitStore.getState().rotateComponent(selectedComp.id, 90)}
            className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 transition"
          >
            <RotateCw className="size-3.5" />
            <span>Rotate +90° (R)</span>
          </button>
        </div>

        <button
          type="button"
          onClick={handleResetToDefault}
          className="w-full flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 transition"
        >
          <RotateCcw className="size-3.5" />
          <span>Reset Factory Defaults</span>
        </button>

        <button
          type="button"
          onClick={() => requestDeleteComponent(selectedComp.id)}
          className="w-full flex items-center justify-center gap-1.5 rounded-xl border border-red-200 bg-red-50 py-2.5 text-xs font-semibold text-red-600 hover:bg-red-100 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-400 dark:hover:bg-red-900/40 transition"
        >
          <Trash2 className="size-4" />
          <span>Delete Component</span>
        </button>
      </div>
    </div>
  );
}

/* =========================================================================
   CONNECTIONS TAB CONTENT
   ========================================================================= */
