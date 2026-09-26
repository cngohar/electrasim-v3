console.error(
  'Deployment is disabled: ElectraSim V3 is local-only until development is finished and a new Cloudflare account is explicitly configured. See AGENTS.md.',
);
process.exitCode = 1;
