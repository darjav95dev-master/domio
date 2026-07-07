import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

afterEach(cleanup);

// Restaurar env stubs justo después de cada test, NO al inicio del siguiente
// (unstubEnvs de la config restaura "before each test", demasiado tarde: el
// collect del siguiente archivo ya importó React con el NODE_ENV contaminado
// y el require cache lo fija para todo el proceso singleFork → jsxDEV crash).
afterEach(() => {
  vi.unstubAllEnvs();
});
