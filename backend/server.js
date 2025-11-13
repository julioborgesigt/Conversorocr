// server.js - Backend Node.js para OCR Avançado de PDFs
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { createWorker } = require('tesseract.js');
const pdf = require('pdf-parse');
const sharp = require('sharp');
const { PDFDocument, rgb } = require('pdf-lib');
const pdfParse = require('pdf-parse');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..'))); // Serve arquivos da raiz do projeto

// Configuração do Multer para upload
const storage = multer.diskStorage({
    destination: async (req, file, cb) => {
        const uploadDir = 'uploads/';
        await fs.mkdir(uploadDir, { recursive: true });
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/pdf') {
            cb(null, true);
        } else {
            cb(new Error('Apenas arquivos PDF são permitidos'));
        }
    }
});

// Classe para processar OCR
class OCRProcessor {
    constructor(options = {}) {
        this.language = options.language || 'por';
        this.mode = options.mode || 'accurate';
        this.enhanceImage = options.enhanceImage !== false;
        this.preserveLayout = options.preserveLayout !== false;
    }

    // Pré-processamento de imagem para melhorar OCR
    async preprocessImage(imagePath) {
        try {
            let image = sharp(imagePath);
            
            // Obter metadados
            const metadata = await image.metadata();
            
            // Pipeline de processamento
            image = image
                .resize(metadata.width * 2, metadata.height * 2) // Aumentar resolução
                .greyscale() // Converter para escala de cinza
                .normalize() // Normalizar histograma
                .sharpen() // Aguçar bordas
                .threshold(128) // Binarização
                .negate(); // Inverter se necessário (texto escuro em fundo claro)
            
            const outputPath = imagePath.replace('.png', '_processed.png');
            await image.toFile(outputPath);
            
            return outputPath;
        } catch (error) {
            console.error('Erro no pré-processamento:', error);
            return imagePath;
        }
    }

    // Executar OCR em uma imagem
    async performOCR(imagePath) {
        let processedPath = imagePath;
        
        if (this.enhanceImage) {
            processedPath = await this.preprocessImage(imagePath);
        }
        
        const worker = await createWorker(this.language);
        
        // Configurar parâmetros do Tesseract
        await worker.setParameters({
            tessedit_pageseg_mode: this.preserveLayout ? '3' : '6',
            preserve_interword_spaces: '1',
            tessedit_char_whitelist: this.mode === 'best' ? 
                '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyzÀÁÂÃÄÇÈÉÊËÌÍÎÏÒÓÔÕÖÙÚÛÜàáâãäçèéêëìíîïòóôõöùúûü .,;:!?-/()""\'' : 
                undefined
        });
        
        const result = await worker.recognize(processedPath);
        await worker.terminate();
        
        // Limpar arquivo processado
        if (processedPath !== imagePath) {
            await fs.unlink(processedPath).catch(() => {});
        }
        
        return {
            text: result.data.text,
            confidence: result.data.confidence,
            words: result.data.words
        };
    }

    // Processar PDF completo
    async processPDF(pdfPath, progress) {
        const pdfBuffer = await fs.readFile(pdfPath);
        const pdfData = await pdfParse(pdfBuffer);
        
        // Se o PDF já tem texto, retornar
        if (pdfData.text && pdfData.text.trim().length > 100) {
            return {
                type: 'native_text',
                pages: [{
                    pageNum: 1,
                    text: pdfData.text,
                    confidence: 100
                }],
                totalText: pdfData.text
            };
        }
        
        // Converter PDF em imagens e processar com OCR
        const pdf2pic = require('pdf2pic');
        const converter = new pdf2pic.fromPath(pdfPath, {
            density: 300,
            savename: 'page',
            savedir: './temp',
            format: 'png',
            width: 2480,
            height: 3508
        });
        
        const results = [];
        const pageCount = pdfData.numpages;
        
        for (let i = 1; i <= pageCount; i++) {
            if (progress) {
                progress(i, pageCount);
            }
            
            const page = await converter(i);
            const ocrResult = await this.performOCR(page.path);
            
            results.push({
                pageNum: i,
                text: ocrResult.text,
                confidence: ocrResult.confidence,
                words: ocrResult.words
            });
            
            // Limpar imagem temporária
            await fs.unlink(page.path).catch(() => {});
        }
        
        return {
            type: 'ocr',
            pages: results,
            totalText: results.map(r => r.text).join('\n\n')
        };
    }

