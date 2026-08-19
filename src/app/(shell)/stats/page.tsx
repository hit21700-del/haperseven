import type { Metadata } from "next";
import { StatsPage } from "@/components/stats/StatsPage";

export const metadata: Metadata = { title: "통계" };

export default function Page() {
  return <StatsPage />;
}
