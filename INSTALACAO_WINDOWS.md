# 🪟 Guia de Instalação - Windows

## ❌ Erro EPIPE - Causa e Solução

Se você está vendo este erro:
```
Error: write EPIPE
errno: -4047
code: 'EPIPE'
```

**CAUSA:** O sistema precisa do **GraphicsMagick** instalado para converter PDFs em imagens.

---

## ✅ Solução: Instalar GraphicsMagick

### Passo 1: Baixar GraphicsMagick

1. Acesse: **http://www.graphicsmagick.org/download.html**
2. Na seção "Windows", baixe:
   - **GraphicsMagick-1.3.43-Q16-win64-dll.exe** (versão mais recente)
   - Se você tem Windows 32-bit: baixe a versão **win32**

**Link direto (Windows 64-bit):**
```
ftp://ftp.graphicsmagick.org/pub/GraphicsMagick/windows/
```

### Passo 2: Instalar GraphicsMagick

1. Execute o instalador `.exe` que você baixou
2. **IMPORTANTE:** Durante a instalação, marque estas opções:
   - ✅ **"Add application directory to your system path"** (OBRIGATÓRIO!)
   - ✅ **"Install legacy utilities (e.g. convert)"**
   - ✅ **"Update executable search path"**

3. Clique em "Next" e finalize a instalação

### Passo 3: Verificar Instalação

1. **Feche** todos os terminais abertos (PowerShell, CMD)
2. Abra um **novo** PowerShell
3. Execute:

```powershell
gm version
```

**Resultado esperado:**
```
GraphicsMagick 1.3.43 2024-...
Copyright (C) GraphicsMagick Group ...
```

Se você ver isso, o GraphicsMagick está instalado corretamente! ✅

### Passo 4: Reiniciar o Servidor

```powershell
cd C:\Users\Pc\Downloads\Conversorocr\backend
node server.js
```

Agora deve funcionar sem erro EPIPE!

---

## 🧪 Testar

1. Acesse: **http://localhost:3000**
2. Carregue um PDF
3. Clique em "Iniciar OCR"
4. ✅ Deve processar sem erros!

---

## ⚠️ Troubleshooting

### Problema: "gm: command not found" após instalação

**Solução:**
1. Verifique se GraphicsMagick foi adicionado ao PATH:
   - Pesquise "Variáveis de Ambiente" no Windows
   - Verifique se há um caminho como: `C:\Program Files\GraphicsMagick-1.3.43-Q16`
   - Se não houver, adicione manualmente

2. **Reinicie o computador** (às vezes necessário para PATH atualizar)

### Problema: Instalação continua falhando

**Alternativa - Usar ImageMagick:**

1. Baixe: https://imagemagick.org/script/download.php#windows
2. Instale a versão **ImageMagick-7.x.x-Q16-x64-dll.exe**
3. Marque: **"Add application directory to system path"**
4. Marque: **"Install legacy utilities"**

---

## 📦 Dependências do Projeto

Certifique-se de ter instalado todas as dependências Node.js:

```powershell
cd backend
npm install
```

**Dependências principais:**
- ✅ Node.js 14+
- ✅ GraphicsMagick (ou ImageMagick)
- ✅ Tesseract.js (instalado via npm)

---

## 🚀 Após Instalação

Com o GraphicsMagick instalado, o sistema terá:

- ✅ Conversão de PDF para imagens (300 DPI)
- ✅ Processamento paralelo (usa todos os CPUs)
- ✅ OCR com Tesseract.js
- ✅ Geração de PDF pesquisável
- ✅ Velocidade 10-30x mais rápida

---

## 📝 Verificação Completa do Sistema

Execute este comando para verificar todas as dependências:

```powershell
# Verificar Node.js
node --version

# Verificar npm
npm --version

# Verificar GraphicsMagick
gm version

# Verificar se servidor inicia
cd backend
node server.js
```

**Tudo OK?** Acesse http://localhost:3000 e teste! 🎉

---

## 💡 Dica de Performance

Para PDFs grandes (50+ páginas), recomendamos:

1. Fechar outros aplicativos pesados
2. Usar modo "Fast" na primeira vez (teste)
3. Depois usar "Accurate" ou "Best" para qualidade máxima

---

**Documentação criada em:** 2025-01-13
**Sistema:** Conversor OCR de PDF - Processos Digitalizados
