"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generatePDFReport = generatePDFReport;
const pdfGeneratorAdapter_1 = require("../../../adapters/pdfGeneratorAdapter");
async function generatePDFReport(data) {
    const pdfGenerator = new pdfGeneratorAdapter_1.PDFGeneratorAdapter();
    try {
        return await pdfGenerator.generateReport(data);
    }
    catch (error) {
        console.error("❌ Erro ao gerar PDF:", error);
        throw new Error(`Erro na geração do PDF: ${error.message}`);
    }
}
