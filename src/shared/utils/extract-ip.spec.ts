import { describe, it, expect } from "vitest";
import { extractIpFromHeaders } from "./extract-ip";

const TEST_IP = "203.0.113.42";

describe("extractIpFromHeaders", () => {
  it("extracts IP from x-forwarded-for header", () => {
    const headers = new Headers({ "x-forwarded-for": TEST_IP });
    expect(extractIpFromHeaders(headers)).toBe(TEST_IP);
  });

  it("takes the last IP from a comma-separated x-forwarded-for (real client behind proxy)", () => {
    const headers = new Headers({ "x-forwarded-for": `198.51.100.7, 10.0.0.1, ${TEST_IP}` });
    expect(extractIpFromHeaders(headers)).toBe(TEST_IP);
  });

  it("falls back to x-real-ip when x-forwarded-for is missing", () => {
    const secondaryIp = "198.51.100.7";
    const headers = new Headers({ "x-real-ip": secondaryIp });
    expect(extractIpFromHeaders(headers)).toBe(secondaryIp);
  });

  it("returns 'unknown' when no IP header is present", () => {
    const headers = new Headers({});
    expect(extractIpFromHeaders(headers)).toBe("unknown");
  });
});
