# Reauditoria do NexoBarber — 1º de agosto de 2026

Verificação item a item das entregas das **Fases 0 a 5** do [plano](14-plano-de-fases.md),
sobre os mesmos requisitos da [auditoria de 28/07](13-auditoria-julho-2026.md) mais os 88
itens que os verificadores da rodada 1 apontaram como não cobertos.

Método idêntico ao da rodada 1: 11 dimensões reavaliadas em paralelo, relatórios de entrega
tratados como alegação e prova só em `arquivo:linha` do código atual (duas validações também
contra o banco vivo). **A camada adversarial rodou completa nas 11 dimensões** e fez 5
correções (a rodada 1 tinha levado 59) — todas já aplicadas nos itens abaixo, marcadas no
texto. Nenhuma dimensão foi julgada NAO_CONFIAVEL.

## Placar geral (pós-verificação)

| Situação | Rodada 1 (380 itens) | Agora (467 itens) |
|---|---:|---:|
| Atendido | 96 (25%) | **289 (61%)** |
| Parcial | 138 (36%) | 138 (29%) |
| Não atendido | 145 (38%) | 33 (7%) |
| Não aplicável | 1 | 7 |

Dos 467 itens: **192 melhoraram**, 185 ficaram iguais, 2 pioraram e 88 são novos nesta rodada.
Saúde da base: `typecheck` e `lint` limpos, **135 testes passando** (eram 54).

## Os cinco achados novos da camada adversarial

Além das 5 correções de status, os refutadores encontraram fachadas e defeitos que os
reauditores não tinham visto. Os que mudam decisão:

1. **Preços v1 fossilizados fora do catálogo** — a migration 0038 criou os preços v2
   (R$ 59,90/119,90), mas `create_barbershop` ainda grava toda assinatura de teste com
   4990/9990 (`202607090019:146-151`), o `changePlan` do super-admin grava `PLANS.priceCents`
   v1 (`src/modules/platform/actions.ts:89` + `src/lib/billing/index.ts:19,41`) e o
   `fallbackCatalog()` (`src/lib/billing/catalog.ts:13-24`) anuncia 49,90/99,90 se a RPC
   falhar. Todo dono novo entra com preço defasado no banco — **corrigir antes de cadastrar
   a credencial do Mercado Pago**, ou a primeira cobrança real sai errada.
2. **Pagamento de comissão não pode ser datado** — `registerEmployeePayment` cai no default
   `paid_at now()` (`payroll/actions.ts:118-125`), e o abatimento do fechamento recorta por
   `paid_at` dentro da janela: pagar hoje a quinzena passada faz o valor abater no período
   errado e permite sugestão de pagamento em dobro. O vale retroativo tem o mesmo defeito na
   despesa (`payroll/actions.ts:191-202`).
3. **A trava de estoque só cobre INSERT** — o trigger da migration 0030 é `BEFORE INSERT`, e a
   política RLS de `inventory_movements` permite UPDATE: editar uma movimentação antiga pode
   negativar o saldo sem passar pela trava.
4. **Convite a e-mail que já tem conta entra na hora** (`modules/team/invites.ts:136-153`), sem
   clicar em link — a prova de posse da caixa de entrada só vale para conta nova.
5. **Visão Semana empilha atendimentos simultâneos** — sem raias nem indicador de "+N"
   (`agenda-board.tsx:336-383`), dois profissionais no mesmo horário se sobrepõem.

Menores, registrados nas seções: o botão "Desfazer" do toast é código morto (nenhum chamador
passa `action`); perfil do cliente engole erro de RPC e vira 404 falso; "Planos vencendo" soma
`due_soon+past_due` mas linka para um segmento que só mostra `past_due`; e-mail de 72h promete
checkout que não renderiza se só a credencial de e-mail estiver configurada; e
`reactivateSubscription` ignora `billing_period` (30 dias para assinante anual).

## Antes × depois por dimensão

| Dimensão | Antes A/P/N | Agora A/P/N | Veredito adversarial |
|---|---|---|---|
| Fundação visual — cores, tipografia, tokens (§3, §4, §11) | 10 / 10 / 9 | **18** / 12 / 4 | confiavel |
| Padrão de componentes (§5) | 12 / 16 / 12 | **21** / 23 / 4 | confiavel com ressalvas |
| Linguagem e navegação (§8, §9) | 8 / 15 / 11 | **19** / 15 / 6 | confiavel |
| Telas Início e Agenda (§7.1, §7.2) | 8 / 9 / 17 | **36** / 5 / 0 | confiavel com ressalvas |
| Telas Clientes e Planos (§7.3, §7.4) + pilar G2 | 5 / 8 / 5 | **22** / 3 / 1 | confiavel com ressalvas |
| Tela Financeiro (§7.5) + pilar G3 | 6 / 14 / 16 | **22** / 16 / 5 | confiavel com ressalvas |
| Serviços, produtos e estoque (§7.6) + pilar G5 | 2 / 10 / 9 | **10** / 14 / 6 | confiavel |
| Equipe, Configurações e Minha conta (§7.7–§7.9) + pilar G4 | 17 / 15 / 22 | **38** / 19 / 4 | confiavel com ressalvas |
| Página pública e fluxo de agendamento (§7.10, §7.11) + pilar G1 | 11 / 16 / 15 | **44** / 3 / 1 | confiavel |
| Mobile, acessibilidade e gráficos (§6, §10, §12) | 11 / 16 / 14 | **31** / 18 / 2 | confiavel com ressalvas |
| Camada comercial — landing, preços e leads | 6 / 9 / 15 | **28** / 10 / 0 | confiavel com ressalvas |

---

## Fundação visual — cores, tipografia, tokens (§3, §4, §11)

