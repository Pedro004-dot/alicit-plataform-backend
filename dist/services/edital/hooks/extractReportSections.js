"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractTechnicalSummary = extractTechnicalSummary;
exports.extractImpugnacaoAnalysis = extractImpugnacaoAnalysis;
function extractTechnicalSummary(report) {
    if (!report || typeof report !== 'string') {
        return "Resumo técnico não disponível";
    }
    const match = report.match(/## RESUMO TÉCNICO\n(.*?)\n---/s);
    return match ? match[1].trim() : "Resumo técnico não identificado no relatório";
}
function extractImpugnacaoAnalysis(report) {
    if (!report || typeof report !== 'string') {
        return "Análise de impugnação não disponível";
    }
    const match = report.match(/## ANÁLISE DE CONFORMIDADE\n(.*?)\n---/s);
    return match ? match[1].trim() : "Análise de impugnação não identificada no relatório";
}
