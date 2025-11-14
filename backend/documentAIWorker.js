const fs = require('fs').promises;
const path = require('path');
const sharp = require('sharp');

/**
 * Worker para processar OCR usando Google Cloud Document AI
 * Mantém compatibilidade com interface do ocrWorker.js (Tesseract)
 */

// Configuração do Document AI via variáveis de ambiente
const projectId = process.env.GOOGLE_PROJECT_ID;
const location = process.env.GOOGLE_LOCATION || 'us';
const processorId = process.env.GOOGLE_PROCESSOR_ID;

// Cliente Document AI (inicializado uma vez)
let client = null;
let DocumentProcessorServiceClient = null;

/**
 * Inicializa o cliente Document AI
 * Usa GOOGLE_APPLICATION_CREDENTIALS do ambiente
 */
function initializeClient() {
    if (client) return client;

    if (!projectId || !processorId) {
        throw new Error('❌ Document AI não configurado. Defina GOOGLE_PROJECT_ID e GOOGLE_PROCESSOR_ID');
    }

    // Lazy load do módulo apenas quando necessário
    if (!DocumentProcessorServiceClient) {
        try {
            const documentai = require('@google-cloud/documentai');
            DocumentProcessorServiceClient = documentai.v1.DocumentProcessorServiceClient;
        } catch (error) {
            throw new Error('❌ Módulo @google-cloud/documentai não instalado. Execute: npm install @google-cloud/documentai');
        }
    }

    // O SDK usa GOOGLE_APPLICATION_CREDENTIALS automaticamente
    client = new DocumentProcessorServiceClient();
    return client;
}

/**
 * Processa uma imagem ou PDF usando Document AI
 * @param {string} filePath - Caminho para imagem PNG ou PDF
 * @returns {Promise<Object>} - Resultado no formato compatível com ocrWorker.js
 */
async function processDocument(filePath) {
    try {
        const client = initializeClient();

        // 1. Obter dimensões da imagem (para compatibilidade com sistema atual)
        const metadata = await sharp(filePath).metadata();
        const imageWidth = metadata.width;
        const imageHeight = metadata.height;

        // 2. Ler arquivo como buffer
        const imageBuffer = await fs.readFile(filePath);
        const encodedImage = imageBuffer.toString('base64');

        // 3. Determinar MIME type
        const ext = path.extname(filePath).toLowerCase();
        const mimeType = ext === '.pdf' ? 'application/pdf' : 'image/png';

        // 4. Construir request para Document AI
        const name = `projects/${projectId}/locations/${location}/processors/${processorId}`;
        const request = {
            name,
            rawDocument: {
                content: encodedImage,
                mimeType
            }
        };

        // 5. Processar documento (síncrono até 15 páginas)
        console.log(`🤖 Processando com Google Document AI: ${path.basename(filePath)}`);
        const [result] = await client.processDocument(request);
        const { document } = result;

        if (!document || !document.text) {
            throw new Error('Document AI não retornou texto');
        }

        // 6. Extrair texto completo
        const fullText = document.text;

        // 7. Converter páginas para formato compatível com Tesseract
        const words = [];
        let totalConfidence = 0;
        let wordCount = 0;

        // Document AI retorna "pages" com "tokens"
        if (document.pages && document.pages.length > 0) {
            const page = document.pages[0]; // Assumindo 1 página por imagem

            if (page.tokens) {
                for (const token of page.tokens) {
                    const tokenText = extractText(document.text, token.layout.textAnchor);
                    const bbox = token.layout.boundingPoly;

                    if (bbox && bbox.normalizedVertices && bbox.normalizedVertices.length >= 4) {
                        // Document AI usa coordenadas normalizadas (0-1)
                        // Converter para pixels absolutos (compatível com Tesseract)
                        const vertices = bbox.normalizedVertices;
                        const x0 = Math.round(vertices[0].x * imageWidth);
                        const y0 = Math.round(vertices[0].y * imageHeight);
                        const x1 = Math.round(vertices[2].x * imageWidth);
                        const y1 = Math.round(vertices[2].y * imageHeight);

                        words.push({
                            text: tokenText,
                            bbox: { x0, y0, x1, y1 },
                            confidence: token.layout.confidence || 0.95 // Document AI raramente retorna confidence
                        });

                        totalConfidence += (token.layout.confidence || 0.95);
                        wordCount++;
                    }
                }
            }
        }

        const averageConfidence = wordCount > 0 ? totalConfidence / wordCount : 0;

        console.log(`✅ Document AI: ${wordCount} palavras, confiança: ${(averageConfidence * 100).toFixed(1)}%`);

        // 8. Retornar no formato compatível com ocrWorker.js
        return {
            success: true,
            data: {
                text: fullText,
                confidence: averageConfidence * 100, // Converter para 0-100
                words,
                imageWidth,
                imageHeight
            }
        };

    } catch (error) {
        console.error(`❌ Erro no Document AI:`, error.message);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Extrai texto de um textAnchor
 * @param {string} fullText - Texto completo do documento
 * @param {Object} textAnchor - TextAnchor do Document AI
 * @returns {string} - Texto extraído
 */
function extractText(fullText, textAnchor) {
    if (!textAnchor || !textAnchor.textSegments || textAnchor.textSegments.length === 0) {
        return '';
    }

    let text = '';
    for (const segment of textAnchor.textSegments) {
        const startIndex = segment.startIndex || 0;
        const endIndex = segment.endIndex || fullText.length;
        text += fullText.substring(startIndex, endIndex);
    }

    return text;
}

/**
 * Verifica se Document AI está configurado
 * @returns {boolean}
 */
function isConfigured() {
    return !!(process.env.GOOGLE_PROJECT_ID && process.env.GOOGLE_PROCESSOR_ID);
}

module.exports = {
    processDocument,
    isConfigured
};
