import Link from "next/link";
import { MapPin, Scissors } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PublicBarbershop } from "@/types/domain";

export function PublicHeader({ data }: { data: PublicBarbershop }) {
  return (
    <header className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-5 py-6">
      <Link
        href={`/${data.barbershop.slug}`}
        className="flex items-center gap-3"
      >
        <span className="grid size-10 place-items-center rounded-full bg-[var(--tenant-primary)] text-[var(--tenant-secondary)]">
          <Scissors className="size-4" />
        </span>
        <span className="font-semibold tracking-tight">
          {data.barbershop.name}
        </span>
      </Link>
      <div className="flex items-center gap-3">
        {data.settings.address ? (
          <span className="hidden items-center gap-2 text-xs opacity-65 md:flex">
            <MapPin className="size-3.5" /> {data.settings.address}
          </span>
        ) : null}
        <Button
          asChild
          className="bg-[var(--tenant-primary)] text-[var(--tenant-secondary)] hover:opacity-90"
        >
          <Link href={`/${data.barbershop.slug}/agendar`}>Agendar horário</Link>
        </Button>
      </div>
    </header>
  );
}
