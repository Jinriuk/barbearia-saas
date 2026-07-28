# Auditoria do NexoBarber — julho de 2026

Registro completo da auditoria do sistema contra o **guia visual e de layout** entregue
pelo revisor técnico, contra a **apresentação estratégica comercial** e contra os pedidos
diretos do sócio (mensagens de 22–23/07/2026).

O plano de execução derivado deste registro está em [`14-plano-de-fases.md`](14-plano-de-fases.md).

## Método

Onze dimensões auditadas em paralelo, cada uma com um segundo agente encarregado de
**refutar** as conclusões da primeira. Toda linha exige evidência em `arquivo:linha` ou a
busca que provou a ausência. As 59 reclassificações feitas pelos verificadores já estão
aplicadas na coluna de situação — quase todas rebaixando itens que haviam sido dados como
prontos.

## Resultado geral

| Situação | Itens | % |
|---|---:|---:|
| Atendido | 96 | 25% |
| Parcial | 138 | 36% |
| Não atendido | 145 | 38% |
| Não aplicável | 1 | 0% |
| **Total auditado** | **380** | |

## Cobertura por dimensão

| Dimensão | Atendido | Parcial | Não atendido |
|---|---:|---:|---:|
| Fundação visual — cores, tipografia, tokens (§3, §4, §11) | 10 | 10 | 9 |
| Padrão de componentes (§5) | 12 | 16 | 12 |
| Linguagem e navegação (§8, §9) | 8 | 15 | 11 |
| Telas Início e Agenda (§7.1, §7.2) | 8 | 9 | 17 |
| Telas Clientes e Planos (§7.3, §7.4) + pilar G2 | 5 | 8 | 5 |
| Tela Financeiro (§7.5) + pilar G3 | 6 | 14 | 16 |
| Serviços, produtos e estoque (§7.6) + pilar G5 | 2 | 10 | 9 |
| Equipe, Configurações e Minha conta (§7.7–§7.9) + pilar G4 | 17 | 15 | 22 |
| Página pública e fluxo de agendamento (§7.10, §7.11) + pilar G1 | 11 | 16 | 15 |
| Mobile, acessibilidade e gráficos (§6, §10, §12) | 11 | 16 | 14 |
| Camada comercial — landing, preços e leads | 6 | 9 | 15 |

---

## Fundação visual — cores, tipografia, tokens (§3, §4, §11)

A fundação de cor do TEMA ESCURO foi realmente construída e é a parte mais sólida da entrega: as cinco superfícies do §3.1 (#0B0F14, #0E141B, #141B24, #1B2531, #2C3948), o dourado #F2B84B e os semânticos info/sucesso/atenção/erro estão literalmente em src/app/globals.css:98-133, com a fonte Inter carregada e aplicada globalmente. Daí para frente o guia foi cumprido pela metade. O tema CLARO nunca foi implementado segundo o §3.2: o bloco :root (globals.css:55-91) é o padrão neutro do shadcn (#ffffff/#0a0a0a/#e5e5e5), e apenas --success/--warning/--info batem com a tabela; nenhum dos 13 valores estruturais do §3.2 aparece no repositório (busca por #F4F6F8, #EEF2F6, #CBD5E1, #17202A, #475569, #9A5B00 etc. = 0 ocorrências). Não existe qualquer alternância de tema pelo usuário: não há next-themes no package.json, não há cookie nem localStorage de tema, e src/components/layout/panel-theme.tsx força .dark no <html> sem opção de desligar — o item "tema claro/escuro" do §7.9 não existe em /minha-conta nem no menu do usuário. Três exigências técnicas do §4/§11 falharam de forma mensurável e com consequência real: números tabulares não existem em lugar nenhum (0 ocorrências de tabular-nums, substituídos por font-mono/Geist Mono 72 vezes, o que ainda quebra a regra de família única); o ícone padrão é 16px e não 20px; e --input foi mapeado para o divisor #2C3948 em vez da borda de controle #5B6B7D, produzindo 1,47:1 de contraste na borda dos campos contra o cartão — muito abaixo do mínimo de 3:1 que o próprio §12 exige. Por fim, a promessa do §11 "componentes devem usar tokens" não se concretizou: o painel administrativo tem 115 classes de paleta fixa (emerald/rose/amber/sky) contra apenas 17 usos somados de bg/text/border-success|warning|info, e os cinco fundos tonais de aviso do §3 (#0D2A22, #332608, #351517, #10253F, #26313D) não existem como token nem como variante do componente Alert. O relatório docs/entregas/fase-1.md já admitia essa dívida e a jogou para a "Fase 4" — mas docs/entregas/fase-4.md trata de comissões e financeiro, não de tokens: a substituição prometida nunca aconteceu.

### Atendido (10)

- **§3.1 — Superfícies do tema escuro: fundo #0B0F14, menu #0E141B, cartão #141B24, superfície elevada #1B2531, divisor #2C3948**
  - Evidência: src/app/globals.css:99 (--background: #0b0f14), :122 (--sidebar: #0e141b), :102 (--card: #141b24), :104/:109/:111 (--popover/--muted/--accent: #1b2531), :114 (--border: #2c3948). Os cinco valores batem exatamente com a tabela.
- **§3.1 — Semânticos do escuro: info #60A5FA, sucesso #34D399, atenção #FBBF24, erro #F87171**
  - Evidência: src/app/globals.css:130-132 (--success: #34d399, --warning: #fbbf24, --info: #60a5fa) e :113 (--destructive: #f87171). Expostos como utilitários em globals.css:43-45 (@theme inline --color-success/--color-warning/--color-info).
- **§4.1 — Fonte Inter carregada e aplicada em todo o sistema**
  - Evidência: src/app/layout.tsx:2,11-14 importa Inter de next/font/google com variable --font-inter; :46 aplica interSans.variable no <html>. src/app/globals.css:10 mapeia --font-sans para var(--font-inter) e :12-13 faz --font-heading apontar para a mesma família; globals.css:142-145 aplica `@apply font-sans` no html.
- **§4.1 — Evitar fonte fina em tema escuro**
  - Evidência: `grep -rEo 'font-(thin|extralight|light)' --include=*.tsx src/app/(dashboard) src/components` retorna 0 ocorrências. O peso mais leve em uso é font-normal (6 ocorrências).
- **§4.2 — Usar um único conjunto de ícones (Lucide Icons)**
  - Evidência: package.json:24 lista `lucide-react: ^1.23.0` como única biblioteca de ícones. 72 arquivos .tsx importam de 'lucide-react'; a busca por '@heroicons|react-icons|@tabler/icons|phosphor' em src retorna 0 ocorrências.
- **§4.3 — Sistema de espaços base 8px; margem de página 32px no desktop e 16px no celular**
  - Evidência: src/components/layout/dashboard-shell.tsx:265: `<main className="mx-auto max-w-[1500px] p-4 pb-24 sm:p-6 sm:pb-24 lg:p-8">` = 16px no celular, 24px em tablet, 32px no desktop, exatamente como o §4.3 pede. A escala do Tailwind v4 (múltiplos de 4px, com 2/3/4/6/8 = 8/12/16/24/32px) cobre os degraus do guia e é usada de forma consistente (gap-2/gap-3/gap-4/gap-6 dominam o shell).
- **§4.4 — Botões e campos com raio de 10px**
  - Evidência: src/app/globals.css:79 define --radius: 0.625rem (10px) e :48 mapeia --radius-lg para var(--radius). src/components/ui/button.tsx:8 e src/components/ui/input.tsx:12 usam `rounded-lg`, e src/components/ui/select.tsx:47 idem — todos resolvem para 10px.
- **§4.4 — Selos de situação com raio completo**
  - Evidência: src/components/ui/badge.tsx:8 usa `h-5 ... rounded-4xl`; --radius-4xl em globals.css:52 é calc(0.625rem * 2.6) = 26px, muito acima da metade da altura (10px), resultando em pílula completa.
- **§11 — A página pública pode ter tokens próprios de marca, mas deve passar pelo mesmo teste de contraste**
  - Evidência: src/lib/colors.ts:44-66 (`tenantStyle`) emite --tenant-primary/--tenant-secondary/--tenant-bg e resolve --tenant-on-primary/--tenant-on-secondary via `readableTextColor` (:27-29), que calcula a luminância relativa real (:18-25) e escolhe entre #141210 e #ffffff. O fundo por imagem aplica overlay de 82% na cor da barbearia (:59-63), coerente com a camada escura de 55-70% exigida no §7.10.
- **§11 — Não permitir que a personalização da barbearia altere cores de erro, sucesso, pendência e foco**
  - Evidência: Os tokens do tenant vivem em um namespace separado (--tenant-*, src/lib/colors.ts:45-50) e não sobrescrevem --success/--warning/--info/--destructive/--ring, definidos em src/app/globals.css:88-90,113,116,130-132. src/components/dashboard/appearance-editor.tsx só manipula primaryColor/secondaryColor/backgroundColor/backgroundImageUrl (ver o tipo TenantColorSettings em src/lib/colors.ts:35-41), sem acesso aos semânticos.

### Parcial (10)

- **§3.1 — Três níveis de texto: principal #F4F7FA, secundário #B8C2CC, menos importante #8B98A7**
  - Evidência: src/app/globals.css:100 (--foreground: #f4f7fa) está correto, mas existe um único nível secundário: :110 --muted-foreground: #9fb0c1, que não é nenhum dos dois valores do guia (fica entre eles). Buscas por '#B8C2CC' e '#8B98A7' em src retornam 0 ocorrências. Na prática o painel usa `text-muted-foreground` para tudo (195 ocorrências em src, via grep de utilitários semânticos).
  - O que falta: Adicionar --text-secondary (#B8C2CC) e --text-muted (#8B98A7) como tokens distintos e reservar o segundo para datas auxiliares/observações, permitindo hierarquia de leitura em três níveis.
  - Impacto: MEDIO · Esforço: P
- **§3.1 — Cor de marca #F2B84B e cor ao passar o mouse #FFD06A**
  - Evidência: src/app/globals.css:105 (--primary: #f2b84b) e :116 (--ring: #f2b84b) atendem a cor de marca. O hover claro #FFD06A não existe: `grep -rin '#FFD06A' src` = 0 ocorrências; src/components/ui/button.tsx:14 usa `hover:bg-primary/80`, ou seja, o botão principal ESCURECE por opacidade em vez de clarear para o dourado previsto.
  - O que falta: Criar --brand-hover (#FFD06A) e trocar `hover:bg-primary/80` por `hover:bg-[var(--brand-hover)]` na variante default do Button.
  - Impacto: MEDIO · Esforço: P
- **§3.1 — Texto sobre o dourado deve ser #16120A**
  - Evidência: src/app/globals.css:106 usa --primary-foreground: #0b0f14 (a cor de fundo do app) em vez de #16120A. Contraste calculado: #0b0f14 sobre #f2b84b = 10,74:1 (o guia prevê 10,43:1 com #16120A), portanto acessível — é divergência de valor, não de acessibilidade.
  - O que falta: Trocar para #16120A se a fidelidade ao guia importar; sem impacto funcional.
  - Impacto: BAIXO · Esforço: P
- **§11 — Seletor de tema :root[data-theme="dark"] / [data-theme="light"]**
  - Evidência: O código usa a classe .dark (src/app/globals.css:5 `@custom-variant dark (&:is(.dark *))` e :98 `.dark { ... }`), aplicada por src/components/layout/panel-theme.tsx:15. Como estratégia de tema é EQUIVALENTE FUNCIONAL ao data-theme e é a convenção do Tailwind/shadcn — divergência aceitável em si. Mas a mistura já produziu um defeito real: src/components/dashboard/monthly-revenue-chart.tsx:39-40 escreve regras `:root[data-theme="dark"] .revchart` e `:root[data-theme="light"] .revchart` que NUNCA casam, porque `data-theme` não é escrito em lugar nenhum do app (grep 'data-theme' em src retorna apenas essas 2 linhas do próprio gráfico). O gráfico cai no fallback @media (prefers-color-scheme) da linha 36 — logo, um usuário com SO em modo claro vendo o painel escuro recebe a paleta clara do gráfico: --ink #52514e sobre o cartão #141b24 = 2,18:1, reprovado nos 4,5:1 do §12.
  - O que falta: Padronizar em .dark (recomendado) e corrigir monthly-revenue-chart.tsx para usar `.dark .revchart` em vez de `:root[data-theme=...]`, ou passar a emitir data-theme junto com a classe. Sem isso o gráfico fica ilegível para parte dos usuários.
  - Impacto: ALTO · Esforço: P
- **§4.1 — Sistema deve usar apenas uma família de fonte**
  - Evidência: Além de Inter, src/app/layout.tsx:16-19 carrega Geist_Mono e src/app/globals.css:11 define --font-mono. A segunda família é usada de fato 72 vezes (grep 'font-mono' em *.tsx), sendo 52 delas no painel administrativo (37 em src/app/(dashboard), 15 em src/components/dashboard) — sempre em valores monetários/quantidades, ex.: src/app/(dashboard)/produtos/page.tsx:189, src/components/dashboard/bills-view.tsx:70, src/app/(dashboard)/relatorios/page.tsx:141.
  - O que falta: É um contorno para o problema de alinhamento numérico que o guia resolve com números tabulares. Trocar font-mono por tabular-nums em Inter elimina a segunda família e cumpre as duas regras de uma vez.
  - Impacto: MEDIO · Esforço: M
- **§4.1 — Escala tipográfica: título de página 24px/700/32px, título de seção 18px/650-700, número de indicador 28-32px/700, texto normal 16px, rótulo 15-16px/600, auxiliar 14px**
  - Evidência: Não existe escala tokenizada: globals.css não define nenhum --text-*, então valem os defaults do Tailwind. Título de página: src/components/layout/page-header.tsx:21 usa `text-3xl font-semibold` = 30px/600 (guia: 24px/700). Título de cartão: src/components/ui/card.tsx:41 usa `text-base ... font-medium` = 16px/500 (guia: 18px/650-700). Número de indicador: src/app/(dashboard)/dashboard/page.tsx:426 e :456 usam `font-mono text-2xl font-semibold sm:text-3xl` = 24-30px/600 (guia: 28-32px/700). Peso 700 não aparece uma única vez no painel: a distribuição de `font-*` em src/app/(dashboard)+src/components/dashboard é 74 font-medium, 33 font-semibold, 6 font-normal e ZERO font-bold. Ponto positivo: o fluxo público usa text-[15px] (23 ocorrências, ex.: src/components/public-site/booking-form.tsx), coerente com o rótulo de 15-16px.
  - O que falta: Definir a escala como tokens (--text-page-title etc. ou classes .h1/.h2/.kpi) e aplicar em PageHeader, CardTitle e nos cartões de indicador, incluindo o peso 700 que hoje não existe.
  - Impacto: MEDIO · Esforço: M
- **§4.4 — Cartões com raio de 12px**
  - Evidência: src/components/ui/card.tsx:16 usa `rounded-xl`, que em src/app/globals.css:49 é `calc(var(--radius) * 1.4)` = 0.875rem = 14px, não 12px. A derivação existe e é consistente, mas o multiplicador não produz o valor do guia.
  - O que falta: Criar --radius-card: 12px (ou ajustar o multiplicador de --radius-xl para 1.2) e usá-lo no Card.
  - Impacto: BAIXO · Esforço: P
- **§4.4 — Modais e painéis laterais com raio de 16px**
  - Evidência: Modal: src/components/ui/alert-dialog.tsx:61 usa `rounded-xl` = 14px (guia: 16px). Painel lateral: src/components/ui/sheet.tsx:64-65 — a classe do SheetContent não contém NENHUMA classe rounded-*, logo o drawer tem raio 0 (guia: 16px).
  - O que falta: Definir --radius-modal: 16px e aplicar no AlertDialogContent e nas bordas internas do SheetContent (ex.: rounded-l-2xl no side=right).
  - Impacto: BAIXO · Esforço: P
- **§4.4 — Não usar efeitos de brilho, neon ou gradientes em telas administrativas**
  - Evidência: Busca por 'bg-gradient|linear-gradient|radial-gradient|blur-3xl|blur-\[|neon|shadow-amber' em src/app/(dashboard), src/components/dashboard, layout, ui, forms e feedback retorna apenas 3 hits, e as animações decorativas do globals.css (animate-float/orb/kenburns/gradient-pan/btn-shine) têm 0 uso no painel. Porém src/components/dashboard/plan-badge.tsx:19 aplica `bg-gradient-to-r from-amber-500 to-yellow-400 text-black` no selo do plano Plus, e esse selo é renderizado em três telas administrativas: src/components/layout/dashboard-shell.tsx:199 (barra lateral), src/app/(dashboard)/configuracoes/page.tsx:52 e src/app/(dashboard)/dashboard/page.tsx:380. Os outros 2 hits estão em src/components/dashboard/appearance-editor.tsx:110,258 e são legítimos (pré-visualização da página pública e amostra bicolor do seletor de tema do tenant).
  - O que falta: Trocar o gradiente do PlanBadge por fundo sólido `bg-primary text-primary-foreground` (ou variante outline dourada).
  - Impacto: BAIXO · Esforço: P
- **§11 — Componentes devem usar tokens, não cores fixas espalhadas pelo código**
  - Evidência: Quantificação (grep de prefixos bg|text|border|ring|from|to|via|fill|stroke seguidos da paleta nomeada do Tailwind com escala 50-950, em *.tsx): 326 ocorrências em src, sendo 115 dentro do painel administrativo (44 em src/app/(dashboard), 71 em src/components/dashboard) e 9 em src/components/forms. Contraponto: os tokens semânticos são usados apenas 17 vezes ao todo (6 success + 9 warning + 2 info), em só 6 arquivos. Exemplos concretos: src/components/dashboard/appointment-status-badge.tsx:8,12,17,26 pinta TODOS os estados de agendamento com amber/sky/emerald/rose-100/800 + variantes dark, sem tocar nos tokens; src/components/dashboard/appointment-actions.tsx:24,42,50 idem; src/components/forms/auth-card.tsx:26,32,37,40 pinta a tela de login com bg-stone-950/bg-stone-900/bg-amber-500 (um escuro 'à mão', quente, que nem sequer é o grafite azulado #0B0F14, já que (auth) não tem layout com .dark). Um caso reprova contraste: src/app/(dashboard)/produtos/page.tsx:448 usa `text-rose-600` sem variante dark em texto de 14px dentro do cartão escuro — #ec003f sobre #141b24 = 3,83:1, abaixo dos 4,5:1 do §12. Os utilitários com valor hexadecimal arbitrário (bg-[#...]) somam 112, mas estão 100% confinados às landings de marketing (106 em src/app/salao/page.tsx, 6 em src/app/page.tsx) e 0 no painel — o que é permitido pelo §4.4. O próprio docs/entregas/fase-1.md (seção 'Riscos e limitações') reconhece a dívida e a adia para a Fase 4, mas docs/entregas/fase-4.md trata de comissões e financeiro: a substituição nunca foi feita.
  - O que falta: Migrar as 115 classes fixas do painel para os tokens semânticos, começando pelos componentes de maior alcance (appointment-status-badge, appointment-actions, bills-view, auth-card) e criando as variantes de Badge/Alert por significado, para que a paleta pare de ser copiada linha a linha. Corrigir produtos/page.tsx:448 no mesmo passe.
  - Impacto: ALTO · Esforço: G

### Não atendido (9)

- **§3.1 — Borda de controle #5B6B7D para campos, seletores e controles (contraste previsto de 3,2:1 sobre o cartão)**
  - Evidência: src/app/globals.css:115 define --input: #2c3948 (o divisor discreto), não #5B6B7D. O valor #5B6B7D aparece só em globals.css:129 (--sidebar-ring) e no comentário da :95 — busca `grep -rin '#5B6B7D' src` retorna 2 linhas, nenhuma ligada a campos. Consequência calculada: #2c3948 sobre o cartão #141b24 dá 1,47:1; o valor do guia (#5b6b7d) daria 3,17:1. O componente src/components/ui/input.tsx usa `border-input`, herdando a borda quase invisível.
  - O que falta: Separar os dois papéis: criar --border-control (#5B6B7D) e apontar --input e a borda de Input/Select/Textarea/Checkbox para ele, mantendo --border (#2C3948) apenas para separadores decorativos. Reverificar contraste ≥3:1 nos 4 componentes.
  - Impacto: ALTO · Esforço: P
- **§3.1 — Roxo claro #A78BFA para comissões e assinaturas**
  - Evidência: `grep -rin '#A78BFA' src` = 0 ocorrências. Nenhuma classe purple/violet aparece em src/app/(dashboard) nem em src/components/dashboard (grep de paleta Tailwind por diretório não retorna purple/violet/fuchsia). As telas /comissoes e /planos não têm cor de papel própria.
  - O que falta: Criar --accent-purple (#A78BFA) e aplicar em selos/gráficos de comissão e assinatura. O guia qualifica como 'quando necessário', então é opcional.
  - Impacto: BAIXO · Esforço: P
- **§3.1/§11 — Foco do teclado em azul #60A5FA (§11: --focus-ring: 0 0 0 3px rgba(96,165,250,0.45))**
  - Evidência: src/app/globals.css:116 define --ring: #f2b84b (dourado, igual à marca). `grep -rn 'focus-ring\|--focus' src` = 0 ocorrências — o token do §11 não existe. src/components/ui/button.tsx:14 usa `focus-visible:ring-ring/50`, ou seja, o anel de foco é dourado translúcido e se confunde com o próprio botão principal (que é dourado sólido).
  - O que falta: Criar --focus-ring azul e aplicá-lo nas classes focus-visible de Button/Input/Select/Checkbox, para o foco não colidir com a cor de marca.
  - Impacto: MEDIO · Esforço: M
- **§3 — Fundos tonais para avisos: sucesso #0D2A22, atenção #332608, erro #351517, informação #10253F, neutro #26313D**
  - Evidência: Buscas por '#0D2A22', '#332608', '#351517', '#10253F' e '#26313D' em src (css/ts/tsx) retornam 0 ocorrências cada. src/components/ui/alert.tsx:11-16 só tem as variantes `default` e `destructive`, ambas com `bg-card` — não existem variantes de sucesso, atenção ou informação, nem fundo tonal.
  - O que falta: Adicionar 5 pares fundo/texto como tokens e criar as variantes success/warning/info/neutral no Alert, aplicando cor viva só em ícone, título ou borda esquerda, como o guia manda.
  - Impacto: ALTO · Esforço: M
- **§3.2 — Tema claro opcional com a paleta específica (fundo #F4F6F8, superfície #EEF2F6, borda #CBD5E1, texto #17202A/#475569/#64748B, botão #9A5B00 com texto branco, erro #B91C1C)**
  - Evidência: src/app/globals.css:55-91 é o preset neutro do shadcn. Convertendo os oklch: --background = #ffffff (guia: #F4F6F8), --foreground = #0a0a0a (guia: #17202A), --border = #e5e5e5 (guia: #CBD5E1), --muted-foreground = #737373 (guia: #64748B), --primary = #b57c27 (guia: #9A5B00), --primary-foreground = #110c07 (guia: #FFFFFF), --destructive = #e7000b (guia: #B91C1C). Só :88-90 (--success #047857, --warning #b45309, --info #1d4ed8) coincidem com a tabela. Buscas por #F4F6F8, #EEF2F6, #CBD5E1, #17202A, #475569, #64748B, #9A5B00, #B91C1C em src = 0 ocorrências cada.
  - O que falta: Reescrever o bloco :root com os 13 valores do §3.2 (atenção: o guia se contradiz na borda — §3.2 diz #CBD5E1 e §11 diz #D6DEE7; escolher um e registrar). Sem isso, mesmo que a alternância seja implementada, o tema claro não é o tema do guia.
  - Impacto: ALTO · Esforço: M
- **§1 + §7.9 + §11 — Tema claro acionado pelo usuário e lembrado pelo sistema (item 'tema claro/escuro' em Minha conta); na primeira visita pode seguir a preferência do aparelho**
  - Evidência: Não existe alternância. (a) `grep -n 'next-themes' package.json` = 0 (a única dep de UI relevante é lucide-react, package.json:24). (b) src/components/layout/panel-theme.tsx:14-23 força `document.documentElement.classList.add('dark')` no efeito e num <script> inline, sem ler nem gravar preferência. (c) `grep -rn 'localStorage' src` retorna 5 hits, todos em meta-pixel/notifications-bell/consent — nenhum de tema. (d) Nenhum cookie de tema: `grep -rn 'cookies()' src | grep -i theme` = 0. (e) src/app/(dashboard)/minha-conta/page.tsx (arquivo inteiro, 40 linhas) renderiza só ProfileForm e PasswordForm — não há controle de tema. (f) src/components/layout/user-menu.tsx:58-92 lista Minha conta, Configurações, Assinatura, Plataforma e Sair — nenhum item de tema. (g) Nenhum código lê prefers-color-scheme para decidir o tema do painel.
  - O que falta: Implementar o alternador completo: token de preferência (cookie httpOnly=false ou localStorage lido por script inline anti-flash), controle em /minha-conta, fallback para prefers-color-scheme na primeira visita, e substituir o force-dark de panel-theme.tsx pela leitura da escolha salva. Depende do item anterior (paleta clara correta) para fazer sentido.
  - Impacto: ALTO · Esforço: G
- **§4.1 — Valores monetários precisam ter números tabulares (font-variant-numeric: tabular-nums)**
  - Evidência: `grep -rn 'tabular-nums\|tabular_nums\|font-variant-numeric' --include=*.ts --include=*.tsx --include=*.css src` retorna 0 ocorrências em todo o repositório. Nenhum token, nenhuma classe utilitária, nenhuma regra em globals.css.
  - O que falta: Adicionar uma classe utilitária (ex.: .num { font-variant-numeric: tabular-nums; }) em globals.css ou aplicar `tabular-nums` do Tailwind nos ~52 pontos do painel que hoje usam font-mono, substituindo a fonte mono.
  - Impacto: MEDIO · Esforço: M
- **§4.1 — Não usar texto operacional menor que 14px; 16px como padrão nos formulários**
  - Evidência: No painel há 93 ocorrências de `text-xs` (=12px) em src/app/(dashboard)+src/components/dashboard+layout+ui, e 20 tamanhos arbitrários abaixo do piso em src (10 de text-[11px] e 10 de text-[10px]), ex.: src/components/layout/dashboard-shell.tsx:208 `text-[11px]` nos rótulos dos grupos de menu. Nos formulários, src/components/ui/input.tsx:12 usa `text-base ... md:text-sm`, ou seja, 16px só no mobile e 14px no desktop; src/components/ui/button.tsx:8 usa `text-sm` (14px) no rótulo, abaixo dos 15-16px pedidos.
  - O que falta: Elevar o piso: substituir text-xs/text-[10px]/text-[11px] por text-sm em conteúdo operacional (selos e legendas de gráfico podem ser exceção documentada) e remover o `md:text-sm` do Input para manter 16px no desktop.
  - Impacto: MEDIO · Esforço: M
- **§4.2 — Tamanho padrão de ícone: 20px**
  - Evidência: O padrão de fato é 16px. src/components/ui/button.tsx:8 define `[&_svg:not([class*='size-'])]:size-4` (16px) como tamanho automático de todo ícone dentro de botão; o mesmo `size-4` aparece em select.tsx:47,120 e dropdown-menu.tsx:79,101,144,230, e em alert.tsx:7. Contando ícones com classe explícita no painel: 83 usam size-4 (16px), 22 usam size-3.5 (14px) e apenas 4 usam size-5 (20px).
  - O que falta: Trocar o default dos componentes base para size-5 (20px) e revisar os 22 pontos com size-3.5, que ficam abaixo até do padrão atual. Exige verificar altura dos controles (hoje h-8/32px no Button), que não comporta bem um ícone de 20px.
  - Impacto: MEDIO · Esforço: M

### Apontado pelo verificador (não coberto na primeira passada)

- §4.4 'No tema escuro, usar borda e diferença de superfície para separar cartões' — não foi auditado. src/components/ui/card.tsx:15 separa o cartão com `ring-1 ring-foreground/10` (branco a 10%), não com o divisor --border (#2C3948) do §3.1; src/components/ui/alert-dialog.tsx:60 repete `ring-foreground/10`. Ou seja, a borda de cartão do sistema inteiro não passa por token de cor.
- A família mono provavelmente nunca é aplicada, e o auditor não percebeu: src/app/globals.css:11 define `--font-mono: "Geist Mono", "Geist Mono Fallback", ui-monospace, monospace` com nomes LITERAIS, enquanto src/app/layout.tsx:16-19 expõe a fonte sob a variável `--font-geist-mono` — que `grep -rn 'font-geist-mono' src` mostra ser referenciada em exatamente 1 lugar (a própria declaração). next/font gera famílias com hash (__Geist_Mono_xxxx), então as 72 classes `font-mono` caem em ui-monospace (mono do sistema) e a webfont Geist Mono é baixada em toda página sem nunca ser usada. Isso muda a natureza do achado dele: a segunda família não é Geist Mono, é a mono do SO — e há um custo de rede inútil.
- Existe uma TERCEIRA família de fonte, não checada: `font-serif` aparece 9 vezes em src/app/salao/page.tsx (linhas 223, 352, 425, 432, 453, 484, 521, 624, 658). O §4.1 diz 'o sistema deve usar apenas uma família de fonte' sem restringir ao painel.
- Os tokens --chart-1 a --chart-5 do tema escuro (globals.css:117-121) foram definidos com as cores certas do guia e são ignorados pelo único gráfico do painel (monthly-revenue-chart.tsx:35-40). O auditor tratou esse arquivo só sob o ângulo do data-theme, sem registrar que ele também descarta os tokens de gráfico.
- O escopo pedia 'existe alternância de tema… persistida?' e ele respondeu só olhando o painel do lojista. Faltou registrar que src/app/admin/*, src/app/(auth)/* e src/app/onboarding não têm NENHUM tema aplicado (nem escuro nem o claro do §3.2) — são as telas de primeira impressão do produto e rodam no preset neutro do shadcn.
- Precisão das citações: várias linhas estão deslocadas em 1-2 e devem ser corrigidas antes de virar backlog — --card é globals.css:101 (não :102), --popover é :103 (não :104); `hover:bg-primary/80` é button.tsx:12 (não :14); `focus-visible:ring-ring/50` é button.tsx:8 (não :14); o <h1> do PageHeader é page-header.tsx:20 (não :21); o AlertDialogContent é alert-dialog.tsx:60 (não :61). O conteúdo das afirmações confere em todos esses casos — só o ponteiro está errado.

---

## Padrão de componentes (§5)

O sistema de componentes é o shadcn/ui "base" instalado praticamente sem customização, e é aí que mora o maior desvio do guia: o `button.tsx` nunca foi reescrito para a escala do NexoBarber — as alturas reais são h-8 (32px) no tamanho padrão, h-7 (28px) no `sm` e h-9 (36px) no `lg`, contra os 44px desktop / 48px mobile exigidos pelo §5.1. De 128 usos de `<Button>` no código, 52 pedem `size="sm"` e 15 `size="icon-sm"` (28×28px), e apenas 1 recebe override de altura — ou seja, o alvo mínimo de 44×44px é violado em quase toda a interface do painel. O mesmo vale para `input.tsx` (h-8) e para os 25 `<select>` nativos, cujas alturas variam entre h-8 e h-12 sem padrão. Onde as telas foram escritas à mão a régua melhora: `manual-appointment-sheet`, `booking-rules-form`, `schedule-blocks-card` e `weekly-availability-editor` usam h-11, e todo o fluxo público usa h-12. O que está sólido: o padrão painel lateral × modal × página completa (§5.3) é aplicado com disciplina, com sheets em `w-full` no celular; o bloqueio de duplo envio (§5.1) cobre 27 formulários via `useActionState`, dos quais 18 mostram andamento textual; e as mensagens de erro do agendamento reproduzem literalmente o exemplo bom do guia ("Esse horário acabou de ser ocupado. Escolha outro."). O que não existe: nenhuma máscara de telefone/moeda/data/hora/percentual em todo o repositório; nenhuma validação enquanto o usuário digita (react-hook-form e @hookform/resolvers estão no package.json mas com zero imports; zero ocorrências de onBlur, setError ou aria-invalid nas telas); nenhum sistema de toast reutilizável e nenhum "Desfazer" temporizado; nenhum selo de situação com ícone; nenhuma tabela com cabeçalho fixo, linha de 52px ou conversão para cartão no celular; e nenhuma rota de detalhe para que "clicar na linha" leve a algum lugar. Os componentes `field.tsx` e `checkbox.tsx` são código morto — nunca importados.

### Atendido (12)

- **§5.1 Botão principal: fundo #F2B84B e texto #16120A**
  - Evidência: src/app/globals.css:105-106 define --primary: #f2b84b e --primary-foreground: #0b0f14 no escopo .dark; src/app/(dashboard)/layout.tsx:19 aplica <PanelTheme/> que liga a classe dark no painel; src/components/ui/button.tsx:12 (variant default = bg-primary text-primary-foreground)
  - O que falta: O texto sobre o dourado é #0B0F14 e não o #16120A pedido pelo guia — ambos são quase-pretos, o contraste está garantido, mas o token literal diverge.
- **§5.1 Botão secundário contornado (borda, fundo transparente ou #1B2531)**
  - Evidência: src/components/ui/button.tsx:13-14 (variant outline: border-border bg-background, dark:bg-input/30) e :15-16 (variant secondary usa bg-secondary = #1b2531 conforme globals.css:107). Uso real: 46 ocorrências de variant="outline" e 5 de variant="secondary" em src/**/*.tsx, ex.: src/app/(dashboard)/financeiro/page.tsx:372-393 (Relatórios, Gerar PDF).
- **§5.1 Confirmação clara após a ação ('Cliente salvo', 'Pagamento registrado')**
  - Evidência: As server actions devolvem mensagens curtas e específicas em pt-BR, renderizadas em <Alert> com role="alert" (src/components/ui/alert.tsx:30). Amostra colhida por grep em src/modules/**/*.ts: "Cliente adicionado.", "Pagamento registrado.", "Agendamento confirmado na agenda.", "Atendimento remarcado.", "Plano vendido — pagamento registrado.", "Movimentação registrada.", "Identidade atualizada. Já vale na sua página pública.". Renderização: src/components/dashboard/client-form.tsx:32-39, bill-form.tsx:32-39.
- **§5.2 Rótulo sempre acima do campo; placeholder não substitui rótulo**
  - Evidência: Padrão consistente <div className="space-y-2"><Label htmlFor>…</Label><Input id/></div>: src/components/dashboard/client-form.tsx:40-55, bill-form.tsx:40-66, service-form-sheet.tsx, booking-form.tsx:735-775. Placeholders são exemplos ('(11) 98765-4321', 'Ex.: aluguel, fornecedor…') e não substituem o rótulo.
- **§5.2 Mensagem de erro precisa dizer como corrigir (ex.: 'Este horário acabou de ser ocupado. Escolha outro')**
  - Evidência: src/modules/appointments/actions.ts:42 → SLOT_TAKEN: "Esse horário acabou de ser ocupado. Escolha outro." (literalmente o exemplo bom do guia); :13-14 APPOINTMENT_CONFLICT: "Esse horário acabou de ser ocupado. O horário anterior foi mantido."; :73-75 "Revise os campos: cliente, serviço, profissional e horário são obrigatórios.". Outras: "Escolha a forma de pagamento.", "O fim deve ser depois do início.", "Inclua pelo menos um serviço no plano.", "Informe um valor válido."
  - O que falta: Restam alguns becos sem saída genéricos ('Não foi possível salvar.', 'Não foi possível salvar o serviço.') que não ensinam nada, mas são o caso de exceção e não a regra.
- **§5.3 Painel lateral para criação e edição curta, sem tirar o usuário da lista**
  - Evidência: 9 Sheets de criação/edição: manual-appointment-sheet.tsx:188, service-form-sheet.tsx:99, product-form-sheet.tsx:70, membership-plan-sheet.tsx:88, sell-membership-sheet.tsx:59, reschedule-sheet.tsx:113, professional-profile-sheet.tsx:55, membership-actions.tsx:60, mobile-tab-bar.tsx:90.
- **§5.3 Modal apenas para confirmação pequena, aviso ou decisão de risco; sem modal dentro de modal**
  - Evidência: AlertDialog é usado exclusivamente para confirmação destrutiva: delete-entity-button.tsx:36-73, archive-client-button.tsx:37-73, delete-client-forever-button.tsx, admin-row-actions.tsx:104, user-menu.tsx:90 (sair). Não há Dialog genérico no projeto (src/components/ui/ não contém dialog.tsx) e nenhum AlertDialog é renderizado dentro de um SheetContent.
- **§5.3 No celular, painéis laterais viram tela completa**
  - Evidência: src/components/ui/sheet.tsx:65 define data-[side=right]:w-3/4 com sm:max-w-sm, mas todos os 8 sheets de conteúdo do painel sobrescrevem com w-full: manual-appointment-sheet.tsx:188, service-form-sheet.tsx:99, product-form-sheet.tsx:70, membership-plan-sheet.tsx:88, sell-membership-sheet.tsx:59, reschedule-sheet.tsx:113, professional-profile-sheet.tsx:55, membership-actions.tsx:60 — todos 'w-full … sm:max-w-md'. A altura já é 100% (data-[side=right]:h-full).
  - O que falta: O default do primitivo (w-3/4) continua errado — src/components/layout/mobile-tab-bar.tsx:90 usa w-80 e não vira tela cheia. Corrigir na base evitaria depender do override em cada uso futuro.
- **§5.6 O selo sempre exibe texto**
  - Evidência: src/components/dashboard/appointment-status-badge.tsx:46-48 sempre renderiza entry.label; plan-badge.tsx:25 renderiza planLabel(plan). A única bolinha sem texto do app é o indicador de 'não lido' em src/components/dashboard/notifications-bell.tsx:130, que é marcador de novidade e não selo de situação — e a contagem por extenso está no aria-label da campainha (:88).
- **§5.7 Mensagem de sucesso curta e específica**
  - Evidência: Mensagens colhidas por grep em src/modules/**/*.ts: "Cliente adicionado.", "Cliente arquivado.", "Cliente restaurado.", "Pagamento registrado.", "Plano vendido — pagamento registrado.", "Horário de funcionamento atualizado.", "Atendimento remarcado.", "Perfil atualizado. Já vale na sua página.". Renderizadas em Alert com CheckCircle2 verde (client-form.tsx:33-38, bill-form.tsx:33-38, manual-appointment-sheet.tsx:196-203).
- **§5.7 Não usar alertas que desaparecem antes de serem lidos**
  - Evidência: As confirmações de formulário são <Alert> persistentes, sem timer (client-form.tsx:32-39, bill-form.tsx:32-39 — só somem no reset/fechamento do sheet). O único aviso temporizado é o de novo agendamento em src/components/dashboard/notifications-bell.tsx:58, com 6000ms e conteúdo também registrado na lista da campainha (:112-153).
- **§5.7 Alertas importantes também registrados no bloco 'Precisa da sua atenção'**
  - Evidência: src/app/(dashboard)/dashboard/page.tsx:387-412 renderiza o Card 'Precisa de atenção hoje' (border-warning/40) com a lista actionItems, cada item como Link min-h-12 com contagem e CTA. O aviso volátil da campainha também fica registrado na lista persistente do dropdown (notifications-bell.tsx:112-153).

### Parcial (16)

- **§5.1 Botão de baixa ênfase (sem fundo)**
  - Evidência: src/components/ui/button.tsx:17-18 define variant ghost (sem fundo) e :21 define variant link; 31 usos de variant="ghost" em src/**/*.tsx. Porém a busca por 'Limpar filtros'/'Mais filtros' em src/**/*.tsx não retorna nenhuma ocorrência (o único hit de 'filtro' é o comentário em src/app/(dashboard)/agenda/page.tsx:177).
  - O que falta: A variante existe e é usada, mas os casos que o guia cita como típicos de baixa ênfase — 'Limpar filtros', 'Adicionar detalhes' — não foram implementados em lugar nenhum.
  - Impacto: BAIXO · Esforço: P
- **§5.1 Botão destrutivo: contornado na primeira exposição, preenchido só na confirmação final**
  - Evidência: Fluxo correto no painel: src/components/dashboard/delete-entity-button.tsx:38-45 (primeira exposição = ghost cinza com Trash2) → :63-70 (confirmação em AlertDialog com variant="destructive"); mesmo padrão em archive-client-button.tsx:39-46/63-71 e delete-client-forever-button.tsx:74. Implementação exemplar no público: src/components/public-site/cancel-reservation-button.tsx:27-34 (contornado vermelho, h-12) → :42-53 (sólido bg-red-600 text-white). Porém src/components/ui/button.tsx:19-20 define destructive como bg-destructive/10 text-destructive (fundo tingido a 10%), não preenchimento vermelho sólido.
  - O que falta: A escada de dois passos está certa, mas o degrau final do painel não é o vermelho preenchido do guia — é um vermelho translúcido a 10%, visualmente próximo de um botão comum. O componente público (cancel-reservation-button) faz certo com CSS solto, fora do sistema.
  - Impacto: MEDIO · Esforço: P
- **§5.1 Após clique de salvamento, bloquear repetição e mostrar andamento**
  - Evidência: 27 arquivos usam useActionState com o terceiro retorno 'pending' e 33 ocorrências de disabled={pending}/disabled={isPending}; nenhum arquivo com useActionState fica sem disabled (verificado por loop sobre grep -rl). 18 mostram andamento textual, ex.: src/components/dashboard/bill-form.tsx:67-69 ({pending ? "Salvando…" : "Adicionar"}), booking-rules-form.tsx:130, weekly-availability-editor.tsx:200, reschedule-sheet.tsx:192. Sem andamento textual (só disabled): client-form.tsx:56-58, service-form-sheet.tsx (Button final), product-form-sheet.tsx, membership-plan-sheet.tsx, sell-membership-sheet.tsx, professional-form.tsx, employee-pay-card.tsx, membership-actions.tsx, reservation-actions.tsx. SEM bloqueio algum (form action= direto, sem useActionState): src/app/(auth)/login/page.tsx:51, src/app/(auth)/cadastro/page.tsx:84, src/app/(auth)/recuperar-senha/page.tsx:31, src/components/forms/onboarding-form.tsx:112, src/components/dashboard/appointment-actions.tsx:103-110, src/components/dashboard/bills-view.tsx:134-140. Busca por 'useFormStatus' em src/**/*.tsx: zero ocorrências.
  - O que falta: Falta um <SubmitButton> compartilhado com useFormStatus. Os 4 formulários de porta de entrada (login, cadastro, recuperar senha, onboarding) e as ações de linha da agenda/contas aceitam duplo clique sem nenhum feedback — justamente os pontos onde o duplo clique é mais provável e mais caro.
  - Impacto: ALTO · Esforço: M
- **§5.1 Não usar botões genéricos (OK, Enviar, Confirmar) quando puder dizer o que acontecerá**
  - Evidência: A grande maioria é específica: 'Salvar regras', 'Salvar expediente', 'Confirmar novo horário', 'Criar bloqueio', 'Adicionar cliente', 'Salvar identidade'. Exceções: src/components/dashboard/reservation-actions.tsx:56 ('Confirmar'), src/components/dashboard/appointment-actions.tsx:20 ('Confirmar'), src/components/dashboard/bill-form.tsx:68 ('Adicionar').
  - O que falta: Trocar por 'Confirmar venda', 'Confirmar agendamento' e 'Adicionar despesa'.
  - Impacto: BAIXO · Esforço: P
- **§5.2 Altura mínima dos campos: 44px desktop / 48px celular**
  - Evidência: src/components/ui/input.tsx:11 → h-8 (32px); src/components/ui/textarea.tsx:10 → min-h-16; src/components/ui/select.tsx:47 → data-[size=default]:h-8. Overrides pontuais chegam a 44/48px: manual-appointment-sheet.tsx:229/262/271 (h-11), booking-rules-form.tsx:79/94/109/124/195 (h-11), schedule-blocks-card.tsx:83/93/102/125/135 (h-11), weekly-availability-editor.tsx:142/152/162 (h-11), booking-form.tsx:73 (inputClass = h-12), lead-capture-form.tsx:96/105/120 (h-12). Os 25 <select> nativos do painel distribuem-se em h-8 (6), h-9 (8), h-10 (2), h-11 (2), h-12 (2).
  - O que falta: O primitivo continua em 32px; só as telas reescritas à mão alcançam a régua. Formulários centrais como client-form.tsx e bill-form.tsx usam o Input padrão de 32px.
  - Impacto: ALTO · Esforço: M
- **§5.2 Teclado numérico no celular para telefone, preço, custo e quantidade**
  - Evidência: inputMode="tel" presente em 6 campos de telefone (booking-form.tsx:751, manual-appointment-sheet.tsx:267, client-form.tsx:46, professional-form.tsx:69, account-forms.tsx:53, contact-settings-form.tsx:55). Para dinheiro/quantidade usa-se type="number" (21 ocorrências: bill-form.tsx:56, service-form-sheet.tsx:131/143/156/174, product-form-sheet.tsx:102/114, inventory-movement-form.tsx:83/94, employee-pay-card.tsx:104/115/129/180, membership-plan-sheet.tsx:119/179, professional-form.tsx:95/107, booking-rules-form.tsx:74/89/104/119). Busca por inputMode="decimal" ou inputMode="numeric": zero ocorrências.
  - O que falta: type="number" traz teclado numérico mas com setas de incremento e comportamento de scroll ruim em moeda; falta inputMode="decimal" nos campos de preço/custo e o zoom do iOS só está prevenido no Input (text-base md:text-sm, input.tsx:11), não nos <select> e <input> nativos soltos.
  - Impacto: MEDIO · Esforço: P
- **§5.2 Campos obrigatórios marcados com texto ou símbolo explicado, não só por cor**
  - Evidência: Não há marcação de obrigatório: busca por 'obrigatóri' em src/components/ e src/app/ retorna apenas a mensagem de erro do servidor. A convenção usada é a inversa — marcar os opcionais: 'E-mail (opcional)' em booking-form.tsx:759, 'Observação (opcional)' em manual-appointment-sheet.tsx:419, 'Descrição (opcional)' em membership-plan-sheet.tsx:143, 'Custo (opcional)' em product-form-sheet.tsx:110, 'Motivo (opcional)' em schedule-blocks-card.tsx:77 e inventory-movement-form.tsx:101.
  - O que falta: A convenção do '(opcional)' é válida, mas é aplicada de forma inconsistente: em src/components/dashboard/client-form.tsx:40-55 os campos E-mail e Observações internas são opcionais e não recebem o marcador, ficando indistinguíveis de Nome e Telefone (required).
  - Impacto: BAIXO · Esforço: P
- **§5.2 Preencher duração e preço automaticamente após escolher o serviço**
  - Evidência: src/components/dashboard/manual-appointment-sheet.tsx:296-300 — o <option> do serviço exibe '{service.name} · {service.durationMinutes} min', e a escolha dispara resetSchedule() (:286-290) recalculando os horários disponíveis a partir da duração. O preço, porém, não aparece em nenhum ponto do painel lateral (nenhuma referência a price/valor no formulário).
  - O que falta: A duração é usada (implicitamente, no cálculo de slots) e mostrada na lista; o preço não é exibido nem pré-preenchido no lançamento manual.
  - Impacto: BAIXO · Esforço: P
- **§5.4 Cartão de indicador com nome + valor + período + comparação**
  - Evidência: Financeiro cumpre quase tudo: src/app/(dashboard)/financeiro/page.tsx:214-218 calcula compare() devolvendo '+X% vs mês anterior' (com o referencial explícito, como o guia exige), :304-343 monta os cartões com hint, e :421-429 renderiza valor + hint. Dashboard NÃO: src/app/(dashboard)/dashboard/page.tsx:329-341 (revenueCards) e :343-367 (metrics) têm apenas {label, value, icon}; a renderização em :414-441 e :443-462 mostra rótulo + ícone + número, sem período separado nem comparação. Idem src/components/dashboard/bills-view.tsx:50-75 ('Em aberto'/'Vencido' só com o valor).
  - O que falta: O período só existe embutido no texto do rótulo ('Recebido hoje', 'Recebido no mês') e a comparação existe apenas no Financeiro. Os 8 cartões do Início e os 2 de contas a pagar/receber entregam só o número — exatamente o que o guia proíbe quando diz que o cartão precisa dizer 'em comparação com quê'.
  - Impacto: MEDIO · Esforço: M
- **§5.5 Busca sempre visível nas listas**
  - Evidência: Existe em 2 telas: src/app/(dashboard)/agenda/page.tsx:279-290 (input type="search" name="q" + botão Filtrar) e src/app/(dashboard)/clientes/page.tsx:217-232. Busca por 'type="search"' em src/**/*.tsx retorna somente esses 2 hits. Não há busca em serviços, produtos, planos, comissões, estoque, profissionais, contas a pagar/receber.
  - O que falta: As 7 telas que usam <Table> (servicos, produtos, planos, comissoes, permissoes, financeiro, admin) não têm campo de busca nenhum.
  - Impacto: MEDIO · Esforço: M
- **§5.5 Filtros mais usados em botões simples; demais em 'Mais filtros'**
  - Evidência: Pílulas de filtro existem: src/app/(dashboard)/agenda/page.tsx:294-300 (STATUS_FILTERS como Buttons asChild) e src/app/(dashboard)/clientes/page.tsx:181-190 (SEGMENTS com variant default/outline). Busca por 'mais filtros' (case-insensitive) em src/**/*.tsx: zero ocorrências.
  - O que falta: O escalonamento 'filtros comuns visíveis → Mais filtros' não existe; só há o primeiro nível, e apenas em 2 telas.
  - Impacto: BAIXO · Esforço: M
- **§5.5 Ação mais frequente visível à direita; ações raras em menu de três pontos**
  - Evidência: Ações à direita: src/app/(dashboard)/servicos/page.tsx:124-168 (TableCell className="text-right" com editar/ocultar/excluir), produtos/page.tsx:213 (TableHead 'Ação' text-right), src/components/dashboard/reservation-actions.tsx:33-34 (items-end justify-end). Não há menu de três pontos em nenhuma linha: dropdown-menu.tsx só é usado em notifications-bell.tsx e user-menu.tsx.
  - O que falta: As ações raras (excluir, ocultar) ficam expostas na linha em vez de recolhidas em overflow — o que agrava o problema de alvos de 28px e aumenta o risco de clique acidental em 'excluir'.
  - Impacto: MEDIO · Esforço: M
- **§5.6 Selo de situação com ícone + texto + cor (nunca só a bolinha colorida)**
  - Evidência: src/components/dashboard/appointment-status-badge.tsx:4-28 mapeia status → {label, className}: há texto e cor, mas NENHUM ícone (o arquivo não importa nada de lucide-react; o render em :45-49 devolve só {entry.label}). O componente base src/components/ui/badge.tsx:8 já suporta ícone ([&>svg]:size-3!) e src/components/dashboard/plan-badge.tsx:24 prova o padrão certo (Sparkles/Store + texto). Outros selos também sem ícone: src/components/dashboard/bills-view.tsx:107-109 ('Vencida'), src/app/(dashboard)/planos/page.tsx:193-197 ('Vencido'/'Pausado'/'Em dia'), servicos/page.tsx:113 ('Visível'/'Oculto').
  - O que falta: Adicionar os ícones da tabela do guia (Relógio, Calendário com visto, Círculo com visto, Pessoa ausente, Círculo com X) ao AppointmentStatusBadge e aos selos de planos/contas.
  - Impacto: MEDIO · Esforço: P
- **§5.6 Mapeamento de cores por situação conforme a tabela do guia**
  - Evidência: src/components/dashboard/appointment-status-badge.tsx:5-27 — pending=amber ✔ (guia: amarelo), confirmed=sky ✔ (azul), completed=emerald ✔ (verde), MAS canceled='bg-muted text-muted-foreground' (cinza) quando o guia pede vermelho, e no_show=rose (vermelho) quando o guia pede cinza. As duas últimas estão trocadas. Não existe estado 'Em atendimento' (roxo/tesoura): src/modules/appointments/actions.ts:10 define o enum como ['confirmed','completed','canceled','no_show'] e :145-148 a máquina de transições, sem in_progress.
  - O que falta: Inverter as cores de canceled/no_show e decidir sobre 'Em atendimento' — que exigiria novo estado no domínio, não só no componente.
  - Impacto: MEDIO · Esforço: M
- **§5.7 Exclusão, cancelamento ou perda financeira pedem confirmação**
  - Evidência: Exclusões confirmam: delete-entity-button.tsx:36-73, archive-client-button.tsx:37-73, delete-client-forever-button.tsx (AlertDialog em todos). Cancelamentos NÃO: src/components/dashboard/appointment-actions.tsx:100-111 submete updateAppointmentStatus com status='canceled' direto no clique, sem diálogo; src/components/dashboard/reservation-actions.tsx:59-69 cancela a venda de produto direto no clique. Contraste: src/components/public-site/cancel-reservation-button.tsx:13-53 implementa cancelamento em dois toques — o cliente final é mais protegido que o operador do balcão.
  - O que falta: Cancelar agendamento e cancelar venda são justamente as ações de perda que o guia manda confirmar, e são as duas que passam direto.
  - Impacto: ALTO · Esforço: P
- **Consistência do sistema de componentes (transversal ao §5): primitivos existirem e serem realmente usados**
  - Evidência: Nunca importados (código morto): src/components/ui/field.tsx e src/components/ui/checkbox.tsx — buscas por 'from "@/components/ui/field"' e 'from "@/components/ui/checkbox"' retornam zero ocorrências; os formulários usam <input type="checkbox" className="size-4 rounded border"> à mão (service-form-sheet.tsx:222-228, :257-262). Quase não usados: src/components/ui/select.tsx (1 uso, invite-member-form.tsx:18) contra 25 <select> nativos com classes soltas; src/components/ui/tabs.tsx (1 uso, team-tabs.tsx). Dependências instaladas e não usadas: react-hook-form e @hookform/resolvers (package.json:18,28).
  - O que falta: Metade do design system está no repositório sem estar em uso, e o que está em uso é reimplementado à mão em cada tela — é isso que explica as alturas de campo variando entre h-8 e h-12 na mesma aplicação.
  - Impacto: MEDIO · Esforço: G

### Não atendido (12)

- **§5.1 Altura dos botões: 44px no desktop e 48px no celular**
  - Evidência: src/components/ui/button.tsx:24-34 — default: h-8 (32px), xs: h-6 (24px), sm: h-7 (28px), lg: h-9 (36px), icon: size-8, icon-xs: size-6, icon-sm: size-7, icon-lg: size-9. Nenhuma variante chega a 44px e não há media query para 48px no celular. Nenhum override em src/app/globals.css (arquivo lido por inteiro, 335 linhas, sem regra para [data-slot=button]).
  - O que falta: Reescrever a escala do cva: default → h-11 (44px) com sm:h-11/max-sm:h-12, lg → h-12, icon → size-11. Nenhum tamanho do guia existe hoje.
  - Impacto: ALTO · Esforço: M
- **§5.1 Alvos clicáveis importantes com no mínimo 44×44px**
  - Evidência: Contagem por busca em src/**/*.tsx: 128 ocorrências de '<Button', das quais 52 usam size="sm" (h-7 = 28px) e 15 usam size="icon-sm" (size-7 = 28×28px); apenas 1 ocorrência recebe className com h-11/h-12. Exemplos concretos: src/components/dashboard/delete-entity-button.tsx:38-45 (lixeira icon-sm = 28×28), src/components/dashboard/archive-client-button.tsx:40-46, src/app/(dashboard)/servicos/page.tsx:141-152 (olho ocultar/exibir icon-sm), src/components/dashboard/bills-view.tsx:144-151 (excluir conta). Complementos: src/components/ui/checkbox.tsx:17 usa size-4 com after:-inset-x-3/-inset-y-2 (≈40×32px de área efetiva); src/components/ui/dropdown-menu.tsx:79 itens com py-1 (~28px).
  - O que falta: Os ícones de ação em linha (excluir, arquivar, ocultar) são os alvos mais errados do app — 28×28px em telas usadas em pé, com o celular na mão, dentro do salão.
  - Impacto: ALTO · Esforço: M
- **§5.1 Botão destrutivo vermelho para 'Cancelar agendamento'**
  - Evidência: src/components/dashboard/appointment-actions.tsx:26-32 e :52-58 — a ação 'Cancelar' (status canceled) usa variant: "ghost" com className "text-muted-foreground" (cinza), não vermelho contornado. Só 'Não veio' recebe cor (text-rose-600, linha 50).
  - O que falta: Cancelar um agendamento é exatamente o exemplo que o guia usa para botão destrutivo, e é o único da lista que está cinza.
  - Impacto: MEDIO · Esforço: P
- **§5.2 Máscara automática para telefone, moeda, data, hora e percentual**
  - Evidência: Busca por 'mask|máscara|mascara|formatPhone|formatCurrency|onlyDigits|replace(/\\D' em src/**/*.{ts,tsx}: os únicos hits são maskImage (CSS de gradiente em src/app/page.tsx:217 e src/app/salao/page.tsx:209), formatBRL (formatação de leitura, src/lib/financial), e .replace(/\D/g,'') no servidor após o envio (src/modules/clients/actions.ts:34, src/app/api/public/leads/route.ts:43). Nenhum onChange de campo aplica formatação: a lista completa de onChange em src/components/ (24 ocorrências) contém apenas setState cru, seletores de cor e o slugify de src/components/forms/onboarding-form.tsx:42/59. Os campos de telefone se limitam a inputMode="tel" + placeholder: client-form.tsx:46, professional-form.tsx:69, account-forms.tsx:53, contact-settings-form.tsx:55, manual-appointment-sheet.tsx:267, booking-form.tsx:751.
  - O que falta: Nenhuma máscara existe. Precisa de um utilitário de máscara (telefone BR, BRL, hora HH:MM, percentual) e de um <MaskedInput> aplicado nesses 6 campos de telefone, nos 21 type="number" de valor/custo e nos campos de hora.
  - Impacto: ALTO · Esforço: M
- **§5.2 Validar enquanto o usuário preenche, sem esperar a tentativa final**
  - Evidência: Buscas em src/**/*.{ts,tsx}: 'react-hook-form|useForm|zodResolver' → zero ocorrências (apesar de react-hook-form ^7.80.0 e @hookform/resolvers ^5.4.0 estarem em package.json:18/28); 'onBlur|setError|aria-invalid=' → zero ocorrências. src/components/ui/field.tsx (que traz FieldError com agregação de mensagens, linhas 176-225) nunca é importado: 'from "@/components/ui/field"' → zero ocorrências. A validação real acontece no servidor após o submit, via zod nas actions (ex.: src/modules/appointments/actions.ts:62-76).
  - O que falta: Toda validação é pós-envio. O usuário só descobre o erro depois do round-trip. Os retornos visuais em tempo real que existem são cosméticos: 'cliente selecionado' (manual-appointment-sheet.tsx:244-247) e contador de caracteres da bio (professional-profile-sheet.tsx:114).
  - Impacto: ALTO · Esforço: G
- **§5.4 Explicação curta em ícone de ajuda quando necessário**
  - Evidência: src/components/ui/tooltip.tsx existe e src/app/layout.tsx:49 monta o <TooltipProvider>, mas a busca por 'Tooltip' em src/**/*.tsx fora de components/ui não retorna nenhum uso. O único texto explicativo é o hint estático 'Recebido − despesas pagas' em src/app/(dashboard)/financeiro/page.tsx:335.
  - O que falta: O provider está montado e nenhum tooltip é renderizado — o componente é código morto na prática.
  - Impacto: BAIXO · Esforço: P
- **§5.5 Cabeçalho fixo ao rolar listas longas**
  - Evidência: src/components/ui/table.tsx:22-30 (TableHeader) não tem classe sticky. Busca por 'sticky' em src/**/*.tsx retorna 6 hits, todos de cabeçalho de página/navegação (dashboard-shell.tsx:236, public-header.tsx:19, admin/layout.tsx:18, page.tsx:153, salao/page.tsx:146, booking-form.tsx:803) — nenhum em thead.
  - O que falta: Adicionar 'sticky top-0 z-10 bg-card' no TableHeader e garantir contexto de rolagem no container.
  - Impacto: MEDIO · Esforço: P
- **§5.5 Linha com pelo menos 52px**
  - Evidência: src/components/ui/table.tsx:86 — TableCell usa apenas 'p-2' (8px em cima e embaixo), o que com text-sm dá ≈36px de linha; :73 TableHead usa h-10 (40px). Nenhuma das 7 páginas que usam <Table> sobrescreve a altura de linha (verificado em servicos/page.tsx:90-170 e produtos/page.tsx:205-249).
  - O que falta: Definir min-h-[52px] na TableRow ou py-3.5 na TableCell.
  - Impacto: MEDIO · Esforço: P
- **§5.5 Clicar na linha abre detalhes**
  - Evidência: src/components/ui/table.tsx:55-66 — TableRow não tem onClick nem asChild; nenhuma das 7 páginas com <Table> envolve a linha em <Link>. Mais fundamental: 'find src/app -name page.tsx' mostra que não existe nenhuma rota de detalhe no painel (nenhum segmento dinâmico [id] em (dashboard)); as únicas rotas dinâmicas são públicas ([tenant] e reserva/[token]). Busca por 'Ver perfil' em src/**/*.tsx: zero ocorrências.
  - O que falta: Não há para onde a linha levar. Perfil do cliente, ficha do serviço e ficha do profissional (previstos no §7.3 e §7.7 do guia) não têm rota — o detalhe existe no máximo como sheet de edição.
  - Impacto: ALTO · Esforço: G
- **§5.5 No celular tabelas viram cartões; não usar rolagem horizontal como solução principal**
  - Evidência: src/components/ui/table.tsx:9-12 — o container é 'relative w-full overflow-x-auto', ou seja, rolagem horizontal é exatamente a única solução. Busca por 'md:hidden|hidden md:table|hidden sm:table|lg:table' em src/**/*.tsx: zero ocorrências, ou seja, não existe nenhum par tabela-desktop/cartão-mobile. Contraexemplo positivo (lista sem <Table>): src/app/(dashboard)/clientes/page.tsx:240-330 e src/components/dashboard/bills-view.tsx:86-156 usam cartões flex-wrap que respondem bem ao celular.
  - O que falta: As 7 telas com <Table> rolam na horizontal no celular. O padrão de cartão já existe no projeto (clientes, contas) e poderia ser extraído para um <ResponsiveTable>.
  - Impacto: ALTO · Esforço: G
- **§5.7 Mudança sem risco: salvar imediatamente e oferecer 'Desfazer' por alguns segundos**
  - Evidência: Busca por 'desfazer|undo' (case-insensitive) em src/**/*.{ts,tsx}: os únicos hits relevantes são src/components/dashboard/appointment-actions.tsx:64 ('Desfazer conclusão') e :73 ('Desfazer falta') — que são transições de estado permanentes disponíveis no cartão do atendimento (voltam completed/no_show → confirmed), não um 'Desfazer' temporizado após a ação. Não existe nenhum mecanismo com janela de tempo.
  - O que falta: Falta o padrão inteiro: salvar → toast com ação 'Desfazer' → expirar em ~6s. Precisa antes de um sistema de toast (ver item seguinte).
  - Impacto: MEDIO · Esforço: G
- **§5.7 Sistema de toast/notificação de sucesso reutilizável**
  - Evidência: package.json (dependências completas lidas) não inclui sonner nem nenhuma lib de toast. Busca por 'sonner|useToast|toast(' em src/**/*.{ts,tsx}: o único hit é o estado local em src/components/dashboard/notifications-bell.tsx:39 (const [toast, setToast]), alimentado no polling em :56-59 (window.setTimeout 6000) e renderizado à mão em :156-163. Esse componente serve exclusivamente para avisar de novo agendamento; não é reutilizável, não tem ação, não tem aria-live e não é exportado como API.
  - O que falta: O feedback de sucesso hoje é um <Alert> inline dentro de cada formulário (client-form.tsx:32-39 etc.), que some quando o sheet fecha. Sem camada de toast não há como implementar §5.7 (Desfazer) nem confirmar ações feitas em linha, como as da agenda.
  - Impacto: ALTO · Esforço: M

### Apontado pelo verificador (não coberto na primeira passada)

- §5.6 — CORES DOS SELOS INVERTIDAS EM RELAÇÃO AO GUIA, e ele não checou o mapeamento: src/components/dashboard/appointment-status-badge.tsx:19-22 define canceled com 'bg-muted text-muted-foreground' (CINZA) e :23-27 define no_show com rose (VERMELHO). O guia §5.6 pede exatamente o contrário: 'Não compareceu = Cinza' e 'Cancelado/Vencido = Vermelho'. Falta também o estado 'Em atendimento' (roxo/tesoura) — statusMap tem só 5 chaves.
- §5.6 — Dois sistemas de cor paralelos para situação, não auditados: appointment-status-badge.tsx:5-27 usa a paleta crua do Tailwind (amber-100/sky-100/emerald-100/rose-100) enquanto src/app/(dashboard)/clientes/page.tsx:83-87 usa os tokens de design (border-warning/text-warning, border-info/text-info, border-success/text-success) definidos em globals.css:130-132. O mesmo conceito ('situação') pinta com duas fontes de verdade diferentes.
- §5.7 / §3.1 — O componente Alert não tem tom de sucesso, atenção nem informação: src/components/ui/alert.tsx:10-14 só define variants 'default' (bg-card, sem cor nenhuma) e 'destructive'. O guia §3.1 especifica 5 fundos de aviso (Sucesso #0D2A22/#6EE7B7, Atenção, Erro, Informação, Neutro) e os tokens --success/--warning/--info existem em globals.css:88-90 e :130-132. Resultado prático: em client-form.tsx:33-35 o sucesso é um Alert 'default' cinza com um ícone verde colado à mão. Ele marcou 'confirmação' como ATENDIDO sem olhar o componente que a renderiza.
- §5.7 — 'Exclusão, cancelamento ou perda financeira: pedir confirmação' não foi listado como requisito próprio; por isso as ações destrutivas de um toque (membership-actions.tsx:131-143, bills-view.tsx:142-152) passaram batidas.
- §5.1 — 'Apenas um botão principal visível por área de decisão' e 'Não usar o mesmo dourado para três ações lado a lado' não foram checados em nenhum item.
- §5.5 — 'A informação mais importante fica à esquerda' não foi checado em nenhum item.
- §5.7 — 'Alertas importantes também devem ficar registrados no bloco Precisa da sua atenção' não foi checado; o bloco existe em src/app/(dashboard)/dashboard/page.tsx:390 ('Precisa de atenção hoje'), mas nenhuma verificação de que os avisos caem nele.
- §5.3 — A perna 'Página completa: tarefas longas, fechamento financeiro, configuração da página e perfil completo do cliente' não virou item. Não existe rota de perfil completo do cliente (find src/app/(dashboard) -name page.tsx: 19 rotas, nenhuma dinâmica; os únicos [param] estão em src/app/(public)/[tenant] e /reserva/[token]).
- EVIDÊNCIA INCORRETA a corrigir: no item de máscaras ele afirma que os campos de telefone têm 'inputMode="tel" + placeholder' citando client-form.tsx:46 — a linha 46 é <Input id="phone" name="phone" inputMode="tel" required /> e não tem placeholder algum. A conclusão (não há máscara) continua correta; a evidência, não.
- CONTAGEM INFLADA: ele lista '9 Sheets de criação/edição' incluindo src/components/layout/mobile-tab-bar.tsx:90, que é o menu de navegação móvel, não criação/edição. São 8 sheets de conteúdo (grep 'SheetContent' fora de ui/sheet.tsx).

---

## Linguagem e navegação (§8, §9)

A linguagem foi parcialmente aportuguesada, mas a tabela obrigatória do §8.1 não foi aplicada de forma sistemática: 5 das 19 trocas não ocorreram em nenhum lugar (Checkout, Ticket médio, Acessos e papéis, Movimentação de saída, Assinatura→Meu plano NexoBarber) e outras 7 estão aplicadas só em parte — o mesmo conceito aparece com o termo novo em uma tela e com o termo antigo em outra ("Ver página de agendamento" no shell vs "Ver página pública" no editor de aparência; badge "Não compareceu" vs filtro "Faltas" vs botão "Não veio"). O padrão de botões ação+objeto do §8.2 é seguido por cerca de 60% dos botões; sobram ~30 rótulos genéricos, incluindo exatamente os proibidos pelo guia ("Confirmar" sozinho em três lugares, "Salvar" sozinho, "Gerenciar equipe"). As mensagens prontas do §8.3 são boas em tom e quase idênticas aos exemplos de erro, mas o EmptyState não tem botão de ação (só texto) e a ação destrutiva mais crítica — cancelar agendamento — não tem confirmação nenhuma. A navegação é o ponto mais distante do guia: o menu lateral tem 15 links em 5 grupos em vez dos 7 itens planos, mede 256px em vez de 240px, o rodapé só tem "Sair" (sem ajuda, sem perfil, sem recolher menu) e o cabeçalho não tem título da tela, nem busca, nem botão "+ Novo". A barra inferior mobile é o único item plenamente entregue em estrutura (4 fixos + Menu), mas o conteúdo do Menu diverge do especificado e o botão "Página de agendamento" está literalmente escondido abaixo de 640px.

### Atendido (8)

- **§8.1 — Dashboard / Visão geral → Início**
  - Evidência: src/components/layout/dashboard-shell.tsx:52 usa label "Início". Buscas `grep -rn "Dashboard" src/` e `grep -rni "visão geral|visao geral" src/` não retornam nenhum texto visível: as únicas ocorrências de "Dashboard" são identificadores internos (DashboardLoading em src/app/(dashboard)/loading.tsx:4, DashboardPage em src/app/(dashboard)/dashboard/page.tsx:108, ícone LayoutDashboard) e "visão geral" tem zero ocorrências.
  - O que falta: Nenhum na terminologia. Registro à parte pedido pelo enunciado: a ROTA continua /dashboard (src/components/layout/dashboard-shell.tsx:52, src/app/(dashboard)/dashboard/), o que o guia permite. Observação secundária: o H1 dessa tela é `Olá, {primeiro nome}!` com eyebrow "Resumo do dia" (src/app/(dashboard)/dashboard/page.tsx:377-378), não "Início" — o usuário nunca vê a palavra que o menu promete.
- **§8.1 — PDV → Nova venda ou Caixa**
  - Evidência: `grep -rn "PDV|pdv" src/` retorna zero ocorrências. O termo "Caixa" está presente no rótulo do menu financeiro: src/components/layout/dashboard-shell.tsx:67 ("Resumo e caixa").
  - O que falta: O termo proibido está ausente. Ressalva: não existe uma tela/ação chamada "Nova venda" — a venda de produto só nasce a partir de reserva no agendamento (src/components/dashboard/reservation-actions.tsx), então o vocabulário substituto ainda não tem onde ser aplicado.
- **§8.1 — Performance → Resultados**
  - Evidência: `grep -rni "performance|desempenho" src/` retorna zero ocorrências em src/. A única menção a "Performance" no repositório está em docs/entregas/fase-6.md:17, fora da interface.
  - O que falta: Nenhum. Ressalva: o substituto "Resultados" também não é usado em lugar nenhum — a proibição foi cumprida por ausência do conceito, não por renomeação.
- **§8.1 — Assinatura (para o cliente) → Plano do cliente**
  - Evidência: src/components/layout/dashboard-shell.tsx:103 usa label "Planos de clientes" e src/app/(dashboard)/planos/page.tsx:136 usa title="Planos de clientes".
  - O que falta: Ressalva: o eyebrow da mesma tela ainda é "Clube de assinatura" (src/app/(dashboard)/planos/page.tsx:135) — único resquício do termo antigo nessa tela.
- **§8.1 — Margem → Lucro por unidade**
  - Evidência: `grep -rni "margem|lucro por unidade" src/` retorna zero ocorrências do termo proibido. O produto guarda custo (src/components/dashboard/product-form-sheet.tsx:110, Label "Custo (opcional)") e preço de venda, mas nenhuma tela calcula ou exibe margem.
  - O que falta: Proibição cumprida por ausência. Ressalva: como não há cálculo de lucro por unidade em lugar nenhum, o dado de custo coletado no cadastro não é usado — a troca de termo é hoje inaplicável porque o indicador não existe.
- **§8.1 — Inadimplência → Pagamento atrasado**
  - Evidência: No painel da barbearia o rótulo usado é "Em atraso": src/app/(dashboard)/clientes/page.tsx:40 (segmento) e :82 (badge de situação de retorno), src/app/(dashboard)/assinatura/page.tsx:94 ("A mensalidade está em atraso há mais de 5 dias"). "Inadimplentes" aparece apenas em src/app/admin/page.tsx:139, que é o painel super-admin da plataforma — exatamente a exceção de relatório que o guia permite.
  - O que falta: Nenhum.
- **§8.3 — Mensagens de erro no padrão dos exemplos**
  - Evidência: Praticamente idênticas aos exemplos do guia. "Este horário acabou de ser ocupado. Escolha outro horário." → src/modules/appointments/actions.ts:42 "Esse horário acabou de ser ocupado. Escolha outro." e :14 (variante para remarcação, que informa que o horário anterior foi mantido). "Não há estoque suficiente..." → src/modules/product-sales/actions.ts:47 "Estoque insuficiente para confirmar. Registre uma entrada em Produtos e Estoque." (com a próxima ação, melhor que o exemplo). "Digite o WhatsApp com DDD" → src/modules/appointments/actions.ts:48 "Informe um WhatsApp válido, com DDD.". Erros explicam como corrigir: src/modules/bills/actions.ts:57 "Revise descrição, valor e vencimento.".
  - O que falta: Divergência mínima: o exemplo "Não foi possível salvar. Confira sua internet e tente de novo." aparece no código sem a orientação de rede — "Não foi possível salvar. Tente de novo." (src/modules/bills/actions.ts:71, src/modules/settings/actions.ts:94/136/257/307, src/modules/professionals/actions.ts:268).
- **§9.2 — Barra inferior mobile com 5 itens (Início, Agenda, Clientes, Financeiro, Menu)**
  - Evidência: src/components/layout/dashboard-shell.tsx:148-153 define mobilePrimaryHrefs = ['/dashboard','/agenda','/clientes','/financeiro'] e as linhas 174-176 resolvem esses hrefs para os itens do nav. src/components/layout/mobile-tab-bar.tsx:55-89 renderiza `items.length + 1` colunas: os 4 fixos (linhas 59-77) + o SheetTrigger "Menu" (linhas 79-89). A barra é `fixed inset-x-0 bottom-0 ... lg:hidden` (linha 53) com alvos de `min-h-12` (48px, linha 67) e respeita safe-area.
  - O que falta: Estrutura exatamente conforme o guia. Ressalva de rótulo: o 4º item mostra "Resumo e caixa" (herdado de dashboard-shell.tsx:67) truncado em `max-w-16` (mobile-tab-bar.tsx:74) em vez de "Financeiro" — na prática o usuário lê algo como "Resumo e…". Um `mobileLabel` no NavItem resolveria.

### Parcial (15)

- **§8.1 — Ver página pública → Ver página de agendamento**
  - Evidência: Correto em src/components/layout/dashboard-shell.tsx:249 ("Ver página de agendamento"). Errado em src/components/dashboard/appearance-editor.tsx:358 (botão "Ver página pública") e ambíguo em src/app/(dashboard)/configuracoes/page.tsx:55 (botão "Ver página"). O termo "página pública" ainda aparece em textos de apoio visíveis: src/app/(dashboard)/servicos/page.tsx:176, src/app/(dashboard)/configuracoes/page.tsx:49, src/app/(dashboard)/permissoes/page.tsx:34, src/app/onboarding/page.tsx:29, src/app/(dashboard)/assinatura/page.tsx:93-94, src/components/dashboard/service-form-sheet.tsx:103 e :261, src/components/dashboard/contact-settings-form.tsx:34, src/components/dashboard/booking-rules-form.tsx:176.
  - O que falta: Trocar o rótulo do botão em appearance-editor.tsx:358 e configuracoes/page.tsx:55 para "Ver página de agendamento", e substituir "página pública" por "página de agendamento" nos ~10 textos de apoio listados.
  - Impacto: MEDIO · Esforço: P
- **§8.1 — Receita do período → Total vendido / Dinheiro recebido**
  - Evidência: Bem resolvido nos cards principais: src/app/(dashboard)/dashboard/page.tsx:332-339 ("Recebido hoje", "Recebido na semana", "Recebido no mês", "A receber") e src/app/(dashboard)/financeiro/page.tsx:306-338 ("Vendido no mês", "Recebido no mês", "A receber", "Despesas pagas no mês", "Lucro do mês (caixa)"). Ainda usa "Receita" em: src/app/(dashboard)/financeiro/page.tsx:665 e :704 (TableHead "Receita"), :648 ("Sem receitas neste mês ainda"), src/app/(print)/relatorio-financeiro/page.tsx:242-244, :302, :308, :322, :333, e src/components/dashboard/monthly-revenue-chart.tsx:130 ("Ainda sem receita nos últimos meses").
  - O que falta: Padronizar os cabeçalhos de tabela e o relatório impresso para "Total vendido" (quando é venda) ou "Dinheiro recebido" (quando é caixa) — hoje o painel usa a linguagem nova e o relatório em PDF usa a antiga.
  - Impacto: MEDIO · Esforço: P
- **§8.1 — Recorrente → Repetir todo mês**
  - Evidência: Ocorrência visível em src/app/(dashboard)/planos/page.tsx:137 — description="Venda recorrente com controle de uso e de vencimento...". Não há uso do termo em contas: o formulário de contas (src/components/dashboard/bill-form.tsx:41-63) tem apenas Descrição, Valor e Vencimento — nenhum campo de recorrência foi implementado.
  - O que falta: Trocar "Venda recorrente" por "Cobrança que repete todo mês" na descrição de /planos. Observação: a funcionalidade de conta que repete todo mês simplesmente não existe, então a troca de termo em contas-a-pagar é hoje inaplicável.
  - Impacto: BAIXO · Esforço: P
- **§8.1 — Exportar → Baixar relatório**
  - Evidência: `grep -rni "exportar" src/` retorna zero — o termo proibido não aparece. Porém o substituto prescrito também não é usado: os botões reais são "Gerar PDF" (src/app/(dashboard)/financeiro/page.tsx:389 e src/app/(dashboard)/relatorios/page.tsx:120), "Imprimir / Salvar PDF" (src/components/dashboard/print-button.tsx:23) e "Baixar QR Code (PNG)" (src/components/dashboard/share-page-card.tsx:75).
  - O que falta: Renomear "Gerar PDF" para "Baixar relatório" nas duas telas. "Gerar" é jargão de sistema; "Baixar" é o que o dono da barbearia espera.
  - Impacto: BAIXO · Esforço: P
- **§8.1 — No-show → Não compareceu**
  - Evidência: O termo em inglês não aparece na interface (`grep -rni "no.show|noshow"` só encontra o enum interno: src/modules/appointments/actions.ts:10,146,148 e a chave no_show em src/components/dashboard/appointment-status-badge.tsx:23). O rótulo correto "Não compareceu" existe em appointment-status-badge.tsx:24 e src/app/(public)/[tenant]/reserva/[token]/page.tsx:38. Mas o mesmo conceito recebe três nomes diferentes na interface: "Faltas" no filtro (src/app/(dashboard)/agenda/page.tsx:37), "Não veio" no botão (src/components/dashboard/appointment-actions.tsx:47) e "Desfazer falta" (appointment-actions.tsx:74).
  - O que falta: Unificar em "Não compareceu": filtro "Não compareceram", botão "Marcar como não compareceu", desfazer "Desfazer não compareceu". Hoje o operador vê três palavras para o mesmo estado.
  - Impacto: MEDIO · Esforço: P
- **§8.1 — Reserva enviada → Horário confirmado / Pedido de horário enviado**
  - Evidência: src/components/public-site/booking-form.tsx:372 mostra `{confirmed ? "Reserva confirmada!" : "Solicitação enviada!"}` e :386-387 o resumo com value `confirmed ? "Confirmada" : "Aguardando confirmação"`. A string literal proibida "Reserva enviada" não existe, mas nenhum dos dois textos prescritos foi adotado. O vocabulário "reserva" domina a área pública: src/app/(public)/[tenant]/reserva/[token]/page.tsx:109 e :112, src/components/public-site/cancel-reservation-button.tsx:33, src/components/public-site/booking-form.tsx:448, src/app/(public)/[tenant]/page.tsx:131.
  - O que falta: Trocar para "Horário confirmado!" / "Pedido de horário enviado" e substituir "reserva" por "horário" nos ~6 pontos da área pública. O guia é explícito: o cliente pensa em "horário", não em "reserva".
  - Impacto: MEDIO · Esforço: M
- **§8.1 — URL da imagem → Escolher foto**
  - Evidência: Upload real por arquivo já existe em 4 lugares: src/components/dashboard/appearance-editor.tsx:157 (logo) e :387 (fundo), src/components/dashboard/product-form-sheet.tsx:148 (foto do produto), src/components/dashboard/professional-profile-sheet.tsx:87 (avatar). Mas o formulário de serviço continua pedindo URL digitada: src/components/dashboard/service-form-sheet.tsx:194 — `<Label htmlFor="service-image">Imagem (URL)</Label>` com `type="url"` e placeholder "https://…" (linhas 195-200). Além disso, nenhum dos 4 uploads usa o rótulo "Escolher foto": appearance-editor.tsx:167 diz "Enviar logo" e os demais inputs de arquivo não têm label textual visível (só aria-label em professional-profile-sheet.tsx:92).
  - O que falta: Substituir o campo de URL do serviço por upload de arquivo e rotular todos os inputs de imagem como "Escolher foto". Um barbeiro não sabe o que é uma URL de imagem.
  - Impacto: ALTO · Esforço: M
- **§8.2 — Botões no padrão ação + objeto ("Salvar cliente", não "Salvar")**
  - Evidência: Levantamento por script sobre todos os .tsx (extração de <Button>/<DropdownMenuItem>/<AlertDialogAction> + grep dos ternários `pending ? … : …` e `editing ? … : …`): ~80 rótulos de ação distintos, dos quais ~48 seguem ação+objeto e ~30 são genéricos — cerca de 60% de conformidade. Bons exemplos: "Confirmar agendamento" (src/components/dashboard/manual-appointment-sheet.tsx:430), "Adicionar cliente" (client-form.tsx:56), "Criar plano" (membership-plan-sheet.tsx:210), "Registrar venda" (sell-membership-sheet.tsx:135), "Salvar expediente" (weekly-availability-editor.tsx:200), "Confirmar pagamento" (src/app/(dashboard)/financeiro/page.tsx:884), "Lembrar no WhatsApp" (agenda/page.tsx:446), "Baixar QR Code (PNG)" (share-page-card.tsx:75).
  - O que falta: Genéricos encontrados, incluindo três que o guia proíbe nominalmente: "Confirmar" sozinho em src/app/(dashboard)/financeiro/page.tsx:802, src/components/dashboard/reservation-actions.tsx:51 e src/components/dashboard/appointment-actions.tsx:20; "Salvar" sozinho em src/app/(dashboard)/profissionais/page.tsx:234; "Gerenciar equipe" (verbo proibido) em src/app/(dashboard)/permissoes/page.tsx:49. Demais genéricos: "Receber" (financeiro:489 — deveria ser "Receber pagamento"), "Estornar" (financeiro:775 e :854), "Remover" (profissionais:244), "Chamar" (client-contact-actions.tsx:85 — deveria ser "Chamar no WhatsApp", que já existe em outras telas), "Reativar" (client-contact-actions.tsx:69), "Renovar" (membership-actions.tsx:56), "Remarcar" (reschedule-sheet.tsx:109), "Cancelar" (reservation-actions.tsx:61 e appointment-actions.tsx:28/56), "Adicionar" (bill-form.tsx:68), "Convidar" (invite-member-form.tsx:80), "Restaurar" (restore-client-button.tsx:33), "Arquivar" (archive-client-button.tsx:70), "Excluir" (delete-entity-button.tsx:68), "Registrar" (inventory-movement-form.tsx:105), "Filtrar" (agenda:290), "Buscar" (clientes:231), "Copiar" (share-page-card.tsx:68), "Ver página" (configuracoes:55), "Salvar alterações" nos 3 sheets em modo edição (service-form-sheet.tsx:266, product-form-sheet.tsx:170, membership-plan-sheet.tsx:210).
  - Impacto: MEDIO · Esforço: M
- **§8.3 — Mensagens de sucesso no padrão dos exemplos**
  - Evidência: Tom e idioma corretos, mas sem o detalhe concreto que os exemplos exigem. Exemplo do guia "Agendamento confirmado para terça-feira às 15h" → código diz apenas "Agendamento confirmado na agenda." (src/modules/appointments/actions.ts:105). Exemplo "Pagamento de R$ 80 registrado" → código diz "Pagamento registrado." (src/modules/payroll/actions.ts:140). Exemplo "Cliente salvo" → "Cliente adicionado." (src/modules/clients/actions.ts:52), equivalente. Exemplo "Produto adicionado ao estoque" → "Movimentação registrada." (src/modules/inventory/actions.ts:64), que perde o objeto. Outras já boas: "Plano vendido — pagamento registrado." (src/modules/memberships/actions.ts:183), "Venda confirmada e estoque atualizado." (src/modules/product-sales/actions.ts:52).
  - O que falta: Interpolar dia/hora na confirmação de agendamento e o valor no registro de pagamento; trocar "Movimentação registrada" por "{N} unidades de {produto} adicionadas ao estoque". São 3-4 strings em src/modules/*/actions.ts.
  - Impacto: MEDIO · Esforço: P
- **§8.3 — Estado vazio oferece uma próxima ação (empty-state.tsx e seus usos)**
  - Evidência: src/components/feedback/empty-state.tsx aceita apenas `title` e `description` — não há prop de ação nem botão renderizado (o arquivo inteiro tem 20 linhas e não importa Button nem Link). Os 32 usos (`grep -rn "EmptyState" src/ | wc -l` = 32) compensam citando a ação no texto, sem botão: src/app/(dashboard)/servicos/page.tsx:176, src/app/(dashboard)/produtos/page.tsx:261-262, src/app/(dashboard)/planos/page.tsx:253-257 e :346-347, src/app/(dashboard)/profissionais/page.tsx:176-177, src/app/(dashboard)/relatorios/page.tsx:176-177, src/app/(dashboard)/comissoes/page.tsx:245-246, src/app/(dashboard)/financeiro/page.tsx:896 ("Nenhum atendimento hoje", que é literalmente o exemplo do guia — mas sem o botão "Novo agendamento").
  - O que falta: Adicionar uma prop `action?: React.ReactNode` ao EmptyState e passar o botão correspondente nos usos principais. O guia exige que o estado vazio ofereça a próxima ação clicável (§12), não que a descreva. Segundo problema: 6 dos 32 usos são de negação de permissão ("Acesso restrito" em contas-a-pagar/page.tsx:27, contas-a-receber/page.tsx:27, relatorios/page.tsx:42, comissoes/page.tsx:66, equipe/horarios/page.tsx:46, financeiro/page.tsx:82) — usar o componente de estado vazio para bloqueio de acesso confunde "não há nada" com "você não pode ver".
  - Impacto: MEDIO · Esforço: M
- **§8.3 — Confirmação destrutiva com título-pergunta, consequência e botões Voltar / <Ação> <objeto>**
  - Evidência: Três diálogos existem e seguem bem o formato título-pergunta + consequência: src/components/dashboard/archive-client-button.tsx:54-58 ("Arquivar {nome}?" + "O cliente sai da lista, mas todo o histórico de agendamentos é preservado..."), src/components/dashboard/delete-entity-button.tsx:52-56 ("Excluir {entidade}?" + "...será removido permanentemente. Se houver agendamentos futuros, a exclusão é bloqueada — prefira desativar."), src/components/dashboard/delete-client-forever-button.tsx:55-63. Porém a AÇÃO MAIS CRÍTICA do guia não tem confirmação nenhuma: cancelar agendamento em src/components/dashboard/appointment-actions.tsx:100-111 é um `<form action={updateAppointmentStatus}>` com um `<Button>` "Cancelar" que submete direto, sem AlertDialog — o mesmo vale para "Concluir" e "Não veio". Cancelar reserva de produto (src/components/dashboard/reservation-actions.tsx:57-66) também submete direto. O admin da plataforma usa `window.confirm` nativo (src/components/platform/admin-row-actions.tsx:107-109), que o guia não prevê.
  - O que falta: Faltam: (1) AlertDialog para cancelar agendamento com o texto exato do §8.3 ("O horário ficará disponível novamente e o produto reservado voltará ao estoque"); (2) o botão de escape é rotulado "Cancelar" (AlertDialogCancel em archive-client-button.tsx:66, delete-entity-button.tsx:64, delete-client-forever-button.tsx:71) quando o guia pede "Voltar" — "Cancelar" ao lado de "Cancelar agendamento" é ambíguo; (3) o botão confirmatório é "Excluir"/"Arquivar" sozinho, não "Excluir serviço"/"Arquivar cliente".
  - Impacto: ALTO · Esforço: M
- **§9.1 — Menu lateral com 240px de largura**
  - Evidência: src/components/layout/dashboard-shell.tsx:188 usa `w-64` (16rem = 256px) e a linha 235 compensa com `lg:pl-64`. `grep -rn "w-64|240px|15rem" src/` confirma que não há nenhuma definição de 240px para o menu.
  - O que falta: Trocar w-64/lg:pl-64 por w-60/lg:pl-60. Desvio de 16px — cosmético, mas é uma medida explícita do guia e trivial de corrigir.
  - Impacto: BAIXO · Esforço: P
- **§9.1 — Cabeçalho com busca, quando útil**
  - Evidência: `grep -rn "Search|search" src/components/layout/*.tsx` retorna zero — não há busca no cabeçalho. Existe busca local nas duas telas onde é mais necessária: src/app/(dashboard)/clientes/page.tsx:225-231 (placeholder "Nome ou telefone…", aria-label "Buscar cliente por nome ou telefone") e src/app/(dashboard)/agenda/page.tsx:283-291 (placeholder "Buscar cliente…").
  - O que falta: A busca existe onde é útil, mas dentro da página, não no cabeçalho como o guia especifica. Diferença de posicionamento, não de funcionalidade — por isso PARCIAL e não NAO_ATENDIDO.
  - Impacto: BAIXO · Esforço: M
- **§9.1 — Cabeçalho com botão Página de agendamento**
  - Evidência: src/components/layout/dashboard-shell.tsx:242-251: existe e com o rótulo correto ("Ver página de agendamento", linha 249), apontando para `/${tenant.slug}` com target="_blank". PORÉM a linha 246 aplica `className="hidden sm:inline-flex"` — o botão é invisível abaixo de 640px.
  - O que falta: No celular (o guia manda projetar primeiro para 360px, §10) o botão simplesmente não existe: está escondido no header por CSS e também não aparece no sheet Menu (ver item §9.2). O §10 é explícito: "Botão Ver página de agendamento deve existir" no mobile. Remover o `hidden sm:` ou adicionar o item ao Menu.
  - Impacto: ALTO · Esforço: P
- **§9.2 — Conteúdo do Menu: Serviços e produtos, Equipe, Página de agendamento, Configurações, Minha conta, Meu plano NexoBarber**
  - Evidência: src/components/layout/dashboard-shell.tsx:177-184 monta mobileMenuGroups como "todos os grupos do nav menos os 4 hrefs primários", renderizados em src/components/layout/mobile-tab-bar.tsx:94-126 sob o título "Todas as áreas" (linha 92). Resultado real: Financeiro (Despesas, A receber, Comissões, Relatórios), Serviços e produtos (Serviços, Planos de clientes, Produtos e estoque), Equipe (Profissionais, Horários e folgas, Permissões), Configurações — 11 links. Nenhum item de Página de agendamento, Minha conta ou Meu plano/Assinatura está no sheet: esses três só existem no UserMenu do cabeçalho (src/components/layout/user-menu.tsx:62 /minha-conta, :69 /configuracoes, :74 /assinatura) e no botão `hidden sm:` do header.
  - O que falta: Faltam 3 dos 6 itens especificados: "Página de agendamento" (inalcançável no mobile, ver §9.1), "Minha conta" e "Meu plano NexoBarber". Sobram 11 links onde o guia previa 6 — porque o Menu herda automaticamente a hierarquia inflada do desktop em vez de ter uma lista própria.
  - Impacto: ALTO · Esforço: P

### Não atendido (11)

- **§8.1 — Checkout → Receber pagamento**
  - Evidência: Termo em inglês visível ao usuário em 6 pontos: src/app/(dashboard)/produtos/page.tsx:323 (Badge "Checkout"), :172 ("O upsell de produtos no checkout é exclusivo do plano..."), :262 (descrição do estado vazio), :352-353 (tooltips "Tirar do checkout do agendamento"/"Oferecer no checkout do agendamento"), :355 (aria-label "Alternar checkout") e src/components/dashboard/product-form-sheet.tsx:166 (checkbox "Oferecer no checkout do agendamento (Plus)").
  - O que falta: Substituir por linguagem de balcão, ex.: Badge "Oferecido no agendamento", checkbox "Oferecer este produto ao cliente no agendamento". O botão de recebimento em si já existe como "Confirmar pagamento" (src/app/(dashboard)/financeiro/page.tsx:884).
  - Impacto: ALTO · Esforço: P
- **§8.1 — Ticket médio → Gasto médio por cliente**
  - Evidência: Rótulo "Ticket médio" visível em src/app/(dashboard)/financeiro/page.tsx:597 (card mobile) e :613 (cabeçalho de tabela desktop), e em src/app/(print)/relatorio-financeiro/page.tsx:359 ("Ticket médio por atendimento"). Em src/app/(dashboard)/clientes/page.tsx:285 o mesmo dado aparece abreviado como "· médio {valor}" (campo avg_ticket, linha 62).
  - O que falta: Trocar os 3 rótulos por "Gasto médio por cliente" e expandir o "· médio" da lista de clientes para "gasto médio". A variável avg_ticket pode permanecer.
  - Impacto: ALTO · Esforço: P
- **§8.1 — Acessos e papéis → Quem pode acessar**
  - Evidência: Rótulo literal proibido em src/components/dashboard/team-tabs.tsx:31 — `<TabsTrigger value="acessos"><KeyRound /> Acessos e papéis</TabsTrigger>`. O termo "papéis" também aparece em src/app/page.tsx:61 e :140 ("Equipe com papéis") e src/lib/billing/index.ts:27 ("Equipe com papéis e permissões").
  - O que falta: Renomear a aba para "Quem pode acessar" e revisar o comentário do próprio arquivo (linha 13) que ainda documenta "Acessos & papéis". Nos textos comerciais da landing, trocar "Equipe com papéis" por algo como "Cada um vê só o que precisa".
  - Impacto: ALTO · Esforço: P
- **§8.1 — Status → Situação**
  - Evidência: "Status" visível em 6 pontos: src/app/(dashboard)/produtos/page.tsx:280, src/app/(dashboard)/servicos/page.tsx:86 e src/app/(dashboard)/planos/page.tsx:276 (TableHead), src/app/(dashboard)/assinatura/page.tsx:62 (description "Status do seu plano..."), src/components/public-site/booking-form.tsx:386 e src/app/(public)/[tenant]/reserva/[token]/page.tsx:118 (label="Status" na tela de confirmação vista pelo cliente final). "Situação" é usado uma única vez: src/app/(dashboard)/planos/page.tsx:169.
  - O que falta: Trocar os 6 rótulos por "Situação". Os dois da área pública são os mais graves — é o cliente leigo que lê. Os nomes internos (statusSchema, statusMap, ?status=) podem permanecer.
  - Impacto: ALTO · Esforço: P
- **§8.1 — Assinatura (no perfil) → Meu plano NexoBarber**
  - Evidência: `grep -rni "meu plano" src/` retorna zero ocorrências. O item do menu do usuário é literalmente "Assinatura" (src/components/layout/user-menu.tsx:75) e o título da tela é "Assinatura" (src/app/(dashboard)/assinatura/page.tsx:61), apontando para /assinatura.
  - O que falta: Renomear o item do UserMenu e o PageHeader de /assinatura para "Meu plano NexoBarber". A rota /assinatura pode ficar. É a troca mais importante da tabela, porque hoje "Assinatura" significa duas coisas opostas no mesmo produto (o plano que o dono paga e o plano que o cliente dele compra).
  - Impacto: ALTO · Esforço: P
- **§8.1 — Movimentação de saída → Registrar saída**
  - Evidência: O jargão "movimentação" é a linguagem oficial do módulo de estoque: src/lib/inventory/index.ts:1-8 define MOVEMENT_TYPES com rótulos "Entrada — compra", "Saída — venda", "Saída — ajuste", "Saída — perda"; src/components/dashboard/inventory-movement-form.tsx:30 tem CardTitle "Registrar movimentação"; src/app/(dashboard)/produtos/page.tsx:158 ("Catálogo, saldo, reservas e movimentações num só lugar"), :434 ("Últimas movimentações"), :481 ("Nenhuma movimentação registrada ainda"); src/modules/inventory/actions.ts:64 retorna a mensagem de sucesso "Movimentação registrada."; src/components/dashboard/product-form-sheet.tsx:74 ("controlado pelas movimentações de entrada e saída").
  - O que falta: Reescrever o módulo para duas ações nomeadas: "Registrar entrada" e "Registrar saída", com o motivo (compra/venda/ajuste/perda) como campo secundário. São 7 pontos de texto visível + o array de rótulos.
  - Impacto: ALTO · Esforço: M
- **§9.1 — Menu lateral com exatamente 7 itens (Início, Agenda, Clientes, Financeiro, Serviços e produtos, Equipe, Configurações)**
  - Evidência: src/components/layout/dashboard-shell.tsx:49-144 define navGroups com 5 grupos e 15 links clicáveis: grupo sem rótulo (Início /dashboard:52, Agenda /agenda:53, Clientes /clientes:56); grupo "Financeiro" (Resumo e caixa:67, Despesas:72, A receber:79, Comissões:85, Relatórios:91); grupo "Serviços e produtos" (Serviços:100, Planos de clientes:103, Produtos e estoque:109); grupo "Equipe" (Profissionais:118, Horários e folgas:121, Permissões:127); grupo "Configurações" (Configurações:137). Renderizados em dashboard-shell.tsx:204-222 com os rótulos de grupo como texto não-clicável (linha 208). O relatório docs/entregas/fase-1.md:15-19 confirma que a navegação agrupada foi uma decisão deliberada, divergente do guia.
  - O que falta: São 15 destinos em vez de 7, e 4 dos 7 nomes prescritos existem apenas como cabeçalho de grupo inerte, não como item navegável — "Financeiro" é rótulo de seção e o link real chama-se "Resumo e caixa". Reduzir a 7 itens, movendo Despesas/A receber/Comissões/Relatórios para dentro da tela Financeiro (abas), Serviços/Planos/Produtos para dentro de "Serviços e produtos", e Profissionais/Horários/Permissões para dentro de "Equipe" (o padrão de abas já existe pronto em src/components/dashboard/team-tabs.tsx).
  - Impacto: ALTO · Esforço: G
- **§9.1 — Rodapé do menu com ajuda, perfil do usuário e recolher menu**
  - Evidência: src/components/layout/dashboard-shell.tsx:223-233 — o rodapé do aside contém exclusivamente um Separator e um formulário com o botão "Sair". Buscas: `grep -rni "ajuda|suporte|help" src/ --include=*.tsx` não retorna nada em componentes de layout (só "fale com o suporte" em textos de erro: src/app/error.tsx:29, src/app/global-error.tsx:34, src/app/(dashboard)/assinatura/page.tsx:205, src/components/dashboard/account-forms.tsx:61); `grep -rni "recolher|colaps|collapse|sidebar-toggle" src/` não retorna nenhum controle de menu (só um comentário sobre parallax em src/components/public-site/parallax.tsx:57 e border-collapse em relatorio-financeiro/page.tsx:405).
  - O que falta: Faltam os 3 elementos: (1) item de ajuda — não existe em lugar nenhum do painel; (2) perfil do usuário — existe, mas no CABEÇALHO (src/components/layout/user-menu.tsx montado em dashboard-shell.tsx:256), não no rodapé do menu; (3) recolher menu — não implementado, o aside é sempre 256px fixo em lg+.
  - Impacto: MEDIO · Esforço: M
- **§9.1 — Cabeçalho com título da tela**
  - Evidência: src/components/layout/dashboard-shell.tsx:236-263: o header sticky contém apenas o ícone Store + nome do tenant, visível somente abaixo de lg (linhas 237-240), e à direita o botão de página de agendamento, NotificationsBell e UserMenu. Não há nenhum slot de título. O título de cada tela vive dentro do <main>, no PageHeader (src/components/layout/page-header.tsx:20, `<h1 className="text-3xl...">`), usado pelas 17 páginas do painel.
  - O que falta: O guia quer o título no cabeçalho fixo (sempre visível ao rolar). Hoje ele rola para fora junto com o conteúdo. Como o header é Server Component sem acesso ao pathname/título, seria preciso um slot (context ou parallel route) alimentado por cada página.
  - Impacto: MEDIO · Esforço: M
- **§9.1 — Cabeçalho com botão + Novo**
  - Evidência: src/components/layout/dashboard-shell.tsx:241-262 — o bloco à direita do header tem apenas 3 elementos (botão de página de agendamento, NotificationsBell, UserMenu). Não existe botão "+ Novo" global; `grep -rn "Novo\b" src/components/layout/*.tsx` retorna apenas strings de comentário. Os botões de criação são por tela: "Novo agendamento" (src/app/(dashboard)/agenda/page.tsx:222), "Novo cliente" (clientes/page.tsx:200), "Novo produto" (product-form-sheet.tsx:65), "Novo serviço" (service-form-sheet.tsx:94), "Novo plano" (membership-plan-sheet.tsx:83).
  - O que falta: Falta o botão global "+ Novo" com menu (novo agendamento / novo cliente / nova venda / nova despesa). É o atalho que o guia usa para garantir que a ação mais frequente seja alcançável de qualquer tela sem abrir menus escondidos (§12, último item).
  - Impacto: MEDIO · Esforço: M
- **§9.2 — Botão principal da tela pode ficar fixo acima da barra inferior, sem cobrir conteúdo**
  - Evidência: `grep -rn "fixed bottom|bottom-20|bottom-16|sticky bottom" src/ --include=*.tsx` retorna uma única ocorrência, e ela é da área pública: src/components/public-site/booking-form.tsx:803 (`sticky bottom-3`). Nenhuma tela do painel tem botão de ação fixo. O <main> reserva o espaço (`pb-24` em src/components/layout/dashboard-shell.tsx:265) mas nada o ocupa — os botões principais ficam no topo, dentro do PageHeader (ex.: src/app/(dashboard)/agenda/page.tsx:220 "Novo agendamento").
  - O que falta: No celular a ação principal fica no topo e rola para fora da tela. O guia permite (não obriga) o botão fixo, mas combinado com §10 ("manter ações importantes ao alcance do polegar") a ausência é uma lacuna real — o padding-bottom já existe, falta o componente.
  - Impacto: MEDIO · Esforço: M

### Apontado pelo verificador (não coberto na primeira passada)

- §8.1 — linha "Confirmação na hora → Horário confirmado automaticamente" da tabela do guia (GUIA_VISUAL.md:1051) não foi auditada: a lista de itens §8.1 dele pula direto de "Reserva enviada" para "Assinatura (no perfil)". Estado real: src/components/dashboard/booking-rules-form.tsx:47 Label "Confirmação da reserva", :55 "Manual — a equipe confirma cada reserva (recomendado)", :58 "Automática — a reserva já entra confirmada na agenda". `grep -rn "Horário confirmado automaticamente" src/` = 0 → NAO_ATENDIDO, e ainda carrega o "reserva" que ele mesmo condena no item anterior.
- §9.1 "título da tela" — divergência sistemática entre o rótulo do MENU e o título da TELA, em 6 dos 15 links. dashboard-shell.tsx:67 "Resumo e caixa" → financeiro/page.tsx:368 title="Financeiro"; :73 "Despesas" → contas-a-pagar/page.tsx:44 title="Contas a pagar"; :79 "A receber" → contas-a-receber/page.tsx:46 title="Contas a receber"; :86 "Comissões" → comissoes/page.tsx:182 title="Pagamento de Funcionários"; :118 "Profissionais" → profissionais/page.tsx:290 title="Profissionais e Equipe"; :52 "Início" → dashboard/page.tsx:377 title=`Olá, {nome}!`. O usuário clica num nome e chega noutro — fere o objetivo 1 do guia ("Em qual área está").
- §9.2 — conteúdo do Menu mobile: ele diz apenas que "diverge", sem enumerar. Concreto: dashboard-shell.tsx:177-184 monta `mobileMenuGroups` como (todos os grupos do sidebar) − (os 4 hrefs fixos), gerando 11 links, e mobile-tab-bar.tsx:94-126 renderiza só isso. Faltam os 3 itens que o guia exige dentro do Menu: "Página de agendamento", "Minha conta" e "Meu plano NexoBarber". Combinado com o `hidden sm:inline-flex` de dashboard-shell.tsx:246, em 360px NÃO EXISTE nenhum caminho para a página pública — o que também viola o §10 ("Botão Ver página de agendamento deve existir").
- §8.2 — os rótulos nominalmente proibidos "OK", "Enviar", "Prosseguir" e "Acessar" não foram buscados. Busquei: `grep -rnE ">\s*(OK|Enviar|Prosseguir|Continuar|Acessar|Avançar)\s*<" src/ --include=*.tsx` retorna zero (só aparece "Entrar" em src/app/(auth)/login/page.tsx:51, src/app/page.tsx:190 e src/app/salao/page.tsx:183, que é rótulo padrão de login e não está na lista de proibidos). Essa metade da lista do §8.2 está limpa e merecia constar como ATENDIDO explícito.
- §9.1 rodapé — ele afirma no resumo que faltam "ajuda" e "recolher menu" mas não mostra a busca. Comprovação: `grep -rniE "recolher|colaps|collapse" src/` retorna só falsos positivos (public-site/parallax.tsx:57, relatorio-financeiro/page.tsx:405 `border-collapse`); `grep -rniE "\bajuda\b|suporte" src/ --include=*.tsx` só acha textos de rodapé/erro (account-forms.tsx:61, assinatura/page.tsx:205, error.tsx:29) — nenhum link de ajuda na navegação. O rodapé do menu tem exclusivamente o form de signOut (dashboard-shell.tsx:223-233).
- §8.1 — ocorrência adicional de "página pública" fora da interface do painel que ele não listou: src/lib/billing/index.ts:26 ("Página pública da barbearia", feature do catálogo de planos), exibida em /assinatura e nas landings. Some-se aos ~10 pontos que ele já mapeou.

---

## Telas Início e Agenda (§7.1, §7.2)

As duas telas foram construídas antes do guia visual e ainda seguem o paradigma antigo de "listas + muitos cards". A tela INÍCIO tem 8 cartões de indicadores (4 de receita quase idênticos + 4 de contagem, sendo dois deles literalmente o mesmo número), mantém o bloco "Acesso rápido" que o guia manda remover, não tem cabeçalho com data nem os botões "+ Novo" e "Página de agendamento", não usa layout de duas colunas e não mostra o resultado do mês (vendido/despesas/lucro) — apesar de a RPC `income_summary` já retornar `sold`, `expenses_paid` e `profit` desde a Fase 4 e a página consumir apenas `receivable`. O bloco "Precisa de atenção" existe, mas com 3 dos 5 tipos exigidos (faltam estoque baixo e assinaturas vencendo). O achado central da dimensão: a AGENDA NÃO É UM CALENDÁRIO — é uma lista de linhas agrupadas por dia (`dayGroups` + `<div grid sm:grid-cols-[90px_1fr_1fr_auto]>`). Não há eixo de horas, não há colunas por profissional, não há clique em área vazia, não existe biblioteca de calendário no package.json nem componente de calendário em src/components. O alternador tem Próximos/Dia/Semana (sem Mês, sem Lista), o filtro de profissional é botão de texto sem foto, não há setas anterior/próximo, não existe estado "Em atendimento" (decisão registrada na migração da Fase 2 de não implementar `in_progress`), "Concluir" gera um a-receber mas o recebimento acontece só no /financeiro, e bloqueios/folgas nem são consultados pela agenda. Cobertura estimada: cerca de um terço do que §7.1 e §7.2 pedem.

### Atendido (8)

- **§7.2 Ações rápidas Confirmar / Não compareceu / Cancelar, mostrando SOMENTE as válidas para a situação**
  - Evidência: src/components/dashboard/appointment-actions.tsx:16-79 define `actionsByStatus` por estado (pending → Confirmar/Cancelar; confirmed → Concluir/Não veio/Cancelar; completed/no_show → desfazer); :91-95 filtra ainda por `notInFuture`, escondendo "Concluir" e "Não veio" de horários futuros; :95 retorna null quando não há ação. A regra é espelhada no banco em supabase/migrations/202607240024_fase2_agenda_operacional.sql:34-47.
  - O que falta: Apenas nomenclatura: o guia pede "Não compareceu" e o botão diz "Não veio" (appointment-actions.tsx:46).
- **§7.2.5 Painel lateral: buscar cliente por nome ou WhatsApp**
  - Evidência: src/components/dashboard/manual-appointment-sheet.tsx:224-236 — `<Input list="manual-appointment-clients" ... aria-label="Buscar cliente existente" />` com `<datalist>` alimentado por `clientLabel` (:100-101), que concatena `nome · telefone`, permitindo busca pelos dois. Alterna com o modo "Novo cliente" (:209-220, :256-274). Dados vindos de src/app/(dashboard)/agenda/page.tsx:109-114.
- **§7.2.5 Painel lateral: escolher serviço, profissional, data e hora**
  - Evidência: src/components/dashboard/manual-appointment-sheet.tsx:279-302 (select de serviço), :303-332 (select de profissional, filtrado pelos que executam o serviço via `availableProfessionals` :112-118), :338-371 (carrossel de 14 dias) e :389-411 (grade de horários livres vinda da RPC `getManualSlots`, a mesma da página pública).
- **§7.1.1 Cabeçalho do Início: saudação curta**
  - Evidência: src/app/(dashboard)/dashboard/page.tsx:378 — `title={`Olá, ${tenant.profileName.split(" ")[0]}!`}` (só o primeiro nome).
- **§7.1.2 Indicador "Dinheiro recebido hoje"**
  - Evidência: src/app/(dashboard)/dashboard/page.tsx:332 — `{ label: "Recebido hoje", value: formatBRL(revenueToday) }`, alimentado pela RPC `sum_paid_income` na janela do dia (:125-132, :164).
- **§7.1.2 Indicador "Atendimentos de hoje"**
  - Evidência: src/app/(dashboard)/dashboard/page.tsx:344-349 — `{ label: "Atendimentos hoje", value: String(scheduled.length), icon: CalendarDays, accent: true }`, com `scheduled` = agendamentos do dia não cancelados (:319).
- **§7.1.2 Indicador "Valores a receber"**
  - Evidência: src/app/(dashboard)/dashboard/page.tsx:335-339 — `{ label: "A receber", value: formatBRL(receivableTotal), href: "/financeiro#a-receber" }`, com `receivableTotal` lido de `income_summary` (:324-327).
- **§7.1 Remover: gráficos meramente decorativos**
  - Evidência: Não há gráfico no Início. Busca `grep -rn "MonthlyRevenueChart" --include=*.tsx src/` → src/app/(print)/relatorio-financeiro/page.tsx:304 e src/app/(dashboard)/financeiro/page.tsx:514, nunca no dashboard. Busca `grep -rniE "recharts|chart" src/app/(dashboard)/dashboard/page.tsx` → só o ícone `ChartNoAxesCombined` do link "Relatórios" (:7 e :70), que sai junto com o bloco Acesso rápido.

### Parcial (9)

- **§7.2.2 Alternador Dia | Semana | Mês | Lista**
  - Evidência: src/app/(dashboard)/agenda/page.tsx:68-69 (`activeView = view === "semana" ? "semana" : validDay ? "dia" : "proximos"`) e :231-263 renderizam exatamente três botões: "Próximos", "Dia", "Semana". Confirmado pelo próprio relatório docs/entregas/fase-2.md:32 ("visões Próximos / Dia / Semana").
  - O que falta: Falta a visão Mês. "Próximos" não é nenhuma das quatro visões do guia (é a Lista disfarçada de padrão). Como Dia e Semana também renderizam listas, na prática só existe a visão Lista em três recortes de período.
  - Impacto: ALTO · Esforço: G
- **§7.2.3 Filtro de profissional COM FOTO e nome**
  - Evidência: src/app/(dashboard)/agenda/page.tsx:85-90 seleciona apenas `id,name,public_visible` — `avatar_url` nem é buscado. :319-334 renderiza `<Button asChild size="sm"><Link>{professional.name}</Link></Button>` — texto puro. Prova de que a foto existe no domínio: src/app/(dashboard)/profissionais/page.tsx:55 seleciona `avatar_url` e :95-96 usa `<AvatarImage src={item.avatar_url} .../>`; componente disponível em src/components/ui/avatar.tsx.
  - O que falta: Incluir `avatar_url` no select e trocar os botões por chips com Avatar + nome (com fallback de iniciais).
  - Impacto: MEDIO · Esforço: P
- **§7.2.1 Cabeçalho com a data corrente visível**
  - Evidência: src/app/(dashboard)/agenda/page.tsx:206-227: PageHeader recebe eyebrow="Operação", title="Agenda", description="Confirme, conclua, remarque ou cancele..." — nenhuma data. A data só aparece como `<input type="date" name="dia">` dentro da barra de filtros (:272-278). O componente src/components/layout/page-header.tsx:1-28 não tem slot para data.
  - O que falta: Exibir a data por extenso ao lado do título ("Agenda — segunda, 28 de julho"), entre as setas.
  - Impacto: BAIXO · Esforço: P
- **§7.2 Ação rápida "Finalizar e receber" (concluir e capturar o pagamento no mesmo gesto)**
  - Evidência: src/components/dashboard/appointment-actions.tsx:36-43 tem "Concluir" (apenas muda status). O trigger supabase/migrations/202607230022_fase0_verdade_financeira.sql:60-68 insere a receita com `status = 'pending'` e sem `paid_at` (comentário na linha 60: "Vendido, ainda não recebido: sem paid_at e sem forma de pagamento"). O recebimento fica em outra tela: src/app/(dashboard)/financeiro/page.tsx:446-489 (âncora `a-receber` e `<Button size="sm">Receber</Button>`).
  - O que falta: Trazer a captura da forma de pagamento para dentro da agenda (mini-painel ao concluir), de modo que "Finalizar e receber" grave `status='paid'` + `payment_method` numa única ação.
  - Impacto: ALTO · Esforço: M
- **§7.2 Faixas coloridas por situação (Pendente amarela, Confirmado azul, Concluído verde) no cartão**
  - Evidência: src/components/dashboard/appointment-status-badge.tsx:4-28 tem as cores semanticamente certas (pending amber, confirmed sky, completed emerald, no_show rose), mas é apenas um SELO. A linha do atendimento tem borda neutra: src/app/(dashboard)/agenda/page.tsx:416 `"grid items-center gap-3 rounded-xl border p-4 ..."` — nenhuma classe dependente de `item.status`. Além disso o badge usa paleta Tailwind fixa em vez dos tokens `--warning/--info/--success` definidos em src/app/globals.css:88-90 (claro) e :130-132 (escuro).
  - O que falta: Adicionar faixa lateral colorida (border-l-4 ou pseudo-elemento) por status no cartão e migrar as classes do badge para os tokens do design system.
  - Impacto: MEDIO · Esforço: P
- **§7.2.5 Painel lateral: resumo de duração e valor**
  - Evidência: A duração aparece embutida no rótulo da opção: src/components/dashboard/manual-appointment-sheet.tsx:298 `{service.name} · {service.durationMinutes} min`. O VALOR não existe: src/app/(dashboard)/agenda/page.tsx:99-104 seleciona apenas `id,name,duration_minutes` de `services` e o tipo `ServiceOption` (manual-appointment-sheet.tsx:33) não tem preço. Não há bloco de resumo antes do botão (o rodapé :429-442 vai direto ao submit).
  - O que falta: Buscar `price`, propagar no ServiceOption e renderizar um resumo antes do botão: horário escolhido, duração e valor previsto.
  - Impacto: MEDIO · Esforço: P
- **§7.2.5 Botão "Salvar agendamento"**
  - Evidência: src/components/dashboard/manual-appointment-sheet.tsx:430-441 — botão de submit existe, mas o rótulo é "Confirmar agendamento".
  - O que falta: Renomear para "Salvar agendamento" conforme §7.2.5 e o padrão de verbos de §8.2.
  - Impacto: BAIXO · Esforço: P
- **§7.1.3 Bloco "Precisa da sua atenção" com os 5 tipos**
  - Evidência: src/app/(dashboard)/dashboard/page.tsx:197-216 define `actionItems` com apenas 3 tipos: "Clientes para chamar" (RPC count_clients_to_call, :180), "Reservas aguardando confirmação" (:204-209, count de appointments pending futuros :182-187) e "Contas vencidas" (:210-215, accounts_payable pending com due_date < hoje :188-195). Renderizado em :388-412 sob o título "Precisa de atenção hoje". FALTAM: estoque baixo — a lógica existe mas só em src/app/(dashboard)/produtos/page.tsx:127 (`stockOf(product.id) < Number(product.minimum_stock)`), nunca no dashboard; assinaturas vencendo — o dashboard não faz nenhuma query de memberships (busca por "membership|assinatura|vencendo" no arquivo → 0 resultados; a visão existe em src/app/(dashboard)/planos/page.tsx:87,119).
  - O que falta: Acrescentar os dois alertas faltantes (estoque abaixo do mínimo e assinaturas com período vencendo/past_due), reaproveitando as consultas de /produtos e get_membership_overview.
  - Impacto: ALTO · Esforço: M
- **§7.1.4 Coluna esquerda: agenda de hoje e próximos horários**
  - Evidência: O conteúdo existe: src/app/(dashboard)/dashboard/page.tsx:464-501 card "Agenda de hoje" (hora, cliente, serviço·profissional, badge, limite de 6 itens em :475) e :503-558 card "Lembretes de amanhã" com botão de WhatsApp. Mas ambos ocupam a largura toda, empilhados, não uma coluna.
  - O que falta: Apenas reposicionar dentro da coluna esquerda do layout de duas colunas.
  - Impacto: BAIXO · Esforço: P

### Não atendido (17)

- **§7.2 Calendário central de verdade: horário na lateral, profissionais em COLUNAS na visão diária, cartão posicionado no tempo. ACHADO PRINCIPAL DA DIMENSÃO.**
  - Evidência: src/app/(dashboard)/agenda/page.tsx:196-202 monta `dayGroups` (Map de dia → array) e :374-503 renderiza `Card > CardContent > [...dayGroups.entries()].map(...items.map(...))`; cada atendimento é uma LINHA: :416 `className="grid items-center gap-3 rounded-xl border p-4 sm:grid-cols-[90px_1fr_1fr_auto]"`. Não há eixo de horas nem coluna por profissional. Buscas que comprovam a ausência: `ls src/components/ui/` (19 arquivos, nenhum calendar.tsx); `ls src/components/dashboard/` (37 arquivos, nenhum de calendário/grade); `grep -n "calendar|fullcalendar|big-calendar|dnd|schedule" package.json` → 0 resultados; `grep -rniE "calendar|columns|coluna" --include=*.tsx src/ -l` retorna só landings, mobile-tab-bar e formulários públicos.
  - O que falta: Construir a grade real: eixo vertical de horários (slot de 15/30 min derivado de professional_availability), colunas por profissional na visão diária, cartões absolutamente posicionados por starts_at/ends_at com altura proporcional à duração. Hoje só existe a lista.
  - Impacto: ALTO · Esforço: G
- **§7.2.4 Clique em área vazia já abre o cadastro com data, hora e profissional preenchidos**
  - Evidência: src/components/dashboard/manual-appointment-sheet.tsx:72-84 — a assinatura aceita apenas `clients, services, professionals, timezone, todayInTz`; não há props de pré-preenchimento. O estado inicia vazio em :89-95 (`serviceId=""`, `professionalId=""`, `date=""`, `slot=""`). A agenda instancia o painel só no cabeçalho (src/app/(dashboard)/agenda/page.tsx:212-218), sem nenhum handler de clique em célula (não existem células).
  - O que falta: Depende do item anterior. Após a grade existir: aceitar props `defaultDate/defaultTime/defaultProfessionalId` no ManualAppointmentSheet e abrir o painel a partir do onClick da célula vazia.
  - Impacto: ALTO · Esforço: M
- **§7.2.1 Cabeçalho da agenda com setas anterior/próximo**
  - Evidência: Busca `grep -rn "ChevronLeft|ChevronRight|ArrowLeft|anterior|próximo dia|Ontem" --include=*.tsx src/app/(dashboard)/agenda/page.tsx src/components/dashboard/` → único resultado é um comentário em reschedule-sheet.tsx:50 ("o horário anterior é preservado"), nada de navegação. Os imports da agenda (:2) são apenas CalendarPlus, MessageCircle, Search, ShoppingBag.
  - O que falta: Adicionar dois botões-ícone que aplicam ±1 dia (ou ±1 semana conforme a visão) sobre `validDay`, reaproveitando o helper `buildQuery` já existente em :178-193.
  - Impacto: MEDIO · Esforço: P
- **§7.2 Ação rápida "Iniciar" / estado "Em atendimento"**
  - Evidência: supabase/migrations/202607020001_core_schema.sql:9 — `create type public.appointment_status as enum ('pending','confirmed','completed','canceled','no_show')`: não há `in_progress`. supabase/migrations/202607240024_fase2_agenda_operacional.sql:7-10 registra a decisão explícita: "`in_progress` NÃO foi implementado — decisão registrada: o fluxo do balcão vai de confirmado direto a concluído". O trigger :34-41 só aceita pending→confirmed e confirmed→completed/canceled/no_show. Na interface, src/components/dashboard/appointment-actions.tsx:34-59 (bloco `confirmed`) não tem "Iniciar".
  - O que falta: Adicionar o valor `in_progress` ao enum, liberar as transições confirmed→in_progress→completed no trigger e incluir a ação "Iniciar" no mapa `actionsByStatus`, além do selo/faixa correspondente.
  - Impacto: MEDIO · Esforço: M
- **§7.2 Concluído aparece verde COM o valor recebido**
  - Evidência: src/app/(dashboard)/agenda/page.tsx:152-154 — o select dos atendimentos é `"id,starts_at,ends_at,status,client:clients(name,phone),service:services(id,name),professional:professionals(id,name)"`: o preço nunca é buscado. A renderização :418-444 exibe hora, data, cliente, telefone, serviço, profissional e badge — nenhum valor monetário. `formatBRL` é importado (:13) mas só usado no card de reservas de produto (:363).
  - O que falta: Incluir `services(price)` (ou o valor efetivo da financial_transaction vinculada) no select e exibir o valor nos itens concluídos.
  - Impacto: MEDIO · Esforço: P
- **§7.2 Produto reservado aparece DENTRO do atendimento, não em uma fila separada**
  - Evidência: src/app/(dashboard)/agenda/page.tsx:137-148 busca `appointment_products` pendentes e :338-372 renderiza um Card independente no topo, "Vendas de produto a confirmar" — exatamente a fila separada que o guia manda evitar. Os produtos não são relacionados de volta às linhas de atendimento em :391-486.
  - O que falta: Mover a reserva de produto para dentro do cartão do atendimento correspondente (linha extra "+ Pomada x1 · R$ 35") e remover o card de fila.
  - Impacto: MEDIO · Esforço: M
- **§7.2 Bloqueios, almoço e folga com fundo hachurado e texto**
  - Evidência: A agenda nunca consulta bloqueios: a única query de período é `supabase.from("appointments")` em src/app/(dashboard)/agenda/page.tsx:150-163. Busca `grep -rn "schedule_blocks" --include=*.tsx --include=*.ts src/` → apenas src/modules/availability/actions.ts:161,203 e src/app/(dashboard)/equipe/horarios/page.tsx:95. Busca `grep -rn "hachur|repeating-linear-gradient|stripes" --include=*.tsx --include=*.css src/` → 0 resultados.
  - O que falta: Consultar `schedule_blocks` na janela da agenda e pintar as faixas com fundo hachurado (repeating-linear-gradient) + rótulo ("Almoço", "Folga", motivo do bloqueio). Sem a grade (item 1) não há onde posicioná-las.
  - Impacto: ALTO · Esforço: M
- **§7.1.1 Cabeçalho do Início: data**
  - Evidência: src/app/(dashboard)/dashboard/page.tsx:376-381 — PageHeader recebe eyebrow="Resumo do dia", title, description="Tudo o que importa hoje, em um lugar só." e action={<PlanBadge/>}. Nenhuma data. O componente src/components/layout/page-header.tsx:1-28 não tem prop de data. `getDateInTz` é importado (:21) mas usado apenas no filtro de contas vencidas (:194).
  - O que falta: Exibir a data por extenso no fuso do tenant sob a saudação.
  - Impacto: BAIXO · Esforço: P
- **§7.1.1 Cabeçalho do Início: botão dourado "+ Novo"**
  - Evidência: src/app/(dashboard)/dashboard/page.tsx:380 — o único `action` do cabeçalho é `<PlanBadge plan={tenant.plan} />`. Não há Button nem Link de criação no cabeçalho; o import `Button` (:38) só é usado no card "Agenda de hoje" (:467) e nos lembretes (:534). O token dourado existe: src/app/globals.css:105 `--primary: #f2b84b` e o `variant="default"` do Button já é `bg-primary` (src/components/ui/button.tsx, linha do variant default).
  - O que falta: Adicionar o botão primário "+ Novo" no cabeçalho (abrindo o ManualAppointmentSheet ou um menu de criação).
  - Impacto: ALTO · Esforço: P
- **§7.1.1 Cabeçalho do Início: botão secundário "Página de agendamento"**
  - Evidência: Nenhum link para `/${tenant.slug}` ou `/agendar` em src/app/(dashboard)/dashboard/page.tsx (o arquivo inteiro, 587 linhas, não referencia `tenant.slug`). O compartilhamento do link vive só em Configurações: `grep -rn "SharePageCard|share-page-card" --include=*.tsx src/` → src/components/dashboard/share-page-card.tsx:10 e src/app/(dashboard)/configuracoes/page.tsx:11,62.
  - O que falta: Adicionar botão secundário no cabeçalho apontando para a página pública (target=_blank), como já é feito no fallback da agenda (agenda/page.tsx:220-224).
  - Impacto: MEDIO · Esforço: P
- **§7.1.2 EXATAMENTE quatro indicadores**
  - Evidência: São 8 cartões de indicador para quem tem permissão financeira: `revenueCards` com 4 itens (src/app/(dashboard)/dashboard/page.tsx:329-341, renderizados em :414-441) MAIS `metrics` com 4 itens (:343-367, renderizados em :443-462). Somando o card "Precisa de atenção hoje" (:388-412) e o ActivationChecklist (:383-385), o topo da tela chega a 10 blocos antes da agenda do dia.
  - O que falta: Reduzir a exatamente 4: Dinheiro recebido hoje, Atendimentos de hoje, Valores a receber, Pendências.
  - Impacto: ALTO · Esforço: M
- **§7.1.2 Indicador "Pendências"**
  - Evidência: Não existe cartão "Pendências" em `revenueCards` (src/app/(dashboard)/dashboard/page.tsx:329-341) nem em `metrics` (:343-367). O conceito aparece só como lista dentro do card "Precisa de atenção hoje" (:387-412), sem número totalizado.
  - O que falta: Criar o quarto indicador somando as pendências (reservas a confirmar + contas vencidas + estoque baixo + assinaturas vencendo), com link para o bloco de atenção.
  - Impacto: MEDIO · Esforço: P
- **§7.1.4 Corpo em duas colunas (esquerda maior com a agenda, direita com o resultado do mês)**
  - Evidência: Toda a página é uma pilha de blocos de largura total: src/app/(dashboard)/dashboard/page.tsx:414 (grid de receita), :443 (grid de métricas), :464 `<Card className="mt-6">` (Agenda de hoje), :503 `<Card className="mt-6 ...">` (Lembretes) e :560 `<div className="mt-6">` (Acesso rápido). Não existe nenhum container de duas colunas (nenhuma classe do tipo `lg:grid-cols-3` / `lg:col-span-2` no arquivo).
  - O que falta: Envolver agenda do dia + próximos horários numa coluna esquerda (2/3) e criar a coluna direita com o resultado do mês.
  - Impacto: MEDIO · Esforço: M
- **§7.1.4 Coluna direita: resultado do mês com total vendido, despesas e lucro**
  - Evidência: A RPC já entrega os três números: supabase/migrations/202607240027_fase4_financeiro_gerencial.sql:20-26 declara `returns table (sold, received, receivable, expenses_paid, profit)` e :58 calcula `(s.received - s.expenses_paid) as profit`. Mas o dashboard descarta tudo menos um campo: src/app/(dashboard)/dashboard/page.tsx:324-327 lê apenas `summaryRow?.receivable`. Nenhuma menção a `sold`, `expenses_paid` ou `profit` no arquivo.
  - O que falta: Criar o bloco "Resultado do mês" consumindo sold/expenses_paid/profit do mesmo `summaryRes` já carregado (:167-173) — custo zero de query adicional.
  - Impacto: ALTO · Esforço: P
- **§7.1.5 Bloco "Clientes para chamar" com nome, dias sem vir, serviço habitual e botão "Chamar no WhatsApp"**
  - Evidência: No dashboard existe só a CONTAGEM e um link: src/app/(dashboard)/dashboard/page.tsx:178-181 chama a RPC `count_clients_to_call` e :198-203 monta `{ label: "Clientes para chamar", count, href: "/clientes?segmento=para_chamar", cta: "Chamar no WhatsApp" }` — o "cta" é apenas o texto de um link interno (:405-407), não abre o WhatsApp. Os dados detalhados existem em outra tela: src/app/(dashboard)/clientes/page.tsx:57-63 (`days_since`, `top_service`, `expected_return_at`) via RPC get_client_insights, com `returnMessage`/`reminderWhatsAppHref` importados em :6.
  - O que falta: Trazer para o Início uma lista curta (3-5 clientes) com nome, dias sem vir, serviço habitual e link wa.me real, reaproveitando get_client_insights com segmento para_chamar e limite pequeno.
  - Impacto: ALTO · Esforço: M
- **§7.1 Remover: bloco "Acesso rápido" que repete o menu**
  - Evidência: Continua inteiro: src/app/(dashboard)/dashboard/page.tsx:46-106 define `quickLinks` com 8 destinos (Agenda, Financeiro, Relatórios, Clientes, Serviços, Profissionais e Equipe, Produtos e Estoque, Identidade Visual) e :560-583 renderiza a seção com o título literal "Acesso rápido" em grade de cartões. Todos esses destinos já estão na navegação lateral.
  - O que falta: Excluir o array `quickLinks`, o bloco de renderização :560-583, os imports de ícones que só ele usa (Banknote, ChartNoAxesCombined, Scissors, ShoppingBag, Settings, Users) e o `visibleLinks` (:369-371).
  - Impacto: ALTO · Esforço: P
- **§7.1 Remover: vários cartões que mostram quase a mesma receita**
  - Evidência: Três cartões de receita quase idênticos convivem: src/app/(dashboard)/dashboard/page.tsx:332-334 — "Recebido hoje", "Recebido na semana", "Recebido no mês" (três chamadas separadas de `sum_paid_income` em :164-166). Pior: em `metrics`, "Atendimentos hoje" (:346) e "Clientes agendados" (:352) exibem exatamente o MESMO valor `String(scheduled.length)` — dois cartões com o mesmo número e rótulos diferentes.
  - O que falta: Manter só "Dinheiro recebido hoje" no topo (semana/mês pertencem ao Financeiro) e eliminar a duplicata Atendimentos/Clientes agendados.
  - Impacto: ALTO · Esforço: P

### Apontado pelo verificador (não coberto na primeira passada)

- §5.6 (Selos de situação) — cores INVERTIDAS em relação à tabela do guia, que manda "Não compareceu = Cinza" e "Cancelado = Vermelho": src/components/dashboard/appointment-status-badge.tsx:19-22 pinta `canceled` de cinza (`bg-muted text-muted-foreground`) e :23-27 pinta `no_show` de vermelho (`bg-rose-100 ... dark:text-rose-300`). O guia também sugere ícone por situação e o selo não tem nenhum (:46-48). O auditor examinou este arquivo (item das faixas coloridas) e não notou a inversão.
- Bug real no cartão "Próximo horário" do Início: src/app/(dashboard)/dashboard/page.tsx:360-366 usa `scheduled[0].startsAt`, e `scheduled` (:319) é a lista do dia inteiro ordenada por `starts_at` desde `dayStart` (:151-153), filtrando apenas `canceled`. Às 18h o cartão continua exibindo o horário das 9h — não é o "próximo", é o primeiro do dia. O auditor citou o cartão ao contar os 8 indicadores, mas não verificou o que ele calcula.
- §5.5 (Listas) — "Clicar na linha abre detalhes" não acontece na agenda: cada atendimento é uma `<div>` inerte em src/app/(dashboard)/agenda/page.tsx:414-417, sem Link, sem onClick e sem rota de detalhe do agendamento (não existe src/app/(dashboard)/agenda/[id]). Fora dos botões de status não há como abrir o atendimento. Item não checado.
- §7.2 Objetivo declarado ("enxergar horários LIVRES, ocupados e pendentes") — a agenda nunca consulta disponibilidade: a única RPC de slots livres do sistema (`get_public_availability`) é chamada só dentro do painel de novo agendamento (src/modules/appointments/actions.ts:132) e do reschedule-sheet; a página da agenda não sabe o que está livre. O relatório trata isso apenas como consequência da grade ausente, mas é um requisito de objetivo próprio.
- Cabeçalho §7.2.1 — o auditor graduou "data" e "setas", mas nunca classificou explicitamente o botão "Novo agendamento" do cabeçalho, que EXISTE (src/app/(dashboard)/agenda/page.tsx:210-226 e src/components/dashboard/manual-appointment-sheet.tsx:183-187). Faltou registrar o único item ATENDIDO do cabeçalho — e a ressalva de que para o papel `professional` o cabeçalho cai no fallback que joga o usuário para a página PÚBLICA (:220-224), porque `canSeeAllAgendas` (:56-59) exclui esse papel.
- §5.4 aplicado aos demais indicadores — a mesma falha de "sem período, sem comparação" atinge "Atendimentos hoje", "A receber", "Concluídos hoje" e "Próximo horário" (render único em src/app/(dashboard)/dashboard/page.tsx:443-462), então nenhum dos indicadores do Início está no padrão do guia, não só os de dinheiro.
- Contagem "Atendimentos hoje" inclui faltas: src/app/(dashboard)/dashboard/page.tsx:319 filtra apenas `status !== "canceled"`, de modo que `no_show` entra no número de atendimentos do dia.

---

## Telas Clientes e Planos (§7.3, §7.4) + pilar G2

O motor de inteligência de clientes é real e bom: a RPC `get_client_insights` calcula mediana de intervalo entre visitas, retorno previsto com hierarquia documentada, confiança estatística, gasto total/médio, serviço e profissional habituais — o G2 "análise de frequência" NÃO é um campo de último atendimento maquiado. O que falta é a camada de tela: a página de Clientes não tem os três indicadores pedidos, não tem botão "Novo cliente" no cabeçalho, não mostra situação de plano e — o gap mais grave — NÃO EXISTE perfil individual do cliente: não há rota `/clientes/[id]`, nem sheet de perfil, nem histórico navegável, nem aba de observações (o campo `notes` é gravado e nunca exibido de volta). O cadastro está num card permanentemente aberto (exatamente o que o guia proíbe) e não há sequer edição de cliente pela UI, embora a server action suporte. Planos existe como módulo funcional (venda, uso, renovação, cobrança), mas vive como item de menu em "Serviços e produtos", desligado de Clientes, sem contagem de assinantes nem receita por plano, e a semântica de cor está invertida: "Em dia" pinta âmbar (--primary) e o estado "Vence em breve" amarelo simplesmente não existe no modelo de dados. Faltam também os segmentos "Assinantes" e "Inadimplentes", que a RPC rejeita explicitamente.

### Atendido (5)

- **§7.3.3 Busca "Buscar por nome ou WhatsApp" — funcionando por telefone**
  - Evidência: src/app/(dashboard)/clientes/page.tsx:217-233 (form GET com campo `q`); a busca por telefone é real: supabase/migrations/202607240026_fase3_inteligencia_clientes.sql:112 normaliza a entrada (regexp_replace \\D) e 197-200 compara com `c.phone_normalized like '%'||v_phone_search||'%'` em OU com o nome.
  - O que falta: Só cosmético: o placeholder é "Nome ou telefone…" (page.tsx:225) e não "Buscar por nome ou WhatsApp"; e há piso de 4 dígitos (migration:199) — buscar "99" não casa telefone.
- **G2 — "Profissional preferido"**
  - Evidência: supabase/migrations/202607240026_fase3_inteligencia_clientes.sql:228-232 (subselect que ordena profissionais por count(*) de atendimentos concluídos) exibido em src/app/(dashboard)/clientes/page.tsx:299-309 ("Costuma fazer X com Y") e usado no texto de reativação (src/lib/whatsapp.ts, returnMessage → topProfessional).
- **G2 — "Frequência e intervalo habitual entre as visitas" (diferencial comercial central; verificar se é análise real ou só último atendimento)**
  - Evidência: É análise real, não um campo de data. supabase/migrations/202607240026_fase3_inteligencia_clientes.sql:115-135 usa lag() sobre visitas concluídas e percentile_cont(0.5) para a MEDIANA dos intervalos; 166-169 aplica clamp de 5–180 dias; 170-184 monta o retorno previsto por hierarquia (mediana com ≥3 visitas → services.return_days do último serviço → fallback 30 dias); 185-189 classifica confiança alta/baixa/sem_historico. Cancelamento e falta não contam (filtro status='completed', linha 124). Exibido em src/app/(dashboard)/clientes/page.tsx:275-277 ("a cada ~Nd"), 288-298 (retorno previsto) e 253-258 (badge com ressalva "· poucas visitas" quando a confiança é baixa). Testes em supabase/tests/fase3_clientes.sql.
  - O que falta: Único reparo: essa inteligência só aparece na listagem — não há tela que a explique ao dono (ex.: aba Resumo do perfil ou relatório de frequência; `grep -n "cliente|frequ|retorno" -i src/app/(dashboard)/relatorios/page.tsx` retorna zero).
- **G2 — "Lista de clientes próximos de voltar ou há muito tempo sem comparecer"**
  - Evidência: supabase/migrations/202607240026_fase3_inteligencia_clientes.sql:202-217 (segmentos proximos = retorno nos próximos 7 dias; atrasados; para_chamar com carência de 14 dias e exclusão de opt-out; sem_voltar_60 = days_since ≥ 60) e 237-241 (ordenação por urgência). Chips em src/app/(dashboard)/clientes/page.tsx:26-49/175-194 e entrada pelo dashboard em src/app/(dashboard)/dashboard/page.tsx:197-203.
- **G2 — "Mensagem simples para reativação pelo WhatsApp"**
  - Evidência: src/lib/whatsapp.ts, returnMessage() monta o texto com primeiro nome, serviço habitual, profissional habitual e termo da vertical (barbearia/salão); href gerado em src/app/(dashboard)/clientes/page.tsx:137-145; o clique abre o wa.me e registra o contato em src/components/dashboard/client-contact-actions.tsx:40-46 → logClientContact (src/modules/clients/actions.ts:192-207), com marcação de resultado (setContactOutcome, 210-244) e opt-out automático em "não quer contato" (234-241).

### Parcial (8)

- **§7.3.1 Cabeçalho com "Clientes" e botão "Novo cliente" (também listado no §5 do guia, linha 58)**
  - Evidência: src/app/(dashboard)/clientes/page.tsx:168-172 — <PageHeader eyebrow="Relacionamento" title="Clientes" description=... /> sem a prop `action`. O PageHeader suporta `action` (src/components/layout/page-header.tsx:1-10, usado em planos/page.tsx:138-155), logo a omissão é da página.
  - O que falta: Adicionar `action={<ClientSheet />}` no PageHeader com o botão "Novo cliente" abrindo o painel lateral.
  - Impacto: MEDIO · Esforço: P
- **§7.3.4 Filtros rápidos: Todos, Para chamar, Assinantes, Inadimplentes, Sem voltar há 60 dias**
  - Evidência: src/app/(dashboard)/clientes/page.tsx:26-49 define 6 segmentos: todos, para_chamar, proximos ("Próximos do retorno"), atrasados ("Em atraso"), sem_voltar_60, arquivados. Não há "Assinantes" nem "Inadimplentes" — e a RPC rejeita qualquer outro valor: supabase/migrations/202607240026_fase3_inteligencia_clientes.sql:107-110 (`if p_segment not in (...) raise INVALID_SEGMENT`). Busca `grep -rn "Assinantes|inadimplen" src/ -i` só acha ocorrências em /servicos, /admin e páginas legais — nada em clientes.
  - O que falta: Adicionar 2 segmentos à RPC (join com customer_memberships: 'assinantes' = contrato status active; 'inadimplentes' = effective_status past_due) e 2 chips na página. Os segmentos extras "Próximos do retorno" e "Em atraso" são bônus além do guia, não substituem os que faltam.
  - Impacto: ALTO · Esforço: M
- **§7.3.5 Lista com nome, WhatsApp, último atendimento, dias sem vir, gasto médio, profissional habitual, situação do plano, botão WhatsApp**
  - Evidência: Presentes: nome (page.tsx:247), telefone/e-mail (248-251), último atendimento + dias sem vir (262-269), gasto total e médio (279-287), profissional habitual (299-309, via top_professional da RPC linhas 228-232), botão WhatsApp (331-337 → ClientContactActions). AUSENTE: situação do plano — `grep -rn "membership|assinat|plano" -i src/app/(dashboard)/clientes/page.tsx` retorna zero ocorrências; a página não consulta customer_memberships em nenhum dos seus fetches.
  - O que falta: Trazer a situação do plano por cliente (Ativo/Vence em breve/Vencido/Sem plano) para cada linha — exige incluir o join no get_client_insights ou um segundo fetch agregado.
  - Impacto: ALTO · Esforço: M
- **§7.4 Lista de planos: nome, valor, serviços incluídos, limite, quantidade de assinantes, receita mensal, situação**
  - Evidência: src/app/(dashboard)/planos/page.tsx:264-351 — tabela "Catálogo de planos" com nome+descrição (283-288), preço + periodicidade (289-295), serviços incluídos com limite "N×" (296-309) e situação À venda/Desativado (310-314). AUSENTES: quantidade de assinantes e receita mensal por plano — não são calculados nem no fetch (planos/page.tsx:66-71 seleciona só id,name,description,price,period,active) nem na RPC get_membership_overview (supabase/migrations/202607240029_fase4b_planos_clientes.sql:508-583, que retorna contratos individuais, não agregados por plano).
  - O que falta: Agregar por plano: count de customer_memberships ativos e soma de price (normalizada para valor mensal quando o período for trimestral/anual — PERIOD_LABELS em planos/page.tsx:25-29 já prevê os três).
  - Impacto: MEDIO · Esforço: M
- **§7.4 Lista de assinantes: cliente, plano, vencimento, pagamento, serviços usados, serviços restantes, extras, botão "Cobrar no WhatsApp"/"Renovar plano"**
  - Evidência: src/app/(dashboard)/planos/page.tsx:158-262 — cliente+telefone (177-182), plano+preço+período (183-189), vencimento "até dd/mm" (199-201), serviços usados no formato used/limit (221-238), "Cobrar no WhatsApp" para vencidos (203-219, texto de src/lib/whatsapp.ts membershipChargeMessage) e "Renovar" (240-245 → src/components/dashboard/membership-actions.tsx:53-102, com forma de pagamento). AUSENTES: (a) coluna de PAGAMENTO — a tabela membership_payments existe (docs/entregas/fase-4b.md, migration 0029) mas get_membership_overview não devolve forma nem data do último pagamento (retorno declarado em 202607240029:509-523); (b) serviços RESTANTES não são explicitados (só "2/4", o usuário calcula de cabeça); (c) EXTRAS (serviços consumidos fora do plano, cobrados à parte) não aparecem — `grep -rn "extra" -i src/app/(dashboard)/planos/page.tsx` retorna zero.
  - O que falta: Estender a RPC com último pagamento (método + data) e contagem de atendimentos do período não cobertos pelo plano; exibir "restam N" ao lado do usado.
  - Impacto: MEDIO · Esforço: M
- **§7.4 Cores de situação com texto junto: Ativo verde, Vence em breve amarelo, Vencido vermelho, Pausado cinza**
  - Evidência: Texto sempre acompanha a cor (src/app/(dashboard)/planos/page.tsx:192-198: "Vencido"/"Pausado"/"Em dia") — esse ponto está correto. Mas a paleta diverge em dois pontos: (1) "Em dia" usa <Badge> sem variant → default = `bg-primary` (src/components/ui/badge.tsx:12) e --primary é âmbar/dourado (src/app/globals.css:62 `oklch(0.63 0.12 72)`, dark: linha 105 `#f2b84b`), não verde — apesar de existir o token --success (globals.css:88 `#047857`); (2) o estado "Vence em breve" (amarelo) NÃO EXISTE no modelo: get_membership_overview só deriva active/paused/past_due (supabase/migrations/202607240029_fase4b_planos_clientes.sql:548-551, `case when status='active' and current_period_end < now() then 'past_due' else status end`). Efeito colateral: hoje o amarelo significa "ativo", o oposto do que o guia estabelece.
  - O que falta: Trocar o badge de "Em dia" para o token --success e derivar um quarto estado 'due_soon' (ex.: current_period_end dentro de 7 dias) pintado com --warning.
  - Impacto: MEDIO · Esforço: P
- **G2 — "Histórico de serviços" por cliente**
  - Evidência: Existe o agregado: contagem de atendimentos concluídos (page.tsx:270-278) e serviço habitual (top_service, RPC 224-227 → page.tsx:299-309). Não existe lista navegável de atendimentos do cliente: sem rota de perfil (ver item do perfil) e a agenda não aceita filtro por cliente (src/app/(dashboard)/agenda/page.tsx só tem busca de cliente para criar agendamento, linhas 283-284).
  - O que falta: Aba Histórico no perfil do cliente com os atendimentos (data, serviço, profissional, valor, situação).
  - Impacto: ALTO · Esforço: M
- **G2 — "Controle de planos, assinantes, serviços utilizados e data de renovação" integrado à gestão de clientes**
  - Evidência: O controle existe e é sólido em /planos (src/app/(dashboard)/planos/page.tsx:158-262 + RPCs sell/renew/set_status/overview em supabase/migrations/202607240029_fase4b_planos_clientes.sql), mas está desconectado de Clientes: nenhuma referência a plano/assinatura em src/app/(dashboard)/clientes/page.tsx (grep por "membership|assinat|plano" = 0) e nenhum link Clientes→Planos no menu (dashboard-shell.tsx:97-114 coloca Planos em "Serviços e produtos"). Na prática, ao olhar um cliente o dono não descobre se ele é assinante.
  - O que falta: Integrar: coluna/etiqueta de plano na lista de clientes, aba Plano no perfil e reposicionamento de /planos dentro de Clientes.
  - Impacto: ALTO · Esforço: M

### Não atendido (5)

- **§7.3.2 Três indicadores: Clientes ativos, Clientes para chamar, Planos vencendo**
  - Evidência: Nenhum card de indicador em src/app/(dashboard)/clientes/page.tsx (arquivo lido por completo, 407 linhas — o único número exibido é a contagem do segmento em page.tsx:213-215). Busca `grep -rn "Planos vencendo|Clientes ativos" src/` retorna zero. "Clientes para chamar" existe apenas no dashboard (src/app/(dashboard)/dashboard/page.tsx:199-203, via RPC count_clients_to_call).
  - O que falta: Criar três indicadores no topo de /clientes. "Clientes ativos" e "Clientes para chamar" já têm fonte de dados pronta (count_clients_to_call em supabase/migrations/202607240026_fase3_inteligencia_clientes.sql:252-266); "Planos vencendo" exige nova contagem sobre customer_memberships (current_period_end nos próximos N dias).
  - Impacto: MEDIO · Esforço: M
- **§7.3 Perfil do cliente: página/rota individual com abas Resumo / Histórico / Plano / Valores / Observações e cabeçalho com gasto total, gasto médio, próximo retorno, profissional habitual, "Chamar no WhatsApp" e "Novo agendamento"**
  - Evidência: Não existe rota: `find /home/user/barbearia-saas/src/app -path "*clientes*"` retorna somente src/app/(dashboard)/clientes/page.tsx (nenhum diretório [id]); `grep -rn "clientes/\[" src/` e `grep -rn "clients/\[" src/` retornam vazio. Não existe sheet de perfil: `ls src/components/dashboard/` mostra professional-profile-sheet.tsx (profissionais) mas nenhum equivalente de cliente. Sem aba Observações: o campo `notes` é gravado (src/modules/clients/actions.ts:36 e src/components/dashboard/client-form.tsx:52-55) e nunca lido/exibido em lugar algum da UI. Sem histórico navegável de atendimentos por cliente (a agenda não filtra por cliente: src/app/(dashboard)/agenda/page.tsx não tem parâmetro de cliente). O próprio relatório docs/entregas/fase-3.md:61-63 admite: "Perfil completo do cliente (histórico navegável de agendamentos e pagamentos em página própria) fica para a Fase 4" — e não entrou na Fase 4 nem na 4B (docs/entregas/fase-4b.md não menciona perfil de cliente).
  - O que falta: Construir /clientes/[id] com as 5 abas. Boa parte dos dados do cabeçalho já é calculada pela RPC (total_spent, avg_ticket, expected_return_at, top_professional em 202607240026:218-233) e bastaria uma variante por id; falta o histórico de agendamentos/pagamentos, o vínculo do plano e a exibição das observações, além dos botões "Chamar no WhatsApp" e "Novo agendamento" pré-preenchido.
  - Impacto: ALTO · Esforço: G
- **§7.3 Cadastro em PAINEL LATERAL — "O formulário não deve ficar aberto permanentemente"**
  - Evidência: src/app/(dashboard)/clientes/page.tsx:196-206 — grid `xl:grid-cols-[360px_1fr]` com um <Card> "Novo cliente" permanentemente aberto ocupando 360px fixos ao lado da lista; dentro dele <ClientForm /> (linha 204). O ClientForm não usa Sheet (src/components/dashboard/client-form.tsx:1-61, é um <form> puro), ao contrário do padrão já adotado no projeto em membership-plan-sheet, sell-membership-sheet, product-form-sheet, service-form-sheet.
  - O que falta: Converter para Sheet acionado pelo botão do cabeçalho, liberando a largura inteira para a lista.
  - Impacto: MEDIO · Esforço: P
- **§7.3 Cadastro — edição de cliente existente (implícito no formulário com nome/WhatsApp/e-mail/observação)**
  - Evidência: `grep -rn "<ClientForm" src/` retorna uma única ocorrência: src/app/(dashboard)/clientes/page.tsx:204, sem props. O componente não aceita nenhuma prop (src/components/dashboard/client-form.tsx:19) e não emite o campo `id`, apesar de saveClient aceitá-lo e fazer UPDATE quando presente (src/modules/clients/actions.ts:16, 38-44) e de clientSchema declarar `id: uuid.optional()` (src/lib/validators/entities.ts:34). Resultado: um telefone digitado errado não pode ser corrigido pela interface.
  - O que falta: Passar um cliente opcional ao ClientForm e expor um botão "Editar" em cada linha da lista (e depois no perfil).
  - Impacto: ALTO · Esforço: P
- **§7.4 "Esta área deve ficar dentro de Clientes, não como item de menu separado"**
  - Evidência: src/components/layout/dashboard-shell.tsx:97-114 — /planos é item do grupo "Serviços e produtos", rotulado "Planos de clientes" (linhas 101-106), ao lado de Serviços e Produtos; o grupo de clientes fica em outro bloco de navegação. Nenhum link cruzado: `grep -rn "planos" src/app/(dashboard)/clientes/page.tsx` retorna zero.
  - O que falta: Mover /planos para dentro da área de Clientes (aba ou subnavegação em /clientes) ou, no mínimo, reagrupar no menu e criar link recíproco Clientes ↔ Planos.
  - Impacto: MEDIO · Esforço: M

### Apontado pelo verificador (não coberto na primeira passada)

- Correção do "gasto" para assinantes (ver correções): o auditor abre o resumo afirmando que "o motor de inteligência de clientes é real e bom" sem testar se os agregados financeiros sobrevivem à Fase 4B — não sobrevivem.
- /clientes NÃO checa permissão e engole erro da RPC: src/app/(dashboard)/clientes/page.tsx:100 só chama `requireTenant()` (compare com src/app/(dashboard)/planos/page.tsx:53, que faz `can(tenant.role, "clients:manage")` + redirect) e :123 faz `const rows = (error ? [] : (insightData ?? []))` — qualquer NOT_AUTHORIZED da RPC (supabase/migrations/202607240026_fase3_inteligencia_clientes.sql:101-106) ou falha de rede vira a tela "Nenhum cliente cadastrado" com o formulário de cadastro aberto, sem estado de erro.
- Promessa de fase quebrada e não citada: docs/entregas/fase-3.md:20-22 diz textualmente "Assinantes/Inadimplentes entram na Fase 4 junto com os planos de clientes" — a Fase 4B entregou planos (docs/entregas/fase-4b.md) e nunca voltou para criar os segmentos. É evidência mais forte do que "a RPC rejeita o valor".
- Vocabulário WhatsApp exigido pelo guia (GUIA_VISUAL.md:546, 555, 575, 589): a UI fala "telefone" — src/components/dashboard/client-form.tsx:44 (`<Label htmlFor="phone">Telefone</Label>`) e src/app/(dashboard)/clientes/page.tsx:225-226 (placeholder "Nome ou telefone…", aria-label "Buscar cliente por nome ou telefone"). O auditor tratou só o placeholder da busca como cosmético e não verificou o formulário.
- Lista de assinantes sem busca, filtro ou paginação: src/app/(dashboard)/planos/page.tsx:158-262 renderiza tudo que a RPC devolver e a RPC corta em `limit 500` (supabase/migrations/202607240029_fase4b_planos_clientes.sql:581) — a partir do 501º contrato a tela some com assinantes silenciosamente, sem aviso e sem "próxima página". Nenhum requisito de §7.4 sobre operar a lista foi avaliado.
- "Planos vencendo" também não existe como alerta no dashboard: src/app/(dashboard)/dashboard/page.tsx:197-215 lista apenas Clientes para chamar, Reservas aguardando confirmação e Contas vencidas, embora get_membership_overview já ordene os vencidos primeiro (supabase/migrations/202607240029_fase4b_planos_clientes.sql:576-580). O auditor limitou o gap a /clientes.
- Crédito não dado (subestima a nota): "serviços utilizados" do G2 é automático, não manual — o gatilho de conclusão consome o benefício do plano e grava membership_usage sem intervenção da recepção (supabase/migrations/202607240029_fase4b_planos_clientes.sql:602-637), e desfazer a conclusão devolve o uso (:656-658). Isso é diferencial comercial real e ficou fora do relatório.
- Bloqueio prático da tela de clientes não avaliado: com o cadastro fixo em `xl:grid-cols-[360px_1fr]` (src/app/(dashboard)/clientes/page.tsx:196) e sem perfil, o único caminho para ver algo de um cliente é a linha da lista — não há nem link do nome (page.tsx:247 é um `<p>`, não um `<Link>`). O auditor apontou a ausência da rota, mas não que a lista sequer prevê navegação para o cliente.

---

## Tela Financeiro (§7.5) + pilar G3

O Financeiro do NexoBarber tem um núcleo contábil sólido e uma casca de interface muito distante do §7.5. A "verdade financeira" pedida pelo G3 existe de fato no banco: a RPC `income_summary` separa vendido (competência, por `created_at`) de recebido (caixa, por `paid_at`), e o lucro é calculado como recebido − despesas pagas — é o melhor item da dimensão. Mas a navegação interna em 6 abas não existe: o que há é um grupo de 5 rotas no menu lateral, e "Resumo" e "Caixa e vendas" estão fundidos numa única página de 904 linhas sem nenhuma segmentação. Não existe filtro de período em lugar nenhum do Financeiro — a tela é fixa no mês corrente, sem sequer o `?mes=` que Comissões e o PDF já aceitam. O gráfico principal é um SVG próprio bem feito, porém das séries erradas (serviços × produtos empilhados, azul/verde) em vez de recebido em verde × despesas em coral × período anterior tracejado, e sem tooltip. Faltam por inteiro: "Nova venda"/carrinho com desconto e acréscimo (busca por "Nova venda|carrinho|PDV|desconto|acréscimo" em todo `src` retorna zero), o conceito de adiantamento em Comissões, clientes que mais gastam, mapa de calor de dias/horários, "Cobrar no WhatsApp" no A receber, os campos de "Adicionar detalhes" das despesas e a exportação em planilha. O lucro também não desconta a comissão devida — só o que já foi pago manualmente ao profissional, o que superestima o lucro enquanto o dono não registra o pagamento; isso ataca diretamente a promessa de marketing "Faturamento é o que entra. Lucro é o que fica."

### Atendido (6)

- **§7.5 Gráfico: SVG próprio com legenda**
  - Evidência: src/components/dashboard/monthly-revenue-chart.tsx:58-127 — SVG escrito à mão, server-side, com viewBox responsivo, `role="img"` e `aria-label` (linhas 61-62); legenda com quadradinhos de cor em src/components/dashboard/monthly-revenue-chart.tsx:42-57; rótulos diretos sobre as barras (linhas 104-114); tokens de cor duplicados para tema claro/escuro via `prefers-color-scheme` e `:root[data-theme]` (linhas 36-40); estado vazio explícito nas linhas 128-133.
- **§7.5 Segunda linha: vendas por profissional em barras**
  - Evidência: src/app/(dashboard)/financeiro/page.tsx:553-569 — card "Profissionais por vendas" com `<BarList>` (barras horizontais). Complementado pela tabela detalhada "Vendas por profissional" em src/app/(dashboard)/financeiro/page.tsx:573-652, com versão em cartões para celular (linhas 581-602, `sm:hidden`) conforme §10 "tabelas viram cartões".
- **§7.5 Rodapé: serviços mais vendidos**
  - Evidência: src/app/(dashboard)/financeiro/page.tsx:519-535 — card "Serviços mais vendidos" com `<BarList>` (top 5, valor + contagem de vezes). Agregação em src/app/(dashboard)/financeiro/page.tsx:247-257 e ordenação em 294-296. Há ainda a tabela completa "Vendas por serviço" em src/app/(dashboard)/financeiro/page.tsx:654-688.
- **§7.5 Despesas: primeira linha pedindo só descrição, valor e vencimento**
  - Evidência: src/components/dashboard/bill-form.tsx:40-66 — o formulário pede exatamente três campos: `description` (linhas 40-49), `amount` e `dueDate` lado a lado (linhas 50-66). Validação equivalente no servidor em src/modules/bills/actions.ts:10-14. Isso cumpre o §2.4 ("dados essenciais antes dos detalhes") — o formulário NÃO pede tudo de uma vez.
- **§7.5 Comissões: comissão calculada**
  - Evidência: src/app/(dashboard)/comissoes/page.tsx:143-157 — regra de precedência única e documentada: taxa do SERVIÇO quando maior que zero, senão taxa padrão do PROFISSIONAL (`defaultRateByPro`, linhas 131-136); base = atendimentos com `status="completed"` no período (consulta linhas 92-99), ou seja competência. A comissão é derivada, não persistida, então estorno recalcula sozinho (comentário em comissoes/page.tsx:138-142; migration supabase/migrations/202607240027_fase4_financeiro_gerencial.sql:7-11). Total no card "Comissões calculadas no mês" (comissoes/page.tsx:200-212).
- **VERDADE FINANCEIRA (G3): o sistema distingue Total vendido (competência) de Dinheiro recebido (caixa)**
  - Evidência: supabase/migrations/202607240027_fase4_financeiro_gerencial.sql:32-60 — a RPC `income_summary` calcula: `sold` = soma de receitas não canceladas por `created_at` na janela (linhas 34-39, competência); `received` = soma de receitas com `status='paid'` por `paid_at` na janela (linhas 40-45, caixa); `receivable` = estoque de pendentes/vencidas independente da janela (linhas 46-50). Consumo em src/app/(dashboard)/financeiro/page.tsx:171-175 e 195-200. A regra é explicada ao usuário no subtítulo da página (src/app/(dashboard)/financeiro/page.tsx:369): "atendimento concluído vira venda a receber; o dinheiro só conta como recebido com a forma de pagamento". Há teste SQL: supabase/tests/fase4_financeiro.sql.

### Parcial (14)

- **§7.5 Resumo: quatro indicadores — Total vendido, Dinheiro recebido, Despesas, Lucro do período**
  - Evidência: src/app/(dashboard)/financeiro/page.tsx:304-343 — array `summary` com SEIS cards: "Vendido no mês", "Recebido no mês", "A receber", "Despesas pagas no mês", "Lucro do mês (caixa)" e "Atendimentos concluídos". Renderizados em src/app/(dashboard)/financeiro/page.tsx:403-441 (grid sm:grid-cols-2 xl:grid-cols-3).
  - O que falta: Os 4 indicadores pedidos existem em substância, mas com 6 cards e rótulos diferentes do guia ("Vendido no mês" vs "Total vendido"; "Recebido no mês" vs "Dinheiro recebido"; "Lucro do mês (caixa)" vs "Lucro do período" — e "(caixa)" é jargão que o §2.3 manda evitar). Reduzir para os 4 do guia, renomear, e mover "A receber" e "Atendimentos concluídos" para uma segunda faixa. Como o período é fixo, o sufixo "no mês" também precisa virar "no período".
  - Impacto: MEDIO · Esforço: P
- **§7.5 Segunda linha: formas de pagamento no Resumo do Financeiro**
  - Evidência: O detalhamento existe, mas em OUTRA rota: src/app/(dashboard)/relatorios/page.tsx:147-181 (card "Recebimentos por forma de pagamento" com barras de proporção). Em src/app/(dashboard)/financeiro/page.tsx nenhuma das 7 consultas (linhas 119-193) seleciona `payment_method` — grep por "payment_method" no arquivo retorna zero.
  - O que falta: Trazer o bloco de formas de pagamento para a segunda linha do Resumo, respeitando o filtro de período. O agregado de /relatorios hoje é all-time (relatorios/page.tsx:54-59 busca todas as transações pagas sem recorte), então não dá para reaproveitar sem parametrizar.
  - Impacto: MEDIO · Esforço: P
- **§7.5 Segunda linha: contas vencidas no Resumo do Financeiro**
  - Evidência: Existe fora do Financeiro: src/app/(dashboard)/dashboard/page.tsx:188-194 conta `accounts_payable` pendentes com `due_date` menor que hoje, exibida como item de ação "Contas vencidas" em src/app/(dashboard)/dashboard/page.tsx:210-215; e src/components/dashboard/bills-view.tsx:62-75 mostra o card "Vencido" dentro de /contas-a-pagar. grep por "accounts_payable" em src retorna 4 ocorrências (bills/actions.ts:23,30; contas-a-pagar/page.tsx:36; dashboard/page.tsx:190) — nenhuma em financeiro/page.tsx.
  - O que falta: Adicionar ao Resumo do Financeiro um card de contas vencidas (valor + quantidade + link para Despesas), consultando accounts_payable pendentes com vencimento passado.
  - Impacto: MEDIO · Esforço: P
- **§7.5 Caixa e vendas: lista de atendimentos a finalizar**
  - Evidência: src/app/(dashboard)/financeiro/page.tsx:730-901 — card "Atendimentos de hoje". A consulta (src/app/(dashboard)/financeiro/page.tsx:128-137) traz TODOS os agendamentos do dia com `.neq("status","canceled")` — inclui pendentes, confirmados e já concluídos/pagos, sem separar o que falta finalizar. A ação de concluir o atendimento não está aqui: fica em src/components/dashboard/appointment-actions.tsx:37 ("Concluir"), na Agenda.
  - O que falta: Filtrar/ordenar por "a finalizar" (concluídos sem recebimento + em andamento) e expor a conclusão do atendimento na própria aba de Caixa, para o fluxo terminar num lugar só, como pede o G3 ("fluxo conectado").
  - Impacto: MEDIO · Esforço: M
- **§7.5 Caixa e vendas: botão "Receber pagamento"**
  - Evidência: A ação existe com outros rótulos: "Confirmar pagamento" em src/app/(dashboard)/financeiro/page.tsx:884 (desktop), "Confirmar" em src/app/(dashboard)/financeiro/page.tsx:802 (celular) e "Receber" no card A receber em src/app/(dashboard)/financeiro/page.tsx:489. grep por "Receber pagamento" em src retorna ZERO. Servidor: src/modules/financial/actions.ts:29-91 (`confirmPayment`, idempotente) e :122-143 (`confirmTransactionPayment`).
  - O que falta: Unificar o rótulo em "Receber pagamento" nos três pontos. Vale lembrar que §2.2 define a ação principal do Financeiro como "Nova movimentação" e hoje a tela não tem NENHUM botão primário: os 3 botões do cabeçalho (src/app/(dashboard)/financeiro/page.tsx:378-398) são todos `variant="outline"`.
  - Impacto: MEDIO · Esforço: P
- **§7.5 A receber: vencimento e situação**
  - Evidência: Em /contas-a-receber funciona: src/components/dashboard/bills-view.tsx:99-104 exibe "Vence em <data>" e :106-110 mostra o badge "Vencida" (cor + texto, como manda o guia). Já o card "A receber" dentro do Financeiro NÃO tem nem um nem outro: src/app/(dashboard)/financeiro/page.tsx:463-467 mostra "Produto/Serviço · vendido em <created_at>" — data de venda, não vencimento — e não há badge de situação, embora a consulta (linha 182) inclua status "overdue".
  - O que falta: Exibir vencimento (`due_at`) e badge de situação também no card do Financeiro, e unificar as duas listas de recebíveis (transações pendentes + accounts_receivable) numa aba "A receber" única — hoje o dono precisa olhar dois lugares diferentes para saber quanto tem a receber.
  - Impacto: ALTO · Esforço: M
- **§7.5 A receber: botão "Registrar pagamento"**
  - Evidência: A ação existe nos dois lugares, com rótulos divergentes do guia: "Receber" em src/app/(dashboard)/financeiro/page.tsx:489 e em src/components/dashboard/bills-view.tsx:139 (via `settleLabel="Receber"` passado em src/app/(dashboard)/contas-a-receber/page.tsx:56). Ambos exigem forma de pagamento antes de baixar (select em src/app/(dashboard)/financeiro/page.tsx:477-488 e src/components/dashboard/bills-view.tsx:120-133; regra reforçada no servidor em src/modules/bills/actions.ts:87-88).
  - O que falta: Padronizar o rótulo em "Registrar pagamento". Ponto positivo já entregue: nenhum recebimento entra sem forma de pagamento.
  - Impacto: BAIXO · Esforço: P
- **§7.5 Comissões: filtro de período**
  - Evidência: src/app/(dashboard)/comissoes/page.tsx:49-53 aceita `searchParams: {mes?}` e :186-195 renderiza navegação "← Anterior / <mês> / Próximo →". O recorte é sempre o mês inteiro — src/lib/dates/index.ts:139-149 só interpreta "YYYY-MM".
  - O que falta: Permitir intervalo livre (o guia pede "período"), e sobretudo quinzena/semana, já que o próprio sistema oferece períodos de pagamento semanal e quinzenal em src/components/dashboard/employee-pay-card.tsx:88-97 — hoje um profissional configurado como "quinzenal" não tem como fechar a quinzena na tela.
  - Impacto: ALTO · Esforço: M
- **§7.5 Comissões: valor a pagar**
  - Evidência: src/components/dashboard/employee-pay-card.tsx:183-185 — o campo Valor vem pré-preenchido com `monthCommission.toFixed(2)`, ou seja a comissão bruta do mês. Não desconta adiantamentos (inexistentes) nem o que já foi pago no mês, que é calculado e exibido logo acima em src/app/(dashboard)/comissoes/page.tsx:160-166 / src/components/dashboard/employee-pay-card.tsx:59-64 ("Pago no mês"). Também não soma o salário fixo quando o modelo é `fixed` ou `hybrid` (opções em src/components/dashboard/employee-pay-card.tsx:81-83).
  - O que falta: Calcular o valor a pagar como (salário base quando aplicável + comissão) − adiantamentos − já pago no período, e exibir esse número como campo próprio, não só como default de um input editável. Hoje pagar duas vezes no mesmo mês é fácil: o campo sempre sugere o valor cheio.
  - Impacto: ALTO · Esforço: M
- **§7.5 Comissões: botão "Marcar como pago"**
  - Evidência: O botão é "Registrar pagamento" — src/components/dashboard/employee-pay-card.tsx:207-209 (e o cabeçalho do formulário na linha 166). A ação grava em `employee_payments` e integra ao financeiro como despesa paga (src/modules/payroll/actions.ts:110-137). Observação de rótulo: o menu lateral chama a rota de "Comissões" (src/components/layout/dashboard-shell.tsx:86), mas o título da página é "Pagamento de Funcionários" (src/app/(dashboard)/comissoes/page.tsx:182) e o botão que leva até ela no Financeiro usa o mesmo nome comprido (src/app/(dashboard)/financeiro/page.tsx:381).
  - O que falta: Alinhar rótulo do botão ("Marcar como pago", que é um clique só) e o nome da tela — três nomes diferentes para a mesma coisa violam o §2.3 (palavras conhecidas e consistentes).
  - Impacto: MEDIO · Esforço: P
- **§7.5 Relatórios: exportação em PDF**
  - Evidência: Existe uma página de impressão dedicada e bem construída: src/app/(print)/relatorio-financeiro/page.tsx:250-386 (cabeçalho com logo, 6 indicadores, gráfico, 4 tabelas, observações finais, `@page A4` na linha 253). Mas não gera arquivo: src/components/dashboard/print-button.tsx:11-16 apenas dispara `window.print()` e conta com o usuário escolher "Salvar como PDF" no diálogo do navegador.
  - O que falta: Ou assumir o fluxo de impressão no texto do botão, ou gerar PDF de verdade no servidor. O relatório também só aceita `?mes=` (src/app/(print)/relatorio-financeiro/page.tsx:38-42) — não acompanha nenhum filtro de período livre, que também não existe.
  - Impacto: MEDIO · Esforço: M
- **VERDADE FINANCEIRA (G3): o lucro desconta despesas E comissões**
  - Evidência: supabase/migrations/202607240027_fase4_financeiro_gerencial.sql:58-59 — `select ... (s.received - s.expenses_paid) as profit`, onde `expenses_paid` (linhas 51-56) soma apenas transações `type='expense'` com `status='paid'` e `paid_at` na janela. A comissão só chega ao lucro se o dono registrar o pagamento manualmente: src/modules/payroll/actions.ts:126-137 insere uma despesa `category:"salary"` com `status:"paid"`. A comissão DEVIDA (calculada em src/app/(dashboard)/comissoes/page.tsx:143-157) nunca entra em `expenses_paid`. Idem despesas: só contam quando liquidadas (src/modules/bills/actions.ts:99-113), nunca por vencimento.
  - O que falta: O lucro fica superestimado enquanto o dono não paga a equipe: um mês com R$ 20 mil recebidos e R$ 8 mil de comissão devida ainda não paga mostra lucro cheio. Isso ataca a promessa de marketing do G3 ("Faturamento é o que entra. Lucro é o que fica"). Sugestão: exibir "Lucro do período" já com a comissão provisionada, ou pelo menos um segundo indicador "Comissão a pagar" ao lado do lucro. O rótulo atual ao menos é honesto ("Lucro do mês (caixa)" com a dica "Recebido − despesas pagas", src/app/(dashboard)/financeiro/page.tsx:332-335), mas "(caixa)" é jargão proibido pelo §2.3.
  - Impacto: ALTO · Esforço: M
- **G3: receitas de serviços, assinaturas e produtos no mesmo painel**
  - Evidência: Nos 4 indicadores, sim: a venda de plano cria receita paga com `category='membership'` (supabase/migrations/202607240029_fase4b_planos_clientes.sql:313-320), e `income_summary` soma toda receita sem filtrar categoria. Nos detalhamentos, não: em src/app/(dashboard)/financeiro/page.tsx:236-239 o laço faz `const appt = first(row.appointment); if (!appt) continue;` — receita de plano não tem agendamento e é DESCARTADA de todas as agregações por profissional e por serviço. No gráfico é pior: src/app/(dashboard)/financeiro/page.tsx:282-283 joga tudo que não é `category==='product'` no balde "Serviços", então assinatura aparece rotulada como serviço. Na página de impressão a receita sem agendamento vira `otherRevenue` (src/app/(print)/relatorio-financeiro/page.tsx:156-159) que entra no total mas não tem linha própria em nenhuma tabela.
  - O que falta: Adicionar uma faixa/linha "Assinaturas" nas agregações e no gráfico, e parar de classificar membership como serviço. Sem isso o dono vê o dinheiro no total mas não consegue explicar de onde veio.
  - Impacto: MEDIO · Esforço: M
- **G3: faturamento por dia, semana e mês, com comparação entre períodos**
  - Evidência: Comparação existe: src/app/(dashboard)/financeiro/page.tsx:204-218 busca `income_summary` do mês anterior e a função `compare()` produz o texto "+X% vs mês anterior", aplicado a Vendido, Recebido e Despesas (linhas 310, 316, 329). Recortes: dia e mês existem em src/app/(dashboard)/relatorios/page.tsx:96-110 ("Saldo do dia", "Saldo do mês", "Saldo total"); mês no Financeiro. Semana não existe em lugar nenhum — grep por "semana" em src/app/(dashboard)/financeiro, /relatorios e /comissoes retorna zero.
  - O que falta: Cair no mesmo bloqueio do filtro de período: sem seletor livre, dia/semana/mês não são escolhíveis. Além disso a comparação é só textual — o guia pede a série do período anterior tracejada no gráfico.
  - Impacto: MEDIO · Esforço: M

### Não atendido (16)

- **§7.5 Navegação interna: abas Resumo / Caixa e vendas / Despesas / A receber / Comissões / Relatórios dentro do Financeiro**
  - Evidência: src/components/layout/dashboard-shell.tsx:62-96 — grupo "Financeiro" do menu lateral com 5 rotas separadas (/financeiro "Resumo e caixa", /contas-a-pagar "Despesas", /contas-a-receber "A receber", /comissoes "Comissões", /relatorios "Relatórios"). Nenhuma das 5 páginas renderiza abas: grep por "TabsTrigger" em src/**/*.tsx retorna só src/components/dashboard/team-tabs.tsx:27,30 — o componente src/components/ui/tabs.tsx existe e é usado apenas na tela de Equipe.
  - O que falta: Criar navegação interna (abas ou segmented control) no topo do Financeiro com as 6 seções, separando "Resumo" de "Caixa e vendas" — hoje as duas estão fundidas numa página única de 904 linhas (src/app/(dashboard)/financeiro/page.tsx). O componente Tabs já existe e é reutilizável.
  - Impacto: ALTO · Esforço: G
- **§7.5 Resumo: filtro de período no topo (intervalo livre data inicial/final)**
  - Evidência: src/app/(dashboard)/financeiro/page.tsx:70 — `export default async function FinanceiroPage()` não recebe `searchParams`; linhas 90-96 chamam `getUtcDayRange(tenant.timezone)` e `getUtcMonthRange(tenant.timezone)` sem argumento de mês, travando a tela no mês corrente. grep por "searchParams" em financeiro/, relatorios/, contas-a-pagar/ e contas-a-receber/page.tsx retorna zero. src/lib/dates/index.ts:134-158 — `getUtcMonthRange` só aceita o formato "YYYY-MM": nem o helper suporta intervalo livre.
  - O que falta: Adicionar `searchParams` com data inicial/final (ou atalhos Hoje/Semana/Mês/Personalizado) e um helper `getUtcRange(from, to)`; propagar o período para income_summary, gráfico, agregações e para o PDF. Comissões (/comissoes?mes=) e /relatorio-financeiro?mes= já provam o padrão de searchParams — falta generalizar e trazer para o Resumo.
  - Impacto: ALTO · Esforço: M
- **§7.5 Resumo: gráfico principal com recebido em verde, despesas em coral e período anterior tracejado em cinza**
  - Evidência: src/components/dashboard/monthly-revenue-chart.tsx:20-141 — o gráfico é de barras empilhadas de Serviços × Produtos, cores `--svc:#2a78d6` (azul) e `--prd:#1baf7a` (verde) na linha 35. Não há série de despesas nem série de período anterior: o tipo `MonthlyRevenuePoint` (linhas 3-7) só tem `{label, service, product}`, e a alimentação em src/app/(dashboard)/financeiro/page.tsx:161-168 consulta apenas `type="income"`.
  - O que falta: Trocar as séries: recebido (verde), despesas (coral) e período anterior (linha tracejada cinza). Exige adicionar uma consulta de `type="expense"` agrupada por mês e uma consulta do período anterior deslocado; o SVG atual pode ser estendido, mas o tipo de dado e a query mudam.
  - Impacto: ALTO · Esforço: M
- **§7.5 Gráfico: tooltip / interação ao passar o mouse**
  - Evidência: src/components/dashboard/monthly-revenue-chart.tsx — arquivo inteiro é Server Component (sem "use client" no topo, linha 1 é um import); não há `<title>`, `onMouseOver`, `<Tooltip>` nem qualquer handler nos `<rect>` das linhas 84-103. grep por "Tooltip" no arquivo: nenhuma ocorrência.
  - O que falta: Adicionar `<title>` por barra (tooltip nativo do SVG, custo zero e sem virar client component) ou um wrapper client com tooltip real mostrando valor exato por mês.
  - Impacto: BAIXO · Esforço: P
- **§7.5 Rodapé: clientes que mais gastam**
  - Evidência: grep -rniE "mais gastam|top.?client|maiores client|total_spent|total gasto" em src retorna apenas src/app/(dashboard)/clientes/page.tsx:61 (campo `total_spent` do tipo) e :282 (célula da tabela de clientes) — é uma coluna da lista de clientes, não um ranking. Em src/app/(dashboard)/financeiro/page.tsx nenhuma consulta agrupa por cliente: as agregações são só `byProfessional`, `byService` e `byProduct` (linhas 220-222).
  - O que falta: Adicionar ao rodapé do Financeiro um top-5 de clientes por valor gasto no período (agrupar receitas pelo `appointments.client_id`, já disponível — a página de impressão em src/app/(print)/relatorio-financeiro/page.tsx:162 já coleta client_id, mas só para contar clientes distintos).
  - Impacto: MEDIO · Esforço: M
- **§7.5 Rodapé: dias e horários mais movimentados (mapa de calor)**
  - Evidência: grep -rniE "heatmap|mapa de calor|horários mais|dias mais|mais movimentad" em todo src retorna ZERO ocorrências. Nenhuma das consultas de src/app/(dashboard)/financeiro/page.tsx:119-193 agrupa por dia da semana ou faixa horária.
  - O que falta: Construir o mapa de calor (7 dias × faixas de hora) a partir de `appointments.starts_at` do período — provavelmente via RPC de agregação no banco, seguindo o padrão já usado em income_summary, para não trazer milhares de linhas ao servidor.
  - Impacto: MEDIO · Esforço: M
- **§7.5 Caixa e vendas: botão "Nova venda" + carrinho com serviços E produtos + desconto + acréscimo + cliente + resumo antes de concluir**
  - Evidência: grep -rn "Nova venda|Nova Venda|carrinho|Carrinho|PDV|Receber pagamento|desconto|Desconto|acréscimo|Acréscimo" em todo src retorna ZERO ocorrências. A única venda de produto existente é a confirmação de reserva feita no agendamento: src/modules/product-sales/actions.ts:25-52 (`confirmProductSale` sobre um `appointment_product` já existente), com UI em src/app/(dashboard)/produtos/page.tsx:195-243 ("Reservas de produtos pendentes"). Não há caminho para venda avulsa: `financial_transactions` só é inserida por src/modules/financial/actions.ts:77, src/modules/bills/actions.ts:100 e src/modules/payroll/actions.ts:126 — nenhuma delas é venda de balcão com carrinho.
  - O que falta: É a maior lacuna da dimensão e também do pilar G5. Falta a tela de venda: busca de produto/serviço, carrinho misto, desconto e acréscimo, cliente opcional, forma de pagamento e resumo de confirmação — mais uma tabela de itens da venda no banco (hoje `financial_transactions` é uma linha por receita, sem itens) e o desconto de estoque na mesma transação.
  - Impacto: ALTO · Esforço: G
- **§7.5 Despesas: seção "Adicionar detalhes" com categoria, fornecedor, repetir todo mês, data de pagamento, forma de pagamento, anexo e observação**
  - Evidência: src/components/dashboard/bill-form.tsx tem 74 linhas e termina no botão "Adicionar" (linhas 67-69): não existe disclosure de detalhes — grep por "Adicionar detalhes|Mais opções" no arquivo retorna zero. No banco, supabase/migrations/202607020001_core_schema.sql:316-331 mostra que `accounts_payable` só tem `supplier_id`, `transaction_id`, `description`, `amount`, `due_date` e `status`: não há coluna de categoria, recorrência, anexo nem observação. E o `supplier_id` existente nunca é usado — grep por "suppliers" em src retorna ZERO.
  - O que falta: Adicionar bloco recolhível "Adicionar detalhes" no bill-form e as colunas que faltam (categoria, recorrência mensal, anexo, observação), além de ligar o `supplier_id` já existente a um cadastro de fornecedores. Data e forma de pagamento hoje são implícitas na baixa (src/modules/bills/actions.ts:105-109 grava `paid_at: now()`), sem permitir informar data retroativa.
  - Impacto: ALTO · Esforço: G
- **§7.5 A receber: mostrar cliente/devedor**
  - Evidência: Os dois lugares que listam recebíveis não têm cliente. (a) src/app/(dashboard)/contas-a-receber/page.tsx:36-40 seleciona apenas `id,description,amount,due_date,status` — e src/components/dashboard/bill-form.tsx não tem campo de cliente; a coluna `accounts_receivable.client_id` existe em supabase/migrations/202607020001_core_schema.sql:336 e nunca é preenchida nem lida. (b) o card "A receber" em src/app/(dashboard)/financeiro/page.tsx:443-505 usa a consulta da linha 177-184, que traz só `id,description,amount,category,created_at` — o nome do cliente aparece apenas por acaso, embutido no texto da descrição gerada em src/modules/financial/actions.ts:82.
  - O que falta: Adicionar seletor de cliente no formulário de recebível (gravando client_id) e exibir o cliente como campo próprio na lista, não dentro da descrição.
  - Impacto: ALTO · Esforço: M
- **§7.5 A receber: valor inicial e valor restante (pagamento parcial)**
  - Evidência: Não existe pagamento parcial no modelo: supabase/migrations/202607020001_core_schema.sql:297-314 (`financial_transactions`) tem apenas `amount`, `status` e `paid_at` — nenhuma coluna de valor pago/saldo; idem `accounts_receivable` em supabase/migrations/202607020001_core_schema.sql:333-348. A baixa é sempre integral: src/modules/bills/actions.ts:115-119 faz `update({status:"paid"})` sem valor, e src/modules/financial/actions.ts:131-141 idem.
  - O que falta: Modelar recebimentos parciais (tabela de pagamentos por recebível ou colunas `paid_amount`/`remaining`), com a lista mostrando valor inicial × restante. Toca income_summary e todas as somas.
  - Impacto: MEDIO · Esforço: G
- **§7.5 A receber: botão "Cobrar no WhatsApp"**
  - Evidência: grep -rniE "whatsapp|wa\.me" em src lista 20 arquivos, nenhum deles do financeiro: os componentes de contato são src/components/dashboard/client-contact-actions.tsx (usado em /clientes) e src/components/dashboard/share-page-card.tsx. Nem src/app/(dashboard)/contas-a-receber/page.tsx, nem src/components/dashboard/bills-view.tsx, nem o card das linhas 443-505 de src/app/(dashboard)/financeiro/page.tsx importam qualquer coisa de WhatsApp.
  - O que falta: Reaproveitar o componente de contato de /clientes no A receber, com mensagem pré-preenchida (valor, vencimento, serviço). Depende de ter o cliente vinculado ao recebível, que também falta. O guia pede o mesmo botão em Planos (§7.4), onde ele já é citado — vale um componente único.
  - Impacto: ALTO · Esforço: M
- **§7.5 Comissões: total produzido por profissional**
  - Evidência: src/app/(dashboard)/comissoes/page.tsx:143-157 monta apenas `commissionByPro` (o valor da comissão); a consulta das linhas 92-99 traz `service:services(price,commission_rate)` mas o preço só é usado para multiplicar pela taxa (linha 152), nunca somado como produção. Nenhum card ou coluna da página mostra o total produzido — src/components/dashboard/employee-pay-card.tsx:167-172 exibe só "Comissão no mês". O total produzido existe, mas em outra tela: src/app/(dashboard)/financeiro/page.tsx:603-644 (tabela "Vendas por profissional").
  - O que falta: Somar `service.price` no mesmo laço e exibir "Total produzido" ao lado da comissão — é uma linha de código e o dado já está carregado. Sem isso o profissional não consegue conferir a própria comissão.
  - Impacto: ALTO · Esforço: P
- **§7.5 Comissões: adiantamentos**
  - Evidência: grep -rn "adiantamento|Adiantamento|advance|vale" em src e supabase retorna 10 ocorrências, TODAS irrelevantes (verbo "vale" em textos de UI, `vi.advanceTimersByTime` em teste, "Equivale a 10 mensalidades"). Não existe tabela, coluna nem campo de adiantamento: supabase/migrations/202607080008_employee_payments.sql cria `employee_payments` sem tipo de lançamento, e src/modules/payroll/actions.ts:21-26 (`paymentSchema`) aceita só professionalId, amount, reference e notes.
  - O que falta: Criar o conceito de adiantamento/vale (lançamento negativo por profissional dentro do período) e descontá-lo do valor a pagar. É uma prática universal em barbearia — sem ela o dono continua fazendo a conta no papel, exatamente a dor que o G4 promete resolver.
  - Impacto: ALTO · Esforço: M
- **§7.5 Comissões: coluna de situação**
  - Evidência: src/app/(dashboard)/comissoes/page.tsx não renderiza nenhum badge de situação por profissional: os cards (linhas 228-241) mostram só nome, "Pago no mês" e "Comissão no mês"; a tabela "Histórico do mês" (linhas 251-292) tem as colunas Profissional, Referência, Data e Valor. grep por "Badge" no arquivo retorna zero — o componente nem é importado (imports nas linhas 1-23).
  - O que falta: Derivar e exibir a situação (Pendente / Parcial / Pago) comparando valor a pagar × pagamentos do período, com cor + texto conforme §7.4 do guia.
  - Impacto: MEDIO · Esforço: P
- **§7.5 Relatórios: rótulo "Baixar relatório"**
  - Evidência: grep -rniE "Baixar relat" em src retorna ZERO. Os rótulos reais são "Gerar PDF" em src/app/(dashboard)/relatorios/page.tsx:122 e em src/app/(dashboard)/financeiro/page.tsx:396, e "Imprimir / Salvar PDF" em src/components/dashboard/print-button.tsx:24.
  - O que falta: Renomear para "Baixar relatório" e tirar o formato do centro da decisão (o guia é explícito), oferecendo o formato como escolha secundária.
  - Impacto: BAIXO · Esforço: P
- **§7.5 Relatórios: exportação em planilha**
  - Evidência: grep -rniE "\bcsv\b|text/csv|planilha|xlsx" em src e docs retorna 3 resultados: dois textos de marketing (src/app/page.tsx:239 e src/app/salao/page.tsx:51, "sem planilha") e docs/entregas/fase-4.md:58, que admite o débito: "exportação CSV configurável fica para a Fase 6". Conferido docs/entregas/fase-6.md: não entrega CSV (o documento trata de índices e performance). Nenhuma Route Handler de download existe — não há arquivo em src/app/api/ que devolva text/csv.
  - O que falta: Criar uma Route Handler que devolva CSV do período (lançamentos, comissões, despesas). É o item de menor esforço com maior efeito de confiança para o dono que ainda usa planilha.
  - Impacto: MEDIO · Esforço: M

### Apontado pelo verificador (não coberto na primeira passada)

- BURACO CRÍTICO NA VERDADE FINANCEIRA (G3) NÃO CHECADO: todo o fiado/convênio cadastrado em /contas-a-receber fica FORA de todos os indicadores do Financeiro. src/modules/bills/actions.ts:61-67 insere o recebível apenas em `accounts_receivable`, sem criar nenhuma `financial_transactions`; e a RPC (supabase/migrations/202607240027_fase4_financeiro_gerencial.sql:45-49) calcula `receivable` somando SÓ `financial_transactions` com status pending/overdue. Logo o card "A receber" (financeiro/page.tsx:318-324) não enxerga um centavo do que foi lançado em /contas-a-receber, e "Vendido no mês" também não. O auditor pediu "unificar as duas listas" como melhoria de UX, sem perceber que o KPI está numericamente incompleto.
- income_summary.receivable IGNORA O PERÍODO por definição — supabase/migrations/202607240027_fase4_financeiro_gerencial.sql:45-49 soma pendentes sem cláusula de data (o comentário original em 202607230022:728 assume "independe da janela"). O card "A receber" de financeiro/page.tsx:318-324 está dentro de uma grade rotulada "no mês" e mistura anos. Item relevante para o requisito de filtro de período e não avaliado.
- A LISTA "A receber" É CAPADA EM 100 E MENTE NA CONTAGEM: src/app/(dashboard)/financeiro/page.tsx:184 `.limit(100)`, e o título em :450 exibe `A receber ({receivables.length})` — com mais de 100 pendências o card anuncia "A receber (100)" ao lado de um KPI de valor total sem teto. Divergência visível na mesma tela, não checada.
- /relatorios PRODUZ NÚMEROS ERRADOS EM ESCALA: src/app/(dashboard)/relatorios/page.tsx:53-59 busca TODAS as transações pagas sem `.limit()` e sem recorte de data, e soma no servidor (:73-85). Bate no mesmo teto de ~1000 linhas documentado em supabase/migrations/202607080015_dashboard_income_sum.sql:2 — "Saldo total", "Saldo do mês" e o rateio por forma de pagamento ficam truncados, e "Saldo do mês" passa a divergir de "Recebido no mês" do Financeiro (que usa a RPC). O auditor só observou que o agregado é all-time.
- §7.5 Relatórios (GUIA_VISUAL.md:715-717) não tem NENHUMA linha no relatório — ele foi entregue truncado no meio do item "Comissões: coluna de situação". Os fatos: o rótulo pedido é "Baixar relatório" e o código usa "Gerar PDF" (src/app/(dashboard)/relatorios/page.tsx:122 e src/app/(dashboard)/financeiro/page.tsx:396); não há PDF de verdade — src/components/dashboard/print-button.tsx:12-24 apenas chama `window.print()` ("Imprimir / Salvar PDF"); e planilha não existe: grep -rniE "csv|planilha|xlsx|text/csv" em src/ retorna só duas frases de marketing (src/app/page.tsx:239 e src/app/salao/page.tsx:51).
- §7.5 Comissões, botão "Marcar como pago" (GUIA_VISUAL.md:713) — sem linha no relatório. O rótulo real é "Registrar pagamento" (src/components/dashboard/employee-pay-card.tsx:166 e :208). Curiosamente é o rótulo que o guia pede em A RECEBER e que lá não existe: os rótulos dos dois módulos estão trocados entre si.
- A COMISSÃO É PAGA SOBRE DINHEIRO QUE PODE NUNCA TER ENTRADO: src/app/(dashboard)/comissoes/page.tsx:96 filtra `status = 'completed'` (competência), enquanto o lucro em supabase/migrations/202607240027_fase4_financeiro_gerencial.sql:58 é `received - expenses_paid` (caixa). O sistema sugere pagar comissão de um atendimento cuja receita continua 'pending'. Isso é um furo no pilar G3 mais grave que o já apontado "lucro não desconta comissão devida", e não foi levantado.
- O relatório auditado chega truncado (interrompe em "…os imports nas linhas"), sem `percentual` recalculável, sem itens de Relatórios e sem o item explícito de VERDADE FINANCEIRA que o escopo classificou como crítico — a conclusão sobre esse ponto existe só na prosa do resumo, sem linha classificada nem evidência de código citada linha a linha.

---

## Serviços, produtos e estoque (§7.6) + pilar G5

A área de catálogo existe e funciona, mas está longe do desenho do §7.6. Não há a área única com abas Serviços | Produtos | Estoque | Vendas: Serviços e "Produtos e estoque" são duas rotas separadas no menu lateral (grupo "Serviços e produtos" em src/components/layout/dashboard-shell.tsx:97-111), /estoque foi absorvido por /produtos via redirect, e a aba Vendas simplesmente não existe. O maior buraco é o pilar G5: NÃO existe nenhuma tela de venda com carrinho no painel — nenhum arquivo em src/ contém carrinho/PDV/Nova venda de balcão, e o único caminho para vender um produto é o cliente adicioná-lo no checkout do agendamento online (exclusivo do plano Plus) e alguém confirmar a reserva em /produtos. Venda avulsa no balcão, desconto, vendedor responsável e "Receber R$ X" não existem em lugar nenhum. O cadastro de serviço viola o §2.4 de forma frontal: 11 campos visíveis de uma só vez, sem "Mais opções", e ainda pede "Imagem (URL)" com input type="url" — enquanto produto, profissional e identidade visual já têm upload real para o Supabase Storage. Na lista de produtos faltam foto, custo e lucro por unidade (o custo é até buscado no SELECT, mas nunca renderizado). O estoque negativo só é bloqueado no caminho da venda reservada (RPC confirm_product_sale); uma saída manual pelo formulário de movimentação derruba o saldo abaixo de zero sem nenhuma trava.

### Atendido (2)

- **§7.6 / §2.2 Botão principal "Novo serviço"**
  - Evidência: src/components/dashboard/service-form-sheet.tsx:94-96 — `<Button className="w-full"><Plus /> Novo serviço</Button>`, único botão de alta ênfase da página, montado no `action` do PageHeader em src/app/(dashboard)/servicos/page.tsx:66-72.
- **G5 — Entradas, saídas, reservas e alertas de estoque baixo**
  - Evidência: Entradas e saídas: src/components/dashboard/inventory-movement-form.tsx + src/lib/inventory.ts:1-8 (6 tipos). Histórico: src/app/(dashboard)/produtos/page.tsx:437-497. Reservas pendentes com confirmar/cancelar: src/app/(dashboard)/produtos/page.tsx:192-262 + src/components/dashboard/reservation-actions.tsx. Alerta de estoque baixo: src/app/(dashboard)/produtos/page.tsx:126-129 (KPI) e 411-424 (cartão âmbar nominal).
  - O que falta: Funciona, mas o alerta é inerte na prática enquanto o estoque mínimo não puder ser editado na interface (ver item de estoque mínimo).

### Parcial (10)

- **§7.6 Abas — área única com Serviços | Produtos | Estoque | Vendas**
  - Evidência: src/components/layout/dashboard-shell.tsx:95-111 define o grupo de menu "Serviços e produtos" com 3 rotas separadas (/servicos, /planos, /produtos); src/app/(dashboard)/estoque/page.tsx:5 é apenas `redirect("/produtos")`. Nenhuma das páginas importa Tabs — grep "Tabs" em src/app/(dashboard)/servicos/page.tsx e produtos/page.tsx: zero ocorrências. O componente de abas existe e é usado em outra área (src/components/dashboard/team-tabs.tsx:24-41), provando que o padrão está disponível e não foi aplicado aqui.
  - O que falta: Criar uma rota única (ex.: /catalogo) com <Tabs> de 4 abas — Serviços, Produtos, Estoque, Vendas — renderizando as seções no servidor como children, no mesmo molde de team-tabs.tsx. Estoque hoje está fundido com Produtos (uma aba só) e Vendas não existe.
  - Impacto: MEDIO · Esforço: M
- **§7.6 Serviços — lista compacta com nome, duração, preço, profissionais, situação na página de agendamento e menu de ações**
  - Evidência: src/app/(dashboard)/servicos/page.tsx:83-87 declara apenas 5 colunas: Serviço, Duração, Preço, Status e uma coluna vazia de ações. A situação pública aparece em src/app/(dashboard)/servicos/page.tsx:107-121 (badge Visível/Oculto + Assinantes/Interno). Os profissionais são carregados (linhas 40-56, `linksByService`) mas usados só para alimentar o formulário — nenhuma célula da tabela renderiza professionalIds. As ações são 3 botões soltos (editar, olho, excluir — linhas 124-166), não um menu de três pontos.
  - O que falta: Adicionar coluna "Profissionais" (contagem ou avatares) e colapsar as ações raras em menu de três pontos, conforme §5.5.
  - Impacto: MEDIO · Esforço: P
- **Upload real de arquivo via Supabase Storage (serviço, produto, profissional)**
  - Evidência: Existe infraestrutura real: src/lib/storage.ts:22-49 (uploadPublicImage → bucket public-assets, valida PNG/JPG/WebP e tamanho). Usada em produto — src/components/dashboard/product-form-sheet.tsx:146-152 (`type="file"`) + src/modules/products/actions.ts:63-73 — e em profissional — src/components/dashboard/professional-profile-sheet.tsx:87 (`type="file"`) — e na identidade visual (src/components/dashboard/appearance-editor.tsx:157 e :387). Serviço é a única entidade que ficou de fora e ainda pede URL.
  - O que falta: Cobrir o serviço com o mesmo upload já existente. Nada de novo precisa ser construído, só reutilizado.
  - Impacto: ALTO · Esforço: P
- **§7.6 Produtos — lista com foto pequena, nome, preço de venda, custo, LUCRO POR UNIDADE, estoque disponível, situação pública e ações**
  - Evidência: src/app/(dashboard)/produtos/page.tsx:274-281 declara as colunas: Produto, Preço, Estoque, Reservado, Disponível, Status e ações. Faltam foto, custo e lucro. O `cost_price` e o `image_url` são até selecionados na query (src/app/(dashboard)/produtos/page.tsx:68) e nunca renderizados — grep "image_url" nesse arquivo retorna só a linha 68, e "cost_price" idem. Busca por "lucro"/"margem" em todo o src/: nenhuma ocorrência ligada a produto (só "Lucro do mês (caixa)" no financeiro, src/app/(dashboard)/financeiro/page.tsx:332).
  - O que falta: Renderizar miniatura da foto, coluna Custo e coluna "Lucro por unidade" = sale_price − cost_price (rótulo em reais, nunca a palavra "margem"). Os dados já vêm na query, é só exibir.
  - Impacto: ALTO · Esforço: P
- **§7.6 Estoque — 4 indicadores: produtos com estoque baixo, zerados, valor aproximado em estoque, reservas atuais**
  - Evidência: src/app/(dashboard)/produtos/page.tsx:130-149 monta 4 cartões, mas são: "Produtos ativos", "Unidades em estoque", "Valor estimado" e "Baixo estoque". Batem 2 de 4 (valor e baixo estoque). Não há indicador de produtos zerados (nenhum filtro `stockOf(...) === 0` no arquivo) nem cartão de reservas atuais — as reservas aparecem só como uma tabela com Badge de contagem (linhas 195-199). Observação: o "Valor estimado" usa sale_price (linha 122-124), ou seja, é o valor de venda, não o custo imobilizado.
  - O que falta: Trocar "Produtos ativos" e "Unidades em estoque" por "Produtos zerados" e "Reservas atuais"; considerar calcular o valor em estoque por cost_price. Os cartões também não trazem período nem comparação (§5.4).
  - Impacto: MEDIO · Esforço: P
- **§7.6 Estoque — lista com produto, disponível, reservado, estoque mínimo e última movimentação**
  - Evidência: src/app/(dashboard)/produtos/page.tsx:274-281 tem Produto, Estoque, Reservado e Disponível, mas nenhuma coluna de estoque mínimo nem de última movimentação por produto. O minimum_stock é lido apenas para pintar de âmbar (linha 290) e para a lista de alerta (linha 127). As movimentações aparecem num cartão separado "Últimas movimentações" (linhas 437-497), global, não por linha de produto. Pior: o minimum_stock não é editável em lugar nenhum da interface — o productSchema em src/modules/products/actions.ts:11-18 não tem o campo e o product-form-sheet.tsx não o expõe, então ele fica travado no default 0 do banco (supabase/migrations/202607020001_core_schema.sql:273) e o alerta de estoque baixo nunca dispara.
  - O que falta: Adicionar colunas "Estoque mínimo" e "Última movimentação" e, principalmente, um campo de estoque mínimo no cadastro de produto — sem ele todo o alerta de reposição do G5 é inerte.
  - Impacto: ALTO · Esforço: P
- **§7.6 Estoque — botão "Registrar entrada ou saída"**
  - Evidência: O formulário existe em src/components/dashboard/inventory-movement-form.tsx, mas o título é "Registrar movimentação" (linha 30) e o botão de submit diz apenas "Registrar" (linha 105). É um cartão fixo na coluna lateral (src/app/(dashboard)/produtos/page.tsx:404-409), não um botão de ação por linha nem no cabeçalho. Os tipos, ao menos, já usam linguagem simples: "Entrada — compra", "Saída — perda" etc. (src/lib/inventory.ts:1-8).
  - O que falta: Renomear para "Registrar entrada ou saída" e expor a ação também a partir da linha do produto, em painel lateral.
  - Impacto: BAIXO · Esforço: P
- **§7.6 "Estoque negativo deve ser impossível" — citar a trava**
  - Evidência: A trava existe SÓ no caminho da venda reservada: supabase/migrations/202607080016_stock_check_on_sale.sql:44-55 faz `perform 1 from public.products where id = r.product_id for update`, soma o ledger e levanta `INSUFFICIENT_STOCK` — reeditado em supabase/migrations/202607230022_fase0_verdade_financeira.sql:166-176. O caminho manual não tem trava alguma: src/modules/inventory/actions.ts:46-54 insere direto em inventory_movements sem consultar saldo, e a tabela só tem `check (quantity > 0)` por linha (supabase/migrations/202607020001_core_schema.sql:286-288). Grep por trigger sobre inventory_movements nas migrations: nenhuma — as únicas referências são índices e policies (202607080012, 202607020002:310-312).
  - O que falta: Um operador pode registrar "Saída — perda" de 100 unidades num produto com saldo 0 e o painel passa a exibir −100. Falta um trigger BEFORE INSERT em inventory_movements (ou uma RPC register_movement) que some o ledger com FOR UPDATE no produto e recuse tipos de saída sem saldo.
  - Impacto: ALTO · Esforço: M
- **G5 — Cadastro de custo, preço de venda, quantidade e margem**
  - Evidência: Custo e preço de venda existem no cadastro: src/components/dashboard/product-form-sheet.tsx:96-120 (salePrice e costPrice) e src/modules/products/actions.ts:15-16. Quantidade inicial só entra por movimentação de estoque (src/components/dashboard/inventory-movement-form.tsx:78-88), não no cadastro. Margem/lucro nunca é calculado nem exibido em lugar algum (grep "lucro|margem" em src/: nada ligado a produto).
  - O que falta: Calcular e exibir o lucro por unidade e, idealmente, permitir estoque inicial no próprio cadastro do produto.
  - Impacto: MEDIO · Esforço: P
- **G5 — Produtos mais vendidos e receita integrada ao Financeiro**
  - Evidência: A receita é integrada de fato: a RPC de confirmação insere em financial_transactions com categoria 'product' (supabase/migrations/202607080016_stock_check_on_sale.sql:68-75), e o financeiro exibe "Vendas de produtos" do mês em src/app/(dashboard)/financeiro/page.tsx:691-728 (dados agregados na linha 151-160). Mas isso é um relatório mensal; não existem "produtos mais vendidos como atalhos" porque não existe tela de venda.
  - O que falta: Reaproveitar essa agregação como atalhos de um clique na futura tela de Nova venda.
  - Impacto: MEDIO · Esforço: M

### Não atendido (9)

- **§7.6 Serviços — botão "Ordenar na página" (ordenação drag ou campo de ordem)**
  - Evidência: Buscas por "Ordenar", "ordem", "display_order", "sort_order", "position" em src/ e supabase/migrations/ retornaram apenas `sort_order` na tabela public_site_sections (supabase/migrations/202607020001_core_schema.sql:230) — a tabela services (mesmo arquivo, linhas 64-80) e todos os ALTERs posteriores não têm coluna de ordem. A listagem pública ordena por nome fixo: `order by sv.name` em supabase/migrations/202607230022_fase0_verdade_financeira.sql:386, e o painel usa `.order("name")` em src/app/(dashboard)/servicos/page.tsx:38.
  - O que falta: Adicionar coluna sort_order em services (migration), usá-la no get_public_barbershop e no painel, e criar o botão secundário "Ordenar na página" abrindo uma lista arrastável ou campo numérico de ordem.
  - Impacto: MEDIO · Esforço: M
- **§2.4 / §7.6 Cadastro de serviço progressivo — só nome, preço e duração na primeira dobra; resto em "Mais opções"**
  - Evidência: src/components/dashboard/service-form-sheet.tsx:116-262 renderiza 11 campos simultaneamente, sem nenhum colapso: Nome (117), Preço (127), Minutos (139), Comissão do serviço % (152), Retorno recomendado em dias (168), Categoria (185), Imagem URL (195), Descrição (205), lista de checkboxes de Profissionais (214-236), select "Quem pode ver e agendar" (239-252) e checkbox "Visível no catálogo" (254-262). Busca por "Mais opções" / "Adicionar detalhes" / Collapsible / Accordion no arquivo: zero ocorrências.
  - O que falta: Deixar visíveis apenas Nome, Preço, Duração e o botão de salvar; mover os outros 8 campos para um disclosure "Mais opções". Bônus: o botão diz "Adicionar serviço" (linha 266), o guia §2.4 pede "Salvar serviço".
  - Impacto: ALTO · Esforço: P
- **§7.6 "Não pedir URL da imagem. Usar Escolher foto" — formulário de serviço**
  - Evidência: src/components/dashboard/service-form-sheet.tsx:194-203 — `<Label>Imagem (URL)</Label>` com `<Input name="imageUrl" type="url" placeholder="https://…" />`. O campo trafega até o banco: src/modules/services/actions.ts:24 (`imageUrl: formData.get("imageUrl")`) e :44 (`image_url: parsed.data.imageUrl || null`). Não há nenhum `type="file"` no arquivo, nem chamada a uploadPublicImage no módulo de serviços.
  - O que falta: Trocar por input file (como em product-form-sheet.tsx:146-152) e chamar uploadPublicImage com prefixo `services/{tenantId}/...` — exige também acrescentar esse prefixo às policies de storage (supabase/migrations/202607020003_storage.sql cobre hoje só {tenantId}/, professionals/ e products/).
  - Impacto: ALTO · Esforço: P
- **§7.6 "permitir câmera no celular" nas fotos**
  - Evidência: Busca por `capture=` em toda a pasta src/: zero ocorrências. Os inputs de arquivo usam `accept="image/png,image/jpeg,image/webp"` (product-form-sheet.tsx:150), sem `accept="image/*"` nem `capture="environment"`, então o navegador móvel não recebe dica explícita para abrir a câmera.
  - O que falta: Acrescentar `capture="environment"` (ou ao menos `accept="image/*"`) nos inputs de foto de produto, profissional e serviço.
  - Impacto: BAIXO · Esforço: P
- **§7.6 Vendas/PDV — tela de venda com busca de produto, atalhos dos mais vendidos, carrinho (à direita no desktop, fixo embaixo no celular), cliente opcional, vendedor, desconto, forma de pagamento e botão "Receber R$ X"**
  - Evidência: Não existe. `find src/app -type d | grep -i "venda|caixa|pdv"` retorna vazio; a listagem de src/app/(dashboard)/ tem 20 rotas e nenhuma de venda. Grep por "carrinho|cart|Nova venda|PDV" em todo o src/ só acha o carrinho do agendamento público (src/components/public-site/booking-form.tsx:31,107,130-133,274-302) e o rótulo "Cartão" de forma de pagamento (src/lib/financial/index.ts:3). Grep por "appointment_products" em src/ mostra 4 ocorrências, todas de LEITURA (agenda:139, produtos:80, financeiro:153, relatorio-financeiro:89) — nenhum INSERT no painel; o único insert está na RPC pública create_public_appointment (supabase/migrations/202607060006_team_and_booking_limits.sql:254). O manual-appointment-sheet.tsx não menciona products (grep: zero). Consequência prática: só se vende produto se o cliente o tiver adicionado no checkout do agendamento online, que é exclusivo do plano Plus (RPC filtra `and b.plan = 'plus'`, supabase/migrations/202607230022_fase0_verdade_financeira.sql:404-411). Venda de balcão é impossível hoje.
  - O que falta: Construir a tela inteira: busca de produto, atalhos dos mais vendidos, carrinho responsivo, cliente opcional, vendedor, desconto, forma de pagamento e botão "Receber R$ X" — com uma RPC transacional nova (venda avulsa sem agendamento) que dê baixa no estoque e lance a receita. É o maior gap desta dimensão.
  - Impacto: ALTO · Esforço: G
- **G5 — Venda rápida com carrinho, pagamento, desconto e responsável pela venda**
  - Evidência: O único fluxo de venda é confirmar uma reserva vinda do agendamento online: src/components/dashboard/reservation-actions.tsx:35-58 tem um select de forma de pagamento e um botão "Confirmar", chamando src/modules/product-sales/actions.ts:27-52 → RPC confirm_product_sale. Não há campo de desconto (grep "desconto" em src/modules/product-sales e src/components/dashboard/reservation-actions.tsx: zero) e o vendedor não é escolhido — a RPC atribui `public.current_profile_id()` (supabase/migrations/202607080016_stock_check_on_sale.sql:59,66,75).
  - O que falta: Mesma construção do item de Vendas/PDV, mais o campo de desconto e a escolha explícita do profissional/vendedor.
  - Impacto: ALTO · Esforço: G
- **G5 — Ocultação de itens indisponíveis (sem estoque) na vitrine pública**
  - Evidência: A RPC get_public_barbershop filtra produtos apenas por `pd.active and pd.public_visible and b.plan = 'plus'` (supabase/migrations/202607230022_fase0_verdade_financeira.sql:404-411) — sem nenhuma checagem do ledger de estoque. A RPC de criação de agendamento repete o mesmo filtro sem saldo (supabase/migrations/202607060006_team_and_booking_limits.sql:245-256). Resultado: o cliente reserva um produto zerado e o erro só aparece depois, na confirmação (INSUFFICIENT_STOCK), já no balcão. A rota src/app/(public)/[tenant]/produtos/page.tsx:1-8 é só um redirect para a âncora #produtos da home.
  - O que falta: Adicionar subconsulta de saldo do ledger nos dois filtros da RPC para não ofertar o que não existe, ou ao menos marcar como indisponível.
  - Impacto: MEDIO · Esforço: M
- **§5.5 Busca sempre visível nas listas**
  - Evidência: Grep por "Input|search|Busca|Buscar|placeholder" em src/app/(dashboard)/servicos/page.tsx e src/app/(dashboard)/produtos/page.tsx: zero ocorrências. Ambas as listas renderizam a tabela completa sem campo de busca nem filtros.
  - O que falta: Adicionar campo de busca (nome) e, em produtos, filtros rápidos de "baixo estoque" e "zerados".
  - Impacto: MEDIO · Esforço: P
- **§5.5 No celular, tabelas viram cartões; rolagem horizontal não pode ser a solução principal**
  - Evidência: src/app/(dashboard)/produtos/page.tsx:204 e :271 embrulham as tabelas em `<div className="overflow-x-auto">` — rolagem horizontal como única estratégia; não há variante `sm:hidden` de cartões (grep "sm:hidden|md:hidden" nos dois arquivos: zero). Em src/app/(dashboard)/servicos/page.tsx:80 a `<Table>` de 5 colunas nem sequer tem wrapper de scroll. Para comparação, o financeiro já faz a versão em cartões corretamente (src/app/(dashboard)/financeiro/page.tsx:741 em diante, bloco `sm:hidden`).
  - O que falta: Duplicar as listas em cartões para telas pequenas, no molde já usado no financeiro.
  - Impacto: MEDIO · Esforço: M

### Não aplicável (1)

- **§2.3 / §8.1 O nome visível não pode ser "PDV"**
  - Evidência: Grep por "PDV" em src/: nenhuma ocorrência em texto de interface. A regra é cumprida por ausência — não há tela de venda para nomear. Quando ela for criada, o rótulo deve nascer como "Nova venda" ou "Caixa" (guia linha 1041).
  - Impacto: BAIXO · Esforço: P

### Apontado pelo verificador (não coberto na primeira passada)

- DEFEITO GRAVE NÃO CHECADO — todo o saldo de estoque é calculado sobre um recorte truncado de 400 movimentações. src/app/(dashboard)/produtos/page.tsx:72-77 busca inventory_movements com `.order("created_at", { ascending: false }).limit(400)` e as linhas 104-115 somam esse array para produzir `stockByProduct`. Ou seja: passando de 400 movimentações no tenant, as mais ANTIGAS (tipicamente as entradas de compra) são silenciosamente descartadas e as colunas Estoque, Reservado, Disponível e os KPIs Unidades/Valor/Baixo estoque passam a exibir números errados — e tendendo ao negativo, porque as saídas recentes sobrevivem ao corte e as entradas antigas não. Pior: a RPC confirm_product_sale (supabase/migrations/202607230022_fase0_verdade_financeira.sql:169-177) soma o ledger INTEIRO, sem limite, então painel e banco divergem por construção. É o oposto exato da promessa do G5 ("estoque desatualizado" como dor a resolver) e não aparece em nenhum item do relatório.
- NÃO CHECOU se o rótulo "Escolher foto" pedido pelo guia (GUIA_VISUAL.md:754) existe sequer onde o upload já foi feito. Em src/components/dashboard/product-form-sheet.tsx:146-152 o campo é um `<input type="file">` cru, cujo botão exibe o texto padrão do navegador ("Escolher arquivo"/"Choose file"); o único texto autoral é o Label "Foto do produto" (linha 131). O mesmo vale para src/components/dashboard/professional-profile-sheet.tsx:87-89. Logo o requisito "Usar Escolher foto" está PARCIAL até no produto, não só ausente no serviço.
- NÃO CHECOU que existe precedente pronto de venda de balcão no próprio repositório. src/components/dashboard/sell-membership-sheet.tsx:56 e :61 renderizam "Vender plano" com cliente, plano e forma de pagamento, montado em src/app/(dashboard)/planos/page.tsx:141. A afirmação absoluta do relatório ("Venda de balcão é impossível hoje") é verdadeira para PRODUTOS mas falsa como descrição do sistema — e a existência desse sheet muda a estimativa de esforço da tela "Nova venda", que tem um molde a copiar.
- NÃO CHECOU que o relatório financeiro de produtos é estruturalmente incapaz de representar uma venda avulsa. src/app/(dashboard)/financeiro/page.tsx:152-160 lê `appointment_products` filtrando `status = 'confirmed'` e agrupando por `appointment:appointments(professional:...)`, e a tabela "Vendas de produtos" (linhas 691-728) consome esse recorte. Toda venda precisa estar amarrada a um agendamento. O item do relatório que diz "reaproveitar essa agregação como atalhos" está errado: a agregação teria de ser reescrita junto com a tela.
- NÃO CHECOU o texto do estado vazio de /produtos, que promete uma função inexistente: src/app/(dashboard)/produtos/page.tsx:262 — "Cadastre produtos para vender no balcão e no checkout do agendamento". Metade dessa frase não tem implementação (ver correção sobre Vendas/PDV). É desalinhamento de conteúdo com o produto real, exatamente o que §2.3 combate.
- NÃO CHECOU §2.2 em /produtos, só em /servicos. A tela tem DOIS botões de alta ênfase simultâneos: "Novo produto" no cabeçalho (src/components/dashboard/product-form-sheet.tsx:65-68, variant default, w-full) e "Registrar" no cartão lateral de movimentação (src/components/dashboard/inventory-movement-form.tsx:104-106, também variant default e w-full), ambos visíveis ao mesmo tempo no grid da linha 265. Violação direta de "cada página deve ter apenas um botão de maior destaque" (GUIA_VISUAL.md:55).
- NÃO CHECOU §5.5 "ações raras em menu de três pontos" na lista de PRODUTOS (ele só levantou isso em serviços). São 4 botões-ícone soltos por linha — editar, sacola de checkout, olho e excluir — em src/app/(dashboard)/produtos/page.tsx:329-399, com `gap-0.5`, todos ícone puro sem palavra (o guia §2.3 linha 74 pede que ícones acompanhem palavras).
- NÃO CHECOU dois requisitos de §5.5 que valem para as duas listas: "Clicar na linha abre detalhes" (nenhum onClick/Link em <TableRow> em servicos/page.tsx:92 nem produtos/page.tsx:292) e "Cabeçalho fixo ao rolar listas longas" (nenhuma classe sticky em <TableHeader> nos dois arquivos).
- NÃO CHECOU a inconsistência de permissão do menu: o item "Serviços" em src/components/layout/dashboard-shell.tsx:99 é declarado SEM campo `permission`, enquanto "Produtos e estoque" (linhas 105-110) exige "catalog:manage". Um barbeiro vê "Serviços" no menu lateral e a página abre em modo leitura (canManage em src/app/(dashboard)/servicos/page.tsx:24), mas o par de telas irmãs se comporta de forma diferente — relevante para a proposta de área única com abas do §7.6, que precisará resolver esse conflito de gate.

---

## Equipe, Configurações e Minha conta (§7.7–§7.9) + pilar G4

A dimensão está entregue pela metade e concentra a violação mais grave de toda a auditoria: o formulário "Novo profissional" pede "Senha inicial" em texto puro e o dono cria a conta do colaborador via `admin.auth.admin.createUser`, exatamente o que o §7.7 proíbe ("O proprietário não deve criar a senha do colaborador"). Não existe convite por e-mail em lugar nenhum do código — a única alternativa (`inviteMember`) exige que a pessoa já tenha criado a conta sozinha antes. A consolidação de Equipe também não aconteceu: as abas pedidas (Profissionais | Horários | Resultados | Quem pode acessar) viraram duas abas com o rótulo antigo "Acessos e papéis" mais duas rotas soltas na barra lateral, e /equipe sequer tem página. Os cartões de profissional mostram foto, nome e um selo de visibilidade pública, mas nenhum dos cinco indicadores de produção pedidos (próximo atendimento, atendimentos no período, total vendido, comissão estimada) — o que também derruba boa parte do pilar G4. Em Configurações não há navegação interna alguma: é uma página de rolagem com cinco cartões, quatro botões "Salvar" diferentes, nenhum aviso de mudanças não salvas e nenhum alternador Celular|Computador; os temas prontos, porém, existem de verdade e a prévia ao vivo existe (limitada ao cartão de aparência). Minha conta cobre nome, telefone e senha, mas não tem verificação de e-mail, alternância de tema (o painel é dark fixo) nem "sair de outros aparelhos". A rota /assinatura continua rotulada "Assinatura" — o termo que o guia manda evitar — e não tem forma de pagamento nem botão "Gerenciar pagamento".

### Atendido (17)

- **§7.7 Cartão do profissional: foto**
  - Evidência: src/app/(dashboard)/profissionais/page.tsx:94-101 — `<Avatar>` com `AvatarImage src={item.avatar_url}` e fallback de ícone
- **§7.7 Cartão do profissional: nome**
  - Evidência: src/app/(dashboard)/profissionais/page.tsx:104 — `<p className="font-medium">{item.name}</p>`
- **§7.7 Horários — exceções por data (férias/ausência)**
  - Evidência: src/components/dashboard/schedule-blocks-card.tsx:86-104 — campos "De" e "Até (opcional, para férias)" tipo date; motivo livre com placeholder "Folga, férias, consulta…" (:77-84); opção dia(s) inteiro(s) ou faixa de horas (:106-139); lista de bloqueios futuros com remoção (:146-180). Renderizado em src/app/(dashboard)/equipe/horarios/page.tsx:161-177
- **§7.7 Quem pode acessar — coluna nome**
  - Evidência: src/app/(dashboard)/profissionais/page.tsx:201 — `<p className="text-sm font-medium">{member.name}</p>`
- **§7.8 Página de agendamento › Divulgação: link, copiar, QR Code, baixar QR, abrir página**
  - Evidência: src/components/dashboard/share-page-card.tsx — link em input readOnly (:57), botão Copiar com feedback (:58-69), QR renderizado (:44-51, gerado em configuracoes/page.tsx:25-29), "Baixar QR Code (PNG)" (:73-77). Abrir página: configuracoes/page.tsx:53-57 ("Ver página") e appearance-editor.tsx:356-360 ("Ver página pública")
- **§7.8 / §3 Aparência: TEMAS PRONTOS como opção principal**
  - Evidência: src/components/dashboard/appearance-editor.tsx:56-67 define 9 THEME_PRESETS (Dourado clássico, Meia-noite, Esmeralda, Vinho nobre, Grafite & ouro, Rosé, Rosé elegante, Lavanda suave, Champagne), cada um com primary/secondary/background; UI em grade com amostra de cor e estado ativo nas linhas 221-267, aplicando os três valores em um clique (:235-242)
- **§7.8 Aparência: logotipo**
  - Evidência: src/components/dashboard/appearance-editor.tsx:140-187 — preview do logo atual, input file (PNG/JPG/WebP até 4 MB) e ação `uploadLogo` (src/modules/settings/actions.ts:145)
- **§7.9 Minha conta: nome**
  - Evidência: src/components/dashboard/account-forms.tsx:44-47 (campo Nome) + src/modules/account/actions.ts `updateProfile`
- **§7.9 Minha conta: telefone**
  - Evidência: src/components/dashboard/account-forms.tsx:49-56 — Input `phone` com inputMode="tel"
- **§7.9 Minha conta: alterar senha**
  - Evidência: src/components/dashboard/account-forms.tsx:73-115 (cartão "Trocar senha", nova senha + confirmação, mín. 8) e src/modules/account/actions.ts `changePassword` via `supabase.auth.updateUser({ password })`
- **§7.9 Meu plano: plano atual**
  - Evidência: src/app/(dashboard)/assinatura/page.tsx:134-136 — `<CardTitle>… Plano {plan.label}</CardTitle>`, com plan vindo de `planConfig(sub?.plan ?? tenant.plan)` (:43)
- **§7.9 Meu plano: valor**
  - Evidência: src/app/(dashboard)/assinatura/page.tsx:137-142 — `formatPriceBRL(sub?.priceCents ?? monthlyCents)` com sufixo "/mês"; comparativo mensal x anual nas linhas 171-201, com preços vindos do catálogo do banco (:51-55)
- **§7.9 Meu plano: benefícios**
  - Evidência: src/app/(dashboard)/assinatura/page.tsx:145-152 — lista `plan.features` com ícone BadgeCheck em grade de 2 colunas
- **§7.9 Meu plano: situação**
  - Evidência: src/app/(dashboard)/assinatura/page.tsx:64-78 — Badge com STATUS_LABEL (Período de teste / Ativa / Pagamento pendente / Suspensa / Cancelada, :22-28) e cor por estado; alertas contextuais de bloqueio, atraso e trial nas linhas 83-130. Também há faixa no shell (src/components/layout/dashboard-shell.tsx:293-323)
- **G4 — Agenda e disponibilidade individual de cada profissional**
  - Evidência: Filtro `prof` na agenda: src/app/(dashboard)/agenda/page.tsx:44 e 54-59 (owner/manager/receptionist veem todos; profissional vê só a própria, reforçado por RLS). Disponibilidade individual em src/app/(dashboard)/equipe/horarios/page.tsx:126-159 com seletor de profissional (:132-150)
- **G4 — Comissão por serviço, percentual ou valor fixo**
  - Evidência: Comissão por serviço: coluna services.commission_rate (supabase/migrations/202607020001_core_schema.sql:72), editável em src/components/dashboard/service-form-sheet.tsx:160 e usada no cálculo em src/app/(dashboard)/comissoes/page.tsx:147. Percentual padrão do profissional: src/components/dashboard/employee-pay-card.tsx:123-133 (com fallback quando o serviço não define, comissoes/page.tsx:134). Valor fixo: modelo "Salário fixo"/híbrido (employee-pay-card.tsx:23, 74-107)
- **G4 — Acessos adequados para dono, gerente e barbeiro**
  - Evidência: Matriz de 9 permissões x 4 papéis em src/app/(dashboard)/permissoes/page.tsx:19-36 e 60-92, aplicada na navegação (src/components/layout/dashboard-shell.tsx:164-171), nas telas (ex.: profissionais/page.tsx:41-46) e nas server actions (src/modules/team/actions.ts:35, 61, 79); reforçada por RLS no banco (nota em permissoes/page.tsx:93-97 e has_barbershop_role na migration 202607060006:40)

### Parcial (15)

- **§7.7 Navegação interna consolidada: Profissionais | Horários | Resultados | Quem pode acessar**
  - Evidência: src/components/dashboard/team-tabs.tsx:26-33 tem só 2 abas (Profissionais, Acessos e papéis). Horários e Permissões continuam como rotas separadas na barra lateral: src/components/layout/dashboard-shell.tsx:116-132 (grupo "Equipe" com /profissionais, /equipe/horarios, /permissoes). `find src/app -name page.tsx -path "*equipe*"` retorna só equipe/horarios/page.tsx — a rota /equipe dá 404. /usuarios é apenas um redirect (src/app/(dashboard)/usuarios/page.tsx:5-7)
  - O que falta: Consolidar as quatro seções em uma única área (rota /equipe) com abas internas; hoje o usuário tem 3 entradas distintas no menu para a mesma área e uma aba "Resultados" inexistente.
  - Impacto: MEDIO · Esforço: M
- **§7.7 Cartão do profissional: situação hoje**
  - Evidência: src/app/(dashboard)/profissionais/page.tsx:105-113 mostra Inativo / Disponível / Indisponível, derivado de `item.active` e `item.public_visible` — visibilidade no site público, não situação do dia. A query (linha 55) não busca expediente nem bloqueios do dia
  - O que falta: Mostrar a situação real de hoje (trabalha até X / em folga / de férias / ausente), cruzando professional_availability + schedule_blocks com a data corrente.
  - Impacto: MEDIO · Esforço: M
- **§7.7 Cartão do profissional: comissão estimada**
  - Evidência: Não existe no cartão (src/app/(dashboard)/profissionais/page.tsx:92-171). Existe em outra tela: src/app/(dashboard)/comissoes/page.tsx:229-238 passa `monthCommission` para o EmployeePayCard, e src/components/dashboard/employee-pay-card.tsx:167-169 exibe "Comissão no mês"
  - O que falta: Trazer a comissão estimada do período para o cartão em Equipe, como o guia pede.
  - Impacto: MEDIO · Esforço: P
- **§7.7 Horários — grade semanal com dia, início, intervalo, retorno, fim, folga**
  - Evidência: src/components/dashboard/weekly-availability-editor.tsx:106-195 — linha por dia da semana com início (`type="time"`, :135-143), fim (:145-153) e um select "a cada N min" (:154-169), que é o intervalo ENTRE horários (slot_interval_minutes), não o intervalo de almoço. Intervalo/retorno só é possível indiretamente criando dois turnos ("Adicionar turno", :183-191). Dia sem janela mostra "Fechado" (:118-128), não "folga"
  - O que falta: Expor colunas explícitas de intervalo e retorno (pausa do almoço) e usar a palavra "Folga" em vez de "Fechado", como o guia especifica.
  - Impacto: MEDIO · Esforço: M
- **§7.7 Quem pode acessar — "o que a pessoa pode ver"**
  - Evidência: src/app/(dashboard)/profissionais/page.tsx:222-233 é um `<select>` de papel (Gerente/Secretária/Profissional) e 261-282 é um cartão "O que cada papel pode" com três frases; a matriz completa fica em outra rota (src/app/(dashboard)/permissoes/page.tsx:60-92)
  - O que falta: Mostrar, na própria linha de cada pessoa, uma frase do que ela pode ver — hoje o dono precisa cruzar o papel com um cartão separado ou abrir /permissoes.
  - Impacto: BAIXO · Esforço: P
- **§7.7 Quem pode acessar — botão "Enviar convite"**
  - Evidência: src/components/dashboard/invite-member-form.tsx:79-81 — o botão diz "Convidar"/"Convidando…"; busca `grep -rn "Enviar convite" src/` retorna zero ocorrências. O texto de apoio (linhas 34-37) contradiz a ideia de convite: "A pessoa precisa ter uma conta criada com esse e-mail"
  - O que falta: Renomear para "Enviar convite" e fazer o botão de fato enviar um e-mail.
  - Impacto: BAIXO · Esforço: P
- **§7.8 "Configurações" não pode abrir diretamente "Identidade visual"**
  - Evidência: A rota foi renomeada (docs/entregas/fase-1.md:18: "'Identidade Visual' virou 'Configurações'"), mas o segundo cartão da página, logo abaixo da dobra, é literalmente `<CardTitle>Identidade Visual da Página de Agendamento</CardTitle>` (src/components/dashboard/appearance-editor.tsx:117-119), renderizado em configuracoes/page.tsx:67-83 sem nenhum nível de navegação entre a entrada do menu e o editor
  - O que falta: Só o rótulo mudou; a estrutura continua abrindo o editor visual direto. Precisa de um índice/abas antes.
  - Impacto: MEDIO · Esforço: M
- **§7.8 Aparência: foto de capa**
  - Evidência: O que existe é "Fundo da página" (src/components/dashboard/appearance-editor.tsx:293-348): alternador Cor|Imagem, 16 fundos prontos (DEFAULT_BACKGROUNDS, :33-53) e upload próprio (:382-410). Não há um campo de foto de capa do hero como item distinto
  - O que falta: Se o fundo da página cumpre o papel de capa, ao menos renomear para a linguagem do guia; se não, adicionar foto de capa separada.
  - Impacto: BAIXO · Esforço: P
- **§7.8 / §3 Hex livre deve ficar em "Personalização avançada"**
  - Evidência: Os três seletores hex (Destaque, Escura, Fundo — src/components/dashboard/appearance-editor.tsx:269-291, componente ColorField :553-589 com input type=color + campo de texto hex) ficam soltos logo abaixo dos temas prontos, no mesmo nível hierárquico. Busca `grep -rni "Personalização avançada" src/` retorna zero ocorrências (só "Personalização bloqueada", :365)
  - O que falta: Agrupar os campos hex sob um bloco recolhível "Personalização avançada", deixando os temas prontos como caminho principal.
  - Impacto: BAIXO · Esforço: P
- **§7.8 Página de agendamento › Conteúdo e contato: título, subtítulo, WhatsApp, Instagram, endereço**
  - Evidência: Todos os campos existem, mas em dois cartões diferentes: título e subtítulo em src/components/dashboard/appearance-editor.tsx:199-220 (dentro de "Identidade Visual"); WhatsApp, Instagram e Endereço em src/components/dashboard/contact-settings-form.tsx:50-69 (cartão "Contato e endereço", :32)
  - O que falta: Reagrupar título/subtítulo junto de contato na aba "Conteúdo e contato" — hoje estão separados por dois cartões e dois botões de salvar distintos.
  - Impacto: BAIXO · Esforço: P
- **§7.8 Página de agendamento › Notificações: confirmação, lembrete, antecedência, mensagem**
  - Evidência: Confirmação existe, mas em outro cartão: "Confirmação da reserva" manual/auto em src/components/dashboard/booking-rules-form.tsx:47. Lembrete é só um checkbox: contact-settings-form.tsx:79 "Enviar lembrete automático de horário por WhatsApp na véspera" (coluna whatsapp_reminders_enabled, supabase/migrations/202607090021_whatsapp_reminder_tracking.sql:17). Antecedência do lembrete é fixa ("na véspera") — o `booking_notice_minutes` de booking-rules-form.tsx:68 é antecedência mínima para agendar, coisa diferente. Mensagem não é editável pelo dono: o template é um nome de template aprovado na Meta vindo de variável de ambiente (src/lib/whatsapp-cloud.ts:36 — `process.env.WHATSAPP_REMINDER_TEMPLATE ?? "lembrete_horario"`)
  - O que falta: Criar a aba Notificações com antecedência do lembrete configurável e texto da mensagem editável, reunindo a confirmação que hoje mora em Regras de agendamento.
  - Impacto: MEDIO · Esforço: M
- **§7.8 Layout: formulário à esquerda + PRÉVIA FIXA à direita**
  - Evidência: Existe prévia ao vivo, mas só dentro de um cartão: src/components/dashboard/appearance-editor.tsx:413-502 ("Preview ao vivo") em uma coluna de 340px (`grid gap-6 lg:grid-cols-[1fr_340px]`, :137). Ela reflete cores, logo, título e subtítulo em tempo real (estado `values`, :102-106). Não é fixa/sticky (sem `sticky`/`top-` no container :414) e não acompanha as demais seções — Contato, Regras e Horários (configuracoes/page.tsx:84-105) não têm prévia nenhuma
  - O que falta: Elevar a prévia ao nível da página, torná-la sticky e refletir também contato, horários e regras.
  - Impacto: MEDIO · Esforço: G
- **§7.8 Botão "Ver página de agendamento", também no mobile**
  - Evidência: No cabeçalho global o botão existe mas está escondido no celular: src/components/layout/dashboard-shell.tsx:242-251 — `className="hidden sm:inline-flex"`. A barra inferior mobile não o traz (`grep -n "Ver página|slug" src/components/layout/mobile-tab-bar.tsx` = zero). Dentro de /configuracoes o botão "Ver página" do PageHeader (configuracoes/page.tsx:53-57) não tem a classe `hidden`, então aparece no celular
  - O que falta: Tornar o atalho global visível também no mobile (barra inferior ou cabeçalho).
  - Impacto: BAIXO · Esforço: P
- **§7.9 Menu do usuário: Minha conta | Meu plano NexoBarber | Ajuda | Sair**
  - Evidência: src/components/layout/user-menu.tsx:61-98 — "Minha conta" (:62-64) ✓, "Configurações" (:69-71, item extra fora do guia), "Assinatura" (:74-76, rótulo proibido), "Plataforma (super-admin)" (:81-85, condicional), "Sair" (:88-98) ✓. Busca `grep -rn ">Ajuda|\"Ajuda\"" src/` retorna zero ocorrências
  - O que falta: Renomear "Assinatura" para "Meu plano NexoBarber" e acrescentar "Ajuda".
  - Impacto: BAIXO · Esforço: P
- **§7.9 Meu plano: próxima cobrança**
  - Evidência: src/app/(dashboard)/assinatura/page.tsx:153-160 mostra "Período atual até {periodEnd}" (ou "Acesso encerrado em…" se cancelada), a partir de `sub.currentPeriodEnd`. Não há rótulo "Próxima cobrança" nem valor associado à data, e a linha é suprimida durante o trial (`sub?.status !== "trialing"`)
  - O que falta: Rotular explicitamente "Próxima cobrança: dd/mm — R$ X", inclusive durante o teste grátis (onde a data da primeira cobrança é justamente o que o dono quer saber).
  - Impacto: MEDIO · Esforço: P

### Não atendido (22)

- **§7.7 REGRA CRÍTICA — o proprietário NÃO deve criar a senha do colaborador**
  - Evidência: src/components/dashboard/professional-form.tsx:55-64 — campo `Senha inicial`, `<Input name="password" type="text" minLength={6}>` (senha visível na tela); linha 159: "O profissional entra em /login com o e-mail e a senha definidos". Backend: src/modules/professionals/actions.ts:64-71 chama `admin.auth.admin.createUser({ email, password, email_confirm: true })`
  - O que falta: Remover o campo de senha do formulário e substituir a criação direta por convite: `admin.auth.admin.inviteUserByEmail()` (ou `generateLink` type=invite) criando o usuário sem senha, com a membership em status 'invited'; o colaborador define a própria senha ao aceitar. A tela /atualizar-senha já existe e pode receber o fluxo.
  - Impacto: ALTO · Esforço: M
- **§7.7 Quem pode acessar — fluxo de convite por e-mail com o colaborador criando a própria senha**
  - Evidência: Busca `grep -rn "inviteUserByEmail|generateLink|signInWithOtp" src/` retorna zero ocorrências (só `resetPasswordForEmail` em src/modules/auth/actions.ts:105, que é recuperação de senha, não convite). O `inviteMember` (src/modules/team/actions.ts:22-55) só vincula quem JÁ tem conta: supabase/migrations/202607060006_team_and_booking_limits.sql:47-59 busca em auth.users e lança `USER_NOT_FOUND`; a mensagem exibida é "Peça para a pessoa criar a conta em /cadastro e convide de novo" (actions.ts:16-17)
  - O que falta: Implementar envio real de convite por e-mail com token, e um estado intermediário até o aceite. Hoje o dono só tem dois caminhos, e ambos são errados: criar a senha ele mesmo, ou pedir por WhatsApp que a pessoa se cadastre antes.
  - Impacto: ALTO · Esforço: M
- **§7.7 Substituir o rótulo "Acessos e papéis" por "Quem pode acessar"**
  - Evidência: src/components/dashboard/team-tabs.tsx:31 — `<TabsTrigger value="acessos"><KeyRound /> Acessos e papéis</TabsTrigger>`. Busca `grep -rn "Quem pode acessar" src/` retorna zero ocorrências. A rota /permissoes também usa "Permissões" e "Matriz de acesso" (src/app/(dashboard)/permissoes/page.tsx:46,57)
  - O que falta: Renomear a aba e o item de menu para "Quem pode acessar" — o guia cita este termo nominalmente como troca obrigatória.
  - Impacto: BAIXO · Esforço: P
- **§7.7 Aba "Resultados" da Equipe**
  - Evidência: team-tabs.tsx:26-33 não tem essa aba. Produção por profissional só aparece em /comissoes (src/app/(dashboard)/comissoes/page.tsx:227-240, EmployeePayCard com comissão e valor pago do mês), que fica no grupo Financeiro (dashboard-shell.tsx:83-88). Busca `grep -rn "produtividade|carteira|ranking" src/` só encontra o comentário genérico de src/components/dashboard/bar-list.tsx:6
  - O que falta: Criar a aba Resultados com produção por profissional (atendimentos, faturamento, ticket, clientes atendidos) no período escolhido.
  - Impacto: MEDIO · Esforço: G
- **§7.7 Cartão do profissional: próximo atendimento**
  - Evidência: Busca `grep -rn "próximo atendimento|nextAppointment" src/` retorna zero ocorrências. A query de profissionais (src/app/(dashboard)/profissionais/page.tsx:53-57) seleciona apenas id,name,phone,bio,avatar_url,active,public_visible — nenhum join com appointments
  - O que falta: Buscar o próximo appointment futuro de cada profissional e exibi-lo no cartão.
  - Impacto: MEDIO · Esforço: P
- **§7.7 Cartão do profissional: atendimentos no período**
  - Evidência: src/app/(dashboard)/profissionais/page.tsx:53-57 e 92-171 — o cartão renderiza nome, selo, telefone e bio; nenhuma contagem de atendimentos. Não há seletor de período na tela (PageHeader linhas 288-292 não tem filtro)
  - O que falta: Agregar appointments concluídos por profissional no período e exibir como indicador no cartão.
  - Impacto: MEDIO · Esforço: M
- **§7.7 Cartão do profissional: total vendido**
  - Evidência: Nenhuma soma de receita no cartão — src/app/(dashboard)/profissionais/page.tsx:92-171. A soma por profissional existe apenas no cálculo de comissão de /comissoes (src/app/(dashboard)/comissoes/page.tsx:94, 147), que não é reaproveitado aqui
  - Impacto: MEDIO · Esforço: M
- **§7.7 Ao abrir o profissional: abas Dados / Serviços e comissões / Horários / Clientes / Resultados**
  - Evidência: src/components/dashboard/professional-profile-sheet.tsx — 128 linhas, sem nenhum import de Tabs; o painel só tem "Foto do perfil" (linhas 70-99) e "Apresentação" (101-117), e o botão que o abre chama-se "Foto e bio" (linha 52). Não há aba de Dados, Serviços e comissões, Horários, Clientes nem Resultados
  - O que falta: Transformar o sheet em perfil completo com as 5 abas. Hoje editar comissão exige ir a /comissoes, editar horários exige ir a /equipe/horarios, e não há visão de clientes do profissional em lugar nenhum.
  - Impacto: ALTO · Esforço: G
- **§7.7 Quem pode acessar — coluna e-mail**
  - Evidência: src/app/(dashboard)/profissionais/page.tsx:67 — a query de memberships seleciona `profile:profiles(id,name,phone)`, sem e-mail; a linha 202-204 exibe telefone (ou o papel como fallback). O e-mail só é digitado no convite (src/components/dashboard/invite-member-form.tsx:56-63) e nunca mais aparece
  - O que falta: Trazer o e-mail (auth.users/profiles) para a listagem — é o identificador que o dono usa para saber quem é quem.
  - Impacto: MEDIO · Esforço: P
- **§7.7 Quem pode acessar — situação do convite**
  - Evidência: src/app/(dashboard)/profissionais/page.tsx:68-70 filtra `.eq("status", "active")`, então convites pendentes nunca apareceriam; e não há convite pendente para existir, porque supabase/migrations/202607060006_team_and_booking_limits.sql:71-76 grava a membership já como `'active'`. O enum tem o estado (supabase/migrations/202607020001_core_schema.sql:8 — `'invited','active','suspended'`), mas nada o utiliza
  - O que falta: Usar o estado 'invited' que já existe no banco, exibir "Convite enviado / Aceito" na lista e permitir reenviar o convite.
  - Impacto: MEDIO · Esforço: M
- **§7.8 Navegação interna: Dados da barbearia | Horários | Regras de agendamento | Pagamentos | Notificações | Página de agendamento**
  - Evidência: src/app/(dashboard)/configuracoes/page.tsx:61-106 — uma `<div className="max-w-5xl space-y-6">` com 5 cartões empilhados em rolagem (SharePageCard, AppearanceEditor, ContactSettingsForm, BookingRulesForm, OpeningHoursForm). Nenhum import de Tabs no arquivo. Não existe seção "Dados da barbearia" (nome/slug/logo do negócio) nem "Pagamentos": busca `grep -rn "payment_method|formas de pagamento" src/app/(dashboard)/configuracoes/ src/modules/settings/` retorna zero ocorrências
  - O que falta: Criar as 6 seções em navegação interna e adicionar as duas que não existem (Dados da barbearia e Pagamentos/formas de pagamento aceitas).
  - Impacto: ALTO · Esforço: G
- **§7.8 Layout: alternador Celular | Computador na prévia**
  - Evidência: Busca `grep -rni "Computador|Desktop" src/components/dashboard/` retorna zero ocorrências. A prévia de appearance-editor.tsx:418-501 tem largura única fixa pela coluna de 340px
  - Impacto: MEDIO · Esforço: M
- **§7.8 Layout: um único botão fixo "Salvar alterações"**
  - Evidência: São 4 formulários independentes com 4 botões distintos: "Salvar identidade" (src/components/dashboard/appearance-editor.tsx:353-355), "Salvar contato" (contact-settings-form.tsx:82), "Salvar regras" (booking-rules-form.tsx:130) e "Salvar horários" (booking-rules-form.tsx:201) — mais 2 uploads separados ("Enviar logo" :168-170, "Enviar fundo" :393-396). Busca `grep -rn "Salvar alterações" src/` só retorna sheets de serviço/plano/produto, nenhum em Configurações
  - O que falta: Unificar em um único formulário com barra de ação fixa. Hoje o dono pode alterar cores e contato e sair perdendo metade, sem perceber.
  - Impacto: ALTO · Esforço: G
- **§7.8 Layout: aviso quando existirem mudanças não salvas**
  - Evidência: Busca `grep -rni "não salv|nao salv|beforeunload|isDirty|unsaved" src/` retorna zero ocorrências em todo o código-fonte
  - O que falta: Detectar estado sujo e avisar antes de trocar de aba/sair — agravado pelo item anterior (4 botões de salvar).
  - Impacto: MEDIO · Esforço: M
- **§7.9 Minha conta: e-mail com verificação**
  - Evidência: src/components/dashboard/account-forms.tsx:57-63 — `<Input id="email" value={initial.email} disabled readOnly />` com o texto "Para trocar o e-mail, fale com o suporte.". O schema de src/modules/account/actions.ts (profileSchema, linhas 8-11) só aceita name e phone; nenhuma chamada a `auth.updateUser({ email })` no arquivo
  - O que falta: Permitir troca de e-mail com confirmação por link (Supabase envia o e-mail de verificação nativamente) e mostrar o estado verificado/pendente.
  - Impacto: MEDIO · Esforço: M
- **§7.9 Minha conta: tema claro/escuro**
  - Evidência: O painel é dark forçado: src/components/layout/panel-theme.tsx:14-17 adiciona a classe `dark` no `<html>` no mount e a remove ao sair, e o script inline (:19-23) faz o mesmo durante o streaming — não há leitura de preferência. Buscas: `grep -n "next-themes" package.json` = zero; `grep -rln "ThemeToggle|setTheme|useTheme" src/` = zero arquivos; `grep -rn "theme|Tema" src/components/layout/ src/app/(dashboard)/minha-conta/` = zero. src/app/(dashboard)/minha-conta/page.tsx:28-37 renderiza apenas ProfileForm e PasswordForm
  - O que falta: Adicionar preferência de tema persistida (claro/escuro/sistema) e o controle em Minha conta.
  - Impacto: MEDIO · Esforço: M
- **§7.9 Minha conta: sair de outros aparelhos**
  - Evidência: src/modules/auth/actions.ts:113-115 — `signOut()` chama `supabase.auth.signOut()` sem `{ scope: 'global' }`, ou seja, encerra só a sessão local. Busca `grep -rn "outros aparelhos|other devices|scope: 'global'|revoke" src/` retorna zero ocorrências
  - O que falta: Adicionar ação com `signOut({ scope: 'others' })` (ou 'global') e o botão correspondente em Minha conta.
  - Impacto: MEDIO · Esforço: P
- **§7.9 Rótulo visível deve ser "Meu plano NexoBarber", nunca só "Assinatura"**
  - Evidência: src/app/(dashboard)/assinatura/page.tsx:59-62 — `<PageHeader eyebrow="Plano e cobrança" title="Assinatura" ...>`; src/components/layout/user-menu.tsx:74-76 — link rotulado "Assinatura". Busca `grep -rn "Meu plano|meu plano" src/` retorna zero ocorrências. O guia é explícito: "Não usar apenas Assinatura, pois isso se confunde com os planos vendidos aos clientes" — e o produto REALMENTE vende planos a clientes em /planos (dashboard-shell.tsx:102-106, "Planos de clientes"), então a ambiguidade é real
  - O que falta: Trocar o título da página e o item de menu para "Meu plano NexoBarber".
  - Impacto: MEDIO · Esforço: P
- **§7.9 Meu plano: forma de pagamento**
  - Evidência: src/app/(dashboard)/assinatura/page.tsx:202-207 — o próprio texto declara: "O pagamento online (cartão e Pix) ainda não está disponível — estamos finalizando a integração com o provedor… fale com o suporte do NexoBarber". Não há campo, cartão salvo ou meio de pagamento em nenhum ponto da página
  - O que falta: Depende da integração de billing; até lá, ao menos exibir a forma acordada fora do sistema.
  - Impacto: ALTO · Esforço: G
- **§7.9 Meu plano: botão "Gerenciar pagamento"**
  - Evidência: Busca `grep -rn "Gerenciar pagamento|Gerenciar assinatura" src/` retorna zero ocorrências. A página /assinatura (213 linhas) não tem nenhum `<Button>` — só cartões informativos e alertas; a única "ação" é o texto pedindo para falar com o suporte (:202-207)
  - O que falta: Adicionar o botão (portal do provedor de pagamento ou, no interino, atalho direto para o suporte).
  - Impacto: ALTO · Esforço: M
- **G4 — Serviços realizados, clientes atendidos e faturamento gerado por profissional**
  - Evidência: Busca `grep -n "profission" src/app/(dashboard)/relatorios/page.tsx` não retorna nenhuma seção por profissional (só CardTitle genéricos nas linhas 135-149, "Recebimentos por forma de pagamento"). Em src/app/(dashboard)/dashboard/page.tsx as únicas ocorrências de "profission" são links do checklist de ativação (:87, :266-268). A única agregação por profissional no sistema é a base de cálculo de comissão em src/app/(dashboard)/comissoes/page.tsx:94-160, que produz apenas valor de comissão — não contagem de serviços nem de clientes
  - O que falta: É o pilar comercial G4 ("Quem produziu e quanto deve receber?") entregue pela metade: o "quanto deve receber" existe, o "quem produziu" não.
  - Impacto: ALTO · Esforço: G
- **G4 — Carteira de clientes e produtividade por profissional**
  - Evidência: Busca `grep -rn "produtividade|carteira|Ranking" src/` retorna apenas um comentário genérico em src/components/dashboard/bar-list.tsx:6 ("Ranking em barras horizontais"), sem uso por profissional. O sheet do profissional não tem aba Clientes (professional-profile-sheet.tsx, 128 linhas, só foto e bio)
  - O que falta: Sem isso, o §7.7 ("Ao abrir o profissional: … Clientes") e o G4 comercial ficam sem lastro no produto.
  - Impacto: MEDIO · Esforço: G

### Apontado pelo verificador (não coberto na primeira passada)

- Editar os DADOS DA BARBEARIA é impossível, não apenas mal navegado. Ele tratou 'Dados da barbearia' só como uma aba faltando na navegação. A busca `grep -rn 'from("barbershops")' src/modules/` retorna exatamente 2 ocorrências: src/modules/auth/actions.ts:19 (criação no cadastro) e src/modules/settings/actions.ts:165 (apenas `logo_url`). Não existe nenhuma server action que altere nome, slug, endereço ou telefone do negócio depois do onboarding — o slug É o link público divulgado no QR Code, e o dono não consegue mudá-lo. Isso merecia item próprio com impacto ALTO.
- O pilar G4 nunca virou item auditável. Ele cita G4 no resumo mas não classificou nenhum requisito dele. G4 exige 'Serviços realizados, clientes atendidos e faturamento gerado' e 'Carteira de clientes, produtividade e valor devido a cada profissional' (APRESENTACAO_ESTRATEGICA.txt:70,72). Prova de ausência total: `grep -n 'profissional|professional' src/app/(dashboard)/relatorios/page.tsx` retorna ZERO ocorrências — nem os Relatórios têm recorte por profissional. A única visão por profissional em todo o painel é /comissoes.
- G4 'Comissão por serviço, percentual ou valor fixo' não foi checado e é um dos poucos pontos de G4 que EXISTE: src/components/dashboard/service-form-sheet.tsx:152-160 ('Comissão do serviço (%)', campo `commissionRate`) e src/components/dashboard/professional-form.tsx:91-112 (comissão % + salário fixo por profissional). Merecia ATENDIDO/PARCIAL explícito em vez de ficar de fora.
- §7.9 'e-mail com verificação' — ele parou no `disabled readOnly` de account-forms.tsx:59, mas não registrou que o sistema ATIVAMENTE pula a verificação: src/modules/professionals/actions.ts:69 chama `admin.auth.admin.createUser({ ..., email_confirm: true })`, marcando o e-mail do colaborador como verificado sem que ninguém o tenha confirmado. Isso agrava a violação da regra crítica do §7.7.
- Segurança do 'alterar senha' (marcado ATENDIDO sem ressalva): src/modules/account/actions.ts:52-79 troca a senha via `supabase.auth.updateUser({ password })` sem exigir a senha atual e sem reautenticação. Somado à ausência de 'sair de outros aparelhos' (§7.9, também NAO_ATENDIDO), qualquer sessão aberta esquecida assume a conta em definitivo. O item deveria ao menos carregar essa ressalva.
- §7.8 'Pagamentos' — a evidência de ausência está certa, mas falta a nuance: as formas de pagamento existem como constante fixa em src/lib/financial/index.ts:1 (`PAYMENT_METHODS`), consumida em src/components/dashboard/membership-actions.tsx:88 e reservation-actions.tsx:45. Não é que o conceito inexista; é que ele não é configurável pelo dono. O gap correto é 'tornar configurável', não 'criar do zero'.
- Convite/permissões — falta apontar que a rota /usuarios é um `redirect("/profissionais")` (src/app/(dashboard)/usuarios/page.tsx:5-7) enquanto /permissoes continua como página cheia própria com PageHeader 'Permissões' e 'Matriz de acesso' (src/app/(dashboard)/permissoes/page.tsx:44-58) e um botão 'Gerenciar equipe' que aponta de volta para /profissionais (:48-50). O usuário fica em ping-pong entre duas telas para a mesma tarefa — o efeito prático da não-consolidação, que o item de navegação só descreve estruturalmente.

---

## Página pública e fluxo de agendamento (§7.10, §7.11) + pilar G1

A página pública e o fluxo de agendamento são visualmente polidos e tecnicamente sólidos (disponibilidade em tempo real, "Primeiro disponível" via RPC dedicada, referência curta, token de autogestão, rate limit, honestidade sobre o modo de confirmação), mas divergem substancialmente do guia em estrutura e em linguagem. A página pública tem 6 seções, porém a ordem real é capa → serviços → profissionais → produtos → faixa de ambiente (não prevista) → chamada final, e a seção 5 obrigatória (endereço, horário e contato) não existe: endereço e contato ficam apenas no rodapé e `openingHours` nunca é renderizado em lugar nenhum do app. Os rótulos de ação exigidos pelo guia estão ausentes — "Escolher este serviço" não existe no código e "Agendar com {nome}" fica com `opacity-0` até o hover, ou seja, invisível em qualquer aparelho de toque. O fluxo tem no máximo 5 etapas, não 7: pagamento e "Confira e confirme" não existem, "Seus dados" abre por Nome (e não por WhatsApp), não há reconhecimento de cliente recorrente pelo telefone e não há botão "Pular esta etapa". O layout de duas colunas com resumo fixo à direita no desktop não existe (formulário em coluna única `max-w-2xl`), e no celular não há "Ver resumo" nem botão "Continuar". A tela final usa "Reserva confirmada!"/"Solicitação enviada!" em vez dos textos exigidos "Horário confirmado"/"Pedido de horário enviado", não mostra pagamento, e "Adicionar ao calendário" é link do Google Calendar — arquivo .ics não existe no repositório. Remarcar não é remarcar: é um link que manda o cliente cancelar e reservar de novo. O ponto mais forte é a honestidade da promessa: o modo manual nunca promete confirmação imediata, e a regra de visibilidade `audience` (public/members/internal) existe de verdade e é aplicada nas três RPCs públicas.

### Atendido (11)

- **§7.10 Capa curta com nome, benefício e botão "Agendar horário"**
  - Evidência: src/app/(public)/[tenant]/page.tsx:100-114 — h1 com `heroTitle`, subtítulo com `heroSubtitle`, botão sólido "Agendar horário" (linha 113) apontando para `/${tenant}/agendar`.
- **§7.10 Um botão principal sólido e um secundário para WhatsApp**
  - Evidência: src/app/(public)/[tenant]/page.tsx:108-125 — botão sólido "Agendar horário" (bg-[var(--tenant-secondary)]) seguido de link secundário com borda "WhatsApp", renderizado só quando `whatsAppHref` existe.
- **§7.10 Serviços com preço e duração claramente visíveis**
  - Evidência: src/app/(public)/[tenant]/page.tsx:243-251 — duração com ícone Clock3 (`{service.durationMinutes} min`) e preço formatado em BRL em fonte mono destacada na cor primária do tenant.
- **§7.10 Rodapé compacto**
  - Evidência: src/components/public-site/public-footer.tsx:17-90 — 92 linhas, uma faixa `py-12` com bloco de contato + CTA e uma linha inferior de copyright/links legais. Sem colunas múltiplas nem sitemap.
- **§7.11 Etapa 2 deve incluir "Primeiro disponível"**
  - Evidência: src/components/public-site/booking-form.tsx:511-535 — chip "⚡ Primeiro disponível" exibido quando `availableProfessionals.length > 1`; usa endpoint dedicado src/app/api/public/[tenant]/first-available/route.ts e o profissional real é resolvido junto com o horário escolhido (booking-form.tsx:264-271).
- **"Nunca prometer confirmação na hora quando a reserva entra como pendente"**
  - Evidência: O modo real é lido do banco e propagado: `bookingConfirmationMode` em supabase/migrations/202607240023_fase1_regras_agendamento_expediente.sql:65; a página pública (src/app/(public)/[tenant]/page.tsx:135-137) e a de agendamento (src/app/(public)/[tenant]/agendar/page.tsx:82-84) só mostram "Confirmação imediata" quando o modo é "auto", caindo em `copy.confirmationChip` = "A barbearia confirma seu horário" (src/lib/verticals.ts:50) caso contrário. Na tela final o status vem do servidor, não de suposição: booking-form.tsx:319 `setFinalStatus(result.status ?? "pending")`, alimentado por create_public_appointment que grava 'confirmed' só quando confirmation_mode = 'auto' (202607240024:479-482).
  - O que falta: Ressalva de linguagem: §8.1 pede "Horário confirmado automaticamente" no lugar de "Confirmação na hora"; o código usa "Confirmação imediata", que é sinônimo mas não o termo padronizado.
- **Tela final deve exibir número da reserva**
  - Evidência: src/components/public-site/booking-form.tsx:382-384 — linha "Referência" com o `public_reference` devolvido pela API (src/app/api/public/[tenant]/appointments/route.ts:53), sem expor UUID interno.
- **Tela final deve exibir serviço, profissional, data e hora, valor**
  - Evidência: src/components/public-site/booking-form.tsx:389-417 — Serviço (389), Profissional (390-393), "Quando" com dia da semana/dia/mês e hora no fuso da barbearia (394-404), produtos do carrinho (405-411) e Total em destaque (412-417).
- **Tela final deve permitir falar com a barbearia**
  - Evidência: src/components/public-site/booking-form.tsx:430-440 — botão com ícone MessageCircle e rótulo `copy.talkToBusiness` ("Falar com a barbearia" / "Falar com o salão", src/lib/verticals.ts:52 e 67), renderizado quando há WhatsApp configurado.
- **Página /[tenant]/reserva/[token]: permitir CANCELAR**
  - Evidência: src/app/(public)/[tenant]/reserva/[token]/page.tsx:145-147 renderiza CancelReservationButton quando a reserva está ativa e `canCancel`; src/components/public-site/cancel-reservation-button.tsx:25-53 exige dois toques (armar + "Confirmar cancelamento") e chama a server action `cancelPublicReservation`. O prazo de antecedência é respeitado (campo `cancellationNoticeMinutes`/`canCancel` vindo de get_public_appointment) e há mensagem clara quando o prazo passou (page.tsx:148-153). O token é validado por formato antes da consulta (page.tsx:63) e conferido contra o slug (linha 71).
- **G1 (apresentação estratégica): "Página própria de agendamento com serviço, profissional, dia e horário"**
  - Evidência: Fluxo completo em src/components/public-site/booking-form.tsx (serviço 461, profissional 509, dia+horário 574) com disponibilidade real do servidor (src/app/api/public/[tenant]/availability/route.ts e first-available/route.ts) e validação transacional no banco — expediente, bloqueios de agenda, antecedência e horizonte são reconferidos em create_public_appointment (supabase/migrations/202607240024_fase2_agenda_operacional.sql:399-444), com exclusion constraint arbitrando conflito (linhas 528-530).

### Parcial (16)

- **§7.10 Ordem obrigatória das seções: 1 capa, 2 serviços, 3 profissionais, 4 produtos, 5 endereço/horário/contato, 6 chamada final**
  - Evidência: src/app/(public)/[tenant]/page.tsx — hero (linha 71), Serviços (203), Profissionais (266), Produtos (328), faixa de ambiente parallax (393, não prevista no guia), CTA final (427), PublicFooter (453). A seção 5 (endereço/horário/contato) não existe como seção da página.
  - O que falta: Criar a seção 5 dedicada com endereço, horário de funcionamento e contato entre Produtos e a chamada final; ou reposicionar o conteúdo do rodapé. Avaliar se a faixa de ambiente permanece (é uma sétima seção não prevista).
  - Impacto: MEDIO · Esforço: P
- **§7.10 Foto de fundo com camada escura de 55% a 70%**
  - Evidência: O hero NÃO usa foto de fundo full-bleed — usa orbs desfocados (page.tsx:73-82) e a foto num painel lateral com gradiente `from-black/60` (page.tsx:161), que é gradiente, não camada uniforme. A única camada uniforme dentro da faixa exigida é a da seção de ambiente: page.tsx:409 `bg-black/55`. Já o fundo de imagem configurável do tenant usa 82%: src/lib/colors.ts:56 `const overlay = withAlpha(settings.backgroundColor, 0.82);` (espelhado em src/components/dashboard/appearance-editor.tsx:110).
  - O que falta: Reduzir o overlay do fundo por imagem de 0.82 para a faixa 0.55–0.70 em src/lib/colors.ts:56 e no preview do editor (appearance-editor.tsx:110); decidir se o hero deve virar foto de fundo com overlay conforme o guia.
  - Impacto: MEDIO · Esforço: P
- **§7.10 Cada profissional possui "Agendar com este profissional"**
  - Evidência: src/app/(public)/[tenant]/page.tsx:314-320 — existe "Agendar com {primeiro nome}", mas com `opacity-0 transition-opacity group-hover:opacity-100` (linha 316): fica invisível até o hover, o que nunca acontece em celular/tablet. Além disso o href é `/${tenant}/agendar` sem parâmetro de profissional, e a página de agendamento só lê `searchParams: { servico?: string }` (src/app/(public)/[tenant]/agendar/page.tsx:31), então o profissional não é pré-selecionado.
  - O que falta: Remover o `opacity-0` (tornar o CTA sempre visível) e passar `?profissional={id}` no href, aceitando o parâmetro em agendar/page.tsx e em BookingForm (analogamente a `initialServiceId`).
  - Impacto: ALTO · Esforço: P
- **§7.10 Serviço de assinatura não aparece por R$ 0,00 para qualquer visitante — deve haver regra de visibilidade Público/Assinantes/Interno**
  - Evidência: A regra EXISTE e é real: coluna `services.audience` com check ('public','members','internal') em supabase/migrations/202607230022_fase0_verdade_financeira.sql:346-347, aplicada em get_public_barbershop (202607240023:75 `and sv.audience = 'public'`), em get_public_availability (202607240023:143) e em create_public_appointment (202607240024:392). UI no painel: src/components/dashboard/service-form-sheet.tsx:239-251 ("Quem pode ver e agendar") e badges em src/app/(dashboard)/servicos/page.tsx:116-119. PORÉM não há trava de preço zero: src/lib/validators/entities.ts:9 aceita `price: z.coerce.number().min(0)` e nem a RPC nem a UI filtram `price = 0` para audience='public'.
  - O que falta: Adicionar guarda contra R$ 0,00 no catálogo público (filtro na RPC, ou aviso no formulário quando audience='public' e preço = 0). A correção anterior foi feita à mão no dado de demo (docs/entregas/fase-0.md:32), não no código.
  - Impacto: MEDIO · Esforço: P
- **§7.11 O fluxo deve ter 7 etapas**
  - Evidência: src/components/public-site/booking-form.tsx — etapa 1 Serviço (linha 461), 2 Profissional (509), 3 Dia e horário (574), 4 Produtos (675, só se `showUpsell` = isPlus && products.length, linha 124), 5 Seus dados (733, numerada `showUpsell ? 5 : 4`). Máximo de 5 etapas; 4 quando o tenant não é Plus ou não tem produtos.
  - O que falta: Faltam as etapas 6 (Pagamento) e 7 (Confira e confirme). Ver itens específicos abaixo.
  - Impacto: ALTO · Esforço: G
- **§7.11 Etapa 5 "Quer adicionar algo?" com botão visível "Pular esta etapa"**
  - Evidência: A etapa existe (src/components/public-site/booking-form.tsx:672-728) mas o título é "Quer levar um produto?" (linha 676) e a única sinalização de opcionalidade é o texto "opcional" em cinza no StepTitle (linhas 678 e 856-858). `grep -rn "Pular" src/` → zero resultados em todo o src.
  - O que falta: Adicionar botão explícito "Pular esta etapa" que avance o foco/scroll para "Seus dados".
  - Impacto: MEDIO · Esforço: P
- **§7.11 Desktop: etapas numeradas no topo, com número e nome**
  - Evidência: src/components/public-site/booking-form.tsx:838-861 — o componente StepTitle numera cada seção (círculo com o número + título), mas inline no corpo da página. Não existe stepper/trilha no topo mostrando as etapas e o progresso; e a numeração é dinâmica (`showUpsell ? 5 : 4`, linha 733), então o total de etapas varia sem ser comunicado.
  - O que falta: Adicionar indicador de etapas no topo do fluxo com número, nome e estado (concluída/atual/pendente).
  - Impacto: MEDIO · Esforço: M
- **§7.11 Celular: botão "Continuar" fixo na parte inferior**
  - Evidência: Existe barra fixa inferior (booking-form.tsx:803 `sticky bottom-3`), mas o botão é "Reservar" (linha 829), do tipo submit, desabilitado até haver `slot` (linha 821). `grep -rn "Continuar" src/components/public-site/` → zero resultados. O avanço entre etapas não é feito por botão, e sim por auto-scroll ao clicar numa opção.
  - O que falta: Introduzir botão "Continuar" fixo que avance etapa a etapa, reservando "Reservar/Confirmar" apenas para a etapa final.
  - Impacto: MEDIO · Esforço: M
- **Tela final deve exibir situação**
  - Evidência: src/components/public-site/booking-form.tsx:385-388 — o valor está correto ("Confirmada"/"Aguardando confirmação"), mas o rótulo é `label="Status"`. §8.1 do guia manda trocar "Status" por "Situação". Mesmo problema em src/app/(public)/[tenant]/reserva/[token]/page.tsx:118.
  - O que falta: Renomear o rótulo para "Situação" nos dois arquivos.
  - Impacto: BAIXO · Esforço: P
- **Tela final deve permitir ADICIONAR AO CALENDÁRIO (.ics)**
  - Evidência: O botão existe (src/components/public-site/booking-form.tsx:419-429), mas o href é um link de template do Google Calendar montado em memória (linhas 352-364: `https://calendar.google.com/calendar/render?action=TEMPLATE...`). Arquivo .ics não existe: `grep -rn "\.ics|text/calendar|BEGIN:VCALENDAR|VEVENT" src/ supabase/` e `grep -rln "VCALENDAR"` em todo o repo (fora node_modules) → zero resultados.
  - O que falta: Gerar um .ics (rota ou data URI com text/calendar) para atender iPhone/Apple Calendar e Outlook, mantendo o link do Google como alternativa. Hoje boa parte dos clientes não consegue salvar o horário.
  - Impacto: MEDIO · Esforço: P
- **Tela final deve permitir REAGENDAR**
  - Evidência: src/components/public-site/booking-form.tsx:441-451 — texto discreto (`text-xs opacity-60`) "Precisa mudar? Cancelar ou remarcar esta reserva" apontando para `/${tenant}/reserva/${manageToken}`. Na página de destino, "remarcar" é apenas um <Link> para /agendar rotulado "Remarcar: cancele e reserve um novo horário" (src/app/(public)/[tenant]/reserva/[token]/page.tsx:162-169) — não move o horário, não cancela o antigo e não pré-carrega nada. A decisão está registrada como consciente em docs/entregas/fase-2.md:28-29 e no comentário do arquivo (linhas 49-53).
  - O que falta: Implementar remarcação real no público (a RPC `reschedule_appointment` já existe para o painel, citada em docs/entregas/fase-2.md:15) ou, no mínimo, encadear cancelar→reservar preservando serviço e profissional. Também elevar a ênfase do link na tela final, hoje quase invisível.
  - Impacto: ALTO · Esforço: M
- **Tela final deve permitir cancelar**
  - Evidência: Não há botão de cancelar na tela final — apenas o link `text-xs opacity-60` (booking-form.tsx:441-451) que leva à página do token, onde o cancelamento real acontece.
  - O que falta: Expor "Cancelar" como ação de baixa ênfase mas visível na tela final, e não escondido em texto de 12px com 60% de opacidade.
  - Impacto: BAIXO · Esforço: P
- **Página /[tenant]/reserva/[token]: mesma completude de dados da tela final (pagamento, calendário)**
  - Evidência: src/app/(public)/[tenant]/reserva/[token]/page.tsx:116-136 mostra Status, Serviço, Profissional, Quando e Valor estimado. Não mostra pagamento nem oferece "Adicionar ao calendário" (nenhuma ocorrência de calendarHref nesse arquivo), diferente da tela de sucesso.
  - O que falta: Alinhar as duas telas: adicionar calendário e pagamento, e trocar o rótulo "Status" (linha 118) por "Situação".
  - Impacto: BAIXO · Esforço: P
- **Rotas /servicos, /profissionais, /produtos devem ser destinos públicos úteis**
  - Evidência: As três são redirects de 9 linhas para âncoras da home: src/app/(public)/[tenant]/servicos/page.tsx redireciona para `/${tenant}#servicos`, profissionais/page.tsx para `#profissionais`, produtos/page.tsx para `#produtos`. Coerente com a página única do guia, mas o link "Ver todos" dos produtos (src/app/(public)/[tenant]/page.tsx:343-348) leva de volta à mesma seção que já mostra no máximo 6 itens (linha 352 `.slice(0, 6)`), então quem tem 7+ produtos nunca vê o restante.
  - O que falta: Ou transformar /produtos numa listagem real, ou remover o "Ver todos" quando não houver mais itens que os exibidos.
  - Impacto: BAIXO · Esforço: P
- **G1: resultado prometido "mais organização e MENOS MENSAGENS"**
  - Evidência: A promessa se sustenta no modo automático, mas no modo manual (padrão — `else 'pending'` em supabase/migrations/202607240024_fase2_agenda_operacional.sql:481) a jornada empurra o cliente de volta ao WhatsApp por três caminhos: a nota da tela final ("A barbearia vai confirmar seu horário", src/lib/verticals.ts:48), a ausência de remarcação real (reserva/[token]/page.tsx:162-169) e a mensagem de prazo esgotado ("fale direto pelo WhatsApp", linha 151). Não há lembrete/confirmação automática ao cliente no código público — o único canal é o link de WhatsApp manual.
  - O que falta: Fechar o ciclo sem intervenção humana: notificar o cliente quando a barbearia confirmar, e permitir remarcar sozinho. Sem isso, o pilar G1 entrega a agenda mas não a redução de mensagens prometida na venda.
  - Impacto: ALTO · Esforço: G
- **§7.10 Título curto na capa**
  - Evidência: src/app/(public)/[tenant]/page.tsx:100-102 renderiza `data.settings.heroTitle` livremente, com `text-balance` e tamanhos até `lg:text-7xl`. O conteúdo é definido pelo dono no painel e não há limite de caracteres que garanta o "título curto"; o modelo (src/types/domain.ts:76) é apenas string.
  - O que falta: Impor limite de caracteres (ou aviso) no editor de aparência para preservar a composição da capa.
  - Impacto: BAIXO · Esforço: P

### Não atendido (15)

- **§7.10 seção 5 deve mostrar HORÁRIO de funcionamento**
  - Evidência: `grep -rn "openingHours" src/` retorna 1 única ocorrência: src/types/domain.ts:82 (declaração do tipo). A RPC entrega o dado (supabase/migrations/202607240023_fase1_regras_agendamento_expediente.sql:64 `'openingHours', s.opening_hours`), mas nenhum componente o consome. O rodapé (src/components/public-site/public-footer.tsx:24-53) mostra só endereço, WhatsApp e Instagram.
  - O que falta: Renderizar `data.settings.openingHours` na página pública. O dado já vem do banco — falta só a UI.
  - Impacto: ALTO · Esforço: P
- **§7.10 Cada cartão de serviço possui "Escolher este serviço"**
  - Evidência: `grep -rn "Escolher este\|Escolher serviço\|Escolher o serviço" src/` → zero resultados. Em src/app/(public)/[tenant]/page.tsx:217-256 o cartão inteiro é um <Link> cuja única affordance é um ícone ArrowRight num círculo (linha 252-254), sem rótulo textual.
  - O que falta: Adicionar rótulo visível "Escolher este serviço" em cada linha da lista de serviços (o guia exige ícone sempre acompanhado de rótulo em ações importantes).
  - Impacto: MEDIO · Esforço: P
- **§7.10 Produto sem foto usa miniatura pequena padronizada, não uma grande área vazia**
  - Evidência: src/app/(public)/[tenant]/page.tsx:359-373 — o contêiner é `aspect-[4/3]` de largura total do cartão (mín. 240px no desktop, 62vw no celular); sem `imageUrl` ele renderiza apenas `<ShoppingBag className="size-8 opacity-30" />` centralizado, ou seja, exatamente a "grande área vazia" que o guia proíbe.
  - O que falta: Trocar por miniatura pequena padronizada (ex.: quadrado de 56–64px como já é feito nos serviços em page.tsx:232-234) quando não houver foto, ou usar imagem de placeholder padronizada.
  - Impacto: MEDIO · Esforço: P
- **§7.10 Produto sem estoque aparece como "Indisponível" ou fica oculto**
  - Evidência: O tipo PublicProduct (src/types/domain.ts:51-57) sequer tem campo de estoque. A RPC filtra só por `pd.active and pd.public_visible and b.plan = 'plus'` (supabase/migrations/202607240023_fase1_regras_agendamento_expediente.sql:96-97), sem consultar saldo. `grep -rn "Indisponível" src/` só acha src/app/(dashboard)/profissionais/page.tsx:112 (contexto de profissional, não produto). Pior: create_public_appointment também não valida saldo ao materializar o upsell — supabase/migrations/202607240024_fase2_agenda_operacional.sql:495-503 checa apenas `pd.active and pd.public_visible`, então o cliente consegue reservar um produto esgotado.
  - O que falta: Expor saldo em get_public_barbershop, ocultar ou marcar "Indisponível" na página e no passo de upsell do BookingForm, e adicionar checagem de estoque em create_public_appointment (a trava INSUFFICIENT_STOCK já existe para vendas em 202607080016_stock_check_on_sale.sql, mas não é aplicada aqui).
  - Impacto: ALTO · Esforço: M
- **§7.11 Etapa 4 "Seus dados": WhatsApp PRIMEIRO**
  - Evidência: src/components/public-site/booking-form.tsx:735-757 — a ordem real é Nome (735-745), depois WhatsApp (746-757), depois E-mail (758-768) e Observação (769-777).
  - O que falta: Inverter os dois primeiros blocos para que WhatsApp seja o primeiro campo (é ele que destrava o reconhecimento do cliente recorrente).
  - Impacto: MEDIO · Esforço: P
- **§7.11 Etapa 4: reconhecer cliente recorrente e preencher nome automaticamente**
  - Evidência: `grep -rn "lookup|byPhone|by_phone|recorrente|existing_client|find_client" src/app/api/public/ src/components/public-site/ src/modules/public-booking/` → zero resultados. O campo phone (booking-form.tsx:748-756) não tem onBlur/onChange que consulte o servidor, e não existe rota pública de consulta por telefone (só existem appointments, availability e first-available em src/app/api/public/[tenant]/). O banco já normaliza e deduplica por telefone (supabase/migrations/202607240024_fase2_agenda_operacional.sql:447 `on conflict (barbershop_id, phone_normalized)`), mas o cliente nunca é reconhecido na tela — pior, o upsert sobrescreve o nome cadastrado com o que for digitado (linha 449 `name = excluded.name`).
  - O que falta: Criar rota pública de lookup por telefone normalizado (devolvendo só o primeiro nome, sem PII adicional, com rate limit) e preencher nome/e-mail automaticamente exibindo algo como "Que bom te ver de novo, João".
  - Impacto: ALTO · Esforço: M
- **§7.11 Etapa 6 Pagamento (pagar no local ou forma disponível)**
  - Evidência: `grep -rn "pagar no local|paymentMethod|forma de pagamento|payment_method" src/components/public-site/ src/app/(public)/ src/app/api/public/ src/modules/public-booking/` → zero resultados. O payload enviado ao servidor (booking-form.tsx:294-306) não tem campo de pagamento, e create_public_appointment (202607240024:337-346) não recebe forma de pagamento.
  - O que falta: Adicionar etapa de pagamento, mesmo que apenas informativa ("pagar no local"), persistindo a escolha na reserva. Exige assinatura nova da RPC.
  - Impacto: ALTO · Esforço: G
- **§7.11 Etapa 7 "Confira e confirme"**
  - Evidência: `grep -rn "Confira e confirme|Confirme os dados|Revise" src/components/public-site/ src/app/(public)/` → zero resultados. Não existe tela de revisão: o botão de submit "Reservar" fica na barra sticky (booking-form.tsx:819-830) logo abaixo do formulário de dados, e o único resumo é a linha truncada da barra (linha 806-817).
  - O que falta: Adicionar etapa final de revisão com serviço, profissional, dia/hora, produtos, valor e pagamento antes do envio.
  - Impacto: ALTO · Esforço: M
- **§7.11 Desktop: conteúdo à esquerda + RESUMO FIXO à direita**
  - Evidência: src/app/(public)/[tenant]/agendar/page.tsx:56 — contêiner único `mx-auto max-w-2xl`, sem grid de duas colunas em nenhum breakpoint. O resumo é uma barra horizontal `sticky bottom-3` (booking-form.tsx:803) idêntica em mobile e desktop; não há nenhuma classe `lg:` que a mova para a lateral.
  - O que falta: No desktop, mudar para grid de 2 colunas com resumo persistente (sticky) na coluna direita mostrando serviço, profissional, dia/hora, produtos e total.
  - Impacto: ALTO · Esforço: M
- **§7.11 Celular: uma decisão por tela**
  - Evidência: src/components/public-site/booking-form.tsx:458 — `<form className="space-y-9">` com todas as etapas empilhadas na mesma página; cada seção é revelada condicionalmente conforme o preenchimento (linhas 507, 572, 672, 731) e o avanço é feito via `scrollToStep` (linhas 217-226). É uma página longa com revelação progressiva, não uma decisão por tela.
  - O que falta: Converter para navegação por tela (uma etapa visível por vez no breakpoint mobile), preservando o histórico/voltar.
  - Impacto: MEDIO · Esforço: G
- **§7.11 Celular: resumo recolhido em "Ver resumo"**
  - Evidência: `grep -rn "Ver resumo" src/` → zero resultados. A barra sticky (booking-form.tsx:804-818) mostra uma linha truncada (`truncate text-xs`) com nome do serviço, horário e contagem de produtos, sem nenhum controle para expandir e ver o detalhe.
  - O que falta: Tornar a barra sticky expansível com "Ver resumo", detalhando serviço, profissional, data/hora, produtos e total.
  - Impacto: MEDIO · Esforço: P
- **Tela final, modo automático: texto deve ser "Horário confirmado"**
  - Evidência: src/components/public-site/booking-form.tsx:371-373 — `{confirmed ? "Reserva confirmada!" : "Solicitação enviada!"}`. §8.1 do guia manda substituir "Reserva enviada" por "Horário confirmado ou Pedido de horário enviado".
  - O que falta: Trocar o texto para "Horário confirmado" e usar a subfrase natural do guia (ex.: "Terça-feira, 15h, com João") em vez de "Seu horário está garantido. Guarde os detalhes:" (linha 376).
  - Impacto: MEDIO · Esforço: P
- **Tela final, modo manual: texto deve ser "Pedido de horário enviado"**
  - Evidência: src/components/public-site/booking-form.tsx:372 — o ramo pendente exibe "Solicitação enviada!". A subfrase usa `copy.confirmationNote` = "A barbearia vai confirmar seu horário. Guarde os detalhes:" (src/lib/verticals.ts:47-48).
  - O que falta: Trocar o título para "Pedido de horário enviado" e a subfrase para algo como "A barbearia vai responder pelo WhatsApp".
  - Impacto: MEDIO · Esforço: P
- **Tela final deve exibir pagamento**
  - Evidência: src/components/public-site/booking-form.tsx:381-418 — o <dl> não tem nenhuma linha de pagamento, coerente com a ausência da etapa 6 (nenhuma ocorrência de forma de pagamento no fluxo público, confirmado por grep).
  - O que falta: Depende de implementar a etapa 6; depois exibir a forma escolhida (ex.: "Pagar no local").
  - Impacto: MEDIO · Esforço: M
- **Página /[tenant]/reserva/[token]: permitir REMARCAR**
  - Evidência: src/app/(public)/[tenant]/reserva/[token]/page.tsx:162-169 — o único elemento é um <Link href={`/${tenant}/agendar`}> com o texto "Remarcar: cancele e reserve um novo horário". Nenhuma ação de remarcação é disparada; o cliente precisa cancelar manualmente antes e refazer todo o fluxo do zero (serviço, profissional, dia, hora, dados).
  - O que falta: Implementar remarcação de verdade (reusar `reschedule_appointment`), ou ao menos um fluxo guiado que cancele e reabra o formulário já com serviço/profissional preenchidos.
  - Impacto: ALTO · Esforço: M

### Apontado pelo verificador (não coberto na primeira passada)

- Seções de conteúdo do site público (`public_site_sections`) — a RPC entrega o array (supabase/migrations/202607240023_fase1_regras_agendamento_expediente.sql:100-108) e o tipo declara `sections` (src/types/domain.ts:90), mas `grep -rn "sections" src/` devolve UMA única linha, a do próprio tipo: nenhum componente renderiza. É um CMS de seções morto — e seria justamente o mecanismo natural para a seção 5 (endereço/horário/contato) que ele apontou como ausente. Ele não checou.
- As três subrotas do escopo (/[tenant]/servicos, /profissionais, /produtos) não foram auditadas em nenhum item. Verifiquei: as três são arquivos de 8 linhas com `redirect()` para âncoras da home (src/app/(public)/[tenant]/servicos/page.tsx, .../profissionais/page.tsx, .../produtos/page.tsx). Consequência concreta não detectada: o link "Ver todos" da seção Produtos (src/app/(public)/[tenant]/page.tsx:343-348) aponta para `/${tenant}/produtos`, que redireciona de volta para `/${tenant}#produtos` — um CTA que devolve o visitante ao mesmo carrossel de 6 itens (page.tsx:352 `slice(0, 6)`), sem nunca mostrar o catálogo completo.
- Pilar G1 da apresentação estratégica não é mencionado uma única vez no relatório, apesar de estar no escopo. Verificação minha: G1 promete "página própria de agendamento com serviço, profissional, dia e horário" (atendido) e "confirmações, lembretes, cancelamentos"; os lembretes têm lastro real em src/app/api/cron/reminders/route.ts:19-25 e src/modules/settings/actions.ts:130 (`whatsapp_reminders_enabled`), o que importa porque a tela pública promete ao cliente que os dados serão usados "para confirmar e lembrar este horário" (src/components/public-site/booking-form.tsx:778-780) — promessa que só se sustenta com o cron ligado.
- Regra §7.10 "Título curto" — item explícito da lista de regras visuais do guia, ausente do relatório. `heroTitle` aceita até 120 caracteres (src/modules/settings/actions.ts:15) e é renderizado em `text-[2.75rem] ... lg:text-7xl` sem `line-clamp` (src/app/(public)/[tenant]/page.tsx:100-102).
- Contradição na página de autogestão: o link "Remarcar: cancele e reserve um novo horário" é renderizado apenas sob a condição `active` (src/app/(public)/[tenant]/reserva/[token]/page.tsx:162-169), sem checar `canCancel`. Quando o prazo passou, a página exibe "O prazo para cancelar online já passou" (linhas 148-153) e, três linhas abaixo, manda o cliente cancelar. Ele classificou cancelar como ATENDIDO sem notar isso.
- A regra "produto sem foto usa miniatura pequena padronizada" foi checada só na home; no passo de upsell do fluxo (src/components/public-site/booking-form.tsx:684-695) os produtos não têm imagem NENHUMA — apenas nome e preço —, então a etapa 5 vende produto sem mostrar produto. Também não foi checado o estado duplo de seleção no passo 2: ao escolher horário no modo "Primeiro disponível", `professionalId` é preenchido (booking-form.tsx:267-269) sem zerar `firstAvailable`, deixando o chip ⚡ (linha 514) e o chip do profissional (linha 537) ambos com `aria-pressed="true"`.

---

## Mobile, acessibilidade e gráficos (§6, §10, §12)

O sistema tem uma base mobile parcialmente correta — barra inferior de navegação com alvos de 48px, margem lateral de 16px, padding inferior que não deixa o conteúdo sob a barra, e dois blocos do Financeiro que viram cartões no celular — mas falha nos fundamentos de toque: o Button não tem nenhum tamanho ≥44px (default h-8=32px, lg h-9=36px, sm h-7=28px usado 52 vezes) e o Input tem h-8=32px, então praticamente todo controle do painel viola §5.1/§5.2/§12. Encontrei um bug de especificidade CSS confirmado empiricamente: os 8 sheets de formulário passam `w-full sm:max-w-md`, mas `data-[side=right]:w-3/4` em src/components/ui/sheet.tsx:65 tem especificidade (0,2,0) contra (0,1,0) do `w-full` e vence — os formulários abrem com 75% da largura (270px em 360px), nunca em tela inteira. Em gráficos o quadro é pior: existem apenas dois "gráficos" (barras empilhadas mensais e listas de barras); nenhum usa a paleta fixa por significado do §6.1 (o chart mensal hardcoda azul #2a78d6 e verde #1baf7a), os tokens --chart-1..5 do globals.css nunca são referenciados por nenhum componente, não existe mapa de calor de movimento, não existe nenhum tooltip em nenhum gráfico (o componente Tooltip está instalado e o Provider montado, mas nunca usado) e a alternativa textual se resume a uma linha de total. Nos critérios de aceite, os pontos que você pediu atenção especial dão: foco de teclado PARCIAL (primitivos shadcn têm ring explícito, ~116 controles crus dependem do outline padrão do navegador), rótulos acima dos campos PARCIAL (há Inputs só com aria-label/placeholder), idempotência ATENDIDA e comprovada no banco (exclusion constraint gist em appointments, índice único de receita por atendimento, unique de telefone por barbearia) mais `disabled={pending}` no cliente, estado vazio NÃO ATENDIDO (o EmptyState nem aceita prop de ação) e rolagem horizontal de tabelas NÃO ATENDIDA (5 telas essenciais com 4–7 colunas e whitespace-nowrap). Contraste de texto passa folgado no tema escuro (4,8:1 a 17,9:1), mas o contraste de borda de controle falha: --border/--input = #2C3948 sobre card #141B24 dá 1,47:1 contra os 3:1 exigidos — o token --border-control #5B6B7D do guia não foi criado. `npx tsc --noEmit` passa sem erros e sem alterar arquivos.

### Atendido (11)

- **§10 — Margem lateral de 16px no mobile**
  - Evidência: src/components/layout/dashboard-shell.tsx:265: `<main className="mx-auto max-w-[1500px] p-4 pb-24 sm:p-6 sm:pb-24 lg:p-8">` — p-4 = 16px em todas as telas do painel. O header também usa `px-4 ... sm:px-6` (dashboard-shell.tsx:236).
- **§10 — Não colocar dois botões principais lado a lado**
  - Evidência: Varri todos os .tsx com script Python procurando dois `<Button>` sem prop `variant` (ou seja, variant default/dourado) adjacentes dentro de 400 caracteres: zero ocorrências. Os pares que existem são sempre primário+ghost ou outline+destrutivo (ex.: src/app/(dashboard)/financeiro/page.tsx:483 'Receber' default + :494-500 'Cancelar venda' ghost; src/components/dashboard/delete-entity-button.tsx:64/67 AlertDialogCancel + destructive).
- **§10 — Resumo financeiro mostra no máximo dois cartões por linha no mobile**
  - Evidência: src/app/(dashboard)/dashboard/page.tsx:415 e :443 usam `grid gap-4 sm:grid-cols-2 xl:grid-cols-4` (1 coluna abaixo de 640px); src/app/(dashboard)/financeiro/page.tsx:403 usa `grid gap-4 sm:grid-cols-2 xl:grid-cols-3`; src/app/(dashboard)/relatorios/page.tsx:128 idem. Nenhum grid do painel abre com 3+ colunas na base — o único `grid-cols-2` sem prefixo é dashboard/page.tsx:564 (atalhos rápidos), que respeita o limite.
- **§10 — Nenhum gesto de arrastar como única forma de concluir uma ação**
  - Evidência: `grep -rn "draggable|onDrag|dragstart|touchstart|onTouchStart|swipe" src --include=*.tsx` não retorna nada. Os únicos `overflow-x-auto` de conteúdo (carrossel de dias em manual-appointment-sheet.tsx:338, reschedule-sheet.tsx:129, booking-form.tsx:575) são rolagem, não arraste como confirmação — e cada item é um <button> clicável.
- **§6.3 — O que não usar (3D, pizza com muitas fatias, arco-íris, só cor para diferenciar séries, animação longa, valores sem unidade)**
  - Evidência: Não há 3D nem pizza (`grep -rln "<svg|viewBox" src` → só monthly-revenue-chart.tsx). O chart mensal diferencia séries por cor E por rótulo direto do total + legenda nomeada (monthly-revenue-chart.tsx:42-57, :104-114) — o próprio comentário do arquivo (:16-18) registra a decisão. Os valores usam formatBRL/Intl com R$ (bar-list.tsx:26). Animações longas só existem na landing pública, com `prefers-reduced-motion` respeitado (src/app/globals.css:281-300).
- **§12 — O título explica claramente onde o usuário está**
  - Evidência: src/components/layout/page-header.tsx:20 renderiza um <h1> `text-3xl` em todas as telas, com eyebrow de contexto (:16) e descrição (:21). Ex.: agenda/page.tsx:206-209 ('Operação' / 'Agenda' / 'Confirme, conclua, remarque ou cancele os atendimentos.'), financeiro/page.tsx:366-369 (inclui o mês vigente na descrição).
- **§12 — Texto comum tem contraste mínimo de 4,5:1**
  - Evidência: Calculei WCAG 2.x sobre os tokens de src/app/globals.css:98-133 (tema escuro do painel): foreground #F4F7FA sobre background #0B0F14 = 17,88:1; muted-foreground #9FB0C1 sobre background = 8,65:1, sobre card #141B24 = 7,80:1, sobre popover #1B2531 = 6,97:1; primary #F2B84B sobre background = 10,74:1; primary-foreground #0B0F14 sobre primary = 10,74:1; destructive #F87171 = 6,95:1; success #34D399 = 10,00:1; warning #FBBF24 = 11,51:1. Textos do gráfico: ink #C3C2B7 sobre card = 9,67:1, muted #898781 = 4,82:1.
- **§12 — Cor nunca é a única forma de indicar situação**
  - Evidência: src/components/dashboard/appointment-status-badge.tsx:5-28 associa cada cor a um rótulo textual ('Pendente', 'Confirmado', 'Concluído', 'Cancelado', 'Não compareceu') e o Badge sempre renderiza `{entry.label}` (:46-48). Idem em serviços (src/app/(dashboard)/servicos/page.tsx:117-124: 'Visível'/'Oculto'/'Assinantes'/'Interno'). O gráfico usa legenda nomeada + rótulo de valor direto (monthly-revenue-chart.tsx:42-57, 104-114).
- **§12/§5.2 — Erros explicam como corrigir**
  - Evidência: src/lib/errors/index.ts:3-16 traduz cada código para uma instrução acionável: APPOINTMENT_CONFLICT → 'Esse horário acabou de ser reservado. Escolha outro.'; BOOKING_HORIZON_EXCEEDED → 'Esse dia ainda não está aberto para reservas. Escolha uma data mais próxima.'; CANCELLATION_NOTICE_REQUIRED → 'O prazo para cancelar online já passou. Fale direto com o estabelecimento.' Usado na API pública (src/app/api/public/[tenant]/appointments/route.ts:41) e na server action (src/modules/public-booking/actions.ts:30). Nas actions do painel: src/modules/clients/actions.ts:16-17 ('Revise o nome e o telefone.'), :46 ('Não foi possível salvar o cliente. Tente novamente.').
- **§12 — Cliques repetidos não duplicam cadastro, pagamento ou agendamento**
  - Evidência: Três camadas comprovadas. (1) Banco: supabase/migrations/202607020001_core_schema.sql:192 `exclude using gist (...)` em appointments impede dois agendamentos sobrepostos do mesmo profissional (o erro é capturado como `when exclusion_violation` em 202607240024_fase2_agenda_operacional.sql:13 e em outras 6 RPCs); 202607080013_fix_income_unique_per_category.sql:14 cria `financial_transactions_service_income_key` (índice único de receita por atendimento+categoria); 202607020001_core_schema.sql:126 `clients_phone_tenant_key unique (barbershop_id, phone_normalized)` impede cliente duplicado; 202607240029_fase4b_planos_clientes.sql:132 `membership_usage_appointment_key unique (appointment_id)`; produtos usam `on conflict (appointment_id, product_id) do nothing`. (2) Server action explicitamente idempotente: src/modules/financial/actions.ts:26-28 e :59 (`if (existing.status === 'paid') return; // idempotente`). (3) UI: `disabled={pending}` via useActionState em ~25 formulários (client-form.tsx:56, manual-appointment-sheet.tsx:433, bill-form.tsx:67, service-form-sheet.tsx:265 …) e `disabled={!slot || submitting}` no booking público (booking-form.tsx:821). Ressalva menor: contas a pagar (src/modules/bills/actions.ts:61) é insert puro sem chave de deduplicação — só o disabled protege.
- **§12 — Textos não utilizam termos técnicos desnecessários**
  - Evidência: Busquei jargão visível ao usuário (`grep -rno "slug|endpoint|token|RLS|webhook|PDV" src/app/(dashboard) --include=*.tsx`): todos os hits de 'RLS' e 'slug' estão em comentários de código (agenda/page.tsx:54, :179; clientes/page.tsx:153; permissoes/page.tsx:96) ou em nomes de variável (configuracoes/page.tsx). O texto de interface usa linguagem de negócio: 'Recebido no mês', 'A receber', 'Não veio', 'Horários e folgas', 'Pagamento de Funcionários'. Único termo de nicho visível é 'Ticket médio' (financeiro/page.tsx:597, :613), corrente no varejo brasileiro.

### Parcial (16)

- **§10/§5.2/§12 — Campos com 48px de altura no mobile (mínimo 44px no desktop)**
  - Evidência: src/components/ui/input.tsx:11 usa `h-8` (32px) e src/components/ui/select.tsx usa `data-[size=default]:h-8`. Alguns formulários compensam manualmente: src/components/dashboard/manual-appointment-sheet.tsx:262 e :271 (`className="h-11 text-base sm:text-sm"`), selectClass em manual-appointment-sheet.tsx:64-65 (`h-11`), src/components/public-site/booking-form.tsx:73 (`inputClass = "h-12 ..."`). Mas outros ficam no padrão de 32-36px: src/components/dashboard/employee-pay-card.tsx:19-20 (`h-9`), src/app/(dashboard)/financeiro/page.tsx:481 (`h-8` no select de forma de pagamento do 'A receber'), src/app/(dashboard)/agenda/page.tsx:271 e :280 (`h-9` nos filtros de data e busca).
  - O que falta: Elevar a altura base do Input/Select/Textarea para 44px (48px abaixo de sm) em vez de corrigir caso a caso; hoje o padrão do design system é o errado e só telas específicas foram remendadas.
  - Impacto: ALTO · Esforço: M
- **§10 — Manter ações importantes ao alcance do polegar**
  - Evidência: A barra inferior fixa cobre a navegação (src/components/layout/mobile-tab-bar.tsx:53, com `min-h-12` nos alvos, linhas 67 e 112) e a página pública tem CTA fixo no rodapé (src/app/(public)/[tenant]/page.tsx:456 e src/components/public-site/booking-form.tsx:803 `sticky bottom-3`). Mas nenhuma tela do painel tem CTA fixo: `grep -rn "fixed bottom|sticky bottom|bottom-16|bottom-20" src` não retorna nada em (dashboard). O botão principal vive no PageHeader, no topo (src/components/layout/page-header.tsx:25), fora do alcance do polegar em telas longas.
  - O que falta: §9.2 sugere botão principal fixo acima da barra inferior no mobile — replicar o padrão `sticky bottom-3` do booking-form nas telas operacionais (Agenda, Clientes, Serviços).
  - Impacto: MEDIO · Esforço: M
- **§10 — Usar carregamento progressivo para conexões lentas**
  - Evidência: Existe um único src/app/(dashboard)/loading.tsx (skeleton de rota inteira, usa Skeleton em grid `sm:grid-cols-2 xl:grid-cols-4`). Não há streaming por seção: `grep -rn "Suspense" src --include=*.tsx` retorna zero ocorrências, e as páginas fazem todos os `await supabase...` em série/Promise.all antes de renderizar (ex.: financeiro/page.tsx e dashboard/page.tsx são um único bloco await).
  - O que falta: Envolver blocos caros (gráficos, listas longas, 'A receber') em <Suspense> com fallback de skeleton para que o topo da tela apareça antes.
  - Impacto: BAIXO · Esforço: M
- **§6.2 — Barras horizontais ordenadas do maior para o menor com o valor no fim da barra**
  - Evidência: src/components/dashboard/bar-list.tsx existe e é usado em src/app/(dashboard)/financeiro/page.tsx:526 (serviços), :543 (produtos) e :560 (profissionais); os dados chegam ordenados desc em financeiro/page.tsx:291-299 (`.sort((a,b)=>b.total-a.total)` etc.). O valor aparece formatado com formatBRL e um hint de quantidade (bar-list.tsx:32-40). Ressalvas: o valor fica ACIMA da barra, não no fim dela; todas as barras usam a mesma cor `bg-primary` (bar-list.tsx:43), o que viola §6.1; não há tooltip.
  - O que falta: Colocar o valor ao fim da barra, colorir por significado e adicionar tooltip/title com o valor completo.
  - Impacto: BAIXO · Esforço: P
- **§6.2 — Rosca só para 2–5 categorias (ex.: formas de pagamento), sempre com legenda, valor e percentual**
  - Evidência: O breakdown por forma de pagamento existe em src/app/(dashboard)/relatorios/page.tsx:147-181, implementado como barras horizontais (substituição legítima por §6.2, que prefere barras quando há muitas categorias). Rótulo e valor aparecem (linhas 159-162). Mas o percentual É CALCULADO e NÃO É EXIBIDO: relatorios/page.tsx:155 `const pct = saldoTotal ? (amount/saldoTotal)*100 : 0` é usado apenas como largura em :167 (`style={{ width: `${pct}%` }}`). Também não há tooltip nem período no título ('Recebimentos por forma de pagamento' agrega o histórico inteiro).
  - O que falta: Exibir o percentual como texto ao lado do valor e informar o período agregado no título.
  - Impacto: BAIXO · Esforço: P
- **§6.2/§12 — Todo gráfico precisa de legenda**
  - Evidência: O monthly-revenue-chart tem legenda com cor e nome (src/components/dashboard/monthly-revenue-chart.tsx:42-57: 'Serviços' e 'Produtos'). O BarList não tem legenda nenhuma (o rótulo está em cada linha, o que é aceitável para barras nomeadas) e o breakdown de formas de pagamento também não — mas nesses dois casos o rótulo por item substitui a legenda razoavelmente.
  - Impacto: BAIXO · Esforço: P
- **§6.2/§12 — Todo gráfico precisa de alternativa textual**
  - Evidência: O SVG tem `role="img"` + `aria-label="Evolução mensal da receita por serviços e produtos"` (src/components/dashboard/monthly-revenue-chart.tsx:61-62) e uma linha de total abaixo (:134-137, 'Total no período: R$ …'), mas o aria-label descreve o gráfico sem transmitir os DADOS — um leitor de tela não obtém os valores mensais. O mapa de calor (que o guia exige com alternativa textual explícita 'Melhores horários'/'Horários mais vazios') não existe. Os rótulos numéricos dentro do SVG (:104-114) usam Intl compact ('1,2 mil'), não valores completos.
  - O que falta: Fornecer tabela textual equivalente (visualmente oculta ou em <details>) com os valores por mês, e o resumo textual exigido para o mapa de calor quando ele existir.
  - Impacto: MEDIO · Esforço: M
- **§6.4 — Estado sem dados: mensagem 'Ainda não há dados suficientes' em vez de gráfico vazio**
  - Evidência: A mensagem existe mas o gráfico vazio TAMBÉM é renderizado: em src/components/dashboard/monthly-revenue-chart.tsx o <svg> (linha 58) está fora de qualquer condicional; a mensagem 'Ainda sem receita nos últimos meses. Conclua atendimentos para ver a evolução aqui.' só aparece DEPOIS dele (:128-132, `{!hasData ? ... }`). Ou seja, o usuário vê a moldura/eixo vazio + a frase. O BarList faz certo: retorna cedo com a mensagem e não desenha nada (bar-list.tsx:19-23). O texto também não é o do guia ('Ainda não há dados suficientes'), embora ofereça próxima ação.
  - O que falta: Fazer early-return antes do <svg> quando !hasData, como o BarList já faz.
  - Impacto: BAIXO · Esforço: P
- **§12 — Possui um único botão de ação principal**
  - Evidência: Contei os <Button> sem prop `variant` (variante default/dourada) por página do painel: a maioria tem 0 ou 1 (agenda/page.tsx 1, clientes/page.tsx 1). Duas anomalias: (a) src/app/(dashboard)/financeiro/page.tsx tem 3 (os 'Receber' por linha em :483 — aceitável por serem ação de linha, não CTA de tela) mas NENHUM CTA principal de tela, e o cabeçalho empilha 3 botões outline num `grid w-full grid-cols-2` no mobile (financeiro/page.tsx:371-398); (b) 11 das 19 páginas do painel não têm nenhum botão principal visível (contas-a-pagar, contas-a-receber, estoque, usuarios, minha-conta, equipe/horarios, assinatura etc. têm 0 <Button> na própria page.tsx).
  - O que falta: Definir e destacar um CTA único por tela; no Financeiro, promover a ação real ('Registrar recebimento'/'Nova despesa') e recolher os três atalhos de navegação.
  - Impacto: MEDIO · Esforço: M
- **§12 — O foco do teclado está claramente visível em todos os controles**
  - Evidência: Os primitivos shadcn têm anel explícito: button.tsx:8 (`focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50`), input.tsx:11, textarea.tsx, select.tsx, checkbox.tsx, badge.tsx e user-menu.tsx:42. Só dois `outline-none` ficam sem anel e ambos são containers, não controles (tabs.tsx:84 TabsContent, alert-dialog.tsx:61 conteúdo). O buraco está nos ~116 controles crus fora de components/ui (contagem por `grep -rn "<input|<select|<textarea" src --include=*.tsx | grep -v components/ui`): ex. src/app/(dashboard)/agenda/page.tsx:271/280 (date e search), financeiro/page.tsx:481 (select de pagamento), manual-appointment-sheet.tsx:64 (selectClass), employee-pay-card.tsx:19 — nenhum declara focus-visible. Eles não ficam invisíveis porque src/app/globals.css:136-138 aplica `outline-ring/50` globalmente e nenhum deles usa outline-none (o outline padrão do navegador aparece na cor do ring), mas o indicador é fino e inconsistente com o ring de 3px do resto.
  - O que falta: Extrair um `inputClass`/`selectClass` compartilhado com focus-visible:ring-3 e usá-lo em todos os controles crus, ou substituí-los pelos componentes ui/.
  - Impacto: MEDIO · Esforço: M
- **§12 — Ícones importantes possuem texto**
  - Evidência: Os botões de rótulo sempre trazem texto ao lado do ícone (appointment-actions.tsx:108-109, dashboard-shell.tsx:230). Os botões só-ícone têm aria-label e title (ex.: src/app/(dashboard)/servicos/page.tsx:139-153 'Ocultar serviço'/'Exibir serviço'; src/components/dashboard/delete-entity-button.tsx:39; service-form-sheet.tsx:86), o que atende leitores de tela mas NÃO cumpre a regra literal do guia de texto visível — e no mobile esses alvos têm 28×28px sem tooltip acionável por toque (nenhum uso do Tooltip no projeto).
  - O que falta: Nas linhas de tabela/cartão, exibir o texto do ícone (ou movê-lo para um menu de três pontos com item rotulado).
  - Impacto: BAIXO · Esforço: M
- **§12/§5.2 — Formulários exibem rótulos acima dos campos**
  - Evidência: A maioria usa <Label htmlFor> acima: src/components/dashboard/client-form.tsx:41-54 (Nome, Telefone, E-mail, Observações), booking-form.tsx:736-774 (Nome, WhatsApp, E-mail, Observação), manual-appointment-sheet.tsx:281/305 (Serviço, Profissional), :337 (Dia e horário), :419 (Observação). Violações confirmadas: src/components/dashboard/manual-appointment-sheet.tsx:257-273 — os dois campos de novo cliente são `<Input placeholder="Nome do cliente" aria-label="Nome do novo cliente">` e `<Input placeholder="WhatsApp — (11) 98765-4321" aria-label="WhatsApp do novo cliente">`, sem <Label> visível (o placeholder faz as vezes de rótulo, exatamente o que §5.2 proíbe); e :226-231 (busca de cliente, só aria-label). Os filtros da agenda (agenda/page.tsx:271-283) também são aria-label puro.
  - O que falta: Adicionar <Label> visível nos campos de cadastro rápido do sheet de agendamento manual.
  - Impacto: MEDIO · Esforço: P
- **§12 — Valores mostram unidade e período**
  - Evidência: A unidade monetária está sempre presente (src/lib/financial/index.ts:26-28 formatBRL com Intl BRL). O período aparece nos rótulos dos cartões: dashboard/page.tsx:332-339 ('Recebido hoje', 'Recebido na semana', 'Recebido no mês'), financeiro/page.tsx:369 (mês no cabeçalho) e :374 ('Recebido no mês {valor}'), relatorios/page.tsx:98-109 ('Saldo do dia', 'Saldo do mês', 'Saldo total'). Lacunas: os cards de BarList do Financeiro ('Serviços mais vendidos', financeiro/page.tsx:522) não repetem o período no próprio card; relatorios/page.tsx:149 'Recebimentos por forma de pagamento' agrega o histórico inteiro sem dizer isso; e o gráfico usa notação compacta ('1,2 mil') nos rótulos sem 'R$' (monthly-revenue-chart.tsx:9-12, :112).
  - O que falta: Repetir o período no título de cada card de gráfico/ranking e prefixar R$ nos rótulos compactos do SVG.
  - Impacto: BAIXO · Esforço: P
- **§12 — O usuário recebe confirmação após salvar**
  - Evidência: Formulários com useActionState mostram Alert de sucesso: src/components/dashboard/client-form.tsx:32-39 exibe state.message ('Cliente adicionado.', vindo de src/modules/clients/actions.ts:50) com ícone CheckCircle2. O mesmo padrão aparece em bill-form, service-form-sheet, product-form-sheet, professional-form etc. Mas as ações de formulário simples (sem estado) não confirmam nada — apenas revalidam: src/components/dashboard/appointment-actions.tsx:100 (`<form action={updateAppointmentStatus}>`, Confirmar/Concluir/Cancelar da agenda), src/app/(dashboard)/financeiro/page.tsx:479 (`action={confirmTransactionPayment}` — o 'Pagamento de R$ 80 registrado' do §8.3 não existe) e servicos/page.tsx:132 (toggleService). Não há sistema de toast global: o único 'toast' do projeto é local do sino de notificações (src/components/dashboard/notifications-bell.tsx:39-58).
  - O que falta: Introduzir um toast global (ou converter essas actions para useActionState) para confirmar Receber/Confirmar/Concluir — hoje o operador só percebe pela linha mudando de estado.
  - Impacto: MEDIO · Esforço: M
- **§12 — A ação mais frequente pode ser concluída sem abrir menus escondidos**
  - Evidência: Positivo: confirmar/concluir/cancelar atendimento está inline na linha da agenda (src/components/dashboard/appointment-actions.tsx:98-113) e receber pagamento está inline no card mobile do caixa (financeiro/page.tsx:741-810) — nenhum passo escondido. Negativo no mobile: 'Novo agendamento' fica no topo da página (page-header.tsx:25) e o painel abre com 75% da largura por causa do bug do sheet; abrir a página pública de agendamento exige entrar em Configurações porque o botão do header é `hidden sm:inline-flex` (dashboard-shell.tsx:246); e todas essas ações têm alvos de 28px.
  - Impacto: MEDIO · Esforço: M
- **§12 — A tela funciona em 360, 768, 1024 e 1440 px**
  - Evidência: Os layouts têm breakpoints coerentes (sidebar em lg:, barra inferior lg:hidden — dashboard-shell.tsx:188 e mobile-tab-bar.tsx:53) e o typecheck do projeto passa (`npx tsc --noEmit` → exit 0, sem alterar arquivos). Mas em 360px há quebras concretas e demonstráveis: sheets a 270px (sheet.tsx:65), 5 tabelas essenciais com rolagem horizontal (table.tsx:11 + whitespace-nowrap em :73/:86), controles de 28-32px, e a grade de horários do agendamento manual em `grid-cols-4` (manual-appointment-sheet.tsx:390) dentro de um sheet de 270px. Nenhuma verificação automatizada cobre isso (playwright.config.ts sem viewport).
  - O que falta: Corrigir sheet + tabelas + alturas e adicionar smoke test de 360px sem overflow horizontal.
  - Impacto: ALTO · Esforço: G

### Não atendido (14)

- **§10 — Formulários em tela inteira no mobile (sheets viram full-screen)**
  - Evidência: src/components/ui/sheet.tsx:65 fixa `data-[side=right]:w-3/4` e `data-[side=right]:sm:max-w-sm` na classe base. Os 8 callers (src/components/dashboard/manual-appointment-sheet.tsx:188, service-form-sheet.tsx:99, product-form-sheet.tsx:70, membership-plan-sheet.tsx:88, reschedule-sheet.tsx:113, sell-membership-sheet.tsx:59, professional-profile-sheet.tsx:55, membership-actions.tsx:60) passam `w-full ... sm:max-w-md`. Verifiquei empiricamente com o tailwind-merge e o compilador Tailwind do próprio repo: twMerge('data-[side=right]:w-3/4','w-full') devolve AS DUAS classes, e o compilador gera `.data-\[side\=right\]\:w-3\/4 { &[data-side="right"] { width: calc(3/4*100%) } }` — especificidade (0,2,0) contra (0,1,0) de `.w-full`. Resultado: o sheet fica com 270px em uma tela de 360px, e o `sm:max-w-md` dos callers também é morto (perde para `sm:max-w-sm`).
  - O que falta: Adicionar `w-full`/`inset-0` dentro da própria variante em sheet.tsx (ex.: `data-[side=right]:w-full data-[side=right]:sm:w-3/4`) ou remover a largura da classe base e deixar o caller decidir. Sem isso, nenhum `className` de caller consegue vencer.
  - Impacto: ALTO · Esforço: P
- **§10/§5.1/§12 — Botões principais com 48px de altura no mobile e mínimo 44×44px**
  - Evidência: src/components/ui/button.tsx:24-34: default `h-8` (32px), lg `h-9` (36px), sm `h-7` (28px), icon `size-8`, icon-sm `size-7` (28×28), icon-lg `size-9`. Não existe nenhuma variante ≥44px nem override por media query (li src/app/globals.css inteiro, 336 linhas — não há regra para [data-slot=button]). Uso real: 52 ocorrências de size="sm" e 15 de size="icon-sm" (grep -rn 'size="sm"' src). Ex.: src/components/dashboard/appointment-actions.tsx:104 (Confirmar/Concluir/Não veio/Cancelar da agenda, todas h-7=28px) e src/app/(dashboard)/servicos/page.tsx:139 (ocultar serviço, 28×28px).
  - O que falta: Criar variantes de tamanho conformes: default h-11 (44px) e `md:h-10`, ou `h-12 md:h-11` para o CTA principal; substituir size="sm"/"icon-sm" nas ações operacionais (agenda, financeiro, linhas de tabela) por tamanhos ≥44px.
  - Impacto: ALTO · Esforço: M
- **§10/§12 — Tabelas viram cartões; nenhuma tabela essencial depende de rolagem horizontal no celular**
  - Evidência: src/components/ui/table.tsx:11 envolve toda tabela em `overflow-x-auto` e table.tsx:73/86 aplicam `whitespace-nowrap` em th e td — o comportamento padrão é rolagem horizontal. Apenas 2 dos ~11 usos têm alternativa em cartões: src/app/(dashboard)/financeiro/page.tsx:581 (Vendas por profissional, `space-y-3 sm:hidden`) e :741 (Atendimentos de hoje / caixa). Continuam só com rolagem: /servicos (5 colunas, servicos/page.tsx:80-87), /produtos (6 colunas em produtos/page.tsx:206-213 e 7 colunas em :273-281, ambas dentro de um `overflow-x-auto` extra nas linhas 204 e 271), /planos (5 colunas em planos/page.tsx:165-171 e :271-277), /comissoes (4 colunas, comissoes/page.tsx:258-263), /permissoes (1+N colunas, permissoes/page.tsx:63-67), e as próprias financeiro/page.tsx:660 e :699.
  - O que falta: Replicar o padrão `space-y-3 sm:hidden` + `hidden sm:block` (já usado no financeiro) em serviços, produtos/estoque, planos, assinantes, comissões e permissões — ou criar um componente <DataList> que decide automaticamente.
  - Impacto: ALTO · Esforço: G
- **§10 — Agenda abre em "Dia" por padrão no mobile**
  - Evidência: src/app/(dashboard)/agenda/page.tsx:69: `const activeView = view === "semana" ? "semana" : validDay ? "dia" : "proximos"` — sem parâmetro na URL o padrão é 'proximos' em qualquer largura. As três visões existem (agenda/page.tsx:235 Próximos, :249 Dia, :255 Semana) mas não há nenhuma detecção de viewport no projeto: `grep -rn "matchMedia|useMediaQuery|window.innerWidth" src` só retorna prefers-reduced-motion em booking-form.tsx:220 e parallax.tsx:30.
  - O que falta: Ou tornar 'Dia' o padrão global, ou renderizar a visão Dia por CSS no mobile (`lg:hidden`/`hidden lg:block`) já que a página é server component e não tem como ler a largura.
  - Impacto: MEDIO · Esforço: M
- **§10 — Botão "Ver página de agendamento" deve existir no mobile**
  - Evidência: Único ponto do painel com esse rótulo: src/components/layout/dashboard-shell.tsx:242-251, e a linha 246 é `className="hidden sm:inline-flex"` — some abaixo de 640px. O menu mobile é montado a partir de `navGroups` (dashboard-shell.tsx:49-144), que não tem nenhum item apontando para `/${tenant.slug}`; o UserMenu (src/components/layout/user-menu.tsx:61-86) também não tem. `grep -rn "página de agendamento" src --include=*.tsx` confirma que os demais hits são textos de landing/descrição.
  - O que falta: Adicionar o link no grupo do Menu do MobileTabBar (§9.2 pede exatamente 'Página de agendamento' lá dentro, junto de 'Minha conta' e 'Meu plano NexoBarber') ou trocar o `hidden sm:inline-flex` por um botão de ícone visível no header mobile.
  - Impacto: MEDIO · Esforço: P
- **§10 — Ações menos usadas ficam no menu de três pontos**
  - Evidência: `grep -rn "MoreHorizontal|MoreVertical|EllipsisVertical|Ellipsis" src --include=*.tsx` retorna apenas src/components/platform/admin-row-actions.tsx:4 e :53 — área de super-admin da plataforma, fora do painel do lojista. Nas telas do lojista as ações ficam todas inline: src/app/(dashboard)/servicos/page.tsx:125-165 empilha editar + ocultar + excluir como três botões de 28px; src/components/dashboard/appointment-actions.tsx:98-113 renderiza até 3 ações lado a lado.
  - O que falta: Mover ações secundárias (ocultar, excluir, desfazer) para um DropdownMenu de três pontos — o componente dropdown-menu.tsx já existe e é usado no UserMenu.
  - Impacto: MEDIO · Esforço: M
- **§10 — Projetar primeiro para 360px / testar com o teclado aberto / testar em 360, 768, 1024 e 1440px (§12)**
  - Evidência: Não existe nenhum teste de viewport: playwright.config.ts não define `use.viewport` nem `devices[...]`, e `grep -n "viewport|360|mobile" e2e/*.ts` não retorna nada — a suíte e2e (e2e/booking-api.spec.ts, e2e/public-pages.spec.ts) só cobre API e páginas públicas. Não há teste unitário de layout em vitest. A evidência indireta contradiz o mobile-first: os tamanhos base do Button/Input são de desktop denso (32px) e os breakpoints são todos `sm:`/`md:` para cima, ou seja, o desenho partiu do desktop.
  - O que falta: Adicionar projeto Playwright com viewport 360×740 e asserções de que não há scroll horizontal no <body> nas rotas principais.
  - Impacto: MEDIO · Esforço: M
- **§6.1 — Cores fixas por significado (#F2B84B faturamento, #34D399 recebido, #F87171 despesas, #60A5FA a receber, #A78BFA comissões, #8B98A7 tracejado para período anterior)**
  - Evidência: src/components/dashboard/monthly-revenue-chart.tsx:35-40 define a própria paleta hardcoded: `--svc:#2a78d6` (azul) e `--prd:#1baf7a` (verde) no claro, `#3987e5`/`#199e70` no escuro — nenhuma dessas cores está na tabela do §6.1, e o eixo semântico é serviços×produtos, não faturamento/recebido/despesa. src/components/dashboard/bar-list.tsx:43 pinta TODAS as barras com `bg-primary` (dourado), independentemente do significado (serviços, produtos, profissionais). Os tokens corretos existem em src/app/globals.css:74-78 e :117-121 (--chart-1 #f2b84b, --chart-2 #60a5fa, --chart-3 #34d399, --chart-4 #fbbf24, --chart-5 #f87171) mas `grep -rn "chart-1|chart-2|chart-3|chart-4|chart-5" src --include=*.tsx --include=*.ts` retorna ZERO usos. O relatório docs/entregas/fase-1.md:11 afirma 'gráficos com a paleta da marca' — o código não confirma.
  - O que falta: Criar tokens semânticos (--c-faturamento, --c-recebido, --c-despesa, --c-a-receber, --c-comissao, --c-periodo-anterior) e trocar as cores hardcoded do monthly-revenue-chart e o bg-primary uniforme do BarList por eles.
  - Impacto: ALTO · Esforço: M
- **§6.2 — Linha para evolução no tempo (máx. 3 linhas, comparação com período anterior)**
  - Evidência: O único gráfico de evolução é src/components/dashboard/monthly-revenue-chart.tsx, e é de BARRAS EMPILHADAS (rects em :85-103), não de linha. Título de uso: 'Evolução do recebido (6 meses)' em src/app/(dashboard)/financeiro/page.tsx:511-514. Não há série de período anterior tracejada: `grep -rn "strokeDasharray|tracejad" src` não encontra nada.
  - O que falta: Trocar por gráfico de linha (2-3 séries) com linha tracejada #8B98A7 do período anterior, conforme §6.2.
  - Impacto: MEDIO · Esforço: M
- **§6.2 — Mapa de calor de dias × horários (quando a barbearia fica mais cheia), com escala grafite→dourado, legenda de intensidade e alternativa textual 'Melhores horários'/'Horários mais vazios'**
  - Evidência: Busquei em português e inglês: `grep -rn "mapa de calor|heatmap|HeatMap|Heatmap|calor" src docs -i` → zero resultados. `grep -rln "<svg|viewBox|Chart|chart" src` retorna apenas 5 arquivos (dashboard/page.tsx, financeiro/page.tsx, (print)/relatorio-financeiro/page.tsx, monthly-revenue-chart.tsx, dashboard-shell.tsx) — nenhum contém grade de dias×horários. A pergunta 'quando fica mais cheio' não é respondida em nenhuma tela.
  - O que falta: Construir o mapa de calor (linhas = dias da semana, colunas = faixas de hora) a partir de appointments.starts_at, com legenda de intensidade e o resumo textual de melhores/piores horários.
  - Impacto: ALTO · Esforço: G
- **§6.2/§12 — Todo gráfico precisa de tooltip**
  - Evidência: O componente existe (src/components/ui/tooltip.tsx) e o TooltipProvider está montado globalmente (src/app/layout.tsx:4), mas `grep -rn 'from "@/components/ui/tooltip"' src` retorna APENAS o layout.tsx — nenhum consumidor. Também não há fallback nativo: `grep -rn "<title>" src --include=*.tsx` retorna zero (nenhum <title> dentro dos <svg> do monthly-revenue-chart.tsx), e bar-list.tsx não usa atributo `title`.
  - O que falta: Adicionar <title>/tooltip com valor completo + data em cada barra do monthly-revenue-chart e em cada item do BarList.
  - Impacto: MEDIO · Esforço: P
- **§12 — Controles e elementos essenciais têm contraste mínimo de 3:1**
  - Evidência: src/app/globals.css:114-115 define `--border: #2c3948` e `--input: #2c3948` no tema escuro. Contraste calculado: #2C3948 sobre card #141B24 = 1,47:1 e sobre background #0B0F14 = 1,63:1 — muito abaixo de 3:1. O guia §11 prevê um token separado `--border-control: #5B6B7D` (que daria ~3,4:1 sobre a sidebar, confirmado no meu cálculo), mas esse token NÃO existe no globals.css (busquei 'border-control' em todo o src: zero ocorrências); #5B6B7D só aparece como `--sidebar-ring` (globals.css:129). Consequência prática: todo Input (border-input, input.tsx:11), Select, Textarea e Button outline tem borda praticamente invisível. Adicionalmente, a série verde do gráfico no tema claro (#1BAF7A sobre branco) dá 2,82:1 — abaixo de 3:1 para objeto gráfico (o próprio comentário do arquivo, monthly-revenue-chart.tsx:16-18, admite isso).
  - O que falta: Criar --border-control (#5B6B7D no escuro, #64748B no claro) e usá-lo em Input/Select/Textarea/Button outline, mantendo --border-subtle para separadores.
  - Impacto: ALTO · Esforço: M
- **§12 — Estado vazio oferece uma próxima ação**
  - Evidência: src/components/feedback/empty-state.tsx:3-9 aceita SOMENTE `title` e `description` — não há prop de ação nem botão no corpo (:10-18). As 18 chamadas (agenda/page.tsx:491, servicos/page.tsx:174, clientes/page.tsx:387, planos/page.tsx:252 e :345, produtos/page.tsx:260, comissoes/page.tsx:65 e :244, financeiro/page.tsx:81 e :895, relatorios/page.tsx:41 e :175, contas-a-pagar:26, contas-a-receber:26, profissionais:175, equipe/horarios:45 e :74, bills-view.tsx:159) passam só texto. A descrição às vezes NOMEIA a ação ('Cadastre o primeiro serviço…', servicos/page.tsx:177) mas não a torna clicável — o guia §8.3 pede 'Nenhum produto cadastrado. Adicione o primeiro produto…' com botão.
  - O que falta: Adicionar prop `action?: React.ReactNode` ao EmptyState e passar o CTA correspondente em cada uso (Novo serviço, Novo produto, Novo agendamento…).
  - Impacto: MEDIO · Esforço: P
- **§12 — Gráficos têm legenda, tooltip e alternativa textual (os três juntos)**
  - Evidência: Nenhum gráfico do sistema cumpre os três. monthly-revenue-chart.tsx tem legenda (:42-57) e um arremedo de alternativa textual (:61-62 aria-label + :134-137 total), mas nenhum tooltip. BarList (bar-list.tsx) e o breakdown de pagamentos (relatorios/page.tsx:152-173) não têm nenhum dos três formalmente. Confirmação da ausência de tooltip: `grep -rn 'from "@/components/ui/tooltip"' src` só acha src/app/layout.tsx:4 (o Provider), e `grep -rn "<title>" src --include=*.tsx` retorna zero.
  - O que falta: Ver itens de tooltip e alternativa textual acima; é o mesmo trabalho.
  - Impacto: MEDIO · Esforço: M

### Apontado pelo verificador (não coberto na primeira passada)

- §12 — 'Cor nunca é a única forma de indicar situação': não avaliado. Nos selos passa (src/components/dashboard/appointment-status-badge.tsx:4-28, todo status tem label textual), mas no gráfico falha (monthly-revenue-chart.tsx:84-103, séries só por cor).
- §12 — 'Ícones importantes possuem texto': não avaliado. Há botões só-ícone em ações destrutivas/estruturais, ex. src/app/(dashboard)/servicos/page.tsx:138-158 (ocultar/exibir serviço, apenas <Eye/> com title/aria-label) e src/components/dashboard/delete-entity-button.tsx.
- §12 — 'Valores mostram unidade e período': pedido explicitamente no escopo e não avaliado. Resultado real é PARCIAL: os KPIs de mês trazem período no rótulo (financeiro/page.tsx:306,313,326,332 'no mês'), mas 'A receber' (dashboard/page.tsx:336; financeiro/page.tsx:319), 'Atendimentos concluídos' (financeiro/page.tsx:338), 'Saldo total' (relatorios/page.tsx:104) e os títulos dos gráficos ('Serviços mais vendidos', financeiro/page.tsx:522; 'Recebimentos por forma de pagamento', relatorios/page.tsx:149) não declaram período; os rótulos dentro do gráfico não trazem R$ (monthly-revenue-chart.tsx:9-12,112).
- §12 — 'O usuário recebe confirmação após salvar': não avaliado. Não existe sistema global de toast/sucesso — `grep -rn "toast|sonner" src` só encontra o estado local de src/components/dashboard/notifications-bell.tsx:39,156; a confirmação depende de `state.message` caso a caso.
- §12 — 'Erros explicam como corrigir' e 'Textos não utilizam termos técnicos desnecessários': não avaliados.
- §12 — 'A ação mais frequente pode ser concluída sem abrir menus escondidos': não avaliado (tem relação direta com o item de três-pontinhos que ele reprovou; são critérios em tensão e ele só olhou um lado).
- §5.5/§10 — 'Linha com pelo menos 52 px' nas tabelas/listas: não avaliado. src/components/ui/table.tsx:86 usa `p-2` na célula (≈36-40px de linha), abaixo do mínimo do guia e diretamente ligado ao alvo de toque no celular.
- Bug de tema do gráfico no PDF: ele listou src/app/(print)/relatorio-financeiro/page.tsx como arquivo com 'chart', mas não auditou que ele reusa o MonthlyRevenueChart (linha 304) num layout branco (src/app/(print)/layout.tsx), onde a paleta escura pode ser aplicada por prefers-color-scheme e destruir a legibilidade da impressão.
- Foco de teclado em controle de navegação primária: o gatilho do Menu mobile é um Radix Trigger cru sem anel de foco — src/components/layout/mobile-tab-bar.tsx:79-89 (classes só de cor/layout). Ele generalizou '~116 controles crus' sem apontar que um deles é o controle de navegação mais usado no celular.
- ERRO DE EVIDÊNCIA (status mantido, prova errada) no item §6.1: ele escreve que 'os tokens corretos existem em src/app/globals.css:74-78 e :117-121 (--chart-1 #f2b84b …)'. As linhas 74-78 são o tema CLARO e contêm escala de cinza — `--chart-1: oklch(0.87 0 0)` … `--chart-5: oklch(0.269 0 0)`. Só as linhas 117-121 (.dark) trazem a paleta do guia. Ou seja, no tema claro (landing, página pública, PDF) os tokens de gráfico nem existem na cor certa — a situação é pior do que ele descreveu.
- ERRO DE EVIDÊNCIA no item §12 'único botão de ação principal': a contagem '11 das 19 páginas do painel não têm nenhum botão principal' é inválida — src/app/(dashboard)/estoque/page.tsx e src/app/(dashboard)/usuarios/page.tsx são apenas `redirect()` (6 e 8 linhas), e telas como contas-a-pagar têm sim CTA, só que no componente (src/components/dashboard/bill-form.tsx:67, `<Button disabled={pending} className="w-full">`), não no page.tsx. Contar `<Button>` por arquivo de página não mede o critério.
- Desvios de linha nas citações (verifiquei um a um): 'Receber' está em src/app/(dashboard)/financeiro/page.tsx:489 (ele citou 483, que é o map de PAYMENT_METHODS) e 'Cancelar venda' em :493-499 (citou 494-500); os filtros h-9 da agenda estão em src/app/(dashboard)/agenda/page.tsx:277 e :285 (citou 271 e 280). Não invalidam as conclusões, mas indicam citação por memória em parte do relatório.

---

## Camada comercial — landing, preços e leads

A camada comercial tem a INFRAESTRUTURA construída e a NARRATIVA ausente. O que existe de verdade: catálogo de preços versionado no banco (plan_prices com mensal e anual), landing lendo o mesmo preço que a cobrança usaria, formulário de captura de lead nas duas verticais gravando em saas_leads com consentimento e UTMs, Meta Pixel com gate de LGPD e página /assinatura honesta (sem botão falso). O que NÃO existe: nenhum mecanismo de follow-up de lead — a tabela saas_leads é escrita pela rota e nunca lida por lugar nenhum do sistema (nem no /admin), o campo funnel_stage nunca é atualizado, não há infra de e-mail transacional (busca por resend/nodemailer/sendgrid/mailgun/postmark: zero resultados) e os únicos crons são cobrança e lembrete de agendamento. Não existe cupom nem desconto de nenhuma espécie no código. O plano anual existe no banco (16,67% de desconto = 2 mensalidades grátis) mas NÃO aparece na landing, não é o padrão recomendado, o mensal não é encarecido e não há como comprar nenhum dos dois — não há checkout. Contra a apresentação estratégica, a landing falha na maior parte: não usa os 5 Gs, não usa o título principal nem o CTA recomendados, abre com marquee de 7 recursos (violação explícita do §6), oferece três caminhos de conversão concorrentes e exibe três depoimentos com nome e cargo que não têm origem verificável — o risco comercial e legal mais sério do conjunto. O pedido (b) do sócio (gestão de clientes e análise de frequência como diferencial) é o mais frustrante: o produto ENTREGA isso (Fase 3, /clientes com retorno previsto e listas de reativação) e a landing simplesmente não vende.

### Atendido (6)

- **Pedido (c) do sócio: existir pacote anual com desconto à vista**
  - Evidência: supabase/migrations/202607240025_fase2b_cobranca_saas.sql:46-57 insere starter monthly 4990 / yearly 49900 e plus monthly 9990 / yearly 99900. src/lib/billing/catalog.ts:36-61 lê via RPC get_plan_catalog. src/app/(dashboard)/assinatura/page.tsx:186-200 exibe o card 'Anual à vista' com a economia calculada em src/app/(dashboard)/assinatura/page.tsx:55.
- **Pedido (c) do sócio: qual a diferença REAL de preço entre anual e mensal no catálogo**
  - Evidência: supabase/migrations/202607240025_fase2b_cobranca_saas.sql:49-52. Padrão: R$ 49,90/mês → R$ 598,80 em 12 meses vs R$ 499,00 anual = economia de R$ 99,80 (16,67%). Plus: R$ 99,90/mês → R$ 1.198,80 vs R$ 999,00 anual = economia de R$ 199,80 (16,67%). Regra documentada no comentário da migration linha 6-7: 'anual equivale a 10 mensalidades'.
- **Pedido (d) do sócio: existir captação de dados do lead na página de vendas**
  - Evidência: src/components/platform/lead-capture-form.tsx (formulário completo: nome, canal WhatsApp/e-mail, contato, plano de interesse opcional, consentimento obrigatório na linha 133-142). Renderizado em src/app/page.tsx:736 e src/app/salao/page.tsx:691. Persistência em src/app/api/public/leads/route.ts:57-70 com rate limit (linha 27) e UTMs filtradas (linhas 47-52).
- **Pedido (d) do sócio: tabela de leads no banco (supabase/migrations)**
  - Evidência: supabase/migrations/202607240025_fase2b_cobranca_saas.sql:104-124 cria public.saas_leads com consent, plan_interest, period_interest, vertical, utm, source_page e funnel_stage; RLS habilitada sem policies (linha 123-124), então só o service_role escreve. Índice por contato normalizado na linha 120-121. Teste de RLS em supabase/tests/fase2b_cobranca.sql:66-83.
- **Pedido (e) do sócio: quantificar o custo de trocar o nome NexoBarber por outro**
  - Evidência: Contagem por grep -rno em src/, supabase/, docs/ e README.md. 'NexoBarber': 30 ocorrências em 19 arquivos — src/app/page.tsx(4), src/app/layout.tsx(3), src/lib/verticals.ts(2), src/app/opengraph-image.tsx(2), src/app/admin/layout.tsx(2), src/app/(legal)/termos/page.tsx(2), src/app/(legal)/privacidade/page.tsx(2), docs/homologacao-prompt-agente-web.md(2), e 1 cada em: supabase/migrations/202607090018(comentário), src/components/platform/lead-capture-form.tsx:140, src/components/layout/dashboard-shell.tsx:193, src/components/forms/auth-card.tsx:35, src/app/salao/page.tsx:736, src/app/globals.css:93(comentário), src/app/(public)/[tenant]/opengraph-image.tsx:18, src/app/(legal)/layout.tsx:24, src/app/(dashboard)/assinatura/page.tsx:205, docs/11-matriz-funcionalidades.md, README.md. Em código de produção (src/): 16 arquivos, 24 ocorrências. Existe um ponto de verdade PARCIAL em src/lib/verticals.ts:17 (VERTICALS.barber.brand) e :54 (madeWith), mas 14 arquivos hardcodam a string em vez de importar dali. Além do texto: favicon binário src/app/favicon.ico, artes OG geradas por código (src/app/opengraph-image.tsx:49 e src/app/(public)/[tenant]/opengraph-image.tsx:18), domínio em vercel.json ('barbearia-saas-sigma.vercel.app') e package.json name 'barbearia-saas'.
  - O que falta: Custo estimado da troca para 'Flow Barber': a parte de código é 1 substituição em 16 arquivos de src/ (~1-2h, esforço P). O que encarece é o entorno: (1) os documentos legais src/app/(legal)/termos/page.tsx:19-20 e privacidade/page.tsx:18-19 nomeiam a plataforma e precisam de revisão consciente, não search-replace; (2) favicon.ico é binário e precisa ser regerado; (3) domínio/URL pública em vercel.json; (4) a marca irmã 'NexoBeleza' (19 ocorrências em 12 arquivos) perde o parentesco fonético com 'Flow Barber' e exigiria decidir o novo nome da vertical salão junto. Total realista: 1 dia. Recomendação técnica independente do nome escolhido: centralizar tudo em src/lib/verticals.ts e fazer os 14 arquivos importarem, o que torna a próxima troca trivial.
- **Consistência de preço: a landing deve exibir exatamente o preço que a cobrança usará**
  - Evidência: src/app/page.tsx:149 e src/app/salao/page.tsx:142 chamam loadPlanCatalog(); os preços exibidos vêm de catalog.starter.monthlyCents / catalog.plus.monthlyCents (src/app/page.tsx:261, 582, 625). A mesma fonte alimenta o onboarding (src/app/onboarding/page.tsx:35-39) e /assinatura (src/app/(dashboard)/assinatura/page.tsx:51-54). O fallback (src/lib/billing/catalog.ts:13-24) usa as mesmas constantes de src/lib/billing/index.ts:19 e :32. Revalidação horária declarada em src/app/page.tsx:144.

### Parcial (9)

- **Pedido (a) do sócio: falar com o nicho de barbearias em crescimento que precisam se organizar para crescer mais**
  - Evidência: src/app/page.tsx:229-235 (h1 'Gestão simples para barbearias que querem crescer.') e src/app/page.tsx:236-240 (subtítulo). Busca por 'profissionais', 'cadeiras', 'dono', 'unidade' no arquivo: só aparecem dentro dos depoimentos (linhas 113-131), nunca como definição de público.
  - O que falta: O verbo 'crescer' está no h1, mas nada qualifica o nicho: não há menção a barbearia de 2 a 8 profissionais, a dono que ainda atende na cadeira, nem à transição 'virei dono e a gestão ficou no WhatsApp'. A landing continua legível por qualquer negócio de beleza. Falta um bloco de qualificação de público (badge, sub-headline ou seção 'para quem é / para quem não é') com o perfil da §4 da apresentação.
  - Impacto: ALTO · Esforço: P
- **Pedido (d) do sócio: capturar o interesse pelo pacote anual no lead**
  - Evidência: A rota aceita periodInterest e a coluna existe: src/app/api/public/leads/route.ts:14 (z.enum(['monthly','yearly']).optional()) e migration linha 112. Mas o formulário NUNCA envia esse campo — src/components/platform/lead-capture-form.tsx:44-55 monta o body com name, contact, channel, consent, planInterest, vertical, utm e sourcePage; o select de periodicidade não existe no JSX (linhas 123-132 só têm plano starter/plus).
  - O que falta: Todo lead grava period_interest NULL. Basta adicionar um select de periodicidade no formulário e passar periodInterest no fetch — a rota e o banco já suportam. Sem isso, quando a régua de desconto anual existir, não haverá como priorizar quem já sinalizou interesse no anual.
  - Impacto: MEDIO · Esforço: P
- **Apresentação §5: slogan institucional 'Da agenda ao lucro, sua barbearia sob controle.'**
  - Evidência: src/app/page.tsx:237 usa a frase, mas embutida no meio do parágrafo de subtítulo e seguida de dois-pontos: 'Da agenda ao lucro, sua barbearia sob controle: organize agenda, equipe e financeiro...'. Busca pela frase em src/app/salao/page.tsx: ausente. Não aparece no <title> (src/app/page.tsx:29 usa 'o sistema completo para a sua barbearia') nem no rodapé (linha 748) nem na arte OG (src/app/opengraph-image.tsx:4).
  - O que falta: O slogan existe mas não tem status de slogan — está diluído em prosa. Deveria aparecer isolado e repetido: sob o logo do header, no rodapé, no title/description do metadata e na arte de compartilhamento.
  - Impacto: MEDIO · Esforço: P
- **Apresentação §6: sequência da página dor → promessa → 5 Gs → fluxo → simplicidade → confiança → converter**
  - Evidência: Ordem real em src/app/page.tsx: header(153) → hero/promessa(203) → marquee de recursos(337) → recursos(354) → como funciona(384) → galeria de fotos(418) → showcase white-label(461) → planos(558) → depoimentos(661) → CTA final(691) → lead(726) → footer(742). Não existe seção de reconhecimento da dor: busca por 'FAQ', 'perguntas' e 'dúvidas' em src/app/page.tsx e src/app/salao/page.tsx retorna ZERO — o que também contradiz docs/entregas/fase-5.md, que afirma que 'a estrutura atual já cobre hero/problema/recursos/planos/FAQ/CTA'.
  - O que falta: Faltam três etapas: (1) o bloco de DOR na abertura (a rotina de quem atende, responde mensagens, calcula comissão e não sabe quanto sobrou); (2) o bloco de FLUXO conectado (agendamento entra → atendimento acontece → pagamento fecha → números atualizam) — a seção 'Como funciona' (linha 384) fala do onboarding do dono, não do fluxo operacional; (3) FAQ, que o relatório de fase afirma existir e não existe.
  - Impacto: ALTO · Esforço: M
- **Apresentação §6 — o que evitar: usar PDV, ticket médio, CRM ou outros termos sem tradução**
  - Evidência: Busca por 'PDV|ticket médio|CRM|RLS|multi-tenant|churn|LTV|SaaS' em src/app/page.tsx e src/app/salao/page.tsx: ZERO resultados — os termos proibidos foram evitados. MAS o card 'Isolamento real' (src/app/page.tsx:66-70) diz 'Cada barbearia em seu próprio espaço, com segurança aplicada linha a linha no banco de dados' e o card 'Agenda sem conflito' (linhas 36-40) diz 'Horários duplicados são bloqueados no banco de dados'. Também há 'White label completo' em src/app/page.tsx:636.
  - O que falta: 'Linha a linha no banco de dados' e 'white label' são jargão de engenharia vendido a um dono de barbearia. Traduzir para 'Os dados da sua barbearia são só seus — ninguém mais enxerga' e 'A página com a sua marca, sem nenhuma menção nossa'.
  - Impacto: MEDIO · Esforço: P
- **Apresentação §6 — o que evitar: prometer aumento de faturamento em percentual sem prova real**
  - Evidência: Nenhum percentual de faturamento é prometido na copy institucional (busca por '%' fora de CSS em src/app/page.tsx: só valores de gradiente e um índice de array). Porém o depoimento de 'Marcos' (src/app/page.tsx:126-131) afirma 'Metade dos clientes já remarca antes de sair da cadeira' — uma métrica quantificada sem origem. Os números do mockup (src/app/page.tsx:299 '12 horários' e :329 'R$ 8.940') são ilustrativos e não vêm rotulados como exemplo.
  - O que falta: A métrica '50% remarca' está numa aspa atribuída a uma pessoa nomeada, o que a torna afirmação de fato, não ficção óbvia. Ou se comprova, ou se remove. Rotular o mockup como 'exemplo ilustrativo' também reduz exposição.
  - Impacto: MEDIO · Esforço: P
- **Apresentação §6 — o que evitar: divulgar como pronta uma função que ainda está no planejamento**
  - Evidência: As funções anunciadas nos planos existem de fato: relatório em PDF (src/app/(print)/relatorio-financeiro/page.tsx), upsell de produtos no agendamento (src/components/public-site/booking-form.tsx:124 showUpsell), personalização com gate de plano (src/components/dashboard/appearance-editor.tsx:122-382 com isPlus), reserva de produto com baixa de estoque (migration 202607080010). PORÉM a landing promete 'cancele quando quiser' (src/app/page.tsx:262 e 567; src/app/salao/page.tsx:254 e 520-523) e não existe cancelamento self-service: a única função de cancelar é src/modules/platform/actions.ts:54-59, protegida por requirePlatformAdmin (linha 26); a página /assinatura não tem botão algum de cancelar (src/app/(dashboard)/assinatura/page.tsx:164-209 só exibe preços e um texto pedindo para falar com o suporte).
  - O que falta: 'Cancele quando quiser' hoje significa 'mande mensagem para o suporte e torça'. Enquanto não houver checkout, ou se acrescenta um botão de cancelamento que registre o pedido, ou se ajusta a copy para 'sem fidelidade — é só avisar'.
  - Impacto: MEDIO · Esforço: P
- **Consistência de benefícios entre a landing e a página de assinatura**
  - Evidência: A landing lista 'Relatório financeiro em PDF' como benefício do plano PADRÃO (src/app/page.tsx:596 e src/app/salao/page.tsx:552), mas src/lib/billing/index.ts:40 lista 'Relatórios em PDF' entre as features do PLUS — e essa mesma lista é renderizada em /assinatura (src/app/(dashboard)/assinatura/page.tsx:146-151). Na prática o código dá razão à landing: src/app/(print)/relatorio-financeiro/page.tsx:36-40 só verifica can(tenant.role,'finance:view'), sem nenhum gate de plano.
  - O que falta: Um assinante do Padrão que ler a própria página de assinatura vai concluir que não tem direito ao PDF que a landing lhe vendeu. Corrigir a lista de features em src/lib/billing/index.ts para refletir o gating real (isPlus só é aplicado em aparência e produtos).
  - Impacto: MEDIO · Esforço: P
- **Formulário de captura de lead funcional e legível nas duas landings**
  - Evidência: O LeadCaptureForm é estilizado exclusivamente para fundo escuro: src/components/platform/lead-capture-form.tsx:96, 105, 120, 127 usam 'border-white/15 bg-white/5 text-stone-100 placeholder:text-stone-500' e a linha 133 usa 'text-stone-400'. Na landing de barbearia isso funciona (fundo #0c0b09, src/app/page.tsx:151). Na landing de salão o fundo é claro (#fdf8f5, src/app/salao/page.tsx:144) e o bloco que envolve o formulário foi copiado com as classes escuras: src/app/salao/page.tsx:683 usa 'border-white/10 bg-white/[.03]' e a linha 687 usa 'text-stone-400'.
  - O que falta: Na vertical salão o card de captura é praticamente invisível (borda e fundo brancos sobre fundo quase branco) e os campos do formulário ficam com texto claro sobre fundo claro. O único ponto de captura de lead do NexoBeleza está quebrado visualmente. Também é a única seção da página de salão sem <Reveal> (compare com src/app/salao/page.tsx:648 e 618). Precisa de variante de tema no componente.
  - Impacto: ALTO · Esforço: P

### Não atendido (15)

- **Pedido (b) do sócio: comunicar gestão de clientes e análise de frequência como DIFERENCIAL na landing**
  - Evidência: Os 6 cards de recurso da landing (src/app/page.tsx:34-71) são: agenda, reserva no celular, financeiro, marca própria, papéis de equipe e isolamento de dados — nenhum sobre clientes. O marquee (src/app/page.tsx:134-142) também não cita clientes. A única menção é meia frase no subtítulo (src/app/page.tsx:238: 'saiba quais clientes precisam voltar') e um item de bullet de plano (src/app/page.tsx:594: 'Clientes, serviços e equipe'). Enquanto isso o produto ENTREGA: src/app/(dashboard)/clientes/page.tsx:31-41 tem os buckets 'Retorno previsto já passou', 'Próximos do retorno' e o hint de intervalo, e src/app/(dashboard)/clientes/page.tsx:289 mostra 'Retorno previsto'.
  - O que falta: O melhor diferencial construído está invisível na venda. Falta um bloco dedicado (seção ou card de destaque) com a dor 'Quantos clientes sumiram sem você perceber?' + print real da tela /clientes mostrando a lista de retorno e o botão de reativação por WhatsApp. É o gancho de anúncio já escrito na §7 da apresentação.
  - Impacto: ALTO · Esforço: P
- **Pedido (c) do sócio: anual apresentado como padrão/recomendado e mensal como mais caro**
  - Evidência: Busca por 'anual', 'ano', 'yearly' em src/app/page.tsx e src/app/salao/page.tsx: ZERO resultados. Os dois cards de plano da landing (src/app/page.tsx:582 e 625; src/app/salao/page.tsx:538 e 581) mostram exclusivamente formatPriceBRL(...monthlyCents) com sufixo '/mês'. Em src/app/(dashboard)/assinatura/page.tsx:171-201 mensal e anual aparecem lado a lado com o mesmo peso visual — o anual só ganha uma borda 'border-primary/40' (linha 186), sem badge 'Recomendado' nem preço mensal riscado.
  - O que falta: Três coisas faltam: (1) a landing não menciona anual em lugar nenhum; (2) não há toggle mensal/anual nos cards de plano; (3) o mensal não é encarecido — os R$ 49,90 são o preço-base, então não existe a assimetria 'mensal mais caro' que o sócio pediu. Para implementar o método: subir uma nova versão em plan_prices com o mensal em patamar superior (ex.: 59,90/69,90), manter o anual em 499/999, e reescrever os cards com o anual pré-selecionado, badge 'Mais escolhido', preço mostrado como equivalente mensal e o mensal exibido como alternativa mais cara.
  - Impacto: ALTO · Esforço: M
- **Pedido (c) do sócio: ser possível efetivamente CONTRATAR o pacote anual**
  - Evidência: src/app/(dashboard)/assinatura/page.tsx:202-207 admite por escrito: 'O pagamento online (cartão e Pix) ainda não está disponível — estamos finalizando a integração com o provedor... fale com o suporte do NexoBarber'. O cadastro só aceita plano, nunca periodicidade: src/app/(auth)/cadastro/page.tsx:21-25 (input hidden 'plano') e src/modules/auth/actions.ts:82-84 (preferred_plan starter|plus). O webhook aceita period monthly|yearly (src/app/api/webhooks/payments/route.ts:18) mas não há nada que crie a cobrança. docs/entregas/fase-2b.md linha 'Decisão pendente (bloqueio externo)' confirma: provedor não contratado.
  - O que falta: Não existe checkout. O anual é um preço num banco de dados, não um produto vendável. Sem provedor de pagamento (Mercado Pago/Stripe/Asaas), toda a estratégia de desconto à vista depende de fechamento manual por WhatsApp. Essa é a decisão comercial de maior bloqueio do projeto.
  - Impacto: ALTO · Esforço: G
- **Pedido (d) do sócio: mecanismo de FOLLOW-UP por e-mail ou WhatsApp com oferta de desconto para lead que não converteu**
  - Evidência: Busca 'saas_leads' em todo src/ retorna UM único resultado: o INSERT em src/app/api/public/leads/route.ts:57. Nenhum SELECT em lugar algum. Busca 'funnel_stage' em src/: zero resultados (só a definição na migration linha 116) — o campo nasce 'lead_submitted' e nunca muda. vercel.json declara apenas 2 crons: /api/cron/billing e /api/cron/reminders (este último é lembrete de agendamento para clientes finais do tenant, não régua comercial — src/app/api/cron/reminders/route.ts:18-25). Busca por resend|nodemailer|sendgrid|postmark|mailgun em src/ e package.json: zero resultados.
  - O que falta: O lead entra e morre no banco. Falta tudo: (1) provedor de e-mail transacional; (2) rota de cron que leia saas_leads sem conversão após 24h/72h; (3) template da oferta; (4) atualização de funnel_stage e regra de parada por compra/descadastro; (5) opt-in de WhatsApp em template oficial (a infra de WhatsApp Cloud existe em src/lib/whatsapp-cloud.ts, mas só para lembrete de agendamento). docs/entregas/fase-5.md declara isso honestamente como 'planejado'.
  - Impacto: ALTO · Esforço: G
- **Pedido (d) do sócio: existir cupom/desconto no sistema para a oferta imperdível do anual**
  - Evidência: Busca case-insensitive por 'cupom|coupon|discount|desconto' em src/ (--include=*.ts --include=*.tsx): ZERO resultados. Busca por 'desconto' em supabase/migrations/: nenhuma tabela de cupom. As únicas menções a desconto nos docs são sobre desconto em venda de produto ao cliente final da barbearia (docs/05-regras-de-negocio.md:103, docs/entregas/fase-0.md:87), não sobre o SaaS.
  - O que falta: Não existe entidade de cupom, código promocional, preço promocional por lead, nem campo de desconto em subscriptions/plan_prices. Sem isso a 'oferta imperdível no pacote anual' não tem como ser aplicada nem rastreada — precisaria de tabela de cupons (código, percentual/valor, validade, uso único, vínculo ao lead) e leitura no futuro checkout.
  - Impacto: ALTO · Esforço: M
- **Pedido (d) do sócio: ser possível ao menos VER e trabalhar os leads capturados**
  - Evidência: src/app/admin/page.tsx (super-admin) lista apenas barbershops e subscriptions — busca por 'lead' no arquivo retorna só um falso positivo em 'leading' de classe CSS (linha 158). Não existe rota /admin/leads: busca por diretórios em src/app/admin retorna somente layout.tsx e page.tsx.
  - O que falta: Ninguém no time consegue ver quem preencheu o formulário sem abrir o SQL editor do Supabase. Uma tela simples em /admin listando saas_leads (nome, contato, canal, plano de interesse, UTM, data, estágio) com botão de 'abrir WhatsApp' seria o mínimo para o follow-up manual funcionar enquanto a régua automática não existe.
  - Impacto: ALTO · Esforço: P
- **Apresentação §2 e §6: usar os 5 Gs (Agenda, Clientes, Financeiro, Equipe, Vendas e Estoque) como arquitetura de comunicação da página**
  - Evidência: Busca por '5 Gs', 'cinco Gs', 'G1', 'Gestão da Agenda', 'Gestão de Clientes' em src/ e docs/: ZERO resultados. Os 6 cards de recurso (src/app/page.tsx:34-71) seguem outra taxonomia: 'Agenda sem conflito', 'Reserva pelo celular', 'Financeiro integrado', 'Sua marca, sua página', 'Equipe com papéis', 'Isolamento real' — dois deles (marca própria e isolamento) não correspondem a nenhum G, e o G2 (Clientes) e o G5 (Vendas e Estoque) não têm card algum.
  - O que falta: Reescrever a seção de recursos como exatamente 5 blocos nomeados G1..G5, cada um com a pergunta do dono e o resultado prometido da tabela da §2, e uma tela real do sistema. É a decisão nº 1 da §8 da apresentação e a base para as 5 campanhas de tráfego da §7.
  - Impacto: ALTO · Esforço: M
- **Apresentação §5 e §6: título principal da página 'Você domina a cadeira. Agora, domine o negócio.'**
  - Evidência: src/app/page.tsx:229-235 traz 'Gestão simples para barbearias que querem crescer.' — que é uma das 'outras opções de slogan para teste' da apresentação (linha 128), não o título principal recomendado. Busca por 'domina a cadeira' em src/ e docs/: ZERO resultados.
  - O que falta: Trocar o h1 pelo texto aprovado, ou registrar formalmente a decisão de testar a variante. Hoje não há registro de que a escolha foi deliberada.
  - Impacto: MEDIO · Esforço: P
- **Apresentação §5 e §6: chamada para ação 'Quero organizar minha barbearia'**
  - Evidência: Busca por 'Quero organizar' em src/: ZERO resultados. Os CTAs reais são 'Testar grátis' (src/app/page.tsx:196), 'Começar 7 dias grátis' (linhas 248, 610, 717), 'Testar o Plus grátis' (linha 651), 'Ver página de demonstração' (linha 257) e 'Quero saber mais' (src/components/platform/lead-capture-form.tsx:156).
  - O que falta: Nenhum botão usa a linguagem de transformação recomendada. A §7 da apresentação permite 'Testar grátis' se o cadastro já for simples — o que é verdade aqui — mas então a decisão precisa ser consciente e a mensagem de organização deve migrar para o h1.
  - Impacto: BAIXO · Esforço: P
- **Apresentação §6: converter com UMA única ação principal**
  - Evidência: O hero apresenta dois botões grandes lado a lado com peso quase igual: src/app/page.tsx:242-250 ('Começar 7 dias grátis', primário) e :251-258 ('Ver página de demonstração', outline h-13). Somando a página inteira há três destinos concorrentes: /cadastro (linhas 196, 248, 609, 651, 717, 760), /aurora demonstração (linhas 257 e 764) e o formulário de lead (linha 736, botão 'Quero saber mais').
  - O que falta: Não são os 4 botões que a apresentação proíbe, mas também não é uma ação única. O caminho de menor esforço: rebaixar 'Ver página de demonstração' a link textual sob o CTA e manter o formulário de lead apenas no final da página (onde já está) como saída secundária explícita.
  - Impacto: MEDIO · Esforço: P
- **Apresentação §6 — o que evitar: abrir com uma lista longa de recursos**
  - Evidência: src/app/page.tsx:134-142 define marqueeItems com 7 recursos ('Agenda online', 'Financeiro integrado', 'Página personalizável', 'QR Code no balcão', 'Estoque e produtos', 'Equipe com papéis', 'Relatório em PDF') e src/app/page.tsx:337-351 renderiza esse marquee em rolagem infinita IMEDIATAMENTE após o hero, antes de qualquer contexto de dor ou promessa. Logo abaixo vêm mais 6 cards de recurso (linhas 366-380). São 13 recursos listados antes de a página explicar um único problema.
  - O que falta: Violação direta e literal da regra. Substituir o marquee pelo bloco de dor, ou movê-lo para depois dos 5 Gs como reforço.
  - Impacto: ALTO · Esforço: P
- **Apresentação §6 e §8: prova social verdadeira — não divulgar depoimento não validado (risco comercial e legal)**
  - Evidência: src/app/page.tsx:113-132 declara três depoimentos com nome próprio e cargo ('Rafael, Dono de barbearia, 2 cadeiras'; 'Diego, Barbeiro e gestor'; 'Marcos, Barbearia de bairro, 4 profissionais'), renderizados em blockquote com aspas na seção 'Quem usa, recomenda' (linhas 661-688). Idem em src/app/salao/page.tsx:99-118 (Camila, Patrícia, Juliana). Não existe nenhum arquivo, migration ou doc que registre a origem desses depoimentos. docs/entregas/fase-5.md afirma 'Prova social: nenhum depoimento adicionado — o plano proíbe depoimento não validado', mas os seis depoimentos já estavam na página desde commits anteriores (git log de src/app/page.tsx: commit 041d002 'Vitrines novas') e permaneceram.
  - O que falta: É o item de MAIOR risco desta dimensão. Seis depoimentos nominais e não verificáveis numa página de venda expõem a empresa a publicidade enganosa (CDC art. 37) e ao código do CONAR. Ação: remover os seis até haver clientes reais que autorizem por escrito, ou substituir por prova que não depende de terceiro (a demo pública /aurora e /studio-aurora, que já existem e estão no sitemap.ts).
  - Impacto: ALTO · Esforço: P
- **Apresentação §6: provar simplicidade com telas reais do sistema e vídeo curto no celular**
  - Evidência: Todas as imagens da landing são fotografia de barbearia, não do produto: src/app/page.tsx:283-289 (REAL_PHOTOS.barberCut no hero) e :418-458 (galeria com interior, beardTrim e clippers). O único vislumbre de interface é um mockup desenhado em HTML com dados fictícios (src/app/page.tsx:294-331). Busca por 'video', 'mp4' ou '<video' em src/app/page.tsx: ZERO resultados.
  - O que falta: A promessa central do posicionamento é simplicidade, e a landing não mostra uma única tela real. Faltam capturas de /agenda, /clientes (lista de retorno), /financeiro e /comissoes, e o vídeo de 30-90s no celular previsto na §7.
  - Impacto: ALTO · Esforço: M
- **Apresentação §7: iscas de lead com utilidade real (diagnóstico dos 5 Gs, calculadora de lucro, calculadora de comissão, checklist)**
  - Evidência: Busca por 'calculadora|diagnóstico|diagnostico|checklist|quiz' em src/ (--include=*.ts --include=*.tsx): o único resultado é src/components/dashboard/activation-checklist.tsx, que é o checklist de ativação DENTRO do painel (usado em src/app/(dashboard)/dashboard/page.tsx:384), não uma isca pública. Não existe nenhuma rota pública de ferramenta: src/app/ tem apenas as landings, (auth), (dashboard), (legal), (print), (public), admin, api e onboarding.
  - O que falta: A única oferta de captura é 'Prefere que a gente fale com você?' (src/app/page.tsx:729-735), que exige que o visitante queira ser abordado — a isca de menor conversão possível. Falta pelo menos uma ferramenta pública de valor imediato; a calculadora de comissão é a mais barata de construir e a mais alinhada com a dor recorrente do nicho.
  - Impacto: ALTO · Esforço: M
- **Guia visual §7.9: a página de plano do sistema deve se chamar 'Meu plano NexoBarber', nunca apenas 'Assinatura' (para não confundir com os planos vendidos aos clientes da barbearia)**
  - Evidência: src/app/(dashboard)/assinatura/page.tsx:61 define title='Assinatura' e src/components/layout/user-menu.tsx:74-75 rotula o item de menu como 'Assinatura'. O guia é explícito em GUIA_VISUAL.md §7.9 ('Não usar apenas Assinatura, pois isso se confunde com os planos vendidos aos clientes') e na tabela de vocabulário §8.1 ('Assinatura, no perfil → Meu plano NexoBarber'). O conflito é real: existe /planos (src/app/(dashboard)/planos/page.tsx) que são os planos de assinatura vendidos aos clientes finais da barbearia.
  - O que falta: Renomear o título da página e o item do menu do usuário. O guia também pede 'forma de pagamento' e botão 'Gerenciar pagamento' nesse card — ambos ausentes, mas isso depende do provedor de pagamento.
  - Impacto: MEDIO · Esforço: P

### Apontado pelo verificador (não coberto na primeira passada)

- RISCO LEGAL MAIOR QUE OS DEPOIMENTOS, NÃO CHECADO: a copy promete 'cancele quando quiser' cinco vezes (src/app/page.tsx:262 e :567; src/app/salao/page.tsx:254 e :522; src/app/(dashboard)/assinatura/page.tsx:183) e NÃO EXISTE cancelamento self-service. A única função de cancelamento é cancelSubscription em src/modules/platform/actions.ts:54, que passa por requirePlatformAdmin() (linha 26) e está ligada exclusivamente ao console de super-admin (src/components/platform/admin-row-actions.tsx:43). O dono do tenant só recebe 'fale com o suporte' (assinatura/page.tsx:202-207). Exposição ao CDC art. 6º III e ao Decreto 11.034/2022 art. 5º (cancelamento pelo mesmo meio da contratação).
- CONTRADIÇÃO DE ESCOPO DE PLANO ENTRE A VENDA E O PRODUTO, NÃO CHECADA: src/app/page.tsx:596 vende 'Relatório financeiro em PDF' como benefício do plano PADRÃO (R$ 49,90), enquanto src/lib/billing/index.ts:40 lista 'Relatórios em PDF' como benefício exclusivo do PLUS — e é essa lista (PLANS[].features) que src/app/(dashboard)/assinatura/page.tsx:146 renderiza para o cliente já pagante. O mesmo produto tem duas descrições comerciais incompatíveis. (Na prática /relatorios não é gated por plano — src/app/(dashboard)/relatorios/page.tsx:32 só checa can(role,'reports:view') — logo o benefício anunciado como exclusivo do Plus não é exclusivo de nada.)
- VIOLAÇÃO DIRETA DO §3 DA APRESENTAÇÃO, NÃO CHECADA: a apresentação afirma textualmente que 'dizer apenas que o NexoBarber é um sistema completo não cria uma posição própria'. A landing faz exatamente isso em dois pontos de máxima visibilidade: o <title> em src/app/page.tsx:29 ('NexoBarber — o sistema completo para a sua barbearia') e o badge acima do h1 em src/app/page.tsx:227 ('Plataforma completa para barbearias'). Idem em src/app/salao/page.tsx:29. O auditor checou slogan, h1 e CTA, mas não o posicionamento.
- SUBTÍTULO RECOMENDADO E ASSINATURA CURTA (§5), NÃO CHECADOS: o subtítulo aprovado cita os cinco domínios ('Agenda, clientes, financeiro, equipe e vendas'); o real (src/app/page.tsx:237-239) omite vendas/estoque (G5). A assinatura curta 'NexoBarber. Gestão simples. Barbearia forte.' não existe: busca por 'Barbearia forte' em src/ retorna zero.
- POSICIONAMENTO DO FORMULÁRIO DE LEAD vs. O PEDIDO (d), NÃO AVALIADO: o sócio pediu captura 'pra se o lead não comprar na hora'. O formulário está na ÚLTIMA seção antes do rodapé (src/app/page.tsx:726-739), depois do CTA final — quem abandona antes do fim da página nunca o vê. Não há exit-intent, sticky bar nem captura no topo. A isca é 'Prefere que a gente fale com você?', não uma oferta.
- LGPD — PROVA DE CONSENTIMENTO, NÃO CHECADA: public.saas_leads (supabase/migrations/202607240025_fase2b_cobranca_saas.sql:104-118) grava consent boolean e created_at, mas não registra IP, user-agent nem o texto/versão do termo aceito, e não tem coluna de opt-out/descadastro — apesar de o próprio formulário prometer opt-out (lead-capture-form.tsx:141). O auditor marcou a tabela como ATENDIDO sem avaliar suficiência probatória (LGPD art. 8 §2).
- KPI OPERACIONAL FANTASMA, NÃO CHECADO: docs/12-operacao.md:55 lista 'saas_leads.funnel_stage (banco)' como métrica de operação a ser acompanhada, mas o campo nasce com o default 'lead_submitted' (migration linha 116) e nunca é atualizado por nada. O auditor provou que funnel_stage não é escrito, mas não notou que a documentação operacional já promete monitorá-lo.
- AFIRMAÇÃO DO RESUMO SEM EVIDÊNCIA: o resumo credita 'Meta Pixel com gate de LGPD' sem nenhum item nem arquivo:linha. A infra de fato existe (src/components/platform/meta-pixel.tsx, src/components/platform/consent-banner.tsx, src/lib/consent.ts, src/components/platform/welcome-conversion.tsx), mas nenhum requisito da lista a classifica — ou seja, a checagem do rastreamento de conversão da camada comercial ficou fora da matriz auditada.
- A LANDING DO SALÃO (src/app/salao/page.tsx, 743 linhas) só foi auditada em três pontos (preço, lead, depoimentos). Todos os itens de arquitetura de comunicação — h1 (linha 221-227), sequência de seções, marquee, ausência de FAQ, único CTA — foram avaliados apenas contra src/app/page.tsx, embora o escopo liste as duas landings como alvo.

---

