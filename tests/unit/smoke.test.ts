import { describe, expect, it } from "vitest";
import { GET } from "../../app/api/health/route";

describe("smoke — health endpoint", () => {
  it("returns status ok with HTTP 200", async () => {
    const response = await GET();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ status: "ok" });
  });
});
