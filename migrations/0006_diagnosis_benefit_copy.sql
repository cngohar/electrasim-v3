-- Refresh only untouched code-owned benefit copy; preserve operator-edited text.
UPDATE pro_features
SET description = '{"en":"Advanced diagnosis scenarios may require other capabilities."}',
    version = version + 1,
    mutation_id = 'migration-0006-diagnosis-copy'
WHERE key = 'advanced_diagnostics' AND version = 1 AND mutation_id = 'migration-0004';
