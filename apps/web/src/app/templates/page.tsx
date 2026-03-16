import { redirect } from "next/navigation";

export default async function TemplatesPage({
  searchParams
}: {
  searchParams: Promise<{ companyId?: string }>;
}) {
  const { companyId } = await searchParams;
  redirect(companyId ? `/settings/templates?companyId=${encodeURIComponent(companyId)}` : "/settings/templates");
}
