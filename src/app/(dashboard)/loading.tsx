import { Skeleton } from "@/components/ui/skeleton";

// Estado de carregamento exibido ao navegar entre as abas do painel.
export default function DashboardLoading() {
  return (
    <div className="animate-in fade-in duration-300">
      <div className="mb-7 space-y-3">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-80" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-28 rounded-xl" />
        ))}
      </div>
      <Skeleton className="mt-6 h-64 rounded-xl" />
    </div>
  );
}
