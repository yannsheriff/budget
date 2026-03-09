import * as XLSX from "xlsx";

/**
 * Parsed data from an Excel budget file.
 */
export type ParsedMonth = {
  year: number;
  month: number; // 1-12
  salary: number;
  overdraft: number;
  incomes: { label: string; amount: number }[];
  recurring: { label: string; amount: number }[];
  everydayLifeTotal: number;
  diverse: { label: string; amount: number }[];
  installments: { label: string; amount: number; current: number; total: number }[];
  savingsTotal: number;
};

/**
 * French month name → month number mapping.
 */
const MONTH_MAP: Record<string, number> = {
  janvier: 1, février: 2, fevrier: 2, mars: 3, avril: 4,
  mai: 5, juin: 6, juillet: 7, août: 8, aout: 8,
  septembre: 9, octobre: 10, novembre: 11, décembre: 12, decembre: 12,
};

/**
 * Detect year and month from filename like "Mars 2026.xlsx" or "Aout 2025.xlsx".
 */
export function parseMonthFromFilename(filename: string): { year: number; month: number } | null {
  // Remove extension
  const name = filename.replace(/\.xlsx?$/i, "").trim();

  for (const [monthName, monthNum] of Object.entries(MONTH_MAP)) {
    const regex = new RegExp(`${monthName}\\s+(\\d{4})`, "i");
    const match = name.match(regex);
    if (match) {
      return { year: parseInt(match[1]), month: monthNum };
    }
  }

  return null;
}

/**
 * Parse the "tables" sheet from a budget Excel file.
 */
export function parseExcelBuffer(buffer: ArrayBuffer, filename: string): ParsedMonth {
  const wb = XLSX.read(buffer, { type: "array" });

  // Find the "tables" sheet
  const sheetName = wb.SheetNames.find((n) => n.toLowerCase() === "tables");
  if (!sheetName) {
    throw new Error("Feuille 'tables' introuvable dans le fichier Excel");
  }

  const sheet = wb.Sheets[sheetName];
  const data: (string | number | null)[][] = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: null,
    rawNumbers: true,
  });

  // Detect month from filename
  const monthInfo = parseMonthFromFilename(filename);
  if (!monthInfo) {
    throw new Error(
      "Impossible de détecter le mois depuis le nom du fichier. Format attendu: 'Mois Année.xlsx' (ex: 'Mars 2026.xlsx')"
    );
  }

  // --- Extract salary from "virement/paye" (columns L=11, M=12) ---
  let salary = 0;
  for (let r = 2; r < data.length; r++) {
    const label = cellStr(data[r]?.[11]);
    const amount = cellNum(data[r]?.[12]);
    if (label.toLowerCase() === "paye" && amount > 0) {
      salary = amount;
      break;
    }
  }

  // --- Extract incomes & detect overdraft from columns I=8, J=9 ---
  let overdraft = 0;
  const incomes: { label: string; amount: number }[] = [];

  for (let r = 2; r < data.length; r++) {
    const label = cellStr(data[r]?.[8]);
    const amount = cellNum(data[r]?.[9]);

    if (!label || label.toLowerCase() === "total" || label.toLowerCase().startsWith("revenu")
      || label.toLowerCase().startsWith("dépense") || label.toLowerCase().startsWith("reste")
      || label.toLowerCase() === "paye" || label.toLowerCase() === "virement"
      || label === "#NAME?" || label === "`") continue;

    if (amount <= 0) continue;

    // Check if this is "découvert" / "decouvert"
    if (label.toLowerCase().includes("découvert") || label.toLowerCase().includes("decouvert")) {
      overdraft = amount;
    } else {
      incomes.push({ label, amount });
    }
  }

  // --- Extract Monthly/Recurring expenses from columns A=0, B=1 ---
  const recurring: { label: string; amount: number }[] = [];

  for (let r = 2; r < data.length; r++) {
    const label = cellStr(data[r]?.[0]);
    const amount = cellNum(data[r]?.[1]);

    if (!label || label.startsWith("S-TOTAL")) continue;
    if (amount <= 0) continue;

    recurring.push({ label, amount });
  }

  // --- Extract Every day life total from column C=2 or D=3 ---
  let everydayLifeTotal = 0;

  // Check row 29 for S-TOTAL
  const stotalRow = data[29];
  if (stotalRow) {
    const stotalVal = cellNum(stotalRow[3]);
    if (stotalVal > 0) {
      everydayLifeTotal = stotalVal;
    }
  }

  // Also check column D for individual values (sometimes the amount is on row 2 col D)
  if (everydayLifeTotal === 0) {
    for (let r = 2; r < data.length; r++) {
      const val = cellNum(data[r]?.[3]);
      if (val > 0) {
        everydayLifeTotal = val;
        break;
      }
    }
  }

  // --- Extract Divers from columns E=4, F=5 ---
  const diverse: { label: string; amount: number }[] = [];
  const installments: { label: string; amount: number; current: number; total: number }[] = [];
  const installmentPattern = /^(.+?)\s+(\d+)\/(\d+)$/;

  for (let r = 2; r < data.length; r++) {
    const label = cellStr(data[r]?.[4]);
    const amount = cellNum(data[r]?.[5]);

    if (!label || label.startsWith("S-TOTAL")) continue;
    if (amount <= 0) continue;

    // Check for installment pattern "label X/Y"
    const match = label.match(installmentPattern);
    if (match) {
      installments.push({
        label: match[1].trim(),
        amount,
        current: parseInt(match[2]),
        total: parseInt(match[3]),
      });
    } else {
      diverse.push({ label, amount });
    }
  }

  // --- Extract Savings total from S-TOTAL row col 7, fallback to individual rows ---
  let savingsTotal = 0;

  if (stotalRow) {
    savingsTotal = cellNum(stotalRow[7]);
  }

  // Fallback: sum individual rows in column G/H (skip S-TOTAL row)
  if (savingsTotal === 0) {
    for (let r = 2; r < Math.min(data.length, 29); r++) {
      const val = cellNum(data[r]?.[7]);
      if (val > 0) savingsTotal += val;
    }
  }

  return {
    ...monthInfo,
    salary,
    overdraft,
    incomes,
    recurring,
    everydayLifeTotal,
    diverse,
    installments,
    savingsTotal,
  };
}

// --- Helpers ---

function cellStr(val: unknown): string {
  if (val === null || val === undefined) return "";
  return String(val).trim();
}

function cellNum(val: unknown): number {
  if (val === null || val === undefined) return 0;
  const n = typeof val === "number" ? val : parseFloat(String(val));
  return isNaN(n) ? 0 : n;
}
