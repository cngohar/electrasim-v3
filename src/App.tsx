/**
 * App.tsx — application shell.
 *
 * The public SVG editor is complete through the v1.5.0 hardening release.
 * The Editor reads from `/store` and renders via the SVG CircuitCanvas.
 * The experimental PixiJS/WebGL renderer was removed; SVG is the only renderer.
 */
import { Editor } from './ui/Editor';
import { ErrorBoundary } from './ui/ErrorBoundary';
import { SimulatorAccessBanner } from './ui/components/SimulatorAccessBanner';

export default function App() {
  return (
    <ErrorBoundary>
      <Editor />
      <SimulatorAccessBanner />
    </ErrorBoundary>
  );
}
