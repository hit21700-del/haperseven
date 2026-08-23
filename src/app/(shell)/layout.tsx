"use client";
import { AppShellLayout } from "@/components/layout/AppShell";
import { ToastProvider } from "@/components/ui/Toast";

export default function ShellLayout({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <AppShellLayout>{children}</AppShellLayout>
    </ToastProvider>
  );
}
