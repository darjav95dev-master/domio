import { describe, expect, it } from "vitest";
import { GET } from "../../app/api/health/route";

describe("smoke — health endpoint", () => {
  it("returns status ok with HTTP 200", async () => {
    const response = await GET();

    expect(response.status).toBe(200);
    const body = (await response.json()) as { status: string; env: string };
    expect(body.status).toBe("ok");
    expect(body.env).toBeDefined();
  });
});
