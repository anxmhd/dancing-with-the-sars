/** Account type chosen at registration. */
export type AccountType = "regular" | "scientific";

/**
 * Application user.
 * Scientific accounts may have additional institution and research fields.
 * `isVerifiedResearcher` is a separate administrative state — it is never
 * granted automatically upon registration.
 */
export interface User {
  readonly id: string;
  email: string;
  fullName: string;
  accountType: AccountType;
  isVerifiedResearcher: boolean;
  emailVerified: boolean;
  institution?: string;
  researchField?: string;
  orcidId?: string;
  readonly createdAt: string; // ISO 8601
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegularRegistrationData {
  fullName: string;
  email: string;
  password: string;
}

export interface ScientificRegistrationData extends RegularRegistrationData {
  institution: string;
  researchField: string;
  orcidId?: string;
}

export interface AuthError {
  code: string;
  message: string;
}
