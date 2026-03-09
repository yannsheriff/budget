import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { serializeMonth } from "@/lib/formatters";

/**
 * POST /api/months/find-or-create
 * Body: { year, month }
 * Returns the existing month or creates it (with recurring report from previous month).
 */
export async function POST(request: NextRequest) {
  const { year, month: monthNum } = await request.json();

  if (!year || !monthNum) {
    return NextResponse.json({ error: "year and month are required" }, { status: 400 });
  }

  // Check if already exists
  const existing = await prisma.month.findUnique({
    where: { year_month: { year, month: monthNum } },
    include: {
      expenses: { orderBy: { createdAt: "asc" } },
      incomes: { orderBy: { createdAt: "asc" } },
    },
  });

  if (existing) {
    return NextResponse.json(serializeMonth(existing));
  }

  // Find previous month
  const previousMonth = await prisma.month.findFirst({
    where: {
      OR: [
        { year, month: { lt: monthNum } },
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
      isConfirmed: previousMonth ? false : true,
    },
  });

  // Copy recurring expenses
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

  // Also insert installment expenses for this month
  const installments = await prisma.installment.findMany();
  const installmentExpenses = [];

  for (const inst of installments) {
    const startIndex = inst.startYear * 12 + inst.startMonth;
    const currentIndex = year * 12 + monthNum;
    const monthOffset = currentIndex - startIndex;

    if (monthOffset >= 0 && monthOffset < inst.nbMonths) {
      installmentExpenses.push({
        monthId: newMonth.id,
        type: "DIVERSE" as const,
        label: `${inst.label} ${monthOffset + 1}/${inst.nbMonths}`,
        amount: inst.totalAmount.div(inst.nbMonths),
        frequency: "MONTHLY" as const,
        category: null,
        isConfirmed: true,
        isRemainder: false,
        installmentId: inst.id,
      });
    }
  }

  if (installmentExpenses.length > 0) {
    await prisma.expense.createMany({ data: installmentExpenses });
  }

  // Return complete month
  const result = await prisma.month.findUnique({
    where: { id: newMonth.id },
    include: {
      expenses: { orderBy: { createdAt: "asc" } },
      incomes: { orderBy: { createdAt: "asc" } },
    },
  });

  return NextResponse.json(serializeMonth(result), { status: 201 });
}
