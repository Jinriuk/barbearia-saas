import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Termos de Uso",
  description:
    "Condições de uso da plataforma NexoBarber/NexoBeleza para estabelecimentos e clientes finais.",
};

const LAST_UPDATE = "10 de julho de 2026";

export default function TermsPage() {
  return (
    <article>
      <h1>Termos de Uso</h1>
      <p className="lead">Última atualização: {LAST_UPDATE}</p>

      <p>
        Estes termos regulam o uso da plataforma <strong>NexoBarber</strong> /{" "}
        <strong>NexoBeleza</strong> (&quot;Plataforma&quot;) por
        estabelecimentos assinantes (barbearias e salões de beleza) e por
        clientes finais que agendam horários nas páginas públicas. Ao criar
        uma conta ou agendar um horário, você concorda com eles.
      </p>

      <h2>1. O serviço</h2>
      <p>
        A Plataforma oferece agenda online, página pública de agendamento,
        gestão de clientes, equipe, estoque e financeiro para
        estabelecimentos. A Plataforma é uma ferramenta de gestão: os
        serviços de beleza e barbearia são prestados exclusivamente pelo
        estabelecimento, único responsável por preços, horários, execução e
        atendimento.
      </p>

      <h2>2. Conta e responsabilidade</h2>
      <ul>
        <li>
          Você deve fornecer informações verdadeiras e manter a senha em
          sigilo; atividades na sua conta são de sua responsabilidade.
        </li>
        <li>
          O estabelecimento é responsável pelos dados de clientes finais que
          insere ou coleta pela Plataforma, atuando como controlador desses
          dados nos termos da LGPD.
        </li>
        <li>
          É proibido usar a Plataforma para atividades ilícitas, envio de spam
          ou violação de direitos de terceiros.
        </li>
      </ul>

      <h2>3. Assinatura, teste grátis e cobrança</h2>
      <ul>
        <li>
          Novas contas têm período de teste gratuito de 7 dias, sem
          necessidade de cartão.
        </li>
        <li>
          Após o teste, o uso do painel depende de assinatura ativa no plano
          escolhido. Sem pagamento, o painel é bloqueado em até 5 dias e a
          página pública pode ser desativada após 15 dias do vencimento.
        </li>
        <li>
          Valores, planos e formas de pagamento são os exibidos na página de
          assinatura e podem ser reajustados com aviso prévio.
        </li>
        <li>
          Você pode cancelar a qualquer momento; o acesso permanece até o fim
          do período já pago. Não há reembolso proporcional, salvo previsão
          legal.
        </li>
      </ul>

      <h2>4. Agendamentos de clientes finais</h2>
      <p>
        O agendamento público registra uma solicitação de horário para o
        estabelecimento, que pode confirmá-la, remarcá-la ou cancelá-la.
        Lembretes por WhatsApp dependem de número válido informado pelo
        cliente. A Plataforma não garante comparecimento nem se responsabiliza
        por cancelamentos feitos pelo estabelecimento.
      </p>

      <h2>5. Conteúdo do estabelecimento</h2>
      <p>
        Fotos, marcas, textos e preços publicados na página do
        estabelecimento são de responsabilidade dele, que declara ter os
        direitos de uso. Podemos remover conteúdo que viole a lei ou estes
        termos.
      </p>

      <h2>6. Disponibilidade e suporte</h2>
      <p>
        Empregamos esforços razoáveis para manter o serviço disponível, mas
        ele pode sofrer interrupções por manutenção, falhas de terceiros ou
        força maior. Recursos podem ser adicionados, alterados ou
        descontinuados; mudanças que reduzam funções essenciais serão
        comunicadas com antecedência.
      </p>

      <h2>7. Limitação de responsabilidade</h2>
      <p>
        Na extensão permitida pela lei, a responsabilidade total da Plataforma
        por danos relacionados ao serviço fica limitada ao valor pago pelo
        estabelecimento nos 12 meses anteriores ao evento. Não respondemos por
        lucros cessantes nem por danos causados pela relação entre
        estabelecimento e cliente final.
      </p>

      <h2>8. Privacidade</h2>
      <p>
        O tratamento de dados pessoais é descrito na nossa{" "}
        <Link href="/privacidade">Política de Privacidade</Link>, que integra
        estes termos.
      </p>

      <h2>9. Encerramento</h2>
      <p>
        Podemos suspender ou encerrar contas que violem estes termos ou a lei.
        Você pode encerrar sua conta a qualquer momento; dados serão excluídos
        ou anonimizados conforme a Política de Privacidade e os prazos legais
        de retenção.
      </p>

      <h2>10. Disposições gerais</h2>
      <p>
        Estes termos são regidos pelas leis brasileiras. Fica eleito o foro do
        domicílio do consumidor, quando aplicável. Dúvidas:{" "}
        <a href="mailto:suporte@nexobarber.app">suporte@nexobarber.app</a>.
      </p>
    </article>
  );
}
