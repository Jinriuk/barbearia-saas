# 08 — Checklist de QA

## Automatizado

- [x] TypeScript strict (`npm run typecheck`);
- [x] ESLint (`npm run lint`);
- [x] testes de matriz de permissões (`npm test`);
- [x] build de produção (`npm run build`);
- [x] auditoria npm sem vulnerabilidades conhecidas;
- [ ] migrations aplicadas em projeto Supabase local/remoto;
- [ ] testes RLS automatizados com JWTs de papéis diferentes.

## Autenticação e tenant

- [ ] cadastro envia confirmação sem revelar conta existente;
- [ ] login inválido usa mensagem genérica;
- [ ] reset envia link, nunca senha;
- [ ] logout revoga sessão local;
- [ ] onboarding cria barbearia/settings/owner na mesma transação;
- [ ] slug duplicado é recusado;
- [ ] usuário A não acessa dados de B alterando body/URL;
- [ ] membership suspensa perde acesso.

## Papéis

- [ ] owner acessa tudo do próprio tenant;
- [ ] manager não gerencia assinatura/memberships;
- [ ] receptionist não acessa financeiro/settings;
- [ ] professional vê apenas sua agenda/comissão;
- [ ] client não entra no painel e vê apenas seus agendamentos.

## CRUD MVP

- [ ] criar, editar e desativar serviço;
- [ ] preço e duração inválidos são recusados;
- [ ] criar, editar e desativar profissional;
- [ ] configurar serviços e disponibilidade do profissional;
- [ ] criar, editar e desativar cliente;
- [ ] telefone é único somente dentro do tenant;
- [ ] históricos impedem exclusão insegura.

## Agenda

- [ ] disponibilidade respeita timezone e dia da semana;
- [ ] duração altera hora final;
- [ ] bloqueio remove slots;
- [ ] pending/confirmed/completed bloqueiam overlap;
- [ ] canceled/no_show liberam intervalo;
- [ ] horários adjacentes são aceitos;
- [ ] duas reservas simultâneas resultam em apenas uma;
- [ ] remarcação revalida regras;
- [ ] antecedência mínima é respeitada.

## Página pública e Storage

- [ ] somente dados publicáveis aparecem;
- [ ] telefone interno e notas não vazam;
- [ ] cores mantêm contraste aceitável;
- [ ] booking funciona em 360 px;
- [ ] upload rejeita MIME/tamanho inválido;
- [ ] path de outro tenant é recusado;
- [ ] documento privado exige membership autorizada.

## Navegadores e acessibilidade

- [ ] Chrome, Edge, Firefox e Safari atuais;
- [ ] teclado percorre formulário e selects;
- [ ] labels e mensagens são lidas por leitor de tela;
- [ ] foco é visível;
- [ ] contraste WCAG AA;
- [ ] zoom 200% sem perda de operação.
