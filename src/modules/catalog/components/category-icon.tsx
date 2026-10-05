import {
  Armchair,
  Bike,
  Bug,
  Car,
  Cpu,
  Croissant,
  Dumbbell,
  Grid3x3,
  Hammer,
  Home,
  Milk,
  Paintbrush,
  Pencil,
  Pill,
  Plug,
  Scissors,
  Shirt,
  Smartphone,
  Snowflake,
  ShoppingBasket,
  Sparkles,
  Settings,
  SprayCan,
  Utensils,
  WashingMachine,
  Wrench,
  type LucideIcon,
} from "lucide-react";

// Maps the `icon` string stored in `categories` (see supabase/seed.sql) to a
// component. Deliberately a fixed lookup, not a dynamic import by string —
// an unrecognized icon degrades to the default rather than failing to build.
const ICONS: Record<string, LucideIcon> = {
  "shopping-basket": ShoppingBasket,
  milk: Milk,
  utensils: Utensils,
  croissant: Croissant,
  pill: Pill,
  cpu: Cpu,
  smartphone: Smartphone,
  armchair: Armchair,
  "washing-machine": WashingMachine,
  hammer: Hammer,
  pencil: Pencil,
  shirt: Shirt,
  sparkles: Sparkles,
  home: Home,
  plug: Plug,
  wrench: Wrench,
  snowflake: Snowflake,
  settings: Settings,
  "spray-can": SprayCan,
  paintbrush: Paintbrush,
  bug: Bug,
  scissors: Scissors,
  dumbbell: Dumbbell,
  car: Car,
  bike: Bike,
};

export function CategoryIcon({ icon, className }: { icon: string | null; className?: string }) {
  const Icon = (icon && ICONS[icon]) || Grid3x3;
  return <Icon className={className} aria-hidden="true" />;
}
