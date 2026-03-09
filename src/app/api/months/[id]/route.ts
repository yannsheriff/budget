import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { serializeMonth } from "@/lib/formatters";

// GET /api/months/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const month = await prisma.month.findUnique({
    where: { id },
    include: {
      expenses: { orderBy: { createdAt: "asc" } },
      incomes: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!month) {
    return NextResponse.json({ error: "Month not found" }, { status: 404 });
  }

  return NextResponse.json(serializeMonth(month));
}

// PATCH /api/months/[id]
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();

  const allowedFields = ["salary", "overdraft", "weeklyEverydayBudget", "isConfirmed"];
  const data: Record<string, unknown> = {};

  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      data[field] = body[field];
    }
  }

  const month = await prisma.month.update({
    where: { id },
    data,
    include: {
      expenses: { orderBy: { createdAt: "asc" } },
      incomes: { orderBy: { createdAt: "asc" } },
    },
  });

  return NextResponse.json(serializeMonth(month));
}
