#!/usr/bin/env bash
# fix-stats-error.sh
# Adiciona as constantes necessárias que o Vite não está encontrando.
set -euo pipefail

echo "▶ Corrigindo exportações em src/lib/types.ts..."
cat >> src/lib/types.ts <<'EOF'

export const METHOD_LABELS = {
  account: 'Conta Corrente',
  credit_card: 'Cartão de Crédito',
  cash: 'Dinheiro',
  pix: 'PIX'
};
EOF

echo "✅ Erro de importação resolvido!"
