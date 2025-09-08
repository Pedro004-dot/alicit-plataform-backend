import PDFParser from 'pdf2json';
import pdfParse from 'pdf-parse';
import { createHash } from 'crypto';
export class PDFProcessorAdapter {
    /**
     * Valida se o buffer contém um PDF válido
     */
    validatePDFBuffer(buffer) {
        if (!buffer || buffer.length === 0)
            return false;
        // Verificar header PDF
        const header = buffer.subarray(0, 5).toString('ascii');
        return header === '%PDF-';
    }
    /**
     * Estratégia 1: pdf2json (mais estruturado)
     */
    async extractWithPdf2Json(document) {
        return new Promise((resolve, reject) => {
            const pdfParser = new PDFParser();
            const timeout = setTimeout(() => {
                reject(new Error('Timeout no processamento com pdf2json'));
            }, 30000); // 30 segundos timeout
            pdfParser.on('pdfParser_dataError', (error) => {
                clearTimeout(timeout);
                reject(new Error(`pdf2json falhou: ${error.parserError || error.message}`));
            });
            pdfParser.on('pdfParser_dataReady', (pdfData) => {
                clearTimeout(timeout);
                try {
                    const text = this.extractTextFromData(pdfData);
                    const cleanedText = this.cleanText(text);
                    const markdown = this.convertToMarkdown(cleanedText, pdfData);
                    resolve({
                        text: cleanedText,
                        markdown,
                        pages: pdfData.Pages?.length || 1,
                        metadata: {
                            filename: document.filename,
                            size: document.buffer.length,
                            hash: this.generateHash(document.buffer),
                        },
                    });
                }
                catch (error) {
                    reject(new Error(`Erro no processamento pdf2json: ${error.message}`));
                }
            });
            pdfParser.parseBuffer(document.buffer);
        });
    }
    /**
     * Estratégia 2: pdf-parse (fallback)
     */
    async extractWithPdfParse(document) {
        try {
            const data = await pdfParse(document.buffer);
            if (!data.text || data.text.trim().length === 0) {
                throw new Error('PDF não contém texto extraível');
            }
            const cleanedText = this.cleanText(data.text);
            const markdown = this.convertTextToMarkdown(cleanedText);
            return {
                text: cleanedText,
                markdown,
                pages: data.numpages || 1,
                metadata: {
                    filename: document.filename,
                    size: document.buffer.length,
                    hash: this.generateHash(document.buffer),
                },
            };
        }
        catch (error) {
            throw new Error(`pdf-parse falhou: ${error.message}`);
        }
    }
    /**
     * Método principal com fallbacks robustos
     */
    async extractTextFromPDF(document) {
        console.log(`📄 Processando PDF: ${document.filename} (${document.buffer.length} bytes)`);
        // 1. Validar buffer
        if (!this.validatePDFBuffer(document.buffer)) {
            throw new Error(`Arquivo ${document.filename} não é um PDF válido ou está corrompido`);
        }
        const strategies = [
            { name: 'pdf2json', method: this.extractWithPdf2Json.bind(this) },
            { name: 'pdf-parse', method: this.extractWithPdfParse.bind(this) }
        ];
        let lastError = null;
        // Tentar cada estratégia
        for (const strategy of strategies) {
            try {
                console.log(`🔄 Tentando extração com ${strategy.name}...`);
                const result = await strategy.method(document);
                // Validar resultado
                if (!result.text || result.text.trim().length < 10) {
                    throw new Error(`Texto extraído muito curto: ${result.text.length} caracteres`);
                }
                console.log(`✅ Sucesso com ${strategy.name}: ${result.text.length} caracteres extraídos`);
                return result;
            }
            catch (error) {
                lastError = error;
                console.warn(`⚠️ ${strategy.name} falhou: ${error.message}`);
            }
        }
        // Se todas as estratégias falharam
        throw new Error(`Falha ao processar PDF ${document.filename}. Último erro: ${lastError?.message || 'Desconhecido'}`);
    }
    async extractTextFromMultiplePDFs(empresaId) {
        const results = [];
        const processed = await this.extractTextFromPDF({
            buffer: Buffer.from(empresaId),
            filename: empresaId,
        });
        results.push(processed);
        return results;
    }
    generateEditalHash(empresaId) {
        const combinedBuffer = Buffer.from(empresaId);
        return this.generateHash(combinedBuffer);
    }
    extractTextFromData(pdfData) {
        return pdfData.Pages.map((page) => {
            return page.Texts.map((text) => {
                const textContent = text.R.map((run) => decodeURIComponent(run.T)).join('');
                // Preservar quebras de linha importantes mas unir texto da mesma linha
                if (textContent.trim().length === 0)
                    return '';
                // Se o texto parece ser continuação da linha anterior (sem maiúscula inicial em nova linha)
                const isNewLine = /^[A-Z0-9]/.test(textContent.trim()) ||
                    /^\d+\./.test(textContent.trim()) ||
                    textContent.trim().length > 50;
                return isNewLine ? `\n${textContent}` : ` ${textContent}`;
            }).join('');
        }).join('\n\n');
    }
    convertToMarkdown(text, pdfData) {
        const lines = text.split('\n');
        let markdown = '';
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line)
                continue;
            if (this.isTitle(line)) {
                markdown += `# ${line}\n\n`;
            }
            else if (this.isSubtitle(line)) {
                markdown += `## ${line}\n\n`;
            }
            else {
                markdown += `${line}\n\n`;
            }
        }
        return markdown.trim();
    }
    /**
     * Converte texto simples para markdown (fallback)
     */
    convertTextToMarkdown(text) {
        const lines = text.split('\n');
        let markdown = '';
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line)
                continue;
            // Detectar títulos/seções por padrões comuns
            if (this.isTitle(line)) {
                markdown += `# ${line}\n\n`;
            }
            else if (this.isSubtitle(line) || this.isNumberedSection(line)) {
                markdown += `## ${line}\n\n`;
            }
            else if (this.isBulletPoint(line)) {
                markdown += `- ${line.replace(/^[-*•]\s*/, '')}\n`;
            }
            else {
                markdown += `${line}\n\n`;
            }
        }
        return markdown.trim();
    }
    isTitle(line) {
        return line.length < 100 && /^[A-Z][A-ZÁÉÍÓÚÂÊÎÔÛÃÕÇ\s]+$/.test(line);
    }
    isSubtitle(line) {
        return line.length < 80 && /^\d+\.?\s+|^[IVX]+\.?\s+/.test(line);
    }
    isNumberedSection(line) {
        return /^\d+\.?\d*\.?\s+/.test(line) && line.length < 120;
    }
    isBulletPoint(line) {
        return /^[-*•]\s+/.test(line);
    }
    cleanText(text) {
        return text
            // Preservar quebras de linha importantes para estrutura hierárquica
            .replace(/\r\n/g, '\n') // Normalizar quebras de linha
            .replace(/\r/g, '\n') // Normalizar quebras de linha
            .replace(/[ \t]+/g, ' ') // Apenas espaços/tabs múltiplos → espaço único
            .replace(/\n[ \t]+/g, '\n') // Remover espaços/tabs no início de linhas
            .replace(/[ \t]+\n/g, '\n') // Remover espaços/tabs no final de linhas
            .replace(/\n{3,}/g, '\n\n') // Máximo 2 quebras consecutivas
            .trim();
    }
    generateHash(buffer) {
        return createHash('sha256').update(buffer).digest('hex');
    }
}
