#!/usr/bin/env bash
# new-project-from-template.sh
# Clona la plantilla SDD a un nuevo proyecto y lo prepara para arrancar.
#
# Uso:
#   ./new-project-from-template.sh <ruta-destino> <nombre-proyecto>
#
# Ejemplo:
#   ./new-project-from-template.sh ~/Desktop/domio domio

set -euo pipefail

# ─── Parámetros ──────────────────────────────────────────────────────
DEST="${1:-}"
PROJECT_NAME="${2:-}"

if [[ -z "$DEST" || -z "$PROJECT_NAME" ]]; then
  echo "Uso: $0 <ruta-destino> <nombre-proyecto>"
  echo ""
  echo "Ejemplo:"
  echo "  $0 ~/Desktop/domio domio"
  exit 1
fi

# Ruta de la plantilla (asumimos que el script está en /scripts/ de la plantilla)
TEMPLATE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "═══════════════════════════════════════════════════════════════"
echo "  SDD Project Bootstrap"
echo "═══════════════════════════════════════════════════════════════"
echo "  Plantilla origen: $TEMPLATE_DIR"
echo "  Destino:          $DEST"
echo "  Proyecto:         $PROJECT_NAME"
echo "═══════════════════════════════════════════════════════════════"
echo ""

# ─── Validaciones ────────────────────────────────────────────────────
if [[ -d "$DEST" ]]; then
  echo "❌ La carpeta de destino ya existe: $DEST"
  echo "   Borra o renombra esa carpeta antes de continuar."
  exit 1
fi

if ! command -v specify &> /dev/null; then
  echo "❌ El CLI 'specify' no está instalado."
  echo "   Instalación:"
  echo "     uv tool install specify-cli --from git+https://github.com/github/spec-kit.git"
  exit 1
fi

if ! command -v git &> /dev/null; then
  echo "❌ git no está instalado."
  exit 1
fi

# ─── Crear destino ───────────────────────────────────────────────────
echo "▶ Creando carpeta de destino..."
mkdir -p "$DEST"

# ─── Inicializar Spec Kit ────────────────────────────────────────────
echo "▶ Inicializando Spec Kit (specify init)..."
cd "$DEST"
specify init . --integration claude --script sh --ignore-agent-tools

# ─── Copiar subagentes y comandos personalizados ─────────────────────
echo "▶ Copiando subagentes (.claude/agents/)..."
cp -r "$TEMPLATE_DIR/.claude/agents/" "$DEST/.claude/agents/"

echo "▶ Copiando slash commands custom (.claude/commands/)..."
# Spec Kit ya añade sus propios commands en .claude/commands/.
# Añadimos los nuestros sin sobrescribir.
cp "$TEMPLATE_DIR/.claude/commands/bootstrap-project.md" "$DEST/.claude/commands/"
cp "$TEMPLATE_DIR/.claude/commands/execute-feature.md" "$DEST/.claude/commands/"
cp "$TEMPLATE_DIR/.claude/commands/audit-project.md" "$DEST/.claude/commands/"

# ─── Copiar plantilla de constitución ────────────────────────────────
if [[ -f "$TEMPLATE_DIR/.specify/memory/constitution.md" ]]; then
  echo "▶ Copiando constitution.md base..."
  cp "$TEMPLATE_DIR/.specify/memory/constitution.md" "$DEST/.specify/memory/constitution.md"
fi

# ─── Crear plantillas vacías de product.md y architecture.md ─────────
echo "▶ Creando plantillas de product.md y architecture.md..."

cat > "$DEST/.specify/memory/product.md" <<EOF
# product.md — $PROJECT_NAME

> Documento de contexto de producto. Describe qué se construye y para
> quién, en lenguaje de negocio. Reemplaza este contenido con la
> descripción real de tu producto antes de ejecutar /bootstrap-project.

## 1. Visión

[Reemplazar con la visión de $PROJECT_NAME]

## 2. Actores y objetivos

[Reemplazar]

## 3. Flujos principales

[Reemplazar]

## 4. Funcionalidad esperada

[Reemplazar]

## 5. Reglas de negocio

[Reemplazar]

## 6. Fuera de alcance

[Reemplazar]

## 7. Glosario

[Reemplazar]
EOF

cat > "$DEST/.specify/memory/architecture.md" <<EOF
# architecture.md — $PROJECT_NAME

> Decisiones técnicas estructurales. Es la traducción de constitution.md
> y product.md al stack concreto del proyecto. Reemplaza este contenido
> antes de ejecutar /bootstrap-project.

## 1. Identidad del sistema

[Reemplazar]

## 2. Stack tecnológico

[Reemplazar]

## 3. Decisiones estructurales clave

[Reemplazar]

## 4. Estructura de carpetas

[Reemplazar]

## 5. Despliegue

[Reemplazar]

## 6. Lo que NUNCA se permite

[Reemplazar]
EOF

# ─── Añadir .gitignore para .claude/ sensibles ───────────────────────
echo "▶ Configurando .gitignore..."
if [[ -f "$DEST/.gitignore" ]]; then
  if ! grep -q "^.claude/settings.local.json" "$DEST/.gitignore"; then
    {
      echo ""
      echo "# Claude Code local settings (puede contener credenciales)"
      echo ".claude/settings.local.json"
    } >> "$DEST/.gitignore"
  fi
else
  cat > "$DEST/.gitignore" <<EOF
node_modules/
.next/
.env.local
.env.*.local
.DS_Store
.claude/settings.local.json
EOF
fi

# ─── Init git ────────────────────────────────────────────────────────
echo "▶ Inicializando repositorio git..."
cd "$DEST"
if [[ ! -d ".git" ]]; then
  git init -q
fi
git add .
git commit -q -m "chore: bootstrap $PROJECT_NAME with SDD template"

# ─── Final ───────────────────────────────────────────────────────────
echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "  ✓ Proyecto $PROJECT_NAME creado en $DEST"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "Siguientes pasos:"
echo ""
echo "  1. cd $DEST"
echo ""
echo "  2. Edita .specify/memory/product.md con la visión real"
echo "     del producto."
echo ""
echo "  3. Edita .specify/memory/architecture.md con las decisiones"
echo "     técnicas concretas (stack, estructura, despliegue)."
echo ""
echo "  4. Opcionalmente edita .specify/memory/constitution.md si"
echo "     quieres ajustar algún principio para este proyecto."
echo ""
echo "  5. Abre Claude Code:"
echo "       claude"
echo ""
echo "  6. Genera el roadmap con:"
echo "       /bootstrap-project"
echo ""
echo "  7. Ejecuta la primera feature:"
echo "       /execute-feature 001"
echo ""
echo "  El orquestador se encarga del resto."
echo ""
