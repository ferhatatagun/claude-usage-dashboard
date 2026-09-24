"use client";

import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { inviteMember } from "@/lib/actions/organizations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InfoTooltip } from "@/components/ui/info-tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function InviteForm({ orgId }: { orgId: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <form
      ref={formRef}
      action={(formData) => {
        setError(null);
        startTransition(async () => {
          const result = await inviteMember(formData);
          if (result.error) {
            setError(result.error);
          } else {
            if (result.warning) toast.warning(result.warning);
            else toast.success("Davet gönderildi, e-posta yolda.");
            formRef.current?.reset();
          }
        });
      }}
      className="flex flex-col gap-3"
    >
      <input type="hidden" name="orgId" value={orgId} />

      <div className="flex flex-wrap items-end gap-3">
        <div className="flex min-w-56 flex-1 flex-col gap-2">
          <Label htmlFor="invite-email">
            E-posta
            <InfoTooltip text="Davet edeceğiniz kişinin e-posta adresi. Bu adrese, panele girmesi için tek tıkla giriş bağlantısı içeren bir davet e-postası gönderilir." />
          </Label>
          <Input
            id="invite-email"
            name="email"
            type="email"
            required
            placeholder="ekip.arkadasi@sirket.com"
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="invite-role">
            Rol
            <InfoTooltip text="Üye: yalnızca toplam kullanım ve maliyeti görür. Admin: ayrıca kişi bazlı kullanımı görür, üye davet edebilir, API anahtarı ve CSV yükleme yapabilir." />
          </Label>
          <Select name="role" defaultValue="member">
            <SelectTrigger id="invite-role" className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="member">Üye</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button type="submit" disabled={isPending}>
          {isPending ? "Gönderiliyor..." : "Davet gönder"}
        </Button>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
    </form>
  );
}
