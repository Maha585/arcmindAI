import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/generate/route";

vi.mock("@/lib/prisma", () => ({
  db: {
    user: {
      findFirst: vi.fn(),
    },
    generation: {
      count: vi.fn(),
      create: vi.fn(),
    },
  },
}));

vi.mock("@/lib/rateLimit", () => ({
  generationRateLimit: {
    limit: vi.fn(),
  },
}));

vi.mock("@/app/(protected)/generate/utils/aiClient", () => ({
  invokeGeminiWithFallback: vi.fn(),
}));

vi.mock("@/lib/api-keys/getUserApiKeys", () => ({
  getUserApiKeys: vi.fn(),
}));

import { db } from "@/lib/prisma";
import { generationRateLimit } from "@/lib/rateLimit";
import { invokeGeminiWithFallback } from "@/app/(protected)/generate/utils/aiClient";
import { getUserApiKeys } from "@/lib/api-keys/getUserApiKeys";

describe("POST /api/generate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 400 if request body is invalid", async () => {
    const req = new NextRequest("http://localhost/api/generate", {
      method: "POST",
      body: JSON.stringify({}),
    });

    const res = await POST(req);

    expect(res.status).toBe(400);
  });

  it("should return 404 if user does not exist", async () => {
    vi.mocked(db.user.findFirst).mockResolvedValue(null);

    const req = new NextRequest("http://localhost/api/generate", {
      method: "POST",
      body: JSON.stringify({
        userInput: "Build an AI app",
        userId: "123",
      }),
    });

    const res = await POST(req);

    expect(res.status).not.toBe(200);
  });

  it("should return 403 if plan limit is exceeded", async () => {
    vi.mocked(db.user.findFirst).mockResolvedValue({
      id: "123",
      isVerified: true,
      plan: "free",
    } as any);

    vi.mocked(db.generation.count).mockResolvedValue(10);

    const req = new NextRequest("http://localhost/api/generate", {
      method: "POST",
      body: JSON.stringify({
        userInput: "Build an AI app",
        userId: "123",
      }),
    });

    const res = await POST(req);

    expect(res.status).toBe(403);
  });

  it("should return 429 when rate limit is exceeded", async () => {
    vi.mocked(db.user.findFirst).mockResolvedValue({
      id: "123",
      isVerified: true,
      plan: "free",
    } as any);

    vi.mocked(db.generation.count).mockResolvedValue(1);

    vi.mocked(generationRateLimit.limit).mockResolvedValue({
      success: false,
      limit: 1,
      remaining: 0,
      reset: 100,
    });

    const req = new NextRequest("http://localhost/api/generate", {
      method: "POST",
      body: JSON.stringify({
        userInput: "Build an AI app",
        userId: "123",
      }),
    });

    const res = await POST(req);

    expect(res.status).toBe(429);
  });

  it("should generate successfully", async () => {
    vi.mocked(db.user.findFirst).mockResolvedValue({
      id: "123",
      isVerified: true,
      plan: "free",
    } as any);

    vi.mocked(db.generation.count).mockResolvedValue(1);

    vi.mocked(generationRateLimit.limit).mockResolvedValue({
      success: true,
      limit: 1,
      remaining: 1,
      reset: 100,
    });

    vi.mocked(getUserApiKeys).mockResolvedValue({
      geminiApiKey: "fake-key",
    });

    vi.mocked(invokeGeminiWithFallback).mockResolvedValue({
      response: {
        content: `\`\`\`json
{
  "title": "AI Project"
}
\`\`\``,
      },
    });

    vi.mocked(db.generation.create).mockResolvedValue({} as any);

    const req = new NextRequest("http://localhost/api/generate", {
      method: "POST",
      body: JSON.stringify({
        userInput: "Build an AI app",
        userId: "123",
      }),
    });

    const res = await POST(req);

    expect(res.status).toBe(200);

    const data = await res.json();

    expect(data.success).toBe(true);
  });
});