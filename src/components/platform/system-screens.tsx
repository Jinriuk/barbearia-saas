import { CalendarCheck, PhoneCall, TrendingUp } from "lucide-react";

/**
 * As telas do sistema na landing (Fase 5 §5.6).
 *
 * A promessa central da página é simplicidade e a página não mostrava uma
 * única tela — o visitante tinha que acreditar. Aqui elas aparecem.
 *
 * Uma decisão que vale registrar: são telas **desenhadas em HTML**, com os
 * mesmos elementos e a mesma hierarquia das telas reais, e não capturas em
 * PNG. Três motivos: uma captura vira mentira no dia em que a tela muda e
 * ninguém troca o arquivo; PNG de painel não responde no celular (é onde
 * metade do tráfego lê); e imagem não tem texto para leitor de tela. Todo
 * número aqui é rotulado como demonstração — a Fase 0 removeu depoimento
 * fictício desta página, e o mesmo princípio vale para cifra na tela.
 */

const frame =
  "overflow-hidden rounded-2xl border border-white/10 bg-[#12110e] shadow-2xl shadow-black/40";

function Chrome({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-2 border-b border-white/[.07] bg-white/[.03] px-4 py-2.5">
      <span className="size-2.5 rounded-full bg-white/15" />
      <span className="size-2.5 rounded-full bg-white/15" />
      <span className="size-2.5 rounded-full bg-white/15" />
      <span className="ml-2 text-xs text-stone-500">{title}</span>
    </div>
  );
}

