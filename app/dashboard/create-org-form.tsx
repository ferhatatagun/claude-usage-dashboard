"use client";

import { useState, useTransition } from "react";
import { createOrganization } from "@/lib/actions/organizations";

export function CreateOrgForm() {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <form
      action={(formData) => {
        setError(null);
        startTransition(async () => {
          const result = await createOrganization(formData);
          if (result.error) setError(result.error);
        });
      }}
      className="flex flex-col gap-3"
    >
      <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
        Organizasyon adı
      </label>
      <input
        name="name"
        type="text"
        required
        placeholder="Örn. Acme A.Ş."
        className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
      />
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      <button
        type="submit"
        disabled={isPending}
        className="w-fit rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
      >
        {isPending ? "Oluşturuluyor..." : "Organizasyon oluştur"}
      </button>
    </form>
  );
}
