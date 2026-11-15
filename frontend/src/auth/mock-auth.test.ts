import { afterEach, describe, expect, it, vi } from "vitest";
import { mockAuth } from "./mock-auth";

function createMemoryStorage(): Storage {
  const values = new Map<string, string>();
  return {
    get length() { return values.size; },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => [...values.keys()][index] ?? null,
    removeItem: (key) => { values.delete(key); },
    setItem: (key, value) => { values.set(key, String(value)); },
  };
}

describe("mock authentication role validation", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("rejects credentials when the selected account type differs from the stored account", async () => {
    vi.stubGlobal("localStorage", createMemoryStorage());

    await expect(
      mockAuth.login({ email: "advisor@agri.haouz-demo.test", password: "Haouz-Advisor-2026!" }, "scientific"),
    ).rejects.toMatchObject({ code: "ACCOUNT_TYPE_MISMATCH" });
  });

  it("migrates the seeded advisor credentials and accepts the fictional demo domain", async () => {
    const storage = createMemoryStorage();
    storage.setItem("dws_users_db", JSON.stringify([{
      user: {
        id: "mock-user-001",
        email: "advisor@example.com",
        fullName: "Amina El Fassi",
        accountType: "regular",
        isVerifiedResearcher: false,
        emailVerified: true,
        createdAt: "2026-01-15T10:00:00Z",
      },
      password: "advisor123",
    }]));
    vi.stubGlobal("localStorage", storage);

    const user = await mockAuth.login(
      { email: "advisor@agri.haouz-demo.test", password: "Haouz-Advisor-2026!" },
      "regular",
    );

    expect(user.email).toBe("advisor@agri.haouz-demo.test");
    expect(JSON.parse(storage.getItem("dws_users_db") ?? "[]")).toHaveLength(3);
  });
});
