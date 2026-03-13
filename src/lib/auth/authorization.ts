export type UserRole = "admin" | "cap" | "cre";
export type RecordsTable = "CAP" | "CRE";

export function extractRawUserRole(user: unknown): string | null {
  if (!user || typeof user !== "object" || !("role" in user)) return null;
  const role = (user as { role?: unknown }).role;
  return typeof role === "string" ? role : null;
}

export function normalizeUserRole(role: string | null | undefined): UserRole | null {
  if (!role) return null;
  const normalized = role.trim().toLowerCase();
  if (normalized === "admin" || normalized === "cap" || normalized === "cre") {
    return normalized;
  }
  return null;
}

export function tableFromInstitution(isCAP: boolean): RecordsTable {
  return isCAP ? "CAP" : "CRE";
}

export function canAccessTable(role: UserRole, table: RecordsTable): boolean {
  if (role === "admin") return true;
  if (role === "cap") return table === "CAP";
  return table === "CRE";
}
