import { describe, expect, test } from "bun:test";
import { LocalObjectStore } from "@electrasim/object-storage";
import type { DurableJob, JobQueue, ObjectStore } from "@electrasim/platform-contracts";

class MemoryObjectStore implements ObjectStore {
  readonly #objects = new Map<string, { bytes: Uint8Array; contentType: string }>();
  async put(key: string, value: Uint8Array, contentType: string): Promise<void> {
    this.#objects.set(key, { bytes: value.slice(), contentType });
  }
  async get(key: string): Promise<Uint8Array | null> {
    return this.#objects.get(key)?.bytes.slice() ?? null;
  }
  async delete(key: string): Promise<void> {
    this.#objects.delete(key);
  }
}

class IdempotentMemoryQueue implements JobQueue {
  readonly jobs = new Map<string, DurableJob>();
  async enqueue<TPayload>(job: DurableJob<TPayload>): Promise<void> {
    if (!this.jobs.has(job.id)) this.jobs.set(job.id, job as DurableJob);
  }
}

describe("portable infrastructure contracts", () => {
  test("object storage round-trips immutable bytes and deletes by key", async () => {
    const store = new MemoryObjectStore();
    const original = new Uint8Array([1, 2, 3]);
    await store.put("tenant/project.json", original, "application/json");
    original[0] = 99;
    expect(await store.get("tenant/project.json")).toEqual(new Uint8Array([1, 2, 3]));
    await store.delete("tenant/project.json");
    expect(await store.get("tenant/project.json")).toBeNull();
  });

  test("local object storage persists bytes while rejecting traversal keys", async () => {
    const root = `/tmp/electrasim-object-store-${crypto.randomUUID()}`;
    const store = new LocalObjectStore(root);
    await store.put("content/image.png", new Uint8Array([9, 8, 7]), "image/png");
    expect(await store.get("content/image.png")).toEqual(new Uint8Array([9, 8, 7]));
    await expect(store.put("../secret", new Uint8Array([1]), "text/plain")).rejects.toThrow(
      "invalid_object_key",
    );
    await store.delete("content/image.png");
    expect(await store.get("content/image.png")).toBeNull();
  });

  test("durable queue adapter is idempotent by job id", async () => {
    const queue = new IdempotentMemoryQueue();
    const job = {
      id: "job-1",
      type: "email.transactional.send",
      payload: { template: "verify-email" },
      createdAt: "2026-09-24T00:00:00.000Z",
    } as const;
    await queue.enqueue(job);
    await queue.enqueue(job);
    expect(queue.jobs.size).toBe(1);
    expect(queue.jobs.get("job-1")).toEqual(job);
  });
});
