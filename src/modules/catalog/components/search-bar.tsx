"use client";

import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

export function SearchBar() {
  const t = useTranslations("home");
  const router = useRouter();

  return (
    <form
      role="search"
      onSubmit={(event) => {
        event.preventDefault();
        const query = new FormData(event.currentTarget).get("q");
        const params = new URLSearchParams();
        if (typeof query === "string" && query.trim()) params.set("q", query.trim());
        router.push(`/search${params.size ? `?${params}` : ""}`);
      }}
      className="flex items-center gap-2 rounded-2xl border border-border bg-surface px-4 py-3 shadow-sm transition-colors focus-within:border-brand"
    >
      <Search className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
      <input
        name="q"
        type="search"
        placeholder={t("searchPlaceholder")}
        className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
      />
    </form>
  );
}
