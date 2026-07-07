import { AtSign, MapPin, MessageCircle } from "lucide-react";
import { instagramHandle, whatsAppHref } from "@/lib/contact";
import type { PublicBarbershop } from "@/types/domain";

export function PublicFooter({ data }: { data: PublicBarbershop }) {
  const whatsapp = whatsAppHref(data.settings.whatsappNumber);
  const instagram = instagramHandle(data.settings.instagramUrl);

  return (
    <footer className="border-t border-black/[.06] px-5 py-12">
      <div className="mx-auto max-w-6xl">
        <p className="text-lg font-semibold tracking-tight">
          {data.barbershop.name}
        </p>
        <div className="mt-4 flex flex-col gap-3 text-sm opacity-70">
          {data.settings.address ? (
            <span className="flex items-center gap-2.5">
              <MapPin className="size-4 shrink-0" />
              {data.settings.address}
            </span>
          ) : null}
          {whatsapp ? (
            <a
              href={whatsapp}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2.5 underline-offset-4 hover:underline"
            >
              <MessageCircle className="size-4 shrink-0" />
              {data.settings.whatsappNumber}
            </a>
          ) : null}
          {data.settings.instagramUrl ? (
            <a
              href={data.settings.instagramUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2.5 underline-offset-4 hover:underline"
            >
              <AtSign className="size-4 shrink-0" />
              {instagram ?? "Instagram"}
            </a>
          ) : null}
        </div>
        <p className="mt-10 text-xs opacity-45">
          © {new Date().getFullYear()} {data.barbershop.name} · Reserva online
        </p>
      </div>
    </footer>
  );
}
