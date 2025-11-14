# 📄 OCR PDF Processor - v2.1

Sistema profissional de OCR para processos digitalizados com processamento paralelo, criação de PDFs pesquisáveis com layout preservado, suporte a qualquer tamanho/orientação de documento, e **duplo motor OCR** (Tesseract local + Google Document AI premium).

---

## ✨ Características v2.1

### 🤖 Duplo Motor OCR (NOVO em v2.1)
- **Tesseract.js**: OCR local grátis (85-90% precisão)
- **Google Document AI**: OCR premium (95-99% precisão)
- **Modo Híbrido**: Melhor dos dois mundos
- **Configurável**: Escolha via `.env`

### 🚀 Performance
- **Processamento Paralelo**: Usa todos os CPUs disponíveis via Worker Threads
- **10-30x mais rápido** que versões sequenciais
- Otimizado para documentos de 1 a 500+ páginas

### 🎯 Qualidade
- **PDF Pesquisável**: Texto invisível posicionado com precisão pixel-perfeita
- **Layout 100% Preservado**: Ctrl+F destaca palavras na posição exata
- **Suporte Universal**: A4, Ofício, Carta, Paisagem, qualquer tamanho

### 🔒 Segurança & Privacidade
- **100% Local (Tesseract)**: Todo processamento no servidor, sem APIs externas
- **Cloud Opcional (Document AI)**: Qualidade premium com Google Cloud
- **Você escolhe**: Privacidade total ou qualidade máxima
- **Ideal para**: Processos jurídicos, documentos sigilosos, LGPD/GDPR (use Tesseract)

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
- **OCR**: Tesseract.js (local) ou Google Document AI (nuvem)
- **Conversão**: pdf2pic + GraphicsMagick + Ghostscript

---

## 🤖 Motores OCR

O sistema suporta **dois motores OCR** que podem ser alternados via configuração:

### 1️⃣ Tesseract.js (Padrão)

**Características:**
- ✅ **Grátis e 100% local**
- ✅ **Privacidade total**: Documentos nunca saem do servidor
- ✅ **Funciona offline**
- ⚡ **Qualidade**: 85-90% de precisão
- 🌍 **Idiomas**: 100+

**Ideal para:**
- Documentos sigilosos (LGPD/GDPR)
- Ambientes sem internet
- Alto volume (sem custo por página)
- Usuários iniciantes

---

### 2️⃣ Google Cloud Document AI (Premium)

**Características:**
- 🎯 **Qualidade superior**: 95-99% de precisão
- 📊 **Tabelas**: Detecta estruturas complexas
- 🔢 **Fórmulas matemáticas**: Extrai em LaTeX
- 🌍 **Idiomas**: 200+ (50 manuscritos)
- 📄 **PDFs digitais**: Extrai texto nativo sem conversão
- 💰 **Custo**: US$ 1,50 / 1000 páginas (200 páginas = US$ 0,30/mês)

**Ideal para:**
- Documentos complexos com tabelas
- Necessidade de máxima qualidade
- Baixo volume (<5000 páginas/mês)
- Textos manuscritos

---

### 3️⃣ Modo Híbrido

Combina o melhor dos dois mundos:
1. Tenta Document AI primeiro
2. Fallback automático para Tesseract se falhar
3. Sempre funciona (Tesseract como backup)

---

## ⚙️ Configuração do Motor OCR

### Modo Padrão (Tesseract - Não requer configuração)

```bash
# Já funciona! Nada a configurar.
cd backend
npm install
npm start
```

---

### Ativar Document AI (Opcional)

**1. Criar conta Google Cloud:**
- Acesse: https://console.cloud.google.com
- Crie um projeto novo
- Ative o billing (US$ 300 grátis para novos usuários)

**2. Ativar Document AI API:**
```bash
gcloud services enable documentai.googleapis.com
```

**3. Criar Processador OCR:**
- Acesse: https://console.cloud.google.com/ai/document-ai
- Clique em "Create Processor"
- Escolha "Document OCR"
- Copie o Processor ID

**4. Criar Service Account:**
```bash
# Via gcloud CLI
gcloud iam service-accounts create ocr-processor \
    --display-name="OCR Processor"

gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
    --member="serviceAccount:ocr-processor@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/documentai.apiUser"

gcloud iam service-accounts keys create credentials.json \
    --iam-account=ocr-processor@YOUR_PROJECT_ID.iam.gserviceaccount.com
```

**5. Configurar variáveis de ambiente:**

Copie `.env.example` para `.env`:
```bash
cp .env.example .env
```

Edite `.env`:
```bash
OCR_ENGINE=documentai  # ou 'hybrid' ou 'tesseract'

GOOGLE_PROJECT_ID=seu-projeto-123456
GOOGLE_PROCESSOR_ID=abc123def456
GOOGLE_LOCATION=us
GOOGLE_APPLICATION_CREDENTIALS=/caminho/para/credentials.json
```

**6. Instalar dependência adicional:**
```bash
cd backend
npm install
```

**7. Iniciar servidor:**
```bash
npm start
```

Você verá:
```
🔧 Motor OCR: Google Document AI
   Descrição: OCR premium com qualidade 95-99%
   Custo: US$ 1,50 / 1000 páginas
   ✅ Status: Configurado
```

---

## 💡 Qual Motor Escolher?

| Volume Mensal | Recomendação |
|---------------|--------------|
| 0-500 páginas | **Document AI** - Custo irrisório (~US$ 0,75/mês), qualidade máxima |
| 500-5000 páginas | **Híbrido** - Document AI quando qualidade importa, Tesseract para rascunhos |
| 5000+ páginas | **Tesseract** - Custo zero, ou Document AI se orçamento permitir (US$ 7,50+/mês) |

**Documentos sigilosos/LGPD:** Sempre use **Tesseract** (100% local)

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

**Versão:** 2.1.0 | **Status:** Produção ✅
