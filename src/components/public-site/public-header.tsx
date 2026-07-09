import Link from "next/link";
import Image from "next/image";
import { Flower2, Scissors } from "lucide-react";
import { normalizeVertical } from "@/lib/verticals";
import type { PublicBarbershop } from "@/types/domain";

export function PublicHeader({
  data,
  hideCta = false,
}: {
  data: PublicBarbershop;
  hideCta?: boolean;
}) {
  const BrandIcon =
    normalizeVertical(data.barbershop.vertical) === "salon"
      ? Flower2
      : Scissors;
  return (
    <header className="sticky top-0 z-40 border-b border-current/[.08] bg-[var(--tenant-bg)]/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-5">
        <Link
          href={`/${data.barbershop.slug}`}
          className="flex min-w-0 items-center gap-2.5"
        >
          <span className="grid size-9 shrink-0 place-items-center overflow-hidden rounded-full bg-[var(--tenant-secondary)] text-[var(--tenant-on-secondary)] shadow-md shadow-black/10">
            {data.barbershop.logoUrl ? (
              <Image
                src={data.barbershop.logoUrl}
                alt=""
                width={36}
                height={36}
                className="size-full object-cover"
              />
            ) : (
              <BrandIcon className="size-4" />
            )}
          </span>
          <span className="truncate text-[15px] font-semibold tracking-tight">
            {data.barbershop.name}
          </span>
        </Link>
        <nav className="hidden items-center gap-6 text-sm opacity-70 md:flex">
          <Link
            href={`/${data.barbershop.slug}#servicos`}
            className="transition-opacity hover:opacity-100"
          >
            Serviços
          </Link>
          <Link
            href={`/${data.barbershop.slug}#profissionais`}
            className="transition-opacity hover:opacity-100"
          >
            Profissionais
          </Link>
        </nav>
        {hideCta ? null : (
          <Link
            href={`/${data.barbershop.slug}/agendar`}
            className="btn-shine inline-flex h-10 shrink-0 items-center rounded-full bg-[var(--tenant-secondary)] px-5 text-sm font-medium text-[var(--tenant-on-secondary)] shadow-md shadow-black/10 transition-all hover:opacity-90 active:scale-[.98]"
          >
            Agendar
          </Link>
        )}
      </div>
    </header>
  );
}
