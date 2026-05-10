import Link from "next/link";
import { PageHeader } from "@nexus/ui";

export default function ChatPage() {
  return (
    <div>
      <PageHeader title="Chat" description="Rooms list placeholder." />
      <Link className="text-sm underline" href="/chat/example-room">
        example-room
      </Link>
    </div>
  );
}
