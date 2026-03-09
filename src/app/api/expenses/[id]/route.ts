import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { serializeExpense } from "@/lib/formatters";

// PATCH /api/expenses/[id]
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();

  const allowedFields = ["label", "amount", "frequency", "category", "isConfirmed", "isRemainder"];
  const data: Record<string, unknown> = {};

  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      data[field] = body[field];
    }
  }

  const expense = await prisma.expense.update({
    where: { id },
    data,
  });

  return NextResponse.json(serializeExpense(expense));
}

// DELETE /api/expenses/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  await prisma.expense.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
