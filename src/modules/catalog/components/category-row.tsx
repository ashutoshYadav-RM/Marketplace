import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Grid3x3, Wrench } from "lucide-react";
import { listHomeCategories } from "../data/categories";
import { CategoryIcon } from "./category-icon";

export async function CategoryRow() {
  const [t, categories] = await Promise.all([getTranslations("categories"), listHomeCategories()]);
  const home = await getTranslations("home");

  return (
    <div className="flex gap-3 overflow-x-auto pb-1" role="list">
      {categories.map((category) => (
        <Link
          key={category.id}
          href={`/search?category=${category.slug}`}
          role="listitem"
          className="flex w-20 shrink-0 flex-col items-center gap-2 rounded-2xl border border-border bg-surface-raised px-2 py-3 text-center transition-colors hover:border-brand"
        >
          <CategoryIcon icon={category.icon} className="h-6 w-6 text-brand" />
          <span className="text-xs font-medium leading-tight text-foreground">
            {t.has(category.slug) ? t(category.slug) : category.name}
          </span>
        </Link>
      ))}

      <Link
        href="/search?type=service"
        role="listitem"
        className="flex w-20 shrink-0 flex-col items-center gap-2 rounded-2xl border border-border bg-surface-raised px-2 py-3 text-center transition-colors hover:border-brand"
      >
        <Wrench className="h-6 w-6 text-brand" aria-hidden="true" />
        <span className="text-xs font-medium leading-tight text-foreground">{t("services")}</span>
      </Link>

      <Link
        href="/search"
        role="listitem"
        className="flex w-20 shrink-0 flex-col items-center gap-2 rounded-2xl border border-dashed border-border px-2 py-3 text-center text-muted-foreground transition-colors hover:border-brand hover:text-brand"
      >
        <Grid3x3 className="h-6 w-6" aria-hidden="true" />
        <span className="text-xs font-medium leading-tight">{home("moreCategories")}</span>
      </Link>
    </div>
  );
}
