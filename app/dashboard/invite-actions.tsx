"use client";

import { useTransition } from "react";
import { acceptInvite, revokeInvite } from "@/lib/actions/organizations";

export function AcceptInviteButton({ inviteId }: { inviteId: string }) {
  const [isPending, startTransition] = useTransition();
  return (
    <button
      onClick={() =>
        startTransition(async () => {
          await acceptInvite(inviteId);
        })
      }
      disabled={isPending}
      className="rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
    >
      {isPending ? "Katılıyor..." : "Katıl"}
    </button>
  );
}

export function RevokeInviteButton({ inviteId }: { inviteId: string }) {
  const [isPending, startTransition] = useTransition();
  return (
    <button
      onClick={() =>
        startTransition(async () => {
          await revokeInvite(inviteId);
        })
      }
      disabled={isPending}
      className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300"
    >
      {isPending ? "İptal ediliyor..." : "İptal et"}
    </button>
  );
}
