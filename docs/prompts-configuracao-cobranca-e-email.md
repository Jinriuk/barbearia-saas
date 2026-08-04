# Prompts de configuração — cobrança (Hotmart) e e-mail transacional

Dois prompts prontos para colar num agente que tenha acesso ao navegador e às
contas. Cada um termina pedindo ao agente um **relatório de volta** com
exatamente os valores que o sistema precisa.

**Regra que vale para os dois:** nenhum segredo deve ser colado no chat. Todo
token vai direto do painel do provedor para o painel de destino (Vercel ou
Supabase). O agente só confirma *que* configurou, e devolve os valores
públicos (ids, URLs, nomes de oferta).

---

## Prompt 1 — Cobrança na Hotmart

```
Você vai configurar a cobrança de um SaaS de gestão para barbearias e salões
chamado NexoBarber (a mesma plataforma se apresenta como NexoBeleza na vertical
de salão). A plataforma de pagamento escolhida é a HOTMART.

CONTEXTO DO PRODUTO
- É um SaaS por assinatura, com teste grátis de 7 dias antes da primeira
  cobrança.
- São dois planos, cada um com duas periodicidades:
    Padrão  — R$ 59,90/mês  ou  R$ 499,00/ano
    Plus    — R$ 119,90/mês ou  R$ 999,00/ano
  O anual é a oferta principal (equivale a R$ 41,58/mês no Padrão).
- O sistema roda em https://barbearia-saas-sigma.vercel.app
- O sistema já tem: tabela de checkouts, webhook idempotente e a máquina de
  estados da assinatura (ativa / pagamento pendente / suspensa / cancelada).
  Falta apenas a ponte com a Hotmart.

O QUE FAZER, EM ORDEM

1. Conta e verificação
   - Confirme se a conta Hotmart já existe. Se não, crie como PRODUTOR.
   - Complete a validação de identidade e os dados bancários de recebimento.
     Sem isso a conta não vende. Reporte o status de cada pendência.

2. Produto
   - Crie UM produto do tipo assinatura/recorrência. Nome sugerido:
     "NexoBarber — sistema de gestão para barbearias".
   - Categoria/formato: software ou serviço por assinatura (use o que a
     Hotmart oferecer hoje para SaaS).
   - Marque que a entrega é feita fora da Hotmart (acesso via nossa própria
     plataforma), e aponte a URL de acesso para
     https://barbearia-saas-sigma.vercel.app/login

3. Ofertas — crie QUATRO, uma por combinação
   - Padrão mensal — R$ 59,90, recorrência mensal
   - Padrão anual  — R$ 499,00, recorrência anual
   - Plus mensal   — R$ 119,90, recorrência mensal
   - Plus anual    — R$ 999,00, recorrência anual
   Em todas: teste grátis de 7 dias antes da primeira cobrança, se a Hotmart
   permitir na oferta; se NÃO permitir, PARE e me diga — isso muda a promessa
   que a nossa landing faz e precisa de decisão antes de seguir.
   Formas de pagamento: cartão de crédito, Pix e boleto, todas que a conta
   permitir.

4. Cupom de recuperação
   - Crie um cupom de código VOLTA20, com 20% de desconto, válido APENAS nas
     duas ofertas ANUAIS, primeira cobrança, validade de 12 meses.
   - Esse código já é usado por um e-mail automático do sistema; o código
     precisa ser exatamente VOLTA20, em maiúsculas.

5. Postback (webhook)
   - Configure o postback/webhook da Hotmart para a URL:
       https://barbearia-saas-sigma.vercel.app/api/webhooks/hotmart
   - Assine TODOS os eventos de compra e assinatura disponíveis, no mínimo:
     compra aprovada, compra completa, compra atrasada, compra cancelada,
     reembolso, chargeback/protesto, cancelamento de assinatura, troca de
     plano e mudança de data de cobrança.
   - Use a versão mais recente da API de postback que o painel oferecer.
   - Copie o token de autenticação do postback (Hottok) e o guarde para o
     passo 7.

6. Credenciais de API
   - Em Ferramentas → Credenciais (ou o caminho equivalente atual), gere as
     credenciais de API: Client ID, Client Secret e Basic.
   - Elas serão usadas pelo servidor para CONSULTAR uma compra no momento em
     que o postback chegar — o sistema nunca acredita no corpo da notificação
     sem conferir na origem.

7. Onde colocar os segredos
   - Vá ao painel da Vercel, projeto "barbearia-saas", em
     Settings → Environment Variables, ambiente Production, e cadastre:
       HOTMART_HOTTOK          = (token do postback, do passo 5)
       HOTMART_CLIENT_ID       = (do passo 6)
       HOTMART_CLIENT_SECRET   = (do passo 6)
       HOTMART_BASIC           = (do passo 6)
   - NÃO cole nenhum desses valores no chat nem em documento compartilhado.

8. Confirme na documentação oficial
   - Os painéis da Hotmart mudam. Antes de reportar, confira na documentação
     atual deles: o nome do cabeçalho que carrega o token do postback, o
     formato do corpo da notificação (a lista de eventos e onde vem o e-mail
     do comprador, o código da oferta e o id da assinatura), e como se
     consulta uma assinatura pela API.

O QUE ME DEVOLVER (relatório, sem segredos)
  a) Status da conta: verificada e apta a vender? Pendências, se houver.
  b) O ID do produto criado.
  c) Para CADA uma das quatro ofertas: o código da oferta e o LINK DE
     CHECKOUT completo.
  d) O teste grátis de 7 dias foi possível na oferta? Sim/não.
  e) A URL exata do postback cadastrado e a LISTA de eventos assinados.
  f) O NOME do cabeçalho HTTP em que a Hotmart envia o token do postback, e
     um EXEMPLO REAL de corpo de notificação de "compra aprovada" com os
     dados sensíveis mascarados. Preciso disso para escrever o handler.
  g) Confirmação de que as quatro variáveis foram cadastradas na Vercel
     (só "cadastrei", sem os valores).
  h) A comissão efetiva que a Hotmart cobra por venda nesta conta, em % e em
     taxa fixa, e o prazo de repasse.
  i) Como a Hotmart identifica QUEM comprou: quais parâmetros posso anexar ao
     link de checkout (src, sck, ou outro) e se eles voltam no postback. Isso
     é o que amarra a compra à barbearia certa no nosso banco.
```

