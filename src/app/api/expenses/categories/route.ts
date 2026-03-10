import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// PATCH /api/expenses/categories — batch update categories
export async function PATCH(request: NextRequest) {
  const body = await request.json();
  const { updates } = body as {
    updates: { id: string; category: string }[];
  };

  if (!Array.isArray(updates) || updates.length === 0) {
    return NextResponse.json(
      { error: "updates est requis et doit être un tableau non vide" },
      { status: 400 }
    );
  }

  // Run all updates in a transaction
  await prisma.$transaction(
    updates.map((u) =>
      prisma.expense.update({
        where: { id: u.id },
        data: { category: u.category || null },
      })
    )
  );

  return NextResponse.json({ success: true, count: updates.length });
}
