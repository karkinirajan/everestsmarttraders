"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { adminUpsert } from "@/lib/actions/admin-mutate";
import { useRouter } from "next/navigation";

interface SettingsFormProps {
  initialSettings: Record<string, unknown>;
}

// Helper to get nested value from settings
function get(
  settings: Record<string, unknown>,
  key: string,
  subkey?: string,
): string {
  const val = settings[key];
  if (!val) return "";
  if (subkey && typeof val === "object" && val !== null) {
    return String((val as Record<string, unknown>)[subkey] ?? "");
  }
  return typeof val === "string" ? val : "";
}

export function SettingsForm({ initialSettings }: SettingsFormProps) {
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaved(false);
    setError(null);
    const fd = new FormData(e.currentTarget);

    const updates = [
      { key: "site_name", value: fd.get("site_name") as string },
      { key: "tagline", value: fd.get("tagline") as string },
      { key: "email", value: fd.get("email") as string },
      { key: "whatsapp", value: fd.get("whatsapp") as string },
      { key: "address", value: fd.get("address") as string },
      { key: "business_hours", value: fd.get("business_hours") as string },
      {
        key: "phones",
        value: {
          primary: fd.get("phone_primary") as string,
          secondary: fd.get("phone_secondary") as string,
        },
      },
      {
        key: "social_links",
        value: {
          facebook: fd.get("facebook") as string,
          instagram: fd.get("instagram") as string,
          youtube: fd.get("youtube") as string,
        },
      },
    ];

    startTransition(async () => {
      for (const { key, value } of updates) {
        const result = await adminUpsert("site_settings", { key, value }, "key");
        if (!result.success) {
          setError(result.error);
          return;
        }
      }
      setSaved(true);
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {saved && (
        <div className="flex items-center gap-2 text-sm text-success bg-success-muted px-4 py-3 rounded-lg">
          <CheckCircle2 className="size-4" />
          Settings saved successfully.
        </div>
      )}
      {error && (
        <div role="alert" className="text-sm text-destructive bg-destructive-muted px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Business Info */}
      <div className="p-5 bg-card border border-border rounded-xl space-y-4">
        <h2 className="font-semibold text-foreground">Business Information</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="site_name">Business Name</Label>
            <Input
              id="site_name"
              name="site_name"
              defaultValue={
                get(initialSettings, "site_name") || "Everest Smart Traders"
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tagline">Tagline</Label>
            <Input
              id="tagline"
              name="tagline"
              defaultValue={get(initialSettings, "tagline")}
              placeholder="Nepal's Trusted Automation Specialists"
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="address">Address</Label>
          <Input
            id="address"
            name="address"
            defaultValue={get(initialSettings, "address")}
            placeholder="Kathmandu, Nepal"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="business_hours">Business Hours</Label>
          <Input
            id="business_hours"
            name="business_hours"
            defaultValue={get(initialSettings, "business_hours")}
            placeholder="Sun–Fri: 9am–6pm, Sat: 10am–4pm"
          />
        </div>
      </div>

      {/* Contact */}
      <div className="p-5 bg-card border border-border rounded-xl space-y-4">
        <h2 className="font-semibold text-foreground">Contact Details</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="phone_primary">Primary Phone</Label>
            <Input
              id="phone_primary"
              name="phone_primary"
              defaultValue={
                get(initialSettings, "phones", "primary") || "9860819528"
              }
              placeholder="9860819528"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="phone_secondary">Secondary Phone</Label>
            <Input
              id="phone_secondary"
              name="phone_secondary"
              defaultValue={
                get(initialSettings, "phones", "secondary") || "9862268680"
              }
              placeholder="9862268680"
            />
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              defaultValue={
                get(initialSettings, "email") || "everestsmarttraders@gmail.com"
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="whatsapp">WhatsApp Number</Label>
            <Input
              id="whatsapp"
              name="whatsapp"
              defaultValue={get(initialSettings, "whatsapp") || "9860819528"}
              placeholder="9860819528"
            />
          </div>
        </div>
      </div>

      {/* Social Links */}
      <div className="p-5 bg-card border border-border rounded-xl space-y-4">
        <h2 className="font-semibold text-foreground">Social Media</h2>
        <div className="grid sm:grid-cols-3 gap-4">
          {[
            { id: "facebook", label: "Facebook URL", key: "facebook" },
            { id: "instagram", label: "Instagram URL", key: "instagram" },
            { id: "youtube", label: "YouTube URL", key: "youtube" },
          ].map(({ id, label, key }) => (
            <div key={id} className="space-y-1.5">
              <Label htmlFor={id}>{label}</Label>
              <Input
                id={id}
                name={id}
                type="url"
                defaultValue={get(initialSettings, "social_links", key)}
                placeholder="https://..."
              />
            </div>
          ))}
        </div>
      </div>

      <Button type="submit" disabled={isPending}>
        {isPending ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            Saving...
          </>
        ) : (
          "Save Settings"
        )}
      </Button>
    </form>
  );
}
