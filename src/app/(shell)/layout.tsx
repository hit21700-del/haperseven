"use client";
import { AppShellLayout } from "@/components/layout/AppShell";

export default function ShellLayout({ children }: { children: React.ReactNode }) {
  return <AppShellLayout>{children}</AppShellLayout>;
}
