#!/usr/bin/env bash
#
# aplicar-tema-roxo.sh
# Restaura o design system completo (Tailwind v4) que a IA havia deletado,
# na paleta ROXA/LILAS com vidro fosco. Corrige o "texto invisivel"
# (text-muted-foreground), tokens do shadcn (accent/popover/sidebar/ring),
# escala de raios, fontes (Plus Jakarta + Geist Mono) e .glass-card.
# Valida com build e da push no main.
#
# Uso (na raiz do repo, no Codespace):
#   bash aplicar-tema-roxo.sh
#
set -euo pipefail

git rev-parse --is-inside-work-tree >/dev/null 2>&1 || { echo "ERRO: rode na raiz do repositorio git."; exit 1; }
cd "$(git rev-parse --show-toplevel)"

STAMP="$(date +%Y%m%d-%H%M%S)"
TAG="backup/pre-tema-${STAMP}"
git tag "$TAG"
echo "==> Backup criado na tag: $TAG (reverter: git reset --hard $TAG)"

echo "==> Escrevendo src/index.css (design system roxo/lilas completo)..."
cat > src/index.css << 'CSS_EOF'
@import "tailwindcss";
@import "tw-animate-css";
@import "@fontsource/geist-mono/400.css";
@import "@fontsource/geist-mono/500.css";
@import "@fontsource/geist-mono/600.css";

@custom-variant dark (&:is(.dark *));

@theme inline {
  --font-sans: "Plus Jakarta Sans", "Geist Sans", system-ui, sans-serif;
  --font-mono: "Geist Mono", ui-monospace, monospace;
  --radius-sm: calc(var(--radius) - 6px);
  --radius-md: calc(var(--radius) - 3px);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) + 6px);
  --radius-2xl: calc(var(--radius) + 10px);
  --radius-3xl: calc(var(--radius) + 16px);
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-popover: var(--popover);
  --color-popover-foreground: var(--popover-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-tertiary: var(--tertiary);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive);
  --color-destructive-foreground: var(--destructive-foreground);
  --color-positive: var(--positive);
  --color-positive-foreground: var(--positive-foreground);
  --color-warning: var(--warning);
  --color-warning-foreground: var(--warning-foreground);
  --color-icon-bg: var(--icon-bg);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);
  --color-chart-1: var(--chart-1);
  --color-chart-2: var(--chart-2);
  --color-chart-3: var(--chart-3);
  --color-chart-4: var(--chart-4);
  --color-chart-5: var(--chart-5);
  --color-sidebar: var(--sidebar);
  --color-sidebar-foreground: var(--sidebar-foreground);
  --color-sidebar-primary: var(--sidebar-primary);
  --color-sidebar-primary-foreground: var(--sidebar-primary-foreground);
  --color-sidebar-accent: var(--sidebar-accent);
  --color-sidebar-accent-foreground: var(--sidebar-accent-foreground);
  --color-sidebar-border: var(--sidebar-border);
  --color-sidebar-ring: var(--sidebar-ring);
}

/*
  ============================================================
  TEMA — Dark default, acento violeta/lilas, vidro fosco
  Base #14121C · Card vidro (branco 5%) · Violeta #A78BFA / forte #7C3AED
  Lilas texto #C4B5FD · Verde #34D399 · Vermelho #F87171
  Texto: #FAFAFA (forte) / #A5A0B5 (secundario) / #6E6A7C (terciario)
  ============================================================
*/

:root {
  --radius: 1.25rem;
  --background: #14121C;
  --foreground: #FAFAFA;
  --card: rgba(255, 255, 255, 0.05);
  --card-foreground: #FAFAFA;
  --popover: #1C1924;
  --popover-foreground: #FAFAFA;
  --primary: #A78BFA;
  --primary-foreground: #2E1065;
  --primary-strong: #7C3AED;
  --secondary: rgba(255, 255, 255, 0.08);
  --secondary-foreground: #FAFAFA;
  --muted: rgba(255, 255, 255, 0.06);
  --muted-foreground: #A5A0B5;
  --tertiary: #6E6A7C;
  --accent: rgba(167, 139, 250, 0.16);
  --accent-foreground: #C4B5FD;
  --destructive: #F87171;
  --destructive-foreground: #1A0A0A;
  --positive: #34D399;
  --positive-foreground: #03281C;
  --warning: #FBBF24;
  --warning-foreground: #1C1207;
  --icon-bg: rgba(167, 139, 250, 0.18);
  --border: rgba(255, 255, 255, 0.10);
  --input: rgba(255, 255, 255, 0.10);
  --ring: #A78BFA;
  --chart-1: #A78BFA;
  --chart-2: #34D399;
  --chart-3: #F87171;
  --chart-4: #60A5FA;
  --chart-5: #FBBF24;
  --sidebar: #1C1924;
  --sidebar-foreground: #FAFAFA;
  --sidebar-primary: #A78BFA;
  --sidebar-primary-foreground: #2E1065;
  --sidebar-accent: rgba(167, 139, 250, 0.16);
  --sidebar-accent-foreground: #C4B5FD;
  --sidebar-border: rgba(255, 255, 255, 0.10);
  --sidebar-ring: #A78BFA;
}

