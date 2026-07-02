# 04 — Row Level Security

## Princípio

RLS é a barreira final. Filtro na interface, slug, query string ou layout nunca concede
acesso. Todas as tabelas sensíveis têm RLS habilitada.

## Predicates

- `current_profile_id()`: profile da sessão;
- `is_barbershop_member(id)`: membership ativa;
- `has_barbershop_role(id, roles[])`: membership ativa em um dos papéis;
- `is_own_professional(id)`: vínculo do profissional com o profile;
- `is_own_client(id)`: vínculo do cliente com o profile.

As funções são `security definer`, usam `search_path = ''`, possuem SQL estático e
permissão de execução limitada. Isso evita recursão de policy sem abrir uma operação de
escrita.

## Matriz resumida

| Recurso                | Owner   | Manager       | Receptionist     | Professional               | Client                        |
| ---------------------- | ------- | ------------- | ---------------- | -------------------------- | ----------------------------- |
| Configuração           | total   | operacional   | —                | —                          | —                             |
| Memberships            | total   | leitura       | —                | própria leitura via tenant | própria leitura via tenant    |
| Serviços/profissionais | CRUD    | CRUD          | leitura          | leitura                    | leitura autenticada no tenant |
| Clientes               | CRUD    | CRUD          | criar/editar/ler | clientes da própria agenda | próprio cadastro              |
| Agenda                 | CRUD    | CRUD          | criar/editar/ler | própria agenda             | próprios horários             |
| Financeiro             | total   | total inicial | —                | própria comissão           | —                             |
| Auditoria              | leitura | leitura       | —                | —                          | —                             |
| Assinatura             | leitura | —             | —                | —                          | —                             |

## Exemplos

### Permitido

Uma recepcionista com membership ativa em A cria um cliente com
`barbershop_id = A`. A policy de insert aceita.

### Negado

A mesma sessão tenta gravar `barbershop_id = B`. `has_barbershop_role(B, ...)` retorna
false e o PostgreSQL rejeita a linha.

### Profissional

O profissional lê apenas appointments cujo `professional_id` está ligado ao seu profile.
Comissões usam o mesmo vínculo.

### Cliente

O cliente lê apenas appointments cujo `client_id` está ligado ao seu profile. Alterações
sensíveis devem passar por RPC própria com regras de cancelamento/remarcação, em vez de
um update genérico.

### Público

Anon não possui `SELECT` direto nas tabelas. As RPCs públicas devolvem somente campos
publicáveis e criam agendamento com validações transacionais. Telefone de profissional,
notas internas e dados financeiros não fazem parte do retorno.

## Riscos evitados

- trocar o tenant no body não concede acesso;
- adivinhar UUID não ignora policy;
- esconder menu não substitui autorização;
- associação cruzada é impedida por FK composta;
- service role não participa do fluxo do navegador;
- catálogos públicos não expõem colunas internas.

## Testes mínimos

1. owner A não lê nem altera A/B cruzados;
2. receptionist não acessa financeiro/settings;
3. professional vê somente agenda/comissão próprias;
4. client vê somente appointments próprios;
5. anon não executa `select` direto;
6. RPC pública rejeita serviço/profissional de tenants diferentes;
7. membership suspensa perde acesso imediatamente.
