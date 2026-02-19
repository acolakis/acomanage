import { cookies } from "next/headers";

const COOKIE_NAME = "selectedCompanyId";

/**
 * Gets the currently selected company ID from the cookie.
 * Returns null if no company is selected (= show all).
 * Used in Server Components to filter data.
 */
export function getSelectedCompanyId(): string | null {
  const cookieStore = cookies();
  const value = cookieStore.get(COOKIE_NAME)?.value;
  return value || null;
}

/**
 * Builds a Prisma where clause for filtering by the selected company.
 * Returns empty object if no company is selected.
 * The field name can be customized (default: "companyId").
 */
export function getSelectedCompanyFilter(
  field: string = "companyId"
): Record<string, unknown> {
  const companyId = getSelectedCompanyId();
  if (!companyId) return {};
  return { [field]: companyId };
}
