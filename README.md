# 📄 OCR PDF Processor - v2.0

Sistema profissional de OCR para processos digitalizados com processamento paralelo, criação de PDFs pesquisáveis com layout preservado e suporte a qualquer tamanho/orientação de documento.

---

## ✨ Características v2.0

### 🚀 Performance
- **Processamento Paralelo**: Usa todos os CPUs disponíveis via Worker Threads
- **10-30x mais rápido** que versões sequenciais
- Otimizado para documentos de 1 a 500+ páginas

### 🎯 Qualidade
- **PDF Pesquisável**: Texto invisível posicionado com precisão pixel-perfeita
- **Layout 100% Preservado**: Ctrl+F destaca palavras na posição exata
- **Suporte Universal**: A4, Ofício, Carta, Paisagem, qualquer tamanho

### 🔒 Segurança & Privacidade
- **100% Local**: Todo processamento ocorre no servidor, sem APIs externas
- **Privado**: Documentos nunca são enviados para a nuvem
- **Ideal para**: Processos jurídicos, documentos sigilosos, LGPD/GDPR

### 🐛 Robustez
- ✅ Suporta PDFs mistos (páginas digitais + escaneadas)
- ✅ Detecção automática de PDFs protegidos por senha
- ✅ Tratamento robusto de erros com mensagens claras
- ✅ Suporte a qualquer tamanho/orientação de página

---

## 📦 Instalação

### Método 1: Docker (Recomendado)

**Requisitos:**
- Docker instalado
- Docker Compose (opcional, mas recomendado)

**Passos:**

```bash
# Clonar repositório
git clone <seu-repo>
cd Conversorocr

# Iniciar com Docker Compose
docker-compose up -d

# OU build manual:
docker build -t ocr-processor .
docker run -p 3000:3000 ocr-processor
```

**Acesse:** http://localhost:3000

**Vantagens:**
- ✅ Todas as dependências incluídas (GraphicsMagick, Ghostscript)
- ✅ Funciona em Windows, Mac e Linux
- ✅ Sem instalação manual de ferramentas
- ✅ Isolado e portável

---

### Método 2: Instalação Manual

Ver documentação completa em: **`INSTALACAO_WINDOWS.md`**

**Requisitos:**
- Node.js 14+
- GraphicsMagick
- Ghostscript

**Quick Start:**
```bash
cd backend
npm install
npm start
```

---

## 🚀 Uso

1. **Carregar PDF**: Arraste ou selecione arquivo
2. **Configurar**: Idioma, modo, formato
3. **Processar**: Aguardar conclusão
4. **Baixar**: PDF pesquisável ou TXT

---

## 🏗️ Arquitetura

- **Frontend**: Vue 3 + Vuetify (cliente leve)
- **Backend**: Node.js + Express + Worker Threads
- **OCR**: Tesseract.js
- **Conversão**: pdf2pic + GraphicsMagick + Ghostscript

---

## 🐳 Docker

```bash
# Iniciar
docker-compose up -d

# Parar
docker-compose down

# Logs
docker-compose logs -f

# Reconstruir
docker-compose up --build
```

---

## 📚 Documentação

- **REFACTORING_SUMMARY.md**: Refatoração v1.0
- **BUGFIXES_SEGUNDA_AUDITORIA.md**: Correções críticas
- **INSTALACAO_WINDOWS.md**: Guia Windows
- **TESTE_RAPIDO.md**: Guia de teste

---

## 📄 Licença

MIT License

---

**Versão:** 2.0.0 | **Status:** Produção ✅
