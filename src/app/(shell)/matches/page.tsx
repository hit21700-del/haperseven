import type { Metadata } from "next";
import { MatchesPage } from "@/components/matches/MatchesPage";

export const metadata: Metadata = { title: "경기" };

export default function Page() {
  return <MatchesPage />;
}
