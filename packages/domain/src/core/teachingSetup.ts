import type { ComponentDef, ComponentState } from '../types';
import { coilPortsFor } from './coilModel';
import { hasProtectionSettings } from './protectionModel';
import { TIMER_PERIODS, hasTimerSettings } from './timerModel';

/** An explicit user action installs these editable teaching assumptions. Never
 * silently infer coil voltage, motor input or automatic tripping from artwork. */
export function teachingSetup(
  type: string,
  def: ComponentDef,
  state: ComponentState,
): { description: string; updates: Partial<ComponentState> } | null {
  if (type === 'motor-3phase' && !state.motorModel)
    return {
      description:
        '400 V L-L, 3 kW declared electrical input, 50 Hz, ABC; balanced unity-PF equivalent. No shaft output or startup claim.',
      updates: {
        motorModel: {
          version: 1,
          kind: 'balanced-resistive',
          nominalLineVoltage: 400,
          inputPowerWatts: 3000,
          frequencyHz: 50,
          operatingLineVoltageRange: { min: 360, max: 440 },
          maximumUnbalanceRatio: 0.02,
          requiredSequence: 'abc',
        },
      },
    };
  if (coilPortsFor(type, def) && !state.coilModel)
    return {
      description:
        '230 V AC / 50 Hz, 2 W resistive coil; pickup 90%, dropout 70%, declared delays. Contact ratings remain separate.',
      updates: {
        coilModel: {
          version: 1,
          supply: { kind: 'ac-single-phase', voltage: 230, frequencyHz: 50 },
          nominalPowerWatts: 2,
          pickupRatio: 0.9,
          dropoutRatio: 0.7,
          onDelaySeconds: type === 'delay-timer' ? 1 : 0,
          offDelaySeconds: 0,
        },
      },
    };
  if (hasTimerSettings(type) && !state.timerModel)
    return {
      description:
        'Editable simulated-time teaching program: 5-second ON window or 3-second triggered interval. No wall-clock or automatic sensor input.',
      updates: {
        timerModel: TIMER_PERIODS[type]
          ? {
              version: 1,
              kind: 'schedule',
              periodSeconds: TIMER_PERIODS[type]!,
              offsetSeconds: 0,
              windows: [{ startSeconds: 0, endSeconds: 5 }],
            }
          : {
              version: 1,
              kind: 'interval',
              durationSeconds: 3,
              retrigger: 'restart',
              ...(type === 'countdown-timer'
                ? {
                    controlSupply: {
                      supply: { kind: 'ac-single-phase', voltage: 230, frequencyHz: 50 },
                      nominalPowerWatts: 1,
                      minimumVoltageRatio: 0.8,
                    },
                  }
                : {}),
            },
      },
    };
  if (hasProtectionSettings(type) && !state.protectionModel) {
    const amps = state.customMaxAmps ?? def.maxAmps ?? 16;
    const residual = def.ratedLeakage_mA ?? 30;
    return {
      description:
        'Explicit editable protection teaching model driven by calculated pole current. Arc detection, coordination, manufacturer certification and damage remain unassessed.',
      updates: {
        protectionModel:
          type === 'rcd'
            ? {
                version: 1,
                kind: 'rcd',
                ratedResidualMilliamps: residual,
                residualType: state.rcdType ?? 'A',
              }
            : ['fuse', 'fused-spur'].includes(type)
              ? { version: 1, kind: 'fuse', ratedCurrentAmps: amps, meltingIntegralSeconds: 20 }
              : ['rcbo', 'afdd'].includes(type)
                ? {
                    version: 1,
                    kind: 'rcbo',
                    ratedCurrentAmps: amps,
                    curve: def.mcbType ?? 'B',
                    ratedResidualMilliamps: residual,
                    residualType: state.rcdType ?? 'A',
                  }
                : { version: 1, kind: 'mcb', ratedCurrentAmps: amps, curve: def.mcbType ?? 'B' },
      },
    };
  }
  return null;
}
