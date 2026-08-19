import type { Metadata } from "next";
import { MembersPage } from "@/components/members/MembersPage";

export const metadata: Metadata = { title: "회원" };

export default function Page() {
  return <MembersPage />;
}
