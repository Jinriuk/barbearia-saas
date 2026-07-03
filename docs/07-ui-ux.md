# 07 — UI/UX

## Direção

O painel é claro, compacto e orientado à operação; a página pública tem caráter editorial
e recebe as cores do tenant. A interface usa Geist, tokens semânticos, um único destaque
quente e componentes acessíveis do shadcn/ui.

## Padrões

- sidebar no desktop e cabeçalho compacto no mobile;
- contexto da barbearia sempre visível;
- títulos descrevem tarefa, não nome técnico de tabela;
- cards para resumo, tabela para densidade e estados vazios desenhados;
- ações destrutivas são substituídas por desativação no MVP;
- status com badges e horários em fonte monoespaçada;
- formulários curtos e agrupados por intenção;
- booking em duas etapas: atendimento/horário e dados pessoais;
- loading, erro de conflito e confirmação fazem parte do fluxo.

## Mobile

Cards e grids colapsam para uma coluna, tabelas preservam scroll horizontal e a página
pública mantém o CTA visível. O booking evita calendários complexos e usa controles
nativos para data, adequados ao toque.

## White label

As variáveis `--tenant-primary`, `--tenant-secondary` e `--tenant-bg` são resolvidas no
servidor. A identidade nunca altera tokens do dashboard, evitando contraste imprevisível
em telas administrativas.
