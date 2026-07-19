import { customType } from "drizzle-orm/pg-core";

export type GeometryPoint = [number, number];

function parseWkt(value: string): GeometryPoint | null {
  const m = /POINT\s*\(\s*([\d.\-]+)\s+([\d.\-]+)\s*\)/u.exec(value);
  if (m?.[1] && m[2]) return [Number.parseFloat(m[1]), Number.parseFloat(m[2])];
  return null;
}

function parseEwkbHex(value: string): GeometryPoint | null {
  if (!/^[0-9a-fA-F]+$/.test(value) || value.length < 42) return null;
  const buf = Buffer.from(value, "hex");
  const le = buf[0] === 0x01;
  const type = le ? buf.readUInt32LE(1) : buf.readUInt32BE(1);
  if ((type & 0xffff) !== 1) return null;
  const off = 5 + ((type & 0x20000000) !== 0 ? 4 : 0);
  const x = le ? buf.readDoubleLE(off) : buf.readDoubleBE(off);
  const y = le ? buf.readDoubleLE(off + 8) : buf.readDoubleBE(off + 8);
  return [x, y];
}

export const geometryPoint4326 = customType<{
  data: GeometryPoint;
  notNull: false;
  default: false;
}>({
  dataType() {
    return "geometry(Point,4326)";
  },
  toDriver(value: GeometryPoint): string {
    return `POINT(${value[0]} ${value[1]})`;
  },
  fromDriver(value): GeometryPoint {
    if (typeof value !== "string") return [0, 0];
    return parseWkt(value) ?? parseEwkbHex(value) ?? [0, 0];
  },
});
