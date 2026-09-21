import "server-only";

const API_BASE = "https://api.anthropic.com";
const API_VERSION = "2023-06-01";

export type VerifyResult =
  | { ok: true; organizationName: string | null }
  | { ok: false; reason: string };

/**
 * Anthropic Admin API anahtarını doğrular.
 *
 * `GET /v1/organizations/me` en ucuz admin uçlarından biri: token harcamaz,
 * sadece anahtarın hangi organizasyona ait olduğunu döndürür. Anahtarı
 * kaydetmeden önce burada test ediyoruz ki panele çalışmayan bir anahtar
 * girmeyelim.
 */
export async function verifyAdminKey(key: string): Promise<VerifyResult> {
  let response: Response;

  try {
    response = await fetch(`${API_BASE}/v1/organizations/me`, {
      method: "GET",
      headers: {
        "x-api-key": key,
        "anthropic-version": API_VERSION,
      },
      cache: "no-store",
    });
  } catch {
    return {
      ok: false,
      reason:
        "Anthropic'e ulaşılamadı. İnternet bağlantınızı kontrol edip tekrar deneyin.",
    };
  }

  if (response.status === 401 || response.status === 403) {
    return {
      ok: false,
      reason:
        "Anahtar kabul edilmedi. Bunun bir Admin API anahtarı (sk-ant-admin...) olduğundan ve iptal edilmediğinden emin olun.",
    };
  }

  if (response.status === 429) {
    return {
      ok: false,
      reason: "Anthropic hız sınırına takıldı. Biraz bekleyip tekrar deneyin.",
    };
  }

  if (!response.ok) {
    return {
      ok: false,
      reason: `Anthropic doğrulama sırasında ${response.status} döndü. Daha sonra tekrar deneyin.`,
    };
  }

  const body: unknown = await response.json().catch(() => null);
  const name =
    body && typeof body === "object" && "name" in body
      ? String((body as { name: unknown }).name)
      : null;

  return { ok: true, organizationName: name };
}
