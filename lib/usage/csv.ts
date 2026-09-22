/**
 * Kullanım CSV'lerini okuyan çözümleyici. Hem tarayıcıdaki önizleme hem de
 * sunucudaki kayıt adımı bu dosyayı kullanır; sunucu tarafı her zaman dosyayı
 * yeniden okuyup doğrular, tarayıcıdan gelen sonuca güvenmez.
 */

export type ParsedUsageRow = {
  userEmail: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  usageDate: string; // YYYY-MM-DD
};

export type RowIssue = { line: number; reason: string };

export type ParseResult =
  | { ok: false; reason: string }
  | { ok: true; rows: ParsedUsageRow[]; issues: RowIssue[]; skipped: number };

/** Tek seferde kabul edilen en büyük dosya ve satır sayısı. */
export const MAX_CSV_BYTES = 5 * 1024 * 1024;
export const MAX_CSV_ROWS = 50_000;
/** Kullanıcıya gösterilecek en fazla satır hatası. */
export const MAX_REPORTED_ISSUES = 20;

/**
 * Başlık eşleştirme sözlüğü. Anthropic Console dışa aktarımları, Excel'de
 * Türkçeleştirilmiş dosyalar ve elle hazırlanmış tablolar aynı veriyi farklı
 * adlarla taşıyor; hepsini tek biçime indiriyoruz.
 */
const HEADER_ALIASES: Record<keyof ParsedUsageRow, string[]> = {
  userEmail: [
    "email",
    "e-mail",
    "user email",
    "user_email",
    "member email",
    "user",
    "member",
    "eposta",
    "e-posta",
    "kullanici",
    "kullanici e-postasi",
    "kullanici eposta",
  ],
  usageDate: [
    "date",
    "usage date",
    "usage_date",
    "day",
    "tarih",
    "kullanim tarihi",
    "gun",
  ],
  model: ["model", "model name", "model_name", "modeli"],
  inputTokens: [
    "input tokens",
    "input_tokens",
    "input",
    "prompt tokens",
    "prompt_tokens",
    "girdi",
    "girdi token",
    "girdi tokenlari",
  ],
  outputTokens: [
    "output tokens",
    "output_tokens",
    "output",
    "completion tokens",
    "completion_tokens",
    "cikti",
    "cikti token",
    "cikti tokenlari",
  ],
  costUsd: [
    "cost",
    "cost usd",
    "cost_usd",
    "cost (usd)",
    "amount",
    "spend",
    "total cost",
    "maliyet",
    "tutar",
    "ucret",
  ],
};

/** Başlıkları karşılaştırmak için sadeleştirir: küçük harf, Türkçe harfler sadeleşir. */
function normalizeHeader(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[ıİ]/g, "i")
    .replace(/[şŞ]/g, "s")
    .replace(/[ğĞ]/g, "g")
    .replace(/[üÜ]/g, "u")
    .replace(/[öÖ]/g, "o")
    .replace(/[çÇ]/g, "c")
    .replace(/[_\-.]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Satırları ayıran karakteri başlık satırındaki sayıya bakarak seçer. */
function detectDelimiter(firstLine: string) {
  const candidates = [",", ";", "\t"];
  let best = ",";
  let bestCount = 0;
  for (const candidate of candidates) {
    // Tırnak içindekileri saymamak için kaba bir ayıklama yeterli.
    const count = firstLine.split(candidate).length - 1;
    if (count > bestCount) {
      best = candidate;
      bestCount = count;
    }
  }
  return best;
}

/**
 * RFC 4180 biçimini okur: tırnaklı alanlar, alan içinde satır sonu ve
 * ikilenmiş tırnak ("") desteklenir.
 */
function splitRecords(text: string, delimiter: string): string[][] {
  const records: string[][] = [];
  let field = "";
  let record: string[] = [];
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];

    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === delimiter) {
      record.push(field);
      field = "";
    } else if (char === "\n") {
      record.push(field);
      records.push(record);
      record = [];
      field = "";
    } else if (char !== "\r") {
      field += char;
    }
  }

  if (field.length > 0 || record.length > 0) {
    record.push(field);
    records.push(record);
  }

  return records;
}

