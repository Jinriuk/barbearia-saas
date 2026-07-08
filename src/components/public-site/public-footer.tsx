import Link from "next/link";
import { AtSign, MapPin, MessageCircle, Scissors } from "lucide-react";
import { instagramHandle, whatsAppHref } from "@/lib/contact";
import type { PublicBarbershop } from "@/types/domain";

export function PublicFooter({ data }: { data: PublicBarbershop }) {
  const whatsapp = whatsAppHref(data.settings.whatsappNumber);
  const instagram = instagramHandle(data.settings.instagramUrl);

  return (
    <footer className="border-t border-current/[.08] px-5 py-12">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col justify-between gap-8 sm:flex-row sm:items-start">
          <div>
            <p className="text-xl font-semibold tracking-tight">
              {data.barbershop.name}
            </p>
            <div className="mt-4 flex flex-col gap-3 text-sm opacity-70">
              {data.settings.address ? (
                <span className="flex items-center gap-2.5">
                  <MapPin className="size-4 shrink-0 text-[var(--tenant-primary)]" />
                  {data.settings.address}
                </span>
              ) : null}
              {whatsapp ? (
                <a
                  href={whatsapp}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2.5 underline-offset-4 transition-opacity hover:underline hover:opacity-100"
                >
                  <MessageCircle className="size-4 shrink-0 text-[var(--tenant-primary)]" />
                  {data.settings.whatsappNumber}
                </a>
              ) : null}
              {data.settings.instagramUrl ? (
                <a
                  href={data.settings.instagramUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2.5 underline-offset-4 transition-opacity hover:underline hover:opacity-100"
                >
                  <AtSign className="size-4 shrink-0 text-[var(--tenant-primary)]" />
                  {instagram ?? "Instagram"}
                </a>
              ) : null}
            </div>
          </div>
          <Link
            href={`/${data.barbershop.slug}/agendar`}
            className="inline-flex h-11 shrink-0 items-center justify-center gap-2 self-start rounded-full border border-current/15 px-6 text-sm font-medium transition-all hover:-translate-y-0.5 hover:bg-current/[.05]"
          >
            Agendar horário
          </Link>
        </div>
        <div className="mt-10 flex flex-col gap-2 border-t border-current/[.08] pt-6 text-xs opacity-50 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} {data.barbershop.name} · Reserva
            online
          </p>
          <Link
            href="/"
            className="flex items-center gap-1.5 transition-opacity hover:opacity-100"
          >
            <Scissors className="size-3" />
            Feito com NexoBarber
          </Link>
        </div>
      </div>
    </footer>
  );
}
