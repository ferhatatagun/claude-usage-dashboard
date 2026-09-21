"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { createOrganization } from "@/lib/actions/organizations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
          else toast.success("Organizasyon oluşturuldu.");
        });
      }}
      className="flex flex-col gap-4"
    >
      <div className="flex flex-col gap-2">
        <Label htmlFor="org-name">Organizasyon adı</Label>
        <Input
          id="org-name"
          name="name"
          required
          placeholder="Örn. Acme A.Ş."
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button type="submit" disabled={isPending} className="w-fit">
        {isPending ? "Oluşturuluyor..." : "Organizasyon oluştur"}
      </Button>
    </form>
  );
}
