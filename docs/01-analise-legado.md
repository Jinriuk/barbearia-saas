# 01 — Análise do sistema legado

## Escopo e preservação

O legado analisado está em `../barbearia/`, acompanhado do dump `../barbearia.sql`.
Ele foi tratado exclusivamente como referência funcional. Nenhum arquivo do legado foi
alterado.

O briefing solicitava que o novo projeto também fosse criado em `barbearia/`, mas essa
pasta já contém o sistema antigo. Para eliminar qualquer risco de sobrescrita, o novo
projeto foi criado em `barbearia-saas/`.

## Resumo executivo

O sistema é uma aplicação monolítica PHP/MySQL, com páginas públicas e um painel
administrativo baseado em includes, jQuery/AJAX, Bootstrap, DataTables e geração de PDF
com Dompdf. Foram encontrados 655 arquivos, dos quais 366 são PHP, além de uma cópia
vendorizada do Dompdf e bibliotecas de frontend mantidas diretamente no repositório.

O banco possui 21 tabelas, todas com chave primária inteira, mas sem chaves estrangeiras,
índices de negócio, migrations, isolamento por empresa ou constraints que garantam
integridade entre os módulos. O sistema modela uma única barbearia.

## Estrutura encontrada

- `barbearia/`: site público, catálogo e agendamento;
- `barbearia/ajax/`: endpoints públicos para cadastro, consulta e agendamento;
- `barbearia/sistema/`: login, conexão e recuperação de senha;
- `barbearia/sistema/painel/`: shell do painel, sessão e permissões visuais;
- `barbearia/sistema/painel/paginas/`: módulos CRUD;
- `barbearia/sistema/painel/rel/`: relatórios em PDF;
- `barbearia/sistema/painel/img/`: uploads gravados no mesmo filesystem da aplicação;
- `barbearia/sistema/dompdf/`: dependência vendorizada;
- `barbearia.sql`: estrutura e dados MySQL.

## Módulos e fluxos encontrados

| Área         | Funcionalidade no legado                                            | Destino no novo SaaS                                        |
| ------------ | ------------------------------------------------------------------- | ----------------------------------------------------------- |
| Site público | Início, sobre, serviços, produtos, depoimentos e contato            | Página pública white label por slug                         |
| Agendamento  | Seleção de profissional, serviço, data e slot fixo                  | Agendamento por intervalo, disponibilidade e tenant         |
| Autenticação | Login por e-mail/CPF e senha MD5                                    | Supabase Auth                                               |
| Pessoas      | Usuários, funcionários, clientes, fornecedores                      | Profiles, memberships, professionals, clients, suppliers    |
| Agenda       | Agenda geral e agenda do profissional                               | Appointments, availability rules e time blocks              |
| Serviços     | Categorias, preço, comissão e retorno                               | Services e, no futuro, service categories                   |
| Produtos     | Catálogo, categoria, compra, venda e estoque                        | Products e inventory movements                              |
| Financeiro   | Vendas, compras, pagar, receber e comissões                         | Financial transactions, payables, receivables e commissions |
| Fidelidade   | Cartões e quantidade configurável                                   | Roadmap, fora do MVP inicial                                |
| Retorno      | Data de retorno e alerta ao cliente                                 | Follow-up derivado de atendimento/serviço                   |
| Permissões   | Grupos, acessos e permissões por usuário                            | Papéis fixos + autorização no backend + RLS                 |
| Conteúdo     | Textos da home, imagens, comentários                                | Tenant settings e public site sections                      |
| Relatórios   | Produtos, entradas, saídas, comissões, contas, lucro e aniversários | Reports com filtros e exportação futura                     |

## Entidades do banco legado

