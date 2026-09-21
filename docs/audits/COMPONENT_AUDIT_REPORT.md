# ElectraSim Component Coverage Audit

> **Status update (2026-08-18):** All recommended components from this audit have now been **implemented**. The registry grew from 91 → **115** components. See the "Resolution" section at the bottom.

**Date:** 2026-08-17 · **Scope:** Compare the component registry/palette against real-world domestic (UK) electrical installation components. Sources: IET/BS 7671 references, Electrical Safety First, consumer-unit guides, DIY Wiki house-wiring guide.

---

## 1. Current state (from code)

- **Registry (`COMPONENT_DEFS`): 91 components**
- **Palette (`PRIMARY_PALETTE_TYPES`): 75 shown as tiles**
- **16 registry components are NOT surfaced as palette tiles:**

| Not in palette | Category | Real-world importance |
|---|---|---|
| `fused-spur` (FCU 13A) | protection | **High** — very common in UK (appliances, spurs, showers) |
| `afdd` (Arc Fault Detection) | protection | High (modern, Reg 421.1.7) |
| `mccb` | protection | Medium (commercial, not usually domestic) |
| `mcb-type-c`, `mcb-type-d` | protection | Covered — available as MCB **variant** |
| `rotary-selector-switch` | switch | Medium |
| `smart-relay` | control | Low–medium |
| `socket-2pin` | socket | Low (not UK standard) |
| `industrial-exhaust-fan` | fan | Low (commercial) |
| `table-fan` | fan | Low |
| `diesel-generator` | supply | Medium (standby) |
| `bulb-cfl/halogen/incandescent/smart-rgb` | lighting | Covered — available as bulb **variant** |

**Good news:** protection (MCB B/C/D, RCD, RCBO, SPD, AFDD, fuse, main/isolator switch, distribution board, earth terminal) and controls (all switch types, dimmers, timers, sensors, contactors, relays) are well covered.

---

## 2. Genuinely MISSING real-world domestic components

These are **fixed permanent circuits / accessories** that a domestic electrician regularly works with and that **cannot be represented** by existing generic loads. Ranked by real-world importance:

| # | Component | Why it matters (real-world) |
|---|---|---|
| 1 | **Electric shower unit** | Very common UK fixed load. Needs a dedicated high-current (e.g. 40A/32A, 10mm²) RCD-protected circuit + isolation switch. |
| 2 | **Immersion heater** | Dedicated 16A circuit with double-pole isolation. Standard in UK hot-water setups. |
| 3 | **Smoke / heat / CO alarm** | Required safety circuit (BS 5839-6). Fire detection. |
| 4 | **Electricity (kWh) meter** | The incomer before the consumer unit — essential to model the supply entry. |
| 5 | **Extractor hood / range hood** | Common kitchen fixed appliance + ventilation. |
| 6 | **Shaver socket** | Bathroom accessory with isolation transformer (Reg 701). |
| 7 | **Underfloor heating** | Increasingly common; dedicated thermostat-controlled circuit. |
| 8 | **Storage heater** | UK off-peak heating, dual-supply (unfused off-peak + fused boost). |
| 9 | **White goods as loads:** dishwasher, washing machine, tumble dryer, fridge/freezer | Common dedicated/small-appliance circuits. (Representable as generic loads today, but dedicated tiles make teaching clearer.) |
| 10 | **Burglar alarm** | Common fixed safety circuit. |
| 11 | **Earth rod / electrode** | For TT earthing arrangements — only an earth **terminal** exists today. |
| 12 | **Heat pump** | Modern, increasingly common replacement for boilers/A/C. |
| 13 | **Main switch (standalone)** | Modeled only inside the distribution board today; a standalone unit is cleaner for teaching. |

---

## 3. Verdict

**Core protection & switching coverage: excellent.** The consumer-unit side (MCB/RCD/RCBO/SPD/AFDD/fuse/isolator/distribution board) and the control/switch/sensor side are complete and current with BS 7671.

**Two real gaps to close:**

1. **Palette surfacing** — at minimum surface `fused-spur` (FCU 13A) and `afdd` as tiles; they're the most-used real components currently hidden in the registry.
2. **Missing fixed circuits** — the highest-value additions for a *wiring education* tool are **electric shower, immersion heater, smoke/heat/CO alarm, and the kWh meter**. These are the fixed permanent circuits every domestic spark wires and tests. Earth rod (for TT) and heat pump are strong next-tier additions.

---

## 4. Recommended priority

1. **Electric shower** — most common fixed UK load, teaches dedicated high-current RCD circuit + isolation.
2. **Immersion heater** — simple dedicated circuit, very common.
3. **Smoke/heat/CO alarm** — safety circuit, BS 5839.
4. **KWh electricity meter** — completes the supply-entry model.
5. **Surface `fused-spur` + `afdd` in the palette.**
6. (Next tier) Earth rod, shaver socket, extractor hood, underfloor heating, storage heater, heat pump, white goods, burglar alarm.

---

## Resolution (2026-08-18) — All gaps implemented

All recommended components are now in the registry, palette, and (where applicable) SVG art + component help:

**New fixed circuits / loads:**
- `electric-shower` (8.5kW dedicated circuit)
- `immersion-heater` (3kW, 16A circuit)
- `smoke-alarm` (BS 5839-6 safety circuit)
- `kwh-meter` (supply-entry pass-through)
- `extractor-hood`, `underfloor-heating`, `storage-heater`, `heat-pump`
- White goods: `dishwasher`, `washing-machine`, `tumble-dryer`, `fridge-freezer`
- `burglar-alarm`

**New supply / protection / socket:**
- `earth-rod` (TT earthing), `main-switch` (standalone isolator), `shaver-socket` (bathroom, Reg 701)

**Surfaced in the palette (previously hidden pro-tier):**
- `fused-spur` (FCU 13A), `afdd`, `mcb-type-c`, `mcb-type-d`, `mccb`, `diesel-generator`, `rotary-selector-switch`, `smart-relay`

**Result:** registry 91 → **115 components**; typecheck clean, 327 unit + 39 e2e pass.
