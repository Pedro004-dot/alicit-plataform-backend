import { HierarchicalChunker } from "../../../../repositories/RAG/chunk/HierarchicalChunker";
export async function chunkDocuments(documents) {
    const allChunks = [];
    const hierarchicalChunker = new HierarchicalChunker();
    for (const document of documents) {
        console.log(`🔧 Processando documento ${document.licitacaoId}-${document.documentIndex} com chunking hierárquico...`);
        try {
            // Usar novo HierarchicalChunker baseado na lógica Python
            const hierarchicalChunks = hierarchicalChunker.processDocument(document.text);
            if (hierarchicalChunks.length > 0) {
                const editalChunks = hierarchicalChunks.map((hierChunk, index) => ({
                    id: `${document.licitacaoId}-${document.documentIndex}-h${index}`,
                    text: hierChunk.content,
                    metadata: {
                        licitacaoId: document.licitacaoId,
                        documentIndex: document.documentIndex,
                        documentType: document.metadata.documentType || 'edital',
                        text: hierChunk.content,
                        hierarchyPath: hierChunk.metadata.hierarchyPath,
                        depth: calculateDepthFromPath(hierChunk.metadata.hierarchyPath),
                        criticality: calculateCriticality(hierChunk.content),
                    }
                }));
                allChunks.push(...editalChunks);
            }
            else {
                // Fallback: chunking tradicional se hierárquico falhar
                console.log(`🔄 Fallback: chunking tradicional para ${document.licitacaoId}`);
                const traditionalChunks = createTraditionalChunks(document);
                allChunks.push(...traditionalChunks);
            }
        }
        catch (error) {
            console.error(`❌ Erro no chunking hierárquico para ${document.licitacaoId}:`, error);
            // Fallback em caso de erro
            const traditionalChunks = createTraditionalChunks(document);
            allChunks.push(...traditionalChunks);
        }
    }
    return allChunks;
}
/**
 * Calcula profundidade hierárquica baseado no caminho
 */
function calculateDepthFromPath(hierarchyPath) {
    // Conta o número de pontos ou níveis no caminho
    const numericMatches = hierarchyPath.match(/\d+(\.\d+)*/g);
    if (numericMatches) {
        const maxDots = Math.max(...numericMatches.map(match => (match.match(/\./g) || []).length));
        return maxDots + 1;
    }
    return 1;
}
/**
 * Calcula criticidade baseado no conteúdo
 */
function calculateCriticality(content) {
    const lowerContent = content.toLowerCase();
    let score = 0.5; // Base
    // Palavras-chave críticas aumentam score
    const criticalKeywords = [
        'prazo', 'data limite', 'valor', 'preço', 'requisito obrigatório',
        'habilitação', 'desclassificação', 'inabilitação', 'multa', 'penalidade'
    ];
    criticalKeywords.forEach(keyword => {
        if (lowerContent.includes(keyword)) {
            score += 0.1;
        }
    });
    return Math.min(score, 1.0);
}
function createTraditionalChunks(document) {
    const chunks = [];
    const chunkSize = 1000;
    const overlap = 200;
    const text = document.text;
    let start = 0;
    let chunkIndex = 0;
    while (start < text.length) {
        const end = Math.min(start + chunkSize, text.length);
        let finalEnd = end;
        if (end < text.length) {
            const lastSentence = text.lastIndexOf('.', end);
            if (lastSentence > start + chunkSize * 0.7) {
                finalEnd = lastSentence + 1;
            }
        }
        const chunkText = text.slice(start, finalEnd).trim();
        if (chunkText.length > 30) {
            chunks.push({
                id: `${document.licitacaoId}-${document.documentIndex}-${chunkIndex}`,
                text: chunkText,
                metadata: {
                    licitacaoId: document.licitacaoId,
                    documentIndex: document.documentIndex,
                    documentType: document.metadata.documentType || 'edital',
                    text: chunkText
                }
            });
        }
        start = finalEnd - overlap;
        chunkIndex++;
        if (finalEnd >= text.length)
            break;
    }
    return chunks;
}
