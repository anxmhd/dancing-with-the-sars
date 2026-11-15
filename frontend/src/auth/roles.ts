import type { AccountType, User } from "./types";

export type AppRole = "advisor" | "researcher";

export function roleForAccountType(accountType: AccountType): AppRole {
  return accountType === "regular" ? "advisor" : "researcher";
}

export function roleForUser(user: User): AppRole {
  return roleForAccountType(user.accountType);
}

export function dashboardPathForRole(role: AppRole): string {
  return role === "advisor" ? "/advisor/dashboard" : "/researcher/dashboard";
}

export function dashboardPathForUser(user: User): string {
  return dashboardPathForRole(roleForUser(user));
}