| Tabela legada                                     | Responsabilidade                       | Observação                                                  |
| ------------------------------------------------- | -------------------------------------- | ----------------------------------------------------------- |
| `usuarios`                                        | Usuários e profissionais               | Mistura identidade, autenticação, perfil, cargo e dados PIX |
| `clientes`                                        | Cadastro e fidelidade                  | Telefone funciona como identificador informal               |
| `agendamentos`                                    | Agenda                                 | Armazena data e hora separadas e não possui hora final      |
| `servicos`                                        | Catálogo de serviços                   | Possui preço, comissão, retorno, foto e flag ativa          |
| `dias`, `horarios`                                | Disponibilidade por profissional       | Slots fixos e dias em texto                                 |
| `produtos`                                        | Catálogo e saldo de estoque            | Saldo é mutável na própria linha                            |
| `entradas`, `saidas`                              | Movimentos de estoque                  | Não há FK nem garantia transacional                         |
| `fornecedores`                                    | Fornecedores                           | Inclui dados de pagamento PIX                               |
| `pagar`, `receber`                                | Financeiro                             | Muitas relações opcionais codificadas como inteiros `0`     |
| `cargos`                                          | Cargos                                 | Texto usado como nível do usuário                           |
| `acessos`, `grupo_acessos`, `usuarios_permissoes` | Permissões                             | Usadas principalmente para ocultar menus                    |
| `cat_produtos`, `cat_servicos`                    | Categorias                             | Não possuem integridade referencial                         |
| `config`                                          | Identidade e conteúdo da única empresa | Será dividido em barbershops/settings/sections              |
| `textos_index`, `comentarios`                     | Conteúdo público                       | Comentários possuem moderação por flag                      |

## Regras de negócio identificadas

### Agenda

- o profissional informa dias da semana e uma lista de horários fixos;
- o agendamento público seleciona profissional, serviço, data e hora;
- o telefone localiza ou cria o cliente;
- o conflito atual é verificado por igualdade de `funcionario + data + hora`;
- profissionais com `atendimento = Sim` possuem agenda própria;
- o painel separa agenda geral e “minha agenda”;
- serviços realizados podem gerar conta a receber, comissão e retorno;
- o legado usa principalmente o status textual `Agendado`.

### Serviços e comissões

- serviço tem categoria, preço, foto, percentual/valor de comissão, dias de retorno e
  ativação;
- a configuração global determina o tipo de comissão;
- a baixa de serviços alimenta registros financeiros e comissões.

### Produtos e estoque

- produto tem preço de compra, preço de venda, saldo, estoque mínimo, categoria e foto;
- entradas e saídas guardam quantidade, motivo, data e usuário;
- compras e vendas podem gerar contas financeiras;
- exclusões são impedidas em alguns fluxos quando existem vínculos, porém essa regra é
  aplicada apenas no código PHP.

### Clientes

- telefone é utilizado para localizar cadastro no agendamento público;
- existem data de nascimento, fidelidade, último serviço, data de retorno e alerta;
- há relatórios de aniversariantes e clientes para retorno.

## Equivalência legado → novo domínio

| Legado                            | Novo SaaS                                                   | Decisão                                                |
| --------------------------------- | ----------------------------------------------------------- | ------------------------------------------------------ |
| `config`                          | `barbershops` + `tenant_settings` + `public_site_sections`  | Separar identidade, configuração e conteúdo            |
| `usuarios`                        | `auth.users` + `profiles` + `memberships` + `professionals` | Remover senha e papel da tabela de perfil              |
| `clientes`                        | `clients`                                                   | Adicionar tenant, e-mail e vínculo opcional com auth   |
| `agendamentos`                    | `appointments`                                              | Usar `timestamptz`, intervalo e constraint de conflito |
| `dias`, `horarios`                | `professional_availability`                                 | Regra semanal por intervalo                            |
| —                                 | `schedule_blocks`                                           | Bloqueios/férias/indisponibilidades                    |
| `servicos`                        | `services`                                                  | Duração obrigatória e preço em `numeric`               |
| `produtos`                        | `products`                                                  | Saldo derivado por movimentos                          |
| `entradas`, `saidas`              | `inventory_movements`                                       | Um ledger tipado e auditável                           |
| `pagar`, `receber`                | `accounts_payable`, `accounts_receivable`                   | Separar contas e transações                            |
| registros de serviço/venda/compra | `financial_transactions`                                    | Ledger financeiro único                                |
| comissões em `pagar`              | `commissions`                                               | Entidade própria                                       |
| `fornecedores`                    | `suppliers`                                                 | Tenant e dados normalizados                            |
| permissões por acesso             | papéis em `memberships`                                     | Backend e RLS como autoridade                          |
| `textos_index`                    | `public_site_sections`                                      | Conteúdo ordenado e publicável                         |
| `comentarios`                     | roadmap de testimonials                                     | Não bloqueia o MVP                                     |

