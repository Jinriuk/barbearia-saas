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

export type ScreenTone = "dark" | "light";

/**
 * A landing de barbearia é escura e a de salão é clara. As telas precisam das
 * duas paletas: reusar a versão escura no fundo claro do salão recriaria
 * exatamente o defeito que o §5.9 apontou no formulário de captura.
 */
function frameClass(tone: ScreenTone) {
  return tone === "light"
    ? "overflow-hidden rounded-2xl border border-[#33202b]/[.09] bg-white shadow-2xl shadow-[#33202b]/10"
    : "overflow-hidden rounded-2xl border border-white/10 bg-[#12110e] shadow-2xl shadow-black/40";
}

const ink = {
  dark: {
    chrome: "border-white/[.07] bg-white/[.03]",
    dot: "bg-white/15",
    muted: "text-stone-500",
    strong: "text-stone-200",
    divide: "divide-white/[.06]",
    rule: "border-white/[.08]",
    chipOn: "bg-amber-500 text-stone-950",
    chipOff: "bg-white/[.06] text-stone-400",
    accent: "text-amber-400",
    slotBusy: "bg-amber-500/15 text-amber-200",
    slotLunch: "bg-white/[.04] text-stone-500",
    slotFree: "border border-dashed border-white/10",
    hour: "text-stone-600",
    late: "bg-red-500/15 text-red-300",
    soon: "bg-amber-500/15 text-amber-300",
    ok: "bg-emerald-500/15 text-emerald-300",
    good: "text-emerald-400",
    bad: "text-red-300",
    warn: "text-amber-300",
    note: "text-stone-600",
  },
  light: {
    chrome: "border-[#33202b]/[.07] bg-[#33202b]/[.03]",
    dot: "bg-[#33202b]/15",
    muted: "text-[#33202b]/55",
    strong: "text-[#33202b]",
    divide: "divide-[#33202b]/[.07]",
    rule: "border-[#33202b]/10",
    chipOn: "bg-[#c2497c] text-white",
    chipOff: "bg-[#33202b]/[.06] text-[#33202b]/65",
    accent: "text-[#c2497c]",
    slotBusy: "bg-[#c2497c]/12 text-[#8e2f5a]",
    slotLunch: "bg-[#33202b]/[.05] text-[#33202b]/50",
    slotFree: "border border-dashed border-[#33202b]/15",
    hour: "text-[#33202b]/45",
    late: "bg-red-600/12 text-red-700",
    soon: "bg-amber-600/12 text-amber-800",
    ok: "bg-emerald-600/12 text-emerald-800",
    good: "text-emerald-700",
    bad: "text-red-700",
    warn: "text-amber-700",
    note: "text-[#33202b]/45",
  },
} as const;

function Chrome({ title, tone }: { title: string; tone: ScreenTone }) {
  const c = ink[tone];
  return (
    <div className={`flex items-center gap-2 border-b px-4 py-2.5 ${c.chrome}`}>
      <span className={`size-2.5 rounded-full ${c.dot}`} />
      <span className={`size-2.5 rounded-full ${c.dot}`} />
      <span className={`size-2.5 rounded-full ${c.dot}`} />
      <span className={`ml-2 text-xs ${c.muted}`}>{title}</span>
    </div>
  );
}

/** G2 — quem sumiu. É a tela que o sócio quer vender. */
export function ClientsScreen({
  tone = "dark",
  names = ["Marcos A.", "Rodrigo P.", "Tiago M.", "Wesley C."],
}: {
  tone?: ScreenTone;
  /** A landing de salão fala com outra clientela; os nomes acompanham. */
  names?: string[];
}) {
  const c = ink[tone];
  const clients = [
    { last: "há 58 dias", every: "a cada 21 dias", state: "late" },
    { last: "há 46 dias", every: "a cada 30 dias", state: "late" },
    { last: "há 12 dias", every: "a cada 14 dias", state: "soon" },
    { last: "há 4 dias", every: "a cada 15 dias", state: "ok" },
  ].map((client, index) => ({ ...client, name: names[index] ?? "—" }));

  return (
    <div className={frameClass(tone)}>
      <Chrome title="Clientes · Precisam voltar" tone={tone} />
      <div className="p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-2">
          {["Todos", "Sumiram", "Assinantes", "Em atraso"].map(
            (segment, index) => (
              <span
                key={segment}
                className={`rounded-full px-3 py-1 text-xs font-medium ${
                  index === 1 ? c.chipOn : c.chipOff
                }`}
              >
                {segment}
              </span>
            ),
          )}
        </div>
        <ul className={`mt-4 divide-y ${c.divide}`}>
          {clients.map((client) => (
            <li
              key={client.name}
              className="flex items-center justify-between gap-3 py-3"
            >
              <div className="min-w-0">
                <p className={`truncate text-sm font-medium ${c.strong}`}>
                  {client.name}
                </p>
                <p className={`text-xs ${c.muted}`}>
                  Última visita {client.last} · vinha {client.every}
                </p>
              </div>
              <span
                className={`shrink-0 rounded-full px-2.5 py-1 text-[0.6875rem] font-semibold ${
                  client.state === "late"
                    ? c.late
                    : client.state === "soon"
                      ? c.soon
                      : c.ok
                }`}
              >
                {client.state === "late"
                  ? "Atrasado"
                  : client.state === "soon"
                    ? "Perto de voltar"
                    : "Em dia"}
              </span>
            </li>
          ))}
        </ul>
        <p className={`mt-4 flex items-center gap-2 text-xs ${c.muted}`}>
          <PhoneCall className={`size-3.5 ${c.accent}`} />
          Um toque abre o WhatsApp com a mensagem pronta.
        </p>
      </div>
    </div>
  );
}

