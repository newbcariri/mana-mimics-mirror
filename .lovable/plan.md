## Plano de ajustes — FlexFit Store

### 1. Verificação de domínio Facebook
- `src/routes/__root.tsx`: substituir o conteúdo da meta `facebook-domain-verification` pelo novo valor `hibnvy385jscn0sa5pyii4nmpmavf9` (a meta já existe em todas as páginas via root route).

### 2. Validação de senha mais permissiva
- `src/routes/conta.tsx`: alterar o schema Zod do signup para `password: z.string().min(6, "A senha deve ter ao menos 6 caracteres")` (remove o limite de 8 e qualquer regra de complexidade).
- Manter validação obrigatória apenas de campo preenchido + 6 caracteres.

### 3. Endereço completo + número da residência + Minha Conta

**Banco de dados (migration):**
- Adicionar colunas em `profiles`:
  - `street` text
  - `number` text
  - `complement` text
  - `neighborhood` text
  - `city` text
  - `state` text
- Manter `cep` existente.

**Cadastro (`src/routes/conta.tsx`):**
- Após digitar CEP, consultar ViaCEP automaticamente, preencher rua/bairro/cidade/UF (read-only) e exigir campo "Número" + "Complemento" (opcional).
- Salvar tudo em `profiles` no signup.

**Checkout cartão (`src/routes/checkout.tsx` / cartão):**
- Carregar endereço de `profiles` automaticamente; não pedir número novamente se já preenchido.
- Se faltar número no perfil, mostrar campo inline.

**Nova página "Minha Conta" (`src/routes/minha-conta.tsx`):**
- Editar dados pessoais (nome, telefone, CPF read-only).
- Editar endereço (CEP, número, complemento, etc.).
- Link no menu/header para `/minha-conta`.
- Pedidos continuam em `/pedidos`.

### 4. Agrupamento de pedidos (1 pedido por checkout)

**Banco de dados (migration):**
- Criar tabela `order_items`:
  - `order_id` uuid (FK orders)
  - `product_name`, `color`, `top_size`, `legging_size`, `quantity` int, `unit_price` numeric, `subtotal` numeric, `image` text
- Criar tabela `order_history`:
  - `order_id`, `status` text, `note` text, `created_at`
- Em `orders`: adicionar `subtotal`, `shipping`, `discount`, `items_count`, `tracking_code` (text, nullable). Manter colunas antigas para compatibilidade (product_name/color/top_size/legging_size/quantity passam a representar o primeiro item ou ficar nullable).
- RLS para `order_items` e `order_history`: usuário lê via join com `orders.user_id`; admin gerencia tudo.

**Criação de pedido (`src/routes/checkout.tsx` + `src/routes/api/public/pix.ts` + `card.ts`):**
- Em vez de criar N pedidos (um por item do carrinho), criar **1** pedido em `orders` com totais agregados e inserir N linhas em `order_items`.
- Inserir histórico inicial: "Pedido criado" + "Aguardando pagamento".
- Webhook Asaas: ao confirmar pagamento, atualizar status + inserir linha no histórico ("Pagamento aprovado").

**Página "Meus Pedidos" (`src/routes/pedidos.tsx`):**
- Listar 1 card por pedido com: número, data, total, status, método, quantidade total de itens.
- Botão "Ver detalhes" → nova rota `src/routes/pedido.$orderId.tsx`.

**Página de detalhes (`src/routes/pedido.$orderId.tsx`):**
- Status do pedido + pagamento.
- Lista completa de `order_items` (cor/tops/leggings/qtd/preço/subtotal).
- Endereço de entrega.
- Frete, desconto, total, método de pagamento.
- Link para PIX ou dados do cartão quando aplicável.
- Código de rastreio se disponível.
- Histórico (`order_history`) em timeline.

### Detalhes técnicos
- Migration única cobrindo: novas colunas em `profiles`, novas colunas em `orders`, criação de `order_items` e `order_history` com RLS.
- ViaCEP no cadastro reaproveita a lógica do componente `shipping-calc.tsx`.
- Endpoint Asaas (pix.ts/card.ts): aceitar payload `{ items: [...], totals: {...} }` em vez de item único; mantém `notificationDisabled: true` já implementado.
- Webhook Asaas: gravar entrada em `order_history` ao mudar status.

### Itens NÃO incluídos
- Não vou alterar fluxo de autenticação (login, redirect) além do schema de senha.
- Não vou tocar no design system / cores.
- Não vou implementar gestão de múltiplos endereços salvos (a especificação pede "endereços salvos" no plural, mas o fluxo atual usa 1 endereço por perfil — vou manter 1 endereço editável + opção de definir como padrão fica implícita pois só há um). Se quiser múltiplos endereços com tabela separada, me avise.