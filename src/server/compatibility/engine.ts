import { missingRequiredSlots, RULES, statusFromIssues, totalForSelection } from "./rules";
import type {
  BuildComponent,
  BuildSelection,
  CompatibilityIssue,
  CompatibilityReport,
  CompatibilityResult,
  RuleOverrides,
} from "./types";

const severityOrder: Record<CompatibilityIssue["severity"], number> = {
  ERROR: 0,
  WARNING: 1,
  UNKNOWN: 2,
};

/**
 * محرك التوافق — دالة نقية قابلة للاختبار، لا تعتمد على قاعدة البيانات أو الواجهة.
 * تُطبَّق القواعد القابلة للتعطيل/التعديل من جدول CompatibilityRule عبر `overrides`.
 */
export function evaluateSelection(selection: BuildSelection, overrides: RuleOverrides = {}): CompatibilityReport {
  const issues: CompatibilityIssue[] = [];

  for (const rule of RULES) {
    const override = overrides[rule.key];
    if (override?.isActive === false) continue;
    try {
      const found = rule.check({ selection, config: override?.config ?? {} });
      for (const item of found) {
        issues.push({
          ...item,
          severity: override?.severity ?? item.severity,
        });
      }
    } catch {
      issues.push({
        ruleKey: rule.key,
        severity: "UNKNOWN",
        message: `تعذر تنفيذ فحص «${rule.label}» بسبب بيانات غير مكتملة.`,
        slots: [],
        hint: "راجع مواصفات القطع المدخلة.",
      });
    }
  }

  issues.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  return {
    status: statusFromIssues(issues),
    issues,
    counts: {
      errors: issues.filter((i) => i.severity === "ERROR").length,
      warnings: issues.filter((i) => i.severity === "WARNING").length,
      unknowns: issues.filter((i) => i.severity === "UNKNOWN").length,
    },
  };
}

export function evaluateBuild(selection: BuildSelection, overrides: RuleOverrides = {}): CompatibilityResult {
  const report = evaluateSelection(selection, overrides);
  const all = [
    selection.CPU,
    selection.MOTHERBOARD,
    selection.RAM,
    selection.GPU,
    selection.PSU,
    selection.CASE,
    selection.COOLER,
    selection.MONITOR,
    ...(selection.STORAGE ?? []),
    ...(selection.ACCESSORY ?? []),
  ].filter((item): item is BuildComponent => Boolean(item));

  return {
    ...report,
    missingSlots: missingRequiredSlots(selection),
    total: totalForSelection(selection),
    hasAvailabilityIssue: all.some((item) => item.available === false),
  };
}

export function selectionFromComponents(components: BuildComponent[]): BuildSelection {
  const selection: BuildSelection = { STORAGE: [], ACCESSORY: [] };
  for (const component of components) {
    if (component.slot === "STORAGE") selection.STORAGE!.push(component);
    else if (component.slot === "ACCESSORY") selection.ACCESSORY!.push(component);
    else selection[component.slot] = component;
  }
  return selection;
}

export function summarizeStatus(status: CompatibilityReport["status"]): {
  label: string;
  tone: "success" | "warning" | "danger" | "neutral";
} {
  switch (status) {
    case "COMPATIBLE":
      return { label: "متوافق", tone: "success" };
    case "WARNING":
      return { label: "يحتاج مراجعة", tone: "warning" };
    case "INCOMPATIBLE":
      return { label: "غير متوافق", tone: "danger" };
    default:
      return { label: "بيانات غير كافية", tone: "neutral" };
  }
}

/**
 * نسبة توافق تقريبية للقطع المختارة (0–100) تُستخدم للعرض فقط.
 * لا تغيّر قرار التوافق نفسه: القرار النهائي يظل من `status` وقواعد المحرك.
 * تُخصم أيضًا الخانات الناقصة حتى لا تظهر تجميعة غير مكتملة بنسبة 100%.
 */
export function compatibilityScore(
  report: CompatibilityReport & { missingSlots?: ReadonlyArray<unknown> },
): number {
  const { errors, warnings, unknowns } = report.counts;
  const missing = report.missingSlots?.length ?? 0;
  const penalty = errors * 35 + warnings * 12 + unknowns * 8 + missing * 15;
  return Math.max(0, Math.min(100, 100 - penalty));
}
