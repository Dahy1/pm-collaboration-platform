import { PageHeader } from "@nexus/ui";

export default async function TaskPage({
  params,
}: {
  params: Promise<{ boardId: string; taskId: string }>;
}) {
  const { boardId, taskId } = await params;
  return (
    <div>
      <PageHeader
        title={`Task: ${taskId}`}
        description={`Board: ${boardId} (placeholder).`}
      />
    </div>
  );
}
