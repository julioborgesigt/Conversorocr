# 🐼 Guia de Instalação - PaddleOCR

PaddleOCR é um framework OCR open-source desenvolvido pela Baidu, conhecido por sua **velocidade e precisão**. É 2x mais rápido que Tesseract com qualidade de 90-95%!

---

## ⚠️ IMPORTANTE: Compatibilidade de Versão Python

**PaddlePaddle requer Python 3.8 até 3.12 (máximo)**

- ✅ **Compatível:** Python 3.8, 3.9, 3.10, 3.11, 3.12
- ❌ **NÃO compatível:** Python 3.14+ (muito recente, sem suporte ainda)

**Se você tem Python 3.14+**, você precisa instalar Python 3.11 ou 3.12 em paralelo (veja instruções abaixo).

---

## 📋 Pré-requisitos

- **Python 3.8 - 3.12** instalado no sistema
- **pip** (gerenciador de pacotes Python)

---

## 🪟 Instalação no Windows

### 0. Se você tem Python 3.14+ (Importante!)

Se `python --version` mostra Python 3.14 ou superior, você precisa instalar Python 3.11 ou 3.12 em paralelo:

**1. Baixe Python 3.11:**
- Acesse: https://www.python.org/downloads/release/python-31110/
- Role até o final e clique em **"Windows installer (64-bit)"**

**2. Durante a instalação:**
- ✅ Marque **"Add Python 3.11 to PATH"**
- ✅ Clique em **"Customize installation"**
- ✅ Na tela "Optional Features", marque todas as opções
- ✅ Na tela "Advanced Options":
  - Marque **"Install for all users"** (se quiser)
  - Anote o caminho de instalação (ex: `C:\Python311`)

**3. Após instalar, verifique:**
```bash
py -3.11 --version
# Deve mostrar: Python 3.11.x
```

**4. Instale PaddlePaddle com Python 3.11:**
```bash
py -3.11 -m pip install paddlepaddle paddleocr pillow
```

**5. Configure no .env:**
Edite `backend/.env` e adicione:
```bash
PYTHON_COMMAND=py -3.11
```

Pronto! Agora pule para a seção "Configurar no Projeto" abaixo.

---

### 1. Instalar Python (Se ainda não tem)

Se você ainda não tem Python instalado:

1. Baixe: https://www.python.org/downloads/
2. Durante a instalação, **marque** "Add Python to PATH"
3. Clique em "Install Now"

**Verificar instalação:**
```bash
python --version
# Deve mostrar: Python 3.x.x

pip --version
# Deve mostrar: pip x.x.x
```

### 2. Instalar PaddleOCR e Dependências

Abra o **PowerShell** ou **CMD** e execute:

```bash
# Passo 1: Instalar PaddlePaddle (framework base)
python -m pip install paddlepaddle

# Passo 2: Instalar PaddleOCR e Pillow
python -m pip install paddleocr pillow
```

Isso vai instalar:
- `paddlepaddle`: Framework de Deep Learning da Baidu (base)
- `paddleocr`: Framework OCR
- `pillow`: Biblioteca de processamento de imagens

**Nota:** A primeira instalação pode demorar ~5-10 minutos e baixar ~500MB de dependências.

**Alternativa (mirror mais rápido):**
```bash
python -m pip install paddlepaddle -i https://mirror.baidu.com/pypi/simple
python -m pip install paddleocr pillow
```

### 3. Verificar Instalação

```bash
# Verificar PaddlePaddle
python -c "import paddle; print('PaddlePaddle OK:', paddle.__version__)"

# Verificar PaddleOCR
python -c "import paddleocr; print('PaddleOCR instalado com sucesso!')"
```

Se ambas as mensagens aparecerem, está pronto! ✅

---

## 🐧 Instalação no Linux

### Ubuntu/Debian

```bash
# Instalar Python 3 e pip (se necessário)
sudo apt-get update
sudo apt-get install python3 python3-pip

# Instalar PaddlePaddle e PaddleOCR
pip3 install paddlepaddle paddleocr pillow

# Verificar
python3 -c "import paddle; print('PaddlePaddle OK')"
python3 -c "import paddleocr; print('PaddleOCR OK')"
```

### CentOS/RHEL

```bash
# Instalar Python 3
sudo yum install python3 python3-pip

# Instalar PaddlePaddle e PaddleOCR
pip3 install paddlepaddle paddleocr pillow
```

---

## 🍎 Instalação no macOS

```bash
# Instalar Python 3 (via Homebrew)
brew install python3

# Instalar PaddlePaddle e PaddleOCR
pip3 install paddlepaddle paddleocr pillow

# Verificar
python3 -c "import paddle; print('PaddlePaddle OK')"
python3 -c "import paddleocr; print('PaddleOCR OK')"
```

---

## ⚙️ Configurar no Projeto

### 1. Editar `.env`

Copie `.env.example` para `.env` (se ainda não fez):