A fundação visual foi de fato reescrita: o globals.css agora tem os dois temas do guia — o claro do §3.2 no :root (fundo #F4F6F8, botão #9A5B00, erro #B91C1C, com desvios documentados em comentário) e o escuro do §3.1 sob `.dark, :root[data-theme="dark"]` — e nasceram os tokens que faltavam: --border-control #5B6B7D (consumido por Input/Select/Textarea/Checkbox/Button-outline), --focus-ring azul com ring de 3px/45% exatamente como o §11, os 5 fundos tonais de aviso com variantes reais em Alert/Badge/Toast, --foreground-subtle como terceiro nível de texto, --accent-purple e tokens de gráfico por significado. O alternador de tema é real e completo: ThemeForm em /minha-conta grava cookie de 1 ano via server action, PanelTheme aplica classe+data-theme com script inline anti-flash e opção "Automático" que segue o aparelho; o gráfico mensal foi corrigido para consumir tokens. A migração de cores fixas avançou (115→49 ocorrências de paleta crua no painel), mas componentes NOVOS da Fase 3 (receivables-list, team-invites-card, settings-workspace) reintroduziram paleta Tailwind crua, e o gradiente do PlanBadge segue intocado. A tipografia é o flanco que não andou: tabular-nums continua com 0 ocorrências enquanto o uso de font-mono CRESCEU de 72 para 124 pontos — e essa fonte mono é fachada dupla: a Geist Mono baixa mas nunca é aplicada porque --font-mono aponta nomes literais que não casam com a variável do next/font. Escala tipográfica, ícone 20px, raio de cartão/modal e o piso de 14px continuam como na rodada 1 (o piso até piorou em quantidade: 139 text-xs no painel), embora Input/Textarea agora tenham 16px também no desktop. Dos itens não cobertos na rodada 1, o mais relevante melhorou por tabela: admin e onboarding agora rodam no claro §3.2 via :root, mas as telas de autenticação seguem num preset stone/amber hardcoded fora de qualquer tema.

### Atendido (18)

- **§3.1 — Superfícies do tema escuro: fundo #0B0F14, menu #0E141B, cartão #141B24, superfície elevada #1B2531, divisor #2C3948**
  - Evidência: src/app/globals.css:157 (--background #0b0f14), :199 (--sidebar #0e141b), :159 (--card #141b24), :161/:165/:167/:170 (--popover/--secondary/--muted/--accent #1b2531), :174 (--border #2c3948) — agora sob o seletor duplo `.dark, :root[data-theme="dark"]` (:155-156).
- **§3.1 — Borda de controle #5B6B7D para campos, seletores e controles (contraste previsto de 3,2:1 sobre o cartão)** ⬆
  - Evidência: src/app/globals.css:175 (--border-control: #5b6b7d), :177 (--input: var(--border-control)), :49 (exposto como --color-border-control). Consumido de fato: input.tsx:17, select.tsx:47, textarea.tsx:10, checkbox.tsx:17 e button.tsx:24 (variante outline) usam border-border-control; --border #2c3948 ficou só como divisor.
- **§3.1 — Três níveis de texto: principal #F4F7FA, secundário #B8C2CC, menos importante #8B98A7** ⬆
  - Evidência: src/app/globals.css:158 (--foreground #f4f7fa), :168 (--muted-foreground #b8c2cc — antes era #9fb0c1), :169 (--foreground-subtle #8b98a7, token novo exposto em :47). O terceiro nível é consumido em globals.css:444 (rótulos de tabela responsiva), monthly-revenue-chart.tsx:129 (eixo), theme-form.tsx:82 e alert.tsx:30 — uso ainda raso (4 arquivos), mas a hierarquia existe e bate os valores do guia.
- **§3.1 — Texto sobre o dourado deve ser #16120A** ⬆
  - Evidência: src/app/globals.css:164 (--primary-foreground: #16120a, antes #0b0f14) e :202 (--sidebar-primary-foreground: #16120a). Valor exato do guia.
- **§3.1 — Semânticos do escuro: info #60A5FA, sucesso #34D399, atenção #FBBF24, erro #F87171**
  - Evidência: src/app/globals.css:180-182 (--success #34d399, --warning #fbbf24, --info #60a5fa) e :173 (--destructive #f87171); utilitários em :43-45.
- **§3.1/§11 — Foco do teclado em azul #60A5FA (§11: --focus-ring: 0 0 0 3px rgba(96,165,250,0.45))** ⬆
  - Evidência: src/app/globals.css:178-179 (--focus-ring: #60a5fa no escuro; --ring: var(--focus-ring)) e :114-115 (claro: #2563eb, escurecido com justificativa de contraste). Aplicado como `focus-visible:ring-3 ring-focus-ring/45` (= 3px a 45%, a espec exata do §11) em button.tsx:18, input.tsx:17, select.tsx:47, textarea.tsx:10, checkbox.tsx:17 e badge.tsx:8; theme-form.tsx:60 usa focus-within com o mesmo token.
- **§3 — Fundos tonais para avisos: sucesso #0D2A22, atenção #332608, erro #351517, informação #10253F, neutro #26313D** ⬆
  - Evidência: src/app/globals.css:183-187 traz os 5 valores exatos do guia (--success-bg #0d2a22, --warning-bg #332608, --destructive-bg #351517, --info-bg #10253f, --neutral-bg #26313d), com contraparte clara em :121-125. Consumidos de verdade: alert.tsx:22-30 (variantes destructive/success/warning/info/neutral com cor viva só em ícone/título/borda esquerda, como o guia manda), badge.tsx:29-33, toast.tsx e appointment-status-badge.tsx:57-64; 24 pontos de uso em 6 arquivos.
- **§3.2 — Tema claro opcional com a paleta específica (fundo #F4F6F8, superfície #EEF2F6, borda #CBD5E1, texto #17202A/#475569/#64748B, botão #9A5B00 com texto branco, erro #B91C1C)** ⬆
  - Evidência: src/app/globals.css:92-146 substituiu o preset neutro do shadcn pela paleta do §3.2: :93 fundo #f4f6f8, :95 superfície #eef2f6, :110 borda #cbd5e1 (contradição §3.2×§11 resolvida e registrada no comentário :78-91), :94/:104 textos #17202a/#475569, :99-100 botão #9a5b00 com texto #ffffff, :109 erro #b91c1c. Desvios conscientes e documentados: 'menos importante' #64748B→#606f85 por contraste (o #64748b original virou --border-control claro, :111) e cartões em #EEF2F6 onde a tabela do guia põe #FFFFFF (o branco ficou em popover/campos, :97/:112).
- **§1 + §7.9 + §11 — Tema claro acionado pelo usuário e lembrado pelo sistema (item 'tema claro/escuro' em Minha conta); na primeira visita pode seguir a preferência do aparelho** ⬆
  - Evidência: Cadeia completa e funcional: src/components/dashboard/theme-form.tsx:31-97 (Claro/Escuro/Automático, salva no clique) renderizado em src/app/(dashboard)/minha-conta/page.tsx:43; src/modules/account/theme-actions.ts:26-32 grava cookie nb-theme por 1 ano (httpOnly:false de propósito, comentado); src/app/(dashboard)/layout.tsx:24-30 lê o cookie no servidor; src/components/layout/panel-theme.tsx:30-73 aplica classe+data-theme+color-scheme, com script inline anti-flash que relê o cookie e resolve 'system' por prefers-color-scheme antes da pintura. O padrão continua escuro (src/lib/theme.ts:36) em vez de seguir o aparelho na primeira visita — decisão registrada e permitida pelo guia ('pode', não 'deve').
- **§11 — Seletor de tema :root[data-theme="dark"] / [data-theme="light"]** ⬆
  - Evidência: src/app/globals.css:155-156 declara o bloco escuro sob `.dark, :root[data-theme="dark"]` (as duas estratégias), e panel-theme.tsx:41-42 e :70-71 emitem ambos os marcadores. O gráfico que quebrava foi corrigido: monthly-revenue-chart.tsx:45,100,110,119,129 agora consome só tokens (--chart-received/--chart-billed/--foreground/--foreground-subtle) e não decide cor por data-theme ou prefers-color-scheme.
- **§4.1 — Fonte Inter carregada e aplicada em todo o sistema**
  - Evidência: src/app/layout.tsx:11-14 (Inter via next/font, variable --font-inter) e :46 (variável no <html>); globals.css:10 (--font-sans: var(--font-inter)) e :216-217 (html { @apply font-sans }).
- **§4.1 — Evitar fonte fina em tema escuro**
  - Evidência: `rg 'font-(thin|extralight|light)' -g '*.tsx' src` = 0 ocorrências, inclusive nos ~30 mil linhas novas.
- **§4.2 — Usar um único conjunto de ícones (Lucide Icons)**
  - Evidência: package.json:24 (lucide-react ^1.23.0 única lib de ícones); busca por '@heroicons|react-icons|@tabler|phosphor' segue vazia.
- **§4.3 — Sistema de espaços base 8px; margem de página 32px no desktop e 16px no celular**
  - Evidência: src/components/layout/dashboard-shell.tsx:190 — `<main className="mx-auto max-w-[1500px] p-4 pb-24 sm:p-6 sm:pb-24 lg:p-8">` (16/24/32px), inalterado na essência, só mudou de linha.
- **§4.4 — Botões e campos com raio de 10px**
  - Evidência: src/app/globals.css:137 (--radius: 0.625rem = 10px), :71 (--radius-lg: var(--radius)); button.tsx:18 e input.tsx:17 usam rounded-lg; os tamanhos xs até limitam com rounded-[min(var(--radius-md),10px)].
- **§4.4 — Selos de situação com raio completo**
  - Evidência: src/components/ui/badge.tsx:8 (h-5 rounded-4xl); globals.css:75 (--radius-4xl = 26px, acima da metade da altura → pílula).
- **§11 — A página pública pode ter tokens próprios de marca, mas deve passar pelo mesmo teste de contraste**
  - Evidência: src/lib/colors.ts:44-63 (tenantStyle emite --tenant-* e resolve --tenant-on-primary/--tenant-on-secondary via readableTextColor, :26-28, por luminância relativa); overlay de 82% sobre imagem de fundo em :55-61.
- **§11 — Não permitir que a personalização da barbearia altere cores de erro, sucesso, pendência e foco**
  - Evidência: Tokens do tenant seguem no namespace isolado --tenant-* (src/lib/colors.ts:46-50); --success/--warning/--info/--destructive/--focus-ring/--ring são definidos apenas em globals.css (:114-118, :178-182) e nenhum código do tenant os sobrescreve.

### Parcial (12)

- **§3.1 — Cor de marca #F2B84B e cor ao passar o mouse #FFD06A**
  - Evidência: src/app/globals.css:163 (--primary: #f2b84b) atende a marca; src/components/ui/button.tsx:22 mantém hover:bg-primary/80.
  - O que falta: Continua faltando o hover claro: `grep -ri 'FFD06A\|brand-hover' src` = 0 ocorrências; a variante default do Button segue com `hover:bg-primary/80` (escurece em vez de clarear).
- **§3.1 — Roxo claro #A78BFA para comissões e assinaturas** ⬆
  - Evidência: src/app/globals.css:172 (--accent-purple: #a78bfa), badge.tsx:34-35 (variante purple), appointment-status-badge.tsx:40 e :60 (uso em in_progress), appointment-actions.tsx:51.
  - O que falta: O token nasceu com o valor certo e é usado — mas para o status 'Em atendimento' (estado novo da Fase 2), não para comissões e assinaturas como o guia manda. FACHADA parcial: --chart-commission (globals.css:197, #a78bfa) foi definido e nunca é consumido — grep 'chart-commission' só encontra as declarações no globals.css; a seção de comissões (financeiro/_sections/comissoes.tsx) e a de assinatura não têm nenhum roxo.
- **§4.1 — Sistema deve usar apenas uma família de fonte**
  - Evidência: src/app/layout.tsx:16-19 segue carregando Geist_Mono; `rg -o 'font-mono' -g '*.tsx' src | wc -l` = 124; globals.css:11 mantém --font-mono.
  - O que falta: Piorou em quantidade, mesmo status: font-mono agora aparece 124 vezes em 48 arquivos .tsx (eram 72 na rodada 1) — os componentes novos das Fases 2-5 (counter-sale-form 7x, appointment-detail-sheet 4x, clientes/[id] 6x, caixa 12x…) adotaram a segunda família em vez de eliminá-la. Além disso há font-serif 9x em salao/page.tsx (terceira família) e a mono nem é a Geist carregada (ver item próprio).
- **§4.1 — Escala tipográfica: título de página 24px/700/32px, título de seção 18px/650-700, número de indicador 28-32px/700, texto normal 16px, rótulo 15-16px/600, auxiliar 14px**
  - Evidência: src/components/layout/page-header.tsx:20 (text-3xl font-semibold), src/components/ui/card.tsx:41 (CardTitle text-base font-medium), src/components/dashboard/bills-view.tsx:67 e commission-closing-card.tsx:146 (KPI text-2xl font-semibold).
  - O que falta: Escala continua sem tokens (--text-* não existe no globals.css) e fora da espec: título de página em 30px/600 (guia: 24px/700), título de seção/CardTitle em 16px/500 (guia: 18px/650-700), número de indicador em 24px/600 (guia: 28-32px/700). `rg 'font-bold' src/app/(dashboard) src/components/dashboard` = 0 — o peso 700 segue inexistente no painel.
- **§4.1 — Não usar texto operacional menor que 14px; 16px como padrão nos formulários** ⬆
  - Evidência: src/components/ui/input.tsx:17 (text-base, h-12 md:h-11), textarea.tsx:10 (text-base); contagens: `rg -o 'text-xs' -g '*.tsx' src/app/(dashboard) src/components/{dashboard,layout,ui} | wc -l` = 139; `rg -o 'text-\[1[01]px\]' src | wc -l` = 35.
  - O que falta: A metade dos formulários foi resolvida (Input e Textarea em text-base 16px inclusive no desktop — o md:text-sm sumiu), mas o SelectTrigger continua text-sm (14px) e o piso de 14px piorou em volume: 139 ocorrências de text-xs no painel (eram 93) e 35 tamanhos arbitrários text-[10px]/text-[11px] em src (eram 20) — as telas novas das Fases 2-3 nasceram abaixo do piso.
- **§4.4 — Cartões com raio de 12px**
  - Evidência: src/components/ui/card.tsx:15 (rounded-xl) e src/app/globals.css:72 (--radius-xl: calc(var(--radius) * 1.4)).
  - O que falta: Idêntico à rodada 1: Card segue rounded-xl e --radius-xl segue calc(--radius × 1.4) = 14px, não 12px. Nenhum --radius-card foi criado.
- **§4.4 — Modais e painéis laterais com raio de 16px**
  - Evidência: src/components/ui/alert-dialog.tsx:61 (rounded-xl) e sheet.tsx:70 (classe do SheetContent sem rounded-*).
  - O que falta: Idêntico à rodada 1: AlertDialogContent segue rounded-xl (14px, guia pede 16px) e o SheetContent segue sem nenhuma classe rounded-* (0px nas bordas internas).
- **§4.4 — Não usar efeitos de brilho, neon ou gradientes em telas administrativas**
  - Evidência: src/components/dashboard/plan-badge.tsx:19.
  - O que falta: O mesmo gradiente da rodada 1 sobreviveu à Fase 0-5 intacto: PlanBadge com `bg-gradient-to-r from-amber-500 to-yellow-400`. Os gradientes novos no painel são funcionais e aceitáveis (settings-workspace.tsx:367 amostra de par de cores do preset, :733 overlay de pré-visualização da página pública; agenda-board.tsx:328 hachura de horário bloqueado).
- **§11 — Componentes devem usar tokens, não cores fixas espalhadas pelo código** ⬆
  - Evidência: Contagem atual (mesmo grep da rodada 1, prefixos bg|text|border|ring|from|to|via|fill|stroke + paleta nomeada): 49 no painel (10 arquivos), era 115; 320 em src total (concentradas nas páginas de marketing).
  - O que falta: A dívida caiu de 115 para 49 ocorrências de paleta crua no painel e os focos da rodada 1 foram migrados (appointment-status-badge e appointment-actions agora 100% em tokens; produtos/page.tsx limpo; Badge/Alert ganharam variantes por significado). Porém componentes NOVOS da Fase 3 reintroduziram o vício que a migração combatia: receivables-list.tsx:91/:127/:168, team-invites-card.tsx:68/:79, settings-workspace.tsx:269, expense-form, receivable-form e professional-details-form usam emerald/rose/amber cru — duplicando exatamente os pares tonais que os tokens success-bg/destructive-bg já oferecem.
- **[novo — §4.4] No tema escuro, usar borda e diferença de superfície para separar cartões (borda de cartão deveria passar pelo token --border)** •novo
  - Evidência: src/components/ui/card.tsx:15 (ring-foreground/10), alert-dialog.tsx:61 e select.tsx:73 (idem).
  - O que falta: A separação visual existe (superfície #141b24 sobre fundo #0b0f14 + anel), mas a borda do cartão continua fora do sistema de tokens: `ring-foreground/10` (branco a 10%) em vez de --border #2C3948, repetido em AlertDialog e SelectContent. Qualquer ajuste futuro no divisor não alcança os cartões.
- **[novo — §6.1/§11] Tokens de gráfico (--chart-*) definidos devem ser consumidos pelos gráficos do painel** •novo
  - Evidência: src/components/dashboard/monthly-revenue-chart.tsx:45,100,110 (tokens ✓); cash-flow-chart.tsx:67-76 e occupancy-heatmap.tsx:83-84 (hex locais); globals.css:63-68 e :188-198 definem os tokens por significado.
  - O que falta: O gráfico da rodada 1 foi consertado de verdade (monthly-revenue-chart consome os tokens semânticos novos --chart-received/--chart-billed do §6.1), mas os DOIS gráficos novos da Fase 3 nasceram contornando os tokens: cash-flow-chart.tsx:67-76 e occupancy-heatmap.tsx:83-84 declaram hex literais em <style> com escopo .dark — no escuro os valores coincidem com os tokens, no claro divergem da paleta do :root (ex.: despesa #c2453a em vez de --chart-expense #b91c1c; calor #10b981 que não é nenhum token claro). Funciona nos dois temas (usam a classe .dark certa), mas a paleta voltou a ser copiada à mão.
- **[novo — §3.2/§11] Telas de admin, autenticação e onboarding sem nenhum tema do guia (rodavam no preset neutro do shadcn)** •novo
  - Evidência: src/components/forms/auth-card.tsx:26,32,37,40; src/app/(auth)/login/page.tsx:38,53,55; contraste: src/app/admin/layout.tsx:17-22 (tudo em tokens, só 2 amber residuais em admin/page.tsx:61,243).
  - O que falta: Dois terços resolvidos por tabela: como o :root agora É o tema claro do §3.2, /admin (admin/layout.tsx usa só tokens: bg-muted/30, bg-background, bg-primary) e /onboarding (sem paleta crua) passaram a rodar na paleta do guia. Mas as telas de autenticação — a primeira impressão do produto — continuam num preset próprio hardcoded: auth-card.tsx:26 força bg-stone-950, :37 bg-stone-900 + border-white/10, e login/page.tsx:38/:53/:55 usa text-amber-400/text-stone-400; o resultado é um híbrido de cartão stone escuro com campos brancos do tema claro (bg-field) dentro.

### Não atendido (4)

- **§4.1 — Valores monetários precisam ter números tabulares (font-variant-numeric: tabular-nums)**
  - Evidência: `rg -n 'tabular-nums|font-variant-numeric' src` = 0 ocorrências em todo o repositório (mesma busca da rodada 1).
  - O que falta: Nada mudou: nenhum token, classe ou uso de tabular-nums. O time dobrou a aposta no contorno errado — todos os KPIs novos das Fases 2-3 usam font-mono (ex.: bills-view.tsx:67, commission-closing-card.tsx:146, dashboard/page.tsx:555) em vez de Inter com tabular-nums, o que perpetua a segunda família do item anterior.
- **§4.2 — Tamanho padrão de ícone: 20px**
  - Evidência: src/components/ui/button.tsx:18 ([&_svg:not([class*='size-'])]:size-4), select.tsx:47 idem, alert.tsx:17 (size-4); `rg -o 'size-3\.5' -g '*.tsx' src | wc -l` = 67.
  - O que falta: O default segue 16px (size-4) em Button, Select e Alert, e os pontos com size-3.5 (14px) cresceram de 22 para 67 no repositório. Usos pontuais de size-5 (ex.: theme-form.tsx:77) não mudam o padrão dos componentes base.
- **[novo — §4.1] A família mono declarada nunca aplica a Geist Mono carregada (--font-mono com nomes literais vs. variável --font-geist-mono do next/font)** •novo
  - Evidência: src/app/globals.css:11 e src/app/layout.tsx:16-19; `rg -n 'font-geist-mono' src` retorna apenas layout.tsx:17.
  - O que falta: FACHADA confirmada e agora com o dobro do alcance: globals.css:11 segue com --font-mono: "Geist Mono", … (nomes literais que o next/font não expõe — a família real gerada é interna), enquanto a variável --font-geist-mono de layout.tsx:17 continua referenciada em exatamente 0 lugares além da própria declaração. Resultado: a webfont Geist Mono baixa em toda visita sem ser usada, e as 124 ocorrências de font-mono renderizam na mono do sistema (ui-monospace).
- **[novo — §4.1] Terceira família de fonte: font-serif na página /salao** •novo
  - Evidência: `rg -c 'font-serif' src` = 9 ocorrências, todas em src/app/salao/page.tsx.
  - O que falta: Intacto desde a rodada 1: 9 ocorrências de font-serif em salao/page.tsx (linhas 218, 350, 423, 430, 451, 482, 519, 574, 625). É página de marketing, mas o §4.1 fala 'o sistema' sem exceção registrada.

### Não aplicável (1)

- **[novo — meta] Precisão das citações da rodada 1 (linhas deslocadas em 1-2 nos apontamentos de globals.css, button.tsx, page-header.tsx e alert-dialog.tsx)** •novo
  - Evidência: Item de processo sobre o relatório da rodada 1, não requisito de produto. Ficou sem objeto: os 221 arquivos alterados deslocaram todas as linhas, e esta rodada rebaixou cada evidência para o código de hoje (ex.: --card agora é globals.css:159, o <h1> do PageHeader segue em page-header.tsx:20, AlertDialogContent em alert-dialog.tsx:61).

### Verificação adversarial: confiavel

- **Achado adicional** — Além do --chart-commission que o reauditor flagrou, os tokens --chart-expense, --chart-receivable e --chart-previous também são fachada completa: declarados nos dois temas (globals.css:126-136 e :188-198) e expostos no @theme inline (:63-68), mas `rg 'chart-expense|chart-receivable|chart-previous' src` fora do globals.css retorna 0 — e o cash-flow-chart.tsx, exatamente o gráfico de despesas/recebíveis para o qual esses tokens existem, hardcoda hex próprios num <style> local (linhas 67-76). Dos 6 tokens de gráfico por significado do §6.1, só 2 (--chart-billed/--chart-received) são consumidos de verdade.
- **Achado adicional** — Detalhe que o reauditor afirmou errado (sem mudar status): no gap do item novo §6.1 ele diz que 'no escuro os valores coincidem com os tokens' — não é verdade para o cash-flow-chart: --out:#fb8072 (linha 73) não é o --chart-expense escuro #f87171, e --ink:#4a5561/--muted:#77828e no claro (linha 70) não correspondem a nenhum token do :root (--muted-foreground é #475569, --foreground-subtle é #606f85). A paleta foi copiada à mão E com valores levemente divergentes nos dois temas. O status PARCIAL dele permanece correto.
- **Achado adicional** — --font-heading declarado no @theme (globals.css:12-13) tem apenas 3 usos em todo o src — é um alias quase morto de --font-sans (aponta para a mesma Inter), mais um resíduo do sistema de fontes que o reauditor já criticou no item da Geist Mono.

---

## Padrão de componentes (§5)

A dimensão de componentes foi a que mais mudou de verdade: os primitivos foram reescritos na escala do guia (botão h-12/md:h-11, input h-12/md:h-11, select h-12, alvo mínimo 44×44 com utilitário touch-target), nasceu uma camada de toast real (toast.tsx montada no layout do painel e usada por 8+ componentes via useActionToast), o Alert ganhou os 5 tons, o Badge ganhou tons semânticos e o selo de agendamento foi corrigido (cancelado=vermelho, não compareceu=cinza, novo estado roxo 'Em atendimento', todos com ícone). A tabela agora vira lista de cartões no mobile por padrão e o sheet vira tela cheia. As fachadas que restam: as máscaras de moeda/hora/percentual existem em lib/masks mas nenhum campo as usa (29 type=number continuam nus — só a máscara de telefone entrou em 4 campos + booking); o 'Desfazer' temporizado do toast (ToastAction/UNDO_DURATION) nunca é chamado por ninguém; ui/select.tsx, field.tsx, checkbox.tsx e tooltip.tsx seguem como código morto. Persistem intactos os piores hábitos de risco: cancelar agendamento continua cinza e sem confirmação, cancelar plano 'definitivo', anular venda, estornar e excluir contas/recebíveis seguem a um toque. Com meio ponto para PARCIAL a dimensão fica em ~69%; plenamente atendidos são 22 de 48 itens avaliáveis (45,8%).

### Atendido (21)

- **§5.1 Botão principal: fundo #F2B84B e texto #16120A**
  - Evidência: src/app/globals.css:163-164 (--primary: #f2b84b; --primary-foreground: #16120a no escopo dark) + src/components/ui/button.tsx:22 (bg-primary text-primary-foreground)
  - O que falta: Resolvida a ressalva da rodada 1: o token literal agora é exatamente o #16120a do guia (antes #0b0f14).
- **§5.1 Altura dos botões: 44px no desktop e 48px no celular** ⬆
  - Evidência: src/components/ui/button.tsx:33-45 — default: h-12 md:h-11 (48/44px), sm: h-11, lg: h-12, icon: size-12 md:size-11, icon-sm: size-11; xs/icon-xs (36px) recebem .touch-target (globals.css:235-248) que garante alvo 44×44
  - O que falta: Sobram overrides pontuais abaixo da régua (period-filter.tsx:94 h-9, appointment-detail-sheet.tsx:303 h-9), mas a escala do primitivo está correta e é o que quase todas as telas usam.
- **§5.1 Botão secundário contornado (borda, fundo transparente ou #1B2531)**
  - Evidência: src/components/ui/button.tsx:23-26 (outline com border-border-control; secondary com bg-secondary) + globals.css:165 (--secondary: #1b2531 no dark)
- **§5.1 Confirmação clara após a ação ('Cliente salvo', 'Pagamento registrado')**
  - Evidência: Mensagens específicas seguem nas actions; agora com useActionToast (toast.tsx:203-223) em 8 componentes a confirmação sobrevive ao fechamento do sheet — resolvendo a mensagem descartada da rodada 1
- **§5.2 Rótulo sempre acima do campo; placeholder não substitui rótulo**
  - Evidência: Padrão Label+Input mantido nos formulários novos: expense-form.tsx:74, counter-sale-form.tsx:291-345, client-form.tsx:64-101
- **§5.2 Mensagem de erro precisa dizer como corrigir**
  - Evidência: src/modules/appointments/actions.ts:49 (SLOT_TAKEN: 'Esse horário acabou de ser ocupado. Escolha outro.') e :21; padrão mantido nas actions novas
- **§5.3 Painel lateral para criação e edição curta, sem tirar o usuário da lista**
  - Evidência: Sheets de criação/edição mantidos e ampliados: manual-appointment-sheet.tsx:262, service/product/membership-plan/sell/reschedule + novo appointment-detail-sheet.tsx:146
- **§5.3 Modal apenas para confirmação pequena, aviso ou decisão de risco; sem modal dentro de modal**
  - Evidência: AlertDialog segue restrito a confirmações destrutivas: delete-entity-button.tsx:38-75, archive-client-button, delete-client-forever-button, admin-row-actions, user-menu
- **§5.3 No celular, painéis laterais viram tela completa**
  - Evidência: Corrigido na base: src/components/ui/sheet.tsx:70 — data-[side=right]:w-full com sm:max-w-md (antes w-3/4)
  - O que falta: Ressalva remanescente: mobile-tab-bar.tsx:94 sobrescreve com w-80 — mas é o menu de navegação 'Mais', não formulário; deixa de ser um risco de régua para telas futuras porque o default agora é w-full.
- **§5.4 Cartão de indicador com nome + valor + período + comparação** ⬆
  - Evidência: dashboard/page.tsx:439-489 — exatamente 4 indicadores, cada um com período no rótulo e comparação/hint ('+R$X em relação a ontem' com TrendingUp/Down em :559-563); financeiro/_sections/resumo.tsx:95-130 mantém compare() vs período anterior; clientes/page.tsx:273-291 cartões com hint
  - O que falta: Ressalva: os 2 cartões de bills-view.tsx:59-88 ('Em aberto'/'Vencido') seguem só com número — são métricas de estoque, onde a comparação temporal é menos aplicável.
- **§5.5 No celular tabelas viram cartões; não usar rolagem horizontal como solução principal** ⬆
  - Evidência: table.tsx:17-37 (responsive=true por padrão, marcador data-responsive) + globals.css:403-451 (abaixo de sm cada tr vira cartão com borda e cada td vira linha rótulo/valor via data-label); data-label aplicado em servicos (3), produtos (11), planos (6), permissoes (1); caixa.tsx:162-227 tem cartões mobile próprios
  - O que falta: Ressalva: comissoes.tsx, admin/page.tsx e profissionais/[id] empilham sem data-label — os valores aparecem sem rótulo no cartão. Empilham mesmo assim; a rolagem horizontal deixou de ser a solução.
- **§5.6 Mapeamento de cores por situação conforme a tabela do guia** ⬆
  - Evidência: appointment-status-badge.tsx:36-46 — pending=warning, confirmed=info, completed=success, canceled=danger (VERMELHO), no_show=neutral (CINZA): a inversão foi corrigida; 'Em atendimento' virou estado real no domínio (Fase 2) com tom roxo; APPOINTMENT_STRIPE (:57-64) usa os mesmos tokens na grade
- **§5.6 O selo sempre exibe texto**
  - Evidência: appointment-status-badge.tsx:83-87 sempre renderiza entry.label ao lado do ícone; fallback :74-80 renderiza o próprio status
- **§5.7 Sistema de toast/notificação de sucesso reutilizável** ⬆
  - Evidência: src/components/ui/toast.tsx completo (região aria-live, 4 variantes tonais, pausa em hover/foco, useToast/useActionToast) montado em (dashboard)/layout.tsx:33 e usado de verdade em 8 componentes (client-form.tsx:40, delete-entity-button.tsx:35, service/product/membership sheets, archive/delete-client, membership-actions.tsx:51) + notifications-bell.tsx:61-65
- **§5.7 Mensagem de sucesso curta e específica**
  - Evidência: Padrão mantido nas actions novas; mensagens seguem curtas e em pt-BR, agora também entregues via toast de sucesso (useActionToast)
- **§5.7 Não usar alertas que desaparecem antes de serem lidos**
  - Evidência: Erros seguem inline persistentes nos formulários; os toasts de sucesso expiram (4,5s) mas pausam o cronômetro com ponteiro ou foco dentro do aviso (toast.tsx:130-134,153-156) e vários formulários mantêm o Alert inline além do toast (client-form.tsx:56-63)
- **§5.7 Alertas importantes também registrados no bloco 'Precisa da sua atenção'**
  - Evidência: dashboard/page.tsx:579-591 (bloco id='precisa-atencao' com actionItems) + indicador 'Pendências' (:481-488) aponta para ele; o aviso volátil de novo agendamento agora também persiste na lista do sino (notifications-bell.tsx:51-72)
- **[NOVO] §5.6 Cores de canceled/no_show invertidas em relação ao guia + falta de 'Em atendimento'** •novo
  - Evidência: appointment-status-badge.tsx:44 (canceled=danger/vermelho), :45 (no_show=neutral/cinza), :38-42 (in_progress='Em atendimento' roxo, estado criado no domínio na Fase 2 — máquina de estados em appointment-actions.tsx:77-92)
- **[NOVO] §5.5 A informação mais importante fica à esquerda** •novo
  - Evidência: Todas as tabelas abrem com a entidade: servicos:85 (Serviço), produtos:243-244 (Cliente/Produto), planos:177 (Cliente), comissoes:223 (Profissional), caixa:232 (Cliente), permissoes:67 (Ação), admin:194 (Barbearia); valores e ações ficam à direita (text-right)
- **[NOVO] §5.7 Verificação de que os avisos caem no bloco 'Precisa da sua atenção'** •novo
  - Evidência: dashboard/page.tsx:195-206 monta actionItems (pendentes de confirmação, contas vencidas etc.) e :579-591 renderiza o bloco com contagem e CTA por item; o indicador 'Pendências' (:481-488) soma os itens e âncora para #precisa-atencao
- **[NOVO] §5.3 Página completa para perfil do cliente e ficha do profissional** •novo
  - Evidência: src/app/(dashboard)/clientes/[id]/page.tsx e src/app/(dashboard)/profissionais/[id]/page.tsx existem (Fases 2-3), com client-profile-tabs.tsx e professional-tabs.tsx; listas e agenda linkam para elas (clientes/page.tsx:353, profissionais/page.tsx:149, appointment-detail-sheet.tsx:179)

### Parcial (23)

- **§5.1 Alvos clicáveis importantes com no mínimo 44×44px** ⬆
  - Evidência: src/components/ui/button.tsx:37 (sm agora h-11=44px) e :42-43 (icon-sm size-11); globals.css:235-248 (.touch-target). Os ícones de excluir/ocultar/arquivar em linha (servicos/page.tsx:143, delete-entity-button.tsx:41) agora são 44×44
  - O que falta: Resíduos abaixo de 44px: pílulas e campos de data do period-filter.tsx:39-96 (h-9=36px, o filtro principal do Financeiro), select inline de receivables-list.tsx:116 (h-8=32px) e botões do consent-banner.tsx:51-58 (h-9). O grosso do app está resolvido.
- **§5.1 Botão de baixa ênfase (sem fundo)**
  - Evidência: src/components/ui/button.tsx:27-28 (ghost) e :31 (link), amplamente usados; busca por 'Limpar filtros|Mais filtros' em src/**: zero ocorrências
  - O que falta: A variante existe e é usada, mas os casos típicos do guia ('Limpar filtros', 'Mais filtros') continuam sem existir em nenhuma tela com filtros (agenda, clientes, financeiro).
- **§5.1 Botão destrutivo: contornado na primeira exposição, preenchido só na confirmação final**
  - Evidência: src/components/dashboard/delete-entity-button.tsx:40-47 (1ª exposição ghost) → :69 (confirmação variant=destructive); porém button.tsx:29-30 mantém destructive como bg-destructive/10 translúcido
  - O que falta: A escada de dois passos segue certa, mas o degrau final continua sendo o vermelho translúcido a 10% — não é o vermelho preenchido que o guia pede para a confirmação final. Mesmo gap da rodada 1, intocado.
- **§5.1 Após clique de salvamento, bloquear repetição e mostrar andamento**
  - Evidência: Bom: client-form.tsx:37+103, appointment-detail-sheet.tsx:117+134 (busy), reservation-actions.tsx:53. Ruim: login/page.tsx:51 e cadastro/page.tsx:99 (Button sem pending), appointment-actions.tsx:133-144, bills-view.tsx:128-165, caixa.tsx:186-222 e receivables-list.tsx:107-142 (forms diretos sem estado). Busca por useFormStatus/SubmitButton: zero
  - O que falta: Os formulários de porta de entrada (login, cadastro) e as ações de linha (agenda, caixa, contas, recebíveis) continuam aceitando duplo clique sem feedback. O <SubmitButton> compartilhado com useFormStatus nunca foi criado.
- **§5.1 Não usar botões genéricos (OK, Enviar, Confirmar) quando puder dizer o que acontecerá**
  - Evidência: Ótimos novos: counter-sale-form.tsx:382-384 ('Receber R$X' / 'Lançar R$X a receber'), expense-form.tsx:129 ('Lançar despesa'). Genéricos restantes: reservation-actions.tsx:56 ('Confirmar'), caixa.tsx:220 ('Confirmar' no mobile; :299 tem 'Confirmar pagamento'), appointment-actions.tsx:20 ('Confirmar'), bill-form.tsx:68 ('Adicionar')
  - O que falta: Restam 4 rótulos genéricos, dois deles exatamente nos pontos citados na rodada 1 (confirmar venda em reservation-actions).
- **§5.2 Altura mínima dos campos: 44px desktop / 48px celular** ⬆
  - Evidência: src/components/ui/input.tsx:17 (h-12 md:h-11); select.tsx:47 (data-[size=default]:h-12 ... md:h-11); selects manuais do painel seguem h-12 md:h-11 (appointment-detail-sheet.tsx:281, membership-actions.tsx:88, caixa.tsx:138)
  - O que falta: Duas exceções pontuais: receivables-list.tsx:116 (select h-8) e period-filter.tsx:76/91 (inputs de data h-9). O primitivo e a quase totalidade das telas estão na régua. [Rebaixado pelo verificador adversarial — ver seção de verificação.]
- **§5.2 Máscara automática para telefone, moeda, data, hora e percentual** ⬆
  - Evidência: lib/masks/index.ts (4 máscaras puras) + ui/masked-input.tsx. Telefone aplicado de verdade em 4 campos (client-form.tsx:75, manual-appointment-sheet.tsx:339, professional-form.tsx:72, account-forms.tsx:49) + booking-form.tsx:32 usa formatPhone. Porém busca por mask="currency|percent|time": zero ocorrências; 29 campos type="number" de preço/custo/percentual seguem sem máscara (product-form-sheet.tsx:105-129, service-form-sheet.tsx:133-176, membership-plan-sheet.tsx:121, commission-closing-card.tsx:172-398 etc.)
  - O que falta: FACHADA parcial: as máscaras de moeda, hora e percentual (MASKS.currency/time/percent, parseCurrency/parsePercent e o ramo de campo escondido do MaskedInput) são código morto — existem, têm comentário elogioso, e nenhum campo do app as usa. Só a máscara de telefone entrou em produção.
- **§5.2 Teclado numérico no celular para telefone, preço, custo e quantidade**
  - Evidência: inputMode="decimal" adicionado em expense-form.tsx:75, receivable-form.tsx:98, commission-closing-card.tsx:173/270/371, counter-sale-form.tsx:330; Input agora text-base (16px, sem zoom iOS). Mas product-form-sheet, service-form-sheet, membership-plan-sheet, professional-form, employee-pay-card e settings-workspace:559-607 seguem type="number" sem inputMode
  - O que falta: Metade dos campos de valor ganhou inputMode decimal; a outra metade (catálogo, planos, comissão do profissional, metas) continua com type=number puro, com setas de incremento e scroll acidental.
- **§5.2 Campos obrigatórios marcados com texto ou símbolo explicado, não só por cor**
  - Evidência: Convenção '(opcional)' presente em 10+ campos (product-form-sheet.tsx:113, counter-sale-form.tsx:291, manual-appointment-sheet.tsx:512, booking-form.tsx:810/823); porém client-form.tsx:85 (E-mail) e :94 (Observações internas) seguem sem o marcador
  - O que falta: Exatamente o mesmo gap da rodada 1: no cadastro de cliente os campos opcionais E-mail e Observações continuam indistinguíveis de Nome e WhatsApp (required).
- **§5.2 Preencher duração e preço automaticamente após escolher o serviço**
  - Evidência: manual-appointment-sheet.tsx:387 (option mostra '{name} · {duration} min'); grep por formatBRL|price no arquivo: zero ocorrências
  - O que falta: Idêntico à rodada 1: a duração aparece e alimenta os slots, mas o preço do serviço não é exibido nem pré-preenchido no lançamento manual. O appointment-detail-sheet mostra o valor depois de criado, não na criação.
- **§5.4 Explicação curta em ícone de ajuda quando necessário** ⬆
  - Evidência: Explicações visíveis agora existem: clientes/page.tsx:342 (hint do segmento ativo em texto), :301 (title nas pílulas), hints sob os 4 indicadores do Início (dashboard/page.tsx:558-565). Mas busca por Tooltip fora de ui/: zero; busca por HelpCircle/CircleHelp: zero
  - O que falta: FACHADA persistente: ui/tooltip.tsx continua montado no layout (layout.tsx:49) e jamais renderizado — código morto. Não existe nenhum ícone de ajuda no app; o que salvou o item foi a explicação inline em texto, que cumpre o propósito por outro caminho.
- **§5.5 Busca sempre visível nas listas**
  - Evidência: type="search" segue em 2 telas (agenda/page.tsx:664-671, clientes/page.tsx:328-335); counter-sale-form tem filtro de produto próprio (:210). Servicos, produtos, planos, financeiro, permissoes e admin continuam sem busca
  - O que falta: As 8 telas com <Table> continuam sem campo de busca. O period-filter do Financeiro filtra por data, não busca texto.
- **§5.5 Filtros mais usados em botões simples; demais em 'Mais filtros'**
  - Evidência: Primeiro nível cresceu: agenda/page.tsx:680-733 (pílulas de situação + profissional + visão), clientes/page.tsx:294-313 (segmentos), period-filter.tsx (novo, presets de período no Financeiro). Busca por 'Mais filtros': zero
  - O que falta: O escalonamento de segundo nível ('Mais filtros') segue inexistente; só há o primeiro nível, agora em mais telas.
- **§5.5 Linha com pelo menos 52px** ⬆
  - Evidência: table.tsx:104 mantém TableCell p-2 sem min-height; mas na prática as linhas com ações agora carregam controles de 44px (servicos/page.tsx:143 icon-sm size-11) e no mobile viram cartões com padding 12px (globals.css:419-425)
  - O que falta: A garantia na base nunca foi criada (nem min-h-[52px] na TableRow nem py maior na célula): linhas só de texto como comissoes.tsx:223-268 e admin/page.tsx:191 seguem em ~36-40px no desktop. A melhora é efeito colateral dos botões maiores, não decisão de componente.
- **§5.5 Ação mais frequente visível à direita; ações raras em menu de três pontos**
  - Evidência: servicos/page.tsx:128-171 segue com editar/ocultar/excluir expostos na linha; DropdownMenu existe só em user-menu, notifications-bell e admin-row-actions — nenhum kebab em linha de tabela do painel
  - O que falta: Ações raras (excluir, ocultar) continuam expostas em vez de recolhidas. Mitigado: os alvos agora têm 44px e excluir exige confirmação, então o custo do clique acidental caiu.
- **§5.5 Clicar na linha abre detalhes** ⬆
  - Evidência: Os destinos agora existem: src/app/(dashboard)/clientes/[id]/page.tsx e profissionais/[id]/page.tsx. A lista de clientes linka o nome (clientes/page.tsx:352-357), profissionais tem 'Ver ficha' (:149), agenda e Início linkam o cliente (agenda:862, dashboard:653/798)
  - O que falta: A linha/cartão inteiro não é clicável — só o nome ou um botão; e as tabelas de catálogo (serviços, produtos, planos) seguem sem detalhe navegável (edição via sheet, o que o §5.3 admite para edição curta).
- **§5.6 Selo de situação com ícone + texto + cor (nunca só a bolinha colorida)**
  - Evidência: appointment-status-badge.tsx:32-46 agora mapeia ícone+texto+tom para os 6 estados (Clock, CalendarCheck, PlayCircle, CircleCheck, CircleX, UserX) e renderiza o ícone em :81-87; plan-badge.tsx usa Sparkles/Store
  - O que falta: O selo principal foi resolvido, mas os selos de planos (planos/page.tsx:205-209 'Pausado/Vence em breve/Em dia') e de contas (bills-view.tsx:123 'Vencida', receivables-list.tsx:91) seguem texto+cor sem ícone — metade do gap da rodada 1 permanece.
- **§5.7 Mudança sem risco: salvar imediatamente e oferecer 'Desfazer' por alguns segundos** ⬆
  - Evidência: toast.tsx:17-35 define ToastAction e UNDO_DURATION=6000 com pausa em hover/foco (:130-134,153-156); mas grep por chamadas de toast() com action: zero — nenhum fluxo usa. O desfazer que existe é por botões persistentes: appointment-actions.tsx:87-110 e appointment-detail-sheet.tsx:340-366 ('Desfazer início/conclusão/falta')
  - O que falta: FACHADA na metade toast: a infraestrutura do Desfazer temporizado está pronta, documentada e nunca é acionada por nenhuma ação do app — UNDO_DURATION é usado só dentro do próprio toast.tsx. O que salva o item é o desfazer persistente da agenda, que cumpre o espírito (reverter engano sem confirmação prévia) por outro desenho.
- **§5.7 Exclusão, cancelamento ou perda financeira pedem confirmação**
  - Evidência: Exclusões de entidade confirmam (delete-entity-button.tsx:38-75, archive-client-button, delete-client-forever-button). Sem confirmação seguem: cancelar agendamento (appointment-actions.tsx:36-41; appointment-detail-sheet.tsx:379-389), cancelar plano 'definitivo' (membership-actions.tsx:136-148), cancelar venda (reservation-actions.tsx:59-69), estornar recebimento (caixa.tsx:186-196), excluir conta (bills-view.tsx:155-165) e excluir recebível (receivables-list.tsx:132-142)
  - O que falta: As perdas financeiras de um toque da rodada 1 continuam todas de um toque — inclusive nos componentes novos das Fases 2-3 (estornar, excluir recebível). Só exclusão de cadastro confirma.
- **Consistência do sistema de componentes (transversal ao §5): primitivos existirem e serem realmente usados**
  - Evidência: Avanço real: alturas unificadas nos primitivos, Badge com tons semânticos usado nas telas, toast compartilhado. Código morto persistente: ui/field.tsx, ui/checkbox.tsx, ui/select.tsx e ui/tooltip.tsx — zero imports de todos os quatro (buscas from "@/components/ui/{field,checkbox,select,tooltip}"); selects continuam re-implementados à mão com strings de classe repetidas (selectClass em caixa.tsx, counter-sale-form.tsx, manual-appointment-sheet.tsx, employee-pay-card.tsx, commission-closing-card.tsx + inline em membership-actions, appointment-detail-sheet, bills-view, reservation-actions)
  - O que falta: FACHADA: ui/select.tsx foi reescrito na régua nova (h-12 md:h-11) e ninguém o importa — todos os ~15 selects do painel são <select> nativos com a mesma string de classe copiada. field.tsx e checkbox.tsx seguem mortos desde a rodada 1.
- **[NOVO] §5.6 Dois sistemas de cor paralelos para situação (paleta crua Tailwind vs tokens)** •novo
  - Evidência: Unificado no núcleo: badge.tsx:29-35 (tons semânticos como fonte única), appointment-status-badge e clientes/planos/servicos usam Badge com tokens. Porém receivables-list.tsx:91 (bg-rose-100 text-rose-800), :127 (border-emerald-300 text-emerald-700) e :168 (text-emerald-600) — componente da Fase 3 — reintroduz a paleta crua para o mesmo conceito de situação
  - O que falta: O sistema foi unificado e um componente NOVO já o fura: receivables-list pinta 'Vencida' e 'Recebi' com paleta crua do Tailwind em vez dos tons danger/success do Badge, recriando exatamente o problema que a Fase 1.9 disse ter eliminado.
- **[NOVO] §5.7/§3.1 Alert com tons de sucesso, atenção, erro, informação e neutro** •novo
  - Evidência: alert.tsx:20-31 define as 6 variantes com fundo tonal (--success-bg etc., globals.css:121-124/183-186) e borda esquerda viva. Usam success: client-form.tsx:57, bill-form.tsx:33, manual-appointment-sheet.tsx:271, account-forms.tsx:19 e +6. Usam 'default' cinza para sucesso: expense-form.tsx:50, receivable-form.tsx:53, counter-sale-form.tsx:226, settings-workspace.tsx:185, appointment-detail-sheet.tsx:164, employee-pay-card.tsx:142/200, professional-details-form.tsx:44/139, cancel-subscription-card.tsx:58/86
  - O que falta: O componente está completo, mas a adoção parou no meio: ~11 pontos (inclusive telas novas das Fases 2-3) seguem mostrando sucesso na variante default sem cor — o usuário vê verde numa tela e cinza na outra para o mesmo evento.
- **[NOVO] §5.1 Apenas um botão principal por área de decisão; não repetir o dourado lado a lado** •novo
  - Evidência: CTAs de página são únicos (dashboard/page.tsx:514-536: 'Novo agendamento' primary, resto outline). Mas as pílulas de filtro ativas usam variant default dourado em 3 grupos simultâneos na agenda (agenda/page.tsx:620 visão, :686 situação, :701-712 profissional) + o CTA dourado do header — 4+ elementos dourados visíveis na mesma tela; mesmo padrão em clientes/page.tsx:300 e period-filter.tsx:43
  - O que falta: O dourado de marca é usado como estado 'selecionado' de filtro em três grupos ao mesmo tempo, competindo com o CTA real da tela. Não é um botão de ação repetido, mas dilui a regra de um único principal por área.

### Não atendido (4)

- **§5.1 Botão destrutivo vermelho para 'Cancelar agendamento'**
  - Evidência: src/components/dashboard/appointment-actions.tsx:36-41 e :70-75 ('Cancelar' segue ghost + text-muted-foreground cinza); src/components/dashboard/appointment-detail-sheet.tsx:379-389 ('Cancelar horário' idem, ghost cinza no sheet novo)
  - O que falta: O exemplo literal do guia continua errado — e foi replicado no componente novo da Fase 2 (appointment-detail-sheet). Cancelar agendamento é cinza nos dois lugares onde existe.
- **§5.2 Validar enquanto o usuário preenche, sem esperar a tentativa final**
  - Evidência: Buscas em src/**: react-hook-form|zodResolver → zero; onBlur=|aria-invalid= em formulários → zero. Toda validação segue pós-envio via server action
  - O que falta: Nada mudou: o usuário continua descobrindo o erro só depois do round-trip. A máscara de telefone dá feedback de formato, mas não é validação.
- **§5.5 Cabeçalho fixo ao rolar listas longas**
  - Evidência: src/components/ui/table.tsx:40-48 — TableHeader sem sticky; grep 'sticky top-0' só encontra headers de página (dashboard-shell.tsx:161, admin/layout.tsx:18)
  - O que falta: Intocado desde a rodada 1: nenhum thead é sticky.
- **[NOVO] §5.7 Ações destrutivas de um toque fora do fluxo de exclusão (membership-actions, bills-view)** •novo
  - Evidência: membership-actions.tsx:136-148 — 'Cancelar plano (definitivo)' é um Button ghost de um toque, sem AlertDialog; bills-view.tsx:155-165 e :226-235 — excluir conta a um toque; receivables-list.tsx:132-142 — excluir recebível (dívida de cliente) a um toque; caixa.tsx:186-196 — estornar recebimento a um toque
  - O que falta: Nenhuma dessas quatro perdas financeiras ganhou confirmação nas Fases 0-5, e duas delas (excluir recebível, estornar) foram criadas já sem confirmação.

### Não aplicável (2)

- **[NOVO] Correção de evidência da rodada 1: client-form.tsx:46 não tinha placeholder** •novo
  - Evidência: Item meta, sem requisito de produto. Hoje o campo é MaskedInput com placeholder de exemplo (client-form.tsx:75-82), o que torna a correção obsoleta: a máscara de telefone existe e o placeholder também
- **[NOVO] Correção de contagem da rodada 1: eram 8 sheets de conteúdo, não 9** •novo
  - Evidência: Item meta, sem requisito de produto. mobile-tab-bar.tsx:94 segue sendo navegação (w-80), não criação/edição; os sheets de conteúdo aumentaram com appointment-detail-sheet e client-form-sheet

### Verificação adversarial: confiavel com ressalvas

- **Correção** — §5.2 Altura mínima dos campos: 44px desktop / 48px celular: ATENDIDO → PARCIAL. O gap alega 'duas exceções pontuais', mas há pelo menos 6 campos abaixo do mínimo, todos em telas financeiras de uso diário: receivables-list.tsx:116 (select h-8=32px), period-filter.tsx:76 e :91 (inputs de data h-9=36px, usados no Financeiro E em profissionais/[id]), financeiro/_sections/a-receber.tsx:171 (select h-9) e :175 (input de data h-9), expense-form.tsx:97 (select de categoria h-10=40px SEM variante md — fica 40px também no celular, onde o guia pede 48). Além disso a evidência cita select.tsx:47 como prova, mas ui/select.tsx é componente morto: grep por import de '@/components/ui/select' retorna zero — todos os ~34 selects do app são <select> nativos com classes manuais. O primitivo Input (input.tsx:17 h-12 md:h-11) e a maioria dos selects nativos (selectClass h-12 md:h-11 em caixa.tsx:41, counter-sale-form.tsx:34, bills-view.tsx:134, reservation-actions.tsx:37 etc.) estão na régua, então MELHOROU — mas requisito de altura MÍNIMA com 6 violações em 5 arquivos do fluxo de dinheiro é PARCIAL, pelo mesmo critério que o próprio reauditor aplicou ao item de alvos 44×44 (mantido PARCIAL com resíduos equivalentes).
- **Achado adicional** — ui/select.tsx (Radix Select): reescrito na régua do guia (data-[size=default]:h-12 md:h-11) mas nunca importado por nenhum arquivo do app (grep por from "@/components/ui/select": zero) — e ainda assim foi usado como EVIDÊNCIA da promoção do item de altura de campos. O reauditor listou o arquivo como código morto no resumo, mas não percebeu que sua própria prova apontava para ele; os selects reais são todos <select> nativos.
- **Achado adicional** — 'Desfazer' inexistente exatamente para a ação mais arriscada: appointment-actions.tsx:103-112 só tem 'Desfazer' para in_progress/completed/no_show — actionsByStatus não tem chave 'canceled', então cancelar agendamento é um toque (ghost cinza), sem confirmação E irreversível pela UI. O argumento que salvou o §5.7-Desfazer como PARCIAL ('o desfazer persistente cumpre o espírito por outro desenho') não cobre o cancelamento, que é a perda mais grave.
- **Achado adicional** — Evidência do item §5.6 [NOVO] repete um erro do comentário do código: appointment-status-badge.tsx:29 afirma que 'Em atendimento não está na tabela do guia — é estado novo', mas GUIA_VISUAL.md:340 lista 'Em atendimento | Roxo | Tesoura'. O status ATENDIDO se sustenta (roxo correto, ícone é apenas 'sugerido' — usa PlayCircle em vez de tesoura), mas a justificativa está factualmente errada.
- **Achado adicional** — Resíduos de alvo <44px não citados em nenhum item: NavLink (nav-link.tsx:29, h-9=36px default e h-8=32px na variante sm) é a navegação lateral inteira do painel; pílulas de seleção de profissional em equipe/horarios/page.tsx:142 (h-9). Não mudam nenhum status (o item de alvos 44×44 já é PARCIAL), mas o inventário de resíduos do reauditor está incompleto.

---

## Linguagem e navegação (§8, §9)

A navegação (§9) foi genuinamente refeita: o menu lateral agora tem exatamente os 7 itens do guia com os nomes prescritos (src/lib/navigation.ts:15-28), largura de 240px (w-60), as telas removidas continuam alcançáveis via SectionNav (usado de verdade em 7 páginas) e FinanceNav (6 seções), as rotas antigas redirecionam, e o Menu mobile ganhou os 6 itens exigidos, incluindo Página de agendamento, Minha conta e Meu plano NexoBarber — nada disso é fachada. Na linguagem (§8), caíram vários termos proibidos: Ticket médio virou "Gasto médio por cliente", Status virou "Situação" em todo lugar, Checkout sumiu (badge "Oferecido no agendamento"), a confirmação pública usa "Horário confirmado"/"Pedido de horário enviado" com teste, e "Assinatura" no perfil virou "Meu plano NexoBarber". Continuam pendentes do jeito que estavam: "Acessos e papéis" (team-tabs.tsx:26), botão "Gerar PDF", campo "Imagem (URL)" do serviço, EmptyState sem ação, diálogos destrutivos com "Cancelar" como escape, rodapé do menu sem ajuda/recolher, header sem título/busca/+ Novo, e mensagens de sucesso sem interpolar dia/valor. Houve uma regressão de vocabulário: a tela de clientes ganhou um segmento novo rotulado "Inadimplentes" (clientes/page.tsx:44), reexpondo o termo que a rodada 1 dava como eliminado. Quase-fachada digna de nota: na venda de balcão o carrinho é sticky bottom-0 no celular e fica parcialmente atrás da barra inferior fixa, podendo cobrir o botão "Receber R$" no meio da rolagem — o padrão correto (bottom-20) só foi aplicado em Configurações. Placar: 19 ATENDIDO, 15 PARCIAL, 6 NAO_ATENDIDO em 40 itens; percentual ponderado (PARCIAL=0,5) ≈ 66%.

### Atendido (19)

- **§8.1 — Dashboard / Visão geral → Início**
  - Evidência: src/lib/navigation.ts:16 (label "Início"); grep ">Dashboard<|Visão geral" em src/ sem texto visível
- **§8.1 — PDV → Nova venda ou Caixa**
  - Evidência: grep "PDV|pdv" src/ = zero; ressalva da rodada 1 resolvida: agora existe a tela "Nova venda" (src/app/(dashboard)/vendas/page.tsx:110, link em src/lib/navigation.ts:63, counter-sale-form real)
- **§8.1 — Checkout → Receber pagamento** ⬆
  - Evidência: src/app/(dashboard)/produtos/page.tsx:401 badge "Oferecido no agendamento"; src/components/dashboard/product-form-sheet.tsx:184 checkbox "Oferecer este produto ao cliente no agendamento (Plus)"; caixa.tsx:299 "Confirmar pagamento"; grep "Checkout" só resta em código interno de billing/Mercado Pago, nunca na interface
- **§8.1 — Ticket médio → Gasto médio por cliente** ⬆
  - Evidência: src/app/(dashboard)/financeiro/_sections/caixa.tsx:395 e :411 "Gasto médio por cliente"; src/app/(print)/relatorio-financeiro/page.tsx:288 "Gasto médio por atendimento"; clientes/[id]/page.tsx:174 "Gasto médio"; grep -i "ticket médio" src/ = zero (só a variável interna avg_ticket, permitida)
- **§8.1 — Performance → Resultados**
  - Evidência: grep -i "performance|desempenho" src/ = zero ocorrências visíveis
- **§8.1 — Status → Situação** ⬆
  - Evidência: "Situação" em servicos/page.tsx:88, produtos/page.tsx:326, planos/page.tsx:179 e :284, booking-success.tsx:77, reserva/[token]/page.tsx:137, admin/leads/page.tsx:201; grep '>Status<|"Status"' src/ = zero rótulo visível (só nomes internos, permitidos)
- **§8.1 — Reserva enviada → Horário confirmado / Pedido de horário enviado** ⬆
  - Evidência: src/lib/booking/index.ts:103-104 ("Horário confirmado" / "Pedido de horário enviado"), usado em booking-success.tsx:55 e coberto por teste (booking.test.ts:53-54)
- **§8.1 — Assinatura (no perfil) → Meu plano NexoBarber** ⬆
  - Evidência: src/components/layout/user-menu.tsx:75 "Meu plano NexoBarber"; src/app/(dashboard)/assinatura/page.tsx:89 title="Meu plano NexoBarber"; também no Menu mobile (dashboard-shell.tsx:112)
- **§8.1 — Assinatura (para o cliente) → Plano do cliente**
  - Evidência: src/lib/navigation.ts:53 "Planos de clientes" e planos/page.tsx:145 title="Planos de clientes". Ressalva da rodada 1 persiste: eyebrow "Clube de assinatura" em planos/page.tsx:144
- **§8.1 — Margem → Lucro por unidade**
  - Evidência: grep -i "margem" src/ = só comentário interno em lib/masks/index.ts:98; nada visível. Ressalva mantida: o indicador "lucro por unidade" continua não existindo — proibição cumprida por ausência do conceito
- **§8.3 — Mensagens de erro no padrão dos exemplos**
  - Evidência: Padrão mantido: "Não foi possível salvar. Tente de novo." (bills/actions.ts:89, settings/actions.ts:198, professionals/actions.ts:64) e variantes com objeto (products:90, clients:48). Mesma divergência mínima: "Confira sua internet" continua ausente (grep zero)
- **§9.1 — Menu lateral com exatamente 7 itens (Início, Agenda, Clientes, Financeiro, Serviços e produtos, Equipe, Configurações)** ⬆
  - Evidência: src/lib/navigation.ts:15-28 — MAIN_NAV com exatamente os 7 itens e nomes prescritos, todos links reais (dashboard-shell.tsx:140-147). Não é fachada: as telas removidas viraram SectionNav usado de fato em 7 páginas (servicos:75, produtos:193, planos:166, profissionais:325, permissoes:55, equipe/horarios:126) e FinanceNav com 6 seções (finance-nav.tsx:4-11); rotas antigas redirecionam (ex.: contas-a-pagar/page.tsx → redirect("/financeiro?secao=despesas"))
- **§9.1 — Menu lateral com 240px de largura** ⬆
  - Evidência: src/components/layout/dashboard-shell.tsx:124 w-60 (15rem = 240px) e :160 lg:pl-60, com comentário citando o §9.1
- **§9.1 — Cabeçalho com botão Página de agendamento** ⬆
  - Evidência: Header: dashboard-shell.tsx:167-176 ("Ver página de agendamento", ainda hidden sm:inline-flex); mobile resolvido pela alternativa que o gap aceitava: o Menu do celular agora tem "Página de agendamento" (dashboard-shell.tsx:97-101, renderizado no sheet do mobile-tab-bar)
- **§9.2 — Barra inferior mobile com 5 itens (Início, Agenda, Clientes, Financeiro, Menu)**
  - Evidência: dashboard-shell.tsx:56-61 (mobilePrimaryHrefs) + mobile-tab-bar.tsx; ressalva da rodada 1 resolvida: o 4º item agora exibe "Financeiro" (navigation.ts:19), não mais "Resumo e caixa" truncado
- **§9.2 — Conteúdo do Menu: Serviços e produtos, Equipe, Página de agendamento, Configurações, Minha conta, Meu plano NexoBarber** ⬆
  - Evidência: src/components/layout/dashboard-shell.tsx:83-119 — grupo "Áreas" (Serviços e produtos, Equipe, Configurações) + grupo "Sua conta" (Página de agendamento externa, Minha conta, Meu plano NexoBarber para owner): exatamente os 6 itens do guia, sem herdar hierarquia inflada
- **§8.1 — linha "Confirmação na hora → Horário confirmado automaticamente" da tabela do guia (não auditada na rodada 1)** •novo
  - Evidência: src/components/dashboard/settings-workspace.tsx:618-638 — Label "Como o horário é confirmado", opções "Eu confirmo cada horário (o cliente fica aguardando)" e "Confirmação imediata (o horário já sai confirmado)"; :789 badge "Confirmação imediata"
- **§9.2 — Menu mobile: presença dos itens "Página de agendamento", "Minha conta" e "Meu plano NexoBarber"** •novo
  - Evidência: src/components/layout/dashboard-shell.tsx:94-118 — grupo "Sua conta" com os 3 itens (Meu plano NexoBarber condicionado a owner, o papel que o guia prevê); renderizados em mobile-tab-bar.tsx:94-126
- **§8.2 — rótulos nominalmente proibidos "OK", "Enviar", "Prosseguir" e "Acessar"** •novo
  - Evidência: grep -E '>\s*(OK|Enviar|Prosseguir|Acessar)\s*<' e '"(OK|Enviar|Prosseguir|Acessar)"' em src/ = zero; "Enviar" só aparece com objeto ("Enviar convite", professional-form.tsx:149)

### Parcial (15)

- **§8.1 — Ver página pública → Ver página de agendamento**
  - Evidência: Botões corretos: src/components/layout/dashboard-shell.tsx:174 e src/app/(dashboard)/configuracoes/page.tsx:101; settings-workspace.tsx:197/709-715 já fala "página de agendamento"
  - O que falta: Os dois botões foram corrigidos (o appearance-editor foi substituído pelo settings-workspace, que usa a linguagem certa), mas "página pública" segue visível em ~10 textos de apoio: permissoes/page.tsx:35 ("Configurações e página pública"), lib/billing/index.ts:35 (feature "Página pública da barbearia" exibida em /assinatura e landings), assinatura/page.tsx:121-122, servicos/page.tsx:180, dashboard/page.tsx:362, service-form-sheet.tsx:105/263, onboarding/page.tsx:29, page.tsx:669 e salao/page.tsx:540.
- **§8.1 — Receita do período → Total vendido / Dinheiro recebido**
  - Evidência: src/app/(dashboard)/dashboard/page.tsx:450 "Dinheiro recebido hoje" e :751 "Total vendido"; mas caixa.tsx:462 e :500 TableHead "Receita" e relatorio-financeiro/page.tsx:171-173,251,262 "Receita total/de serviços/de produtos"
  - O que falta: Exatamente o que o gap da rodada 1 pedia segue pendente: os cabeçalhos de tabela do caixa e todo o relatório impresso continuam com "Receita".
- **§8.1 — Recorrente → Repetir todo mês**
  - Evidência: src/app/(dashboard)/planos/page.tsx:146 — description ainda começa com "Venda recorrente com controle de uso e de vencimento…"
  - O que falta: A mesma string da rodada 1 segue intocada; "repete todo mês" não aparece em lugar nenhum (grep zero). Conta que repete todo mês continua não existindo como funcionalidade.
- **§8.1 — Exportar → Baixar relatório**
  - Evidência: "Exportar" ausente (grep zero); botão real é "Gerar PDF" em src/app/(dashboard)/financeiro/_sections/relatorios.tsx:178; "Baixar relatório" inexistente (grep zero)
  - O que falta: Sobrou uma única ocorrência (a de comissões sumiu na consolidação do Financeiro), mas ela continua "Gerar PDF" em vez de "Baixar relatório".
- **§8.1 — No-show → Não compareceu**
  - Evidência: Badge "Não compareceu" (appointment-status-badge.tsx:45, appointment-detail-sheet.tsx:333); mas botões "Não veio" (appointment-actions.tsx:29 e :63), filtro "Faltas" (agenda/page.tsx:56), "Falta registrada." (appointments/actions.ts:207) e "Desfazer falta" (appointment-actions.tsx:106)
  - O que falta: O inglês continua ausente, mas a unificação pedida não veio: o operador agora lê QUATRO variações para o mesmo estado — "Não veio", "Faltas", "falta" e "Não compareceu".
- **§8.1 — URL da imagem → Escolher foto**
  - Evidência: src/components/dashboard/service-form-sheet.tsx:197-204 ainda tem Label "Imagem (URL)" com input type="url" placeholder "https://…"
  - O que falta: O serviço continua sendo o único cadastro que exige URL de um barbeiro. Uploads reais existem nos demais (product-form-sheet.tsx:166 "Foto do produto", professional-details-form.tsx:91 "Escolher foto", settings-workspace.tsx:314/464), mas o rótulo prescrito "Escolher foto" só é usado em 1 dos 5 inputs de imagem.
- **§8.1 — Movimentação de saída → Registrar saída** ⬆
  - Evidência: src/components/dashboard/inventory-movement-form.tsx:30 — título mudou de "Registrar movimentação" para "Registrar entrada ou saída" (git show 3163783) e ganhou campo "Motivo (opcional)" (:101)
  - O que falta: Não virou as duas ações nomeadas que o guia pede: é um formulário único com select "Tipo" usando os rótulos híbridos "Entrada — compra"/"Saída — venda" (lib/inventory.ts:2-7), botão genérico "Registrar" (:105), e o jargão "movimentação" segue visível em produtos/page.tsx:325/385/513 e na mensagem "Movimentação registrada." (modules/inventory/actions.ts:74).
- **§8.1 — Inadimplência → Pagamento atrasado** ⬇
  - Evidência: src/app/(dashboard)/clientes/page.tsx:43-44 — segmento NOVO com label visível "Inadimplentes" (chip de filtro); dashboard/page.tsx:211 aponta para ele; system-screens.tsx:65 exibe o chip "Inadimplentes" na landing; admin/page.tsx:145 "Inadimplentes"
  - O que falta: Regressão: a rodada 1 encontrou o painel limpo ("Em atraso"), mas a Fase 3 criou um segmento de clientes rotulado "Inadimplentes" — o termo proibido voltou a ser lido pelo dono na tela de clientes e no mockup comercial da landing. O card do dashboard, ironicamente, usa a linguagem certa ("Planos vencendo ou vencidos") e leva para um chip com a errada.
- **§8.2 — Botões no padrão ação + objeto ("Salvar cliente", não "Salvar")**
  - Evidência: Melhoras reais: "Confirmar pagamento" (caixa.tsx:299), "Confirmar novo horário" (reschedule-sheet.tsx:192), "Lançar despesa" (expense-form.tsx:129), "Lançar a receber" (receivable-form.tsx:130), "Enviar convite" (professional-form.tsx:149), "Receber {valor}"/"Lançar {valor} a receber" (counter-sale-form.tsx:382-384), "Salvar expediente", "Criar bloqueio", "Excluir definitivamente"
  - O que falta: Permanecem os proibidos nominalmente: "Confirmar" e "Cancelar" sozinhos (appointment-actions.tsx:20/37, reservation-actions.tsx:56/67) e "Gerenciar equipe" (permissoes/page.tsx:51). Genéricos restantes: "Estornar" (caixa.tsx:193/270), "Chamar" (client-contact-actions.tsx:92, dashboard:823), "Reativar" (client-contact-actions.tsx:76), "Adicionar" (bill-form.tsx:68), "Registrar" (inventory-movement-form.tsx:105), "Excluir" (delete-entity-button.tsx:70), "Arquivar" (archive-client-button.tsx:72), "Restaurar" (restore-client-button.tsx:33), "Salvar alterações" em 5 formulários (product-form-sheet:188, service-form-sheet:268, membership-plan-sheet:208, settings-workspace:674, professional-details-form:102).
- **§8.3 — Mensagens de sucesso no padrão dos exemplos**
  - Evidência: src/modules/appointments/actions.ts:112 segue "Agendamento confirmado na agenda." sem dia/hora; payroll/actions.ts:148 "Pagamento registrado." sem valor; inventory/actions.ts:74 "Movimentação registrada." sem N unidades/produto
  - O que falta: As 3-4 interpolações pedidas na rodada 1 não foram feitas. Único avanço tangencial: o botão da venda de balcão interpola o valor ("Receber R$ X"), mas as mensagens de confirmação continuam genéricas.
- **§8.3 — Estado vazio oferece uma próxima ação (empty-state.tsx e seus usos)**
  - Evidência: src/components/feedback/empty-state.tsx (arquivo inteiro, 19 linhas) segue aceitando só title+description — sem prop action, sem Button/Link; agora são 26 usos em 19 arquivos
  - O que falta: A prop de ação pedida não foi adicionada; nenhum estado vazio oferece botão clicável. E o componente segue sendo usado para negação de permissão em 5 telas ("Acesso restrito" em financeiro/page.tsx:59, equipe/horarios/page.tsx:42, profissionais/[id]/page.tsx:111, clientes/page.tsx:128, configuracoes/page.tsx:35), confundindo "não há nada" com "você não pode ver".
- **§8.3 — Confirmação destrutiva com título-pergunta, consequência e botões Voltar / <Ação> <objeto>**
  - Evidência: AlertDialogCancel segue "Cancelar" (delete-entity-button.tsx:66, delete-client-forever-button.tsx:72, archive-client-button.tsx:68); confirmatórios seguem sem objeto ("Excluir" :70, "Arquivar" :72); cancelar agendamento dispara direto sem diálogo (appointment-detail-sheet.tsx:379-389, botão "Cancelar horário" via form imediato)
  - O que falta: As 3 pendências da rodada 1 continuam: sem AlertDialog no cancelamento de agendamento com o texto do §8.3, escape "Cancelar" ambíguo nos 3 diálogos antigos, confirmação sem objeto. Melhora pontual só nos fluxos novos: cancel-subscription-card.tsx:124 e cancel-reservation-button.tsx:60 usam "Voltar" como escape.
- **§9.1 — Cabeçalho com busca, quando útil**
  - Evidência: Nenhuma busca no header (dashboard-shell.tsx:161-188); busca local existe e até cresceu: clientes/page.tsx:329-338 e agora também agenda/page.tsx:665-669 ("Buscar cliente…")
  - O que falta: Mesma situação: a busca existe onde é útil, mas dentro da página, não no cabeçalho como o guia posiciona.
- **§9.2 — Botão principal da tela pode ficar fixo acima da barra inferior, sem cobrir conteúdo** ⬆
  - Evidência: settings-workspace.tsx:672 — barra de salvar sticky bottom-20 (acima da tab bar) no mobile; counter-sale-form.tsx:217 — carrinho sticky bottom-0; toast.tsx:98 posicionado bottom-20 acima da barra
  - O que falta: O padrão chegou, mas metade dele é falho: em /vendas o carrinho usa sticky bottom-0 sem z-index, então no celular a parte de baixo do cartão — justamente onde fica o botão "Receber R$ X" (counter-sale-form.tsx:377-385) — fica atrás da barra inferior fixa (z-40) durante a rolagem, só aparecendo inteiro no fim da página. Deveria ser bottom-20 como no settings-workspace. Nas demais telas a ação principal segue no topo.
- **§9.1 "título da tela" — divergência entre rótulo do MENU e título da TELA** •novo
  - Evidência: Batem: Agenda (agenda:595), Clientes (clientes:258), Financeiro (financeiro:55/76), Configurações (configuracoes:31). Divergem: "Início" → title "Olá, {nome}!" (dashboard:509), "Serviços e produtos" → title "Serviços" (servicos:65), "Equipe" → title "Profissionais e Equipe" (profissionais:322)
  - O que falta: As 6 divergências graves da rodada 1 (Resumo e caixa→Financeiro etc.) sumiram com a renomeação do menu; restam 3 divergências leves nos 7 destinos: Início/Olá, Serviços e produtos/Serviços, Equipe/Profissionais e Equipe.

### Não atendido (6)

- **§8.1 — Acessos e papéis → Quem pode acessar**
  - Evidência: src/components/dashboard/team-tabs.tsx:26 ainda renderiza a aba "Acessos e papéis" (componente usado em profissionais/page.tsx:327); grep "Quem pode acessar" = zero
  - O que falta: Aba não renomeada; além dela, "Equipe com papéis e permissões" segue no catálogo de features (lib/billing/index.ts:36), exibido em /assinatura e nas landings.
- **§9.1 — Rodapé do menu com ajuda, perfil do usuário e recolher menu**
  - Evidência: src/components/layout/dashboard-shell.tsx:148-158 — rodapé do aside segue só Separator + botão "Sair"; perfil continua no cabeçalho (:181); grep -i "recolher|collapse" sem nenhum resultado de UI e "ajuda" só em textos de erro/placeholder
  - O que falta: Nenhum dos 3 elementos foi implementado: sem item de ajuda no painel, perfil segue no header, menu segue fixo em 240px sem recolher.
- **§9.1 — Cabeçalho com título da tela**
  - Evidência: src/components/layout/dashboard-shell.tsx:161-188 — o header sticky segue contendo só ícone+nome do tenant (visível abaixo de lg) e as ações à direita; o título continua no PageHeader dentro do conteúdo, que rola para fora
  - O que falta: Sem mudança: o título da tela nunca aparece no cabeçalho fixo.
- **§9.1 — Cabeçalho com botão + Novo**
  - Evidência: src/components/layout/dashboard-shell.tsx:166-187 — à direita do header seguem só 3 elementos: botão de página de agendamento, NotificationsBell e UserMenu; nenhum "+ Novo" global (a criação segue por tela, ex.: ManualAppointmentSheet no dashboard/page.tsx:520)
  - O que falta: O atalho global de criação (novo agendamento / cliente / venda / despesa) continua inexistente.
- **§9.1 rodapé — comprovação da ausência de "ajuda" e "recolher menu"** •novo
  - Evidência: grep -i "recolher|colaps|collapse" src/ = só falsos positivos (parallax.tsx:57, border-collapse em relatorio-financeiro:334); grep -i "ajuda|suporte" = só textos de erro/rodapé legal (error.tsx:29, account-forms.tsx:61, assinatura:201), nenhum item de menu
  - O que falta: Confirmado por busca: não existe item de ajuda nem função de recolher o menu em nenhum componente de layout.
- **§8.1 — ocorrência de "página pública" no catálogo de features (lib/billing)** •novo
  - Evidência: src/lib/billing/index.ts:35 — feature "Página pública da barbearia" segue no catálogo de planos, exibida em /assinatura (pricing) e nas landings
  - O que falta: String intocada desde a rodada 1; deveria virar "Página de agendamento da barbearia".

### Verificação adversarial: confiavel


---

## Telas Início e Agenda (§7.1, §7.2)

Esta dimensão teve a maior virada real do repositório: o achado principal da rodada 1 (agenda em lista, sem grade) foi resolvido de verdade — agenda-board.tsx desenha eixo de horários à esquerda, colunas por profissional (Dia) ou por dia (Semana), cartões posicionados por minuto com altura proporcional, faixa colorida por status, bloqueios hachurados com rótulo, linha do "agora" e clique no vazio que abre o cadastro pré-preenchido e termina em botão "Salvar agendamento". O estado em_atendimento existe de ponta a ponta (enum na migration 0033, trigger de transições e RPC complete_and_receive_appointment na 0034, botões Iniciar/Finalizar e receber na UI) e as quatro visões Dia/Semana/Mês/Lista funcionam, com a visão Mês agregada no banco. O Início foi reescrito: exatamente 4 indicadores (incluindo Pendências), data no cabeçalho, botões "Novo agendamento" e "Página de agendamento", duas colunas com Resultado do mês e lista real de Clientes para chamar com wa.me, Acesso rápido e cartões de receita duplicados removidos, e os dois bugs apontados (Próximo horário e contagem com faltas) corrigidos com comentário citando a auditoria. A fachada encontrada: o Início (linha 161) e /vendas chamam a RPC get_product_stock, que NÃO existe em nenhuma migration (grep em supabase/ e docs/ retorna zero) — o alerta "Produtos abaixo do estoque mínimo" trata todo saldo como 0 e dispara para qualquer produto com mínimo configurado, contaminando também o número do indicador Pendências. Fora isso, restam pendências menores: a fila separada "Vendas de produto a confirmar" continua no topo da agenda, o painel de novo agendamento segue sem resumo de valor (preço nem é buscado) e a visão Lista ainda tem linhas sem clique para o detalhe. Saldo: 36 de 41 itens atendidos, nenhum regrediu.

### Atendido (36)

- **§7.2 Calendário central de verdade: horário na lateral, profissionais em COLUNAS na visão diária, cartão posicionado no tempo. ACHADO PRINCIPAL DA DIMENSÃO.** ⬆
  - Evidência: src/components/dashboard/agenda-board.tsx:242-403 (eixo de horas w-14 com hourMarks, colunas flex-1, cartões absolutos com top/height por minuto — 48px por 30min) e src/app/(dashboard)/agenda/page.tsx:393-445 (colunas por profissional na visão Dia, por dia na Semana, expediente vindo de professional_availability :373-380)
- **§7.2.4 Clique em área vazia já abre o cadastro com data, hora e profissional preenchidos** ⬆
  - Evidência: src/components/dashboard/agenda-board.tsx:170-182 (openCreate semeia professionalId/date/startsAt) e :297-314 (botões invisíveis por slot); src/components/dashboard/manual-appointment-sheet.tsx:42-46,140-149 (aplica o seed) e :212-219 (casa o horário clicado com o slot da RPC de disponibilidade)
- **§7.2.2 Alternador Dia | Semana | Mês | Lista** ⬆
  - Evidência: src/app/(dashboard)/agenda/page.tsx:59-66 (VIEWS dia/semana/mes/lista, padrão dia) e :613-625 (4 botões); Dia/Semana renderizam a grade (:771-794), Mês é calendário com contagens agregadas no banco (:796-837, RPC get_agenda_month em supabase/migrations/202607280034_fase2_operacao_diaria.sql:189-222), Lista em :839-940
- **§7.2.3 Filtro de profissional COM FOTO e nome** ⬆
  - Evidência: src/app/(dashboard)/agenda/page.tsx:159 (select inclui avatar_url) e :705-731 (chips com Avatar + AvatarImage + fallback de iniciais + nome)
- **§7.2.1 Cabeçalho da agenda com setas anterior/próximo** ⬆
  - Evidência: src/app/(dashboard)/agenda/page.tsx:627-648 (ChevronLeft/ChevronRight + botão Hoje) com stepDay :573-578 aplicando ±1 dia/semana/mês conforme a visão
- **§7.2.1 Cabeçalho com a data corrente visível** ⬆
  - Evidência: src/app/(dashboard)/agenda/page.tsx:580-589 (headerDate por extenso: dia da semana + dia + mês; intervalo na Semana; mês/ano no Mês) exibido como description do PageHeader em :596-600
- **§7.2 Ação rápida "Iniciar" / estado "Em atendimento"** ⬆
  - Evidência: supabase/migrations/202607280033_fase2_estado_em_atendimento.sql:16 (enum) + 202607280034:46-47,60 (trigger de transições e START_IN_FUTURE); UI: appointment-actions.tsx:44-51 (Iniciar) e :77-92, appointment-detail-sheet.tsx:256-263, badge roxo em appointment-status-badge.tsx:38-42, filtro "Em atendimento" em agenda/page.tsx:53
- **§7.2 Ação rápida "Finalizar e receber" (concluir e capturar o pagamento no mesmo gesto)** ⬆
  - Evidência: src/components/dashboard/appointment-detail-sheet.tsx:265-320 (mini-painel com forma de pagamento e botão "Receber R$X") → src/modules/appointments/actions.ts:294-351 → RPC complete_and_receive_appointment (supabase/migrations/202607280034:699-763) que conclui e grava status='paid' + payment_method + paid_at, com retorno 'covered' para plano
- **§7.2 Ações rápidas Confirmar / Não compareceu / Cancelar, mostrando SOMENTE as válidas para a situação**
  - Evidência: src/components/dashboard/appointment-actions.tsx:5-127 (actionsByStatus por estado + notInFuture) e appointment-detail-sheet.tsx:245-390 (fluxo completo, agora com "Não compareceu" :330-338); resta só a visão Lista dizendo "Não veio" (appointment-actions.tsx:30,63)
- **§7.2 Faixas coloridas por situação (Pendente amarela, Confirmado azul, Concluído verde) no cartão** ⬆
  - Evidência: src/components/dashboard/appointment-status-badge.tsx:57-64 (APPOINTMENT_STRIPE com tokens semânticos: warning/info/success/purple/destructive/neutral) aplicado como border-l-4 + fundo no cartão em agenda-board.tsx:351-357
- **§7.2 Concluído aparece verde COM o valor recebido** ⬆
  - Evidência: src/app/(dashboard)/agenda/page.tsx:234 (price no select) e :264-280 (valor real da financial_transaction para dono/gerente); agenda-board.tsx:371-375 exibe formatBRL em text-success no cartão concluído; nota: cartão compacto (<52px, serviços de ~30min) omite o valor na grade, mas o detalhe mostra (detail-sheet:212-217)
- **§7.2 Bloqueios, almoço e folga com fundo hachurado e texto** ⬆
  - Evidência: src/app/(dashboard)/agenda/page.tsx:382-391 (query em schedule_blocks na janela) e :449-488 (recorte por coluna/dia); agenda-board.tsx:317-333 (repeating-linear-gradient 45° + rótulo do motivo ou "Bloqueado") e :267-280 (fora do expediente apagado); ressalva documentada: Semana sem filtro de profissional omite bloqueios de propósito (page.tsx:458-465)
- **§7.2.5 Painel lateral: buscar cliente por nome ou WhatsApp**
  - Evidência: src/components/dashboard/manual-appointment-sheet.tsx:296-328 (Input com datalist nome · telefone, confirmação visual do selecionado)
- **§7.2.5 Painel lateral: escolher serviço, profissional, data e hora**
  - Evidência: src/components/dashboard/manual-appointment-sheet.tsx:352-427 (serviço e profissional filtrado por quem executa) e :429-507 (14 dias + slots da mesma RPC da página pública)
- **§7.2.5 Botão "Salvar agendamento"** ⬆
  - Evidência: src/components/dashboard/manual-appointment-sheet.tsx:533 — rótulo agora é exatamente "Salvar agendamento"
- **§7.1.1 Cabeçalho do Início: saudação curta**
  - Evidência: src/app/(dashboard)/dashboard/page.tsx:509 — `Olá, ${tenant.profileName.split(" ")[0]}!`
- **§7.1.1 Cabeçalho do Início: data** ⬆
  - Evidência: src/app/(dashboard)/dashboard/page.tsx:495-508 — eyebrow do PageHeader é a data por extenso no fuso do tenant (dia da semana, dia e mês, capitalizada)
- **§7.1.1 Cabeçalho do Início: botão dourado "+ Novo"** ⬆
  - Evidência: src/app/(dashboard)/dashboard/page.tsx:519-536 — ManualAppointmentSheet no action do cabeçalho, cujo trigger é Button primário "Novo agendamento" (manual-appointment-sheet.tsx:255-261); o primário é o dourado do tema (globals.css:99 #9a5b00 / :163 #f2b84b). Rótulo difere do literal "+ Novo", mesma função
- **§7.1.1 Cabeçalho do Início: botão secundário "Página de agendamento"** ⬆
  - Evidência: src/app/(dashboard)/dashboard/page.tsx:514-518 — Button outline "Página de agendamento" para /{tenant.slug}/agendar com target=_blank
- **§7.1.2 EXATAMENTE quatro indicadores** ⬆
  - Evidência: src/app/(dashboard)/dashboard/page.tsx:440-489 — array metrics com exatamente 4 para quem vê financeiro (Dinheiro recebido hoje, Atendimentos de hoje, Valores a receber, Pendências); os 8 cartões antigos (revenueCards + metrics duplicados) não existem mais no arquivo
- **§7.1.2 Indicador "Dinheiro recebido hoje"**
  - Evidência: src/app/(dashboard)/dashboard/page.tsx:449-464 — agora com comparação contra ontem (deltaToday :437) e seta de tendência :559-563
- **§7.1.2 Indicador "Atendimentos de hoje"**
  - Evidência: src/app/(dashboard)/dashboard/page.tsx:465-470 — scheduled.length com hint "N já concluídos"; contagem agora exclui faltas (:388-390)
- **§7.1.2 Indicador "Valores a receber"**
  - Evidência: src/app/(dashboard)/dashboard/page.tsx:471-480 — receivable do income_summary (:430) + contagem de lançamentos em aberto (:117-124,431), link /financeiro#a-receber
- **§7.1.4 Corpo em duas colunas (esquerda maior com a agenda, direita com o resultado do mês)** ⬆
  - Evidência: src/app/(dashboard)/dashboard/page.tsx:613-614 — grid lg:grid-cols-3 com coluna esquerda lg:col-span-2 (Agenda de hoje + Lembretes de amanhã) e direita :742-837 (Resultado do mês + Clientes para chamar)
- **§7.1.4 Coluna esquerda: agenda de hoje e próximos horários** ⬆
  - Evidência: src/app/(dashboard)/dashboard/page.tsx:614-740 — card "Agenda de hoje" (8 itens, hora/cliente/serviço·profissional/badge, subtítulo "Próximo às HH:MM") e "Lembretes de amanhã" com wa.me, ambos dentro da coluna esquerda
- **§7.1.4 Coluna direita: resultado do mês com total vendido, despesas e lucro** ⬆
  - Evidência: src/app/(dashboard)/dashboard/page.tsx:743-777 — card "Resultado do mês" com Total vendido, Despesas pagas e Lucro (caixa) vindos do income_summary já carregado (:110-116,427-429), com legenda honesta "Do dia 1 até hoje"
- **§7.1.5 Bloco "Clientes para chamar" com nome, dias sem vir, serviço habitual e botão "Chamar no WhatsApp"** ⬆
  - Evidência: src/app/(dashboard)/dashboard/page.tsx:229-266 (get_client_insights segmento para_chamar, limite 4, com days_since/top_service — RPC real em 202607280034:787-820) e :779-836 (nome linkado ao perfil, "N dias sem vir · serviço", botão "Chamar" com wa.me montado por returnMessage, lib/whatsapp.ts:95)
- **§7.1 Remover: bloco "Acesso rápido" que repete o menu** ⬆
  - Evidência: Busca grep -rn "quickLinks|Acesso rápido" em src/ → zero resultados; dashboard/page.tsx (864 linhas) não tem o bloco nem os imports de ícones que só ele usava
- **§7.1 Remover: vários cartões que mostram quase a mesma receita** ⬆
  - Evidência: Só "Dinheiro recebido hoje" resta (dashboard/page.tsx:449-464); grep "Recebido na semana|Recebido no mês" em src/ só encontra a landing /salao (src/app/salao/page.tsx:282), nunca o dashboard; a duplicata Atendimentos/Clientes agendados também sumiu
- **§7.1 Remover: gráficos meramente decorativos**
  - Evidência: dashboard/page.tsx não importa nenhum componente de gráfico; MonthlyRevenueChart segue restrito a /financeiro e ao relatório de impressão
- **§5.6 Selos de situação: cores invertidas (guia manda Não compareceu = Cinza, Cancelado = Vermelho) e sem ícone** •novo
  - Evidência: src/components/dashboard/appointment-status-badge.tsx:36-46 — canceled agora é tone danger (vermelho) e no_show tone neutral (cinza), cada situação com ícone (Clock/CalendarCheck/PlayCircle/CircleCheck/CircleX/UserX) renderizado em :81-87; comentário do arquivo (:17-24) documenta a correção citando a auditoria
- **Bug do cartão "Próximo horário" do Início: mostrava o primeiro do dia, não o próximo** •novo
  - Evidência: src/app/(dashboard)/dashboard/page.tsx:392-401 — nextAppointment = primeiro com Date.parse(startsAt) >= nowMs e status pending/confirmed/in_progress; exibido como "Próximo às HH:MM — cliente" no cabeçalho da Agenda de hoje (:621-632)
- **§7.2 Objetivo declarado: enxergar horários LIVRES, ocupados e pendentes — a agenda não consultava disponibilidade** •novo
  - Evidência: src/app/(dashboard)/agenda/page.tsx:373-380 (consulta professional_availability para a grade) e agenda-board.tsx:267-280 (fora do expediente pintado de bg-muted/50): dentro do expediente, célula vazia = horário livre, clicável com affordance de + (:297-314); ocupados são os cartões coloridos e pendentes têm faixa amarela
- **§7.2.1 Botão "Novo agendamento" do cabeçalho da agenda (nunca classificado na rodada 1) + fallback do papel professional** •novo
  - Evidência: Para a equipe que agenda, o botão primário vive na barra da grade (agenda-board.tsx:186-212, abre o ManualAppointmentSheet); para o papel professional o cabeçalho mostra "Novo agendamento" apontando à página pública em nova aba (agenda/page.tsx:601-609) — fallback agora explícito e funcional, não mais um beco
- **§5.4 aplicado aos demais indicadores do Início: sem período e sem comparação em Atendimentos hoje, A receber, Concluídos hoje e Próximo horário** •novo
  - Evidência: src/app/(dashboard)/dashboard/page.tsx:440-489 — cada um dos 4 indicadores tem rótulo com período ("hoje") e linha de contexto: recebido com delta vs ontem + seta (:449-463,558-564), atendimentos com "N já concluídos" (:468), a receber com "N lançamentos em aberto" (:476); os cartões soltos "Concluídos hoje" e "Próximo horário" deixaram de ser indicadores
- **Contagem "Atendimentos hoje" incluía faltas (no_show entrava no número do dia)** •novo
  - Evidência: src/app/(dashboard)/dashboard/page.tsx:386-390 — scheduled filtra status !== "canceled" E status !== "no_show", com comentário citando o bug antigo

### Parcial (5)

- **§7.2 Produto reservado aparece DENTRO do atendimento, não em uma fila separada** ⬆
  - Evidência: src/app/(dashboard)/agenda/page.tsx:284-302 (busca appointment_products por atendimento) + appointment-detail-sheet.tsx:218-229 (linha "Produtos reservados N · R$"); fila separada persiste em agenda/page.tsx:735-769
  - O que falta: A reserva agora aparece dentro do atendimento (contagem e total no detalhe), mas a fila separada "Vendas de produto a confirmar" continua no topo da agenda (page.tsx:735-769) — exatamente o card que o guia mandou remover — e a confirmação continua fora do atendimento (o detalhe manda ir a Produtos e Estoque, detail-sheet:238-243).
- **§7.2.5 Painel lateral: resumo de duração e valor**
  - Evidência: src/components/dashboard/manual-appointment-sheet.tsx:387 (duração só no rótulo da opção "· X min"); preço segue sem existir: agenda/page.tsx:180 e dashboard/page.tsx:274 selecionam apenas id,name,duration_minutes e ServiceOption não tem price (sheet:34)
  - O que falta: Continua sem bloco de resumo antes do botão (o form vai de observação direto ao submit, :510-535) e o VALOR do serviço nem é buscado — quem lança manual não vê quanto vai cobrar.
- **§7.1.2 Indicador "Pendências"** ⬆
  - Evidência: src/app/(dashboard)/dashboard/page.tsx:432-435 (pendingCount = soma dos actionItems) e :481-488 (cartão com href #precisa-atencao, âncora :579-583); contaminação via :161,172-183
  - O que falta: O cartão existe e soma os 5 alertas com link para #precisa-atencao, mas o número pode sair ERRADO: um dos somandos (estoque baixo) vem da RPC get_product_stock, que não existe no banco (ver item do bloco de atenção) — todo produto com estoque mínimo configurado conta como pendência mesmo com estoque cheio, inflando o total.
- **§7.1.3 Bloco "Precisa da sua atenção" com os 5 tipos** ⬆
  - Evidência: src/app/(dashboard)/dashboard/page.tsx:161,172-183,195-226; ausência provada por grep -rn "get_product_stock" /home/user/barbearia-saas/supabase /home/user/barbearia-saas/docs → sem resultados
  - O que falta: FACHADA no alerta de estoque: os 5 tipos estão renderizados (:195-226), mas "Produtos abaixo do estoque mínimo" chama supabase.rpc("get_product_stock") (:161) e essa função NÃO EXISTE em nenhuma migration (grep -rn get_product_stock em supabase/ e docs/ → zero resultados; /produtos usa a view product_stock_balances, produtos/page.tsx:81). A RPC falha silenciosamente, o saldo vira 0 para todos e o alerta dispara para QUALQUER produto ativo com minimum_stock > 0 — número com cara de real, mas errado. O mesmo bug atinge /vendas (vendas/page.tsx:39). Os outros 4 alertas são reais (count_clients_to_call, reservas pendentes, count_memberships_attention em 202607280034:1073-1099, contas vencidas).
- **§5.5 Listas: clicar na linha abre detalhes do atendimento na agenda** •novo
  - Evidência: src/components/dashboard/agenda-board.tsx:344-358 (cartão-botão) e :408-416 (AppointmentDetailSheet); visão Lista sem clique em agenda/page.tsx:844-923
  - O que falta: Nas visões Dia/Semana (padrão) o cartão inteiro é um botão que abre o AppointmentDetailSheet com todas as ações. Na visão Lista a linha continua uma div sem clique (agenda/page.tsx:846-850) — só o nome do cliente linka (ao perfil, não ao atendimento) e o detail sheet não é alcançável dali; as ações ficam inline como antes.

### Verificação adversarial: confiavel com ressalvas

- **Achado adicional** — Visão Semana da agenda sem filtro de profissional: atendimentos de profissionais diferentes no MESMO horário são desenhados um em cima do outro (agenda-board.tsx:336-383 — posicionamento absoluto por top/height com inset-x-1, sem divisão em raias/lanes e sem indicador de '+N'); o cartão renderizado por último cobre e torna inclicável o de baixo, então uma equipe de 3 com dois cortes às 09:00 vê só um deles na Semana. A visão Dia não sofre disso (colunas por profissional + exclusion constraint impedem sobreposição). Limitação real não registrada pelo reauditor — não derruba o status do alternador Dia/Semana/Mês/Lista, mas merece registro.

---

## Telas Clientes e Planos (§7.3, §7.4) + pilar G2

A dimensão foi a que mais avançou de verdade: o perfil do cliente (/clientes/[id]) existe e as 5 abas têm conteúdo real vindo de 4 RPCs novas (get_client_insights v3 com p_client_id, get_client_history, get_client_payments, get_membership_overview por cliente) — nada é placeholder. A lista de /clientes ganhou os 3 indicadores do topo (incluindo "Planos vencendo" com fonte real count_memberships_attention), os segmentos Assinantes/Inadimplentes entraram na RPC e na tela, a situação do plano aparece por linha com os 4 estados do §7.4 (inclusive o due_soon amarelo que não existia no modelo), e o gasto do assinante deixou de ser R$0 (mensalidade e venda de balcão entram no total_spent via financial_transactions pagas). Cadastro virou painel lateral com edição por linha e no perfil, o nome da linha virou link para o perfil, e o vocabulário mudou de "telefone" para "WhatsApp". Não encontrei fachada nesta dimensão: tudo que tem cara de pronto chama RPC real e a RPC existe na migration 202607280034. O que restou pendente é honesto: /planos continua na seção de catálogo (não "dentro de Clientes" como o guia manda), o catálogo de planos segue sem quantidade de assinantes e receita mensal, a lista de assinantes segue sem último pagamento/serviços restantes/extras, e o corte silencioso em 500 contratos sem busca nem paginação permanece.

### Atendido (22)

- **§7.3.1 Cabeçalho com "Clientes" e botão "Novo cliente" (também listado no §5 do guia, linha 58)** ⬆
  - Evidência: src/app/(dashboard)/clientes/page.tsx:256-261 — PageHeader com action={<ClientFormSheet />}; o sheet abre com botão "Novo cliente" (src/components/dashboard/client-form-sheet.tsx:40-44)
- **§7.3.2 Três indicadores: Clientes ativos, Clientes para chamar, Planos vencendo** ⬆
  - Evidência: src/app/(dashboard)/clientes/page.tsx:198-217 (os 3 cards, cada um com link) e 273-291 (render); fontes reais: count exato de clients ativos (:156-160), count_clients_to_call (:161) e count_memberships_attention criada em supabase/migrations/202607280034_fase2_operacao_diaria.sql:1073-1096 (due_soon + past_due)
- **§7.3.3 Busca "Buscar por nome ou WhatsApp" — funcionando por telefone**
  - Evidência: src/app/(dashboard)/clientes/page.tsx:328-334 — placeholder e aria-label agora dizem "Buscar por nome ou WhatsApp"; busca por dígitos segue real na RPC (202607280034:842 e 992-995). Permanece o piso de 4 dígitos (:994), detalhe cosmético já apontado na rodada 1
- **§7.3.4 Filtros rápidos: Todos, Para chamar, Assinantes, Inadimplentes, Sem voltar há 60 dias** ⬆
  - Evidência: src/app/(dashboard)/clientes/page.tsx:30-63 (chips, incluindo assinantes:37-41 e inadimplentes:42-46) e 294-313 (render); a RPC v3 aceita e filtra os dois segmentos novos (202607280034:836-837 e 1012-1013: assinantes = membership ativa/pausada, inadimplentes = past_due), com ordenação própria por vencimento (:1038-1039)
- **§7.3.5 Lista com nome, WhatsApp, último atendimento, dias sem vir, gasto médio, profissional habitual, situação do plano, botão WhatsApp** ⬆
  - Evidência: src/app/(dashboard)/clientes/page.tsx:349-472 — nome como link (:352-357), telefone (:358-361), última visita + dias (:377-384), gasto total e médio (:394-402), profissional habitual (:414-424), situação do plano por linha via badge (:364-366, membershipStatusMeta com 4 estados) e botão WhatsApp (ClientContactActions :446-452, que abre wa.me e registra o contato)
- **§7.3 Perfil do cliente: página/rota individual com abas Resumo / Histórico / Plano / Valores / Observações e cabeçalho com gasto total, gasto médio, próximo retorno, profissional habitual, "Chamar no WhatsApp" e "Novo agendamento"** ⬆
  - Evidência: src/app/(dashboard)/clientes/[id]/page.tsx — rota existe; cabeçalho com os 4 números (:167-197, :253-273) e os 2 botões (:214-227); as 5 abas (client-profile-tabs.tsx:26-59) têm conteúdo real: Resumo (:277-319), Histórico via get_client_history com data/serviço/profissional/valor/status (:320-386), Plano via get_membership_overview com uso e "restam N" (:387-459), Valores via get_client_payments unindo serviço+balcão+plano (:460-498), Observações com edição (:499-526). RPCs reais em 202607280034:1105-1311. Nota menor: "Novo agendamento" leva a /agenda?view=dia sem pré-preencher o cliente
- **§7.3 Cadastro em PAINEL LATERAL — "O formulário não deve ficar aberto permanentemente"** ⬆
  - Evidência: src/components/dashboard/client-form-sheet.tsx:23-61 (Sheet com ClientForm dentro); o grid xl:grid-cols-[360px_1fr] sumiu de src/app/(dashboard)/clientes/page.tsx — a lista ocupa a largura inteira (Card único :315) e o form só existe dentro do sheet
- **§7.3 Cadastro — edição de cliente existente (implícito no formulário com nome/WhatsApp/e-mail/observação)** ⬆
  - Evidência: src/components/dashboard/client-form.tsx:30-107 aceita client opcional com defaultValues; botão "Editar" em cada linha (clientes/page.tsx:454-463) e no perfil (aba Observações, [id]/page.tsx:503-512); saveClient faz update quando há id (src/modules/clients/actions.ts:38-44). Detalhe cosmético: o toast de sucesso diz "Cliente adicionado." mesmo na edição (actions.ts:52)
- **§7.4 Cores de situação com texto junto: Ativo verde, Vence em breve amarelo, Vencido vermelho, Pausado cinza** ⬆
  - Evidência: O quarto estado due_soon foi criado no modelo (202607280034:1205-1210 e :975-981) e a pintura segue o guia: src/app/(dashboard)/planos/page.tsx:202-210 (Vencido=danger, Pausado=neutral, Vence em breve=warning, Em dia=success, sempre com texto) e src/lib/memberships.ts:16-24 centraliza os tons usados também em /clientes e no perfil; variantes reais no badge.tsx:29-33
- **G2 — "Histórico de serviços" por cliente** ⬆
  - Evidência: Aba Histórico do perfil ([id]/page.tsx:320-386): lista dos últimos 30 atendimentos com data/hora, serviço, profissional, valor (ou "Coberto pelo plano" com coroa, :355-358), forma de pagamento/a receber e badge de status; RPC get_client_history real em 202607280034:1105-1156, com join em membership_usage para marcar cobertura
- **G2 — "Profissional preferido"**
  - Evidência: RPC v3 mantém o subselect por count de concluídos (202607280034:1025-1029); exibido na lista (clientes/page.tsx:414-424) e agora também no cabeçalho do perfil ([id]/page.tsx:191-196)
- **G2 — "Frequência e intervalo habitual entre as visitas" (diferencial comercial central; verificar se é análise real ou só último atendimento)**
  - Evidência: Segue análise real: mediana via percentile_cont sobre lag() de visitas concluídas (202607280034:845-862) com clamp 5-180 dias (:947-950). O reparo da rodada 1 foi resolvido: a aba Resumo do perfil agora explica ao dono "Intervalo habitual: a cada ~N dias" e "Confiança da previsão" ([id]/page.tsx:295-316)
- **G2 — "Lista de clientes próximos de voltar ou há muito tempo sem comparecer"**
  - Evidência: Segmentos proximos/atrasados/para_chamar/sem_voltar_60 preservados na RPC v3 (202607280034:1003-1011) e nos chips (clientes/page.tsx:47-61)
- **G2 — "Mensagem simples para reativação pelo WhatsApp"**
  - Evidência: returnMessage/reminderWhatsAppHref em src/lib/whatsapp.ts, usados na lista (clientes/page.tsx:225-233) e no perfil ([id]/page.tsx:144-152); o clique registra o contato (client-contact-actions.tsx:40-46)
- **G2 — "Controle de planos, assinantes, serviços utilizados e data de renovação" integrado à gestão de clientes** ⬆
  - Evidência: A integração pedida existe: etiqueta de plano por linha da lista (clientes/page.tsx:364-366), segmentos Assinantes/Inadimplentes (:37-46), aba Plano no perfil com período vigente, uso por serviço e "restam N" ([id]/page.tsx:387-459) e indicador "Planos vencendo" no topo (:212-216). A posição de /planos no menu segue tratada no item §7.4 próprio
- **[novo] Correção do "gasto" para assinantes — agregados financeiros sobrevivendo à Fase 4B (gasto do assinante ≠ R$0)** •novo
  - Evidência: 202607280034:870-913 — paid_entries agora une 3 fontes: receita de atendimento, mensalidade do plano (via membership_payments → financial_transactions com status='paid', imune a estorno) e venda de balcão identificada; sem duplicação (transações de plano têm appointment_id nulo). O perfil rotula com honestidade: "Gasto total — Atendimentos, produtos e plano" ([id]/page.tsx:169-172)
- **[novo] /clientes sem checagem de permissão e engolindo erro da RPC em silêncio** •novo
  - Evidência: clientes/page.tsx:119-133 — can(tenant.role, "clients:manage") com tela de acesso restrito; erro da RPC agora é logado (:171-178), exibe Alert destrutivo (:263-271) e o EmptyState distingue "Não foi possível carregar a lista" de "Nenhum cliente cadastrado" (:513-531). O perfil também checa permissão ([id]/page.tsx:103)
- **[novo] Promessa quebrada da fase 3 — segmentos Assinantes/Inadimplentes adiados e nunca entregues** •novo
  - Evidência: Entregue na 202607280034:776-777 (o comentário admite a dívida), :836-837 e :1012-1013 (filtros na RPC) + chips na tela (clientes/page.tsx:37-46); inadimplentes ordena por vencimento (:1038-1039)
- **[novo] Vocabulário WhatsApp exigido pelo guia — UI dizia "telefone"** •novo
  - Evidência: src/components/dashboard/client-form.tsx:74 — Label agora é "WhatsApp" (com MaskedInput de telefone); busca com placeholder e aria-label "Buscar por nome ou WhatsApp" (clientes/page.tsx:332-333); agenda idem (agenda/page.tsx:669)
- **[novo] "Planos vencendo" como alerta no dashboard (bloco Precisa da sua atenção)** •novo
  - Evidência: src/app/(dashboard)/dashboard/page.tsx:154-159 chama count_memberships_attention e :208-213 exibe "Planos vencendo ou vencidos" com contagem, link para /clientes?segmento=inadimplentes e CTA "Cobrar assinantes"; entra no bloco só quando count > 0 (:226)
- **[novo] Crédito não dado na rodada 1 — consumo automático do benefício do plano na conclusão do atendimento** •novo
  - Evidência: O diferencial segue real e agora é visível ao dono: trigger sync_completed_appointment_income consome o benefício e grava membership_usage sem intervenção manual, devolvendo o uso ao desfazer a conclusão (202607240029:591-658); a UI mostra "Coberto pelo plano" no histórico do perfil ([id]/page.tsx:355-358) e o uso por período na aba Plano e em /planos
- **[novo] Bloqueio prático da tela de clientes — nome da linha sem link, nenhuma navegação para o cliente** •novo
  - Evidência: clientes/page.tsx:352-357 — o nome virou <Link href="/clientes/${row.id}"> para o perfil; a agenda também linka o cliente do agendamento para o perfil (agenda/page.tsx:860-865); o grid fixo de 360px que espremia a lista foi removido

### Parcial (3)

- **§7.4 "Esta área deve ficar dentro de Clientes, não como item de menu separado"** ⬆
  - Evidência: src/lib/navigation.ts:49-64 + src/app/(dashboard)/planos/page.tsx:166 (SectionNav section="catalogo")
  - O que falta: /planos continua morando na seção de catálogo (SECTION_NAV.catalogo em src/lib/navigation.ts:49-64, ao lado de Serviços/Produtos/Vendas), não dentro da área de Clientes. O que melhorou: o plano agora permeia Clientes de verdade — badge por linha, segmentos Assinantes/Inadimplentes, aba Plano no perfil com link "Gerenciar em Planos de clientes" ([id]/page.tsx:448) e indicador "Planos vencendo". Falta o inverso: /planos não tem link para o perfil do cliente (client_name é texto puro em planos/page.tsx:188) e a rota segue apresentada como parte do catálogo
- **§7.4 Lista de planos: nome, valor, serviços incluídos, limite, quantidade de assinantes, receita mensal, situação**
  - Evidência: src/app/(dashboard)/planos/page.tsx:272-359 — tabela "Catálogo de planos" com colunas Plano, Preço, Incluídos (com limite N×), Situação; nenhuma coluna de assinantes ou receita
  - O que falta: Seguem faltando as duas colunas de negócio: quantidade de assinantes por plano e receita mensal (normalizada por período). A página já tem os dados em mãos (memberships carrega plan_id e price em planos/page.tsx:115) e não agrega. grep por "assinante|receita" em planos/page.tsx só encontra textos de descrição (:146, :264)
- **§7.4 Lista de assinantes: cliente, plano, vencimento, pagamento, serviços usados, serviços restantes, extras, botão "Cobrar no WhatsApp"/"Renovar plano"**
  - Evidência: src/app/(dashboard)/planos/page.tsx:168-270 — cliente+telefone (:187-192), plano+preço+período (:193-199), vencimento "até dd/mm" (:211-214), uso used/limit (:229-246), Cobrar no WhatsApp quando vencido (:215-227) e Renovar/pausar/cancelar (membership-actions.tsx:53-151)
  - O que falta: Continuam ausentes na tabela de /planos: último pagamento (método + data), "serviços restantes" explícito (só o formato used/limit; o "restam N" foi para o perfil do cliente, [id]/page.tsx:433-440, não para cá) e extras (atendimentos do período fora do plano — nada calcula isso). A RPC get_membership_overview (202607280034:1162-1247) não devolve pagamento nem extras

### Não atendido (1)

- **[novo] Lista de assinantes sem busca, filtro ou paginação — corte silencioso em 500 contratos** •novo
  - Evidência: supabase/migrations/202607280034_fase2_operacao_diaria.sql:1241 + src/app/(dashboard)/planos/page.tsx:93-97 e 173-258
  - O que falta: Nada mudou: get_membership_overview segue com limit 500 fixo (202607280034:1241) e /planos renderiza tudo que vier sem busca, filtro, paginação ou aviso de corte (planos/page.tsx:173-258). O mesmo padrão vale para o select de clientes do sheet de venda (.limit(500) em planos/page.tsx:92). Impacto baixo no porte atual do produto, mas o corte continua invisível

### Verificação adversarial: confiavel com ressalvas

- **Achado adicional** — Caminho de erro do perfil do cliente engole falha de RPC: src/app/(dashboard)/clientes/[id]/page.tsx:133-138 não checa error de nenhuma das 4 RPCs — erro em get_client_insights vira notFound() (404 para um cliente que existe) e erro em get_client_history/get_client_payments/get_membership_overview renderiza empty states honestos-na-aparência ('Nenhum atendimento ainda', 'Nada recebido ainda') para um cliente com histórico. É o mesmo padrão §0.16 corrigido em /clientes (page.tsx:171-178) e repetido na tela nova. Não derruba o status do item (as abas têm conteúdo real e as RPCs são chamadas de verdade), mas é caminho feliz pronto com caminho de erro mentiroso.
- **Achado adicional** — Número que não bate com a tela de destino: o indicador 'Planos vencendo' em /clientes (clientes/page.tsx:212-216) e o alerta 'Planos vencendo ou vencidos' do dashboard (dashboard/page.tsx:208-213) somam due_soon + past_due, mas ambos linkam para /clientes?segmento=inadimplentes, que só filtra past_due (202607280034:1013). Com N planos a vencer e 0 vencidos, o card mostra N e o clique abre lista vazia ('Ninguém neste grupo agora'). O hint do card em /clientes até detalha a composição, o que atenua, mas o CTA 'Cobrar assinantes' do dashboard promete uma lista que pode vir vazia.

---

## Tela Financeiro (§7.5) + pilar G3

O Financeiro foi genuinamente reconstruído: a página de 904 linhas virou 6 seções internas reais (finance-nav + _sections/), com filtro de período com intervalo livre (lib/dates/period.ts) que sobrevive à troca de seção, e as rotas antigas (/comissoes, /contas-a-pagar, /contas-a-receber, /relatorios) redirecionam. O gráfico do §7.5 existe de verdade (cash-flow-chart: recebido verde, despesas coral, período anterior tracejado, alimentado pela RPC cash_flow_series), o mapa de calor foi entregue com alternativa textual, e o fechamento de comissões ganhou total produzido, vale/adiantamento, valor a pagar calculado no banco (commission_summary) e lucro que provisiona comissão (profit_after_commissions sem dupla contagem de salário pago). Os quatro buracos críticos da rodada 1 foram fechados no banco: fiado agora gera receita pendente via trigger + backfill, receivable_period respeita a janela, a lista A receber é paginada com contagem exata, e /relatorios soma via RPC em vez de varrer 1000 linhas. Continuam pendentes: tooltip no gráfico, top de clientes que mais gastam, pagamento parcial de recebível, CSV, PDF real (ainda é window.print só do mês corrente) e a unificação de rótulos (Receber pagamento/Marcar como pago/Registrar pagamento continuam trocados entre módulos). A venda de balcão existe e é sólida (carrinho, desconto, cliente, estoque e financeiro numa transação), mas só vende produtos — sem serviços nem acréscimo — e não é linkada da seção Caixa. Fachadas: nenhuma grave; o resquício é employee-pay-card.tsx, que ficou órfão (ninguém importa) após o commission-closing-card assumir, e o fiado aparece duplicado nas duas listas da mesma seção A receber. Percentual calculado como itens plenamente ATENDIDOS sobre 43 aplicáveis (23/43); com PARCIAL valendo meio ponto seria ~71%.

### Atendido (22)

- **§7.5 Navegação interna: abas Resumo / Caixa e vendas / Despesas / A receber / Comissões / Relatórios dentro do Financeiro** ⬆
  - Evidência: src/components/dashboard/finance-nav.tsx:4-11 (as 6 seções) e src/app/(dashboard)/financeiro/page.tsx:80-137 (render por seção); rotas antigas redirecionam (src/app/(dashboard)/comissoes/page.tsx:11, contas-a-pagar, contas-a-receber, relatorios); menu lateral com item único /financeiro (src/lib/navigation.ts:19)
- **§7.5 Resumo: filtro de período no topo (intervalo livre data inicial/final)** ⬆
  - Evidência: src/lib/dates/period.ts:108-133 (de/ate livres com precedência sobre preset, fuso do tenant) e :18-24 (atalhos Hoje/Semana/Mês/Mês passado/30d); src/components/dashboard/period-filter.tsx:56-97 (form GET sem JS, campos date); período propagado a todas as seções em financeiro/page.tsx:67-137
- **§7.5 Resumo: gráfico principal com recebido em verde, despesas em coral e período anterior tracejado em cinza** ⬆
  - Evidência: src/components/dashboard/cash-flow-chart.tsx:67-76 (--in verde #047857, --out coral #c2453a, --prev cinza) e :163-172 (path tracejado do período anterior); dados via RPC cash_flow_series (supabase/migrations/202607280035_fase3_gestao.sql:508-536) com janela anterior de mesma duração (src/app/(dashboard)/financeiro/_sections/shared.ts:29-83)
- **§7.5 Gráfico: SVG próprio com legenda**
  - Evidência: src/components/dashboard/cash-flow-chart.tsx:78-107 (legenda com quadradinhos + linha tracejada de amostra) e :109-113 (SVG server-side com role=img e aria-label com os totais)
- **§7.5 Segunda linha: vendas por profissional em barras**
  - Evidência: src/app/(dashboard)/financeiro/_sections/caixa.tsx:353-369 (BarList 'Profissionais por vendas') + tabela detalhada :372-448; agora agregado no banco via revenue_breakdown e respeitando o período. Nota: mudou de lugar — vive na seção 'Caixa e vendas', não no Resumo
- **§7.5 Rodapé: serviços mais vendidos**
  - Evidência: src/app/(dashboard)/financeiro/_sections/caixa.tsx:319-335 (BarList top 5 com valor + contagem) + tabela completa :451-485, agregado no banco por revenue_breakdown respeitando o período
- **§7.5 Rodapé: dias e horários mais movimentados (mapa de calor)** ⬆
  - Evidência: RPC appointment_heatmap agrega no banco e no fuso do tenant (202607280035_fase3_gestao.sql:547-573); src/components/dashboard/occupancy-heatmap.tsx:80-176 (grade 7 dias × horas + alternativa textual 'Melhores horários'/'Horários mais vazios' exigida pelo §6.2); usado em relatorios.tsx:185-199 com mínimo de 90 dias de histórico
- **§7.5 Despesas: primeira linha pedindo só descrição, valor e vencimento**
  - Evidência: src/components/dashboard/expense-form.tsx:58-85 — exatamente três campos visíveis ('O que foi', 'Valor', 'Vencimento'); o resto vive atrás do disclosure. Formulário agora é dedicado a despesa (não mais compartilhado com A receber)
- **§7.5 A receber: mostrar cliente/devedor** ⬆
  - Evidência: src/components/dashboard/receivable-form.tsx:61-79 (seletor 'De quem' grava clientId); src/modules/bills/actions.ts:71-74 (client_id no insert); src/components/dashboard/receivables-list.tsx:74-76 (nome do cliente como linha principal, 'Sem cliente vinculado' quando falta); índice em 202607280035_fase3_gestao.sql:195-197
- **§7.5 A receber: botão "Cobrar no WhatsApp"** ⬆
  - Evidência: src/components/dashboard/receivables-list.tsx:45-52 (mensagem pré-preenchida com nome, valor, referência e vencimento via whatsAppHref) e :99-106 (botão 'Cobrar no WhatsApp' por linha); só aparece quando há cliente com telefone — degradação honesta
- **§7.5 Comissões: filtro de período** ⬆
  - Evidência: A seção Comissões recebe o mesmo ResolvedPeriod do filtro global (financeiro/page.tsx:122-129), que aceita intervalo livre de/até (period.ts:118-133) — quinzena e semana agora fecham na tela; vales e pagamentos são recortados pela mesma janela (comissoes.tsx:76-91)
- **§7.5 Comissões: total produzido por profissional** ⬆
  - Evidência: commission_summary devolve produced, produced_products e produced_total calculados no banco sobre o preço congelado (202607280035_fase3_gestao.sql:241-252,363-368); exibido como 'Total produzido' com quebra serviços/produtos/recebido (commission-closing-card.tsx:117-122) e no card agregado 'Produzido pela equipe' (comissoes.tsx:142-147)
- **§7.5 Comissões: comissão calculada**
  - Evidência: Regra de precedência preservada e agora CONGELADA na conclusão (freeze_appointment_commission, 202607280030_fase0_correcoes.sql:125-175: taxa do serviço quando > 0, senão a do profissional; NULL cai na vigente); cálculo no banco em commission_summary (202607280035:245-266) em vez de laço com .limit(3000) no cliente
- **§7.5 Comissões: adiantamentos** ⬆
  - Evidência: Tabela employee_advances (202607280035_fase3_gestao.sql:51-70); registerEmployeeAdvance cria a despesa paga na hora e desfaz se o vale falhar (payroll/actions.ts:162-234); abatido do to_pay no banco (202607280035:346-353,380-389); UI 'Dar vale' no fechamento (commission-closing-card.tsx:244-319) e tabela 'Vales do período' (comissoes.tsx:256-299)
- **VERDADE FINANCEIRA (G3): o sistema distingue Total vendido (competência) de Dinheiro recebido (caixa)**
  - Evidência: income_summary: sold por created_at, received por paid_at (202607280035_fase3_gestao.sql:431-444); agora com card didático 'Como ler estes números' explicando a diferença em língua simples (resumo.tsx:213-234)
- **VERDADE FINANCEIRA (G3): o lucro desconta despesas E comissões** ⬆
  - Evidência: 202607280035_fase3_gestao.sql:467-494 — commissions_accrued (comissão apurada no período) e profit_after_commissions = received − expenses_paid + salary_paid − commissions_accrued (a devolução de salary_paid evita descontar a equipe duas vezes); exibido como card 'Lucro depois da comissão' com a comissão apurada no hint (resumo.tsx:138-145), ao lado do 'Lucro de caixa' honesto
- **G3: faturamento por dia, semana e mês, com comparação entre períodos** ⬆
  - Evidência: Presets Hoje/Semana/Mês/Mês passado/30d + intervalo livre (period.ts:18-24,118-133); janela anterior de MESMA duração (period.ts:95-98); comparação percentual nos cards (resumo.tsx:95-99,107-130) E a série anterior tracejada no gráfico (cash-flow-chart.tsx:163-172), com bucket dia/mês automático (shared.ts:13-19)
- **[NOVO — rodada 1 não classificou] Fiado/convênio de /contas-a-receber fora de todos os indicadores do Financeiro (buraco G3)** •novo
  - Evidência: Trigger sync_receivable_transaction cria a receita pendente junto do recebível (202607280030_fase0_correcoes.sql:694-752), com backfill que preserva created_at para não inflar o mês da migração (:756-786); a baixa liquida a MESMA receita via settle_receivable sem duplicar (:791-847, chamada em bills/actions.ts:114-124); sincronia bidirecional de status (:857-885). O fiado agora entra em sold, receivable e no lucro
- **[NOVO] income_summary.receivable ignorava o período e o card 'A receber' misturava anos numa grade 'no mês'** •novo
  - Evidência: 202607280035_fase3_gestao.sql:445-455 — duas colunas explícitas: receivable (saldo total, de propósito) e receivable_period (recortado pela janela); o card do Resumo usa receivable_period rotulado 'A receber no período' e mostra o saldo total como hint separado ('Saldo total em aberto: X', resumo.tsx:115-124) — os dois números certos, cada um com seu nome
- **[NOVO] Lista 'A receber' capada em 100 com o título anunciando a contagem truncada como total** •novo
  - Evidência: src/app/(dashboard)/financeiro/_sections/a-receber.tsx:81-88 — consulta com { count: 'exact' } e .range() paginado (25 por página); o título usa a contagem real do banco (:136-137) e há paginação Anteriores/Próximas (:198-233)
- **[NOVO] /relatorios somava todas as transações no servidor sem limite (teto ~1000 linhas → saldos errados em escala)** •novo
  - Evidência: src/app/(dashboard)/relatorios/page.tsx agora só redireciona para /financeiro?secao=relatorios; a seção usa cash_summary e income_by_payment_method agregadas no banco (relatorios.tsx:48-64; RPCs em 202607280030_fase0_correcoes.sql:393-457) — nenhum total é somado no cliente
- **[NOVO] Comissão apurada sobre atendimento cuja receita pode nunca ter entrado (competência vs caixa sem aviso)** •novo
  - Evidência: O regime continua competência, mas agora é DECISÃO EXPLÍCITA e visível: a tela declara 'A comissão é apurada por competência... tenha o cliente pago ou não' (comissoes.tsx:187-192); commission_summary devolve received_produced/received_commission (202607280035:246-251) e o card mostra 'R$ X já entrou em caixa' por profissional (commission-closing-card.tsx:120,127); o Resumo provisiona a comissão apurada no 'Lucro depois da comissão' — o dono vê a diferença antes de pagar

### Parcial (16)

- **§7.5 Resumo: quatro indicadores — Total vendido, Dinheiro recebido, Despesas, Lucro do período**
  - Evidência: src/app/(dashboard)/financeiro/_sections/resumo.tsx:101-152
  - O que falta: Os 4 indicadores do guia existem, corretos e agora com sufixo 'no período' (o 'no mês' fixo morreu), mas são SETE cards numa grade única em vez dos 4 pedidos — 'A receber no período', 'Lucro depois da comissão' e 'Atendimentos concluídos' dividem a mesma faixa, e o lucro cai para a segunda linha da grade de 4 colunas. 'Lucro de caixa' ainda flerta com jargão, embora o card 'Como ler estes números' (resumo.tsx:213-234) explique em língua de gente.
- **§7.5 Segunda linha: formas de pagamento no Resumo do Financeiro**
  - Evidência: src/app/(dashboard)/financeiro/_sections/relatorios.tsx:122-165 — bloco agora vive DENTRO do Financeiro (seção Relatórios), somado no banco (income_by_payment_method, 202607280030_fase0_correcoes.sql:432-457)
  - O que falta: Não está no Resumo e a RPC não aceita janela — é all-time por definição (só recebe p_barbershop). O subtítulo é honesto ('Todo o histórico recebido, não só o período escolhido', relatorios.tsx:128-130), mas o filtro de período da própria página é ignorado por este bloco, o que surpreende quem acabou de filtrar a quinzena.
- **§7.5 Segunda linha: contas vencidas no Resumo do Financeiro**
  - Evidência: src/components/dashboard/bills-view.tsx:72-87 — card 'Vencido' com total e destaque destrutivo, renderizado na seção Despesas do Financeiro (despesas.tsx:102-109); no Resumo (resumo.tsx:101-152) não há card de contas vencidas
  - O que falta: Melhorou de posição (saiu de só /dashboard para dentro do Financeiro), mas o guia pede o alerta na segunda linha do RESUMO — quem abre o Financeiro e fica no Resumo não vê que há conta estourada; precisa clicar em Despesas.
- **§7.5 Caixa e vendas: lista de atendimentos a finalizar**
  - Evidência: src/app/(dashboard)/financeiro/_sections/caixa.tsx:69-78 — a consulta continua trazendo TODOS os atendimentos do dia (.neq status canceled, ordenado por horário), sem filtro/ordenação por 'a finalizar'; a conclusão do atendimento ('Finalizar e receber') vive só na agenda (appointment-detail-sheet.tsx:317 via complete_and_receive_appointment)
  - O que falta: A lista existe e mostra pago/não pago, mas quem está no Caixa ainda não consegue CONCLUIR um atendimento em andamento — só confirmar pagamento de quem já apareceu. O fluxo de uma parada só ficou na Agenda; no Caixa o pendente se mistura com o já recebido.
- **§7.5 Caixa e vendas: botão "Receber pagamento"**
  - Evidência: src/app/(dashboard)/financeiro/_sections/caixa.tsx:299 ('Confirmar pagamento' desktop) e :219 ('Confirmar' celular); agenda usa 'Receber R$ X' e 'Finalizar e receber' (appointment-detail-sheet.tsx:298,317); A receber usa 'Recebi' (a-receber.tsx:183). grep 'Receber pagamento' em src: zero
  - O que falta: O rótulo do guia continua não existindo em lugar nenhum e a mesma ação segue com 4 nomes diferentes (Confirmar pagamento / Confirmar / Receber R$ X / Recebi) — viola o §2.3. A tela também segue sem ação primária de cabeçalho ('Nova movimentação' do §2.2).
- **§7.5 Caixa e vendas: botão "Nova venda" + carrinho com serviços E produtos + desconto + acréscimo + cliente + resumo antes de concluir** ⬆
  - Evidência: src/app/(dashboard)/vendas/page.tsx + src/components/dashboard/counter-sale-form.tsx:131-388 (busca, atalhos dos mais vendidos, carrinho, desconto, cliente opcional, vendedor, forma de pagamento, resumo subtotal/desconto/total); RPC create_counter_sale grava venda + itens + baixa de estoque + financial_transaction numa transação (202607280036_fix_venda_balcao_status.sql:27+)
  - O que falta: A venda de balcão é real e bem integrada, mas o carrinho é SÓ de produtos — não aceita serviços — e não existe campo de acréscimo (só desconto). Além disso o botão 'Nova venda' não aparece na seção 'Caixa e vendas' do Financeiro (só no menu do catálogo, navigation.ts:63, e em /produtos), que é onde o guia o coloca.
- **§7.5 Despesas: seção "Adicionar detalhes" com categoria, fornecedor, repetir todo mês, data de pagamento, forma de pagamento, anexo e observação** ⬆
  - Evidência: src/components/dashboard/expense-form.tsx:87-126 — disclosure 'Adicionar detalhes' existe com categoria (EXPENSE_CATEGORIES) e observação; colunas category/notes criadas em 202607280035_fase3_gestao.sql:186-193; corte 'Para onde foi o dinheiro' usa a categoria (despesas.tsx:71-98)
  - O que falta: Dos 7 campos pedidos, só 2 foram entregues (categoria e observação). Faltam: fornecedor (supplier_id segue sem cadastro), repetir todo mês (sem recorrência), data de pagamento retroativa (settleBill grava paid_at: now(), bills/actions.ts:143), forma de pagamento da despesa (BillsView é chamado sem askPaymentMethod em despesas.tsx:102-109) e anexo.
- **§7.5 A receber: vencimento e situação**
  - Evidência: src/components/dashboard/receivables-list.tsx:78-94 ('vence em' + badge 'Vencida' na lista de fiado dentro do Financeiro); mas a lista 'A receber (N)' da mesma seção (a-receber.tsx:147-196) mostra só 'vendido em {created_at}', sem due_at nem badge, apesar de as transações de fiado terem due_at gravado (202607280030:709-714)
  - O que falta: As duas listas agora moram na MESMA seção (unificação de lugar aconteceu), porém o fiado aparece DUPLICADO nela: a mesma dívida figura na lista de transações pendentes (como 'Fiado', sem vencimento) e na lista 'Fiado e acertos' (com vencimento e badge), cada uma com botão de baixa próprio. Confunde e infla visualmente o que há para cobrar, mesmo com os totais certos.
- **§7.5 A receber: botão "Registrar pagamento"**
  - Evidência: src/components/dashboard/receivables-list.tsx:129 e src/app/(dashboard)/financeiro/_sections/a-receber.tsx:183 — o rótulo agora é 'Recebi' nos dois lugares (era 'Receber'); forma de pagamento continua obrigatória
  - O que falta: O rótulo pedido pelo guia ('Registrar pagamento') continua ausente no A receber — curiosamente é o rótulo usado em Comissões. Ponto positivo: os dois pontos do A receber agora usam o MESMO rótulo entre si.
- **§7.5 Comissões: valor a pagar** ⬆
  - Evidência: to_pay calculado no banco: (salário/comissão conforme modelo) − vales − já pago no período, nunca negativo (202607280035:377-389); exibido como TEXTO com a conta aberta (commission-closing-card.tsx:143-152), não mais como default de input editável — pagar valor diferente exige abrir 'Pagar valor diferente do calculado' (:218-226). O desconto do 'já pago' elimina o risco de pagar duas vezes no mesmo período
  - O que falta:  [Rebaixado pelo verificador adversarial — ver seção de verificação.]
- **§7.5 Comissões: coluna de situação** ⬆
  - Evidência: A substância existe: 'Já pago no período' por profissional (commission-closing-card.tsx:137-140), card agregado 'Falta pagar' (comissoes.tsx:158-163) e mensagem 'Nada a pagar neste período' quando quitado (:211-216)
  - O que falta: Não há o badge de situação Pendente/Parcial/Pago com cor + texto que o §7.4 prescreve — o dono precisa ler os números para deduzir o estado de cada profissional em vez de bater o olho.
- **§7.5 Comissões: botão "Marcar como pago"**
  - Evidência: src/components/dashboard/commission-closing-card.tsx:206 — o botão continua 'Registrar pagamento'; grep 'Marcar como pago' em src: zero
  - O que falta: O rótulo do guia segue inexistente. Funcionalmente melhorou (é um clique só, com valor e referência pré-preenchidos), mas os rótulos de Comissões e A receber continuam trocados entre si em relação ao guia.
- **§7.5 Relatórios: exportação em PDF**
  - Evidência: src/components/dashboard/print-button.tsx:12-24 — continua window.print() com auto-disparo; src/app/(print)/relatorio-financeiro/page.tsx:53-62 só aceita ?mes= (getUtcMonthRange), e o link da seção Relatórios é fixo, sem levar o período filtrado (relatorios.tsx:177)
  - O que falta: Sem PDF de servidor; o card ao menos descreve com honestidade ('Gera o fechamento do mês corrente... pronta para imprimir', relatorios.tsx:172-175), mas o botão 'Gerar PDF' abre um diálogo de impressão, e o relatório ignora o filtro de período livre que o resto da tela ganhou — quem fecha quinzena não consegue imprimi-la.
- **G3: receitas de serviços, assinaturas e produtos no mesmo painel**
  - Evidência: Membership entra nos totais (income_summary soma toda receita) e deixou de se disfarçar de serviço: rotulado 'Plano do cliente' no A receber (a-receber.tsx:39-41) e separado como otherRevenue no financial_report (202607280030:617-621)
  - O que falta: Continua sem uma faixa/linha 'Assinaturas' nas agregações do painel: revenue_breakdown (202607280034:600+) só tem professional/service/product — receita de plano não aparece em nenhum corte de Caixa e vendas nem no gráfico, então o dono vê o dinheiro no total mas segue sem conseguir explicar quanto veio de assinatura.
- **[NOVO] §7.5 Relatórios sem linha na rodada 1: rótulo 'Baixar relatório' vs 'Gerar PDF' e PDF que é só window.print** •novo
  - Evidência: Fatos confirmados no código atual: 'Gerar PDF' (relatorios.tsx:178), 'Imprimir / Salvar PDF' via window.print (print-button.tsx:12-24), 'Baixar relatório' inexistente (grep zero)
  - O que falta: A seção Relatórios em si deixou de mentir número (agregação no banco) e descreve o fluxo com honestidade, mas rótulo e PDF real continuam pendentes — mesmo estado dos itens 'Baixar relatório' e 'exportação em PDF' acima.
- **[NOVO] Rótulos de 'Marcar como pago' (Comissões) e 'Registrar pagamento' (A receber) trocados entre si em relação ao guia** •novo
  - Evidência: Comissões usa 'Registrar pagamento' (commission-closing-card.tsx:206); A receber usa 'Recebi' (receivables-list.tsx:129, a-receber.tsx:183); 'Marcar como pago' segue inexistente (grep zero)
  - O que falta: A troca persiste: o rótulo que o guia pede para A receber está em Comissões, e o de Comissões não existe. Cada módulo é internamente consistente agora, mas entre módulos a mesma ação de dar baixa tem três nomes.

### Não atendido (5)

- **§7.5 Gráfico: tooltip / interação ao passar o mouse**
  - Evidência: src/components/dashboard/cash-flow-chart.tsx:123-162 — os <rect> das barras não têm <title> filho nem handlers; grep por 'title>|onMouseOver|Tooltip' no arquivo só encontra o aria-label global. O heatmap tem title por célula (occupancy-heatmap.tsx:133), o gráfico principal não
  - O que falta: Continua sem valor por barra ao passar o mouse. O <title> nativo por <rect> custaria poucas linhas sem virar client component. Há apenas o resumo textual dos totais abaixo do gráfico (cash-flow-chart.tsx:175-180).
- **§7.5 Rodapé: clientes que mais gastam**
  - Evidência: grep -rniE 'mais gastam|top.?client|maiores client' em src retorna zero; nenhuma das 6 seções de financeiro/_sections/ consulta gasto por cliente (resumo.tsx, caixa.tsx, relatorios.tsx conferidos linha a linha)
  - O que falta: Continua inexistente no Financeiro. O dado está pronto no banco (get_client_insights calcula total_spent, inclusive de plano, desde a Fase 0 §0.13) — falta apenas um top-5 no rodapé do Resumo ou de Relatórios.
- **§7.5 A receber: valor inicial e valor restante (pagamento parcial)**
  - Evidência: grep -rn 'paid_amount|remaining|partial' em supabase/migrations retorna zero; financial_transactions e accounts_receivable continuam com amount único e status binário; settle_receivable (202607280030:791-847) liquida o valor inteiro de uma vez
  - O que falta: Pagamento parcial continua sem modelo: não há tabela de pagamentos por recebível nem colunas de saldo. Quem recebe metade do fiado precisa apagar e relançar a diferença à mão.
- **§7.5 Relatórios: rótulo "Baixar relatório"**
  - Evidência: grep -rniE 'Baixar relat' em src retorna zero; os rótulos reais são 'Gerar PDF' (financeiro/_sections/relatorios.tsx:178) e 'Imprimir / Salvar PDF' (print-button.tsx:24)
  - O que falta: O rótulo pedido continua não existindo; o formato (PDF) segue no centro da decisão, contrariando o guia que manda o formato ser escolha secundária.
- **§7.5 Relatórios: exportação em planilha**
  - Evidência: grep -rniE '\bcsv\b|text/csv|planilha|xlsx' em src retorna apenas textos de marketing (diagnostic-5g.tsx:49, salao/page.tsx:50); não existe Route Handler de exportação
  - O que falta: Continua sem CSV/planilha de lançamentos, comissões ou despesas — segue sendo o item de menor esforço com maior efeito de confiança para o dono que confere no Excel.

### Não aplicável (1)

- **[NOVO] Relatório da rodada 1 chegou truncado, sem itens de Relatórios e sem percentual recalculável** •novo
  - Evidência: Item sobre o artefato da auditoria anterior, não sobre o produto; esta rodada reclassificou todos os itens, incluindo os de Relatórios e o de verdade financeira, com evidência linha a linha

### Verificação adversarial: confiavel com ressalvas

- **Correção** — §7.5 Comissões: valor a pagar: ATENDIDO → PARCIAL. O cálculo no banco existe (202607280035_fase3_gestao.sql:377-389), mas o desconto de 'já pago' recorta employee_payments por paid_at dentro da janela (202607280035:355-361) e registerEmployeePayment não permite datar o pagamento — o insert (src/modules/payroll/actions.ts:118-125) cai no default paid_at now() (202607080008_employee_payments.sql:25). Pagar um período já fechado (quinzena encerrada, 'Mês passado') grava o pagamento fora da janela: ao reabrir o mesmo período, 'Já pago no período' segue '—' (commission-closing-card.tsx:137-140), o 'Valor a pagar' volta inteiro com o botão 'Registrar pagamento' habilitado, e a tabela 'Pagamentos do período' (comissoes.tsx:76-83) não exibe o pagamento recém-feito. A alegação 'elimina o risco de pagar duas vezes no mesmo período' só é verdadeira quando o dono paga DENTRO da janela ainda corrente — no fluxo normal de fechamento (pagar depois que o período acaba) a proteção não funciona e a tela induz o pagamento em dobro. O vale não sofre disso porque usa reference_date retroagível (advanceSchema, payroll/actions.ts:32; corte por reference_date em 202607280035:346-353).
- **Achado adicional** — Proteção contra pagamento em dobro que não protege no fluxo real: o fechamento de comissões parece 'congelar' o período depois de pago, mas como employee_payments.paid_at é sempre now() (202607080008:25; payroll/actions.ts:118-125) e o abatimento recorta por paid_at na janela (202607280035:355-361), pagar uma quinzena/mês já encerrado devolve mensagem de sucesso ('Pagamento registrado') e o mesmo período continua exibindo o valor cheio a pagar — cara de quitado, comportamento de não-quitado. Não há vínculo estruturado pagamento→período (só o texto livre 'Referência' pré-preenchido com period.label, commission-closing-card.tsx:192-198).
- **Achado adicional** — Vale retroagido com despesa na data errada: o formulário 'Dar vale' aceita data passada (reference_date), e o fechamento abate no período certo (202607280035:346-353), mas a despesa de caixa correspondente é sempre gravada com paid_at now() (payroll/actions.ts:191-202) — um vale lançado hoje com data da semana passada aparece abatido na quinzena anterior e, ao mesmo tempo, como saída de caixa de hoje no gráfico (cash_flow_series corta por paid_at) e no corte 'Para onde foi o dinheiro'. Inconsistência menor, mas é o mesmo padrão de número que não bate entre duas telas.

---

## Serviços, produtos e estoque (§7.6) + pilar G5

A dimensão mudou de verdade desde a rodada 1: a tela /vendas existe com carrinho, busca, atalhos de mais vendidos, cliente/vendedor/desconto/forma de pagamento e botão "Receber R$ X", amparada pela RPC transacional create_counter_sale (migration 0036) que baixa estoque e lança receita juntos; a trava de estoque negativo virou trigger BEFORE INSERT com FOR UPDATE (migration 0030) e está no banco vivo; o saldo passou a ser somado no banco pela view product_stock_balances; o estoque mínimo entrou no cadastro; os 4 indicadores e as colunas Mínimo/Última movimentação apareceram; as tabelas viram cartões no celular; a vitrine pública marca produto sem saldo como "Indisponível"; e o revenue_breakdown agora enxerga venda avulsa. PORÉM há uma fachada grave: /vendas (linha 39) e /dashboard (linha 161) chamam a RPC get_product_stock, que NÃO EXISTE — nem nas migrations (grep em todo o repo só acha as 2 chamadas) nem no banco vivo (pg_proc consultado via MCP: create_counter_sale, get_top_products, enforce_inventory_balance e product_available_stock existem; get_product_stock não). Resultado: em /vendas todo o catálogo aparece "sem estoque" e desabilitado — um tenant novo não consegue registrar a primeira venda (só os atalhos "Mais vendidos", que exigem vendas anteriores, escapam do bloqueio) — e o cartão "Estoque baixo" do Início conta TODO produto com mínimo>0 como abaixo do mínimo. Continuam intocados: formulário de serviço (11 campos, sem cadastro progressivo, ainda pede URL de imagem), "Ordenar na página", coluna de profissionais/menu de 3 pontos nas listas, foto/custo/lucro por unidade na lista de produtos e busca nas listas de serviços e produtos.

### Atendido (10)

- **§7.6 / §2.2 Botão principal "Novo serviço"**
  - Evidência: src/components/dashboard/service-form-sheet.tsx:96-98 — único botão de alta ênfase da página, no action do PageHeader (servicos/page.tsx:67-73)
- **§7.6 Estoque — 4 indicadores: produtos com estoque baixo, zerados, valor aproximado em estoque, reservas atuais** ⬆
  - Evidência: src/app/(dashboard)/produtos/page.tsx:147-168 — 'Abaixo do mínimo', 'Produtos zerados', 'Valor em estoque', 'Reservas atuais', calculados sobre a view product_stock_balances (:80-83,115-145)
- **§7.6 Estoque — lista com produto, disponível, reservado, estoque mínimo e última movimentação** ⬆
  - Evidência: src/app/(dashboard)/produtos/page.tsx:324-325 e :374-391 (colunas Mínimo e Última movimentação, via view com last_movement_at — migration 202607280034:295-323); estoque mínimo agora editável no cadastro: product-form-sheet.tsx:124-137 + products/actions.ts:19,42,65
- **§7.6 Estoque — botão "Registrar entrada ou saída"** ⬆
  - Evidência: src/components/dashboard/inventory-movement-form.tsx:30 — título do cartão agora é 'Registrar entrada ou saída' (o submit interno diz 'Registrar', :105); a ação por linha de produto sugerida no gap antigo não foi feita, mas era secundária
- **§7.6 "Estoque negativo deve ser impossível" — citar a trava** ⬆
  - Evidência: supabase/migrations/202607280030_fase0_correcoes.sql:64-107 — trigger trg_enforce_inventory_balance BEFORE INSERT com FOR UPDATE no produto, cobrindo toda saída; presente no banco vivo (pg_proc via MCP); erro mapeado para o operador em src/modules/inventory/actions.ts:56-63 e reaproveitado pela venda de balcão (0036:114-121)
- **§2.3 / §8.1 O nome visível não pode ser "PDV"** ⬆
  - Evidência: src/app/(dashboard)/vendas/page.tsx:108-111 — eyebrow 'Balcão', título 'Nova venda'; navigation.ts:63 rotula 'Nova venda'; grep 'PDV' em src/: nenhuma ocorrência em UI
- **G5 — Produtos mais vendidos e receita integrada ao Financeiro** ⬆
  - Evidência: get_top_products (migration 202607280034:565-593, presente no banco vivo) alimenta os atalhos de um clique em vendas/page.tsx:40 + counter-sale-form.tsx:148-170; revenue_breakdown (0034:600-697) soma counter_sale_items como 'Porta 2' e o caixa exibe (financeiro/_sections/caixa.tsx:103-128, 490-504)
- **G5 — Ocultação de itens indisponíveis (sem estoque) na vitrine pública** ⬆
  - Evidência: get_public_barbershop expõe 'stock' via product_available_stock (migration 202607280037:146-156, função no banco vivo); product-card.tsx:31-59 marca 'Indisponível'; booking-form.tsx:853-877 impede adicionar item esgotado; create_public_appointment revalida no banco (0037:407-408). O gap aceitava 'ao menos marcar como indisponível' — cumprido com validação de fundo
- **§5.5 No celular, tabelas viram cartões; rolagem horizontal não pode ser a solução principal** ⬆
  - Evidência: src/components/ui/table.tsx (responsive por padrão, data-responsive) + src/app/globals.css:403-451 (abaixo de sm cada tr vira cartão com rótulos via data-label); células rotuladas em servicos/page.tsx:106-115 e produtos/page.tsx:348-391
- **[novo] Relatório financeiro capaz de representar venda avulsa (sem agendamento)** •novo
  - Evidência: revenue_breakdown recriado na migration 202607280034:600-697 com UNION de appointment_products confirmados e counter_sale_items (rateando desconto via total/subtotal); consumido em financeiro/_sections/caixa.tsx:79,103-128

### Parcial (14)

- **§7.6 Abas — área única com Serviços | Produtos | Estoque | Vendas** ⬆
  - Evidência: src/lib/navigation.ts:48-64 (SECTION_NAV catalogo com /servicos, /planos, /produtos, /vendas); src/components/layout/section-nav.tsx:33-60; renderizada em servicos/page.tsx:75 e produtos/page.tsx:193
  - O que falta: A área única agora existe (faixa de seção com Vendas incluída), mas Estoque segue fundido em 'Produtos e estoque' em vez de aba própria, a faixa traz 'Planos de clientes' no lugar, e /vendas/page.tsx não renderiza a SectionNav — de dentro da venda não há faixa de volta.
- **§7.6 Serviços — lista compacta com nome, duração, preço, profissionais, situação na página de agendamento e menu de ações**
  - Evidência: src/app/(dashboard)/servicos/page.tsx:84-89 (colunas Serviço, Duração, Preço, Situação, ações) e :128-171 (3 botões-ícone inline)
  - O que falta: Continua sem coluna de Profissionais — irônico, porque a página agora busca professional_services (servicos/page.tsx:45-48) e só usa no formulário — e as ações seguem como botões-ícone soltos, não menu de três pontos.
- **Upload real de arquivo via Supabase Storage (serviço, produto, profissional)**
  - Evidência: produto: src/modules/products/actions.ts:70-79 (uploadPublicImage products/{tenant}); profissional: professional-details-form.tsx:91-98; serviço: services/actions.ts:21,43 segue só URL
  - O que falta: 2 de 3 cobertos, igual à rodada 1 — o serviço continua sem o upload que já existe pronto no repositório.
- **§7.6 "permitir câmera no celular" nas fotos** ⬆
  - Evidência: src/components/dashboard/professional-details-form.tsx:96 — accept="image/*"; grep 'capture=' em src/: zero; product-form-sheet.tsx:168 mantém accept restrito png/jpeg/webp
  - O que falta: O gap pedia capture= ou ao menos accept="image/*" em 3 formulários; só o avatar do profissional ganhou image/*. Produto segue com lista restrita e serviço nem tem input de arquivo.
- **§7.6 Produtos — lista com foto pequena, nome, preço de venda, custo, LUCRO POR UNIDADE, estoque disponível, situação pública e ações**
  - Evidência: src/app/(dashboard)/produtos/page.tsx:317-328 — colunas Produto, Preço, Estoque, Reservado, Disponível, Mínimo, Última movimentação, Situação; grep 'lucro' na página e no form: zero
  - O que falta: A lista ganhou Mínimo e Última movimentação (itens de Estoque), mas os três pedidos deste item seguem faltando: miniatura da foto (image_url é selecionado em :73 e não exibido), coluna de custo e lucro por unidade em reais.
- **§7.6 Vendas/PDV — tela de venda com busca de produto, atalhos dos mais vendidos, carrinho (à direita no desktop, fixo embaixo no celular), cliente opcional, vendedor, desconto, forma de pagamento e botão "Receber R$ X"** ⬆
  - Evidência: src/app/(dashboard)/vendas/page.tsx:39 chama supabase.rpc('get_product_stock') — função inexistente: grep em todo o repo acha só as 2 chamadas, e pg_proc do banco vivo (consultado via MCP) não a tem; counter-sale-form.tsx:175-206 desabilita todo produto com available=0
  - O que falta: FACHADA parcial: a tela é completa e real (busca :137-146, atalhos :148-170, carrinho sticky :217 com lg à direita e fixo embaixo no celular, cliente :291, vendedor :308, desconto :325, forma pgto :338, 'Receber R$ X' :377-385) e a RPC create_counter_sale (migration 0036) é transacional de verdade — mas como get_product_stock não existe nem no repo nem no banco, o saldo volta nulo e TODO o catálogo aparece 'sem estoque' e desabilitado. Só os atalhos 'Mais vendidos' (que ignoram o bloqueio) permitem vender, e eles exigem vendas nos últimos 90 dias: um tenant novo não consegue registrar a primeira venda. Falta criar a RPC (ou ler a view product_stock_balances, como /produtos faz).
- **G5 — Cadastro de custo, preço de venda, quantidade e margem**
  - Evidência: src/components/dashboard/product-form-sheet.tsx:99-137 (preço, custo, estoque mínimo); grep 'lucro' em produtos/: zero; nenhum campo de estoque inicial no cadastro
  - O que falta: Custo e preço seguem no cadastro e o mínimo entrou, mas os dois pontos do gap original continuam: lucro por unidade não é calculado/exibido em lugar nenhum e a quantidade inicial ainda só entra por movimentação separada.
- **G5 — Venda rápida com carrinho, pagamento, desconto e responsável pela venda** ⬆
  - Evidência: src/modules/sales/actions.ts:50-116 + counter-sale-form.tsx (desconto :325-336, vendedor :308-323, pagamento :338-354); mas vendas/page.tsx:39 depende da RPC get_product_stock inexistente
  - O que falta: Mesma FACHADA do item de Vendas/PDV: tudo construído, inoperante para tenant sem histórico porque o catálogo inteiro aparece 'sem estoque'. Agravante de coerência: a RPC do banco autoriza receptionist (0036:56-61), mas a página (vendas/page.tsx:20) e a action (sales/actions.ts:55) exigem inventory:manage, que recepcionista não tem (permissions/index.ts:34) — o papel natural do balcão está trancado para fora da tela.
- **G5 — Entradas, saídas, reservas e alertas de estoque baixo** ⬇
  - Evidência: src/app/(dashboard)/dashboard/page.tsx:161 chama get_product_stock (inexistente) e :172-183 conta como 'baixo' todo produto com minimum_stock>0, porque o saldo lido vira 0
  - O que falta: FACHADA nova: o alerta de /produtos é real (page:134-138,498-509, sobre a view) e o mínimo agora é editável — o gap antigo foi resolvido — mas o cartão 'Estoque baixo' do Início, criado nesta rodada, exibe um número falso (superconta: qualquer produto com mínimo definido conta como abaixo dele, tenha o saldo que tiver). Nenhum caminho antigo regrediu; a queda vem da superfície nova mentirosa.
- **§5.5 Busca sempre visível nas listas** ⬆
  - Evidência: busca real só em /vendas (counter-sale-form.tsx:137-146); leitura integral de servicos/page.tsx e produtos/page.tsx: nenhum campo de busca ou filtro
  - O que falta: A nova tela de venda tem busca com normalização de acentos, mas as duas listas da dimensão (Serviços e Produtos) seguem sem campo de busca e sem os filtros rápidos de 'baixo estoque'/'zerados'.
- **[novo] Saldo de estoque somado no banco em vez de recorte truncado de 400 movimentações** •novo
  - Evidência: /produtos corrigido: page.tsx:80-83 lê a view product_stock_balances (migrations 0030:29-55 e 0034:295-323); mas vendas/page.tsx:39 e dashboard/page.tsx:161 leem a RPC get_product_stock, ausente do repo e do banco (pg_proc via MCP)
  - O que falta: O truncamento de 400 sumiu e /produtos soma no banco de verdade. FACHADA residual: as outras duas telas que precisam do saldo consomem uma RPC que não existe e tratam silenciosamente todo saldo como 0 — /vendas bloqueia o catálogo e o Início superconta o estoque baixo.
- **[novo] Rótulo "Escolher foto" nos campos de upload (GUIA §7.6)** •novo
  - Evidência: src/components/dashboard/professional-details-form.tsx:91 tem Label 'Escolher foto'; product-form-sheet.tsx:149 usa 'Foto do produto' com botão nativo do navegador; serviço sem upload (service-form-sheet.tsx:197-204)
  - O que falta: 1 de 3: só o avatar do profissional usa o rótulo pedido. O produto mostra o texto padrão do navegador no botão de arquivo e o serviço nem tem campo de foto.
- **[novo] §2.3 Estado vazio de /produtos não pode prometer função inexistente** •novo
  - Evidência: src/app/(dashboard)/produtos/page.tsx:303-307 — 'Cadastre produtos para vender no balcão e oferecer ao cliente no agendamento'
  - O que falta: A frase agora aponta para telas que existem (balcão em /vendas, oferta no agendamento via appointment_products), mas segue prometendo mais do que o produto entrega enquanto /vendas estiver inoperante para tenant novo (RPC get_product_stock inexistente): quem seguir a promessa cadastra o produto, abre o balcão e encontra tudo 'sem estoque'.
- **[novo] Coerência de permissão do menu entre Serviços e Produtos** •novo
  - Evidência: src/lib/navigation.ts:20 (entrada única 'Serviços e produtos' sem permission) e :56-63 (aba Produtos exige catalog:manage, Vendas exige inventory:manage); produtos/page.tsx não tem redirect — abre em leitura para qualquer papel
  - O que falta: O menu lateral ficou coerente (uma entrada única para a área), mas a assimetria migrou para a faixa: a aba 'Produtos e estoque' some para quem não tem catalog:manage, embora a página abra normalmente em modo leitura por URL — mesma dupla de comportamentos divergentes da rodada 1, um nível abaixo.

### Não atendido (6)

- **§7.6 Serviços — botão "Ordenar na página" (ordenação drag ou campo de ordem)**
  - Evidência: grep 'Ordenar' em src/: zero em UI de serviços; grep 'sort_order' nas migrations 0030-0038: só public_site_sections
  - O que falta: Nada foi feito: services segue sem coluna de ordem, sem botão e ordenada por nome (servicos/page.tsx:38).
- **§2.4 / §7.6 Cadastro de serviço progressivo — só nome, preço e duração na primeira dobra; resto em "Mais opções"**
  - Evidência: src/components/dashboard/service-form-sheet.tsx:109-264 — 11 campos simultâneos, nenhum disclosure; botão ainda 'Adicionar serviço' (:268)
  - O que falta: Intocado desde a rodada 1: sem 'Mais opções', todos os campos visíveis, e o botão segue 'Adicionar serviço' onde o guia pede 'Salvar serviço'.
- **§7.6 "Não pedir URL da imagem. Usar Escolher foto" — formulário de serviço**
  - Evidência: src/components/dashboard/service-form-sheet.tsx:197-204 — Label 'Imagem (URL)' com Input type=url; src/modules/services/actions.ts:21,43 grava imageUrl direto
  - O que falta: Intocado: o serviço segue pedindo URL, enquanto produto (product-form-sheet.tsx:164-170) e profissional (professional-details-form.tsx:91-98) têm upload de arquivo real.
- **[novo] §2.2 Um único botão de alta ênfase por tela em /produtos** •novo
  - Evidência: src/components/dashboard/product-form-sheet.tsx:68 ('Novo produto', variant default, w-full) e src/components/dashboard/inventory-movement-form.tsx:104-106 ('Registrar', default, w-full), simultâneos no grid de produtos/page.tsx:186-189 e :490-497
  - O que falta: Persistem dois botões primários visíveis ao mesmo tempo; o terceiro botão do cabeçalho ('Nova venda') ao menos nasceu outline (produtos/page.tsx:179-183).
- **[novo] §5.5 Ações raras em menu de três pontos na lista de PRODUTOS** •novo
  - Evidência: src/app/(dashboard)/produtos/page.tsx:406-479 — 4 controles por linha (editar, sacola, olho, excluir), ícone puro, gap-0.5, sem menu
  - O que falta: Nada mudou: seguem 4 botões-ícone sem palavra por linha, contra §5.5 e §2.3.
- **[novo] §5.5 Clicar na linha abre detalhes + cabeçalho fixo ao rolar (serviços e produtos)** •novo
  - Evidência: Nenhum onClick/Link em TableRow em servicos/page.tsx:94 nem produtos/page.tsx:341; grep 'sticky' em ui/table.tsx e nas duas páginas: zero (no celular o thead é até ocultado, globals.css:407-414)
  - O que falta: Nenhum dos dois comportamentos foi implementado em nenhuma das listas.

### Não aplicável (1)

- **[novo] Precedente de venda de balcão no repositório (sell-membership-sheet) vs alegação "venda de balcão é impossível"** •novo
  - Evidência: A observação foi superada pelos fatos: venda de balcão de produtos agora existe (counter_sales, migration 0034:332-375; /vendas); sell-membership-sheet segue em planos/page.tsx

### Verificação adversarial: confiavel

- **Correção** — §7.6 Abas — área única com Serviços | Produtos | Estoque | Vendas: PARCIAL (mudanca: MELHOROU) → PARCIAL (mudanca: IGUAL). Pela regra do protocolo, MELHOROU significa subida de status, e o item permaneceu PARCIAL nas duas rodadas. O conteúdo da evidência confere: src/lib/navigation.ts:48-64 tem a SECTION_NAV 'catalogo' com /vendas, section-nav.tsx:27-31 renderiza a faixa, e a leitura integral de src/app/(dashboard)/vendas/page.tsx confirma que ela NÃO renderiza SectionNav — só o rótulo de mudança está errado, não o status.
- **Achado adicional** — Alegação 'estoque negativo impossível' é mais forte que o código: o trigger trg_enforce_inventory_balance (migration 0030:104-107) é só BEFORE INSERT, e a política RLS 'administrators manage inventory' em inventory_movements (polcmd='*', verificada no banco vivo via pg_policy) permite a owner/manager fazer UPDATE/DELETE de movimentações direto pela API do Supabase — apagar uma movimentação de entrada deixa o saldo negativo sem passar por trava alguma. Nenhuma tela do app expõe esse caminho (grep por update/delete de inventory_movements em src/modules: zero), então o ATENDIDO se sustenta para o uso pelo produto, mas o furo fica registrado para o dono.

---

## Equipe, Configurações e Minha conta (§7.7–§7.9) + pilar G4

Esta dimensão foi a que mais mudou de verdade: a regra crítica do §7.7 foi resolvida de fato — o campo "Senha inicial" sumiu do formulário e o fluxo agora é convite por e-mail real (inviteUserByEmail + team_invites + aceite no /auth/callback), com lista de convites, reenvio e degradação honesta quando o e-mail não sai (aguarda credencial do provedor). A ficha do profissional em /profissionais/[id] existe com as 5 abas do guia e dados reais em todas (inclusive carteira de clientes e resultados por período), o que também destrava boa parte do G4. Configurações virou o settings-workspace com 6 seções, prévia ao vivo sticky com alternador Celular|Computador, um único "Salvar alterações" e — item que era impossível — o nome da barbearia agora é editável e gravado em barbershops. Minha conta ganhou tema claro/escuro/automático persistido, troca de senha exigindo a senha atual (com rate limit) e "sair dos outros aparelhos" com scope 'others'; o bug de escopo das folgas (3.11) foi corrigido com filtro por profissional. /assinatura virou "Meu plano NexoBarber" com checkout Mercado Pago completo aguardando credencial (degrada com texto honesto) e cancelamento self-service real por RPC. O que ficou para trás: os rótulos do guia ("Quem pode acessar", "Ajuda", "Próxima cobrança"), os indicadores no cartão do profissional (situação de hoje, próximo atendimento — continuam só na ficha), a seção "Pagamentos" configurável, troca de e-mail, e o aviso de mudanças não salvas é só um texto passivo, sem guarda de navegação. Não encontrei fachadas relevantes: os botões novos chamam actions reais e as RPCs novas são consumidas.

### Atendido (38)

- **§7.7 REGRA CRÍTICA — o proprietário NÃO deve criar a senha do colaborador** ⬆
  - Evidência: src/components/dashboard/professional-form.tsx (sem nenhum campo de senha; form chama sendTeamInvite) + src/modules/team/invites.ts:156-159 (inviteUserByEmail) + busca grep 'password' em src/modules/professionals/actions.ts = 0 ocorrências
- **§7.7 Quem pode acessar — fluxo de convite por e-mail com o colaborador criando a própria senha** ⬆
  - Evidência: src/modules/team/invites.ts:50 (redirectTo /auth/callback?next=/atualizar-senha), :156 inviteUserByEmail; src/app/auth/callback/route.ts:50 applyPendingInvites + :63-76 grant de recuperação; src/lib/auth/invites.ts:31-95 aplica convite e cria ficha/expediente/comissão; migração supabase/migrations/202607280035_fase3_gestao.sql (team_invites). Aguarda credencial de e-mail: se o envio falha, mensagem honesta em invites.ts:163-169 ('o e-mail não saiu… reenvie')
- **§7.7 Cartão do profissional: foto**
  - Evidência: src/app/(dashboard)/profissionais/page.tsx:119-126 (Avatar com AvatarImage e fallback)
- **§7.7 Cartão do profissional: nome**
  - Evidência: src/app/(dashboard)/profissionais/page.tsx:129
- **§7.7 Ao abrir o profissional: abas Dados / Serviços e comissões / Horários / Clientes / Resultados** ⬆
  - Evidência: src/components/dashboard/professional-tabs.tsx:35-68 (5 abas com esses nomes) + src/app/(dashboard)/profissionais/[id]/page.tsx:312-522 — todas com conteúdo real: ProfessionalDetailsForm, ProfessionalServicesForm+CommissionClosingCard, WeeklyAvailabilityEditor+ScheduleBlocksCard, carteira de clientes com visitas/última visita, resultados com filtro de período
- **§7.7 Horários — exceções por data (férias/ausência)**
  - Evidência: src/components/dashboard/schedule-blocks-card.tsx:86-104 (De/Até, dia inteiro ou faixa) — agora também na ficha ([id]/page.tsx:384-399) e com o bug de escopo 3.11 corrigido (equipe/horarios/page.tsx:90-101 filtra por professional_id)
- **§7.7 Quem pode acessar — coluna nome**
  - Evidência: src/app/(dashboard)/profissionais/page.tsx:233
- **§7.7 Quem pode acessar — situação do convite** ⬆
  - Evidência: src/components/dashboard/team-invites-card.tsx:67-107 — badges Aceito em dd/mm / Cancelado / Venceu em dd/mm / Aguardando resposta, com Reenviar e Cancelar; dados de team_invites carregados em profissionais/page.tsx:77-86
- **§7.7 Quem pode acessar — botão "Enviar convite"** ⬆
  - Evidência: src/components/dashboard/professional-form.tsx:148-150 — 'Enviar convite' / 'Enviando convite…', ligado a sendTeamInvite que envia e-mail de verdade (invites.ts:156); falha de envio devolve mensagem honesta (aguarda credencial do provedor de e-mail)
- **§7.8 "Configurações" não pode abrir diretamente "Identidade visual"** ⬆
  - Evidência: src/components/dashboard/settings-workspace.tsx:134 — abre na seção 'negocio' (Dados da barbearia); src/app/(dashboard)/configuracoes/page.tsx:108-121
- **§7.8 Página de agendamento › Divulgação: link, copiar, QR Code, baixar QR, abrir página**
  - Evidência: src/components/dashboard/share-page-card.tsx:56-75 (input readOnly, Copiar com feedback, Baixar QR PNG) renderizado em configuracoes/page.tsx:109-113
- **§7.8 / §3 Aparência: TEMAS PRONTOS como opção principal**
  - Evidência: src/components/dashboard/settings-workspace.tsx:73-83 (9 THEME_PRESETS) e :330-376 (grade de temas antes dos campos hex)
- **§7.8 Aparência: logotipo**
  - Evidência: src/components/dashboard/settings-workspace.tsx:295-328 (preview + upload) e src/modules/settings/actions.ts:164-169 (upload salvo em barbershops.logo_url)
- **§7.8 Página de agendamento › Conteúdo e contato: título, subtítulo, WhatsApp, Instagram, endereço** ⬆
  - Evidência: src/components/dashboard/settings-workspace.tsx:487-509 (título/subtítulo) e :211-246 (WhatsApp, Instagram, endereço) — tudo num único formulário com um único Salvar (o defeito original, dois botões independentes, sumiu; saveAllSettings grava as duas tabelas de uma vez)
- **§7.8 Layout: formulário à esquerda + PRÉVIA FIXA à direita** ⬆
  - Evidência: src/components/dashboard/settings-workspace.tsx:684-719 — prévia no nível da página, xl:sticky xl:top-24, refletindo nome, logo, cores, título, WhatsApp, endereço, horário de funcionamento e modo de confirmação (PagePreview :724-843)
- **§7.8 Layout: alternador Celular | Computador na prévia** ⬆
  - Evidência: src/components/dashboard/settings-workspace.tsx:690-706 — DeviceButton 'Celular'/'Computador', muda largura (max-w-[320px]) e tipografia da prévia
- **§7.8 Layout: um único botão fixo "Salvar alterações"** ⬆
  - Evidência: src/components/dashboard/settings-workspace.tsx:671-681 — barra sticky com um único 'Salvar alterações'; src/modules/settings/actions.ts:84-224 (saveAllSettings grava as 6 seções numa ação; as actions por cartão foram removidas); seções inativas escondidas por CSS para o FormData continuar completo (:147)
- **§7.8 Botão "Ver página de agendamento", também no mobile** ⬆
  - Evidência: src/components/layout/dashboard-shell.tsx:96-101 — grupo 'Sua conta' do Menu da barra inferior mobile inclui 'Página de agendamento' (external, mobile-tab-bar.tsx:113 abre em nova aba); o botão do cabeçalho segue hidden sm:inline-flex (:171), mas o atalho existe no celular
- **§7.9 Minha conta: nome**
  - Evidência: src/components/dashboard/account-forms.tsx:43-46 + src/modules/account/actions.ts:32-59
- **§7.9 Minha conta: telefone**
  - Evidência: src/components/dashboard/account-forms.tsx:47-56 (MaskedInput mask=phone)
- **§7.9 Minha conta: alterar senha**
  - Evidência: src/components/dashboard/account-forms.tsx:73-144 + src/modules/account/actions.ts:69-150 — agora exige a senha atual (verificada em client separado, :104-119), com rate limit (:95) e opção de derrubar outras sessões; a ressalva de segurança da rodada 1 foi resolvida
- **§7.9 Minha conta: tema claro/escuro** ⬆
  - Evidência: src/components/dashboard/theme-form.tsx (Claro/Escuro/Automático, salva no clique) + src/modules/account/theme-actions.ts:26-32 (cookie persistido) + src/components/layout/panel-theme.tsx:30-76 (aplica classe dark/data-theme com script anti-flash e acompanha prefers-color-scheme no modo Automático); renderizado em minha-conta/page.tsx:42-44
- **§7.9 Minha conta: sair de outros aparelhos** ⬆
  - Evidência: src/components/dashboard/account-forms.tsx:122-136 (checkbox 'Sair dos outros aparelhos', defaultChecked) + src/modules/account/actions.ts:140-147 — supabase.auth.signOut({scope:'others'}), preservando a sessão atual; também no fluxo de recuperação (:218). Observação: a ação vem acoplada à troca de senha, não há botão independente
- **§7.9 Rótulo visível deve ser "Meu plano NexoBarber", nunca só "Assinatura"** ⬆
  - Evidência: src/app/(dashboard)/assinatura/page.tsx:89 (title="Meu plano NexoBarber") + user-menu.tsx:76 + dashboard-shell.tsx:112 (menu mobile)
- **§7.9 Meu plano: plano atual**
  - Evidência: src/app/(dashboard)/assinatura/page.tsx:162-164 — 'Plano {plan.label}'
- **§7.9 Meu plano: valor**
  - Evidência: src/app/(dashboard)/assinatura/page.tsx:165-170 (preço com /mês ou /ano) — agora com preços do catálogo no banco (loadPlanCatalog, :80-83) e comparativo mensal×anual em reais no checkout card (:96-110 do componente)
- **§7.9 Meu plano: benefícios**
  - Evidência: src/app/(dashboard)/assinatura/page.tsx:173-180 — plan.features com BadgeCheck em 2 colunas
- **§7.9 Meu plano: situação**
  - Evidência: src/app/(dashboard)/assinatura/page.tsx:92-105 (badge por estado) + alertas contextuais :111-158
- **G4 — Agenda e disponibilidade individual de cada profissional**
  - Evidência: src/app/(dashboard)/agenda/page.tsx:157-243 (filtro prof; profissional só vê a própria, :168 + RLS); expediente individual em equipe/horarios/page.tsx e na aba Horários da ficha ([id]/page.tsx:371-400)
- **G4 — Serviços realizados, clientes atendidos e faturamento gerado por profissional** ⬆
  - Evidência: RPC commission_summary (migrations 202607280030/0035: produced, produced_products, completed_count, to_pay) consumida em src/app/(dashboard)/profissionais/[id]/page.tsx:174-181 e financeiro/_sections/comissoes.tsx:64; ficha mostra atendimentos, produzido e comissão por período (:459-492), clientes na carteira (:305-309) e serviços mais executados (:500-519)
- **G4 — Comissão por serviço, percentual ou valor fixo**
  - Evidência: services.commission_rate editável em service-form-sheet.tsx:154-162; modelos comissão/salário fixo/híbrido em commission-closing-card.tsx:334-378 (employee_pay_settings); convite já define comissão % + salário (professional-form.tsx:97-121, lib/auth/invites.ts:146-165)
- **G4 — Carteira de clientes e produtividade por profissional** ⬆
  - Evidência: src/app/(dashboard)/profissionais/[id]/page.tsx:402-451 — aba Clientes com carteira ordenada por frequência (visitas + última visita, agregada de appointments concluídos :206-236) + aba Resultados com produção no período
- **G4 — Acessos adequados para dono, gerente e barbeiro**
  - Evidência: src/app/(dashboard)/permissoes/page.tsx:27-37 (matriz 9 permissões × 4 papéis) aplicada via can() na navegação (lib/navigation.ts + dashboard-shell) e nas telas (ex.: profissionais/page.tsx:45-50, [id]/page.tsx:86-116)
- **[NOVO] Editar os DADOS DA BARBEARIA (nome, endereço, contato) era impossível — nenhuma server action gravava em barbershops além de logo_url** •novo
  - Evidência: src/components/dashboard/settings-workspace.tsx:193-257 (seção 'Dados da barbearia': nome obrigatório, endereço, WhatsApp, Instagram) + src/modules/settings/actions.ts:143-145 e :190-200 — saveAllSettings grava barbershops.name (e logo) com mensagem de erro parcial honesta (:206-212)
- **[NOVO] Pilar G4 como item auditável — 'quem produziu' (serviços realizados, clientes atendidos, faturamento) em tela de gestão** •novo
  - Evidência: Entregue sob outro nome: ficha do profissional (profissionais/[id]/page.tsx, abas Clientes e Resultados) + Financeiro›Comissões (comissoes.tsx:132-205, 'Produzido pela equipe' e fechamento por pessoa via commission_summary)
- **[NOVO] G4 'Comissão por serviço, percentual ou valor fixo' — checagem explícita** •novo
  - Evidência: service-form-sheet.tsx:154-162 (comissão % por serviço, com precedência explicada em professional-details-form.tsx:181-185); employee_pay_settings com modelos fixed/commission/hybrid (commission-closing-card.tsx:334-378)
- **[NOVO] §7.9 sistema pulava a verificação de e-mail do colaborador (createUser com email_confirm: true)** •novo
  - Evidência: Busca grep 'createUser|email_confirm' em src/ = 0 ocorrências (só o comentário histórico em professional-form.tsx:19); o colaborador agora nasce via inviteUserByEmail e só entra clicando no link recebido no próprio e-mail (auth/callback/route.ts:35-57)
- **[NOVO] Alterar senha sem exigir a senha atual (sessão esquecida tomava a conta)** •novo
  - Evidência: src/modules/account/actions.ts:95 (rate limit 5/15min), :104-119 (verificação da senha atual em client separado sem cookies, signOut scope 'local' para não vazar sessão), :140-147 (scope 'others'); /atualizar-senha só dispensa a senha atual com grant emitido pelo callback (actions.ts:194-200 + lib/auth/recovery.ts:30-33)

### Parcial (19)

- **§7.7 Navegação interna consolidada: Profissionais | Horários | Resultados | Quem pode acessar**
  - Evidência: src/lib/navigation.ts:65-77 (SECTION_NAV equipe: Profissionais, Horários e folgas, Permissões) + src/components/dashboard/team-tabs.tsx:22-27 (2 abas)
  - O que falta: O menu lateral agora tem 1 só entrada 'Equipe' (melhora real), mas a área não tem aba 'Resultados' nem seção chamada 'Quem pode acessar'; Permissões segue como página própria dentro da SectionNav
- **§7.7 Aba "Resultados" da Equipe** ⬆
  - Evidência: src/app/(dashboard)/profissionais/[id]/page.tsx:452-521 (aba Resultados por profissional com PeriodFilter, atendimentos concluídos, produzido em serviços/produtos, comissão) + src/app/(dashboard)/financeiro/_sections/comissoes.tsx:142-205 (produção da equipe inteira)
  - O que falta: A substância existe, mas por pessoa (na ficha) ou no Financeiro; não há aba 'Resultados' na área Equipe comparando os profissionais lado a lado, e falta ticket médio
- **§7.7 Cartão do profissional: situação hoje**
  - Evidência: src/app/(dashboard)/profissionais/page.tsx:130-136 — badges continuam derivados de active/public_visible
  - O que falta: Continua sem cruzar professional_availability + schedule_blocks com a data corrente ('trabalha até X / em folga / de férias')
- **§7.7 Cartão do profissional: atendimentos no período** ⬆
  - Evidência: src/app/(dashboard)/profissionais/[id]/page.tsx:459-492 — 'Atendimentos concluídos' no período escolhido, na aba Resultados da ficha; cartão da lista (page.tsx:117-200) segue sem contagem
  - O que falta: O número existe, mas a um clique ('Ver ficha'); o guia pede o indicador no próprio cartão da Equipe
- **§7.7 Cartão do profissional: total vendido** ⬆
  - Evidência: src/app/(dashboard)/profissionais/[id]/page.tsx:466-477 (Produzido em serviços/produtos, via RPC commission_summary); nada no cartão da lista
  - O que falta: Produzido total existe na ficha e em Financeiro›Comissões, não no cartão
- **§7.7 Cartão do profissional: comissão estimada**
  - Evidência: src/app/(dashboard)/profissionais/[id]/page.tsx:361-368 (CommissionClosingCard na aba Serviços e comissões) e :474-477 ('Comissão apurada' em Resultados); ausente no cartão da lista
  - O que falta: Agora mora dentro da área Equipe (ficha), mas o guia pede no cartão
- **§7.7 Horários — grade semanal com dia, início, intervalo, retorno, fim, folga**
  - Evidência: src/components/dashboard/weekly-availability-editor.tsx:118-128 — dia sem janela ainda diz 'Fechado'; intervalo/retorno de almoço só via segundo turno (:183-191)
  - O que falta: Sem colunas explícitas de intervalo/retorno e sem a palavra 'Folga'
- **§7.7 Quem pode acessar — coluna e-mail** ⬆
  - Evidência: src/components/dashboard/team-invites-card.tsx:62-64 mostra o e-mail de convidados (pendentes e aceitos); mas a lista 'Membros ativos' segue sem e-mail — query profissionais/page.tsx:72 seleciona profile:profiles(id,name,phone) e as linhas 234-236 exibem telefone/papel
  - O que falta: Membros que entraram antes do sistema de convites (ou cujo convite sumiu da lista) continuam sem e-mail visível
- **§7.7 Quem pode acessar — "o que a pessoa pode ver"**
  - Evidência: src/app/(dashboard)/profissionais/page.tsx:254-265 (select de papel) e :293-314 (cartão 'O que cada papel pode' com 3 frases + link para a matriz)
  - O que falta: A frase do que a pessoa pode ver continua fora da linha dela; o dono ainda cruza papel × cartão separado
- **§7.8 Navegação interna: Dados da barbearia | Horários | Regras de agendamento | Pagamentos | Notificações | Página de agendamento** ⬆
  - Evidência: src/components/dashboard/settings-workspace.tsx:33-40 — 6 seções: Dados da barbearia, Aparência, Página de agendamento, Horário de funcionamento, Regras de agendamento, Lembretes
  - O que falta: 5 das 6 seções do guia existem (Lembretes ≈ Notificações); 'Pagamentos' (formas aceitas) não existe — o sexto slot foi ocupado por 'Aparência'
- **§7.8 Aparência: foto de capa**
  - Evidência: src/components/dashboard/settings-workspace.tsx:402-478 — continua 'Fundo da página' (Cor|Imagem, 16 fundos + upload); grep 'capa' não encontra campo de foto de capa
  - O que falta: Nem capa separada nem renome para a linguagem do guia
- **§7.8 / §3 Hex livre deve ficar em "Personalização avançada"**
  - Evidência: src/components/dashboard/settings-workspace.tsx:378-400 — os 3 ColorField (Destaque/Escura/Fundo) seguem expostos logo abaixo dos temas; grep 'Personalização avançada' em src/ = 0
  - O que falta: Falta o bloco recolhível; os hex continuam no caminho principal
- **§7.8 Página de agendamento › Notificações: confirmação, lembrete, antecedência, mensagem**
  - Evidência: src/components/dashboard/settings-workspace.tsx:643-669 — seção 'Lembretes' é só o liga/desliga (consumido de verdade pelo cron: src/app/api/cron/reminders/route.ts:72); confirmação manual/auto mora em 'Regras' (:617-640)
  - O que falta: Sem antecedência configurável do lembrete e sem texto de mensagem editável; confirmação não foi reunida na seção de notificações
- **§7.8 Layout: aviso quando existirem mudanças não salvas** ⬆
  - Evidência: src/components/dashboard/settings-workspace.tsx:137-145 (estado dirty) e :676-679 ('Você tem alterações não salvas em uma ou mais seções.')
  - O que falta: É só um texto passivo na barra: grep 'beforeunload' em src/ = 0 — sair da página ou navegar para outra rota descarta tudo sem confirmação
- **§7.9 Menu do usuário: Minha conta | Meu plano NexoBarber | Ajuda | Sair**
  - Evidência: src/components/layout/user-menu.tsx:61-98 — Minha conta ✓, 'Meu plano NexoBarber' ✓ (:74-77), Sair ✓; 'Configurações' segue como item extra (:68-72)
  - O que falta: 'Ajuda' continua inexistente (grep 'Ajuda' só encontra um placeholder no cancel-subscription-card)
- **§7.9 Meu plano: próxima cobrança**
  - Evidência: src/app/(dashboard)/assinatura/page.tsx:181-188 — ainda 'Período atual até {data}'; grep 'Próxima cobrança' em src/ = 0; no trial o alerta (:146-158) diz que a cobrança vem ao fim do teste, sem data e valor rotulados
  - O que falta: Falta o rótulo explícito 'Próxima cobrança: dd/mm — R$ X', inclusive durante o teste grátis
- **§7.9 Meu plano: forma de pagamento** ⬆
  - Evidência: src/components/dashboard/subscription-checkout-card.tsx:194-201 (cartão, Pix ou boleto via Mercado Pago) + src/lib/billing/mercadopago.ts:21-23 — código pronto aguardando credencial; sem MERCADOPAGO_ACCESS_TOKEN a tela mostra o supportNote honesto (assinatura/page.tsx:201, checkout-card:203-209), nada quebra
  - O que falta: A contratação existe (aguarda credencial), mas a forma de pagamento vigente de uma assinatura ativa não é exibida em lugar nenhum
- **§7.9 Meu plano: botão "Gerenciar pagamento"** ⬆
  - Evidência: A página deixou de ser 'sem nenhum botão': 'Assinar {plano} · R$X' (subscription-checkout-card.tsx:186-193, real via startCheckout→createPreapproval, aguarda credencial) e cancelamento self-service (cancel-subscription-card.tsx + RPCs request/revoke_subscription_cancellation nas migrations 202607280030/0032)
  - O que falta: Não existe 'Gerenciar pagamento' para assinatura já ativa (trocar cartão/portal do provedor) — grep 'Gerenciar pagamento' = 0; sem credencial o texto manda falar com o suporte (degradação honesta)
- **[NOVO] Ping-pong entre /profissionais, /usuarios (redirect) e /permissoes (página cheia separada)** •novo
  - Evidência: src/app/(dashboard)/usuarios/page.tsx (redirect mantido de propósito); src/app/(dashboard)/permissoes/page.tsx:55 agora renderiza SectionNav section="equipe" — as três telas viraram seções navegáveis da mesma área
  - O que falta: O ping-pong virou navegação de seção (melhor), mas Permissões segue como página própria com botão 'Gerenciar equipe' apontando de volta (:49-53), e nenhuma delas usa o rótulo 'Quem pode acessar' do guia

### Não atendido (4)

- **§7.7 Substituir o rótulo "Acessos e papéis" por "Quem pode acessar"**
  - Evidência: src/components/dashboard/team-tabs.tsx:25-27 ainda 'Acessos e papéis'; busca grep 'Quem pode acessar' em src/ = 0 ocorrências
  - O que falta: Renomear a aba (troca nominal obrigatória do guia)
- **§7.7 Cartão do profissional: próximo atendimento**
  - Evidência: Busca grep 'próximo atendimento|Próximo atendimento' em src/ = 0; query do cartão (profissionais/page.tsx:58-62) não traz appointments
  - O que falta: Buscar o próximo appointment futuro de cada profissional e exibir no cartão
- **§7.9 Minha conta: e-mail com verificação**
  - Evidência: src/components/dashboard/account-forms.tsx:57-63 — segue disabled readOnly com 'Para trocar o e-mail, fale com o suporte.'
  - O que falta: Sem troca de e-mail com confirmação por link; o agravante antigo (email_confirm:true na criação pelo dono) sumiu junto com o createUser, mas o item em si segue não entregue
- **[NOVO] §7.8 'Pagamentos' — formas de pagamento aceitas configuráveis pelo dono** •novo
  - Evidência: src/lib/financial/index.ts:1 — PAYMENT_METHODS segue constante fixa consumida em 10+ telas (caixa, vendas, a-receber etc.); settings-workspace.tsx:33-40 não tem seção 'Pagamentos'
  - O que falta: O conceito existe mas não é configurável: o dono não escolhe quais formas aceita nem elas aparecem em Configurações

### Verificação adversarial: confiavel com ressalvas

- **Achado adicional** — settings-workspace.tsx: as seções inativas são escondidas por CSS (linha 147) mantendo campos required no DOM (businessName :206, heroTitle :495, heroSubtitle :507). Se o dono apagar um desses campos, trocar de seção e clicar em 'Salvar alterações', a validação nativa do navegador bloqueia o submit num campo não-focável ('not focusable') e NADA acontece na tela — sem mensagem, sem erro visível. Caso de borda real que o reauditor não registrou; não derruba o ATENDIDO do salvar único (funciona no uso normal), mas é um botão que pode 'não fazer nada' silenciosamente.
- **Achado adicional** — modules/team/invites.ts:136-153: quando o e-mail convidado JÁ tem conta no sistema, o acesso é liberado na hora (applyPendingInvites direto), sem a pessoa clicar em link nenhum — o 'convite por e-mail com prova da caixa de entrada' vale só para contas novas. O texto do formulário ('A pessoa recebe um e-mail... e entra') promete um fluxo que nesse caminho não ocorre. Não viola a regra crítica (o dono continua sem criar senha), mas é uma nuance de consentimento/segurança que o relatório não menciona.

---

## Página pública e fluxo de agendamento (§7.10, §7.11) + pilar G1

A Fase 4 foi entregue de verdade nesta dimensão: quase tudo que era NAO_ATENDIDO virou código real e verificável de ponta a ponta. O fluxo público hoje tem as 7 etapas do §7.11 (lib/booking/index.ts define service→professional→datetime→contact→extras→payment→review), com uma decisão por tela no celular, "Continuar" fixo, "Ver resumo" expansível, trilha numerada e resumo sticky no desktop. O reconhecimento de cliente recorrente existe e é cuidadoso (rota POST com rate limit + RPC get_public_client_hint que devolve só o primeiro nome); a remarcação pública é real (RPC reschedule_public_appointment com todas as regras de agenda, chamada por reschedule-reservation.tsx); o .ics é gerado por rota própria RFC 5545; a tela final é montada com o que o servidor gravou (create_public_appointment devolve o registro persistido) e usa os textos exatos do guia ("Horário confirmado"/"Pedido de horário enviado", "Situação", frase natural "Terça-feira, 15h, com João"). A home ganhou a seção 5 com horário de funcionamento renderizado, capa curta com foto de fundo e overlay de 65%, rótulos "Escolher este serviço"/"Agendar com {nome}" sempre visíveis, produto sem estoque como "Indisponível" (com trava também no servidor) e as três subrotas viraram páginas reais. Restam três pendências: nenhuma guarda contra serviço a R$ 0,00 no catálogo público (validador ainda aceita min(0) e a RPC não filtra preço), o pilar G1 "menos mensagens" segue incompleto no modo manual (confirmar um pendente no painel não dispara nenhuma notificação ao cliente — sendEmail só é usado no cron de leads), e a única fachada remanescente é o CMS de seções: a RPC continua entregando 'sections' e o tipo declara o campo, mas nenhum componente renderiza. Nada regrediu.

### Atendido (44)

- **§7.10 Ordem obrigatória das seções: 1 capa, 2 serviços, 3 profissionais, 4 produtos, 5 endereço/horário/contato, 6 chamada final** ⬆
  - Evidência: src/app/(public)/[tenant]/page.tsx:84 (capa), 145 (serviços), 216 (profissionais), 273 (produtos), 315 (seção 5 'onde'), 395 (chamada final)
- **§7.10 seção 5 deve mostrar HORÁRIO de funcionamento** ⬆
  - Evidência: src/app/(public)/[tenant]/page.tsx:336-353 renderiza openingHoursList; src/lib/opening-hours.ts:32-39; RPC entrega em supabase/migrations/202607280037_fase4_publico_agendamento.sql:120; editor em settings-workspace.tsx (seção 'Horário de funcionamento')
- **§7.10 Capa curta com nome, benefício e botão "Agendar horário"**
  - Evidência: src/app/(public)/[tenant]/page.tsx:100-117 — nome (100-102), h1 heroTitle (103-105), subtítulo (106-108), botão sólido 'Agendar horário' (111-117)
- **§7.10 Foto de fundo com camada escura de 55% a 70%** ⬆
  - Evidência: src/app/(public)/[tenant]/page.tsx:86-96 — SmartImage full-bleed + overlay uniforme bg-black/65 (linha 96), dentro da faixa 55-70%
  - O que falta: Nota: o overlay 0.82 de src/lib/colors.ts:56 permanece, mas é do fundo de página por imagem (backgroundType='image'), mecanismo distinto da capa — a exigência do guia sobre a capa está cumprida.
- **§7.10 Um botão principal sólido e um secundário para WhatsApp**
  - Evidência: src/app/(public)/[tenant]/page.tsx:111-128 — botão sólido bg-[var(--tenant-primary)] + link com borda 'WhatsApp' condicional
- **§7.10 Serviços com preço e duração claramente visíveis**
  - Evidência: src/app/(public)/[tenant]/page.tsx:188-195 — Clock3 + '{durationMinutes} min' e preço BRL em mono na cor primária
- **§7.10 Cada cartão de serviço possui "Escolher este serviço"** ⬆
  - Evidência: src/app/(public)/[tenant]/page.tsx:197-204 — rótulo 'Escolher este serviço' (sm+) / 'Escolher' (mobile) sempre visível com o ícone; repetido em servicos/page.tsx
- **§7.10 Cada profissional possui "Agendar com este profissional"** ⬆
  - Evidência: src/app/(public)/[tenant]/page.tsx:257-265 — botão permanente (sem opacity-0) com href ?profissional={id}; aceito em agendar/page.tsx:46-50 e booking-form.tsx:124-126 (initialProfessionalId)
- **§7.10 Produto sem foto usa miniatura pequena padronizada, não uma grande área vazia** ⬆
  - Evidência: src/components/public-site/product-card.tsx:48-52 — miniatura size-16 padronizada; no upsell, ProductThumb size-14 em booking-form.tsx:1119-1145
- **§7.10 Produto sem estoque aparece como "Indisponível" ou fica oculto** ⬆
  - Evidência: RPC expõe stock (migrations/202607280037:151 + product_available_stock:38-76); UI: product-card.tsx:31,59 e booking-form.tsx:853,875-878 ('Indisponível'); trava no servidor PRODUCT_UNAVAILABLE (202607280037:407-410); null = sem controle de estoque (lib/booking/index.ts:64-73)
- **§7.10 Rodapé compacto**
  - Evidência: src/components/public-site/public-footer.tsx — 91 linhas, faixa única sem sitemap
- **§7.11 O fluxo deve ter 7 etapas** ⬆
  - Evidência: src/lib/booking/index.ts:27-57 — ALL_STEPS com as 7 etapas na ordem do guia (serviço, profissional, dia/horário, seus dados, extras, pagamento, confira e confirme); booking-form.tsx renderiza uma por vez via step.key; extras some sem produtos mantendo numeração contínua
- **§7.11 Etapa 2 deve incluir "Primeiro disponível"**
  - Evidência: src/components/public-site/booking-form.tsx:607-633 — chip 'Primeiro disponível' quando availableProfessionals.length > 1; endpoint first-available/route.ts com RPC get_first_available
- **§7.11 Etapa 4 "Seus dados": WhatsApp PRIMEIRO** ⬆
  - Evidência: src/components/public-site/booking-form.tsx:773-795 — campo WhatsApp é o primeiro do bloco de contato, antes de Nome (796-808)
- **§7.11 Etapa 4: reconhecer cliente recorrente e preencher nome automaticamente** ⬆
  - Evidência: src/app/api/public/[tenant]/client-lookup/route.ts (POST, rate limit 12/min por IP, devolve só o primeiro nome); RPC get_public_client_hint em migrations/202607280037:179-204; efeito com debounce em booking-form.tsx:274-299 e mensagem 'Que bom te ver de novo, {nome}' (789-794); só preenche campo vazio
- **§7.11 Etapa 5 "Quer adicionar algo?" com botão visível "Pular esta etapa"** ⬆
  - Evidência: Título 'Quer adicionar algo?' em src/lib/booking/index.ts:41-45; botão 'Pular esta etapa' em booking-form.tsx:910-916 que avança a etapa
- **§7.11 Etapa 6 Pagamento (pagar no local ou forma disponível)** ⬆
  - Evidência: Etapa em booking-form.tsx:920-959 com texto honesto de pagamento no local e opções Pix/Cartão/Dinheiro/Decido na hora (lib/booking:80-85); persistida na coluna appointments.payment_preference (migrations/202607280037:86-90) via RPC (:268-272, :366-381) e API (appointments/route.ts:41)
- **§7.11 Etapa 7 "Confira e confirme"** ⬆
  - Evidência: src/components/public-site/booking-form.tsx:961-973 — etapa review com resumo completo (serviço, profissional, quando, produtos, pagamento, total) + bloco de contato; submit só aqui, com botão 'Confirmar reserva' (1029)
- **§7.11 Desktop: conteúdo à esquerda + RESUMO FIXO à direita** ⬆
  - Evidência: src/components/public-site/booking-form.tsx:490 — lg:grid-cols-[minmax(0,1fr)_19rem]; aside sticky top-24 com BookingSummary na linha 1037
- **§7.11 Desktop: etapas numeradas no topo, com número e nome** ⬆
  - Evidência: src/components/public-site/booking-form.tsx:494-532 — trilha <ol> no topo com número/check, nome curto e três estados (concluída clicável, atual, pendente)
- **§7.11 Celular: uma decisão por tela** ⬆
  - Evidência: booking-form.tsx renderiza só o step.key atual (560, 605, 671, 771, 849, 920, 961); cabeçalho 'Etapa X de Y' + botão voltar no mobile (535-549); scroll ao topo a cada troca (258-267)
- **§7.11 Celular: resumo recolhido em "Ver resumo"** ⬆
  - Evidência: src/components/public-site/booking-form.tsx:991-1009 — botão 'Ver resumo' com total, expande o BookingSummary detalhado (987-989) na barra sticky
- **§7.11 Celular: botão "Continuar" fixo na parte inferior** ⬆
  - Evidência: src/components/public-site/booking-form.tsx:986 (sticky bottom-3) e 1029 — 'Continuar' em todas as etapas, 'Confirmar reserva' só na review; habilitação por etapa via canContinue (378-391)
- **Tela final, modo automático: texto deve ser "Horário confirmado"** ⬆
  - Evidência: src/lib/booking/index.ts:101-105 — confirmationTitle devolve 'Horário confirmado'; subfrase natural 'Terça-feira, 15h, com João' via confirmationPhrase (111-138), usadas em booking-success.tsx:54-63
- **Tela final, modo manual: texto deve ser "Pedido de horário enviado"** ⬆
  - Evidência: src/lib/booking/index.ts:104 — 'Pedido de horário enviado'; nota 'A barbearia vai responder pelo WhatsApp' (verticals.ts:47/67) em booking-success.tsx:64-68
- **"Nunca prometer confirmação na hora quando a reserva entra como pendente"**
  - Evidência: Modo lido do banco e propagado: page.tsx:72,138 e agendar/page.tsx:92-94 (chip por modo); chamada final coerente page.tsx:404-408 com ctaNoteManual (verticals.ts:51-52); RPC decide status (migrations/202607280037:375-378)
  - O que falta: Ressalva de termo permanece: usa 'Confirmação imediata' em vez do padronizado 'Horário confirmado automaticamente' do §8.1
- **Tela final deve exibir número da reserva**
  - Evidência: src/components/public-site/booking-success.tsx:73-75 — linha 'Referência' com public_reference vindo do servidor (RPC devolve em migrations/202607280037:425)
- **Tela final deve exibir situação** ⬆
  - Evidência: src/components/public-site/booking-success.tsx:76-79 — rótulo 'Situação' ('Confirmada'/'Aguardando confirmação'); também na página do token (reserva/[token]/page.tsx:136-139)
- **Tela final deve exibir serviço, profissional, data e hora, valor**
  - Evidência: src/components/public-site/booking-success.tsx:80-114 — agora tudo vem do que o servidor gravou (API appointments/route.ts:48-58 devolve o retorno da RPC; booking-form.tsx:422-424 só usa result.appointment), não mais do estado do navegador
- **Tela final deve exibir pagamento** ⬆
  - Evidência: src/components/public-site/booking-success.tsx:105-108 — linha 'Pagamento' com paymentPreferenceLabel ('No local — Pix' / 'No local, a combinar', lib/booking:95-98)
- **Tela final deve permitir ADICIONAR AO CALENDÁRIO (.ics)** ⬆
  - Evidência: src/components/public-site/booking-success.tsx:118-126 — botão aponta para /api/public/[tenant]/reserva/[token]/ics; rota real em ics/route.ts (Content-Type text/calendar, attachment) usando buildIcsCalendar RFC 5545 com fold e escape (lib/booking:143-212)
- **Tela final deve permitir REAGENDAR** ⬆
  - Evidência: src/components/public-site/booking-success.tsx:138-146 — botão h-12 visível 'Remarcar ou cancelar' leva à página do token, onde a remarcação é real (reschedule-reservation.tsx + RPC reschedule_public_appointment)
- **Tela final deve permitir cancelar** ⬆
  - Evidência: Mesmo botão de ênfase adequada em booking-success.tsx:138-146 (substituiu o texto text-xs opacity-60); cancelamento em dois toques na página do token (cancel-reservation-button.tsx:25-62)
- **Tela final deve permitir falar com a barbearia**
  - Evidência: src/components/public-site/booking-success.tsx:127-137 — botão com MessageCircle e copy.talkToBusiness quando há whatsappHref
- **Página /[tenant]/reserva/[token]: permitir CANCELAR**
  - Evidência: src/app/(public)/[tenant]/reserva/[token]/page.tsx:197-199 — CancelReservationButton só quando active && canCancel; action cancelPublicReservation → RPC cancel_public_appointment (public-booking/actions.ts:16-33)
- **Página /[tenant]/reserva/[token]: permitir REMARCAR** ⬆
  - Evidência: src/components/public-site/reschedule-reservation.tsx — escolhe dia/horário pela mesma API de disponibilidade e submete reschedulePublicReservation (public-booking/actions.ts:44-65) → RPC reschedule_public_appointment (migrations/202607280037:529-648) que reaplica antecedência, horizonte, expediente, bloqueios e conflito; mantém serviço/profissional; renderizada em reserva/[token]/page.tsx:184-196 quando canReschedule
- **Página /[tenant]/reserva/[token]: mesma completude de dados da tela final (pagamento, calendário)** ⬆
  - Evidência: src/app/(public)/[tenant]/reserva/[token]/page.tsx:135-166 — 'Situação' (não mais 'Status'), pagamento (156-159), produtos e total; 'Adicionar ao calendário' .ics (174-183); RPC get_public_appointment devolve tudo (migrations/202607280037:461-519)
- **Rotas /servicos, /profissionais, /produtos devem ser destinos públicos úteis** ⬆
  - Evidência: As três viraram páginas completas: servicos/page.tsx (catálogo com CTA por serviço), profissionais/page.tsx (equipe com serviços e CTA com ?profissional=), produtos/page.tsx (grid completo com estoque); 'Ver todos' na home só quando há mais de 6 (page.tsx:289-296)
- **G1 (apresentação estratégica): "Página própria de agendamento com serviço, profissional, dia e horário"**
  - Evidência: Fluxo completo em booking-form.tsx (etapas service/professional/datetime) com disponibilidade real do servidor (availability e first-available routes)
- **§7.10 Título curto na capa** ⬆
  - Evidência: src/app/(public)/[tenant]/page.tsx:103 — line-clamp-3 + tamanho máximo reduzido (text-[2.25rem]/sm:text-5xl, antes lg:text-7xl): título longo não quebra mais a composição da capa
  - O que falta: Nota: o editor ainda aceita 120 caracteres sem contador ou aviso (settings-workspace.tsx:488-495; modules/settings/actions.ts:26) — o excesso é truncado com reticências em vez de prevenido na origem
- **[novo, não coberto na rodada 1] Subrotas /[tenant]/servicos, /profissionais, /produtos auditadas individualmente** •novo
  - Evidência: Deixaram de ser redirects de 8 linhas: src/app/(public)/[tenant]/servicos/page.tsx, profissionais/page.tsx e produtos/page.tsx são páginas completas com header, footer, catálogo, estados vazios e CTAs que pré-selecionam serviço/profissional; o sétimo produto agora aparece
- **[novo, não coberto na rodada 1] Regra §7.10 'Título curto' (heroTitle de até 120 caracteres sem clamp)** •novo
  - Evidência: Duplica o item '§7.10 Título curto na capa' acima — resolvido pelo line-clamp-3 e tamanhos reduzidos em page.tsx:103; limite de 120 chars sem aviso no editor permanece como nota
- **[novo, não coberto na rodada 1] Contradição na autogestão: link 'Remarcar' visível quando o prazo de cancelar já passou** •novo
  - Evidência: src/app/(public)/[tenant]/reserva/[token]/page.tsx:184-205 — remarcar só renderiza com canReschedule, cancelar só com canCancel (mesmo prazo, RPC :484-493), e vencido o prazo aparece uma única mensagem coerente: 'O prazo para remarcar ou cancelar online já passou — fale direto pelo WhatsApp'
- **[novo, não coberto na rodada 1] Upsell sem imagem de produto na etapa 5 + estado duplo de seleção no 'Primeiro disponível'** •novo
  - Evidência: Upsell agora mostra miniatura via ProductThumb (booking-form.tsx:863-866 e 1119-1145); no passo 2, o chip do profissional só acende quando NÃO está em 'primeiro disponível' (booking-form.tsx:635-638), mesmo depois de o slot definir professionalId (353-359)

### Parcial (3)

- **§7.10 Serviço de assinatura não aparece por R$ 0,00 para qualquer visitante — deve haver regra de visibilidade Público/Assinantes/Interno**
  - Evidência: Regra de audience real e aplicada: migrations/202607280037:130-131 (catálogo) e :284 (create_public_appointment exige audience='public'); seletor no painel em service-form-sheet.tsx:241-254. Mas src/lib/validators/entities.ts:9 ainda aceita price min(0), a RPC não filtra preço zero e o formulário não avisa quando audience='public' e preço=0
  - O que falta: A guarda contra R$ 0,00 no catálogo público continua inexistente — um serviço público com preço 0 aparece de graça para qualquer visitante; a correção da rodada 1 foi só no dado de demo
- **G1: resultado prometido "mais organização e MENOS MENSAGENS"**
  - Evidência: Avanço real: remarcação e cancelamento self-service pelo token (reschedule_public_appointment) e lembretes com lastro (api/cron/reminders). Mas confirmar um pendente no painel não notifica o cliente: setAppointmentStatus (modules/appointments/actions.ts:203+) não chama sendEmail nem WhatsApp — sendEmail só é usado em api/cron/leads/route.ts; no modo manual o pendingNote continua mandando esperar resposta 'pelo WhatsApp'
  - O que falta: O ciclo do modo manual (padrão) ainda não fecha sem mensagem humana: a barbearia confirma e o cliente só descobre se alguém mandar mensagem. A copy agora é honesta, mas a promessa de venda 'menos mensagens' segue parcialmente entregue
- **[novo, não coberto na rodada 1] Pilar G1 completo: confirmações, lembretes e cancelamentos** •novo
  - Evidência: Lembretes reais (src/app/api/cron/reminders/route.ts, idempotente via reminder_sent_at, respeita whatsapp_reminders_enabled); cancelamento e remarcação públicos reais; confirmação automática opcional por modo. Falta a notificação ativa ao cliente quando a barbearia confirma um pendente (nenhuma chamada de envio em modules/appointments/actions.ts)
  - O que falta: Mesmo gap do item G1 'menos mensagens': a confirmação manual não gera aviso automático ao cliente

### Não atendido (1)

- **[novo, não coberto na rodada 1] Seções de conteúdo do site público (public_site_sections) renderizadas na página** •novo
  - Evidência: A RPC nova continua entregando 'sections' (migrations/202607280037:157-165) e o tipo declara (src/types/domain.ts:125), mas grep por '.sections' em src/**/*.tsx devolve zero componentes — nenhuma renderização
  - O que falta: FACHADA: é o único resquício de fachada da dimensão — um CMS de seções cujo dado atravessa banco→RPC→tipo e morre sem nunca chegar à tela. Ou renderizar, ou remover da RPC e do tipo

### Verificação adversarial: confiavel


---

## Mobile, acessibilidade e gráficos (§6, §10, §12)

Esta dimensão foi a que mais avançou de verdade: o design system foi corrigido na raiz (sheet vira tela cheia no mobile, botão default h-12/md:h-11, Input/Select h-12/md:h-11, borda de controle #5B6B7D/#64748B com 3,2-4,8:1, anel de foco azul dedicado), a tabela agora empilha em cartões por padrão via CSS (globals.css) com data-label nas telas de catálogo, e nasceram de fato o toast global com Desfazer, o mapa de calor com alternativa textual, o gráfico de fluxo com período anterior tracejado e os tokens semânticos de cor por significado nos dois temas. Não encontrei fachadas nesta dimensão: todos os componentes novos estão importados e em uso real. O que resta é residual: 6 controles crus abaixo de 44px em filtros do financeiro, cash-flow-chart sem tooltip e com hexes próprios fora dos tokens, heatmap em escala verde (não grafite→dourado) e sem legenda de intensidade, EmptyState continua sem CTA, nenhum teste de viewport 360px foi criado, e os gráficos de barras ainda desenham o eixo vazio atrás da mensagem de sem-dados. Dos 41 itens originais, 15 subiram de status; 2 continuam NAO_ATENDIDO (teste 360px e estado vazio com ação).

### Atendido (31)

- **§10 — Formulários em tela inteira no mobile (sheets viram full-screen)** ⬆
  - Evidência: src/components/ui/sheet.tsx:70 — classe base agora usa data-[side=right]:w-full + data-[side=right]:sm:max-w-md; 9 callers usam className="w-full gap-0 ... sm:max-w-md" (ex.: manual-appointment-sheet.tsx:262, appointment-detail-sheet.tsx:146). Única exceção é o drawer de Menu (mobile-tab-bar.tsx:94, w-80), que é navegação, não formulário.
- **§10 — Margem lateral de 16px no mobile**
  - Evidência: src/components/layout/dashboard-shell.tsx:190 — <main className="mx-auto max-w-[1500px] p-4 pb-24 sm:p-6 sm:pb-24 lg:p-8">; header com px-4 (:161).
- **§10 — Não colocar dois botões principais lado a lado**
  - Evidência: Re-executei o scan Python (dois <Button> sem variant a menos de 400 caracteres um do outro) em todos os .tsx: 0 ocorrências.
- **§10/§12 — Tabelas viram cartões; nenhuma tabela essencial depende de rolagem horizontal no celular** ⬆
  - Evidência: src/components/ui/table.tsx:17-37 (responsive=true por padrão, data-responsive) + src/app/globals.css:403-451 (abaixo de 640px thead vira sr-only, tr vira cartão com borda, td vira flex com rótulo via data-label). data-label aplicado em servicos (3), produtos (11), planos (6, inclui assinantes em 'Contratos ativos'), permissoes (matriz, :84). Caixa e 'Vendas por profissional' têm cartões manuais sm:hidden (caixa.tsx:162,379). Nenhuma tabela do painel depende mais de rolagem horizontal. Ressalva menor: rankings de caixa.tsx:457/495, comissoes.tsx:220/262 e profissionais/[id]/page.tsx:414 empilham sem data-label (números aparecem sem rótulo no cartão).
- **§10 — Resumo financeiro mostra no máximo dois cartões por linha no mobile**
  - Evidência: src/app/(dashboard)/dashboard/page.tsx:545 e financeiro/_sections/resumo.tsx:156 — grid gap-4 sm:grid-cols-2 xl:grid-cols-4 (1 coluna abaixo de 640px); relatorios.tsx:104 sm:grid-cols-3.
- **§10 — Agenda abre em "Dia" por padrão no mobile** ⬆
  - Evidência: src/app/(dashboard)/agenda/page.tsx:127-129 — const activeView = VIEWS.includes(view) ? view : "dia" — sem parâmetro na URL o padrão agora é 'dia' em qualquer largura (a visão 'proximos' deixou de existir; VIEWS = dia/semana/mes/lista, :59).
- **§10 — Botão "Ver página de agendamento" deve existir no mobile** ⬆
  - Evidência: src/components/layout/dashboard-shell.tsx:96-102 — o grupo 'Sua conta' do Menu mobile traz 'Página de agendamento' (href /{tenant.slug}, external), junto de 'Minha conta' e 'Meu plano NexoBarber', exatamente como o §9.2 pede; renderizado por mobile-tab-bar.tsx:107-126 com min-h-12.
- **§10 — Nenhum gesto de arrastar como única forma de concluir uma ação**
  - Evidência: grep draggable|onDrag|dragstart|onTouchStart|swipe em src/**/*.tsx → 0 resultados; o novo agenda-board.tsx opera por cliques (openCreate em :302, abrir detalhe em :347) e rola dentro do próprio contêiner (:216 overflow-x-auto).
- **§6.2 — Barras horizontais ordenadas do maior para o menor com o valor no fim da barra** ⬆
  - Evidência: src/components/dashboard/bar-list.tsx:38-45 — valor completo (formatBRL) alinhado ao fim de cada linha + hint de quantidade; dados chegam ordenados desc (caixa.tsx:124-128 sort por revenue/total; RPC revenue_breakdown com order by t.total desc / t.revenue desc em supabase/migrations/202607280030_fase0_correcoes.sql:631,662,671). Percentual e valor também no breakdown de pagamento (relatorios.tsx:139-146).
- **§6.2 — Rosca só para 2–5 categorias (ex.: formas de pagamento), sempre com legenda, valor e percentual** ⬆
  - Evidência: src/app/(dashboard)/financeiro/_sections/relatorios.tsx:133-156 — cada forma de pagamento mostra rótulo, valor formatBRL E percentual como texto '({pct}%)' (:142-146); o período agregado está declarado no subtítulo do card: 'Todo o histórico recebido, não só o período escolhido' (:128-130). Barras horizontais no lugar da rosca seguem sendo substituição legítima pelo próprio §6.2.
- **§6.2/§12 — Todo gráfico precisa de legenda** ⬆
  - Evidência: monthly-revenue-chart.tsx:43-52 (Serviços/Produtos com amostra de cor); cash-flow-chart.tsx:78-107 (Recebido, Despesas e amostra de linha tracejada 'Recebido no {período anterior}'); BarList é auto-rotulado por linha; heatmap rotula eixos (dias :97-105, horas :111-116) e imprime o valor dentro de cada célula — sem strip de intensidade (penalizado no item do heatmap, não aqui).
- **§6.2/§12 — Todo gráfico precisa de alternativa textual** ⬆
  - Evidência: Heatmap: listas textuais de melhores/piores horários (occupancy-heatmap.tsx:145-175) + caption sr-only (:89-91). Cash-flow: aria-label com os três totais (:113) + linha-resumo textual 'No período: recebido X · despesas Y · no {anterior} Z' (:175-180). Monthly: aria-label (:57) + total do período (:143-146), e no único lugar onde é usado (PDF, relatorio-financeiro/page.tsx:233) é acompanhado de ReportTables com os mesmos dados em texto (:237-260).
- **§6.3 — O que não usar (3D, pizza com muitas fatias, arco-íris, só cor para diferenciar séries, animação longa, valores sem unidade)**
  - Evidência: Sem pizza/3D (SVGs: monthly, cash-flow, heatmap — todos barras/linha/grade); paletas de 2-3 cores semânticas, sem arco-íris; período anterior diferenciado por FORMA (tracejado, cash-flow-chart.tsx:169) além da cor; animações do globals.css são só da vitrine pública e respeitam prefers-reduced-motion (:373-392); valores em BRL. Ressalva mínima mantida: rótulos compactos do monthly sem prefixo R$ (:121).
- **§12 — Possui um único botão de ação principal** ⬆
  - Evidência: A anomalia do Financeiro foi eliminada: os 3 atalhos dourados viraram navegação por seções (FinanceNav com <Link>, finance-nav.tsx:49-60; financeiro/page.tsx:81) e cada seção tem um único submit primário; Configurações agora salva tudo numa única barra sticky (settings-workspace.tsx:672). Scan de pares de botões default adjacentes: 0 em todo o src.
- **§12 — O título explica claramente onde o usuário está**
  - Evidência: src/components/layout/page-header.tsx segue com h1 + eyebrow + descrição em todas as telas; o Financeiro unificado troca a descrição conforme a seção ativa (financeiro/page.tsx:19-26,74-78).
- **§12 — Texto comum tem contraste mínimo de 4,5:1**
  - Evidência: Recalculei sobre os tokens novos de globals.css: escuro — #F4F7FA/#0B0F14 = 17,9:1, muted #B8C2CC/card #141B24 = 9,59:1, subtle #8B98A7/card = 5,9:1; claro — #475569/#EEF2F6 = 6,74:1, subtle #606F85/#EEF2F6 = 4,54:1 (o comentário em globals.css:88-91 documenta o ajuste deliberado para passar).
- **§12 — Controles e elementos essenciais têm contraste mínimo de 3:1** ⬆
  - Evidência: Token --border-control criado: #5B6B7D escuro / #64748B claro (globals.css:175,111), exatamente o que o gap pedia. Calculado: escuro 3,33:1 sobre field #0F1620, 3,17:1 sobre card, 3,52:1 sobre background; claro 4,76:1 sobre branco, 4,23:1 sobre card. Aplicado em Input (input.tsx:17), Select (select.tsx:47), Textarea (textarea.tsx:10), Button outline (button.tsx:24) e --input agora aponta para border-control (globals.css:113,177), então até os selects crus com border-input herdam. --border #2C3948 ficou só como divisor.
- **§12 — Cor nunca é a única forma de indicar situação**
  - Evidência: appointment-status-badge.tsx segue com rótulo textual para cada status; tendências do dashboard combinam ícone + texto (dashboard/page.tsx:558-565); período anterior é tracejado além de cinza (cash-flow-chart.tsx:169); heatmap imprime o número dentro da célula (occupancy-heatmap.tsx:135); matriz de permissões usa Check/Minus (permissoes/page.tsx:87-91).
- **§12/§5.2 — Erros explicam como corrigir**
  - Evidência: src/lib/errors/index.ts:5-6 e seguintes seguem traduzindo códigos em instruções acionáveis (APPOINTMENT_CONFLICT → 'Esse horário acabou de ser reservado. Escolha outro.').
- **§12 — Cliques repetidos não duplicam cadastro, pagamento ou agendamento**
  - Evidência: Camadas preservadas e ampliadas: confirmPayment é explicitamente idempotente (src/modules/financial/actions.ts:58-59, 'if (existing.status === "paid") return'); exclusion constraint gist em appointments segue na migration core; formulários novos desabilitam submit durante pending (counter-sale-form.tsx:380 disabled={pending || !lines.length}); toast de Desfazer com trava de duplo clique (toast.tsx:136-144 running).
- **§12 — Valores mostram unidade e período** ⬆
  - Evidência: Os casos reprovados foram corrigidos: 'A receber' virou 'A receber no período' com hint 'Saldo total em aberto: R$...' (resumo.tsx:116-125); 'Saldo total' virou 'Recebido desde sempre' (relatorios.tsx:96-100); título do gráfico carrega o período ('Entrou e saiu — {period.label}', resumo.tsx:204-206); breakdown de pagamento declara o período agregado (relatorios.tsx:128-130); KPIs do dashboard nomeiam hoje/comparação (dashboard/page.tsx:450-488). Ressalva mínima: rótulos compactos dos SVGs seguem sem prefixo R$ (monthly-revenue-chart.tsx:121).
- **§12 — O usuário recebe confirmação após salvar** ⬆
  - Evidência: Sistema global de toast criado de verdade: src/components/ui/toast.tsx (aria-live polite :100, pausa em hover/foco :153-156, Desfazer com UNDO_DURATION :34-35), montado no layout do painel ((dashboard)/layout.tsx:33) e ligado via useActionToast em 8 fluxos que fecham o painel no sucesso (client-form.tsx:40, service-form-sheet.tsx:79, product-form-sheet.tsx:52, membership-plan-sheet.tsx:63, delete/archive/restore). Formulários que permanecem abertos confirmam com Alert inline (expense-form.tsx:49-55, receivable-form.tsx:52-58, counter-sale-form.tsx:225-231). Ações de status (Confirmar/Concluir/Receber) confirmam pela troca visível do badge na própria linha — sem toast, mas com feedback.
- **§12 — Textos não utilizam termos técnicos desnecessários**
  - Evidência: Re-grep de slug|endpoint|webhook|RLS|token em (dashboard)/*.tsx: todos os hits são código (tenant.slug em hrefs) ou comentários, exceto um 'RLS' visível em permissoes/page.tsx:102 — que aparece entre parênteses DEPOIS da explicação em português ('isolamento por barbearia (RLS)'), padrão aceitável.
- **§12 — A ação mais frequente pode ser concluída sem abrir menus escondidos** ⬆
  - Evidência: Confirmar/concluir/cancelar seguem inline na linha da agenda (appointment-actions.tsx:130-147); receber pagamento é inline no cartão mobile do caixa com select de forma + Confirmar (caixa.tsx:198-222); venda balcão tem página própria (/vendas) com resumo sticky; novo agendamento é CTA no topo + clique direto no slot do board (agenda-board.tsx:302). A tensão com o item de três-pontos foi resolvida a favor das ações frequentes.
- **§12 — A tela funciona em 360, 768, 1024 e 1440 px** ⬆
  - Evidência: Os três bloqueadores da rodada 1 foram corrigidos no código: sheet ocupa a tela toda no mobile (sheet.tsx:70), tabelas empilham por padrão (globals.css:403-451), alturas 44-48px (button/input/select). Conteúdo largo rola no próprio contêiner: board da agenda (agenda-board.tsx:216-217 overflow-x-auto + min-w-[34rem]) e heatmap (occupancy-heatmap.tsx:87-88 overflow-x-auto + min-w-[520px]); drawer do Menu tem w-80=320px < 360. tsc --noEmit passa. A ausência de teste automatizado segue penalizada no item de testes de viewport, não aqui.
- **[novo] §12 — Valores mostram unidade e período (casos 'A receber', 'Saldo total', títulos de gráfico)** •novo
  - Evidência: Todos os casos apontados na rodada 1 foram renomeados/corrigidos: resumo.tsx:116-125 ('A receber no período' + 'Saldo total em aberto'), relatorios.tsx:99 ('Recebido desde sempre'), resumo.tsx:204-206 (título do gráfico com period.label), relatorios.tsx:128-130 (período do breakdown declarado).
- **[novo] §12 — Confirmação após salvar: sistema global de toast** •novo
  - Evidência: src/components/ui/toast.tsx é um sistema completo (variantes, aria-live, pausa em hover/foco, ação de Desfazer com janela de 6s — :34-35), montado em (dashboard)/layout.tsx:33 e consumido por useActionToast em 8 componentes. Não é fachada: o hook dispara no ciclo do useActionState e os sheets que fecham no sucesso são exatamente os que o usam.
- **[novo] §12 — Erros explicam como corrigir / textos sem jargão (itens não avaliados na rodada 1)** •novo
  - Evidência: lib/errors/index.ts mapeia códigos para instruções acionáveis; jargão visível ao usuário limitado a 'RLS' parentético em permissoes/page.tsx:102, precedido da explicação em português.
- **[novo] §12 — A ação mais frequente sem menus escondidos (tensão com o padrão de três pontos)** •novo
  - Evidência: A tensão foi resolvida com critério: ações frequentes inline (appointment-actions.tsx, caixa.tsx:198-222) e ações raras dentro do sheet de detalhe da agenda (appointment-detail-sheet.tsx:343-393) — nem tudo foi enterrado em menu, nem tudo ficou exposto.
- **[novo] Bug de tema do gráfico no PDF (relatorio-financeiro reusa o MonthlyRevenueChart em layout branco)** •novo
  - Evidência: Resolvido pela raiz: o chart não decide mais cor por prefers-color-scheme — usa tokens (monthly-revenue-chart.tsx:100,110 var(--chart-received/billed), comentário :17-22 documenta o conserto). O tema escuro só entra via classe .dark aplicada pelo PanelTheme, que é montado apenas no layout do painel e se limpa ao desmontar (panel-theme.tsx:51-56); a rota (print) abre em nova aba sem PanelTheme, então resolve os tokens claros (#047857/#b45309) sobre o fundo branco de (print)/layout.tsx — legível para impressão.
- **[novo] §6.1 — Paleta de gráfico no TEMA CLARO (na rodada 1 era escala de cinza oklch)** •novo
  - Evidência: src/app/globals.css:126-136 — o tema claro agora define paleta semântica real (--chart-1 #b45309 ... --chart-billed #b45309, --chart-received #047857, --chart-expense #b91c1c, --chart-receivable #1d4ed8, --chart-commission #6d28d9, --chart-previous #64748b), escurecida deliberadamente para manter contraste sobre fundo claro; a escala de cinza neutra do shadcn sumiu.

### Parcial (18)

- **§10/§5.1/§12 — Botões principais com 48px de altura no mobile e mínimo 44×44px** ⬆
  - Evidência: src/components/ui/button.tsx:34-44 — default h-12 md:h-11, sm h-11, lg h-12, icon size-12 md:size-11, icon-sm size-11; xs/icon-xs (36px visuais) recebem .touch-target que amplia o alvo para 44×44 via ::after (src/app/globals.css:235-248).
  - O que falta:  [Rebaixado pelo verificador adversarial — ver seção de verificação.]
- **§10/§5.2/§12 — Campos com 48px de altura no mobile (mínimo 44px no desktop)**
  - Evidência: Base corrigida: src/components/ui/input.tsx:17 (h-12 md:h-11), select.tsx:47 (data-[size=default]:h-12 ... md:h-11) e selectClass compartilhado h-12 md:h-11 (caixa.tsx:41-42, counter-sale-form.tsx:35).
  - O que falta: Restam controles crus abaixo do mínimo em telas usadas no celular: receivables-list.tsx:112 (select h-8=32px), period-filter.tsx:71 e :86 (inputs de data h-9=36px), a-receber.tsx:171 (select h-9), expense-form.tsx:97 e receivable-form.tsx:63 (selects h-10=40px). O núcleo do gap anterior (elevar a base do DS) foi resolvido; sobraram esses 6 pontos.
- **§10 — Ações menos usadas ficam no menu de três pontos** ⬆
  - Evidência: grep MoreHorizontal|EllipsisVertical → só src/components/platform/admin-row-actions.tsx (super-admin). Na agenda as ações secundárias (Desfazer, Cancelar, Remarcar, WhatsApp) agora vivem dentro do AppointmentDetailSheet aberto ao tocar no atendimento (agenda-board.tsx:408; appointment-detail-sheet.tsx:343-393) — cumpre a intenção sem o padrão literal.
  - O que falta: Nas linhas de catálogo as ações secundárias continuam expostas como ícones inline (ocultar/excluir em servicos/page.tsx:135-169 e equivalentes em produtos): não há nenhum menu de três pontos no painel do dono.
- **§10 — Manter ações importantes ao alcance do polegar**
  - Evidência: Barra inferior fixa com alvos min-h-12 (mobile-tab-bar.tsx:57,71,85); toasts posicionados acima dela (toast.tsx:98 bottom-20); novos: barra de salvar sticky em Configurações (settings-workspace.tsx:672, sticky bottom-20) e resumo sticky na venda balcão (counter-sale-form.tsx:217).
  - O que falta: Agenda, Clientes e Serviços continuam com o CTA principal apenas no topo da página (PageHeader) — o padrão sticky-bottom não foi replicado nas telas operacionais que o gap anterior citava.
- **§10 — Usar carregamento progressivo para conexões lentas**
  - Evidência: grep Suspense em src/**/*.tsx → 0 resultados; find loading.tsx → apenas src/app/(dashboard)/loading.tsx (skeleton de rota inteira).
  - O que falta: Segue sem streaming por seção: gráficos, heatmap e listas longas bloqueiam a rota inteira. O financeiro virou seções server-side (financeiro/page.tsx:88-137) mas cada seção ainda é aguardada por completo antes do primeiro paint.
- **§6.1 — Cores fixas por significado (#F2B84B faturamento, #34D399 recebido, #F87171 despesas, #60A5FA a receber, #A78BFA comissões, #8B98A7 tracejado para período anterior)** ⬆
  - Evidência: Tokens semânticos criados nos DOIS temas: src/app/globals.css:63-68 (@theme --color-chart-billed/received/expense/receivable/commission/previous), :131-136 (claro, escurecidos p/ contraste) e :193-198 (escuro, hexes exatos do guia). Usados no monthly-revenue-chart.tsx:45,49,100,110 (bg-chart-received/bg-chart-billed e fill var(--chart-received)).
  - O que falta: O cash-flow-chart.tsx:67-75 define hexes próprios num <style> local (--out #c2453a claro / #fb8072 escuro, em vez de --chart-expense #b91c1c/#f87171; --in e --prev batem em espírito) — semanticamente coerente, mas fora dos tokens; e o BarList usa bg-primary uniforme (bar-list.tsx:49). Não é fachada: as cores por significado existem e regem os gráficos, só não são consumidas de um lugar único.
- **§6.2 — Linha para evolução no tempo (máx. 3 linhas, comparação com período anterior)** ⬆
  - Evidência: src/components/dashboard/cash-flow-chart.tsx — gráfico novo de evolução com 3 séries e comparação: recebido e despesas + linha TRACEJADA do período anterior em #8b98a7/#77828e (:163-172, strokeDasharray 5 4), usado no Resumo do financeiro (resumo.tsx:209) com previousLabel.
  - O que falta: A comparação com período anterior em tracejado cinza foi entregue, mas as séries principais continuam em barras pareadas, não em linhas — o §6.2 pede linha para evolução no tempo.
- **§6.2 — Mapa de calor de dias × horários (quando a barbearia fica mais cheia), com escala grafite→dourado, legenda de intensidade e alternativa textual 'Melhores horários'/'Horários mais vazios'** ⬆
  - Evidência: src/components/dashboard/occupancy-heatmap.tsx existe e é usado de verdade (relatorios.tsx:9-11,197, card 'Movimento por dia e horário'), alimentado pela RPC appointment_heatmap. Alternativa textual completa: listas 'Melhores horários' e 'Horários mais vazios' com média semanal (:145-175) + caption sr-only (:89-91) + title por célula (:133) + número dentro de cada célula (:135).
  - O que falta: Dois desvios do requisito literal: a escala é verde-esmeralda (--hot 16 185 129 claro / 52 211 153 escuro, :83-84), não grafite→dourado; e não há legenda de intensidade (faixa de escala) — os números nas células compensam na prática, mas a legenda pedida não existe.
- **§6.2/§12 — Todo gráfico precisa de tooltip** ⬆
  - Evidência: monthly-revenue-chart.tsx:81-85 — <title> por coluna com total + quebra serviços/produtos, cobrindo a coluna inteira (rect transparente :86-92); occupancy-heatmap.tsx:133 — title por célula com dia, hora e contagem.
  - O que falta: O cash-flow-chart não tem tooltip por barra/ponto (nenhum <title> no SVG, só o aria-label agregado :113) — é o gráfico principal do Resumo. BarList também não tem title, mas exibe o valor integral como texto, o que torna o tooltip redundante ali.
- **§6.4 — Estado sem dados: mensagem 'Ainda não há dados suficientes' em vez de gráfico vazio**
  - Evidência: Heatmap faz early-return com EmptyState ('Ainda sem histórico suficiente', occupancy-heatmap.tsx:30-37) e BarList early-return (bar-list.tsx:25-29).
  - O que falta: monthly-revenue-chart.tsx:53 e cash-flow-chart.tsx:109 continuam renderizando o <svg> incondicionalmente — sem dados o usuário vê eixo e rótulos de mês vazios COM a mensagem abaixo (:137-141 e :181-184), e não a mensagem NO LUGAR do gráfico.
- **§12 — O foco do teclado está claramente visível em todos os controles**
  - Evidência: Grande avanço real: anel azul dedicado --focus-ring (#60A5FA/#2563EB, globals.css:114,178 — 7,56:1 e 4,77:1 sobre o fundo) aplicado a todos os primitivos (button.tsx:18, input.tsx:17, select.tsx:47, textarea.tsx:10) e aos selects crus via selectClass (caixa.tsx:41-42, counter-sale-form.tsx:35, manual-appointment-sheet.tsx:78 etc.). Scan atual: 28 controles crus sem classes de foco (era ~116), nenhum deles suprime o outline padrão do navegador.
  - O que falta: Entre os 28 sem anel explícito estão o gatilho do Menu e os links da barra inferior (mobile-tab-bar.tsx:66-93, só classes de cor/layout), os checkboxes crus size-4 e botões da vitrine pública (booking-form.tsx:1019,1159) — dependem do contorno default do navegador, não do anel §11.
- **§12 — Ícones importantes possuem texto**
  - Evidência: Botões de rótulo seguem com texto ao lado do ícone (appointment-actions.tsx:141-142); os só-ícone têm title + aria-label (servicos/page.tsx:146-155) e agora alvo de 44px (icon-sm = size-11).
  - O que falta: Nas linhas de tabela as ações continuam só-ícone sem texto visível (ocultar/exibir com <Eye/> em servicos/page.tsx:157-161, excluir via delete-entity-button) — o guia pede texto visível ou menu rotulado, e nenhum dos dois veio.
- **§12/§5.2 — Formulários exibem rótulos acima dos campos**
  - Evidência: Maioria com <Label> acima (client-form, expense-form, manual-appointment-sheet.tsx:281,353,394,432,512).
  - O que falta: O mesmo caso da rodada 1 persiste: no cadastro rápido do agendamento manual, 'Nome do cliente' e 'WhatsApp' continuam só com placeholder + aria-label, sem rótulo visível (manual-appointment-sheet.tsx:331-346) — o grupo tem apenas o Label 'Cliente'.
- **§12 — Gráficos têm legenda, tooltip e alternativa textual (os três juntos)** ⬆
  - Evidência: monthly-revenue-chart cumpre os três (legenda :43-52, title :81-85, aria-label+total :57,143-146); heatmap cumpre tooltip (:133) + alternativa textual (:145-175) com valores diretos nas células.
  - O que falta: O cash-flow-chart — gráfico principal do Resumo — tem legenda e alternativa textual mas NENHUM tooltip por barra/ponto; e o heatmap não tem legenda de intensidade. Nenhum dos quatro gráficos cumpre os três critérios com folga total.
- **[novo] §12 — Cor nunca é a única forma de diferenciar SÉRIES nos gráficos** •novo
  - Evidência: cash-flow-chart diferencia o período anterior por forma (tracejado, :163-172) e separa recebido/despesas em barras pareadas (posição) com legenda; monthly-revenue-chart.tsx:93-112 segue empilhando serviços/produtos diferenciados apenas por cor (verde/dourado), sem padrão ou textura — mitigado por legenda + tooltip por coluna com os dois valores (:81-85).
  - O que falta: No monthly (hoje usado só no PDF impresso, onde cor pode virar cinza) as duas séries empilhadas continuam distinguíveis apenas pela cor.
- **[novo] §12 — Ícones importantes possuem texto (ações destrutivas/estruturais em linha)** •novo
  - Evidência: Mesmo achado do item correspondente: servicos/page.tsx:142-162 (Eye/EyeOff só com title/aria-label) e delete-entity-button seguem só-ícone nas linhas; alvo agora é 44px (icon-sm size-11), o que resolve o toque mas não o rótulo visível.
  - O que falta: Texto visível (ou menu rotulado) segue ausente nas ações de linha.
- **[novo] §5.5/§10 — Linha de tabela/lista com pelo menos 52px** •novo
  - Evidência: src/components/ui/table.tsx:104 — TableCell segue com p-2 (8px vertical): linhas só-texto (comissoes.tsx:231-241, rankings do caixa) ficam em ~36-40px no desktop. Linhas com botões agora passam de 52px porque os botões cresceram para 44px (icon-sm size-11). No mobile o problema muda de figura: cada linha vira um cartão com padding 12px (globals.css:424) e os alvos de toque reais são os botões de 44px.
  - O que falta: O mínimo de 52px por linha não foi adotado como regra: células continuam p-2 e linhas sem botão ficam abaixo do mínimo do guia no desktop.
- **[novo] Foco de teclado no gatilho do Menu da barra inferior mobile** •novo
  - Evidência: src/components/layout/mobile-tab-bar.tsx:83-89 — o SheetTrigger continua só com classes de cor/layout, sem focus-visible; idem os 4 Links da barra (:66-79). Nenhum suprime o outline (não há outline-none), então o contorno padrão do navegador aparece.
  - O que falta: O controle de navegação mais usado no celular segue fora do padrão de foco do §11 (anel azul focus-ring de 3px) que todo o resto do design system adotou — depende do contorno default do navegador.

### Não atendido (2)

- **§10 — Projetar primeiro para 360px / testar com o teclado aberto / testar em 360, 768, 1024 e 1440px (§12)**
  - Evidência: playwright.config.ts continua sem use.viewport e sem devices[]; e2e/ tem só booking-api.spec.ts, public-pages.spec.ts e helpers.ts; grep viewport|360|iPhone|Galaxy em e2e/ e no config → 0 resultados.
  - O que falta: Nenhum teste automatizado de viewport foi criado. As correções de 360px foram feitas (sheet, tabelas, alturas), mas não há nada que impeça regressão — o smoke test de overflow horizontal pedido na rodada 1 segue inexistente.
- **§12 — Estado vazio oferece uma próxima ação**
  - Evidência: src/components/feedback/empty-state.tsx:3-9 — o componente continua aceitando SOMENTE title e description, sem prop de ação; conferi usos em agenda/page.tsx:789,927 e clientes/page.tsx:514: nenhum renderiza CTA junto.
  - O que falta: Exatamente o gap da rodada 1: falta a prop action e o botão correspondente (Novo serviço, Novo agendamento...) em cada uso. As descrições até apontam o caminho em texto ('Cadastre a equipe...'), mas não há ação clicável.

### Não aplicável (2)

- **[novo] Erro de contagem da rodada 1: '11 das 19 páginas sem botão principal' (estoque/usuarios são redirects)** •novo
  - Evidência: Meta-observação sobre o relatório anterior, não requisito de produto. Confirmado no código atual: estoque/page.tsx e usuarios/page.tsx seguem sendo redirects (estoque → /produtos), e o item de CTA único foi reavaliado diretamente nesta rodada (ATENDIDO).
- **[novo] Desvios de linha nas citações do relatório da rodada 1** •novo
  - Evidência: Meta-observação sobre a qualidade do relatório anterior; sem efeito no produto. Todas as evidências desta rodada foram relidas do código atual com arquivo:linha verificados.

### Verificação adversarial: confiavel com ressalvas

- **Correção** — §10/§5.1/§12 — Botões principais com 48px de altura no mobile e mínimo 44×44px: ATENDIDO → PARCIAL. A base do DS está correta (button.tsx:34-44, default h-12 md:h-11; .touch-target em globals.css:235-248), mas overrides explícitos reintroduzem botões abaixo do mínimo em fluxos mobile do painel: src/components/dashboard/period-filter.tsx:94 — <Button size="sm" className="h-9"> 'Aplicar' = 36px sem .touch-target (submit do filtro de período de todo o financeiro); src/components/dashboard/commission-closing-card.tsx:203 — submit principal 'Registrar pagamento' com className="h-10" = 40px; src/components/dashboard/appointment-detail-sheet.tsx:303 — 'Voltar' com className="h-9 w-full" = 36px de altura. É o mesmo tipo de resíduo que o próprio reauditor penalizou como PARCIAL no item de campos (selects h-8/h-9/h-10), mas deixou passar nos botões.
- **Achado adicional** — Botão 'Desfazer' do toast é código morto: src/components/ui/toast.tsx implementa ToastAction, UNDO_DURATION=6000 (:34-35) e trava de duplo clique (:121-144), mas NENHUM chamador passa `action` — useActionToast (toast.tsx:203-222) só envia description/variant, e o único consumidor direto de useToast (notifications-bell.tsx:43,61) também não; grep de onAction em todo o src só encontra o próprio toast.tsx. O 'Desfazer com janela de 6s' citado como entregue na evidência de dois itens (confirmação pós-salvar e idempotência de cliques) é inalcançável no app — os status desses itens se sustentam por outros mecanismos reais (toast de confirmação simples + confirmPayment idempotente em src/modules/financial/actions.ts:58-59 + disabled durante pending), mas a capacidade de desfazer prometida pelo §5.7 não existe na prática.

---

## Camada comercial — landing, preços e leads

É a dimensão que mais mudou desde 28/07, e a mudança é real, não relatório: a landing de barbearia foi reescrita de ponta a ponta — abre pela dor, declara o nicho (badge "Barbearia de 2 a 8 profissionais"), usa os 5 Gs como arquitetura em fluxo conectado, mostra telas do sistema (desenhadas em HTML e rotuladas como demonstração), tem seção dedicada ao "quem sumiu" e duas iscas funcionais (calculadora de lucro e diagnóstico 5G com captura embutida). Os seis depoimentos fictícios saíram das duas landings. A camada comercial deixou de ser fachada: preços v2 encarecem o mensal (59,90/119,90) mantendo o anual (499/999), o alternador mensal/anual nasce no anual, subscriptions ganhou billing_period (migration 0038), e o fluxo Mercado Pago é completo e defensivo (checkout gravado antes do gateway, webhook com assinatura HMAC + anti-replay, idempotência dupla, validação de valor, cupom resgatado só na confirmação) — hoje aguarda credencial e degrada com honestidade ("pagamento online ainda não está ligado... o cancelamento você faz por aqui mesmo"). "Cancele quando quiser" virou verdade: cancelamento self-service com RPC, reversão e execução pelo cron. A régua de lead existe de fato: cron diário em vercel.json, e-mails 24h/72h com cupom VOLTA20, parada por conversão/descadastro, funnel_stage finalmente escrito, /admin/leads com wa.me/mailto e /descadastro com token + prova LGPD (IP, user-agent, versão do termo). Fachadas remanescentes são poucas e pequenas: o formulário de lead continua nunca enviando period_interest (a coluna e a tela do admin exibem um campo que nasce sempre NULL), a arte OG ainda diz "o sistema completo para a sua barbearia", e a landing do salão só recebeu metade da reforma (preços/form/depoimentos sim; dor, 5Gs, telas, iscas e posicionamento não).

### Atendido (28)

- **Pedido (a) do sócio: falar com o nicho de barbearias em crescimento que precisam se organizar para crescer mais** ⬆
  - Evidência: src/app/page.tsx:230-233 (badge 'Barbearia de 2 a 8 profissionais'), :241-249 ('Feito para quem ainda atende na cadeira e não tem tempo de virar administrador'), :39-43 (metadata 'gestão para barbearia de 2 a 8 cadeiras' + 'dono que ainda atende na cadeira')
- **Pedido (b) do sócio: comunicar gestão de clientes e análise de frequência como DIFERENCIAL na landing** ⬆
  - Evidência: src/app/page.tsx:408-457 (seção id='quem-sumiu' com h2 'Quantos clientes sumiram sem você perceber?' + tela ClientsScreen + CTA 'Ver quem sumiu da minha base'); src/components/platform/system-screens.tsx:32-119 (tela 'Clientes · Precisam voltar' com lista de retorno e menção ao WhatsApp); item também no menu do header (:177-182)
- **Pedido (c) do sócio: existir pacote anual com desconto à vista**
  - Evidência: supabase/migrations/202607310038_fase5_camada_comercial.sql:287-298 (versão 2: starter yearly 49900, plus yearly 99900) + src/lib/billing/catalog.ts:36-61 (get_plan_catalog); agora o desconto é real porque o mensal subiu
- **Pedido (c) do sócio: qual a diferença REAL de preço entre anual e mensal no catálogo**
  - Evidência: supabase/migrations/202607310038_fase5_camada_comercial.sql:287-298 — v2: Padrão 59,90×12=718,80 vs 499,00 anual (economia 219,80, 30,6%); Plus 119,90×12=1.438,80 vs 999,00 (economia 439,80, 30,6%). A economia é exibida em reais na landing (pricing-plans.tsx:126-136)
- **Pedido (c) do sócio: anual apresentado como padrão/recomendado e mensal como mais caro** ⬆
  - Evidência: src/components/platform/pricing-plans.tsx:49 (useState<Period>('yearly') — anual pré-selecionado), :64-77 (alternador com hint '2 meses grátis'), :126-146 (economia em R$ e equivalente mensal); mensal encarecido na migration 0038:286-298; src/components/dashboard/subscription-checkout-card.tsx:53 (default yearly) e :103-110 (badge 'Mais escolhido' no anual)
- **Pedido (c) do sócio: ser possível efetivamente CONTRATAR o pacote anual** ⬆
  - Evidência: src/modules/subscription/checkout.ts:115-233 (startCheckout grava billing_checkouts antes do gateway e cria preapproval anual — recurrenceFor em mercadopago.ts:94-99: 12 meses); webhook src/app/api/webhooks/mercadopago/route.ts:278-357 ativa lendo plano/período/valor do checkout; apply.ts:60-79 estende current_period_end por 365 dias. AGUARDA CREDENCIAL: sem MERCADOPAGO_ACCESS_TOKEN o botão nem aparece e a tela diz com clareza que o pagamento online não está ligado (assinatura/page.tsx:197-201; checkout.ts:123-129) — nada quebra
- **Pedido (d) do sócio: existir captação de dados do lead na página de vendas**
  - Evidência: src/components/platform/lead-capture-form.tsx (nome, canal, contato, plano, consentimento obrigatório com versão do texto); renderizado em page.tsx:707, salao/page.tsx:609 e dentro do diagnóstico (diagnostic-5g.tsx:98)
- **Pedido (d) do sócio: tabela de leads no banco (supabase/migrations)**
  - Evidência: 202607240025:104-124 (criação) ampliada por 202607280030:1109-1136 (consent_ip/user_agent/text_version, opt_out_at, unsubscribe_token) e 202607310038:302-335 (nurture_24h_at/72h_at, converted_at, coupon_code, constraint de funnel_stage, índices)
- **Pedido (d) do sócio: mecanismo de FOLLOW-UP por e-mail ou WhatsApp com oferta de desconto para lead que não converteu** ⬆
  - Evidência: src/app/api/cron/leads/route.ts (cron diário — vercel.json '0 13 * * *') + src/lib/leads/nurture.ts:43-60 (decideNurture com regras de parada) e :117-188 (e-mails 24h e 72h com cupom VOLTA20 pré-preenchido em /cadastro?periodo=yearly&cupom=); parada por conversão (conversion.ts + auth/actions.ts:159) e por descadastro. AGUARDA CREDENCIAL (RESEND_API_KEY/EMAIL_FROM): cron responde skipped sem carimbar nada e /admin/leads exibe aviso 'Régua de e-mail desligada' (admin/leads/page.tsx:126-136). Ressalva honesta: a régua automática cobre só canal e-mail (nurture.ts:35-37, decisão documentada por falta de template aprovado no WhatsApp) e o formulário tem WhatsApp como canal padrão — esses leads dependem do follow-up manual pelo /admin/leads
- **Pedido (d) do sócio: existir cupom/desconto no sistema para a oferta imperdível do anual** ⬆
  - Evidência: 202607310038:56-249 (tabelas coupons/coupon_redemptions com RLS fechada, validate_coupon com trava de preço mínimo, redeem_coupon transacional, cupom VOLTA20 20% no anual criado em :339-349); lido de verdade: checkout.ts:53-105 e :155-165, subscription-checkout-card.tsx:123-178 (campo de cupom com preview), webhook :322-351 (resgate na confirmação + volta ao preço de tabela via updatePreapprovalAmount)
- **Pedido (d) do sócio: ser possível ao menos VER e trabalhar os leads capturados** ⬆
  - Evidência: src/app/admin/leads/page.tsx (rota nova sob requirePlatformAdmin: lista paginada com nome, contato clicável — wa.me para WhatsApp e mailto para e-mail —, estágio do funil com filtros, datas da régua, cupom, UTM/origem e erros de entrega); link cruzado no /admin
- **Pedido (e) do sócio: quantificar o custo de trocar o nome NexoBarber por outro**
  - Evidência: Análise entregue na rodada 1 e registrada em docs/14-plano-de-fases.md ('Duas decisões que não são minhas' — 25 ocorrências + 11 minúsculas em 15 arquivos). Hoje 'NexoBarber' aparece em 20 arquivos de src/ (grep -l); a centralização em brandName() (lib/leads/consent.ts:19-26) até reduziu pontos de troca na camada nova
- **Apresentação §2 e §6: usar os 5 Gs (Agenda, Clientes, Financeiro, Equipe, Vendas e Estoque) como arquitetura de comunicação da página** ⬆
  - Evidência: src/app/page.tsx:81-117 (array gs com G1..G5 nomeados, pergunta/resultado e conectores de fluxo '↓ O horário entra na agenda…') renderizado na seção id='os-5gs' (:329-379), ancorada no menu como 'Como funciona'; diagnóstico também é estruturado pelos 5 Gs (diagnostic-5g.tsx:23-59). Ressalva: só na landing barber — a do salão manteve a grade de 6 recursos (salao/page.tsx:33-70)
- **Apresentação §6 — o que evitar: abrir com uma lista longa de recursos** ⬆
  - Evidência: O marquee de 7 recursos foi removido da landing barber (grep 'marquee' em src/app/page.tsx: zero) e a página abre pelo h1 de dor + 4 cards de dor (page.tsx:54-71, 297-327). Ressalva menor: a landing do salão mantém um marquee logo após o hero (salao/page.tsx:322-337), mas de tipos de serviço (Coloração, Escova...), não de recursos do produto
- **Apresentação §6 — o que evitar: usar PDV, ticket médio, CRM ou outros termos sem tradução** ⬆
  - Evidência: Os dois jargões apontados sumiram com a reescrita: grep 'white label|white-label|Linha a linha|Isolamento|RLS|multi-tenant' em page.tsx e salao/page.tsx = zero. A copy nova é toda em linguagem de balcão ('Vendido, recebido e a receber são três números separados', 'estoque que não fica negativo')
- **Apresentação §6 — o que evitar: prometer aumento de faturamento em percentual sem prova real** ⬆
  - Evidência: O depoimento do 'Marcos' com '50% remarca' foi removido (grep 'Marcos,|50%' fora de CSS = zero). A calculadora declara a premissa única e conservadora (5% de recuperação da base, profit-calculator.tsx:25-29 e :75-81); todo número de tela é rotulado (DemoDataNote em system-screens.tsx:230-238; 'Exemplo ilustrativo' no card do salão, salao/page.tsx:286-288)
- **Apresentação §6 e §8: prova social verdadeira — não divulgar depoimento não validado (risco comercial e legal)** ⬆
  - Evidência: Os seis depoimentos nominais foram removidos das duas landings: grep 'depoiment|Rafael|Diego,' em page.tsx e salao/page.tsx só encontra o comentário que documenta a remoção (salao/page.tsx:98-99 'os depoimentos nominais eram ficção apresentada como cliente real e saíram na Fase 0'); no salão viraram 'dailyWins' sem atribuição a pessoas (:100-113)
- **Apresentação §7: iscas de lead com utilidade real (diagnóstico dos 5 Gs, calculadora de lucro, calculadora de comissão, checklist)** ⬆
  - Evidência: Duas das quatro iscas sugeridas foram construídas e estão na landing barber (page.tsx:459-469): ProfitCalculator (sliders de base e tíquete, resultado em R$/mês com premissa declarada) e Diagnostic5G (5 perguntas sim/não, resultado nomeia o G mais fraco e SÓ ENTÃO oferece a captura — diagnostic-5g.tsx:93-99). Calculadora de comissão e checklist não existem, e a landing do salão ficou sem isca — mas o requisito ('pelo menos uma ferramenta pública de valor imediato') está cumprido
- **Apresentação §6 — o que evitar: divulgar como pronta uma função que ainda está no planejamento** ⬆
  - Evidência: 'Cancele quando quiser' agora é função real (cancel-subscription-card.tsx + RPCs request/revoke_subscription_cancellation em 0030:1175-1253, executadas pelo cron de billing :100-114). O pagamento indisponível é descrito sem promessa: checkout.ts:123-129 e o supportNote da assinatura (page.tsx:201) dizem explicitamente que o online não está ligado e que o cancelamento é self-service. E-mail da régua evita até urgência falsa (nurture.ts:170-174 recusa 'vale 30 dias' que não seria cumprido por destinatário)
- **Consistência de benefícios entre a landing e a página de assinatura** ⬆
  - Evidência: src/lib/billing/index.ts:22-37: 'Relatório financeiro em PDF' e 'Produtos e controle de estoque' agora estão nas features do Padrão (com comentário explicando que o gate nunca existiu no código), alinhado ao que a landing vende (page.tsx:667-674) e ao que a tela de assinatura renderiza (assinatura/page.tsx:173-180 usa PLANS[].features)
- **Formulário de captura de lead funcional e legível nas duas landings** ⬆
  - Evidência: lead-capture-form.tsx:27-42: variante clara ativada por vertical==='salon' (campos bg-white com texto #33202b e placeholder 40%); o card do salão virou branco com borda e sombra sobre o fundo creme (salao/page.tsx:597-611, com comentário citando o defeito §5.9). A variante escura permanece na landing barber
- **Guia visual §7.9: a página de plano do sistema deve se chamar 'Meu plano NexoBarber', nunca apenas 'Assinatura'** ⬆
  - Evidência: assinatura/page.tsx:87-90 (title 'Meu plano NexoBarber', eyebrow 'Plano e cobrança'), user-menu.tsx:75 e dashboard-shell.tsx:112 (menu 'Meu plano NexoBarber'); a 'forma de pagamento' que o guia pedia existe via SubscriptionCheckoutCard. Ressalva menor: o título é fixo — tenant da vertical salão também lê 'NexoBarber' (a página até calcula brandName na :77, mas só usa no supportNote)
- **[novo] 'Cancele quando quiser' prometido 5 vezes sem existir cancelamento self-service (risco legal)** •novo
  - Evidência: Cadeia completa: cancel-subscription-card.tsx (confirmação digitada CANCELAR, motivo opcional, reversão) → subscription/actions.ts:25-117 → RPCs 0030:1175-1253 restritas a owner com auditoria → 0032:145-195 (cancellation_effective_at, trigger clear_cancellation_on_renewal) → cron/billing:100-114 executa na data; cancelamento no gateway também baixa a assinatura (webhook :216-239). Todas as ocorrências de 'cancele quando quiser' (page.tsx:271, :652; salao:249, :520-521; checkout-card:101) agora descrevem função existente
- **[novo] Contradição de escopo: landing vende PDF no Padrão, catálogo interno listava como exclusivo do Plus** •novo
  - Evidência: Resolvida na direção certa (alinhar a lista ao código, que nunca restringiu): src/lib/billing/index.ts:26-34 move PDF e estoque para o Padrão; docs/14-plano-de-fases.md item 0.3 registra a decisão 'direção invertida'
- **[novo] Posicionamento do formulário de lead vs o pedido (d) — capturar quem não compra na hora** •novo
  - Evidência: O formulário saiu da última posição e ficou ANTES do CTA final nas duas landings (page.tsx:695-710 com comentário '§5.5'; salao:593-611 com comentário explicando o defeito anterior), e ganhou um segundo ponto de captura no meio da página dentro do resultado do diagnóstico (diagnostic-5g.tsx:93-99) — captura pós-valor, não mais só 'prefere que a gente fale com você?'. Sem exit-intent/sticky, mas o cerne do pedido está resolvido
- **[novo] LGPD — prova de consentimento do lead (IP, user-agent, versão do termo) e caminho de opt-out** •novo
  - Evidência: Migration 0030:1104-1161 (consent_ip inet, consent_user_agent, consent_text_version, consent_at, opt_out_at, unsubscribe_token not null único, RPC unsubscribe_saas_lead idempotente); a rota grava tudo (api/public/leads/route.ts:74-88, com recusa de versão desconhecida); o texto é versionado e recuperável (lib/leads/consent.ts:35-53); /descadastro confirma por POST, nunca por GET (descadastro/page.tsx:20-23, 33-37); o link vai no rodapé de cada e-mail da régua (nurture.ts:99-102)
- **[novo] KPI fantasma: saas_leads.funnel_stage prometido em docs/12-operacao.md mas nunca escrito** •novo
  - Evidência: funnel_stage agora é escrito por quatro caminhos: cron da régua (cron/leads/route.ts:132-143 → nurture_24h_sent/nurture_72h_sent, só após ok do provedor), conversão no cadastro (conversion.ts:38-45 → converted, chamado em auth/actions.ts:159), descadastro (0030:1154 → opted_out) e constraint de valores válidos (0038:311-326); exibido com filtros em /admin/leads:16-30,138-148
- **[novo] Rastreamento de conversão da camada comercial (Meta Pixel com gate de LGPD) — creditado no resumo da rodada 1 sem checagem** •novo
  - Evidência: Checado agora: meta-pixel.tsx:24 só injeta o script com NEXT_PUBLIC_META_PIXEL_ID definido E consentimento 'granted'; consent-banner e MetaPixel no layout raiz (layout.tsx:51-52); welcome-conversion.tsx:22-29 dispara CompleteRegistration uma única vez em /dashboard?bemvindo=1 com regate explícito de consentimento e limpa o parâmetro; lead_submitted rastreado sem PII (lead-capture-form.tsx:91)

### Parcial (10)

- **Pedido (d) do sócio: capturar o interesse pelo pacote anual no lead**
  - Evidência: src/components/platform/lead-capture-form.tsx:72-83 (sem periodInterest no payload) vs src/app/api/public/leads/route.ts:15,67 (rota e coluna prontas)
  - O que falta: FACHADA remanescente: o formulário continua nunca enviando periodInterest — o body do fetch em lead-capture-form.tsx:72-83 tem name/contact/channel/consent/planInterest/vertical/utm/sourcePage/consentTextVersion, sem período — então saas_leads.period_interest nasce NULL em 100% dos leads, e o /admin/leads:216-218 exibe um campo que nunca terá valor. Mitigação parcial fora do lead: quem clica no card de plano leva periodo=yearly ao /cadastro e isso vira preferred_period do usuário (auth/actions.ts:91-92) e billing_period da assinatura de teste (:169-182) — mas o pedido era no LEAD, e ali segue faltando um select de periodicidade
- **Apresentação §5: slogan institucional 'Da agenda ao lucro, sua barbearia sob controle.'**
  - Evidência: grep 'Da agenda ao lucro' em src/: 1 resultado (src/app/page.tsx:245)
  - O que falta: A frase continua sem status de slogan: aparece uma única vez, truncada e embutida em prosa ('Da agenda ao lucro: organize agenda...' — page.tsx:245). Não está no metadata (que agora fala do nicho), no footer, nem na arte OG (opengraph-image.tsx:59 ainda usa o texto antigo 'O sistema completo para a sua barbearia')
- **Apresentação §5 e §6: título principal da página 'Você domina a cadeira. Agora, domine o negócio.'** ⬆
  - Evidência: src/app/page.tsx:234-240 (h1 atual) e :45-53 (decisão documentada)
  - O que falta: O texto aprovado segue inexistente (grep zero), mas o h1 deixou de ser o slogan genérico e virou dor específica ('Você atende o dia inteiro e... não sabe quanto sobrou'), com a decisão registrada e justificada contra a apresentação estratégica no próprio arquivo (page.tsx:45-53 — 'a dor vem antes do produto, Fase 5 §5.6'). O gap da rodada 1 aceitava 'registrar formalmente a decisão de testar a variante'; o registro existe, mas em comentário de código, não como decisão de negócio assinada
- **Apresentação §5 e §6: chamada para ação 'Quero organizar minha barbearia'** ⬆
  - Evidência: src/app/page.tsx:256-257, :447-449, :738-740 (CTAs reais)
  - O que falta: A frase aprovada segue ausente (grep 'Quero organizar' = zero). Porém a condição que a §7 impõe para aceitar 'Testar grátis' ficou mais próxima de cumprida: o cadastro é simples, a mensagem de organização/dor migrou para o h1 e nasceu um CTA de transformação real ('Ver quem sumiu da minha base', page.tsx:447-449 e profit-calculator.tsx:88). Falta só o registro explícito de que 'Começar 7 dias grátis' foi a escolha deliberada de CTA principal
- **Apresentação §6: sequência da página dor → promessa → 5 Gs → fluxo → simplicidade → confiança → converter**
  - Evidência: Ordem real em src/app/page.tsx: hero-dor(208) → a-dor(297) → 5Gs/fluxo(329) → telas(381) → quem-sumiu(408) → iscas(459) → fotos(471) → página do cliente(514) → como começa(611) → planos(642) → lead(695) → CTA final(712)
  - O que falta: Dois dos três buracos da rodada 1 fecharam: o bloco de DOR existe (page.tsx:297-327 + h1) e o FLUXO conectado existe (conectores entre os Gs, :368-375). Segue faltando a etapa de CONFIANÇA: não há FAQ (grep 'faq|perguntas frequentes' nas duas landings = zero) e, com os depoimentos corretamente removidos, nada os substituiu como prova (a demo /aurora aparece só como botão secundário)
- **Apresentação §6: provar simplicidade com telas reais do sistema e vídeo curto no celular** ⬆
  - Evidência: src/components/platform/system-screens.tsx (AgendaScreen, ClientsScreen, FinanceScreen, DemoDataNote) importado e usado em src/app/page.tsx:21-26, 288-293, 396-404
  - O que falta: As telas existem e aparecem três vezes (FinanceScreen no hero :288-293, AgendaScreen+ClientsScreen na seção 'Por dentro' :396-404, ClientsScreen no diferencial :452-454), com rótulo honesto de dados de demonstração. Duas ressalvas: são recriações em HTML fiéis, não capturas reais (decisão documentada em system-screens.tsx:8-15 — defensável, mas não é literalmente 'tela real'); e o vídeo de 30-90s no celular previsto na §7 continua inexistente. A landing do salão não mostra tela nenhuma
- **Consistência de preço: a landing deve exibir exatamente o preço que a cobrança usará**
  - Evidência: As duas landings (page.tsx:154, salao:137), o onboarding e o checkout leem loadPlanCatalog() (catalog.ts:36-61, RPC get_plan_catalog versão vigente); o startCheckout recalcula do catálogo no servidor (checkout.ts:147-151) e o webhook rejeita ativação com valor divergente do checkout gravado (route.ts:283-285, AMOUNT_MISMATCH)
  - O que falta:  [Rebaixado pelo verificador adversarial — ver seção de verificação.]
- **[novo] Violação do §3: vender-se como 'sistema completo' no title e no badge** •novo
  - Evidência: src/app/opengraph-image.tsx:59; src/app/salao/page.tsx:28,214
  - O que falta: Corrigido na landing barber (title virou 'gestão para barbearia de 2 a 8 cadeiras', page.tsx:39-43, com o comentário :33-37 explicando o porquê; badge virou o nicho, :230-233). MAS a arte de compartilhamento continua violando: opengraph-image.tsx:3 e :59 ainda dizem 'O sistema completo para a sua barbearia' — é o texto que aparece quando o link é compartilhado no WhatsApp, o canal principal do nicho. E a vertical salão mantém title 'o sistema completo' (salao:28) e badge 'Plataforma completa' (salao:214)
- **[novo] Subtítulo com os cinco domínios e assinatura curta 'NexoBarber. Gestão simples. Barbearia forte.'** •novo
  - Evidência: src/app/page.tsx:241-249; grep 'Barbearia forte' src/ = 0 resultados
  - O que falta: O subtítulo atual (page.tsx:241-249) cobre agenda, equipe, financeiro e clientes mas continua omitindo vendas/estoque (G5) — curioso, porque o G5 agora existe na seção dos 5 Gs logo abaixo. A assinatura curta segue inexistente: grep 'Barbearia forte' em src/ = zero
- **[novo] Landing do salão (salao/page.tsx) auditada por inteiro contra a arquitetura de comunicação** •novo
  - Evidência: src/app/salao/page.tsx:28, 214, 216-227, 322-337, 339-371, 528-563, 593-611
  - O que falta: Recebeu só metade da reforma. Sim: PricingPlans com alternador e tone claro (:528-563), formulário legível e reposicionado antes do CTA final (:593-611), depoimentos fictícios removidos (:98-113), número de mockup rotulado 'Exemplo ilustrativo' (:286-288). Não: abre por promessa e lista de recursos, não pela dor (h1 :216-222 'Seu salão cheio, sua agenda leve' + grade de 6 features :339-371 + marquee :322-337); mantém 'o sistema completo' no title (:28) e 'Plataforma completa' no badge (:214); sem telas do sistema, sem iscas (não importa Diagnostic5G nem ProfitCalculator), sem FAQ, dois botões de peso igual no hero (:228-246). Não é fachada — é reforma inacabada e o time sabe (comentários citam só §5.5/§5.9 para o salão)

### Verificação adversarial: confiavel com ressalvas

- **Correção** — Consistência de preço: a landing deve exibir exatamente o preço que a cobrança usará: ATENDIDO → PARCIAL. A migration 0038 criou os preços v2 (starter mensal 5990, plus 11990), mas três pontos seguem com os preços v1 hardcoded: (1) create_barbershop cria toda assinatura de teste com price_cents 4990/9990 (supabase/migrations/202607090019_public_vertical_and_salon_theme.sql:146-151; nenhuma migração posterior redefine a função — grep 'create or replace function public.create_barbershop' para em 0019); (2) PLANS.starter.priceCents=4990 e plus=9990 em src/lib/billing/index.ts:19 e :41; (3) o changePlan do console super-admin grava PLANS[plan].priceCents na assinatura (src/modules/platform/actions.ts:84-90) — e, sem credencial do Mercado Pago, o console admin é hoje o único caminho ativo de troca de plano. Resultado na tela: um trial criado hoje mostra 'R$ 49,90/mês' no cartão do plano (src/app/(dashboard)/assinatura/page.tsx:166 exibe sub.priceCents, que veio do 4990 do create_barbershop) ao lado do SubscriptionCheckoutCard que oferece 'Mensal R$ 59,90/mês' na mesma página — dois preços na mesma tela. O caminho de cobrança online em si é consistente (checkout.ts:147-151 recalcula do catálogo; webhook AMOUNT_MISMATCH), por isso PARCIAL e não NAO_ATENDIDO.
- **Achado adicional** — Preços v1 fossilizados fora do catálogo: create_barbershop (migration 0019:146-151) ainda grava price_cents 4990/9990 no trial e o changePlan do super-admin (src/modules/platform/actions.ts:89) grava PLANS.priceCents (src/lib/billing/index.ts:19,41 — também 4990/9990). Todo dono em teste vê 'R$ 49,90/mês' no cartão 'Plano Padrão' da /assinatura enquanto o checkout na mesma tela cobra R$ 59,90/mês — o número antigo errado numa tela reformada; e a ativação manual pelo admin (único caminho enquanto o MP não tem credencial) trava o preço antigo para sempre.
- **Achado adicional** — fallbackCatalog() (src/lib/billing/catalog.ts:13-24) usa os mesmos PLANS.priceCents v1: se a RPC get_plan_catalog falhar, a landing e o onboarding voltam a anunciar 49,90/99,90 (com anual = 10x, ou seja, 499/999 por acaso corretos no anual mas errados no mensal) — degradação silenciosa para preço desatualizado, não para erro.
- **Achado adicional** — Combinação de credenciais parciais na régua: se o dono configurar RESEND_API_KEY/EMAIL_FROM mas NÃO o Mercado Pago, o e-mail de 72h sai prometendo 'Assinar com o cupom VOLTA20' (nurture.ts:177-180), mas quem clica cai num fluxo onde o formulário de checkout nem é renderizado (subscription-checkout-card.tsx:113 e 203-209) — o cupom não tem onde ser usado. Cada credencial degrada com honestidade sozinha, mas o par e-mail-sem-MP promete oferta inutilizável; vale um gate no cron (pular a etapa 72h quando mercadoPagoConfigured() é falso) ou nota na entrega.
- **Achado adicional** — reactivateSubscription do super-admin (src/modules/platform/actions.ts:43-49) reativa qualquer assinatura com current_period_end = agora + 30 dias fixos, ignorando billing_period — um assinante anual reativado manualmente ganharia 30 dias em vez de 365 (menor: caminho admin, mas é o caminho ativo enquanto não há credencial).

---

