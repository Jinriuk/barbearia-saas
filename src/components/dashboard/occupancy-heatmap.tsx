import { EmptyState } from "@/components/feedback/empty-state";

export type HeatmapCell = {
  /** 0 = domingo … 6 = sábado (mesma convenção do `extract(dow)`). */
  weekday: number;
  hour: number;
  appointments: number;
};

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

/**
 * Mapa de calor de dias × horários (Fase 3 — item 3.12).
 *
 * O §6.2 exige alternativa textual: quem lê em leitor de tela, quem imprime
 * em preto e branco e quem simplesmente quer a resposta ("quando eu devia
 * abrir mais cedo?") recebe a lista de melhores e piores horários abaixo da
 * grade — a cor é o reforço, não a informação.
 */
export function OccupancyHeatmap({
  cells,
  weeks,
}: {
  cells: HeatmapCell[];
  /** Quantas semanas o período cobre — converte contagem em média semanal. */
  weeks: number;
}) {
  const withMovement = cells.filter((cell) => cell.appointments > 0);

  if (!withMovement.length) {
    return (
      <EmptyState
        title="Ainda sem histórico suficiente"
        description="O mapa de calor aparece quando houver atendimentos concluídos ou confirmados no período escolhido."
      />
    );
  }

  const hours = withMovement.map((cell) => cell.hour);
  const firstHour = Math.min(...hours);
  const lastHour = Math.max(...hours);
  const hourRange = Array.from(
    { length: lastHour - firstHour + 1 },
    (_, index) => firstHour + index,
  );

  const byKey = new Map(
    cells.map((cell) => [`${cell.weekday}-${cell.hour}`, cell.appointments]),
  );
  const max = Math.max(...withMovement.map((cell) => cell.appointments));

  // Melhores e piores faixas: agrega por dia+hora e ordena. "Pior" só
  // considera horário que a barbearia realmente abre (tem algum movimento
  // em algum dia), senão a resposta seria sempre "às 3 da manhã".
  const ranked = [...withMovement].sort(
    (a, b) => b.appointments - a.appointments,
  );
  const best = ranked.slice(0, 3);
  const openSlots: HeatmapCell[] = [];
  for (let weekday = 0; weekday < 7; weekday += 1) {
    for (const hour of hourRange) {
      const count = byKey.get(`${weekday}-${hour}`) ?? 0;
      // Um dia inteiro sem nenhum atendimento é dia fechado, não dia fraco.
      const dayTotal = hourRange.reduce(
        (total, item) => total + (byKey.get(`${weekday}-${item}`) ?? 0),
        0,
      );
      if (dayTotal > 0) openSlots.push({ weekday, hour, appointments: count });
    }
  }
  const worst = [...openSlots]
    .sort((a, b) => a.appointments - b.appointments)
    .slice(0, 3);

  const describe = (cell: HeatmapCell) =>
    `${WEEKDAYS[cell.weekday]} às ${String(cell.hour).padStart(2, "0")}h`;
  const perWeek = (count: number) =>
    weeks >= 2 ? `${(count / weeks).toFixed(1)}/semana` : `${count}`;

  return (
    <div className="heatmap">
      <style>{`
        .heatmap { --hot:16 185 129; --grid:221 216 207; }
        .dark .heatmap { --hot:52 211 153; --grid:44 57 72; }
      `}</style>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] border-separate border-spacing-[2px]">
          <caption className="sr-only">
            Atendimentos por dia da semana e horário no período escolhido.
          </caption>
          <thead>
            <tr>
              <th className="text-muted-foreground w-10 text-left text-[11px] font-medium">
                <span className="sr-only">Horário</span>
              </th>
              {WEEKDAYS.map((day) => (
                <th
                  key={day}
                  scope="col"
                  className="text-muted-foreground text-[11px] font-medium"
                >
                  {day}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {hourRange.map((hour) => (
              <tr key={hour}>
                <th
                  scope="row"
                  className="text-muted-foreground pr-1 text-right font-mono text-[11px] font-normal"
                >
                  {String(hour).padStart(2, "0")}h
                </th>
                {WEEKDAYS.map((day, weekday) => {
                  const count = byKey.get(`${weekday}-${hour}`) ?? 0;
                  const intensity = count / max;
                  return (
                    <td
                      key={day}
                      className="h-7 rounded-[4px] text-center align-middle text-[11px] font-medium"
                      style={{
                        background: count
                          ? `rgb(var(--hot) / ${(0.14 + intensity * 0.86).toFixed(2)})`
                          : "rgb(var(--grid) / 0.35)",
                        color:
                          count && intensity > 0.55
                            ? "#04241b"
                            : "var(--muted-foreground, inherit)",
                      }}
                      title={`${day} às ${String(hour).padStart(2, "0")}h — ${count} atendimento${count === 1 ? "" : "s"}`}
                    >
                      {count || ""}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <p className="text-sm font-medium">Melhores horários</p>
          <ul className="text-muted-foreground mt-1.5 space-y-1 text-sm">
            {best.map((cell) => (
              <li key={`best-${cell.weekday}-${cell.hour}`}>
                {describe(cell)} —{" "}
                <span className="text-foreground font-mono">
                  {perWeek(cell.appointments)}
                </span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-sm font-medium">Horários mais vazios</p>
          <ul className="text-muted-foreground mt-1.5 space-y-1 text-sm">
            {worst.map((cell) => (
              <li key={`worst-${cell.weekday}-${cell.hour}`}>
                {describe(cell)} —{" "}
                <span className="text-foreground font-mono">
                  {perWeek(cell.appointments)}
                </span>
              </li>
            ))}
          </ul>
          <p className="text-muted-foreground mt-2 text-xs">
            Boa hora para promoção, encaixe de cliente atrasado ou folga da
            equipe.
          </p>
        </div>
      </div>
    </div>
  );
}
