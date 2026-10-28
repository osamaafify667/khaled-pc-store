/**
 * توحيد أرقام الهواتف المصرية.
 * يقبل: 01012345678 / +201012345678 / 00201012345678 / 0020 10 1234 5678
 */
export function normalizeEgyptianPhone(input: string): string {
  let phone = input.replace(/[\s\-().]/g, "").trim();
  if (phone.startsWith("+20")) phone = `0${phone.slice(3)}`;
  else if (phone.startsWith("0020")) phone = `0${phone.slice(4)}`;
  else if (phone.startsWith("20") && phone.length === 12) phone = `0${phone.slice(2)}`;
  return phone;
}

export function isValidEgyptianPhone(input: string): boolean {
  return /^01[0125]\d{8}$/.test(normalizeEgyptianPhone(input));
}

export function isValidEgyptianLandline(input: string): boolean {
  return /^0[2-9]\d{7,8}$/.test(normalizeEgyptianPhone(input));
}

/** يعيد رقمًا مناسبًا لواتساب الدولي */
export function toWhatsAppNumber(input: string): string {
  const normalized = normalizeEgyptianPhone(input);
  if (normalized.startsWith("0")) return `20${normalized.slice(1)}`;
  return normalized;
}
