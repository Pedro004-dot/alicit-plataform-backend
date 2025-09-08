import { PDFProcessorAdapter } from "../../../../adapters/pdfProcessorAdapter";
export async function processDocuments(request) {
    const pdfProcessor = new PDFProcessorAdapter();
    const editalDocuments = [];
    if (!request.documents || request.documents.length === 0) {
        throw new Error(`❌ CRÍTICO: Nenhum documento fornecido para licitação ${request.licitacaoId}. Sistema RAG requer documentos reais.`);
    }
    console.log(`🔄 Processando ${request.documents.length} documentos para ${request.licitacaoId}...`);
    let processedCount = 0;
    const errors = [];
    for (let i = 0; i < request.documents.length; i++) {
        const document = request.documents[i];
        try {
            console.log(`📄 Processando documento ${i + 1}/${request.documents.length}: ${document.filename}`);
            // Verificar se é um documento válido
            if (!document.buffer || document.buffer.length === 0) {
                throw new Error(`Documento ${document.filename} está vazio`);
            }
            // USAR PDFProcessorAdapter com fallbacks robustos
            const processedText = await pdfProcessor.extractTextFromPDF(document);
            if (!processedText || processedText.text.trim().length < 50) {
                throw new Error(`Documento ${document.filename} não contém texto suficiente (${processedText?.text?.length || 0} chars)`);
            }
            editalDocuments.push({
                licitacaoId: request.licitacaoId,
                documentIndex: i,
                text: processedText.text,
                metadata: {
                    documentType: 'edital',
                    filename: document.filename,
                    size: document.buffer.length,
                    hash: processedText.metadata.hash,
                    processedAt: new Date().toISOString(),
                    pages: processedText.pages,
                },
            });
            processedCount++;
            console.log(`✅ Documento processado: ${document.filename} - ${processedText.text.length} caracteres, ${processedText.pages} páginas`);
        }
        catch (error) {
            const errorMsg = `Erro ao processar ${document.filename}: ${error.message}`;
            console.error(`❌ ${errorMsg}`);
            errors.push(errorMsg);
            // Se for um erro crítico (PDF corrompido), continue com outros documentos
            // ao invés de parar completamente
            if (error.message.includes('corrompido') || error.message.includes('não é um PDF válido')) {
                console.warn(`⚠️ Pulando documento corrompido: ${document.filename}`);
                continue;
            }
            // Para outros erros, falhe se não conseguiu processar nenhum documento ainda
            if (processedCount === 0 && i === request.documents.length - 1) {
                throw new Error(`Falha ao processar todos os documentos. Erros: ${errors.join('; ')}`);
            }
        }
    }
    if (editalDocuments.length === 0) {
        throw new Error(`❌ CRÍTICO: Nenhum documento válido processado para ${request.licitacaoId}. Erros: ${errors.join('; ')}`);
    }
    const totalCharacters = editalDocuments.reduce((sum, doc) => sum + doc.text.length, 0);
    const totalPages = editalDocuments.reduce((sum, doc) => sum + (doc.metadata.pages || 0), 0);
    console.log(`✅ Processamento concluído:`);
    console.log(`  • ${editalDocuments.length}/${request.documents.length} documentos processados com sucesso`);
    console.log(`  • ${totalCharacters.toLocaleString()} caracteres extraídos`);
    console.log(`  • ${totalPages} páginas processadas`);
    if (errors.length > 0) {
        console.warn(`⚠️ ${errors.length} documento(s) com erro foram ignorados`);
    }
    return editalDocuments;
}