.dark {
  --background: #14121C;
  --foreground: #FAFAFA;
  --card: rgba(255, 255, 255, 0.05);
  --card-foreground: #FAFAFA;
  --popover: #1C1924;
  --popover-foreground: #FAFAFA;
  --primary: #A78BFA;
  --primary-foreground: #2E1065;
  --primary-strong: #7C3AED;
  --secondary: rgba(255, 255, 255, 0.08);
  --secondary-foreground: #FAFAFA;
  --muted: rgba(255, 255, 255, 0.06);
  --muted-foreground: #A5A0B5;
  --tertiary: #6E6A7C;
  --accent: rgba(167, 139, 250, 0.16);
  --accent-foreground: #C4B5FD;
  --destructive: #F87171;
  --destructive-foreground: #1A0A0A;
  --positive: #34D399;
  --positive-foreground: #03281C;
  --warning: #FBBF24;
  --warning-foreground: #1C1207;
  --icon-bg: rgba(167, 139, 250, 0.18);
  --border: rgba(255, 255, 255, 0.10);
  --input: rgba(255, 255, 255, 0.10);
  --ring: #A78BFA;
  --chart-1: #A78BFA;
  --chart-2: #34D399;
  --chart-3: #F87171;
  --chart-4: #60A5FA;
  --chart-5: #FBBF24;
  --sidebar: #1C1924;
  --sidebar-foreground: #FAFAFA;
  --sidebar-primary: #A78BFA;
  --sidebar-primary-foreground: #2E1065;
  --sidebar-accent: rgba(167, 139, 250, 0.16);
  --sidebar-accent-foreground: #C4B5FD;
  --sidebar-border: rgba(255, 255, 255, 0.10);
  --sidebar-ring: #A78BFA;
}

@layer base {
  * {
    @apply border-border;
  }
  html, body {
    font-family: var(--font-sans);
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }
  body {
    @apply bg-background text-foreground;
    background-color: var(--background);
    overflow-x: hidden;
  }
  .font-mono {
    font-family: var(--font-mono);
    font-variant-numeric: tabular-nums;
  }
  .tabular-nums {
    font-variant-numeric: tabular-nums;
  }
  .glass-card {
    background: rgba(255, 255, 255, 0.05);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border: 1px solid var(--border);
  }
  .hide-scrollbar::-webkit-scrollbar {
    display: none;
  }
  .hide-scrollbar {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
  .pb-safe {
    padding-bottom: env(safe-area-inset-bottom);
  }
  @media screen and (max-width: 768px) {
    input, select, textarea {
      font-size: 16px !important;
    }
  }
}
CSS_EOF

echo "==> Escrevendo index.html (fonte Plus Jakarta + lang pt-BR)..."
cat > index.html << 'HTML_EOF'
<!doctype html>
<html lang="pt-BR" class="dark">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
    <meta name="theme-color" content="#09090b" />
    <title>Finanças</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
HTML_EOF

echo "==> Corrigindo typo de classe (primary_fg -> primary-foreground)..."
sed -i 's/text-primary_fg/text-primary-foreground/g' src/components/layout/BottomNav.tsx src/components/layout/Sidebar.tsx 2>/dev/null || true

echo "==> Garantindo dependencias..."
[ -d node_modules ] || npm install

echo "==> BUILD GATE (tsc + vite build)..."
if ! npm run build; then
  echo ""
  echo "############################################################"
  echo "# BUILD FALHOU. Nada foi commitado nem enviado.            #"
  echo "# Reverter: git reset --hard $TAG"
  echo "############################################################"
  exit 1
fi

echo "==> Build OK. Commitando e enviando para o main..."
git config user.email >/dev/null 2>&1 || git config user.email "jefherson@local"
git config user.name  >/dev/null 2>&1 || git config user.name  "Jefherson"
git add -A
git commit -m "style: restaura design system (roxo/lilas, vidro fosco) deletado pela IA + fontes Plus Jakarta/Geist Mono"
git push origin HEAD:main

echo ""
echo "############################################################"
echo "# SUCESSO. Tema roxo/lilas aplicado e enviado para o main. #"
echo "# Rode 'npm run dev' para ver. Backup na tag: $TAG"
echo "############################################################"
