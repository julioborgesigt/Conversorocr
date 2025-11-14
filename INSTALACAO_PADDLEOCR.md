# 🐼 Guia de Instalação - PaddleOCR

PaddleOCR é um framework OCR open-source desenvolvido pela Baidu, conhecido por sua **velocidade e precisão**. É 2x mais rápido que Tesseract com qualidade de 90-95%!

---

## 📋 Pré-requisitos

- **Python 3.7+** instalado no sistema
- **pip** (gerenciador de pacotes Python)

---

## 🪟 Instalação no Windows

### 1. Instalar Python

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

### 2. Instalar PaddleOCR

Abra o **PowerShell** ou **CMD** e execute:

```bash
pip install paddleocr pillow
```

Isso vai instalar:
- `paddleocr`: Framework OCR
- `pillow`: Biblioteca de processamento de imagens

**Nota:** A primeira instalação pode demorar ~5 minutos e baixar ~500MB de dependências.

### 3. Verificar Instalação

```bash
python -c "import paddleocr; print('PaddleOCR instalado com sucesso!')"
```

Se aparecer a mensagem, está pronto! ✅

---

## 🐧 Instalação no Linux

### Ubuntu/Debian

```bash
# Instalar Python 3 e pip (se necessário)
sudo apt-get update
sudo apt-get install python3 python3-pip

# Instalar PaddleOCR
pip3 install paddleocr pillow

# Verificar
python3 -c "import paddleocr; print('OK')"
```

### CentOS/RHEL

```bash
# Instalar Python 3
sudo yum install python3 python3-pip

# Instalar PaddleOCR
pip3 install paddleocr pillow
```

---

## 🍎 Instalação no macOS

```bash
# Instalar Python 3 (via Homebrew)
brew install python3

# Instalar PaddleOCR
pip3 install paddleocr pillow

# Verificar
python3 -c "import paddleocr; print('OK')"
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

### Erro: "No module named 'paddleocr'"

```bash
# Reinstalar
pip uninstall paddleocr pillow
pip install paddleocr pillow
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
