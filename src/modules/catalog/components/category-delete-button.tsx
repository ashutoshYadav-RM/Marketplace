"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { deleteCategory } from "../service/actions";

export function CategoryDeleteButton({ categoryId }: { categoryId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await deleteCategory(categoryId);
          router.refresh();
        })
      }
      className="text-muted-foreground hover:text-danger"
      aria-label="Delete category"
    >
      <Trash2 className="h-4 w-4" />
    </button>
  );
}
