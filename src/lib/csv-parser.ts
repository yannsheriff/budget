/**
 * Parse bank statement CSV files into structured data.
 */

export type BankLine = {
  date: string;       // ISO date string "2026-03-01"
  label: string;      // raw label from CSV "CARJUDGE.COM"
  amount: number;     // negative = debit, positive = credit
  category: string;   // bank category "Abonnement/Streaming"
};

export type ParsedStatement = {
  lines: BankLine[];
  debits: BankLine[];    // amount < 0
  credits: BankLine[];   // amount > 0
  totalDebits: number;   // sum of debits (negative number)
  totalCredits: number;  // sum of credits (positive number)
  dateRange: { from: string; to: string };
};

/**
 * Parse a bank statement CSV buffer into a ParsedStatement.
 *
 * Expected CSV format:
 *   Date,Libellé,Montant (€),Catégorie
 *   2026-02-28,CARJUDGE.COM,-5.99,Abonnement/Streaming
 */
export function parseCsvBuffer(buffer: Buffer): ParsedStatement {
  const text = buffer.toString("utf-8");
  const rawLines = text.split(/\r?\n/);

  // Skip header row, filter empty lines
  const lines: BankLine[] = [];

  for (let i = 1; i < rawLines.length; i++) {
    const line = rawLines[i].trim();
    if (!line) continue;

    const fields = parseCsvLine(line);
    if (fields.length < 4) continue;

    const [date, label, rawAmount, category] = fields;

    const amount = parseAmount(rawAmount);
    if (isNaN(amount)) continue;

    lines.push({
      date: date.trim(),
      label: label.trim(),
      amount,
      category: category.trim(),
    });
  }

  // Sort by date ascending
  lines.sort((a, b) => a.date.localeCompare(b.date));

  const debits = lines.filter((l) => l.amount < 0);
  const credits = lines.filter((l) => l.amount > 0);

  const totalDebits = debits.reduce((sum, l) => sum + l.amount, 0);
  const totalCredits = credits.reduce((sum, l) => sum + l.amount, 0);

  const dateRange = {
    from: lines.length > 0 ? lines[0].date : "",
    to: lines.length > 0 ? lines[lines.length - 1].date : "",
  };

  return { lines, debits, credits, totalDebits, totalCredits, dateRange };
}

// --- Helpers ---

/**
 * Parse a single CSV line, handling quoted fields that may contain commas.
 */
function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];

    if (inQuotes) {
      if (ch === '"') {
        // Check for escaped quote ""
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        fields.push(current);
        current = "";
      } else {
        current += ch;
      }
    }
  }

  fields.push(current);
  return fields;
}

/**
 * Parse an amount string: remove + prefix, handle comma as decimal separator.
 * Examples: "-5.99" → -5.99, "+300,00" → 300, "-1 234,56" → -1234.56
 */
function parseAmount(raw: string): number {
  let s = raw.trim();

  // Remove leading +
  if (s.startsWith("+")) {
    s = s.substring(1);
  }

  // Remove spaces (thousand separators)
  s = s.replace(/\s/g, "");

  // If the string uses comma as decimal separator (and no dot), convert it
  if (s.includes(",") && !s.includes(".")) {
    s = s.replace(",", ".");
  }

  return parseFloat(s);
}
