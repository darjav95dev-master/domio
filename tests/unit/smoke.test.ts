import { describe, expect, it } from "vitest";
import { GET } from "../../app/api/health/route";
import { APP_ENVS } from "../../src/shared/config/app-env";

describe("smoke — health endpoint", () => {
  it("returns status ok with HTTP 200 and the active APP_ENV", async () => {
    const response = await GET();

    expect(response.status).toBe(200);
    const body = (await response.json()) as { status: string; env: string };
    expect(body.status).toBe("ok");
    // Unset in the test process → defaults to "local".
    expect(APP_ENVS).toContain(body.env);
  });
});
