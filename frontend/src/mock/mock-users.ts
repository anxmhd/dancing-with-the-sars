/**
 * @synthetic Pre-seeded mock users for development.
 * These are NOT real Haouz plain researchers or advisors.
 * All names, emails, and identifiers are fictional.
 */

import type { User } from "../auth/types";

export interface MockUserRecord {
  user: User;
  password: string;
}

export const MOCK_USERS: readonly MockUserRecord[] = [
  {
    user: {
      id: "mock-user-001",
      email: "advisor@agri.haouz-demo.test",
      fullName: "Amina El Fassi",
      accountType: "regular",
      isVerifiedResearcher: false,
      emailVerified: true,
      createdAt: "2026-01-15T10:00:00Z",
    },
    password: "Haouz-Advisor-2026!",
  },
  {
    user: {
      id: "mock-user-002",
      email: "scientist@research.haouz-demo.test",
      fullName: "Youssef Benali",
      accountType: "scientific",
      isVerifiedResearcher: false,
      emailVerified: true,
      institution: "Université Cadi Ayyad",
      researchField: "Remote Sensing & Agricultural Science",
      orcidId: "0000-0002-1234-5678",
      createdAt: "2026-02-20T14:30:00Z",
    },
    password: "Science-Observer-2026!",
  },
  {
    user: {
      id: "mock-user-003",
      email: "researcher@research.haouz-demo.test",
      fullName: "Fatima Zahra Ouali",
      accountType: "scientific",
      isVerifiedResearcher: true,
      emailVerified: true,
      institution: "Institut Agronomique et Vétérinaire Hassan II",
      researchField: "Climate-Vegetation Interactions",
      orcidId: "0000-0003-9876-5432",
      createdAt: "2026-01-05T08:15:00Z",
    },
    password: "Haouz-Research-2026!",
  },
];
