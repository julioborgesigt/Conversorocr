# 🧪 Guia de Teste - Google Document AI

## ✅ Configuração Concluída

Seu sistema está configurado com:
- **Motor OCR**: Google Document AI (premium)
- **Project ID**: `projecto-ocr`
- **Processor ID**: `31d05b64641b2347`
- **Credenciais**: `C:\ocr-credentials\projecto-ocr-ab9970247d87.json`

---

## 🚀 Como Testar (Windows)

### Passo 1: Validar Configuração

Abra o **CMD** ou **PowerShell** e execute:

```bash
cd C:\caminho\para\Conversorocr\backend
node test-documentai.js
```

**Resultado esperado:**
```
✅ CONFIGURAÇÃO VÁLIDA!

Próximos passos:
1. Execute: npm start
2. Acesse: http://localhost:3000
3. Carregue um PDF e teste o OCR premium!
```

Se aparecer ❌ erros, leia as instruções na tela.

---

### Passo 2: Iniciar Servidor

No mesmo terminal:

```bash
npm start
```

**Você verá:**
```
🔧 Motor OCR: Google Document AI
   Descrição: OCR premium com qualidade 95-99%
   Custo: US$ 1,50 / 1000 páginas
   ✅ Status: Configurado
```

---

### Passo 3: Testar Interface Web

1. Abra navegador: http://localhost:3000
2. Carregue um PDF (de preferência com tabelas ou texto complexo)
3. Configure:
   - **Idioma**: Português
   - **Modo**: Accurate
   - **Formato**: Searchable PDF
4. Clique em **"Processar"**
5. Aguarde conclusão
6. Baixe e verifique a qualidade!

---

## 📊 Comparação: Document AI vs Tesseract

### Para Testar Diferença de Qualidade

**1. Teste com Document AI (atual):**
```bash
# No .env, deixe:
OCR_ENGINE=documentai
```

Processe um PDF e salve o resultado.

**2. Teste com Tesseract (grátis):**

Edite `backend/.env`:
```bash
OCR_ENGINE=tesseract
```

Reinicie o servidor:
```bash
npm start
```

Processe o **mesmo PDF** e compare!

**3. Volte para Document AI:**

Edite `backend/.env`:
```bash
OCR_ENGINE=documentai
```

---

## 🐛 Solução de Problemas

### Erro: "Cannot find module '@google-cloud/documentai'"

```bash
cd backend
npm install
```

---

### Erro: "Document AI não configurado"

Verifique se `backend/.env` existe e contém:
```bash
OCR_ENGINE=documentai
GOOGLE_PROJECT_ID=projecto-ocr
GOOGLE_PROCESSOR_ID=31d05b64641b2347
GOOGLE_APPLICATION_CREDENTIALS=C:\\ocr-credentials\\projecto-ocr-ab9970247d87.json
```

**Atenção:** Use `\\` (barra dupla) no caminho do Windows!

---

### Erro: "Credentials file not found"

Verifique se o arquivo existe:
```bash
dir C:\ocr-credentials\projecto-ocr-ab9970247d87.json
```

Se não existir, mova o arquivo baixado para lá:
```bash
move "C:\Users\SeuUsuario\Downloads\projecto-ocr-*.json" "C:\ocr-credentials\projecto-ocr-ab9970247d87.json"
```

---

### Erro: "Access Denied" ou "Permission Denied"

Verifique permissões do Google Cloud:
1. Acesse: https://console.cloud.google.com/iam-admin/serviceaccounts
2. Encontre `ocr-processor`
3. Verifique se tem role: **"Document AI API User"**

---

### Erro: "Processor not found"

Verifique o Processor ID:
1. Acesse: https://console.cloud.google.com/ai/document-ai
2. Clique no processador
3. Copie o ID correto

---

## 💰 Monitorar Custos

### Ver uso e custo em tempo real:

1. Acesse: https://console.cloud.google.com/billing
2. Vá em **"Reports"**
3. Filtre por: **"Document AI API"**

Você verá quantas páginas processou e quanto custou.

**Lembrete:** Com 200 páginas/mês, seu custo será ~US$ 0,30/mês.

---

## 🎯 O Que Esperar

### Vantagens do Document AI

✅ **Texto mais preciso**: 95-99% vs 85-90% do Tesseract
✅ **Tabelas preservadas**: Estrutura de células mantida
✅ **Menos erros**: Especialmente com texto pequeno ou de baixa qualidade
✅ **PDFs digitais**: Extrai texto nativo (sem conversão para imagem)

### Para seu uso (200 páginas/mês)

- **Custo mensal**: ~US$ 0,30 (irrisório)
- **Economia de tempo**: Menos correções manuais
- **Qualidade profissional**: Ideal para documentos legais

---

## 🔄 Alternar entre Motores

Edite `backend/.env`:

```bash
# Modo 1: Document AI (premium)
OCR_ENGINE=documentai

# Modo 2: Tesseract (grátis, local)
OCR_ENGINE=tesseract

# Modo 3: Híbrido (tenta Document AI, fallback Tesseract)
OCR_ENGINE=hybrid
```

Reinicie o servidor após cada mudança.

---

## 📞 Suporte

Se tiver problemas:
1. Execute: `node test-documentai.js`
2. Leia as mensagens de erro
3. Verifique a seção "Solução de Problemas" acima
4. Consulte os logs do servidor

---

**Pronto para testar!** 🚀

Execute os comandos acima no Windows e veja a qualidade premium do Google Document AI em ação!
