## Objetivo
Tornar óbvio que a área de tamanhos no card do produto (página inicial) é um **campo de seleção obrigatório**, evitando que o cliente passe direto sem escolher.

## Alterações em `src/routes/index.tsx` (bloco "Sizes", linhas ~169–195)

1. **Envolver os dois seletores** (Top + Legging) em um container destacado:
   - Borda tracejada + leve fundo `bg-muted/30` para chamar atenção.
   - Título no topo: **"SELECIONE O TAMANHO *"** (em maiúsculas, negrito, com asterisco vermelho indicando obrigatório).
   - Link "Tabela de medidas" no canto direito apontando para a seção da tabela.

2. **Rotular cada seletor com clareza:**
   - "TAMANHO DO TOP" (em vez de só "Top:")
   - "TAMANHO DA LEGGING" (em vez de só "Legging:")

3. **Feedback visual da seleção:**
   - Abaixo dos botões, mostrar "Selecionado: P" quando o usuário escolher, confirmando a ação.
   - `aria-label` em cada botão para acessibilidade ("Tamanho do top P", etc).
   - Botões ganham fundo `bg-background` no estado normal, para ressaltar contra o container.

## Resultado esperado
O cliente vê imediatamente um bloco destacado com chamada explícita para selecionar o tamanho, com rótulos claros, indicador de obrigatoriedade, atalho para tabela de medidas e confirmação visual da escolha.