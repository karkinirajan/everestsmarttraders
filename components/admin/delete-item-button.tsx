"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Loader2, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { adminDelete } from "@/lib/actions/admin-mutate";
import { cn } from "@/lib/utils";

interface DeleteItemButtonProps {
  table: string;
  id: string;
  label?: string;
  redirectTo?: string;
  size?: "xs" | "sm" | "default";
  className?: string;
}

export function DeleteItemButton({
  table,
  id,
  label = "item",
  redirectTo,
  size = "xs",
  className,
}: DeleteItemButtonProps) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    setError(null);
    startTransition(async () => {
      const res = await adminDelete(table, id);
      if (!res.success) {
        setError(res.error);
        return;
      }
      setConfirming(false);
      if (redirectTo) {
        router.push(redirectTo);
      }
      router.refresh();
    });
  }

  if (confirming) {
    return (
      <div className={cn("inline-flex items-center gap-1.5", className)}>
        <Button
          type="button"
          variant="destructive"
          size={size}
          disabled={isPending}
          onClick={handleDelete}
          aria-label={`Confirm delete ${label}`}
        >
          {isPending ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Check className="size-3.5" />
          )}
          Confirm
        </Button>
        <Button
          type="button"
          variant="outline"
          size={size}
          disabled={isPending}
          onClick={() => {
            setConfirming(false);
            setError(null);
          }}
          aria-label="Cancel delete"
        >
          <X className="size-3.5" />
          Cancel
        </Button>
        {error && (
          <span
            role="alert"
            className="text-xs text-destructive max-w-44 truncate"
            title={error}
          >
            {error}
          </span>
        )}
      </div>
    );
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size={size}
      onClick={() => setConfirming(true)}
      className={cn(
        "text-muted-foreground hover:text-destructive hover:bg-destructive-muted",
        className,
      )}
      aria-label={`Delete ${label}`}
    >
      <Trash2 className="size-3.5" />
      {size !== "xs" && <span>Delete</span>}
    </Button>
  );
}
