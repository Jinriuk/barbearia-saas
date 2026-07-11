import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Política de Privacidade",
  description:
    "Como a plataforma NexoBarber/NexoBeleza coleta, usa e protege os seus dados pessoais.",
};

const LAST_UPDATE = "10 de julho de 2026";

export default function PrivacyPage() {
  return (
    <article>
      <h1>Política de Privacidade</h1>
      <p className="lead">Última atualização: {LAST_UPDATE}</p>

      <p>
        Esta política explica como a plataforma <strong>NexoBarber</strong> /{" "}
        <strong>NexoBeleza</strong> (&quot;Plataforma&quot;, &quot;nós&quot;)
        trata dados pessoais, em conformidade com a Lei Geral de Proteção de
        Dados (Lei nº 13.709/2018 — LGPD). Ela vale para o site, para o painel
        dos estabelecimentos assinantes e para as páginas públicas de
        agendamento.
      </p>

      <h2>1. Quem somos em cada tratamento</h2>
      <ul>
        <li>
          <strong>Dados de quem assina a Plataforma</strong> (donos e equipe de
          barbearias e salões): atuamos como <strong>controladores</strong>.
        </li>
        <li>
          <strong>Dados de clientes finais</strong> informados num agendamento
          (nome, WhatsApp e e-mail): o <strong>estabelecimento</strong> que
          você escolheu é o controlador desses dados; a Plataforma atua como{" "}
          <strong>operadora</strong>, tratando-os apenas para viabilizar o
          agendamento, os lembretes e o histórico daquele estabelecimento.
        </li>
      </ul>

      <h2>2. Quais dados coletamos</h2>
      <ul>
        <li>
          <strong>Conta do estabelecimento:</strong> nome, e-mail, senha
          (armazenada de forma criptografada) e dados do negócio (nome,
          endereço, contatos, serviços, preços).
        </li>
        <li>
          <strong>Agendamento público:</strong> nome, número de WhatsApp,
          e-mail (opcional) e observações que o cliente final informar.
        </li>
        <li>
          <strong>Uso do site:</strong> métricas de navegação agregadas
          (Vercel Analytics, sem cookies de identificação) e, somente com o
          seu consentimento, eventos do Meta Pixel para medição de anúncios.
        </li>
      </ul>

      <h2>3. Para que usamos</h2>
      <ul>
        <li>Criar e manter a conta e a página pública do estabelecimento;</li>
        <li>
          Registrar agendamentos, enviar confirmações e lembretes de horário
          (inclusive por WhatsApp);
        </li>
        <li>Processar a assinatura e emitir cobranças;</li>
        <li>Cumprir obrigações legais e prevenir fraudes;</li>
        <li>
          Medir campanhas de marketing — apenas se você aceitar os cookies de
          medição.
        </li>
      </ul>

      <h2>4. Bases legais</h2>
      <p>
        Tratamos dados com fundamento na <strong>execução de contrato</strong>{" "}
        (conta e agendamentos), no <strong>legítimo interesse</strong>{" "}
        (segurança e melhoria do serviço), no{" "}
        <strong>cumprimento de obrigação legal</strong> (registros fiscais) e
        no <strong>consentimento</strong> (cookies de medição/Meta Pixel).
      </p>

      <h2>5. Com quem compartilhamos</h2>
      <p>
        Usamos fornecedores de infraestrutura que tratam dados em nosso nome e
        sob contrato: <strong>Supabase</strong> (banco de dados e
        autenticação), <strong>Vercel</strong> (hospedagem e métricas),{" "}
        <strong>Meta</strong> (WhatsApp Business e, com consentimento, Pixel) e
        o provedor de pagamento da assinatura. Não vendemos dados pessoais.
      </p>

      <h2>6. Por quanto tempo guardamos</h2>
      <p>
        Mantemos os dados enquanto a conta estiver ativa ou enquanto forem
        necessários às finalidades acima. Registros financeiros podem ser
        retidos pelo prazo legal. Dados de clientes finais podem ser excluídos
        ou anonimizados a pedido, diretamente pelo estabelecimento no painel.
      </p>

      <h2>7. Seus direitos</h2>
      <p>
        Você pode solicitar confirmação de tratamento, acesso, correção,
        portabilidade, anonimização ou exclusão dos seus dados, além de
        revogar consentimentos. Clientes finais podem exercer esses direitos
        diretamente com o estabelecimento ou através do nosso contato abaixo —
        encaminharemos ao controlador responsável.
      </p>

      <h2>8. Segurança</h2>
      <p>
        Os dados são isolados por estabelecimento no banco de dados (políticas
        de acesso por linha), trafegam criptografados (HTTPS) e o acesso
        interno é restrito. Nenhum sistema é infalível; incidentes relevantes
        serão comunicados conforme a LGPD.
      </p>

      <h2>9. Cookies</h2>
      <p>
        Usamos cookies essenciais de sessão (login) que não dependem de
        consentimento. Cookies de medição de anúncios (Meta Pixel) só são
        ativados se você aceitar no aviso exibido no site, e a escolha pode
        ser refeita limpando os dados do navegador.
      </p>

      <h2>10. Contato</h2>
      <p>
        Para exercer direitos ou tirar dúvidas sobre esta política, fale com o
        encarregado de dados pelo e-mail{" "}
        <a href="mailto:privacidade@nexobarber.app">
          privacidade@nexobarber.app
        </a>
        . Podemos atualizar esta política; mudanças relevantes serão avisadas
        nesta página.
      </p>
    </article>
  );
}
