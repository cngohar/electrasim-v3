-- Phase 2.0A storage foundation; local-only development. No existing rows rewritten.
-- Explicit classification v1: reviewed 75 protected Basic / 41 originally Pro IDs.
CREATE TABLE component_access_baseline (
  component_id TEXT PRIMARY KEY NOT NULL,
  original_tier TEXT NOT NULL CHECK (original_tier IN ('basic','pro'))
);
INSERT INTO component_access_baseline (component_id, original_tier) VALUES
('ac-mains-supply', 'basic'),
('ac-three-phase-supply', 'basic'),
('afdd', 'pro'),
('air-conditioner', 'pro'),
('alarm-siren', 'pro'),
('bell', 'basic'),
('bulb', 'basic'),
('bulb-cfl', 'basic'),
('bulb-halogen', 'basic'),
('bulb-incandescent', 'basic'),
('bulb-smart-rgb', 'pro'),
('burglar-alarm', 'pro'),
('ceiling-fan', 'basic'),
('contactor', 'basic'),
('contactor-1p', 'basic'),
('contactor-2p', 'basic'),
('contactor-3p', 'pro'),
('contactor-4p', 'pro'),
('control-relay', 'pro'),
('cooker-unit', 'pro'),
('countdown-timer', 'basic'),
('dc-battery-12v', 'pro'),
('delay-timer', 'pro'),
('diesel-generator', 'pro'),
('digital-weekly-timer', 'pro'),
('dimmer-switch', 'basic'),
('dishwasher', 'basic'),
('distribution-board', 'basic'),
('distribution-board-3phase', 'pro'),
('distribution-box', 'basic'),
('door-sensor', 'basic'),
('double-gang-switch', 'basic'),
('double-pole-switch', 'pro'),
('double-socket', 'basic'),
('double-socket-us', 'basic'),
('earth-rod', 'basic'),
('earth-terminal', 'basic'),
('electric-buzzer', 'basic'),
('electric-shower', 'basic'),
('ev-charger', 'pro'),
('extractor-fan', 'basic'),
('extractor-hood', 'basic'),
('fan-dimmer', 'basic'),
('fridge-freezer', 'basic'),
('fuse', 'basic'),
('fused-spur', 'pro'),
('heat-pump', 'pro'),
('heating-element', 'basic'),
('heating-thermostat', 'pro'),
('immersion-heater', 'basic'),
('induction-hob', 'pro'),
('industrial-exhaust-fan', 'pro'),
('intermediate-switch', 'pro'),
('isolator-switch', 'pro'),
('junction-box', 'basic'),
('kwh-meter', 'basic'),
('led-downlight', 'basic'),
('live-terminal', 'basic'),
('main-switch', 'basic'),
('mcb', 'basic'),
('mcb-type-c', 'pro'),
('mcb-type-d', 'pro'),
('mccb', 'pro'),
('motor', 'basic'),
('motor-3phase', 'pro'),
('neutral-terminal', 'basic'),
('photocell-sensor', 'pro'),
('pir-sensor', 'pro'),
('push-button', 'basic'),
('rcbo', 'basic'),
('rcd', 'basic'),
('relay-dpdt', 'pro'),
('relay-spdt', 'basic'),
('relay-spst', 'basic'),
('room-thermostat', 'basic'),
('rotary-selector-switch', 'pro'),
('shaver-socket', 'basic'),
('single-way-switch', 'basic'),
('smart-relay', 'pro'),
('smoke-alarm', 'basic'),
('socket-2pin', 'basic'),
('socket-3pin', 'basic'),
('socket-as3112', 'basic'),
('socket-as3112-double', 'basic'),
('socket-bs546', 'basic'),
('socket-bs546-double', 'basic'),
('socket-gfci', 'pro'),
('socket-industrial', 'pro'),
('socket-schuko', 'basic'),
('socket-schuko-double', 'basic'),
('socket-us', 'basic'),
('socket-usb', 'pro'),
('solar-pv-panel', 'pro'),
('space-heater', 'basic'),
('spd', 'pro'),
('staircase-timer', 'pro'),
('step-up-down-transformer', 'pro'),
('storage-heater', 'basic'),
('switched-socket', 'basic'),
('table-fan', 'basic'),
('temperature-sensor', 'basic'),
('terminal-strip', 'basic'),
('thermostat', 'pro'),
('timer-switch', 'basic'),
('transformer-12v', 'basic'),
('transformer-24v', 'pro'),
('transformer-8v', 'basic'),
('tube-light', 'basic'),
('tumble-dryer', 'basic'),
('two-way-switch', 'basic'),
('underfloor-heating', 'basic'),
('wago-connector', 'basic'),
('washing-machine', 'basic'),
('water-heater', 'basic'),
('water-pump', 'basic'),
('wireless-doorbell', 'basic');
CREATE TRIGGER component_access_baseline_no_update BEFORE UPDATE ON component_access_baseline
BEGIN SELECT RAISE(ABORT, 'Component baseline is immutable'); END;
CREATE TRIGGER component_access_baseline_no_delete BEFORE DELETE ON component_access_baseline
BEGIN SELECT RAISE(ABORT, 'Component baseline is immutable'); END;
-- REPLACE can implicitly delete even when recursive triggers are disabled.
CREATE TRIGGER component_access_baseline_no_replace BEFORE INSERT ON component_access_baseline
WHEN EXISTS (SELECT 1 FROM component_access_baseline WHERE component_id = NEW.component_id)
BEGIN SELECT RAISE(ABORT, 'Component baseline is immutable'); END;

CREATE TABLE component_access_revision (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  revision INTEGER NOT NULL DEFAULT 1
    CHECK (typeof(revision) = 'integer' AND revision BETWEEN 1 AND 9007199254740991)
);
INSERT INTO component_access_revision (id, revision) VALUES (1, 1);

CREATE TABLE component_access_overrides (
  component_id TEXT PRIMARY KEY NOT NULL REFERENCES component_access_baseline(component_id),
  access TEXT NOT NULL CHECK (access IN ('free','pro')),
  version INTEGER NOT NULL CHECK (typeof(version) = 'integer' AND version BETWEEN 1 AND 9007199254740991),
  actor_id TEXT NOT NULL REFERENCES user(id),
  created_at INTEGER NOT NULL CHECK (typeof(created_at) = 'integer' AND created_at BETWEEN 0 AND 9007199254740991),
  updated_at INTEGER NOT NULL CHECK (typeof(updated_at) = 'integer' AND updated_at BETWEEN created_at AND 9007199254740991)
);
CREATE TRIGGER component_access_override_insert BEFORE INSERT ON component_access_overrides
WHEN NOT EXISTS (SELECT 1 FROM component_access_baseline
  WHERE component_id = NEW.component_id AND original_tier = 'pro')
BEGIN SELECT RAISE(ABORT, 'Only originally Pro components allow overrides'); END;
CREATE TRIGGER component_access_override_update BEFORE UPDATE ON component_access_overrides
WHEN NOT EXISTS (SELECT 1 FROM component_access_baseline
  WHERE component_id = NEW.component_id AND original_tier = 'pro')
BEGIN SELECT RAISE(ABORT, 'Only originally Pro components allow overrides'); END;
