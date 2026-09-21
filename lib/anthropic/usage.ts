import "server-only";

const API_BASE = "https://api.anthropic.com";
const API_VERSION = "2023-06-01";
const USER_AGENT = "claude-usage-dashboard/0.1";

/** Bir günlük kullanım satırı — model kırılımıyla. */
export type UsageRow = {
  usageDate: string; // YYYY-MM-DD
  model: string;
  uncachedInputTokens: number;
  cacheReadInputTokens: number;
  cacheCreationInputTokens: number;
  outputTokens: number;
  webSearchRequests: number;
};

/** Bir günlük maliyet satırı — açıklama kırılımıyla. */
export type CostRow = {
  usageDate: string;
  description: string;
  /** Anthropic'in döndüğü haliyle: en küçük para birimi (cent). */
  amountCents: number;
  currency: string;
};

export type FetchResult<T> =
  | { ok: true; rows: T[] }
  | { ok: false; reason: string };

/** RFC 3339'un Anthropic'in beklediği biçimi: 2026-09-01T00:00:00Z */
function toRfc3339(date: Date) {
  return `${date.toISOString().slice(0, 19)}Z`;
}

/** Bucket başlangıcını YYYY-MM-DD gününe indirger. */
function toDay(startingAt: string) {
  return startingAt.slice(0, 10);
}

function num(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function text(value: unknown) {
  return typeof value === "string" ? value : "";
}

type Bucket = {
  starting_at?: unknown;
  results?: unknown;
};

type Page = {
  data?: unknown;
  has_more?: unknown;
  next_page?: unknown;
};

/**
 * Bir rapor ucunu sayfa sayfa gezip tüm bucket'ları toplar.
 *
 * Anthropic yanıtı `has_more` / `next_page` ile sayfalanır; `next_page`
 * bittiğinde döngüden çıkarız. Sonsuz döngüye düşmemek için sayfa sayısına
 * üst sınır koyuyoruz.
 */
async function fetchAllBuckets(
  key: string,
  path: string,
  params: URLSearchParams
): Promise<{ ok: true; buckets: Bucket[] } | { ok: false; reason: string }> {
  const buckets: Bucket[] = [];
  let page: string | null = null;

  for (let i = 0; i < 50; i++) {
    const query = new URLSearchParams(params);
    if (page) query.set("page", page);

    let response: Response;
    try {
      response = await fetch(`${API_BASE}${path}?${query.toString()}`, {
        method: "GET",
        headers: {
          "x-api-key": key,
          "anthropic-version": API_VERSION,
          "user-agent": USER_AGENT,
        },
        cache: "no-store",
      });
    } catch {
      return {
        ok: false,
        reason: "Anthropic'e ulaşılamadı. Bağlantınızı kontrol edip tekrar deneyin.",
      };
    }

    if (response.status === 401 || response.status === 403) {
      return {
        ok: false,
        reason:
          "Anahtar kabul edilmedi. Anahtarı Anthropic Console'dan yenileyip tekrar bağlayın.",
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
        reason: `Anthropic ${response.status} döndü. Daha sonra tekrar deneyin.`,
      };
    }

    const body = (await response.json().catch(() => null)) as Page | null;
    if (!body || !Array.isArray(body.data)) {
      return { ok: false, reason: "Anthropic beklenmeyen bir yanıt döndürdü." };
    }

    buckets.push(...(body.data as Bucket[]));

    const nextPage = typeof body.next_page === "string" ? body.next_page : null;
    if (body.has_more !== true || !nextPage) return { ok: true, buckets };
    page = nextPage;
  }

  return { ok: true, buckets };
}

/**
 * Son `days` günün model bazlı token kullanımını çeker.
 *
 * `bucket_width=1d` için limit üst sınırı 31 gündür; daha uzun aralıkları
 * çağıran taraf parçalamalıdır.
 */
export async function fetchUsage(
  key: string,
  startingAt: Date,
  endingAt: Date
): Promise<FetchResult<UsageRow>> {
  const params = new URLSearchParams({
    starting_at: toRfc3339(startingAt),
    ending_at: toRfc3339(endingAt),
    bucket_width: "1d",
    limit: "31",
  });
  params.append("group_by[]", "model");

  const result = await fetchAllBuckets(
    key,
    "/v1/organizations/usage_report/messages",
    params
  );
  if (!result.ok) return result;

  const rows: UsageRow[] = [];

  for (const bucket of result.buckets) {
    const day = toDay(text(bucket.starting_at));
    if (!day) continue;
    if (!Array.isArray(bucket.results)) continue;

    for (const raw of bucket.results) {
      if (!raw || typeof raw !== "object") continue;
      const item = raw as Record<string, unknown>;
      const cacheCreation = (item.cache_creation ?? {}) as Record<string, unknown>;
      const serverToolUse = (item.server_tool_use ?? {}) as Record<string, unknown>;

      rows.push({
        usageDate: day,
        model: text(item.model),
        uncachedInputTokens: num(item.uncached_input_tokens),
        cacheReadInputTokens: num(item.cache_read_input_tokens),
        cacheCreationInputTokens:
          num(cacheCreation.ephemeral_1h_input_tokens) +
          num(cacheCreation.ephemeral_5m_input_tokens),
        outputTokens: num(item.output_tokens),
        webSearchRequests: num(serverToolUse.web_search_requests),
      });
    }
  }

  return { ok: true, rows };
}

/**
 * Son `days` günün açıklama bazlı maliyetini çeker.
 *
 * Maliyet ucu yalnızca `bucket_width=1d` destekler ve limit üst sınırı 31'dir.
 * Öncelikli katman (Priority Tier) ücretleri bu uçta görünmez.
 */
export async function fetchCost(
  key: string,
  startingAt: Date,
  endingAt: Date
): Promise<FetchResult<CostRow>> {
  const params = new URLSearchParams({
    starting_at: toRfc3339(startingAt),
    ending_at: toRfc3339(endingAt),
    bucket_width: "1d",
    limit: "31",
  });
  params.append("group_by[]", "description");

  const result = await fetchAllBuckets(
    key,
    "/v1/organizations/cost_report",
    params
  );
  if (!result.ok) return result;

  const rows: CostRow[] = [];

  for (const bucket of result.buckets) {
    const day = toDay(text(bucket.starting_at));
    if (!day) continue;
    if (!Array.isArray(bucket.results)) continue;

    for (const raw of bucket.results) {
      if (!raw || typeof raw !== "object") continue;
      const item = raw as Record<string, unknown>;

      // `amount` ondalıklı bir metindir ("123.45" = 123.45 cent = 1,2345 USD).
      const amount = Number.parseFloat(text(item.amount));

      rows.push({
        usageDate: day,
        description: text(item.description),
        amountCents: Number.isFinite(amount) ? amount : 0,
        currency: text(item.currency) || "USD",
      });
    }
  }

  return { ok: true, rows };
}