    // Criar PDF pesquisável
    async createSearchablePDF(originalPdfPath, ocrResults) {
        const existingPdfBytes = await fs.readFile(originalPdfPath);
        const pdfDoc = await PDFDocument.load(existingPdfBytes);
        const pages = pdfDoc.getPages();
        
        // Adicionar camada de texto invisível
        for (let i = 0; i < pages.length && i < ocrResults.pages.length; i++) {
            const page = pages[i];
            const ocrText = ocrResults.pages[i].text;
            
            // Adicionar texto invisível
            page.drawText(ocrText, {
                x: 0,
                y: 0,
                size: 1,
                color: rgb(1, 1, 1),
                opacity: 0
            });
        }
        
        const pdfBytes = await pdfDoc.save();
        return pdfBytes;
    }
}

// Rotas da API

// Upload e processamento de PDF
app.post('/api/process-pdf', upload.single('pdf'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Nenhum arquivo enviado' });
        }
        
        const options = {
            language: req.body.language || 'por',
            mode: req.body.mode || 'accurate',
            enhanceImage: req.body.enhanceImage !== 'false',
            preserveLayout: req.body.preserveLayout !== 'false'
        };
        
        const processor = new OCRProcessor(options);
        
        // Processar PDF
        const results = await processor.processPDF(req.file.path, (current, total) => {
            // Aqui você poderia enviar progresso via WebSocket
            console.log(`Processando página ${current} de ${total}`);
        });
        
        // Criar PDF pesquisável se solicitado
        let searchablePdfBase64 = null;
        if (req.body.outputFormat === 'searchable_pdf' || req.body.outputFormat === 'both') {
            const searchablePdfBytes = await processor.createSearchablePDF(req.file.path, results);
            searchablePdfBase64 = Buffer.from(searchablePdfBytes).toString('base64');
        }
        
        // Limpar arquivo temporário
        await fs.unlink(req.file.path).catch(() => {});
        
        // Calcular estatísticas
        const stats = {
            pageCount: results.pages.length,
            totalWords: results.totalText.split(/\s+/).length,
            averageConfidence: results.pages.reduce((sum, p) => sum + p.confidence, 0) / results.pages.length,
            processingType: results.type
        };
        
        res.json({
            success: true,
            text: results.totalText,
            pages: results.pages.map(p => ({
                pageNum: p.pageNum,
                text: p.text,
                confidence: p.confidence,
                wordCount: p.text.split(/\s+/).length
            })),
            searchablePdf: searchablePdfBase64,
            statistics: stats
        });
        
    } catch (error) {
        console.error('Erro no processamento:', error);
        res.status(500).json({ 
            error: 'Erro ao processar PDF', 
            details: error.message 
        });
    }
});

// Análise rápida de PDF
app.post('/api/analyze-pdf', upload.single('pdf'), async (req, res) => {
    try {
        const pdfBuffer = await fs.readFile(req.file.path);
        const pdfData = await pdfParse(pdfBuffer);
        
        const hasText = pdfData.text && pdfData.text.trim().length > 100;
        
        await fs.unlink(req.file.path).catch(() => {});
        
        res.json({
            hasText: hasText,
            pageCount: pdfData.numpages,
            fileSize: req.file.size,
            recommendation: hasText ? 
                'Este PDF já possui texto extraível. OCR não é necessário.' : 
                'Este PDF parece ser digitalizado. OCR é recomendado.'
        });
        
    } catch (error) {
        res.status(500).json({ error: 'Erro ao analisar PDF' });
    }
});

// Melhoramento de imagem
app.post('/api/enhance-image', upload.single('image'), async (req, res) => {
    try {
        const enhanced = await sharp(req.file.path)
            .greyscale()
            .normalize()
            .sharpen()
            .threshold(128)
            .toBuffer();
        
        await fs.unlink(req.file.path).catch(() => {});
        
        res.json({
            enhanced: enhanced.toString('base64')
        });
        
    } catch (error) {
        res.status(500).json({ error: 'Erro ao melhorar imagem' });
    }
});

// Servidor
app.listen(PORT, () => {
    console.log(`Servidor OCR rodando na porta ${PORT}`);
    console.log(`Acesse: http://localhost:${PORT}`);
});

// Tratamento de erros não capturados
process.on('unhandledRejection', (error) => {
    console.error('Erro não tratado:', error);
});

process.on('uncaughtException', (error) => {
    console.error('Exceção não capturada:', error);
    process.exit(1);
});