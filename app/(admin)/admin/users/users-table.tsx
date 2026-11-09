"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, Eye, EyeOff, KeyRound, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>User</TableHead>
            <TableHead className="hidden sm:table-cell">Role</TableHead>
            <TableHead className="hidden lg:table-cell">Created</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
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
            <TableRow>
              <TableCell
                colSpan={4}
                className="py-12 text-center text-muted-foreground"
              >
                No users found.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
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
      <TableRow>
        <TableCell>
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium text-foreground">
              {profile.full_name ?? profile.email}
            </span>
            {isSelf && <Badge variant="default">You</Badge>}
            <span className="sm:hidden">
              <Badge
                variant={profile.role === "admin" ? "success" : "muted"}
                className="capitalize"
              >
                {profile.role}
              </Badge>
            </span>
          </div>
          <p className="text-xs text-muted-foreground break-all mt-0.5">
            {profile.email}
          </p>
        </TableCell>
        <TableCell className="hidden sm:table-cell">
          <Badge
            variant={profile.role === "admin" ? "success" : "muted"}
            className="capitalize"
          >
            {profile.role}
          </Badge>
        </TableCell>
        <TableCell className="hidden lg:table-cell text-xs text-muted-foreground whitespace-nowrap">
          {formatDate(profile.created_at)}
        </TableCell>
        <TableCell className="text-right">
          {isEditing ? (
            <Button type="button" variant="ghost" size="xs" onClick={onCancel}>
              <X className="size-3.5" /> Cancel
            </Button>
          ) : (
            <Button type="button" variant="ghost" size="xs" onClick={onEdit}>
              <KeyRound className="size-3.5" /> Change Password
            </Button>
          )}
        </TableCell>
      </TableRow>
      {(isEditing || result) && (
        <TableRow className="bg-muted/20">
          <TableCell colSpan={4} className="py-4">
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
                role="status"
                className={`text-sm flex items-center gap-1.5 ${
                  result.success ? "text-success" : "text-destructive"
                } ${isEditing ? "mt-2" : ""}`}
              >
                {result.success && <CheckCircle2 className="size-4" />}
                {result.message}
              </p>
            )}
          </TableCell>
        </TableRow>
      )}
    </>
  );
}
