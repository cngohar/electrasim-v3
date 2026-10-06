import { useUiStore } from '../../store';
import { Modal } from './Modal';
import { InspectorFaultLabView } from './inspector/InspectorFaultLabView';

/** The phone uses the same fault, damage and repair controls as the desktop inspector. */
export default function FaultLabDialog() {
  return (
    <Modal open title="Fault Lab" onClose={() => useUiStore.getState().setFaultLabOpen(false)}>
      <InspectorFaultLabView />
    </Modal>
  );
}
