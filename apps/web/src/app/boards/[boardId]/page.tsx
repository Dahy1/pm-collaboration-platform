import Link from "next/link";
import { PageHeader } from "@nexus/ui";

export default async function BoardPage({
  params,
}: {
  params: Promise<{ boardId: string }>;
}) {
  const { boardId } = await params;
  return (
    <div>
      <PageHeader title={`Board: ${boardId}`} description="Kanban placeholder." />
      <Link
        className="text-sm underline"
        href={`/boards/${boardId}/tasks/example-task`}
      >
        Open example task
      </Link>
    </div>
  );
}
