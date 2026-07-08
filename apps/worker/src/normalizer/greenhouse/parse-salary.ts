import type { GreenhouseMetadataField } from "./types";

export interface ParsedSalary {
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string | null;
}

const SALARY_METADATA_NAMES = [
  "salary range",
  "compensation",
  "pay range",
  "base salary",
];

const CURRENCY_SYMBOLS: Record<string, string> = {
  $: "USD",
  "£": "GBP",
  "€": "EUR",
};

const SALARY_KEYWORD_PATTERN =
  /\b(?:salary|compensation|pay(?:\s+range)?|base\s+salary|package|remuneration|earning)\b/i;

const CURRENCY_CODE_PATTERN = /\b(USD|EUR|GBP|CAD|AUD|INR|CHF|SGD)\b/i;

const SALARY_CONTEXT_WINDOW = 40;

export function parseGreenhouseSalary(
  metadata: GreenhouseMetadataField[],
  description: string | null,
): ParsedSalary {
  for (const field of metadata) {
    const fieldName = normalizeText(field.name)?.toLowerCase() ?? "";
    if (!SALARY_METADATA_NAMES.some((name) => fieldName.includes(name))) {
      continue;
    }

    const parsed = parseSalaryText(normalizeText(field.value));
    if (parsed) {
      return parsed;
    }
  }

  const fromDescription = parseSalaryText(description);
  return (
    fromDescription ?? {
      salaryMin: null,
      salaryMax: null,
      salaryCurrency: null,
    }
  );
}

function parseSalaryText(value: string | null): ParsedSalary | null {
  if (!value) {
    return null;
  }

  const numbers = extractSalaryNumbers(value);
  if (numbers.length === 0) {
    return null;
  }

  const currency = detectCurrency(value, numbers);
  const sorted = [...numbers].sort((left, right) => left - right);

  return {
    salaryMin: sorted[0] ?? null,
    salaryMax: sorted.length > 1 ? (sorted.at(-1) ?? null) : null,
    salaryCurrency: currency,
  };
}

function detectCurrency(value: string, numbers: number[]): string | null {
  for (const [symbol, currency] of Object.entries(CURRENCY_SYMBOLS)) {
    if (value.includes(symbol)) {
      return currency;
    }
  }

  const codeMatch = value.match(CURRENCY_CODE_PATTERN);
  if (codeMatch?.[1]) {
    return codeMatch[1].toUpperCase();
  }

  for (const match of value.matchAll(/\d[\d,]*(?:\.\d+)?/g)) {
    const start = match.index ?? 0;
    const end = start + match[0].length;
    const localContext = sliceLocalContext(value, start, end);
    const localCode = localContext.match(CURRENCY_CODE_PATTERN);
    if (localCode?.[1]) {
      return localCode[1].toUpperCase();
    }
  }

  return null;
}

function extractSalaryNumbers(value: string): number[] {
  const numbers: number[] = [];

  for (const match of value.matchAll(/\d[\d,]*(?:\.\d+)?/g)) {
    const start = match.index ?? 0;
    const end = start + match[0].length;
    const localContext = sliceLocalContext(value, start, end);

    if (!isSalaryContext(localContext)) {
      continue;
    }

    const parsed = Number.parseFloat(match[0].replace(/,/g, ""));
    if (!Number.isFinite(parsed)) {
      continue;
    }

    const normalized = normalizeSalaryAmount(parsed, localContext);
    if (normalized !== null) {
      numbers.push(normalized);
    }
  }

  return numbers;
}

function sliceLocalContext(value: string, start: number, end: number): string {
  const windowStart = Math.max(0, start - SALARY_CONTEXT_WINDOW);
  const windowEnd = Math.min(value.length, end + SALARY_CONTEXT_WINDOW);
  return value.slice(windowStart, windowEnd);
}

function isSalaryContext(context: string): boolean {
  return (
    SALARY_KEYWORD_PATTERN.test(context) ||
    /[\$£€]/.test(context) ||
    CURRENCY_CODE_PATTERN.test(context)
  );
}

function normalizeSalaryAmount(amount: number, localContext: string): number | null {
  if (amount <= 0) {
    return null;
  }

  const lowerContext = localContext.toLowerCase();
  const looksHourly =
    /\b(?:per\s+)?hour\b/.test(lowerContext) ||
    /\bhr\b/.test(lowerContext) ||
    /\/\s*hr\b/.test(lowerContext);

  if (looksHourly && amount < 1000) {
    return null;
  }

  if (/\b(?:k|000)\b/.test(lowerContext) && amount < 1000) {
    return Math.round(amount * 1000);
  }

  if (amount >= 1000) {
    return Math.round(amount);
  }

  return null;
}

function normalizeText(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}
