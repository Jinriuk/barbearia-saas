import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { unsubscribeLead } from "@/modules/platform/lead-optout";

export const metadata: Metadata = {
  title: "Não quero mais receber contato",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * Saída da lista de contato (Fase 0 §0.4).
 *
 * A landing pedia autorização de contato e não oferecia caminho nenhum de
 * volta — a LGPD (art. 18) exige que a oposição ao tratamento seja tão fácil
 * quanto o consentimento foi. O link com o token vai no rodapé de cada
 * disparo da régua da Fase 5.
 *
 * A baixa acontece no POST, nunca no GET: pré-carregamento de link e
 * antivírus de e-mail abrem a URL sozinhos, e um GET que escreve
 * descadastraria gente que só recebeu a mensagem.
 */
export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ t?: string; ok?: string }>;
}) {
  const params = await searchParams;
  const token = (params.t ?? "").trim();
  const done = params.ok === "1";

  async function confirm(formData: FormData) {
    "use server";
    await unsubscribeLead(formData);
    redirect("/descadastro?ok=1");
  }

  if (done) {
    return (
      <>
        <h1>Pronto, você saiu da lista</h1>
        <p>
          Não vamos mais entrar em contato sobre o produto. Se isso foi engano,
          basta preencher o formulário na página inicial de novo.
        </p>
      </>
    );
  }

  if (!token) {
    return (
      <>
        <h1>Link incompleto</h1>
        <p>
          Este endereço precisa do código que vem no rodapé da mensagem que
          você recebeu. Abra o link direto da mensagem, ou responda pedindo
          para sair da lista — a baixa é registrada do mesmo jeito.
        </p>
      </>
    );
  }

  return (
    <>
      <h1>Não quero mais receber contato</h1>
      <p>
        Ao confirmar, apagamos você da nossa lista de contato comercial. Isso
        não afeta nenhuma conta que você tenha na plataforma.
      </p>
      <form action={confirm}>
        <input type="hidden" name="token" value={token} />
        <button
          type="submit"
          className="mt-2 inline-flex h-11 items-center justify-center rounded-full bg-stone-900 px-6 text-sm font-semibold text-stone-50 transition-colors hover:bg-stone-700"
        >
          Confirmar descadastro
        </button>
      </form>
    </>
  );
}
