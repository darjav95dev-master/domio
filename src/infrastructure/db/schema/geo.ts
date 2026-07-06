import { customType } from "drizzle-orm/pg-core";

export type GeometryPoint = [number, number];

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
    if (typeof value !== "string") {
      return [0, 0];
    }

    const match = /POINT\s*\(\s*([\d.\-]+)\s+([\d.\-]+)\s*\)/u.exec(value);
    if (!match?.[1] || !match[2]) {
      return [0, 0];
    }

    return [Number.parseFloat(match[1]), Number.parseFloat(match[2])];
  },
});
