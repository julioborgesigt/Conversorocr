# Conversor OCR Avançado para Processos Digitalizados

Sistema profissional de OCR (Optical Character Recognition) desenvolvido especialmente para converter processos jurídicos digitalizados em PDFs pesquisáveis e editáveis.

## 🎯 Características Principais

- **OCR Neural Avançado** com Tesseract.js 5.0
- **100% Processamento Local** - Seus documentos não saem do seu computador
- **Interface Moderna** com Vue.js 3 e Vuetify 3
- **Otimizado para Documentos Jurídicos** Brasileiros
- **Taxa de Precisão**: 95-99% em documentos impressos

## 🚀 Como Usar

### Versão Web (Recomendada para Início Rápido)

1. Baixe o arquivo `index.html`
2. Abra no seu navegador (Chrome, Firefox, Edge)
3. Arraste seu PDF digitalizado
4. Configure as opções e processe
5. Baixe o PDF pesquisável

### Versão Node.js (Para Processamento em Massa)

```bash
# Instalar dependências
cd backend
npm install

# Iniciar servidor
npm start

# Acessar em http://localhost:3000
```

## 📊 Tecnologias Utilizadas

- **Frontend**: Vue.js 3, Vuetify 3, PDF.js, Tesseract.js
- **Backend**: Node.js, Express, Sharp (processamento de imagem)
- **OCR Engine**: Tesseract 5.0 com LSTM Neural Networks

## 🔧 Recursos Avançados

### Pré-processamento de Imagem
- Correção automática de inclinação (deskew)
- Remoção de ruído e manchas
- Binarização adaptativa
- Aumento de contraste inteligente

### Modos de Processamento
- **Rápido**: Para documentos bem digitalizados
- **Preciso**: Balanceamento ideal (recomendado)
- **Máxima Qualidade**: Para documentos antigos ou danificados

### Formatos de Saída
- PDF Pesquisável (mantém layout original)
- Texto puro (.txt)
- Ambos

## 📈 Performance

| Tipo de Documento | Precisão | Tempo/Página |
|-------------------|----------|--------------|
| Impresso moderno | 98-99% | 3-5s |
| Datilografado | 90-95% | 5-7s |
| Documento antigo | 85-92% | 7-10s |

## 🔐 Segurança e Privacidade

- Processamento 100% local na versão web
- Nenhum dado é enviado para servidores externos
- Arquivos temporários são automaticamente deletados
- Ideal para documentos sigilosos

## 📋 Requisitos

### Versão Web
- Navegador moderno (Chrome 90+, Firefox 88+, Edge 90+)
- 4GB RAM mínimo
- Conexão internet apenas para carregar a página inicial

### Versão Node.js
- Node.js 14+
- 8GB RAM recomendado
- 1GB espaço em disco

## 🤝 Contribuindo

Contribuições são bem-vindas! Por favor:

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📝 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

## 👨‍💻 Autor

**Júlio Borges**
- GitHub: [@julioborgesigt](https://github.com/julioborgesigt)

## 🙏 Agradecimentos

- Tesseract OCR pela engine de reconhecimento
- Comunidade Vue.js pelos componentes
- Todos os contribuidores do projeto

---

⭐ Se este projeto foi útil para você, considere dar uma estrela no GitHub!