```bash
cp .env.example .env
```

Edite `backend/.env` e mude:

```bash
OCR_ENGINE=paddleocr
```

### 2. Reiniciar Servidor

```bash
cd backend
npm start
```

Você verá:

```
🔧 Motor OCR: PaddleOCR
   Descrição: OCR rápido e preciso (Baidu)
   Custo: Grátis
   ✅ Status: Configurado
```

---

## 🎯 Usar via Interface Web

1. Abra: http://localhost:3000
2. Na seção **"Motor OCR"**, selecione:

```
● 🐼 PaddleOCR [Recomendado]
  OCR rápido da Baidu · Qualidade: 90-95% · Grátis
```

3. Carregue um PDF e processe!

---

## 📊 Comparação de Performance

| Motor | Qualidade | Velocidade | Custo | Requer |
|-------|-----------|------------|-------|--------|
| Tesseract | 85-90% | 3-5s/página | Grátis | Node.js |
| **PaddleOCR** | **90-95%** | **1-3s/página** | Grátis | Python 3 |
| Document AI | 95-99% | 1-2s/página | Pago | Google Cloud |

**Recomendação:** Use PaddleOCR para melhor equilíbrio entre velocidade, qualidade e custo!

---

## 🌍 Idiomas Suportados

PaddleOCR suporta 80+ idiomas, incluindo:

### Principais:
- ✅ **Português** (pt)
- ✅ **Inglês** (en)
- ✅ **Espanhol** (es)
- ✅ **Francês** (fr)
- ✅ **Alemão** (german)
- ✅ **Italiano** (it)
- ✅ **Russo** (ru)

### Asiáticos:
- ✅ **Japonês** (japan)
- ✅ **Coreano** (korean)
- ✅ **Chinês Simplificado** (ch)
- ✅ **Chinês Tradicional** (chinese_cht)
- ✅ **Árabe** (ar)
- ✅ **Hindi** (hi)

### E mais:
Holandês, Sueco, Norueguês, Dinamarquês, Polonês, Tcheco, Romeno, Turco, Vietnamita, Tailandês e muitos outros!

---

## ⚡ Otimizações

### Usar GPU (Opcional)

Se você tem uma GPU NVIDIA com CUDA instalado:

```bash
# Desinstalar versão CPU
pip uninstall paddlepaddle

# Instalar versão GPU
pip install paddlepaddle-gpu
```

Edite `backend/paddleocr_processor.py`, linha 28:
```python
use_gpu=True  # Ao invés de False
```

**Ganho:** 3-5x mais rápido!

---

## 🐛 Solução de Problemas

### Erro: "No module named 'paddle'"

**Causa:** PaddleOCR instalado mas falta o PaddlePaddle (framework base)

**Solução:**
```bash
# Instalar PaddlePaddle
python -m pip install paddlepaddle

# Verificar
python -c "import paddle; print('OK')"
```

### Erro: "No module named 'paddleocr'"

```bash
# Reinstalar PaddlePaddle e PaddleOCR
pip uninstall paddlepaddle paddleocr pillow
pip install paddlepaddle paddleocr pillow
```

### Erro: "Python not found"

- **Windows**: Reinstale Python marcando "Add to PATH"
- **Linux/Mac**: Use `python3` e `pip3` ao invés de `python` e `pip`

### Erro: "Permission denied"

```bash
# Linux/Mac: Use sudo
sudo pip3 install paddleocr pillow

# Ou instale apenas para seu usuário
pip3 install --user paddleocr pillow
```

### PaddleOCR muito lento?

- **Causa:** Baixando modelos pela primeira vez (~200MB)
- **Solução:** Aguarde o primeiro processamento (só acontece 1x)
- Os modelos ficam em cache para uso futuro

### Erro "Could not find a version that satisfies the requirement"

```bash
# Atualizar pip
python -m pip install --upgrade pip

# Tentar novamente
pip install paddleocr pillow
```

---

## 🔍 Modelos Baixados

PaddleOCR baixa modelos automaticamente na primeira execução:

**Windows:** `C:\Users\SeuUsuario\.paddleocr\`
**Linux/Mac:** `~/.paddleocr/`

Total: ~200-300MB (download único)

---

## 📚 Mais Informações

- **GitHub:** https://github.com/PaddlePaddle/PaddleOCR
- **Documentação:** https://paddlepaddle.github.io/PaddleOCR/
- **Paper:** https://arxiv.org/abs/2009.09941

---

## 🎉 Pronto!

Agora você tem acesso a um motor OCR **rápido, preciso e gratuito**!

**Próximos passos:**
1. Abra http://localhost:3000
2. Selecione **🐼 PaddleOCR**
3. Carregue um PDF
4. Compare com Tesseract e Document AI!

**Dica:** Use o modo "Apenas Texto" primeiro para testar rapidamente a qualidade antes de gerar PDF pesquisável.
