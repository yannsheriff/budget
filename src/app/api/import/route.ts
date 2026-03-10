import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { parseExcelBuffer } from "@/lib/excel-parser";
import { getWeeksInMonth } from "@/lib/weeks";
import { serializeMonth } from "@/lib/formatters";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "Aucun fichier fourni" }, { status: 400 });
    }

    // Parse the Excel file
    const buffer = await file.arrayBuffer();
    const parsed = parseExcelBuffer(buffer, file.name);

    // Calculate weekly budget from monthly total
    const weeks = getWeeksInMonth(parsed.year, parsed.month);
    const weeklyBudget = weeks > 0 ? Math.round((parsed.everydayLifeTotal / weeks) * 100) / 100 : 0;

    // Delete existing month if it exists (user chose "écraser tout")
    const existing = await prisma.month.findUnique({
      where: { year_month: { year: parsed.year, month: parsed.month } },
    });

    if (existing) {
      // Cascade delete removes expenses and incomes
      await prisma.month.delete({ where: { id: existing.id } });
    }

    // Create the month with all data in a transaction
    const month = await prisma.$transaction(async (tx) => {
      // 1. Create the month
      const m = await tx.month.create({
        data: {
          year: parsed.year,
          month: parsed.month,
          salary: parsed.salary,
          overdraft: parsed.overdraft,
          weeklyEverydayBudget: weeklyBudget,
          isConfirmed: true, // Historical data = confirmed
        },
      });

      // 2. Create incomes
      if (parsed.incomes.length > 0) {
        await tx.income.createMany({
          data: parsed.incomes.map((inc) => ({
            monthId: m.id,
            label: inc.label,
            amount: inc.amount,
          })),
        });
      }

      // 3. Create recurring expenses (auto-confirmed)
      if (parsed.recurring.length > 0) {
        await tx.expense.createMany({
          data: parsed.recurring.map((exp) => ({
            monthId: m.id,
            type: "RECURRING" as const,
            label: exp.label,
            amount: exp.amount,
            frequency: "MONTHLY" as const,
            isConfirmed: true,
          })),
        });
      }

      // 4. Create diverse expenses (non-installment)
      if (parsed.diverse.length > 0) {
        await tx.expense.createMany({
          data: parsed.diverse.map((exp) => ({
            monthId: m.id,
            type: "DIVERSE" as const,
            label: exp.label,
            amount: exp.amount,
            frequency: "MONTHLY" as const,
            isConfirmed: true,
          })),
        });
      }

      // 5. Create installments + their expenses
      for (const inst of parsed.installments) {
        // Calculate start month from current position
        // If current is 2/3 and we're in March 2026, start was February 2026
        let startMonth = parsed.month - (inst.current - 1);
        let startYear = parsed.year;
        while (startMonth < 1) {
          startMonth += 12;
          startYear--;
        }

        const totalAmount = inst.amount * inst.total;

        // Check if installment already exists (same label + total)
        const existingInst = await tx.installment.findFirst({
          where: {
            label: inst.label,
            totalAmount: totalAmount,
          },
        });

        let installmentId: string;

        if (existingInst) {
          installmentId = existingInst.id;
        } else {
          const newInst = await tx.installment.create({
            data: {
              label: inst.label,
              totalAmount: totalAmount,
              nbMonths: inst.total,
              startYear: startYear,
              startMonth: startMonth,
            },
          });
          installmentId = newInst.id;
        }

        // Create the expense linked to the installment
        await tx.expense.create({
          data: {
            monthId: m.id,
            type: "DIVERSE",
            label: `${inst.label} ${inst.current}/${inst.total}`,
            amount: inst.amount,
            frequency: "MONTHLY",
            isConfirmed: true,
            installmentId: installmentId,
          },
        });
      }

      // 6. Create savings expense if > 0
      if (parsed.savingsTotal > 0) {
        await tx.expense.create({
          data: {
            monthId: m.id,
            type: "SAVINGS",
            label: "Épargne",
            amount: parsed.savingsTotal,
            frequency: "MONTHLY",
            isConfirmed: true,
          },
        });
      }

      // Return full month with relations
      return tx.month.findUnique({
        where: { id: m.id },
        include: { expenses: true, incomes: true },
      });
    });

    if (!month) {
      return NextResponse.json({ error: "Erreur lors de la création" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      month: serializeMonth(month),
      summary: {
        monthId: month.id,
        year: parsed.year,
        month: parsed.month,
        salary: parsed.salary,
        overdraft: parsed.overdraft,
        recurringCount: parsed.recurring.length,
        diverseCount: parsed.diverse.length + parsed.installments.length,
        installmentCount: parsed.installments.length,
        savingsTotal: parsed.savingsTotal,
        everydayLifeTotal: parsed.everydayLifeTotal,
        incomesCount: parsed.incomes.length,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur inconnue";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
