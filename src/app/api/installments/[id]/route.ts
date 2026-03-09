import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// DELETE /api/installments/[id] — delete installment + future linked expenses
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const now = new Date();
  const currentIndex = now.getFullYear() * 12 + (now.getMonth() + 1);

  // Find all expenses linked to this installment
  const linkedExpenses = await prisma.expense.findMany({
    where: { installmentId: id },
    include: { month: { select: { year: true, month: true } } },
  });

  // Delete only future expenses (current month + future)
  const futureExpenseIds = linkedExpenses
    .filter((e) => {
      const idx = e.month.year * 12 + e.month.month;
      return idx >= currentIndex;
    })
    .map((e) => e.id);

  if (futureExpenseIds.length > 0) {
    await prisma.expense.deleteMany({
      where: { id: { in: futureExpenseIds } },
    });
  }

  // Unlink past expenses (keep them but remove installmentId)
  await prisma.expense.updateMany({
    where: { installmentId: id },
    data: { installmentId: null },
  });

  // Delete the installment itself
  await prisma.installment.delete({ where: { id } });

  return NextResponse.json({ success: true, deletedExpenses: futureExpenseIds.length });
}
