"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { acceptInvite, revokeInvite } from "@/lib/actions/organizations";
import { Button } from "@/components/ui/button";

export function AcceptInviteButton({ inviteId }: { inviteId: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      size="sm"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          const result = await acceptInvite(inviteId);
          if (result.error) toast.error(result.error);
        })
      }
    >
      {isPending ? "Katılıyor..." : "Katıl"}
    </Button>
  );
}

export function RevokeInviteButton({ inviteId }: { inviteId: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      size="sm"
      variant="ghost"
      className="text-muted-foreground"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          const result = await revokeInvite(inviteId);
          if (result.error) toast.error(result.error);
          else toast.success("Davet iptal edildi.");
        })
      }
    >
      {isPending ? "İptal ediliyor..." : "İptal et"}
    </Button>
  );
}
