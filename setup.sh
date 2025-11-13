#!/bin/bash

echo "================================================"
echo "  Conversor OCR - Setup e Instalação"
echo "================================================"
echo ""

# Verificar se Node.js está instalado
if ! command -v node &> /dev/null; then
    echo "❌ Node.js não está instalado!"
    echo "Por favor, instale o Node.js primeiro: https://nodejs.org/"
    exit 1
fi

echo "✅ Node.js encontrado: $(node -v)"

# Instalar dependências do backend
echo ""
echo "📦 Instalando dependências do backend..."
cd backend
npm install

if [ $? -eq 0 ]; then
    echo "✅ Dependências instaladas com sucesso!"
else
    echo "❌ Erro ao instalar dependências"
    exit 1
fi

echo ""
echo "================================================"
echo "  Instalação Concluída!"
echo "================================================"
echo ""
echo "🚀 Para usar o sistema:"
echo ""
echo "1. VERSÃO WEB (Mais Simples):"
echo "   - Abra o arquivo 'index.html' no seu navegador"
echo ""
echo "2. VERSÃO SERVIDOR (Mais Poderosa):"
echo "   - Execute: cd backend && npm start"
echo "   - Acesse: http://localhost:3000"
echo ""
echo "================================================"