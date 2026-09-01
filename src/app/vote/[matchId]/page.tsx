import type { Metadata } from "next";
import { Suspense } from "react";
import { VotePage } from "@/components/vote/VotePage";

export const metadata: Metadata = {
  title: "참석 투표",
  description: "하퍼세븐 경기 참석 투표 — 이름을 고르고 참석/불참을 눌러주세요.",
  openGraph: { title: "하퍼세븐 참석 투표", description: "이름을 고르고 참석/불참을 눌러주세요." },
};

export default function Page() {
  return (
    <Suspense fallback={null}>
      <VotePage />
    </Suspense>
  );
}
