import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { serializeIncome } from "@/lib/formatters";

// PATCH /api/incomes/[id]
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();

  const allowedFields = ["label", "amount"];
  const data: Record<string, unknown> = {};

  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      data[field] = body[field];
    }
  }

  const income = await prisma.income.update({
    where: { id },
    data,
  });

  return NextResponse.json(serializeIncome(income));
}

// DELETE /api/incomes/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  await prisma.income.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
