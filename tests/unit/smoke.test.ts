import { describe, expect, it } from "vitest";
import { GET } from "../../app/api/health/route";

describe("smoke — health endpoint", () => {
  it("returns status ok with HTTP 200", async () => {
    const response = await GET();

    expect(response.status).toBe(200);
    const body = (await response.json()) as { status: string };
    expect(body.status).toBe("ok");
    // env is intentionally not exposed (LOW-01 — information disclosure)
    expect(body).not.toHaveProperty("env");
  });
});
