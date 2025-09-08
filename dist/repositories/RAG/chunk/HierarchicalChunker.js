"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HierarchicalChunker = void 0;
class HierarchicalChunker {
    constructor() {
        this.HIERARCHY_PATTERNS = [
            // Padrões numericos principais: 1., 1.1., 1.1.1
            /^\s*(\d+(\.\d+)*\.?)\s+(.+)/,
            // ANEXOS: ANEXO I, ANEXO II, etc
            /^\s*(ANEXO\s+[IVXLCDM]+)\s+(.+)/i,
            // Artigos: Art. 1º, Artigo 1
            /^\s*(Art\.?\s*\d+[º°]?)\s+(.+)/i,
            // Parágrafos: § 1º, Parágrafo 1
            /^\s*(§\s*\d+[º°]?)\s+(.+)/i,
            // Incisos e alíneas: I -, a), etc
            /^\s*([IVXLCDM]+\s*[-)]|[a-z]\))\s+(.+)/i
        ];
        this.MAX_CHUNK_SIZE = 1024;
        this.MIN_CHUNK_SIZE = 200;
    }
    /**
     * Processa documento e retorna chunks hierárquicos baseado na lógica Python
     */
    processDocument(text) {
        console.log('🔧 Iniciando chunking hierárquico...');
        // 1. Extrair proto-chunks baseados na hierarquia
        const protoChunks = this.extractProtoChunks(text);
        console.log(`📋 Extraídos ${protoChunks.length} proto-chunks hierárquicos`);
        // 2. Consolidar proto-chunks em chunks finais
        const finalChunks = this.consolidateProtoChunks(protoChunks);
        console.log(`✅ Gerados ${finalChunks.length} chunks finais`);
        return finalChunks;
    }
    /**
     * Extrai proto-chunks baseado na hierarquia detectada no texto
     */
    extractProtoChunks(text) {
        const protoChunks = [];
        const lines = text.split('\n');
        let currentChunkText = '';
        let currentHierarchy = 'Cabeçalho ou Texto sem numeração';
        let currentPosition = 0;
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line)
                continue;
            const hierarchyMatch = this.detectHierarchy(line);
            if (hierarchyMatch) {
                // Se já existe um chunk sendo construído, salva antes de começar novo
                if (currentChunkText.trim()) {
                    protoChunks.push({
                        text: currentChunkText.trim(),
                        hierarchyPath: currentHierarchy,
                        startPosition: currentPosition
                    });
                }
                // Inicia novo proto-chunk
                currentHierarchy = hierarchyMatch.path;
                currentChunkText = line + '\n';
                currentPosition = i;
            }
            else {
                // Continua adicionando ao chunk atual
                currentChunkText += line + '\n';
            }
        }
        // Adiciona o último chunk
        if (currentChunkText.trim()) {
            protoChunks.push({
                text: currentChunkText.trim(),
                hierarchyPath: currentHierarchy,
                startPosition: currentPosition
            });
        }
        return protoChunks;
    }
    /**
     * Detecta se uma linha inicia uma nova seção hierárquica
     */
    detectHierarchy(line) {
        for (const pattern of this.HIERARCHY_PATTERNS) {
            const match = line.match(pattern);
            if (match) {
                // Extrai o identificador hierárquico e título
                const level = match[1];
                const title = match[match.length - 1] || '';
                const path = `${level} ${title}`.substring(0, 100).trim(); // Limita tamanho
                return { path, level };
            }
        }
        return null;
    }
    /**
     * Consolida proto-chunks em chunks finais respeitando limite de tamanho
     * Baseado no algoritmo Python de agregação controlada
     */
    consolidateProtoChunks(protoChunks) {
        const finalChunks = [];
        let bufferText = '';
        let bufferMetadata = {
            hierarchyPaths: [],
            pages: new Set(),
            protoChunkCount: 0,
            originalSize: 0
        };
        for (const protoChunk of protoChunks) {
            const currentText = protoChunk.text;
            // Se o proto-chunk atual sozinho excede o limite, precisa ser quebrado
            if (currentText.length > this.MAX_CHUNK_SIZE) {
                // Primeiro, se houver algo no buffer, salva
                if (bufferText.trim()) {
                    finalChunks.push(this.createFinalChunk(bufferText, bufferMetadata));
                    this.resetBuffer(bufferMetadata);
                    bufferText = '';
                }
                // Quebra o chunk grande em pedaços menores
                const subChunks = this.splitLargeChunk(currentText, protoChunk.hierarchyPath);
                finalChunks.push(...subChunks);
                continue;
            }
            // Verifica se adicionar ao buffer excederá o limite
            if (bufferText.length + currentText.length + 2 > this.MAX_CHUNK_SIZE) {
                // Flush do buffer atual
                if (bufferText.trim()) {
                    finalChunks.push(this.createFinalChunk(bufferText, bufferMetadata));
                }
                // Inicia novo buffer com o proto-chunk atual
                bufferText = currentText;
                this.resetBuffer(bufferMetadata);
                bufferMetadata.hierarchyPaths = [protoChunk.hierarchyPath];
                bufferMetadata.protoChunkCount = 1;
                bufferMetadata.originalSize = currentText.length;
                if (protoChunk.page)
                    bufferMetadata.pages.add(protoChunk.page);
            }
            else {
                // Agrega ao buffer existente
                if (bufferText) {
                    bufferText += '\n\n' + currentText;
                }
                else {
                    bufferText = currentText;
                }
                bufferMetadata.hierarchyPaths.push(protoChunk.hierarchyPath);
                bufferMetadata.protoChunkCount++;
                bufferMetadata.originalSize += currentText.length;
                if (protoChunk.page)
                    bufferMetadata.pages.add(protoChunk.page);
            }
        }
        // Flush final do buffer
        if (bufferText.trim()) {
            finalChunks.push(this.createFinalChunk(bufferText, bufferMetadata));
        }
        return finalChunks;
    }
    /**
     * Quebra chunks muito grandes em pedaços menores
     */
    splitLargeChunk(text, hierarchyPath) {
        const subChunks = [];
        const parts = [];
        // Quebra simples por caracteres, tentando preservar frases
        let start = 0;
        while (start < text.length) {
            let end = Math.min(start + this.MAX_CHUNK_SIZE, text.length);
            // Tenta quebrar em ponto final se possível
            if (end < text.length) {
                const lastPeriod = text.lastIndexOf('.', end);
                if (lastPeriod > start + this.MAX_CHUNK_SIZE * 0.7) {
                    end = lastPeriod + 1;
                }
            }
            parts.push(text.slice(start, end).trim());
            start = end;
        }
        parts.forEach((part, index) => {
            if (part.length > 30) {
                subChunks.push({
                    content: part,
                    metadata: {
                        hierarchyPath: `${hierarchyPath} (Parte ${index + 1}/${parts.length})`,
                        pages: [],
                        protoChunkCount: 1,
                        originalSize: part.length,
                        finalSize: part.length
                    }
                });
            }
        });
        return subChunks;
    }
    /**
     * Cria chunk final a partir do buffer atual
     */
    createFinalChunk(bufferText, bufferMetadata) {
        return {
            content: bufferText.trim(),
            metadata: {
                hierarchyPath: bufferMetadata.hierarchyPaths.join(' -> '),
                pages: Array.from(bufferMetadata.pages).sort(),
                protoChunkCount: bufferMetadata.protoChunkCount,
                originalSize: bufferMetadata.originalSize,
                finalSize: bufferText.trim().length
            }
        };
    }
    /**
     * Reseta buffer de metadados
     */
    resetBuffer(bufferMetadata) {
        bufferMetadata.hierarchyPaths = [];
        bufferMetadata.pages = new Set();
        bufferMetadata.protoChunkCount = 0;
        bufferMetadata.originalSize = 0;
    }
}
exports.HierarchicalChunker = HierarchicalChunker;
