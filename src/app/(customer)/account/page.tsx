import Link from "next/link";
import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { ChevronRight, ClipboardList, CalendarClock } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { signOut } from "@/modules/auth/service/actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default async function AccountPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/sign-in?next=/account");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email, phone_e164, preferred_locale")
    .eq("id", user.id)
    .single();

  return (
    <div className="mx-auto max-w-lg px-4 py-10 sm:px-6">
      <h1 className="mb-6 text-xl font-semibold text-foreground">Account</h1>
      <Card className="flex flex-col gap-4 p-5">
        <Field label="Name" value={profile?.full_name ?? "—"} />
        <Field label="Email" value={profile?.email ?? user.email ?? "—"} />
        <Field label="Phone" value={profile?.phone_e164 ?? user.phone ?? "—"} />
        <Field label="Language" value={profile?.preferred_locale ?? "en"} />
      </Card>

      <div className="mt-6 flex flex-col gap-2">
        <NavCard href="/orders" icon={<ClipboardList className="h-4 w-4" />} label="Your orders" />
        <NavCard href="/bookings" icon={<CalendarClock className="h-4 w-4" />} label="Your bookings" />
      </div>

      <form action={signOut} className="mt-6">
        <Button type="submit" variant="secondary" className="w-full">
          Sign out
        </Button>
      </form>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground">{value}</span>
    </div>
  );
}

function NavCard({ href, icon, label }: { href: string; icon: ReactNode; label: string }) {
  return (
    <Link href={href}>
      <Card className="flex items-center justify-between p-4 transition-colors hover:border-brand">
        <span className="flex items-center gap-2 text-sm font-medium text-foreground">
          {icon}
          {label}
        </span>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </Card>
    </Link>
  );
}
