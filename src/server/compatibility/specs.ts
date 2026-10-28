import type { BuildComponent, SpecMap, SpecValue } from "./types";

export function getSpec(component: BuildComponent | undefined, key: string): SpecValue {
  if (!component) return undefined;
  return component.specs[key];
}

export function hasSpec(component: BuildComponent | undefined, key: string): boolean {
  const value = getSpec(component, key);
  return value !== undefined && value !== null && String(value).trim() !== "";
}

export function text(component: BuildComponent | undefined, key: string): string | null {
  const value = getSpec(component, key);
  if (value === undefined || value === null) return null;
  const str = String(value).trim();
  return str === "" ? null : str;
}

export function numberValue(component: BuildComponent | undefined, key: string): number | null {
  const value = getSpec(component, key);
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string") {
    const match = value.replace(/,/g, ".").match(/-?\d+(\.\d+)?/);
    if (!match) return null;
    const parsed = Number(match[0]);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

export function booleanValue(component: BuildComponent | undefined, key: string): boolean | null {
  const value = getSpec(component, key);
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "yes", "1", "نعم", "نعم مدعوم"].includes(normalized)) return true;
    if (["false", "no", "0", "لا"].includes(normalized)) return false;
  }
  return null;
}

export function list(component: BuildComponent | undefined, key: string): string[] {
  const value = getSpec(component, key);
  if (value === undefined || value === null) return [];
  if (Array.isArray(value)) return value.map((v) => String(v).trim()).filter(Boolean);
  return String(value)
    .split(/[,|;،\n]/)
    .map((v) => v.trim())
    .filter(Boolean);
}

export function normalize(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[أإآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه");
}

export function includesNormalized(values: string[], candidate: string): boolean {
  const target = normalize(candidate);
  return values.some((v) => normalize(v) === target);
}

export function resolvedSpecs(entries: Array<{ key: string; value: string; numericValue: unknown; dataType: string }>): SpecMap {
  const map: SpecMap = {};
  for (const entry of entries) {
    if (entry.dataType === "NUMBER") {
      const numeric = entry.numericValue === null || entry.numericValue === undefined ? Number(entry.value) : Number(entry.numericValue.toString());
      map[entry.key] = Number.isFinite(numeric) ? numeric : entry.value;
    } else if (entry.dataType === "BOOLEAN") {
      map[entry.key] = ["true", "1", "نعم"].includes(entry.value.trim().toLowerCase());
    } else {
      map[entry.key] = entry.value;
    }
  }
  return map;
}

/** تحويل نص مواصفات مثل "8pin x2" إلى عدد موصلات */
export function countConnectors(component: BuildComponent | undefined, key: string, connectorPattern: RegExp): number | null {
  const values = list(component, key);
  if (values.length === 0) return null;
  let total = 0;
  for (const entry of values) {
    if (!connectorPattern.test(entry.toLowerCase())) continue;
    const multiplier = entry.match(/x\s*(\d+)/i) ?? entry.match(/(\d+)\s*x/i) ?? entry.match(/×\s*(\d+)/);
    total += multiplier ? Number(multiplier[1]) : 1;
  }
  return total;
}
