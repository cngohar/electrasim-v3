import { useUiStore } from '../../store';

/** Display solver time, never a parallel wall-clock approximation. Stop starts a fresh run next time. */
export function SimulationClock() {
  const seconds = useUiStore((s) => s.simResult?.simulationState?.elapsedSeconds);
  const running = useUiStore((s) => s.simRunning);
  return (
    <div
      className="workspace-clock"
      title="Accepted simulation time. Stop ends this run; Run starts a new one."
    >
      <small>{running ? 'Simulation time' : 'Stopped · next Run restarts time'}</small>
      <output aria-label="Simulation time">
        {seconds === undefined ? '—' : `${seconds.toFixed(1)} s`}
      </output>
    </div>
  );
}
