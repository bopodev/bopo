import type { Route } from "next";
import { redirect } from "next/navigation";
import { defaultSectionSlug } from "@/lib/sections";

export default function HomePage() {
  redirect(`/${defaultSectionSlug}` as Route);
}
