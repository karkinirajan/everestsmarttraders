"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, Eye, EyeOff, KeyRound, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatDate } from "@/lib/utils";
import { updateUserPassword } from "@/lib/actions/users";
import type { Profile } from "@/types";

interface UsersTableProps {
  profiles: Profile[];
  currentUserId: string;
}

export function UsersTable({ profiles, currentUserId }: UsersTableProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [result, setResult] = useState<{
    userId: string;
    success: boolean;
    message: string;
  } | null>(null);
  const [isPending, startTransition] = useTransition();

  function startEditing(id: string) {
    setEditingId(id);
    setShowPassword(false);
    setResult(null);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    const userId = String(formData.get("user_id"));

    startTransition(async () => {
      const state = await updateUserPassword(
        { success: false, message: "" },
        formData,
      );
      setResult({ userId, ...state });
      if (state.success) {
        form.reset();
        setEditingId(null);
      }
    });
  }

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">User</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden sm:table-cell">Role</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden lg:table-cell">Created</th>
              <th className="px-4 py-3 w-40" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {profiles.map((profile) => (
              <UserRow
                key={profile.id}
                profile={profile}
                isSelf={profile.id === currentUserId}
                isEditing={editingId === profile.id}
                isPending={isPending && editingId === profile.id}
                result={result?.userId === profile.id ? result : null}
                showPassword={showPassword}
                onToggleShowPassword={() => setShowPassword((v) => !v)}
                onEdit={() => startEditing(profile.id)}
                onCancel={() => setEditingId(null)}
                onSubmit={handleSubmit}
              />
            ))}
            {profiles.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-12 text-center text-muted-foreground">
                  No users found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function UserRow({
  profile,
  isSelf,
  isEditing,
  isPending,
  result,
  showPassword,
  onToggleShowPassword,
  onEdit,
  onCancel,
  onSubmit,
}: {
  profile: Profile;
  isSelf: boolean;
  isEditing: boolean;
  isPending: boolean;
  result: { success: boolean; message: string } | null;
  showPassword: boolean;
  onToggleShowPassword: () => void;
  onEdit: () => void;
  onCancel: () => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <>
      <tr className="hover:bg-muted/30 transition-colors">
        <td className="px-4 py-3">
          <p className="font-medium text-foreground">
            {profile.full_name ?? profile.email}
            {isSelf && (
              <span className="ml-2 text-xs px-2 py-0.5 rounded-full font-medium bg-brand/15 text-brand">
                You
              </span>
            )}
          </p>
          <p className="text-xs text-muted-foreground">{profile.email}</p>
        </td>
        <td className="px-4 py-3 hidden sm:table-cell">
          <span
            className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${
              profile.role === "admin"
                ? "bg-success-muted text-success"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {profile.role}
          </span>
        </td>
        <td className="px-4 py-3 hidden lg:table-cell text-xs text-muted-foreground">
          {formatDate(profile.created_at)}
        </td>
        <td className="px-4 py-3 text-right">
          {isEditing ? (
            <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
              <X className="size-3.5" /> Cancel
            </Button>
          ) : (
            <Button type="button" variant="ghost" size="sm" onClick={onEdit}>
              <KeyRound className="size-3.5" /> Change Password
            </Button>
          )}
        </td>
      </tr>
      {(isEditing || result) && (
        <tr className="bg-muted/20">
          <td colSpan={4} className="px-4 py-4">
            {isEditing ? (
              <form
                onSubmit={onSubmit}
                className="flex flex-col sm:flex-row sm:items-end gap-3 max-w-2xl"
              >
                <input type="hidden" name="user_id" value={profile.id} />
                <div className="flex-1 space-y-1.5">
                  <Label htmlFor={`password-${profile.id}`}>New Password</Label>
                  <div className="relative">
                    <Input
                      id={`password-${profile.id}`}
                      name="password"
                      type={showPassword ? "text" : "password"}
                      minLength={8}
                      required
                      autoComplete="new-password"
                      placeholder="At least 8 characters"
                      className="pr-9"
                    />
                    <button
                      type="button"
                      onClick={onToggleShowPassword}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      aria-pressed={showPassword}
                    >
                      {showPassword ? (
                        <EyeOff className="size-4" />
                      ) : (
                        <Eye className="size-4" />
                      )}
                    </button>
                  </div>
                </div>
                <div className="flex-1 space-y-1.5">
                  <Label htmlFor={`confirm-${profile.id}`}>Confirm Password</Label>
                  <Input
                    id={`confirm-${profile.id}`}
                    name="confirm_password"
                    type={showPassword ? "text" : "password"}
                    minLength={8}
                    required
                    autoComplete="new-password"
                    placeholder="Repeat new password"
                  />
                </div>
                <Button type="submit" size="sm" disabled={isPending}>
                  {isPending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <KeyRound className="size-4" />
                  )}
                  Update
                </Button>
              </form>
            ) : null}
            {result && (
              <p
                className={`text-sm flex items-center gap-1.5 ${
                  result.success ? "text-success" : "text-destructive"
                } ${isEditing ? "mt-2" : ""}`}
              >
                {result.success && <CheckCircle2 className="size-4" />}
                {result.message}
              </p>
            )}
          </td>
        </tr>
      )}
    </>
  );
}
