import { redirect } from "next/navigation";

/**
 * Rota preservada por compatibilidade (Fase 3 — item 3.1).
 *
 * O §7.5 pede o Financeiro em seis seções internas, e não quatro rotas
 * soltas no menu. Links antigos, favoritos do dono e atalhos gravados no
 * celular continuam funcionando: caem na seção correspondente.
 */
export default function Page() {
  redirect("/financeiro?secao=a-receber");
}
