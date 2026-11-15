/**
 * @synthetic Mock authentication service.
 * Not connected to any real backend. Uses localStorage for persistence.
 */

import type {
  User,
  LoginCredentials,
  RegularRegistrationData,
  ScientificRegistrationData,
  AuthError,
  AccountType,
} from "./types";
import { MOCK_USERS } from "../mock/mock-users";
import type { MockUserRecord } from "../mock/mock-users";

const STORAGE_KEYS = {
  CURRENT_USER: "dws_current_user",
  USERS_DB: "dws_users_db",
} as const;

function getStoredUsers(): MockUserRecord[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.USERS_DB);
    if (stored) {
      const savedUsers: unknown = JSON.parse(stored);
      if (Array.isArray(savedUsers)) {
        const users = savedUsers as MockUserRecord[];
        for (const seed of MOCK_USERS) {
          const index = users.findIndex((record) => record.user.id === seed.user.id);
          if (index === -1) {
            users.push({ ...seed, user: { ...seed.user } });
          } else {
            const existing = users[index];
            users[index] = {
              ...existing,
              password: seed.password,
              user: { ...existing.user, email: seed.user.email },
            };
          }
        }
        localStorage.setItem(STORAGE_KEYS.USERS_DB, JSON.stringify(users));
        return users;
      }
    }
  } catch {
    // Ignore parse errors — re-seed below.
  }
  const seed = MOCK_USERS.map((r) => ({ ...r, user: { ...r.user } }));
  localStorage.setItem(STORAGE_KEYS.USERS_DB, JSON.stringify(seed));
  return seed;
}

function saveUsers(users: MockUserRecord[]): void {
  localStorage.setItem(STORAGE_KEYS.USERS_DB, JSON.stringify(users));
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function generateId(): string {
  return `user-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

function throwAuthError(code: string, message: string): never {
  const error: AuthError = { code, message };
  throw error;
}

export const mockAuth = {
  async login(credentials: LoginCredentials, selectedAccountType: AccountType): Promise<User> {
    await delay(600);
    const users = getStoredUsers();
    const record = users.find(
      (u) =>
        u.user.email === credentials.email &&
        u.password === credentials.password,
    );
    if (!record) {
      throwAuthError("INVALID_CREDENTIALS", "Invalid email or password.");
    }
    if (record.user.accountType !== selectedAccountType) {
      throwAuthError(
        "ACCOUNT_TYPE_MISMATCH",
        "This account does not match the selected account type. Choose the account type used when it was created.",
      );
    }
    if (!record.user.emailVerified) {
      throwAuthError(
        "EMAIL_NOT_VERIFIED",
        "Please verify your email address before signing in.",
      );
    }
    localStorage.setItem(
      STORAGE_KEYS.CURRENT_USER,
      JSON.stringify(record.user),
    );
    return record.user;
  },

  async register(
    data: RegularRegistrationData | ScientificRegistrationData,
    accountType: AccountType,
  ): Promise<User> {
    await delay(800);
    const users = getStoredUsers();
    if (users.some((u) => u.user.email === data.email)) {
      throwAuthError(
        "EMAIL_EXISTS",
        "An account with this email already exists.",
      );
    }
    const scientificData =
      accountType === "scientific"
        ? (data as ScientificRegistrationData)
        : undefined;
    const newUser: User = {
      id: generateId(),
      email: data.email,
      fullName: data.fullName,
      accountType,
      isVerifiedResearcher: false,
      emailVerified: false,
      institution: scientificData?.institution,
      researchField: scientificData?.researchField,
      orcidId: scientificData?.orcidId,
      createdAt: new Date().toISOString(),
    };
    users.push({ user: newUser, password: data.password });
    saveUsers(users);
    return newUser;
  },

  async verifyEmail(userId: string): Promise<User> {
    await delay(500);
    const users = getStoredUsers();
    const record = users.find((u) => u.user.id === userId);
    if (!record) {
      throwAuthError("USER_NOT_FOUND", "User not found.");
    }
    record.user.emailVerified = true;
    saveUsers(users);
    return record.user;
  },

  async getCurrentUser(): Promise<User | null> {
    await delay(200);
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
      if (stored) {
        return JSON.parse(stored) as User;
      }
    } catch {
      // Ignore
    }
    return null;
  },

  async logout(): Promise<void> {
    await delay(300);
    localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
  },

  async updateProfile(
    userId: string,
    updates: Partial<Pick<User, "fullName">>,
  ): Promise<User> {
    await delay(400);
    const users = getStoredUsers();
    const record = users.find((u) => u.user.id === userId);
    if (!record) {
      throwAuthError("USER_NOT_FOUND", "User not found.");
    }
    Object.assign(record.user, updates);
    saveUsers(users);
    localStorage.setItem(
      STORAGE_KEYS.CURRENT_USER,
      JSON.stringify(record.user),
    );
    return record.user;
  },
};
