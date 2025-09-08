import { PDFGeneratorAdapter } from "../../../adapters/pdfGeneratorAdapter";

export async function generatePDFReport(data: any): Promise<{ pdfPath: string; dadosPdf: any }> {
  const pdfGenerator = new PDFGeneratorAdapter();
  
  try {
    return await pdfGenerator.generateReport(data);
  } catch (error: any) {
    console.error("❌ Erro ao gerar PDF:", error);
    throw new Error(`Erro na geração do PDF: ${error.message}`);
  }
}