## Riscos de segurança confirmados

1. A tabela `usuarios` guarda senha em texto puro e hash MD5.
2. A recuperação consulta e envia a senha original por e-mail.
3. Há criação de usuário com senha padrão `123`.
4. Diversas consultas interpolam diretamente `$_POST`, variáveis de sessão e parâmetros.
5. A aplicação usa permissões para ocultar navegação, sem uma política uniforme de
   autorização em cada endpoint.
6. Endpoints públicos permitem consultar dados por telefone e excluir agendamentos por
   identificador.
7. Não há proteção CSRF identificável nos formulários e endpoints.
8. Uploads validam principalmente a extensão informada, sem verificação robusta de MIME,
   tamanho, conteúdo, path por tenant ou antivírus.
9. Erros são frequentemente suprimidos com `@`, o que oculta falhas e dificulta auditoria.
10. Não há rate limiting, trilha de auditoria ou expiração segura para ações sensíveis.
11. Credenciais de banco ficam em arquivo PHP e o dump inclui dados de produção/exemplo.
12. Não há RLS, multi-tenant ou barreira estrutural contra acesso entre empresas.

## Riscos de integridade e concorrência

- nenhuma FK foi encontrada no dump;
- não existem índices compostos para consultas de agenda;
- não existe `ends_at` nem duração no agendamento;
- o conflito compara apenas hora inicial exata;
- agendamentos cancelados não têm semântica consistente;
- a checagem e a inserção são duas operações, permitindo condição de corrida;
- datas e horas são locais, sem timezone;
- valores sentinela como `0`, strings `Sim/Não` e nomes de status substituem enums/FKs;
- exclusões físicas podem deixar dados órfãos;
- estoque e financeiro dependem de múltiplas atualizações sem transação explícita.

## O que será aproveitado

- mapa funcional e vocabulário em português da interface;
- catálogo de módulos e relatórios;
- fluxo simples de agendamento;
- disponibilidade por profissional;
- serviço com duração, preço, retorno e comissão;
- gestão de estoque por movimento;
- conteúdo público configurável;
- agenda própria e comissão própria do profissional;
- estados vazios, filtros e atalhos operacionais como intenção de produto.

## O que será descartado

- arquivos PHP, SQL MySQL e frontend antigo;
- esquema monolítico de usuário;
- autenticação, recuperação de senha e sessões próprias;
- MD5, senha em texto e credenciais padrão;
- queries interpoladas e endpoints AJAX sem contrato;
- permissões apenas visuais;
- uploads no filesystem da aplicação;
- dependências vendorizadas e bibliotecas desatualizadas;
- ids inteiros globais sem tenant;
- strings livres para estados e valores sentinela;
- exclusão física como padrão;
- geração síncrona e acoplada de relatórios.

## Revisão crítica da fase

- O legado foi mapeado sem alteração.
- As 21 tabelas e os principais fluxos foram identificados.
- Os riscos críticos impedem reaproveitamento técnico direto.
- Não há mecanismo seguro de multi-tenancy que possa ser migrado.
- A nova modelagem precisa impedir conflito no PostgreSQL, não apenas na interface.
- A nova pasta separada resolve a colisão de nomes sem tocar o legado.
