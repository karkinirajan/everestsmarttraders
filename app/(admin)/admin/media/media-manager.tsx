"use client";

import { useState, useTransition, useRef } from "react";
import {
  Upload,
  Copy,
  Trash2,
  Loader2,
  CheckCircle2,
  Image as ImageIcon,
  File,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { adminUploadMedia, adminDeleteMedia } from "@/lib/actions/media";

interface MediaAsset {
  id: string;
  filename: string;
  url: string;
  storage_path: string;
  mime_type: string | null;
  size: number | null;
  alt: string | null;
  folder: string | null;
  created_at: string;
}

interface MediaManagerProps {
  initialAssets: MediaAsset[];
}

const FOLDERS = ["general", "products", "projects", "blog", "services"];

function formatBytes(bytes: number | null) {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function MediaManager({ initialAssets }: MediaManagerProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();
  const [assets, setAssets] = useState(initialAssets);
  const [folder, setFolder] = useState("general");
  const [altText, setAltText] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [filterFolder, setFilterFolder] = useState<string>("all");

  async function handleUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadError(null);
    setUploadSuccess(false);

    const fd = new FormData();
    fd.set("file", file);
    fd.set("folder", folder);
    fd.set("alt", altText);

    const result = await adminUploadMedia(fd);

    if (!result.success) {
      setUploadError(result.error);
    } else {
      setAssets((prev) => [result.data as MediaAsset, ...prev]);
      setUploadSuccess(true);
      setAltText("");
      if (fileRef.current) fileRef.current.value = "";
      setTimeout(() => setUploadSuccess(false), 3000);
    }
    setUploading(false);
  }

  async function handleDelete(asset: MediaAsset) {
    if (!confirm(`Delete "${asset.filename}"? This cannot be undone.`)) return;

    startTransition(async () => {
      const result = await adminDeleteMedia(asset.id);
      if (result.success) {
        setAssets((prev) => prev.filter((a) => a.id !== asset.id));
      } else {
        setUploadError(result.error);
      }
    });
  }

  async function copyUrl(url: string) {
    await navigator.clipboard.writeText(url);
    setCopied(url);
    setTimeout(() => setCopied(null), 2000);
  }

  const filtered =
    filterFolder === "all"
      ? assets
      : assets.filter((a) => (a.folder ?? "general") === filterFolder);

  return (
    <div className="space-y-6">
      {/* Upload form */}
      <form
        onSubmit={handleUpload}
        className="p-5 bg-card border border-border rounded-xl space-y-4"
      >
        <h2 className="font-semibold text-foreground text-sm">Upload File</h2>

        {uploadSuccess && (
          <div className="flex items-center gap-2 text-sm text-success bg-success-muted px-3 py-2.5 rounded-lg">
            <CheckCircle2 className="size-4" /> Uploaded successfully.
          </div>
        )}
        {uploadError && (
          <div
            role="alert"
            className="text-sm text-destructive bg-destructive/10 px-3 py-2.5 rounded-lg"
          >
            {uploadError}
          </div>
        )}

        <div className="grid sm:grid-cols-3 gap-4">
          <div className="space-y-1.5 sm:col-span-1">
            <Label htmlFor="folder">Folder</Label>
            <select
              id="folder"
              value={folder}
              onChange={(e) => setFolder(e.target.value)}
              className="flex h-9 w-full rounded-lg border border-input bg-field px-3 py-1 text-sm shadow-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 text-foreground"
            >
              {FOLDERS.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="alt">Alt Text</Label>
            <Input
              id="alt"
              value={altText}
              onChange={(e) => setAltText(e.target.value)}
              placeholder="Describe the image for accessibility"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="file">File</Label>
          <Input
            id="file"
            ref={fileRef}
            type="file"
            accept="image/*,application/pdf,.svg"
            className="cursor-pointer"
            required
          />
          <p className="text-xs text-muted-foreground">
            Images (JPG, PNG, WebP, SVG) and PDFs. Max 10 MB.
          </p>
        </div>

        <Button type="submit" disabled={uploading} size="sm">
          {uploading ? (
            <>
              <Loader2 className="size-4 animate-spin" /> Uploading...
            </>
          ) : (
            <>
              <Upload className="size-4" /> Upload
            </>
          )}
        </Button>
      </form>

      {/* Filter tabs */}
      <div className="flex items-center gap-2 flex-wrap">
        {["all", ...FOLDERS].map((f) => (
          <Button
            key={f}
            type="button"
            variant={filterFolder === f ? "amber" : "secondary"}
            size="xs"
            onClick={() => setFilterFolder(f)}
            className="rounded-full"
          >
            {f === "all"
              ? `All (${assets.length})`
              : `${f} (${assets.filter((a) => (a.folder ?? "general") === f).length})`}
          </Button>
        ))}
      </div>

      {/* Asset grid */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.map((asset) => {
            const isImage = asset.mime_type?.startsWith("image/");
            return (
              <div
                key={asset.id}
                className="group bg-card border border-border rounded-xl overflow-hidden"
              >
                {/* Preview */}
                <div className="aspect-video bg-muted flex items-center justify-center overflow-hidden">
                  {isImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={asset.url}
                      alt={asset.alt ?? asset.filename}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <File className="size-8 text-muted-foreground" />
                  )}
                </div>

                {/* Meta */}
                <div className="p-3 space-y-2">
                  <p
                    className="text-xs font-medium text-foreground truncate"
                    title={asset.filename}
                  >
                    {asset.filename}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatBytes(asset.size)} · {asset.folder ?? "general"}
                  </p>

                  {/* Actions */}
                  <div className="flex gap-1.5">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 h-7 text-xs"
                      onClick={() => copyUrl(asset.url)}
                    >
                      {copied === asset.url ? (
                        <>
                          <CheckCircle2 className="size-3" /> Copied
                        </>
                      ) : (
                        <>
                          <Copy className="size-3" /> Copy URL
                        </>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      aria-label={`Delete ${asset.filename}`}
                      className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                      onClick={() => handleDelete(asset)}
                      disabled={isPending}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl py-16 flex flex-col items-center gap-3 text-muted-foreground">
          <ImageIcon className="size-10 opacity-30" />
          <p className="text-sm">No files in this folder yet.</p>
        </div>
      )}
    </div>
  );
}
