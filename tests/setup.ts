import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

afterEach(cleanup);

// ─── Parche jsdom: Request + FormData ───────────────────────────────────────
// jsdom no serializa FormData correctamente como cuerpo de Request: convierte
// el body a la string "[object FormData]" y no establece el Content-Type
// multipart/form-data. Esto rompe request.formData() en tests de integración.
// Solución: interceptamos el constructor Request, extraemos el FormData
// original, y lo devolvemos desde formData() vía WeakMap.
// El parche se aplica una sola vez al cargar el setup.
const formDataStore = new WeakMap<Request, FormData>();
const OrigRequest = globalThis.Request;

class PatchedRequest extends OrigRequest {
  constructor(input: RequestInfo | URL, init?: RequestInit) {
    if (init?.body instanceof globalThis.FormData) {
      const fd = init.body;
      const headers = new Headers(init.headers);
      headers.set(
        "content-type",
        "multipart/form-data; boundary=----TestBoundary",
      );
      super(input, { ...init, body: undefined, headers });
      formDataStore.set(this, fd);
    } else {
      super(input, init);
    }
  }

  async formData(): Promise<FormData> {
    const stored = formDataStore.get(this);
    if (stored) return stored;
    return super.formData();
  }
}

globalThis.Request = PatchedRequest as unknown as typeof Request;
// ─── Fin parche jsdom ────────────────────────────────────────────────────────
// Este parche es necesario mientras Vitest use jsdom (jsdom no serializa
// FormData como cuerpo de Request correctamente). Si se migra a node
// environment, puede eliminarse.

// Configuración global de variables de entorno para el entorno de test.
// El patrón lazy (Proxy) en env.ts retrasa la validación al primer acceso
// a una propiedad, por lo que estas vars deben estar definidas antes de
// cualquier acceso a tenantEnv.xxx o mediaEnv.xxx durante los tests.
const TEST_PUBLIC_TENANT_ID = "00000000-0000-0000-0000-000000000001";

process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test";
process.env.PUBLIC_TENANT_ID = TEST_PUBLIC_TENANT_ID;
process.env.R2_ACCOUNT_ID = "test-account-id";
process.env.R2_ACCESS_KEY_ID = "test-access-key";
process.env.R2_SECRET_ACCESS_KEY = "test-secret-key";
process.env.R2_BUCKET = "test-bucket";
process.env.R2_PUBLIC_URL = "https://test.example.com";
process.env.NODE_ENV = "development";

// Restore env stubs after each test (not before the next one). If the config
// unstubs "before each test", it is too late: the next file's collect already
// imported React with a contaminated NODE_ENV, and singleFork's require cache
// freezes it, causing a jsxDEV crash.
afterEach(() => {
  vi.unstubAllEnvs();
});
