# Simulator Context Menu and Engineering Review v0.12

Date: 2026-09-25

## Delivered interaction

The simulator canvas now has a viewport-clamped, scrollable context menu modeled on the useful behavior of the v2 workbench without importing v2 implementation code.

- **Component:** select/inspect, toggle supported state, begin wiring, copy, duplicate, rotate, and delete.
- **Wire:** select, add a bend, reset automatic routing, and delete.
- **Empty canvas:** paste a disconnected copy, start a blank circuit, import JSON, and export JSON.
- **Shared view commands:** undo/redo, fit, zoom in/out/reset, and switch between beginner-icon and technical visuals.

The menu closes on outside pointer input and Escape. It supports Context Menu and Shift+F10 invocation, initial menu-item focus, Arrow/Home/End movement, and native disabled button semantics. Its fixed container is clamped to the visible viewport and scrolls instead of becoming unreachable on small screens.

## Zoom contract

The displayed percentage is measured against the 1,200-unit baseline viewport.

- Maximum zoom in: **375%** (320-unit viewport width).
- Maximum zoom out: **30%** (4,000-unit viewport width).
- Reset: **100%**.

Wheel controls, menu controls, imported/saved viewports, and fit-to-content now share those limits. Fit preserves the canvas aspect ratio; exceptionally spread-out content reports when the 30% safety limit prevents fitting everything.

## Review and fixes

This checkpoint included a focused implementation review across simulator interaction, worker lifecycle, browser security, accessibility, performance, persistence, and validation boundaries.

Concrete findings fixed:

1. Starting a wire from a context menu while Diagnose mode was active could route the action through probe selection. The command now explicitly enters Build mode and starts a wire.
2. Fit-to-content and persisted viewport restoration could bypass the advertised zoom range. Both are now clamped to the same 30–375% contract.
3. Live drag routing scanned every connection on every pointer move. It now ignores connections not attached to a provisionally moved component.
4. Aborting an already-running worker terminated the worker but could leave its promise waiting until timeout. Active cancellation now rejects immediately with `simulation_cancelled`, with regression coverage.
5. Passkey names, session user-agent/IP strings, TOTP URIs, and recovery codes were interpolated into Account Security HTML without escaping. These values are now escaped before insertion, with static regression assertions.
6. The browser journey used an ambiguous breaker locator because terminals also carry component metadata. It now targets the equipment group and proves attached wire geometry changes before pointer release.

## Validation evidence

The automated browser journey verifies:

- component and empty-canvas context menus;
- a context-menu zoom action and visible percentage;
- technical/beginner switching;
- attached wire movement while the drag pointer remains down;
- desktop/mobile simulator and persistent-fault rendering;
- no page errors or horizontal document overflow.

Release claims remain bounded. This menu does not establish mobile long-press parity, manufacturer identity, jurisdictional compliance, or electrical safety approval. Touch users retain the visible toolbar, drawers, selectable canvas objects, and keyboard-equivalent commands where hardware keyboards are available. Independent accessibility, electrical-SME, secure-origin WebAuthn, real PostgreSQL-role, and deployment reviews remain external release gates.
