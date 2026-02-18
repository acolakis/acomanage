import { Session } from "next-auth";

interface SessionUser {
  id: string;
  role: string;
  companyIds: string[];
}

/**
 * Returns a Prisma `where` filter that restricts results to companies
 * accessible by the current user. For CLIENT users, this limits to their
 * assigned companies. For ADMIN/EMPLOYEE users, returns an empty filter
 * (no restriction).
 */
export function getCompanyFilter(session: Session): Record<string, unknown> {
  const user = session.user as SessionUser;
  if (user.role === "CLIENT") {
    return { companyId: { in: user.companyIds } };
  }
  return {};
}

/**
 * Checks whether a CLIENT user has access to a specific company.
 * Returns true for ADMIN/EMPLOYEE users (unrestricted).
 */
export function hasCompanyAccess(session: Session, companyId: string): boolean {
  const user = session.user as SessionUser;
  if (user.role === "CLIENT") {
    return user.companyIds.includes(companyId);
  }
  return true;
}
