import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/auth/signup/route";

vi.mock("@/lib/prisma", () => ({
  db: {
    user: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
  },
}));

vi.mock("@/lib/mailer", () => ({
  sendMail: vi.fn(),
}));

vi.mock("@/lib/otpgenerator", () => ({
  generateOTP: vi.fn(() => "123456"),
}));

vi.mock("bcrypt", () => ({
  default: {
    hash: vi.fn(() => Promise.resolve("hashed-password")),
  },
}));

import { db } from "@/lib/prisma";

describe("POST /api/auth/signup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 400 for invalid input", async () => {
    const req = new NextRequest(
      "http://localhost:3000/api/auth/signup",
      {
        method: "POST",
        body: JSON.stringify({}),
      },
    );

    const res = await POST(req);

    expect(res.status).toBe(400);
  });

  it("should return 400 if user already exists", async () => {
    vi.mocked(db.user.findFirst).mockResolvedValue({
      id: "1",
      email: "test@test.com",
    } as any);

    const req = new NextRequest(
      "http://localhost:3000/api/auth/signup",
      {
        method: "POST",
        body: JSON.stringify({
          email: "test@test.com",
          username: "testuser",
          password: "password123",
        }),
      },
    );

    const res = await POST(req);

    expect(res.status).toBe(400);
  });

  it("should create user successfully", async () => {
    vi.mocked(db.user.findFirst).mockResolvedValue(null);

    vi.mocked(db.user.create).mockResolvedValue({
      id: "1",
      email: "test@test.com",
      username: "testuser",
      isVerified: false,
    } as any);

    const req = new NextRequest(
      "http://localhost:3000/api/auth/signup",
      {
        method: "POST",
        body: JSON.stringify({
          email: "test@test.com",
          username: "testuser",
          password: "password123",
        }),
      },
    );

    const res = await POST(req);

    expect(res.status).toBe(200);

    const data = await res.json();

    expect(data.success).toBe(true);
  });

  it("should return 500 if database fails", async () => {
    vi.mocked(db.user.findFirst).mockRejectedValue(
      new Error("Database error"),
    );

    const req = new NextRequest(
      "http://localhost:3000/api/auth/signup",
      {
        method: "POST",
        body: JSON.stringify({
          email: "test@test.com",
          username: "testuser",
          password: "password123",
        }),
      },
    );

    const res = await POST(req);

    expect(res.status).toBe(500);
  });
});