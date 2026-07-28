import Image from "next/image";
import { ShoppingBag } from "lucide-react";
import { isSoldOut } from "@/lib/booking";

const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

/**
 * Cartão de produto da vitrine (§7.10).
 *
 * Duas regras do guia que faltavam antes da Fase 4: produto sem foto usa
 * miniatura pequena e padronizada (era uma área 4/3 vazia com um ícone
 * perdido no meio) e produto sem saldo aparece como "Indisponível" em vez
 * de deixar o cliente reservar o que não existe.
 *
 * `stock` nulo = produto sem controle de estoque; aí não há o que avisar.
 */
export function ProductCard({
  name,
  price,
  imageUrl,
  stock,
}: {
  name: string;
  price: number;
  imageUrl: string | null;
  stock: number | null;
}) {
  const soldOut = isSoldOut(stock);
  return (
    <div
      className={`flex h-full items-center gap-4 rounded-2xl border border-current/10 bg-current/[.03] p-4 ${
        soldOut ? "opacity-60" : ""
      }`}
    >
      {imageUrl ? (
        <span className="relative size-16 shrink-0 overflow-hidden rounded-xl bg-current/[.05]">
          <Image
            src={imageUrl}
            alt={name}
            fill
            sizes="64px"
            className="object-cover"
          />
        </span>
      ) : (
        <span className="grid size-16 shrink-0 place-items-center rounded-xl bg-current/[.05]">
          <ShoppingBag className="size-6 opacity-40" />
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{name}</p>
        <p className="mt-1 font-mono text-sm font-semibold text-[var(--tenant-primary)]">
          {currency.format(Number(price))}
        </p>
        <p className="mt-1 text-xs opacity-55">
          {soldOut ? "Indisponível" : "Adicione ao reservar seu horário."}
        </p>
      </div>
    </div>
  );
}
