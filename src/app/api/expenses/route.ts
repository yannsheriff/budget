import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { serializeExpense } from "@/lib/formatters";

// POST /api/expenses — create an expense
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { monthId, type, label, amount, frequency, category, isRemainder } = body;

  if (!monthId || !type || !label || amount === undefined) {
    return NextResponse.json(
      { error: "monthId, type, label, and amount are required" },
      { status: 400 }
    );
  }

  const expense = await prisma.expense.create({
    data: {
      monthId,
      type,
      label,
      amount,
      frequency: frequency ?? "MONTHLY",
      category: category ?? null,
      isRemainder: isRemainder ?? false,
      isConfirmed: true, // manually added expenses are already confirmed
    },
  });

  return NextResponse.json(serializeExpense(expense), { status: 201 });
}
