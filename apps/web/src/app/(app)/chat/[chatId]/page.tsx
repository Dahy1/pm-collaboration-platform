import { PageHeader } from "@nexus/ui";

export default async function ChatRoomPage({
  params,
}: {
  params: Promise<{ chatId: string }>;
}) {
  const { chatId } = await params;
  return (
    <div>
      <PageHeader title={`Chat: ${chatId}`} description="Room placeholder." />
    </div>
  );
}
