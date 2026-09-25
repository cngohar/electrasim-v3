import { describe, expect, test } from "bun:test";
import {
  WorkspaceAdministrationError,
  type WorkspaceAdministrationRepository,
  WorkspaceAdministrationService,
} from "@electrasim/workspace-administration";

const fixedId = "10000000-0000-4000-8000-000000000001";

describe("workspace administration", () => {
  test("normalizes bounded campus and department records before persistence", async () => {
    const writes: unknown[] = [];
    const repository = {
      async createCampus(input: Parameters<WorkspaceAdministrationRepository["createCampus"]>[0]) {
        writes.push(input);
        return { id: input.id, name: input.name, code: input.code };
      },
      async createDepartment(
        input: Parameters<WorkspaceAdministrationRepository["createDepartment"]>[0],
      ) {
        writes.push(input);
        return {
          id: input.id,
          campusId: input.campusId,
          parentDepartmentId: input.parentDepartmentId,
          name: input.name,
          code: input.code,
        };
      },
    } as unknown as WorkspaceAdministrationRepository;
    const service = new WorkspaceAdministrationService(repository, () => fixedId);
    await service.createCampus({
      workspaceId: fixedId,
      actorUserId: fixedId,
      name: "  Lodhran   Campus ",
      code: " ldn-1 ",
      requestId: "request",
    });
    await service.createDepartment({
      workspaceId: fixedId,
      actorUserId: fixedId,
      name: " Electrical Engineering ",
      code: " ee ",
      requestId: "request",
    });
    expect(writes).toEqual([
      expect.objectContaining({ name: "Lodhran Campus", code: "LDN-1" }),
      expect.objectContaining({ name: "Electrical Engineering", code: "EE" }),
    ]);
  });

  test("rejects unbounded organization input", () => {
    const service = new WorkspaceAdministrationService(
      {} as WorkspaceAdministrationRepository,
      () => fixedId,
    );
    expect(() =>
      service.createCampus({
        workspaceId: fixedId,
        actorUserId: fixedId,
        name: "x",
        code: "bad code",
        requestId: "request",
      }),
    ).toThrow(WorkspaceAdministrationError);
  });
});
