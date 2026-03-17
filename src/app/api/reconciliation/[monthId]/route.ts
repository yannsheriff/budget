import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ monthId: string }> }
) {
  const { monthId } = await params;

  try {
    const reconciliation = await prisma.reconciliation.findUnique({
      where: { monthId },
      include: {
        items: {
          include: { matchedExpense: true },
        },
      },
    });

    if (!reconciliation) {
      return NextResponse.json(
        { error: "Aucune réconciliation trouvée" },
        { status: 404 }
      );
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
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
