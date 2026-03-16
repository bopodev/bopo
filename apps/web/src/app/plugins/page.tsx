import { redirect } from "next/navigation";

export default async function PluginsPage({
  searchParams
}: {
  searchParams: Promise<{ companyId?: string }>;
}) {
  const { companyId } = await searchParams;
  redirect(companyId ? `/settings/plugins?companyId=${encodeURIComponent(companyId)}` : "/settings/plugins");
}
