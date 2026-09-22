import { timingSafeEqual } from "node:crypto";
import { revalidatePath } from "next/cache";
import type { NextRequest } from "next/server";
import { orgIdsWithActiveKey, syncOrg } from "@/lib/anthropic/sync";

// Her istekte gerçekten çalışmalı; hiçbir yanıt önbelleğe alınmamalı.
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Uzunluk sızdırmadan sabit zamanda karşılaştırır. */
function secretMatches(given: string, expected: string) {
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/**
 * Zamanlanmış senkron. Vercel Cron, `CRON_SECRET` tanımlıyken isteğe
 * `Authorization: Bearer <CRON_SECRET>` başlığını kendisi ekler; başka
 * kimsenin bu ucu tetiklemesine izin vermeyiz.
 *
 * Sır tanımlı değilse uç tamamen kapalıdır — yanlış yapılandırmada açıkta
 * kalmaktansa çalışmaması yeğdir.
 */
export async function GET(request: NextRequest) {
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    return Response.json(
      { error: "Zamanlanmış görev yapılandırılmamış." },
      { status: 503 }
    );
  }

  const header = request.headers.get("authorization") ?? "";
  const given = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!given || !secretMatches(given, expected)) {
    return Response.json({ error: "Yetkisiz." }, { status: 401 });
  }

  const orgIds = await orgIdsWithActiveKey();

  let succeeded = 0;
  const failures: { orgId: string; reason: string }[] = [];

  // Anthropic'in hız sınırlarına takılmamak için sırayla ilerleriz.
  for (const orgId of orgIds) {
    try {
      const result = await syncOrg(orgId);
      if (result.error) failures.push({ orgId, reason: result.error });
      else succeeded += 1;
    } catch {
      failures.push({ orgId, reason: "Beklenmeyen hata." });
    }
  }

  if (succeeded > 0) revalidatePath("/dashboard");

  return Response.json({
    organizations: orgIds.length,
    succeeded,
    failed: failures.length,
    failures,
  });
}
