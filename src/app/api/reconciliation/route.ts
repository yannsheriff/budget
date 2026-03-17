import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

interface ReconciliationItem {
  bankLabel: string;
  bankAmount: number;
  bankDate?: string;
  bankCategory?: string;
  status: "MATCHED" | "IGNORED" | "ADDED_PUNCTUAL" | "ADDED_RECURRING" | "LINKED";
  matchedExpenseId?: string;
  bankLabelToSave?: string;
  newExpense?: {
    label: string;
    amount: number;
    category?: string;
    type: "RECURRING" | "DIVERSE";
  };
}

interface ReconciliationBody {
  monthId: string;
  bankBalance: number;
  predictedBalance: number;
  items: ReconciliationItem[];
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as ReconciliationBody;
    const { monthId, bankBalance, predictedBalance, items } = body;

    if (!monthId) {
      return NextResponse.json({ error: "monthId est requis" }, { status: 400 });
    }

    // Verify the month exists and get its year/month
    const month = await prisma.month.findUnique({
      where: { id: monthId },
    });

    if (!month) {
      return NextResponse.json({ error: "Mois introuvable" }, { status: 404 });
    }

    const gap = bankBalance - predictedBalance;

    const reconciliation = await prisma.$transaction(async (tx) => {
      // 1. Delete existing reconciliation for this month (allow re-doing)
      const existing = await tx.reconciliation.findUnique({
        where: { monthId },
      });
      if (existing) {
        // Cascade delete removes reconciliation items
        await tx.reconciliation.delete({ where: { id: existing.id } });
      }

      // 2. Create the Reconciliation record
      const recon = await tx.reconciliation.create({
        data: {
          monthId,
          bankBalance,
          predictedBalance,
          gap,
        },
      });

      // 3. Process each item
      for (const item of items) {
        // Create the ReconciliationItem
        await tx.reconciliationItem.create({
          data: {
            reconciliationId: recon.id,
            bankLabel: item.bankLabel,
            bankAmount: item.bankAmount,
            bankDate: item.bankDate ? new Date(item.bankDate) : null,
            bankCategory: item.bankCategory ?? null,
            status: item.status,
            matchedExpenseId: item.matchedExpenseId ?? null,
          },
        });

        // If bankLabelToSave is set, update the matched expense's bankLabel
        if (item.bankLabelToSave && item.matchedExpenseId) {
          await tx.expense.update({
            where: { id: item.matchedExpenseId },
            data: { bankLabel: item.bankLabelToSave },
          });
        }

        // If ADDED_PUNCTUAL: create a new DIVERSE expense in the current month
        if (item.status === "ADDED_PUNCTUAL" && item.newExpense) {
          await tx.expense.create({
            data: {
              monthId,
              type: "DIVERSE",
              label: item.newExpense.label,
              amount: item.newExpense.amount,
              frequency: "MONTHLY",
              category: item.newExpense.category ?? null,
              isConfirmed: true,
            },
          });
        }

        // If ADDED_RECURRING: create a new RECURRING expense in the NEXT month
        if (item.status === "ADDED_RECURRING" && item.newExpense) {
          // Calculate next month
          let nextMonth = month.month + 1;
          let nextYear = month.year;
          if (nextMonth > 12) {
            nextMonth = 1;
            nextYear++;
          }

          // Find or create the next month
          const nextMonthRecord = await tx.month.upsert({
            where: { year_month: { year: nextYear, month: nextMonth } },
            update: {},
            create: {
              year: nextYear,
              month: nextMonth,
              salary: 0,
              overdraft: 0,
              weeklyEverydayBudget: 0,
              isConfirmed: false,
            },
          });

          await tx.expense.create({
            data: {
              monthId: nextMonthRecord.id,
              type: "RECURRING",
              label: item.newExpense.label,
              amount: item.newExpense.amount,
              frequency: "MONTHLY",
              category: item.newExpense.category ?? null,
              isConfirmed: false,
            },
          });
        }
      }

      // Return the full reconciliation with items
      return tx.reconciliation.findUnique({
        where: { id: recon.id },
        include: {
          items: {
            include: { matchedExpense: true },
          },
        },
      });
    });

    if (!reconciliation) {
      return NextResponse.json({ error: "Erreur lors de la création" }, { status: 500 });
    }

    // Serialize Decimal fields
    return NextResponse.json({
      ...reconciliation,
      bankBalance: Number(reconciliation.bankBalance),
      predictedBalance: Number(reconciliation.predictedBalance),
      gap: Number(reconciliation.gap),
      importedAt: reconciliation.importedAt.toISOString(),
      items: reconciliation.items.map((item) => ({
        ...item,
        bankAmount: Number(item.bankAmount),
        bankDate: item.bankDate?.toISOString() ?? null,
        matchedExpense: item.matchedExpense
          ? {
              ...item.matchedExpense,
              amount: Number(item.matchedExpense.amount),
              createdAt: item.matchedExpense.createdAt.toISOString(),
            }
          : null,
      })),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur inconnue";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
