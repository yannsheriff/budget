import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// GET /api/categories — list all unique categories used
export async function GET() {
  const results = await prisma.expense.findMany({
    where: {
      category: { not: null },
    },
    select: { category: true },
    distinct: ["category"],
    orderBy: { category: "asc" },
  });

  const categories = results
    .map((r) => r.category)
    .filter((c): c is string => c !== null);

  return NextResponse.json(categories);
}
