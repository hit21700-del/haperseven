import type { Metadata } from "next";
import { Suspense } from "react";
import { FormationPage } from "@/components/formation/FormationPage";

export const metadata: Metadata = { title: "포메이션" };

export default function Page() {
  return (
    <Suspense fallback={null}>
      <FormationPage />
    </Suspense>
  );
}
