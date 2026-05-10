import Link from "next/link";
import { PageHeader } from "@nexus/ui";

export default function AdminUsersPage() {
  return (
    <div>
      <PageHeader title="Admin · Users" description="User management placeholder." />
      <Link className="text-sm underline" href="/admin/users/example-user">
        example-user
      </Link>
    </div>
  );
}
