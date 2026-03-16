import { redirect } from "next/navigation";

export default async function ModelsPage({
  searchParams
}: {
  searchParams: Promise<{ companyId?: string }>;
}) {
  const { companyId } = await searchParams;
  redirect(companyId ? `/settings/models?companyId=${encodeURIComponent(companyId)}` : "/settings/models");
}
