"use client";

import { useState, useTransition } from "react";
import { adminUpsert } from "@/lib/actions/admin-mutate";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type HomepageSection = {
  id: string;
  section_key: string;
  title: string | null;
  subtitle: string | null;
  content: Record<string, unknown>;
  is_visible: boolean;
  position: number;
};

type Announcement = {
  id: string;
  message: string;
  link: string | null;
  link_label: string | null;
  type: "info" | "success" | "warning" | "error";
  is_active: boolean;
  starts_at: string | null;
  ends_at: string | null;
};

type SeoOverride = {
  id: string;
  path: string;
  title: string | null;
  description: string | null;
  og_image: string | null;
  canonical: string | null;
  noindex: boolean;
  structured_data: Record<string, unknown> | null;
};

interface ContentManagerProps {
  initialSections: HomepageSection[];
  initialAnnouncements: Announcement[];
  initialSeoOverrides: SeoOverride[];
}

export function ContentManager({
  initialSections,
  initialAnnouncements,
  initialSeoOverrides,
}: ContentManagerProps) {
  const [sections, setSections] = useState(initialSections);
  const [announcements, setAnnouncements] = useState(initialAnnouncements);
  const [seoOverrides, setSeoOverrides] = useState(initialSeoOverrides);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function saveAll() {
    setSaved(false);
    setError(null);

    startTransition(async () => {
      for (const section of sections) {
        const result = await adminUpsert(
          "homepage_sections",
          {
            section_key: section.section_key,
            title: section.title,
            subtitle: section.subtitle,
            content: section.content,
            is_visible: section.is_visible,
            position: section.position,
          },
          "section_key",
        );
        if (!result.success) {
          setError(result.error);
          return;
        }
      }

      for (const item of announcements) {
        const result = await adminUpsert(
          "announcements",
          {
            id: item.id,
            message: item.message,
            link: item.link,
            link_label: item.link_label,
            type: item.type,
            is_active: item.is_active,
            starts_at: item.starts_at,
            ends_at: item.ends_at,
          },
          "id",
        );
        if (!result.success) {
          setError(result.error);
          return;
        }
      }

      for (const item of seoOverrides) {
        const result = await adminUpsert(
          "seo_overrides",
          {
            path: item.path,
            title: item.title,
            description: item.description,
            og_image: item.og_image,
            canonical: item.canonical,
            noindex: item.noindex,
            structured_data: item.structured_data,
          },
          "path",
        );
        if (!result.success) {
          setError(result.error);
          return;
        }
      }

      setSaved(true);
    });
  }

  return (
    <div className="space-y-6">
      {(saved || error) && (
        <div className={saved ? "flex items-center gap-2 text-sm text-success bg-success-muted px-4 py-3 rounded-lg" : "text-sm text-destructive bg-destructive/10 px-4 py-3 rounded-lg"}>
          {saved && <CheckCircle2 className="size-4" />}
          {saved ? "Content saved successfully." : error}
        </div>
      )}

      <section className="p-5 bg-card border border-border rounded-xl space-y-4">
        <h2 className="font-semibold text-foreground">Homepage Sections</h2>
        <div className="space-y-5">
          {sections.map((section, index) => (
            <div key={section.section_key} className="grid gap-3 border border-border rounded-lg p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-foreground">{section.section_key}</p>
                <label className="text-xs text-muted-foreground flex items-center gap-2">
                  Visible
                  <input
                    type="checkbox"
                    checked={section.is_visible}
                    onChange={(e) => {
                      const copy = [...sections];
                      copy[index] = { ...copy[index], is_visible: e.target.checked };
                      setSections(copy);
                    }}
                  />
                </label>
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Title</Label>
                  <Input
                    value={section.title ?? ""}
                    onChange={(e) => {
                      const copy = [...sections];
                      copy[index] = { ...copy[index], title: e.target.value };
                      setSections(copy);
                    }}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Position</Label>
                  <Input
                    type="number"
                    value={section.position}
                    onChange={(e) => {
                      const copy = [...sections];
                      copy[index] = { ...copy[index], position: Number(e.target.value) };
                      setSections(copy);
                    }}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Subtitle</Label>
                <Textarea
                  rows={2}
                  value={section.subtitle ?? ""}
                  onChange={(e) => {
                    const copy = [...sections];
                    copy[index] = { ...copy[index], subtitle: e.target.value };
                    setSections(copy);
                  }}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Content JSON</Label>
                <Textarea
                  rows={5}
                  value={JSON.stringify(section.content ?? {}, null, 2)}
                  onChange={(e) => {
                    const copy = [...sections];
                    try {
                      copy[index] = { ...copy[index], content: JSON.parse(e.target.value) };
                      setSections(copy);
                      setError(null);
                    } catch {
                      setError(`Invalid JSON in section ${section.section_key}`);
                    }
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="p-5 bg-card border border-border rounded-xl space-y-4">
        <h2 className="font-semibold text-foreground">Announcements</h2>
        <div className="space-y-4">
          {announcements.map((item, index) => (
            <div key={item.id} className="grid gap-3 border border-border rounded-lg p-4">
              <div className="space-y-1.5">
                <Label>Message</Label>
                <Textarea
                  rows={2}
                  value={item.message}
                  onChange={(e) => {
                    const copy = [...announcements];
                    copy[index] = { ...copy[index], message: e.target.value };
                    setAnnouncements(copy);
                  }}
                />
              </div>
              <div className="grid sm:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label>Link</Label>
                  <Input
                    value={item.link ?? ""}
                    onChange={(e) => {
                      const copy = [...announcements];
                      copy[index] = { ...copy[index], link: e.target.value };
                      setAnnouncements(copy);
                    }}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Link Label</Label>
                  <Input
                    value={item.link_label ?? ""}
                    onChange={(e) => {
                      const copy = [...announcements];
                      copy[index] = { ...copy[index], link_label: e.target.value };
                      setAnnouncements(copy);
                    }}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Type</Label>
                  <Input
                    value={item.type}
                    onChange={(e) => {
                      const copy = [...announcements];
                      copy[index] = { ...copy[index], type: e.target.value as Announcement["type"] };
                      setAnnouncements(copy);
                    }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="p-5 bg-card border border-border rounded-xl space-y-4">
        <h2 className="font-semibold text-foreground">SEO Overrides</h2>
        <div className="space-y-4">
          {seoOverrides.map((item, index) => (
            <div key={item.id} className="grid gap-3 border border-border rounded-lg p-4">
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Path</Label>
                  <Input
                    value={item.path}
                    onChange={(e) => {
                      const copy = [...seoOverrides];
                      copy[index] = { ...copy[index], path: e.target.value };
                      setSeoOverrides(copy);
                    }}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>OG Image</Label>
                  <Input
                    value={item.og_image ?? ""}
                    onChange={(e) => {
                      const copy = [...seoOverrides];
                      copy[index] = { ...copy[index], og_image: e.target.value };
                      setSeoOverrides(copy);
                    }}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Title</Label>
                <Input
                  value={item.title ?? ""}
                  onChange={(e) => {
                    const copy = [...seoOverrides];
                    copy[index] = { ...copy[index], title: e.target.value };
                    setSeoOverrides(copy);
                  }}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Description</Label>
                <Textarea
                  rows={2}
                  value={item.description ?? ""}
                  onChange={(e) => {
                    const copy = [...seoOverrides];
                    copy[index] = { ...copy[index], description: e.target.value };
                    setSeoOverrides(copy);
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      <Button type="button" onClick={saveAll} disabled={isPending}>
        {isPending ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            Saving content...
          </>
        ) : (
          "Save All Content"
        )}
      </Button>
    </div>
  );
}
