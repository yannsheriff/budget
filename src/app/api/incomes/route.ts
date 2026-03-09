import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { serializeIncome } from "@/lib/formatters";

// POST /api/incomes — create an income
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { monthId, label, amount } = body;

  if (!monthId || !label || amount === undefined) {
    return NextResponse.json(
      { error: "monthId, label, and amount are required" },
      { status: 400 }
    );
  }

  const income = await prisma.income.create({
    data: { monthId, label, amount },
  });

  return NextResponse.json(serializeIncome(income), { status: 201 });
}