---

## Prompt 2 — E-mail transacional e remetente noreply

```
Você vai configurar o envio de e-mail de um SaaS chamado NexoBarber, que roda
em Next.js na Vercel e usa Supabase como banco e autenticação.

São DOIS envios diferentes, e é importante não confundir:

  (A) E-mails de AUTENTICAÇÃO — "esqueci minha senha", confirmação de e-mail e
      convite de colaborador. Quem envia é o SUPABASE, não o nosso código.
      Hoje saem pelo remetente padrão do Supabase, que tem limite baixo e cai
      em spam. Precisam sair de um noreply@ do nosso domínio.

  (B) E-mails de MARKETING/RÉGUA — a sequência de recuperação de lead (24h e
      72h). Quem envia é o nosso servidor, por API. O código já está pronto e
      desligado; ele liga sozinho quando as variáveis existirem.

PROVEDOR
Use um serviço com plano gratuito permanente que ofereça AS DUAS COISAS: SMTP
(para o item A) e API HTTP (para o item B). Recomendo, nesta ordem:
  1. Brevo (ex-Sendinblue) — 300 e-mails/dia grátis para sempre, SMTP + API.
  2. Resend — 3.000/mês e 100/dia grátis. Nosso código já tem adaptador
     pronto para o Resend, então se escolher este o item B fica trivial.
Se escolher outro, me avise ANTES, porque muda código.

O QUE FAZER, EM ORDEM

1. Crie a conta no provedor escolhido.

2. Verifique o DOMÍNIO (não apenas um e-mail avulso). Isso exige criar
   registros DNS no provedor do domínio:
   - SPF
   - DKIM
   - DMARC (comece em p=none para observar antes de endurecer)
   Sem domínio verificado o e-mail cai em spam ou nem sai.
   Se ainda NÃO existir um domínio próprio comprado, PARE e me diga — sem
   domínio não dá para ter noreply@ de verdade, e isso é decisão de compra.

3. Crie o remetente noreply@SEUDOMINIO com nome de exibição "NexoBarber".

4. Para o item (A) — SMTP no Supabase:
   - Pegue no provedor: servidor SMTP, porta, usuário e senha/chave SMTP.
   - Vá ao painel do Supabase, projeto "barbearia-saas", em
     Authentication → Emails → SMTP Settings (ou o caminho equivalente atual).
   - Ative o SMTP customizado e preencha com os dados do provedor.
   - Remetente: noreply@SEUDOMINIO, nome "NexoBarber".
   - Ajuste os limites de envio da autenticação para algo compatível com o
     plano gratuito contratado.
   - Envie um e-mail de teste e confirme a entrega na CAIXA DE ENTRADA (não
     no spam).

5. Para o item (B) — API na Vercel:
   - Gere uma chave de API no provedor.
   - No painel da Vercel, projeto "barbearia-saas", em
     Settings → Environment Variables, ambiente Production, cadastre:
       RESEND_API_KEY = (a chave da API)
       EMAIL_FROM     = NexoBarber <noreply@SEUDOMINIO>
     Mantenha o nome RESEND_API_KEY mesmo que o provedor seja outro; é o nome
     que o código lê. Se você escolheu um provedor que não é o Resend, me
     avise, porque aí o adaptador precisa ser trocado no código.

6. NÃO cole nenhuma senha, chave ou token no chat.

7. Teste de ponta a ponta do item (A):
   - Abra https://barbearia-saas-sigma.vercel.app/recuperar-senha
   - Peça a recuperação para um e-mail seu.
   - Confirme: chegou? De qual remetente? Foi para a caixa de entrada ou para
     o spam? O link do e-mail abre a tela de nova senha e funciona?

O QUE ME DEVOLVER (relatório, sem segredos)
  a) Qual provedor você escolheu e por quê.
  b) O domínio verificado, e o resultado da checagem de SPF, DKIM e DMARC
     (verde/pendente para cada um).
  c) O limite gratuito real: quantos e-mails por dia e por mês.
  d) Confirmação de que o SMTP do Supabase está ativo (só "ativei", sem os
     valores) e o resultado do e-mail de teste.
  e) Confirmação de que RESEND_API_KEY e EMAIL_FROM foram cadastradas na
     Vercel, e o valor EXATO de EMAIL_FROM (esse não é segredo).
  f) O resultado do teste do "esqueci minha senha": chegou, de quem, caixa de
     entrada ou spam, e se o link funcionou.
  g) Se o provedor exige alguma ação extra para sair do modo sandbox/teste.
```

---

## Depois que os dois voltarem

O que eu preciso fazer no código, com o relatório em mãos:

1. **Handler da Hotmart** (`/api/webhooks/hotmart`) — hoje a rota **não
   existe**; existe a do Mercado Pago. Preciso do nome do cabeçalho do token,
   de um exemplo real de postback e de como amarrar a compra à barbearia
   (item `i` do prompt 1) para escrever o handler certo.
2. **Tela de assinatura** — trocar a criação de assinatura por API pelo envio
   ao link de checkout da Hotmart, um por plano/periodicidade (item `c`).
3. **Cupom** — o campo de cupom que existe hoje na tela precisa sair ou virar
   um repasse para o cupom da Hotmart, porque o desconto passa a ser aplicado
   lá, não aqui.
4. **Mercado Pago** — decidir se o adaptador fica no código (desligado, como
   está) ou sai. Manter os dois só faz sentido se houver intenção real de
   vender fora da Hotmart algum dia.
