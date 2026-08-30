/**
 * presets.test.ts — the load presets' DC voice and the per-system voltage
 * ladders (§30).
 *
 * The AC/DC toggle has to change what the run *is*, not only what one sentence
 * under it says. These tests pin that: a system carries its own nominal
 * voltages, and a load carries its own wording on each system — so a motor is
 * never described as "single-phase" while it is sitting on a battery bank.
 */

import { describe, expect, it } from 'vitest';
import { SYSTEM_DEFAULT_VOLTS, SYSTEM_VOLTAGE_PRESETS } from './config';
import { LOAD_PRESETS, getLoadPreset, loadNote } from './presets';

describe('SYSTEM_VOLTAGE_PRESETS', () => {
  it('gives every system a ladder', () => {
    expect(SYSTEM_VOLTAGE_PRESETS.ac.length).toBeGreaterThan(0);
    expect(SYSTEM_VOLTAGE_PRESETS.dc.length).toBeGreaterThan(0);
  });

  it('offers DC voltages an AC run never sees, and vice versa', () => {
    const ac = SYSTEM_VOLTAGE_PRESETS.ac.map((preset) => preset.volts);
    const dc = SYSTEM_VOLTAGE_PRESETS.dc.map((preset) => preset.volts);
    // extra-low voltage is the whole point of a DC run
    expect(dc.some((volts) => volts <= 48)).toBe(true);
    expect(ac.some((volts) => volts <= 48)).toBe(false);
    // and the two ladders are not secretly the same list
    expect(dc).not.toEqual(ac);
  });

  it('gives each system a default that is actually one of its own presets', () => {
    for (const system of ['ac', 'dc'] as const) {
      const volts = SYSTEM_DEFAULT_VOLTS[system];
      expect(SYSTEM_VOLTAGE_PRESETS[system].map((preset) => preset.volts)).toContain(volts);
    }
    expect(SYSTEM_DEFAULT_VOLTS.ac).not.toBe(SYSTEM_DEFAULT_VOLTS.dc);
  });

  it('labels and notes every rung', () => {
    for (const presets of Object.values(SYSTEM_VOLTAGE_PRESETS)) {
      for (const preset of presets) {
        expect(preset.label).toMatch(/\d/);
        expect(preset.note.length).toBeGreaterThan(10);
      }
    }
  });
});

describe('loadNote', () => {
  it('returns the plain note on AC', () => {
    const preset = getLoadPreset('motor');
    expect(loadNote(preset, 'ac')).toBe(preset.note);
  });

  it('returns the DC note on DC', () => {
    const preset = getLoadPreset('motor');
    expect(loadNote(preset, 'dc')).toBe(preset.noteDc);
    expect(loadNote(preset, 'dc')).not.toBe(preset.note);
  });

  it('never calls a DC motor single-phase', () => {
    // the sentence that made the toggle feel like a no-op
    expect(loadNote(getLoadPreset('motor'), 'dc')).not.toMatch(/single-phase/i);
    expect(loadNote(getLoadPreset('motor'), 'ac')).toMatch(/single-phase/i);
  });

  it('words every preset differently on the two systems', () => {
    for (const preset of LOAD_PRESETS) {
      expect(loadNote(preset, 'dc'), `${preset.id} needs a DC voice`).not.toBe(preset.note);
    }
  });

  it('falls back to the AC note if a preset ever loses its DC one', () => {
    const bare = { ...getLoadPreset('heater'), noteDc: undefined };
    expect(loadNote(bare, 'dc')).toBe(bare.note);
  });
});
