import { ShieldAlert, Users } from "lucide-react";
import { requireActiveOrganizationMembership } from "@/modules/organizations/data/organizations";
import { listOrgLocations } from "@/modules/locations/data/locations";
import { listOrgStaff } from "@/modules/organizations/data/staff";
import { getCurrentUser } from "@/modules/users/data/current-user";
import { InviteStaffForm } from "@/modules/organizations/components/invite-staff-form";
import { StaffRow } from "@/modules/organizations/components/staff-row";
import { EmptyState } from "@/components/ui/empty-state";

export default async function MerchantStaffPage() {
  const membership = await requireActiveOrganizationMembership();

  if (membership.role !== "owner" && membership.role !== "admin") {
    return (
      <div className="mx-auto max-w-xl px-6 py-16">
        <EmptyState
          icon={<ShieldAlert className="h-6 w-6" />}
          title="Owners and admins only"
          body="Ask an owner or admin at your shop to manage staff."
        />
      </div>
    );
  }

  const [locations, staff, currentUser] = await Promise.all([
    listOrgLocations(membership.organization.id),
    listOrgStaff(membership.organization.id),
    getCurrentUser(),
  ]);

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="mb-6 text-xl font-semibold text-foreground">Staff</h1>

      <div className="mb-6">
        <InviteStaffForm organizationId={membership.organization.id} locations={locations} />
      </div>

      {staff.length === 0 ? (
        <EmptyState icon={<Users className="h-6 w-6" />} title="No staff yet" />
      ) : (
        <div className="flex flex-col gap-3">
          {staff.map((member) => (
            <StaffRow key={member.id} member={member} isSelf={member.userId === currentUser?.id} />
          ))}
        </div>
      )}
    </div>
  );
}
