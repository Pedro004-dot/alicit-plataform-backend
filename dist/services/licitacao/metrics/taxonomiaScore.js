"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateTaxonomiaScore = void 0;
/**
 * Calcula score baseado na taxonomia (categoria de material/serviço)
 * @param empresaTermos - Termos de interesse da empresa
 * @param licitacaoItens - Itens da licitação
 * @returns Score entre 0 e 1
 */
const calculateTaxonomiaScore = (empresaTermos, licitacaoItens) => {
    const categorias = licitacaoItens.map(item => item.materialOuServicoNome?.toLowerCase()).filter(Boolean);
    let matches = 0;
    for (const termo of empresaTermos) {
        if (categorias.some(cat => cat.includes(termo) || termo.includes(cat))) {
            matches++;
        }
    }
    return empresaTermos.length > 0 ? matches / empresaTermos.length : 0;
};
exports.calculateTaxonomiaScore = calculateTaxonomiaScore;
