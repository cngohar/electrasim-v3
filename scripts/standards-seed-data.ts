import { STANDARD_LIST } from '@electrasim/domain/standards';

/** Canonical code-owned projection, shared by explicit local seeding and isolated browser fixtures. */
export function standardsSeedSql() {
  const sqlValue = (value: unknown): string =>
    value === null
      ? 'NULL'
      : typeof value === 'number'
        ? String(value)
        : `'${String(value).replaceAll("'", "''")}'`;
  const now = Math.floor(Date.now() / 1000);
  const columns =
    'code,label,shortLabel,citation,flag,nominalVoltage,frequencyHz,wireColorsJson,wireColorsDarkJson,voltageDropJson,defaultMcbCurve,motorMcbCurve,rcdThresholdMa,rcdRequiredOnSockets,socketCircuitAmps,lightingCircuitAmps,conductorLegendJson,metadataJson,version,seededAt';
  const statements = STANDARD_LIST.map((s) => {
    const values = [
      s.id,
      s.label,
      s.shortLabel,
      s.citation,
      s.flag,
      s.nominalVoltage,
      s.frequencyHz,
      JSON.stringify(s.wireColors),
      JSON.stringify(s.wireColorsDark),
      JSON.stringify(s.voltageDrop),
      s.defaultMcbCurve,
      s.motorMcbCurve,
      s.rcdThresholdMa,
      s.rcdRequiredOnSockets ? 1 : 0,
      s.socketCircuitAmps,
      s.lightingCircuitAmps,
      JSON.stringify(s.conductorLegend),
      JSON.stringify(s.metadata),
      '2',
      now,
    ];
    return `INSERT OR REPLACE INTO electrical_standards (${columns}) VALUES (${values.map(sqlValue).join(',')});`;
  });
  for (const [key, value] of [
    ['seededAt', String(now)],
    ['electricalStandardsCount', String(STANDARD_LIST.length)],
  ]) {
    statements.push(
      `INSERT OR REPLACE INTO app_meta (key,value,updatedAt) VALUES (${sqlValue(key)},${sqlValue(value)},${now});`,
    );
  }
  return statements.join('\n');
}
