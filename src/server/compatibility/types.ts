export type BuildSlot =
  | "CPU"
  | "MOTHERBOARD"
  | "RAM"
  | "GPU"
  | "STORAGE"
  | "PSU"
  | "CASE"
  | "COOLER"
  | "MONITOR"
  | "ACCESSORY";

export type SpecValue = string | number | boolean | null | undefined;
export type SpecMap = Record<string, SpecValue>;

export interface BuildComponent {
  slot: BuildSlot;
  productId: string;
  name: string;
  price: number;
  specs: SpecMap;
  available?: boolean;
}

export type IssueSeverity = "ERROR" | "WARNING" | "UNKNOWN";

export type CompatibilityStatus =
  | "COMPATIBLE"
  | "WARNING"
  | "INCOMPATIBLE"
  | "INSUFFICIENT_DATA";

export interface CompatibilityIssue {
  ruleKey: string;
  severity: IssueSeverity;
  message: string;
  hint?: string;
  slots: BuildSlot[];
}

export interface CompatibilityReport {
  status: CompatibilityStatus;
  issues: CompatibilityIssue[];
  counts: { errors: number; warnings: number; unknowns: number };
}

export interface RuleOverride {
  isActive?: boolean;
  severity?: IssueSeverity;
  config?: Record<string, number | string | boolean>;
}

export type RuleOverrides = Record<string, RuleOverride>;

export interface BuildSelection {
  CPU?: BuildComponent;
  MOTHERBOARD?: BuildComponent;
  RAM?: BuildComponent;
  GPU?: BuildComponent;
  PSU?: BuildComponent;
  CASE?: BuildComponent;
  COOLER?: BuildComponent;
  STORAGE?: BuildComponent[];
  MONITOR?: BuildComponent;
  ACCESSORY?: BuildComponent[];
}

export interface CompatibilityResult extends CompatibilityReport {
  missingSlots: BuildSlot[];
  total: number;
  hasAvailabilityIssue: boolean;
}
