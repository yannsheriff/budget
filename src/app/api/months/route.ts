import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { serializeMonth } from "@/lib/formatters";

// GET /api/months — list all months
export async function GET() {
  const months = await prisma.month.findMany({
    orderBy: [{ year: "desc" }, { month: "desc" }],
    include: { expenses: true, incomes: true },
  });

  return NextResponse.json(months.map(serializeMonth));
}

// POST /api/months — create a new month
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { year, month: monthNum } = body;

  if (!year || !monthNum) {
    return NextResponse.json(
      { error: "year and month are required" },
      { status: 400 }
    );
  }

  // Check if already exists
  const existing = await prisma.month.findUnique({
    where: { year_month: { year, month: monthNum } },
  });

  if (existing) {
    return NextResponse.json(
      { error: "Month already exists" },
      { status: 409 }
    );
  }

  // Find previous month to copy recurring expenses + defaults
  const previousMonth = await prisma.month.findFirst({
    where: {
      OR: [
        { year: year, month: { lt: monthNum } },
        { year: { lt: year } },
      ],
    },
    orderBy: [{ year: "desc" }, { month: "desc" }],
    include: { expenses: { where: { type: "RECURRING" } } },
  });

  // Create the new month
  const newMonth = await prisma.month.create({
    data: {
      year,
      month: monthNum,
      salary: previousMonth?.salary ?? 0,
      weeklyEverydayBudget: previousMonth?.weeklyEverydayBudget ?? 0,
      overdraft: 0,
      isConfirmed: previousMonth ? false : true, // no check needed for first month
    },
  });

  // Copy recurring expenses from previous month
  if (previousMonth && previousMonth.expenses.length > 0) {
    await prisma.expense.createMany({
      data: previousMonth.expenses.map((e) => ({
        monthId: newMonth.id,
        type: "RECURRING" as const,
        label: e.label,
        amount: e.amount,
        frequency: e.frequency,
        category: e.category,
        isConfirmed: false,
        isRemainder: false,
      })),
    });
  }

  // Fetch the complete month with relations
  const result = await prisma.month.findUnique({
    where: { id: newMonth.id },
    include: { expenses: true, incomes: true },
  });

  return NextResponse.json(serializeMonth(result), { status: 201 });
}
