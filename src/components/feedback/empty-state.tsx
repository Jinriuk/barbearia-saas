import { Inbox } from "lucide-react";

export function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="grid min-h-56 place-items-center rounded-xl border border-dashed p-8 text-center">
      <div>
        <Inbox className="text-muted-foreground mx-auto size-7" />
        <p className="mt-4 font-medium">{title}</p>
        <p className="text-muted-foreground mt-1 text-sm">{description}</p>
      </div>
    </div>
  );
}
