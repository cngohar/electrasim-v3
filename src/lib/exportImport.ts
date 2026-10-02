/**
 * Compatibility facade for circuit import and export services.
 *
 * Keep application imports pointed at this module. The implementation is split
 * by responsibility so browser-only image and download code stays independent
 * from the circuit file format contract.
 */

export {
  CIRCUIT_SCHEMA_VERSION,
  exportJSON,
  importJSON,
  normalizeCircuit,
  validateCircuitJSON,
  type ElectraSimFile,
} from './export/circuitFormat';
export { downloadBlob, downloadText } from './export/download';
export { exportPDF, exportPNG, exportSVG, type PrintMetadata } from './export/imageExport';
export {
  decodeShareURL,
  encodeShareURL,
  hasLegacyShareQuery,
  migrateLegacyShareQueryToFragment,
  stripShareURLPayload,
  type SharePayloadLocation,
} from './export/shareUrl';