/**
 * Token sayıları için tam sayı okur. Son ayracı tam üç basamak izliyorsa bu
 * bir binlik ayracıdır (1.234 -> 1234); değilse ondalık sayılır ve yuvarlanır
 * (1234.0 -> 1234). Token sayısı doğası gereği tam sayıdır.
 */
function parseInteger(raw: string): number | null {
  const cleaned = raw.replace(/[^0-9.,-]/g, "").trim();
  if (cleaned === "" || cleaned === "-") return null;

  const negative = cleaned.startsWith("-");
  const digits = cleaned.replace(/-/g, "");
  const lastSep = Math.max(digits.lastIndexOf(","), digits.lastIndexOf("."));

  let value: number;
  if (lastSep === -1) {
    value = Number(digits);
  } else if (digits.length - lastSep - 1 === 3) {
    value = Number(digits.replace(/[.,]/g, ""));
  } else {
    const whole = digits.slice(0, lastSep).replace(/[.,]/g, "");
    value = Number(`${whole}.${digits.slice(lastSep + 1)}`);
  }

  if (!Number.isFinite(value)) return null;
  return Math.round(negative ? -value : value);
}

/**
 * Para tutarı okur; hem 1.234,56 hem 1,234.56 biçimini ve $ gibi imleri kabul
 * eder. Virgülsüz "1.500" gibi bir değer ondalık sayılır — para alanlarında
 * yaygın okuma budur.
 */
function parseDecimal(raw: string): number | null {
  const cleaned = raw.replace(/[^0-9.,-]/g, "").trim();
  if (cleaned === "" || cleaned === "-") return null;

  const lastComma = cleaned.lastIndexOf(",");
  const lastDot = cleaned.lastIndexOf(".");

  let normalized: string;
  if (lastComma > lastDot) {
    // Virgül ondalık ayracı: binlik noktaları atılır.
    normalized = cleaned.replace(/\./g, "").replace(",", ".");
  } else {
    // Nokta ondalık ayracı (ya da hiç ondalık yok): binlik virgülleri atılır.
    normalized = cleaned.replace(/,/g, "");
  }

  const value = Number(normalized);
  return Number.isFinite(value) ? value : null;
}

/**
 * Tarihi YYYY-MM-DD'ye çevirir. ISO, GG.AA.YYYY ve GG/AA/YYYY kabul edilir.
 * Ay/gün sırası belirsiz olan 01/02/2026 gibi değerlerde gün-ay sırası
 * varsayılır; Türkçe kullanım için doğrusu budur.
 */
function parseDate(raw: string): string | null {
  const value = raw.trim();
  if (value === "") return null;

  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;

  const dmy = /^(\d{1,2})[./](\d{1,2})[./](\d{4})$/.exec(value);
  if (dmy) {
    const day = dmy[1].padStart(2, "0");
    const month = dmy[2].padStart(2, "0");
    return `${dmy[3]}-${month}-${day}`;
  }

  return null;
}

/** Tarihin gerçekten takvimde olduğunu doğrular (31.02 gibi değerleri eler). */
function isRealDate(value: string) {
  const [y, m, d] = value.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return (
    date.getUTCFullYear() === y &&
    date.getUTCMonth() === m - 1 &&
    date.getUTCDate() === d
  );
}

function looksLikeEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function parseUsageCsv(text: string): ParseResult {
  // Excel'in eklediği BOM başlık eşleşmesini bozar.
  const content = text.replace(/^﻿/, "");
  if (content.trim() === "") {
    return { ok: false, reason: "Dosya boş." };
  }

  const firstLine = content.slice(0, content.indexOf("\n") + 1 || undefined);
  const delimiter = detectDelimiter(firstLine);
  const records = splitRecords(content, delimiter).filter(
    (record) => record.some((cell) => cell.trim() !== "")
  );

  if (records.length < 2) {
    return {
      ok: false,
      reason: "Dosyada başlık satırından sonra veri bulunamadı.",
    };
  }

  const headers = records[0].map(normalizeHeader);

  // Her alan için başlıklarda geçen ilk eşleşmeyi buluruz.
  const columnOf = (field: keyof ParsedUsageRow) => {
    // Takma adları da başlıklarla aynı kurallardan geçiririz; aksi hâlde
    // "e-posta" gibi tireli bir takma ad hiçbir zaman eşleşmez.
    const aliases = HEADER_ALIASES[field].map(normalizeHeader);
    for (let i = 0; i < headers.length; i += 1) {
      if (aliases.includes(headers[i])) return i;
    }
    return -1;
  };

  const emailCol = columnOf("userEmail");
  const dateCol = columnOf("usageDate");
  const modelCol = columnOf("model");
  const inputCol = columnOf("inputTokens");
  const outputCol = columnOf("outputTokens");
  const costCol = columnOf("costUsd");

  const missing: string[] = [];
  if (emailCol === -1) missing.push("e-posta");
  if (dateCol === -1) missing.push("tarih");
  if (missing.length > 0) {
    return {
      ok: false,
      reason: `Zorunlu sütun bulunamadı: ${missing.join(", ")}. Başlık satırında bu sütunların olduğundan emin olun.`,
    };
  }

  if (inputCol === -1 && outputCol === -1 && costCol === -1) {
    return {
      ok: false,
      reason:
        "Dosyada girdi token, çıktı token veya maliyet sütunlarından en az biri olmalı.",
    };
  }

  const dataRows = records.slice(1);
  if (dataRows.length > MAX_CSV_ROWS) {
    return {
      ok: false,
      reason: `Dosyada ${dataRows.length.toLocaleString("tr-TR")} satır var; en fazla ${MAX_CSV_ROWS.toLocaleString("tr-TR")} satır yükleyebilirsiniz.`,
    };
  }

  const cell = (record: string[], index: number) =>
    index === -1 ? "" : (record[index] ?? "").trim();

  const rows: ParsedUsageRow[] = [];
  const issues: RowIssue[] = [];
  let skipped = 0;

  const addIssue = (line: number, reason: string) => {
    skipped += 1;
    if (issues.length < MAX_REPORTED_ISSUES) issues.push({ line, reason });
  };

  for (let i = 0; i < dataRows.length; i += 1) {
    const record = dataRows[i];
    const line = i + 2; // başlık satırı 1

    const email = cell(record, emailCol).toLowerCase();
    if (!looksLikeEmail(email)) {
      addIssue(line, `Geçersiz e-posta: "${cell(record, emailCol)}"`);
      continue;
    }

    const rawDate = cell(record, dateCol);
    const date = parseDate(rawDate);
    if (!date || !isRealDate(date)) {
      addIssue(line, `Tarih okunamadı: "${rawDate}"`);
      continue;
    }

    const inputTokens =
      inputCol === -1 ? 0 : parseInteger(cell(record, inputCol));
    const outputTokens =
      outputCol === -1 ? 0 : parseInteger(cell(record, outputCol));
    const costUsd = costCol === -1 ? 0 : parseDecimal(cell(record, costCol));

    if (inputTokens === null || outputTokens === null || costUsd === null) {
      addIssue(line, "Sayısal sütunlardan biri okunamadı.");
      continue;
    }

    if (inputTokens < 0 || outputTokens < 0 || costUsd < 0) {
      addIssue(line, "Negatif değer kabul edilmiyor.");
      continue;
    }

    rows.push({
      userEmail: email,
      model: cell(record, modelCol),
      inputTokens,
      outputTokens,
      costUsd,
      usageDate: date,
    });
  }

  if (rows.length === 0) {
    return {
      ok: false,
      reason: "Hiçbir satır okunamadı. Sütun başlıklarını ve biçimi kontrol edin.",
    };
  }

  return { ok: true, rows, issues, skipped };
}

/**
 * Aynı kişi + gün + model için birden fazla satır varsa tek satıra toplar.
 * Veritabanındaki benzersiz indeks bunu zaten gerektiriyor.
 */
export function aggregateRows(rows: ParsedUsageRow[]): ParsedUsageRow[] {
  const byKey = new Map<string, ParsedUsageRow>();
  for (const row of rows) {
    const key = `${row.usageDate}|${row.userEmail}|${row.model}`;
    const existing = byKey.get(key);
    if (existing) {
      existing.inputTokens += row.inputTokens;
      existing.outputTokens += row.outputTokens;
      existing.costUsd += row.costUsd;
      continue;
    }
    byKey.set(key, { ...row });
  }
  return [...byKey.values()];
}
