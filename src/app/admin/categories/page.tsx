import { listAllCategoriesForAdmin } from "@/modules/catalog/data/categories";
import { CategoryForm } from "@/modules/catalog/components/category-form";
import { CategoryDeleteButton } from "@/modules/catalog/components/category-delete-button";
import { CategoryIcon } from "@/modules/catalog/components/category-icon";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function AdminCategoriesPage() {
  const categories = await listAllCategoriesForAdmin();

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="mb-4 text-xl font-semibold text-foreground">Categories</h1>
      <div className="mb-6">
        <CategoryForm />
      </div>

      <Card className="divide-y divide-border">
        {categories.map((category) => (
          <div key={category.id} className="flex items-center justify-between gap-3 p-3">
            <div className="flex items-center gap-3">
              <CategoryIcon icon={category.icon} className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium text-foreground">{category.name}</p>
                <p className="font-mono text-xs text-muted-foreground">{category.slug}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge tone="neutral">{category.type}</Badge>
              <CategoryDeleteButton categoryId={category.id} />
            </div>
          </div>
        ))}
      </Card>
    </div>
  );
}
