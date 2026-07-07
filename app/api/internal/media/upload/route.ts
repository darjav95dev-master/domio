import { NextRequest, NextResponse } from "next/server";
import {
  resolveTenantContext,
  tenantContextStorage,
  ContextResolutionError,
} from "@/infrastructure/tenant/context-middleware";
import { AuthenticatedContext } from "@/infrastructure/tenant/AuthenticatedContext";
import { MediaService } from "@/infrastructure/media/media.service";
import { UploadValidationError } from "@/infrastructure/media/types";
import {
  ALLOWED_UPLOAD_MIME_TYPES,
  MAX_UPLOAD_SIZE_BYTES,
  MAX_ALT_TEXT_LENGTH,
} from "@/infrastructure/media/constants";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const VALID_KINDS = ["IMAGE_GALLERY", "PLAN", "DOCUMENT"] as const;

const VALIDATION_FAILED = "Validation failed";
const AUTH_REQUIRED = "Authentication required";
const UPLOAD_FAILED = "Upload failed. Please try again.";

interface ValidationError {
  field: string;
  message: string;
}

interface UploadFormData {
  file: File | null;
  altText: string | null;
  kind: string | null;
  ownerId: string | null;
}

function resolveAuthContext(
  request: NextRequest,
): AuthenticatedContext {
  const url = new URL(request.url);

  const resolved = resolveTenantContext({
    host: url.host,
    pathname: url.pathname,
    headers: request.headers,
  });

  if (!(resolved instanceof AuthenticatedContext)) {
    throw new ContextResolutionError("Not authenticated", 401);
  }

  return resolved;
}

function fileTooLargeResponse(): NextResponse {
  return NextResponse.json(
    { error: "File size exceeds maximum allowed (10 MB)" },
    { status: 413 },
  );
}

function validationErrorResponse(
  details: ValidationError[],
): NextResponse {
  return NextResponse.json(
    { error: VALIDATION_FAILED, details },
    { status: 422 },
  );
}

function internalErrorResponse(): NextResponse {
  return NextResponse.json({ error: UPLOAD_FAILED }, { status: 500 });
}

function authRequiredResponse(): NextResponse {
  return NextResponse.json({ error: AUTH_REQUIRED }, { status: 401 });
}

function validateFileField(
  fileField: FormDataEntryValue | null,
  errors: ValidationError[],
): { file: File | null; tooLarge: boolean } {
  if (!fileField || !(fileField instanceof File)) {
    errors.push({ field: "file", message: "File is required" });
    return { file: null, tooLarge: false };
  }

  if (fileField.size > MAX_UPLOAD_SIZE_BYTES) {
    return { file: fileField, tooLarge: true };
  }

  if (
    !ALLOWED_UPLOAD_MIME_TYPES.includes(
      fileField.type as (typeof ALLOWED_UPLOAD_MIME_TYPES)[number],
    )
  ) {
    errors.push({ field: "file", message: "Unsupported file type" });
  }

  return { file: fileField, tooLarge: false };
}

function validateAltTextField(
  altTextField: FormDataEntryValue | null,
  errors: ValidationError[],
): void {
  const isEmpty =
    !altTextField ||
    typeof altTextField !== "string" ||
    altTextField.trim().length === 0;
  const tooLong =
    typeof altTextField === "string" &&
    altTextField.length > MAX_ALT_TEXT_LENGTH;

  if (isEmpty || tooLong) {
    errors.push({
      field: "altText",
      message:
        "alt_text is required and must be between 1 and 500 characters",
    });
  }
}

function validateKindField(
  kindField: FormDataEntryValue | null,
  errors: ValidationError[],
): void {
  if (
    !kindField ||
    typeof kindField !== "string" ||
    !VALID_KINDS.includes(kindField as (typeof VALID_KINDS)[number])
  ) {
    errors.push({
      field: "kind",
      message: "Invalid kind. Must be IMAGE_GALLERY, PLAN, or DOCUMENT",
    });
  }
}

function validateOwnerIdField(
  ownerIdField: FormDataEntryValue | null,
  errors: ValidationError[],
): void {
  if (
    !ownerIdField ||
    typeof ownerIdField !== "string" ||
    !UUID_REGEX.test(ownerIdField)
  ) {
    errors.push({
      field: "ownerId",
      message: "owner_id must be a valid UUID",
    });
  }
}

function extractAndValidateFields(
  formData: FormData,
): { fields: UploadFormData; errors: ValidationError[]; fileTooLarge: boolean } {
  const errors: ValidationError[] = [];

  const fileField = formData.get("file");
  const altTextField = formData.get("altText");
  const kindField = formData.get("kind");
  const ownerIdField = formData.get("ownerId");

  const { file: uploadedFile, tooLarge } = validateFileField(fileField, errors);

  if (tooLarge) {
    return {
      fields: { file: uploadedFile, altText: null, kind: null, ownerId: null },
      errors,
      fileTooLarge: true,
    };
  }

  validateAltTextField(altTextField, errors);
  validateKindField(kindField, errors);
  validateOwnerIdField(ownerIdField, errors);

  return {
    fields: {
      file: uploadedFile,
      altText: typeof altTextField === "string" ? altTextField : null,
      kind: typeof kindField === "string" ? kindField : null,
      ownerId: typeof ownerIdField === "string" ? ownerIdField : null,
    },
    errors,
    fileTooLarge: false,
  };
}

function uploadValidationErrorToResponse(
  error: UploadValidationError,
): NextResponse {
  const message = error.message;
  let field = "file";

  if (
    message.includes("alt_text") ||
    message.includes("altText") ||
    message.includes("Alt text")
  ) {
    field = "altText";
  } else if (
    message.includes("kind") ||
    message.includes("Kind") ||
    message.includes("Invalid kind")
  ) {
    field = "kind";
  }

  return NextResponse.json(
    {
      error: VALIDATION_FAILED,
      details: [{ field, message }],
    },
    { status: 422 },
  );
}

export async function POST(request: NextRequest) {
  // 1. Resolve tenant context
  let context: AuthenticatedContext;

  try {
    context = resolveAuthContext(request);
  } catch (error) {
    if (error instanceof ContextResolutionError) {
      return authRequiredResponse();
    }

    return internalErrorResponse();
  }

  // 2. Parse FormData
  let formData: FormData;

  try {
    formData = await request.formData();
  } catch {
    return internalErrorResponse();
  }

  // 3. Validate form fields
  const { fields, errors, fileTooLarge } = extractAndValidateFields(formData);

  if (fileTooLarge) {
    return fileTooLargeResponse();
  }

  if (errors.length > 0) {
    return validationErrorResponse(errors);
  }

  // 4. Convert File to Buffer (jsdom no implementa File.arrayBuffer ni File.text,
  // pero new Response(file).arrayBuffer() funciona porque usa Blob.slice)
  const fileBuffer = Buffer.from(
    await new Response(fields.file!).arrayBuffer(),
  );

  // 5. Create service and upload within tenant context
  const service = new MediaService(context.getTenantId());

  try {
    const asset = await tenantContextStorage.run(context, () =>
      service.uploadImage({
        file: fileBuffer,
        fileName: fields.file!.name,
        mimeType: fields.file!.type,
        altText: fields.altText!.trim(),
        kind: fields.kind as "IMAGE_GALLERY" | "PLAN" | "DOCUMENT",
        ownerId: fields.ownerId!,
      }),
    );

    return NextResponse.json({ asset }, { status: 201 });
  } catch (error) {
    if (error instanceof UploadValidationError) {
      return uploadValidationErrorToResponse(error);
    }

    return internalErrorResponse();
  }
}
