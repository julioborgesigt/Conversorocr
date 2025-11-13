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

    // REMOVIDO: preprocessImage destrutivo (usava resize 2x, threshold fixo e negate)
    // Pré-processamento agora é feito de forma segura no ocrWorker.js

    // Executar OCR em uma imagem (método legado - usar processPDFParallel ao invés)
    async performOCR(imagePath) {
        // NOTA: Pré-processamento agora é feito no ocrWorker.js
        let processedPath = imagePath;
        
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

        // CORREÇÃO CRÍTICA: Removida verificação de texto nativo
        // Motivo: PDFs mistos (digital + escaneado) eram ignorados
        // Solução: SEMPRE executar OCR em todas as páginas para capturar
        // tanto texto digital quanto digitalizado

        // Garantir que diretório temp existe
        const tempDir = path.join(__dirname, 'temp');
        await fs.mkdir(tempDir, { recursive: true });

        const pageCount = pdfData.numpages;
        const imagePaths = [];

        console.log(`📄 Convertendo ${pageCount} páginas para imagens...`);

        // CORREÇÃO EPIPE: Usar abordagem mais robusta para conversão
        // pdf2pic requer GraphicsMagick/ImageMagick que pode não estar no Windows
        try {
            const pdf2pic = require('pdf2pic');

            // Tentar converter com pdf2pic (método preferido se GM/IM disponível)
            const timestamp = Date.now();
            const converter = pdf2pic.fromPath(pdfPath, {
                density: 300,
                savename: `page_${timestamp}`,
                savedir: tempDir,
                format: 'png',
                width: 2480,
                height: 3508
            });

            // Converter páginas sequencialmente para evitar sobrecarga
            for (let i = 1; i <= pageCount; i++) {
                try {
                    const page = await converter(i, { responseType: 'image' });

                    // Verificar se arquivo foi criado
                    if (!page.path || !await fs.access(page.path).then(() => true).catch(() => false)) {
                        throw new Error('Arquivo de imagem não foi criado');
                    }

                    imagePaths.push({ pageNum: i, path: page.path });
                    console.log(`✓ Página ${i}/${pageCount} convertida`);

                    // Pequeno delay para evitar sobrecarga
                    await new Promise(resolve => setTimeout(resolve, 100));
                } catch (error) {
                    console.error(`❌ Erro ao converter página ${i}:`, error.message);
                    throw new Error(`Falha ao converter página ${i} do PDF.

⚠️ POSSÍVEL CAUSA: GraphicsMagick ou ImageMagick não está instalado.

📦 SOLUÇÃO PARA WINDOWS:
1. Baixe GraphicsMagick: http://www.graphicsmagick.org/download.html
2. Instale com todas as opções padrão
3. Reinicie o terminal e tente novamente

📦 SOLUÇÃO PARA LINUX/MAC:
# Ubuntu/Debian:
sudo apt-get install graphicsmagick

# macOS:
brew install graphicsmagick

Erro original: ${error.message}`);
                }
            }
        } catch (error) {
            console.error('❌ Erro no sistema de conversão de PDF:', error);
            throw error;
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

            // NÃO limpar arquivos aqui - aguardar todos os batches completarem
        }

        // Ordenar resultados por número de página
        results.sort((a, b) => a.pageNum - b.pageNum);

        // CORREÇÃO EPIPE: Aguardar um momento para garantir que todos os streams foram fechados
        await new Promise(resolve => setTimeout(resolve, 500));

        // Limpar TODOS os arquivos temporários (incluindo _enhanced.png criados pelo ocrWorker)
        console.log('🧹 Limpando arquivos temporários...');
        for (const { path } of imagePaths) {
            await fs.unlink(path).catch(() => {});
            // Também tentar limpar arquivo enhanced (se existir)
            await fs.unlink(path.replace('.png', '_enhanced.png')).catch(() => {});
        }

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

    // Criar PDF pesquisável com layout preservado
    async createSearchablePDF(originalPdfPath, ocrResults) {
        // CORREÇÃO: Definir dimensões exatas da imagem usada no OCR
        // Estas são as dimensões configuradas em pdf2pic (linhas 160-165)
        const IMAGE_WIDTH = 2480;
        const IMAGE_HEIGHT = 3508;

        const existingPdfBytes = await fs.readFile(originalPdfPath);
        const pdfDoc = await PDFDocument.load(existingPdfBytes);
        const pages = pdfDoc.getPages();

        console.log('📄 Gerando PDF pesquisável com layout preservado...', {
            pages: ocrResults.pages.length,
            imageResolution: `${IMAGE_WIDTH}x${IMAGE_HEIGHT}`
        });

        // Adicionar camada de texto invisível com coordenadas corretas
        for (let i = 0; i < pages.length && i < ocrResults.pages.length; i++) {
            const page = pages[i];
            const pageData = ocrResults.pages[i];
            const { width: pdfWidth, height: pdfHeight } = page.getSize();

            console.log(`📄 Página ${i + 1}:`, {
                hasWords: !!pageData.words,
                wordCount: pageData.words ? pageData.words.length : 0,
                sampleWord: pageData.words && pageData.words[0] ? pageData.words[0] : null
            });

            // Se temos coordenadas de palavras, usar posicionamento preciso
            if (pageData.words && pageData.words.length > 0) {
                // CORREÇÃO: Calcular fatores de escala corretos
                // Converter coordenadas da imagem OCR (IMAGE_WIDTH x IMAGE_HEIGHT)
                // para coordenadas do PDF (pdfWidth x pdfHeight)
                const scaleX = pdfWidth / IMAGE_WIDTH;
                const scaleY = pdfHeight / IMAGE_HEIGHT;

                console.log(`📐 Escala página ${i + 1}:`, {
                    pdfSize: `${pdfWidth.toFixed(1)}x${pdfHeight.toFixed(1)}`,
                    imageSize: `${IMAGE_WIDTH}x${IMAGE_HEIGHT}`,
                    scale: `${scaleX.toFixed(3)}x${scaleY.toFixed(3)}`
                });

                let wordsAdded = 0;

                for (const word of pageData.words) {
                    if (!word.text || word.text.trim() === '') continue;
                    if (!word.bbox) continue;

                    const bbox = word.bbox;

                    // Converter coordenadas (OCR usa origem topo-esquerdo, PDF usa inferior-esquerdo)
                    const x = bbox.x0 * scaleX;
                    const y = pdfHeight - (bbox.y1 * scaleY); // Inverter Y
                    const wordHeight = (bbox.y1 - bbox.y0) * scaleY;

                    // Calcular tamanho da fonte
                    let fontSize = wordHeight * 0.8;
                    fontSize = Math.max(6, Math.min(fontSize, 72));

                    try {
                        // Adicionar texto invisível na posição exata
                        page.drawText(word.text, {
                            x: x,
                            y: y,
                            size: fontSize,
                            color: rgb(1, 1, 1), // Branco (invisível)
                            opacity: 0
                        });
                        wordsAdded++;
                    } catch (error) {
                        // Ignorar palavras com caracteres não suportados
                        console.warn(`Palavra ignorada: "${word.text}" - ${error.message}`);
                    }
                }

                console.log(`✅ Página ${i + 1}: ${wordsAdded} palavras adicionadas com coordenadas`);

            } else {
                // Fallback: adicionar texto como bloco (método antigo)
                console.warn(`⚠️ Página ${i + 1}: sem coordenadas, usando fallback`);

                try {
                    page.drawText(pageData.text || '', {
                        x: 10,
                        y: pdfHeight - 20,
                        size: 8,
                        color: rgb(1, 1, 1),
                        opacity: 0
                    });
                } catch (error) {
                    console.error(`Erro ao adicionar texto na página ${i + 1}:`, error.message);
                }
            }
        }

        const pdfBytes = await pdfDoc.save();
        console.log('✅ PDF pesquisável gerado com sucesso');
        return pdfBytes;
    }
}

// Rotas da API

// ROTA REMOVIDA: /api/process-pdf (sequencial e lento)
// Use /api/process-pdf-parallel ou /api/process-pdf-stream ao invés

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