/** G3 — faturamento é o que entra, lucro é o que fica. */
export function FinanceScreen({ tone = "dark" }: { tone?: ScreenTone }) {
  const c = ink[tone];
  const rows = [
    { label: "Vendido no mês", value: "R$ 14.280", tone: c.strong },
    { label: "Recebido", value: "R$ 12.940", tone: c.good },
    { label: "A receber", value: "R$ 1.340", tone: c.warn },
    { label: "Despesas", value: "− R$ 3.120", tone: c.bad },
    { label: "Comissões", value: "− R$ 4.860", tone: c.bad },
  ];
  return (
    <div className={frameClass(tone)}>
      <Chrome title="Financeiro · Resumo do mês" tone={tone} />
      <div className="p-4 sm:p-5">
        <dl className="space-y-2.5">
          {rows.map((row) => (
            <div
              key={row.label}
              className="flex items-baseline justify-between"
            >
              <dt className={`text-sm ${c.muted}`}>{row.label}</dt>
              <dd className={`font-mono text-sm ${row.tone}`}>{row.value}</dd>
            </div>
          ))}
        </dl>
        <div
          className={`mt-4 flex items-baseline justify-between border-t pt-4 ${c.rule}`}
        >
          <span className={`text-sm font-medium ${c.strong}`}>
            Lucro do mês
          </span>
          <span className={`font-mono text-2xl font-semibold ${c.good}`}>
            R$ 4.960
          </span>
        </div>
        <p className={`mt-3 flex items-center gap-2 text-xs ${c.muted}`}>
          <TrendingUp className={`size-3.5 ${c.good}`} />O lucro já desconta
          comissão — e não conta o que ainda não entrou.
        </p>
      </div>
    </div>
  );
}

/** G1 — a agenda em grade, horário na lateral e profissional em coluna. */
export function AgendaScreen({
  tone = "dark",
  columns = ["Você", "Bruno", "Caio"],
  grid = [
    ["09:00", ["Corte · Lucas", null, "Barba · Igor"]],
    ["10:00", [null, "Corte+barba · Paulo", null]],
    ["11:00", ["Corte · André", "Almoço", null]],
    ["12:00", ["Almoço", "Almoço", "Corte · Davi"]],
  ],
}: {
  tone?: ScreenTone;
  columns?: string[];
  grid?: Array<[string, Array<string | null>]>;
}) {
  const c = ink[tone];
  return (
    <div className={frameClass(tone)}>
      <Chrome title="Agenda · Hoje" tone={tone} />
      <div className="p-4 sm:p-5">
        <div className="grid grid-cols-[3rem_repeat(3,minmax(0,1fr))] gap-1.5 text-xs">
          <span />
          {columns.map((name) => (
            <span
              key={name}
              className={`truncate pb-1 text-center font-medium ${c.muted}`}
            >
              {name}
            </span>
          ))}
          {grid.map(([hour, slots]) => (
            <Row key={hour} hour={hour} slots={slots} tone={tone} />
          ))}
        </div>
        <p className={`mt-4 flex items-center gap-2 text-xs ${c.muted}`}>
          <CalendarCheck className={`size-3.5 ${c.accent}`} />
          Clicar num espaço vazio já abre o cadastro com dia, hora e
          profissional preenchidos.
        </p>
      </div>
    </div>
  );
}

function Row({
  hour,
  slots,
  tone,
}: {
  hour: string;
  slots: Array<string | null>;
  tone: ScreenTone;
}) {
  const c = ink[tone];
  return (
    <>
      <span
        className={`pt-1.5 text-right font-mono text-[0.6875rem] ${c.hour}`}
      >
        {hour}
      </span>
      {slots.map((slot, index) => (
        <span
          key={`${hour}-${index}`}
          className={`min-h-9 truncate rounded-lg px-2 py-1.5 ${
            slot === null
              ? c.slotFree
              : slot === "Almoço"
                ? c.slotLunch
                : c.slotBusy
          }`}
        >
          {slot ?? ""}
        </span>
      ))}
    </>
  );
}

/** Rótulo obrigatório: número em tela de venda precisa dizer que é exemplo. */
export function DemoDataNote({
  className = "",
  tone = "dark",
}: {
  className?: string;
  tone?: ScreenTone;
}) {
  return (
    <p
      className={`text-[0.6875rem] tracking-wide uppercase ${ink[tone].note} ${className}`}
    >
      Telas do sistema com dados de demonstração
    </p>
  );
}
