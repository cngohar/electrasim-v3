/** Isolated local verification entry point. Not imported by src/worker.ts. */
import { Hono } from 'hono';
import { domainParityFixture } from './domain-parity-fixture';
const app = new Hono();
app.get('/', (c) => c.body(domainParityFixture(), 200, { 'Content-Type': 'application/json' }));
export default app;
