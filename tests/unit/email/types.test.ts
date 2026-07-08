import { describe, it, expect } from "vitest";
import {
  EmailProviderError,
  ConfigurationError,
} from "@/infrastructure/email/types";

function assertErrorInstance(
  ErrorClass: new (msg: string) => Error,
  message: string,
  name: string,
) {
  const error = new ErrorClass(message);
  expect(error).toBeInstanceOf(Error);
  expect(error.name).toBe(name);
  expect(error.message).toBe(message);
}

describe("EmailProviderError", () => {
  it("is an Error with correct properties", () => {
    assertErrorInstance(EmailProviderError, "Resend returned 429", "EmailProviderError");
  });

  it("optionally stores a cause", () => {
    const cause = new Error("Underlying network error");
    const error = new EmailProviderError("Resend returned 429", cause);
    expect(error.cause).toBe(cause);
  });
});

describe("ConfigurationError", () => {
  it("is an Error with correct properties", () => {
    assertErrorInstance(ConfigurationError, "RESEND_API_KEY is not set", "ConfigurationError");
  });
});
