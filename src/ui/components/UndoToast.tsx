import {
  AlertTriangle,
  CheckCircle2,
  Info,
  LoaderCircle,
  OctagonAlert,
  Undo2,
  X,
} from 'lucide-react';
import { focusFaultTarget, undo, useCircuitStore, useUiStore } from '../../store';
import {
  sameCircuitRevision,
  useConfigurationLockReason,
  useElectricalEditing,
} from '../../store/electricalEditing';
import { useCircuitDocument } from '../../store/electricalReadiness';
import type { UiNotification } from '../../store/notifications';
import { notificationUndoAvailable } from '../../store/uiStore';

const icons = { error: OctagonAlert, warning: AlertTriangle, success: CheckCircle2, info: Info };
const labels = { error: 'Error', warning: 'Warning', success: 'Success', info: 'Information' };

function NotificationCard({ notification }: { notification: UiNotification }) {
  const ui = useUiStore.getState();
  const { id, message, type, target, progress, showUndo, reviewCircuit } = notification;
  const circuit = useCircuitDocument();
  const { components, wires } = circuit;
  const editNotice = useElectricalEditing((state) => state.notice);
  const locked = useConfigurationLockReason();
  const canUndo =
    notificationUndoAvailable(id) &&
    (!reviewCircuit ||
      (!!editNotice &&
        !locked &&
        sameCircuitRevision(editNotice.after, circuit) &&
        editNotice.historyEntry === useCircuitStore.temporal.getState().pastStates.at(-1)));
  const targetId = target?.type === 'port' ? target.componentId : target?.id;
  const targetExists =
    target?.type === 'wire'
      ? wires.some((w) => w.id === targetId)
      : components.some((c) => c.id === targetId);
  const Icon = progress ? LoaderCircle : icons[type];
  return (
    <div
      className="table-undo-toast table-surface"
      data-notification={type}
      data-progress={progress || undefined}
      data-review-circuit={reviewCircuit || undefined}
      role={type === 'error' ? 'alert' : 'status'}
      aria-atomic="true"
      aria-busy={progress || undefined}
      onMouseEnter={() => ui.pauseNotification(id, 'hover', true)}
      onMouseLeave={() => ui.pauseNotification(id, 'hover', false)}
      onFocusCapture={() => ui.pauseNotification(id, 'focus', true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget))
          ui.pauseNotification(id, 'focus', false);
      }}
    >
      <Icon size={17} aria-hidden="true" />
      <div className="table-notification-copy">
        <strong>{progress ? 'In progress' : labels[type]}</strong>
        <p>{message}</p>
      </div>
      <div className="table-notification-actions">
        {showUndo && (
          <button
            type="button"
            disabled={reviewCircuit && !canUndo}
            title={
              reviewCircuit && !canUndo
                ? 'Later edits or an edit lock prevent undoing this change.'
                : 'Undo this change'
            }
            onClick={() => {
              if (canUndo) undo();
              else
                ui.notify({
                  message:
                    'A newer edit changed the Undo history. Use History to review earlier edits.',
                  type: 'info',
                });
              ui.dismissNotification(id);
            }}
          >
            <Undo2 size={13} aria-hidden="true" />
            Undo
          </button>
        )}
        {reviewCircuit && (
          <button
            type="button"
            onClick={() => {
              useElectricalEditing.setState({ reviewOpen: true });
              ui.dismissNotification(id);
            }}
          >
            Review
          </button>
        )}
        {target && (
          <button
            type="button"
            disabled={!targetExists}
            onClick={() => {
              const circuit = useCircuitStore.getState();
              if (target.type === 'wire') {
                circuit.selectWire(target.id);
                focusFaultTarget({ wireId: target.id });
              } else {
                const componentId = target.type === 'port' ? target.componentId : target.id;
                circuit.selectComponent(componentId);
                focusFaultTarget({ componentId });
              }
              ui.setInspectorOpen(true);
              ui.setInspectorCollapsed(false);
              ui.setActiveInspectorTab('properties');
              ui.dismissNotification(id);
            }}
          >
            Inspect
          </button>
        )}
        <button
          type="button"
          onClick={() => {
            ui.setInspectorCollapsed(true);
            ui.setLogOpen(true);
            ui.dismissNotification(id);
          }}
        >
          View Console
        </button>
      </div>
      {!progress && (
        <button
          type="button"
          className="table-notification-dismiss"
          aria-label={`Dismiss ${labels[type].toLowerCase()} notification`}
          onClick={() => ui.dismissNotification(id)}
        >
          <X size={15} aria-hidden="true" />
        </button>
      )}
    </div>
  );
}

/** The historical mount point now renders every user-action severity. */
export function UndoToast() {
  const notifications = useUiStore((s) => s.notifications);
  const consoleOpen = useUiStore((s) => s.logOpen);
  if (!notifications.length) return null;
  return (
    <aside
      className="table-notification-lane"
      aria-label="Recent notifications"
      data-console-open={consoleOpen}
    >
      {notifications.map((notification) => (
        <NotificationCard key={notification.id} notification={notification} />
      ))}
    </aside>
  );
}
