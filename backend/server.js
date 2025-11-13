// server.js - Backend Node.js para OCR Avançado de PDFs com Processamento Paralelo
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
const { Worker } = require('worker_threads');
const os = require('os');

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

    // FASE 2: Processar PDF com Worker Threads Paralelos
    async processPDFParallel(pdfPath, progressCallback) {
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

        // Converter PDF em imagens
        const pdf2pic = require('pdf2pic');
        const converter = new pdf2pic.fromPath(pdfPath, {
            density: 300,
            savename: 'page',
            savedir: './temp',
            format: 'png',
            width: 2480,
            height: 3508
        });

        const pageCount = pdfData.numpages;
        const imagePaths = [];

        // Converter todas as páginas para imagens
        for (let i = 1; i <= pageCount; i++) {
            const page = await converter(i);
            imagePaths.push({ pageNum: i, path: page.path });
        }

        // Detectar número de CPUs disponíveis
        const numCPUs = os.cpus().length;
        const batchSize = Math.max(1, Math.floor(numCPUs * 0.75)); // Usar 75% das CPUs

        console.log(`🖥️ Processando ${pageCount} páginas com ${batchSize} workers paralelos`);

        const results = [];
        const params = this.getTesseractParams();

        // Processar em lotes paralelos
        for (let i = 0; i < imagePaths.length; i += batchSize) {
            const batch = imagePaths.slice(i, i + batchSize);

            // Criar workers para este lote
            const workerPromises = batch.map(({ pageNum, path }) => {
                return new Promise((resolve, reject) => {
                    const worker = new Worker(path.join(__dirname, 'ocrWorker.js'), {
                        workerData: {
                            imagePath: path,
                            language: this.language,
                            params: params,
                            enhanceImage: this.enhanceImage
                        }
                    });

                    worker.on('message', (msg) => {
                        if (msg.success) {
                            resolve({
                                pageNum,
                                text: msg.data.text,
                                confidence: msg.data.confidence,
                                words: msg.data.words
                            });
                        } else {
                            reject(new Error(msg.error));
                        }
                    });

                    worker.on('error', reject);
                    worker.on('exit', (code) => {
                        if (code !== 0) {
                            reject(new Error(`Worker stopped with exit code ${code}`));
                        }
                    });
                });
            });

            // Aguardar lote completar
            const batchResults = await Promise.all(workerPromises);
            results.push(...batchResults);

            // Callback de progresso
            if (progressCallback) {
                progressCallback(results.length, pageCount);
            }

            // Limpar imagens temporárias do lote
            for (const { path } of batch) {
                await fs.unlink(path).catch(() => {});
            }
        }

        // Ordenar resultados por número de página
        results.sort((a, b) => a.pageNum - b.pageNum);

        return {
            type: 'ocr_parallel',
            pages: results,
            totalText: results.map(r => r.text).join('\n\n'),
            workers: batchSize
        };
    }

    // Helper para obter parâmetros do Tesseract
    getTesseractParams() {
        const params = {
            tessedit_pageseg_mode: this.preserveLayout ? '3' : '6',
            preserve_interword_spaces: '1'
        };

        if (this.mode === 'fast') {
            params.tessedit_ocr_engine_mode = '3';
        } else if (this.mode === 'best') {
            params.tessedit_ocr_engine_mode = '1';
        }

        return params;
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

// FASE 2: Processamento Paralelo Otimizado
app.post('/api/process-pdf-parallel', upload.single('pdf'), async (req, res) => {
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
        const startTime = Date.now();

        // Processar PDF com Worker Threads Paralelos
        const results = await processor.processPDFParallel(req.file.path, (current, total) => {
            console.log(`✓ Processadas ${current}/${total} páginas`);
        });

        const processingTime = ((Date.now() - startTime) / 1000).toFixed(2);

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
            processingType: results.type,
            parallelWorkers: results.workers || 1,
            processingTime: processingTime,
            pagesPerSecond: (results.pages.length / parseFloat(processingTime)).toFixed(2)
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
        console.error('Erro no processamento paralelo:', error);
        res.status(500).json({
            error: 'Erro ao processar PDF',
            details: error.message
        });
    }
});

// FASE 3: Server-Sent Events para Streaming de Resultados
app.post('/api/process-pdf-stream', upload.single('pdf'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Nenhum arquivo enviado' });
        }

        // Configurar SSE
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        const sendEvent = (event, data) => {
            res.write(`event: ${event}\n`);
            res.write(`data: ${JSON.stringify(data)}\n\n`);
        };

        const options = {
            language: req.body.language || 'por',
            mode: req.body.mode || 'accurate',
            enhanceImage: req.body.enhanceImage !== 'false',
            preserveLayout: req.body.preserveLayout !== 'false'
        };

        const processor = new OCRProcessor(options);
        const startTime = Date.now();

        sendEvent('start', { message: 'Iniciando processamento...' });

        // Processar com callback de progresso
        const results = await processor.processPDFParallel(req.file.path, (current, total) => {
            sendEvent('progress', {
                current,
                total,
                percentage: ((current / total) * 100).toFixed(1),
                elapsed: ((Date.now() - startTime) / 1000).toFixed(1)
            });
        });

        const processingTime = ((Date.now() - startTime) / 1000).toFixed(2);

        // Enviar resultado final
        sendEvent('complete', {
            success: true,
            pages: results.pages,
            totalText: results.totalText,
            processingTime,
            workers: results.workers
        });

        // Limpar arquivo temporário
        await fs.unlink(req.file.path).catch(() => {});

        res.end();

    } catch (error) {
        console.error('Erro no streaming:', error);
        res.write(`event: error\n`);
        res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
        res.end();
    }
});

// Rota para obter informações do sistema
app.get('/api/system-info', (req, res) => {
    const cpus = os.cpus();
    res.json({
        cpuCores: cpus.length,
        cpuModel: cpus[0].model,
        totalMemory: (os.totalmem() / (1024 ** 3)).toFixed(2) + ' GB',
        freeMemory: (os.freemem() / (1024 ** 3)).toFixed(2) + ' GB',
        platform: os.platform(),
        arch: os.arch(),
        recommendedWorkers: Math.max(1, Math.floor(cpus.length * 0.75))
    });
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