/** G2 — quem sumiu. É a tela que o sócio quer vender. */
export function ClientsScreen() {
  const clients = [
    {
      name: "Marcos A.",
      last: "há 58 dias",
      every: "a cada 21 dias",
      tone: "late",
    },
    {
      name: "Rodrigo P.",
      last: "há 46 dias",
      every: "a cada 30 dias",
      tone: "late",
    },
    {
      name: "Tiago M.",
      last: "há 12 dias",
      every: "a cada 14 dias",
      tone: "soon",
    },
    {
      name: "Wesley C.",
      last: "há 4 dias",
      every: "a cada 15 dias",
      tone: "ok",
    },
  ];
  return (
    <div className={frame}>
      <Chrome title="Clientes · Precisam voltar" />
      <div className="p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-2">
          {["Todos", "Sumiram", "Assinantes", "Inadimplentes"].map(
            (segment, index) => (
              <span
                key={segment}
                className={`rounded-full px-3 py-1 text-xs font-medium ${
                  index === 1
                    ? "bg-amber-500 text-stone-950"
                    : "bg-white/[.06] text-stone-400"
                }`}
              >
                {segment}
              </span>
            ),
          )}
        </div>
        <ul className="mt-4 divide-y divide-white/[.06]">
          {clients.map((client) => (
            <li
              key={client.name}
              className="flex items-center justify-between gap-3 py-3"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-stone-200">
                  {client.name}
                </p>
                <p className="text-xs text-stone-500">
                  Última visita {client.last} · vinha {client.every}
                </p>
              </div>
              <span
                className={`shrink-0 rounded-full px-2.5 py-1 text-[0.6875rem] font-semibold ${
                  client.tone === "late"
                    ? "bg-red-500/15 text-red-300"
                    : client.tone === "soon"
                      ? "bg-amber-500/15 text-amber-300"
                      : "bg-emerald-500/15 text-emerald-300"
                }`}
              >
                {client.tone === "late"
                  ? "Atrasado"
                  : client.tone === "soon"
                    ? "Perto de voltar"
                    : "Em dia"}
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-4 flex items-center gap-2 text-xs text-stone-500">
          <PhoneCall className="size-3.5 text-amber-400" />
          Um toque abre o WhatsApp com a mensagem pronta.
        </p>
      </div>
    </div>
  );
}

/** G3 — faturamento é o que entra, lucro é o que fica. */
export function FinanceScreen() {
  const rows = [
    { label: "Vendido no mês", value: "R$ 14.280", tone: "text-stone-200" },
    { label: "Recebido", value: "R$ 12.940", tone: "text-emerald-400" },
    { label: "A receber", value: "R$ 1.340", tone: "text-amber-300" },
    { label: "Despesas", value: "− R$ 3.120", tone: "text-red-300" },
    { label: "Comissões", value: "− R$ 4.860", tone: "text-red-300" },
  ];
  return (
    <div className={frame}>
      <Chrome title="Financeiro · Resumo do mês" />
      <div className="p-4 sm:p-5">
        <dl className="space-y-2.5">
          {rows.map((row) => (
            <div
              key={row.label}
              className="flex items-baseline justify-between"
            >
              <dt className="text-sm text-stone-500">{row.label}</dt>
              <dd className={`font-mono text-sm ${row.tone}`}>{row.value}</dd>
            </div>
          ))}
        </dl>
        <div className="mt-4 flex items-baseline justify-between border-t border-white/[.08] pt-4">
          <span className="text-sm font-medium text-stone-300">
            Lucro do mês
          </span>
          <span className="font-mono text-2xl font-semibold text-emerald-400">
            R$ 4.960
          </span>
        </div>
        <p className="mt-3 flex items-center gap-2 text-xs text-stone-500">
          <TrendingUp className="size-3.5 text-emerald-400" />O lucro já
          desconta comissão — e não conta o que ainda não entrou.
        </p>
      </div>
    </div>
  );
}

/** G1 — a agenda em grade, horário na lateral e profissional em coluna. */
export function AgendaScreen() {
  const columns = ["Você", "Bruno", "Caio"];
  const grid: Array<[string, Array<string | null>]> = [
    ["09:00", ["Corte · Lucas", null, "Barba · Igor"]],
    ["10:00", [null, "Corte+barba · Paulo", null]],
    ["11:00", ["Corte · André", "Almoço", null]],
    ["12:00", ["Almoço", "Almoço", "Corte · Davi"]],
  ];
  return (
    <div className={frame}>
      <Chrome title="Agenda · Hoje" />
      <div className="p-4 sm:p-5">
        <div className="grid grid-cols-[3rem_repeat(3,minmax(0,1fr))] gap-1.5 text-xs">
          <span />
          {columns.map((name) => (
            <span
              key={name}
              className="truncate pb-1 text-center font-medium text-stone-400"
            >
              {name}
            </span>
          ))}
          {grid.map(([hour, slots]) => (
            <Fragmented key={hour} hour={hour} slots={slots} />
          ))}
        </div>
        <p className="mt-4 flex items-center gap-2 text-xs text-stone-500">
          <CalendarCheck className="size-3.5 text-amber-400" />
          Clicar num espaço vazio já abre o cadastro com dia, hora e
          profissional preenchidos.
        </p>
      </div>
    </div>
  );
}

function Fragmented({
  hour,
  slots,
}: {
  hour: string;
  slots: Array<string | null>;
}) {
  return (
    <>
      <span className="pt-1.5 text-right font-mono text-[0.6875rem] text-stone-600">
        {hour}
      </span>
      {slots.map((slot, index) => (
        <span
          key={`${hour}-${index}`}
          className={`min-h-9 truncate rounded-lg px-2 py-1.5 ${
            slot === null
              ? "border border-dashed border-white/10"
              : slot === "Almoço"
                ? "bg-white/[.04] text-stone-500"
                : "bg-amber-500/15 text-amber-200"
          }`}
        >
          {slot ?? ""}
        </span>
      ))}
    </>
  );
}

/** Rótulo obrigatório: número em tela de venda precisa dizer que é exemplo. */
export function DemoDataNote({ className = "" }: { className?: string }) {
  return (
    <p
      className={`text-[0.6875rem] tracking-wide text-stone-600 uppercase ${className}`}
    >
      Telas do sistema com dados de demonstração
    </p>
  );
}
