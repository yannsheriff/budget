import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { toNumber } from "@/lib/formatters";

// GET /api/installments — list all installments with computed progress
export async function GET() {
  const installments = await prisma.installment.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      expenses: {
        select: { id: true, monthId: true, label: true },
      },
    },
  });

  const now = new Date();
  const currentIndex = now.getFullYear() * 12 + (now.getMonth() + 1);

  const result = installments.map((inst) => {
    const startIndex = inst.startYear * 12 + inst.startMonth;
    const endIndex = startIndex + inst.nbMonths - 1;
    const paid = Math.min(
      Math.max(0, currentIndex - startIndex + 1),
      inst.nbMonths
    );
    const isComplete = paid >= inst.nbMonths;

    // Compute end month/year
    const endMonth = ((endIndex - 1) % 12) + 1;
    const endYear = Math.floor((endIndex - 1) / 12);

    return {
      id: inst.id,
      label: inst.label,
      totalAmount: toNumber(inst.totalAmount),
      nbMonths: inst.nbMonths,
      amountPerMonth: toNumber(inst.totalAmount) / inst.nbMonths,
      startYear: inst.startYear,
      startMonth: inst.startMonth,
      endYear,
      endMonth,
      paid,
      remaining: inst.nbMonths - paid,
      isComplete,
      createdAt: inst.createdAt.toISOString(),
    };
  });

  return NextResponse.json(result);
}

// POST /api/installments — create an installment + generate expenses in existing months
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { label, totalAmount, nbMonths, monthId } = body;

  if (!label || !totalAmount || !nbMonths || !monthId) {
    return NextResponse.json(
      { error: "label, totalAmount, nbMonths, and monthId are required" },
      { status: 400 }
    );
  }

  // Get the source month to know start year/month
  const sourceMonth = await prisma.month.findUnique({ where: { id: monthId } });
  if (!sourceMonth) {
    return NextResponse.json({ error: "Month not found" }, { status: 404 });
  }

  const amountPerMonth = Math.round((totalAmount / nbMonths) * 100) / 100;

  // Create the installment
  const installment = await prisma.installment.create({
    data: {
      label,
      totalAmount,
      nbMonths,
      startYear: sourceMonth.year,
      startMonth: sourceMonth.month,
    },
  });

  // Generate expenses in all existing months that fall within the range
  const startIndex = sourceMonth.year * 12 + sourceMonth.month;

  for (let i = 0; i < nbMonths; i++) {
    const targetIndex = startIndex + i;
    const targetYear = Math.floor((targetIndex - 1) / 12);
    const targetMonth = ((targetIndex - 1) % 12) + 1;

    // Check if this month already exists
    const existingMonth = await prisma.month.findUnique({
      where: { year_month: { year: targetYear, month: targetMonth } },
    });

    if (existingMonth) {
      await prisma.expense.create({
        data: {
          monthId: existingMonth.id,
          type: "DIVERSE",
          label: `${label} ${i + 1}/${nbMonths}`,
          amount: amountPerMonth,
          frequency: "MONTHLY",
          isConfirmed: true,
          isRemainder: false,
          installmentId: installment.id,
        },
      });
    }
    // If month doesn't exist yet, the find-or-create API will handle it when navigating there
  }

  return NextResponse.json(
    {
      id: installment.id,
      label: installment.label,
      totalAmount: toNumber(installment.totalAmount),
      nbMonths: installment.nbMonths,
      amountPerMonth,
    },
    { status: 201 }
  );
}
