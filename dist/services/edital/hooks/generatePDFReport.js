import { PDFGeneratorAdapter } from "../../../adapters/pdfGeneratorAdapter";
export async function generatePDFReport(data) {
    const pdfGenerator = new PDFGeneratorAdapter();
    try {
        return await pdfGenerator.generateReport(data);
    }
    catch (error) {
        console.error("❌ Erro ao gerar PDF:", error);
        throw new Error(`Erro na geração do PDF: ${error.message}`);
    }
}
