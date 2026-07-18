import { describe, it, expect } from "vitest";
import { serializeJsonLd } from "../json-ld";

describe("serializeJsonLd", () => {
  it("produces valid JSON that round-trips", () => {
    const data = { "@type": "Product", name: "Piso en Arona" };
    expect(JSON.parse(serializeJsonLd(data))).toEqual(data);
  });

  it("escapes < so a </script> in editable content cannot break out", () => {
    const out = serializeJsonLd({ name: "Casa </script><script>alert(1)</script>" });
    expect(out).not.toContain("</script>");
    expect(out).toContain("\\u003c");
    // sigue siendo JSON válido y conserva el valor original al parsear
    expect(JSON.parse(out).name).toBe("Casa </script><script>alert(1)</script>");
  });
});
