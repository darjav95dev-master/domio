import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the Resend SDK before importing the client
const mockEmailsSend = vi.fn();
vi.mock("resend", () => ({
  Resend: vi.fn().mockImplementation(() => ({
    emails: {
      send: mockEmailsSend,
    },
  })),
}));

import { ResendClientImpl } from "@/infrastructure/email/resend.client";
import {
  EmailProviderError,
  ConfigurationError,
} from "@/infrastructure/email/types";

const VALID_KEY = "re_123456789";

describe("ResendClientImpl", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("constructor", () => {
    it("throws if RESEND_API_KEY is not set", () => {
      expect(() => new ResendClientImpl()).toThrow(ConfigurationError);
    });

    it("throws if apiKey is empty", () => {
      expect(() => new ResendClientImpl("")).toThrow(ConfigurationError);
    });

    it("creates instance with valid apiKey", () => {
      const client = new ResendClientImpl(VALID_KEY);
      expect(client).toBeInstanceOf(ResendClientImpl);
    });
  });

  describe("send", () => {
    const sendInput = {
      to: "test@example.com",
      subject: "Test Subject",
      html: "<p>Hello</p>",
      text: "Hello",
    };

    it("returns SendResult on success", async () => {
      mockEmailsSend.mockResolvedValue({
        data: { id: "email-123" },
        error: null,
        headers: {},
      });

      const client = new ResendClientImpl(VALID_KEY);
      const result = await client.send(sendInput);

      expect(result).toEqual({ id: "email-123" });
      expect(mockEmailsSend).toHaveBeenCalledWith({
        from: "noreply@wedomio.com",
        to: sendInput.to,
        subject: sendInput.subject,
        html: sendInput.html,
        text: sendInput.text,
      });
    });

    it("uses custom from address when provided", async () => {
      mockEmailsSend.mockResolvedValue({
        data: { id: "email-456" },
        error: null,
        headers: {},
      });

      const client = new ResendClientImpl(VALID_KEY);
      await client.send({ ...sendInput, from: "custom@wedomio.com" });

      expect(mockEmailsSend).toHaveBeenCalledWith(
        expect.objectContaining({ from: "custom@wedomio.com" }),
      );
    });

    it("throws EmailProviderError when Resend returns an error", async () => {
      mockEmailsSend.mockResolvedValue({
        data: null,
        error: {
          message: "Rate limit exceeded",
          statusCode: 429,
          name: "rate_limit_exceeded",
        },
        headers: {},
      });

      const client = new ResendClientImpl(VALID_KEY);
      await expect(client.send(sendInput)).rejects.toThrow(EmailProviderError);
    });

    it("preserves Resend error message", async () => {
      mockEmailsSend.mockResolvedValue({
        data: null,
        error: {
          message: "Invalid email address",
          statusCode: 400,
          name: "validation_error",
        },
        headers: {},
      });

      const client = new ResendClientImpl(VALID_KEY);
      await expect(client.send(sendInput)).rejects.toThrow(
        "Invalid email address",
      );
    });

    it("throws EmailProviderError when Resend throws an exception", async () => {
      mockEmailsSend.mockRejectedValue(new Error("Network timeout"));

      const client = new ResendClientImpl(VALID_KEY);
      await expect(client.send(sendInput)).rejects.toThrow(EmailProviderError);
    });

    it("wraps exception cause in EmailProviderError", async () => {
      const networkError = new Error("Network timeout");
      mockEmailsSend.mockRejectedValue(networkError);

      const client = new ResendClientImpl(VALID_KEY);
      try {
        await client.send(sendInput);
        expect.unreachable("Should have thrown");
      } catch (e) {
        expect(e).toBeInstanceOf(EmailProviderError);
        expect((e as EmailProviderError).cause).toBe(networkError);
      }
    });
  });
});
