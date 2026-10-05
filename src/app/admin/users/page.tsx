import { Users } from "lucide-react";
import { listUsersForAdmin } from "@/modules/users/data/admin-users";
import { AdminUserRow } from "@/modules/users/components/admin-user-row";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default async function AdminUsersPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const users = await listUsersForAdmin(q);

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="mb-4 text-xl font-semibold text-foreground">Users</h1>
      <form className="mb-6 flex gap-2" action="/admin/users">
        <Input name="q" defaultValue={q ?? ""} placeholder="Search by name, email, or phone" />
        <Button type="submit" variant="secondary">
          Search
        </Button>
      </form>

      {users.length === 0 ? (
        <EmptyState icon={<Users className="h-6 w-6" />} title="No users found" />
      ) : (
        <div className="flex flex-col gap-3">
          {users.map((user) => (
            <AdminUserRow key={user.id} user={user} />
          ))}
        </div>
      )}
    </div>
  );
}
