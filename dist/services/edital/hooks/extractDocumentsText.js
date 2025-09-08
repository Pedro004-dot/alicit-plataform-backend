"use strict";
// import { PDFProcessorAdapter } from "../../../adapters/pdfProcessorAdapter";
// import { EditalAnalysisRequest } from "../RAGService";
// export async function extractDocumentsText(request: EditalAnalysisRequest): Promise<string[]> {
//   const texts: string[] = [];
//   if (!request.documents   || request.documents.length === 0) {
//     console.log("⚠️ Nenhum documento fornecido, usando texto simulado");
//     const simulatedText = `Documento simulado para empresa ${request.empresaId} na licitação ${request.licitacaoId}`;
//     texts.push(simulatedText);
//     return texts;
//   }fffeee
//   // Usar o PDFProcessorAdapter para extrair texto real dos documentos
//   const pdfProcessor = new PDFProcessorAdapter();
//   for (const document of request.documents) {
//     try {
//       const processed = await pdfProcessor.extractTextFromPDF(document);
//       texts.push(processed.text);
//       console.log(`✅ Extraído texto de ${document.filename}: ${processed.text.length} caracteres`);
//     } catch (error) {
//       console.error(`❌ Erro ao processar ${document.filename}:`, error);
//       texts.push(`Erro ao processar ${document.filename}: ${error}`);
//     }
//   }
//   return texts;
// }
