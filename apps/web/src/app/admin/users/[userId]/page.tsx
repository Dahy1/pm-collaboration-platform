import { PageHeader } from "@nexus/ui";

export default async function AdminUserPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  return (
    <div>
      <PageHeader
        title={`User: ${userId}`}
        description="Admin user profile placeholder."
      />
    </div>
  );
}
