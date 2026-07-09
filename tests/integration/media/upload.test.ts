import { describe, it, expect, vi } from "vitest";
import { POST } from "@app/api/internal/media/upload/route";

const { sendMock, JPEG_MIME_TYPE, VALID_ALT_TEXT, mockSession } = vi.hoisted(() => {
  const session = {
    userId: "user-1",
    tenantId: "00000000-0000-0000-0000-000000000001",
    role: "ADMIN" as const,
    name: "Test Admin",
  };

  return {
    sendMock: vi.fn().mockResolvedValue({}),
    JPEG_MIME_TYPE: "image/jpeg",
    VALID_ALT_TEXT: "Living room with sea view",
    mockSession: session,
  };
});

vi.mock("@/infrastructure/auth/session", () => ({
  getServerSession: vi.fn(() => Promise.resolve(mockSession)),
}));

vi.mock("@/infrastructure/media/r2-client", () => ({
  r2Client: { send: sendMock },
}));

vi.mock("@/infrastructure/db/client", () => {
  const returning = vi.fn().mockResolvedValue([{
    id: "11111111-1111-1111-1111-111111111111",
    tenantId: "00000000-0000-0000-0000-000000000001",
    ownerType: "PROMOCION",
    ownerId: "a4c9f123-4567-89ab-cdef-0123456789ab",
    kind: "IMAGE_GALLERY",
    r2Key: "22222222-2222-2222-2222-222222222222.jpg",
    mimeType: JPEG_MIME_TYPE,
    sizeBytes: 18,
    altText: VALID_ALT_TEXT,
    sortOrder: 0,
    isCover: false,
    createdAt: new Date("2026-01-01T00:00:00Z"),
  }]);
  const values = vi.fn().mockReturnValue({ returning });
  const insert = vi.fn().mockReturnValue({ values });

  return {
    db: {
      transaction: vi.fn().mockImplementation(async (callback) => {
        const tx = {
          insert,
          execute: vi.fn().mockResolvedValue(undefined),
        };
        return callback(tx);
      }),
    },
  };
});

const UPLOAD_URL = "https://panel.domio.com/api/internal/media/upload";
const VALID_OWNER_ID = "a4c9f123-4567-89ab-cdef-0123456789ab";

function createRequest(formData: FormData, _includeSession = true) {
  return new Request(UPLOAD_URL, {
    method: "POST",
    body: formData,
  });
}

function createFile(
  content: BlobPart,
  name: string,
  type: string,
): File {
  return new File([content], name, { type });
}

function createValidFormData(): FormData {
  const formData = new FormData();
  formData.append(
    "file",
    createFile(Buffer.from("valid image bytes"), "photo.jpg", JPEG_MIME_TYPE),
  );
  formData.append("altText", VALID_ALT_TEXT);
  formData.append("kind", "IMAGE_GALLERY");
  formData.append("ownerId", VALID_OWNER_ID);

  return formData;
}

describe("POST /api/internal/media/upload", () => {
  it("should return 201 with asset metadata for a valid upload", async () => {
    const response = await POST(
      createRequest(createValidFormData()) as unknown as Parameters<
        typeof POST
      >[0],
    );

    expect(response.status).toBe(201);

    const body = await response.json();

    expect(body.asset).toMatchObject({
      kind: "IMAGE_GALLERY",
      mimeType: JPEG_MIME_TYPE,
      sizeBytes: expect.any(Number),
      altText: VALID_ALT_TEXT,
      sortOrder: 0,
      isCover: false,
    });
    expect(body.asset.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
    expect(body.asset.r2Key).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.jpg$/,
    );
    expect(body.asset.createdAt).toMatch(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
    );
  });

  it("should return 422 when alt_text is missing", async () => {
    const formData = createValidFormData();
    formData.delete("altText");

    const response = await POST(
      createRequest(formData) as unknown as Parameters<typeof POST>[0],
    );

    expect(response.status).toBe(422);

    const body = await response.json();

    expect(body.error).toBe("Validation failed");
    expect(body.details).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: "altText",
          message: "alt_text is required and must be between 1 and 500 characters",
        }),
      ]),
    );
  });

  it("should return 413 when the file exceeds the maximum allowed size", async () => {
    const formData = createValidFormData();
    formData.set(
      "file",
      createFile(
        Buffer.alloc(10 * 1024 * 1024 + 1),
        "huge.jpg",
        JPEG_MIME_TYPE,
      ),
    );

    const response = await POST(
      createRequest(formData) as unknown as Parameters<typeof POST>[0],
    );

    expect(response.status).toBe(413);

    const body = await response.json();

    expect(body.error).toBe("File size exceeds maximum allowed (10 MB)");
  });

  it("should return 422 for an unsupported MIME type", async () => {
    const formData = createValidFormData();
    formData.set("file", createFile("<html></html>", "page.html", "text/html"));

    const response = await POST(
      createRequest(formData) as unknown as Parameters<typeof POST>[0],
    );

    expect(response.status).toBe(422);

    const body = await response.json();

    expect(body.error).toBe("Validation failed");
    expect(body.details).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: "file",
          message: "Unsupported file type",
        }),
      ]),
    );
  });

  it("should return 401 when authentication is missing", async () => {
    const { getServerSession } = await import(
      "@/infrastructure/auth/session"
    );
    vi.mocked(getServerSession).mockResolvedValueOnce(null);

    const response = await POST(
      createRequest(createValidFormData()) as unknown as Parameters<
        typeof POST
      >[0],
    );

    expect(response.status).toBe(401);

    const body = await response.json();

    expect(body.error).toBe("Authentication required");
  });
});
