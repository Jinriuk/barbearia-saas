import Link from "next/link";
import Image from "next/image";
import { Scissors } from "lucide-react";
import type { PublicBarbershop } from "@/types/domain";

export function PublicHeader({
  data,
  hideCta = false,
}: {
  data: PublicBarbershop;
  hideCta?: boolean;
}) {
  return (
    <header className="sticky top-0 z-40 border-b border-black/[.06] bg-[var(--tenant-bg)]/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
        <Link
          href={`/${data.barbershop.slug}`}
          className="flex min-w-0 items-center gap-2.5"
        >
          <span className="grid size-9 shrink-0 place-items-center overflow-hidden rounded-full bg-[var(--tenant-secondary)] text-[var(--tenant-on-secondary)]">
            {data.barbershop.logoUrl ? (
              <Image
                src={data.barbershop.logoUrl}
                alt=""
                width={36}
                height={36}
                className="size-full object-cover"
              />
            ) : (
              <Scissors className="size-4" />
            )}
          </span>
          <span className="truncate text-[15px] font-semibold tracking-tight">
            {data.barbershop.name}
          </span>
        </Link>
        {hideCta ? null : (
          <Link
            href={`/${data.barbershop.slug}/agendar`}
            className="inline-flex h-10 shrink-0 items-center rounded-full bg-[var(--tenant-secondary)] px-5 text-sm font-medium text-[var(--tenant-on-secondary)] transition-opacity hover:opacity-85 active:scale-[.98]"
          >
            Agendar
          </Link>
        )}
      </div>
    </header>
  );
}
