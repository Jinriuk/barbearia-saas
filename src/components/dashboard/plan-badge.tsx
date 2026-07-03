import { Sparkles, Store } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { isPlus, planLabel } from "@/lib/plans";
import { cn } from "@/lib/utils";

export function PlanBadge({
  plan,
  className,
}: {
  plan: string;
  className?: string;
}) {
  const plus = isPlus(plan);
  return (
    <Badge
      className={cn(
        "border-transparent",
        plus
          ? "bg-gradient-to-r from-amber-500 to-yellow-400 text-black"
          : "bg-secondary text-secondary-foreground",
        className,
      )}
    >
      {plus ? <Sparkles className="size-3" /> : <Store className="size-3" />}
      {planLabel(plan)}
    </Badge>
  );
}
