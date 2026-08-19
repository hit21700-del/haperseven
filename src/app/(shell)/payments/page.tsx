import type { Metadata } from "next";
import { PaymentsPage } from "@/components/payments/PaymentsPage";

export const metadata: Metadata = { title: "회비" };

export default function Page() {
  return <PaymentsPage />;
}
