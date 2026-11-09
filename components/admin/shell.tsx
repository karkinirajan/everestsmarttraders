"use client";

import { useEffect, useState, Suspense } from "react";
import { AdminSidebar } from "@/components/admin/sidebar";
import { AdminHeader } from "@/components/admin/header";

interface AdminShellProps {
  role: string;
  user: { email: string; name: string | null };
  children: React.ReactNode;
}

export function AdminShell({ role, user, children }: AdminShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!sidebarOpen) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setSidebarOpen(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [sidebarOpen]);

  return (
    <div className="dark min-h-screen bg-background text-foreground flex">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/60 backdrop-blur-[1px] lg:hidden"
          aria-hidden="true"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <AdminSidebar
        role={role}
        mobileOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <AdminHeader
          user={user}
          onMenuClick={() => setSidebarOpen((prev) => !prev)}
        />
        <main
          id="main-content"
          tabIndex={-1}
          className="flex-1 p-4 sm:p-6 lg:p-8 overflow-x-hidden overflow-y-auto text-[15px]"
        >
          <Suspense
            fallback={
              <div className="space-y-4 animate-pulse" aria-busy="true" aria-label="Loading content">
                <div className="h-8 w-48 rounded-lg bg-muted" />
                <div className="h-64 w-full rounded-xl bg-card border border-border" />
              </div>
            }
          >
            {children}
          </Suspense>
        </main>
      </div>
    </div>
  );
}
