import Link from "next/link";
import { PageHeader } from "@nexus/ui";

export default function BoardsPage() {
  return (
    <div>
      <PageHeader title="Boards" description="List of boards (placeholder)." />
      <ul className="space-y-2 text-sm">
        <li>
          <Link className="underline" href="/boards/example-board">
            example-board
          </Link>
        </li>
      </ul>
    </div>
  );
}
