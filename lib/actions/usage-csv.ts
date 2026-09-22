"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  MAX_CSV_BYTES,
  aggregateRows,
  parseUsageCsv,
  type RowIssue,
} from "@/lib/usage/csv";

type ImportResult =
  | { error: string; imported?: undefined; skipped?: undefined; issues?: undefined }
  | { error: null; imported: number; skipped: number; issues: RowIssue[] };

/** Tek seferde veritabanına gönderilen satır sayısı. */
const CHUNK_SIZE = 500;

/**
 * CSV'den gelen kayıtların kaynak adı. Tablodaki CHECK kısıtı yalnızca
 * 'api' ve 'csv_upload' değerlerine izin veriyor.
 */
const SOURCE = "csv_upload";

/**
 * Admin'in yüklediği kullanım CSV'sini `usage_records` tablosuna yazar.
 *
 * Tarayıcıdaki önizleme aynı çözümleyiciyi kullansa da burada dosya sıfırdan
 * yeniden okunur: sunucu, istemciden gelen hiçbir çözümleme sonucuna güvenmez.
 */
export async function importUsageCsv(formData: FormData): Promise<ImportResult> {
  const orgId = String(formData.get("orgId") ?? "");
  const file = formData.get("file");

  if (!(file instanceof File) || file.size === 0) {
    return { error: "Dosya seçilmedi." };
  }

  if (file.size > MAX_CSV_BYTES) {
    return {
      error: `Dosya çok büyük. En fazla ${Math.round(MAX_CSV_BYTES / 1024 / 1024)} MB yükleyebilirsiniz.`,
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Oturum bulunamadı." };

  const { data: membership } = await supabase
    .from("organization_members")
    .select("role")
    .eq("org_id", orgId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!membership || membership.role !== "admin") {
    return { error: "Bu işlem için yetkiniz yok." };
  }

  const parsed = parseUsageCsv(await file.text());
  if (!parsed.ok) return { error: parsed.reason };

  const rows = aggregateRows(parsed.rows).map((row) => ({
    org_id: orgId,
    user_email: row.userEmail,
    model: row.model,
    input_tokens: row.inputTokens,
    output_tokens: row.outputTokens,
    cost_usd: row.costUsd,
    usage_date: row.usageDate,
    source: SOURCE,
  }));

  const admin = createAdminClient();

  // Aynı dosya iki kez yüklenirse satırlar çoğalmaz; benzersiz indeks
  // (org, e-posta, model, tarih, kaynak) üzerinden güncellenir.
  for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
    const { error } = await admin
      .from("usage_records")
      .upsert(rows.slice(i, i + CHUNK_SIZE), {
        onConflict: "org_id,user_email,model,usage_date,source",
      });
    if (error) {
      return {
        error:
          i === 0
            ? "Kayıtlar yazılamadı."
            : `Kayıtların bir kısmı yazıldıktan sonra hata oluştu (${i} satır kaydedildi). Dosyayı yeniden yükleyebilirsiniz.`,
      };
    }
  }

  revalidatePath("/dashboard");

  return {
    error: null,
    imported: rows.length,
    skipped: parsed.skipped,
    issues: parsed.issues,
  };
}
