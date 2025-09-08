import empresaRepository from '../../repositories/empresaRepository';
const atualizarConfiguracoesEmpresa = async (empresaId, dadosEmpresa) => {
    try {
        const empresaAtualizada = await empresaRepository.updateEmpresa(empresaId, dadosEmpresa);
        // Se dados bancários foram fornecidos, atualizar separadamente
        if (dadosEmpresa.dadosBancarios) {
            await empresaRepository.updateDadosBancarios(empresaId, dadosEmpresa.dadosBancarios);
        }
        return empresaAtualizada;
    }
    catch (error) {
        console.error('Erro no service ao atualizar empresa:', error);
        throw error;
    }
};
const buscarEmpresaCompleta = async (empresaId) => {
    try {
        const empresa = await empresaRepository.getEmpresaById(empresaId);
        const documentos = await empresaRepository.getDocumentosByEmpresaId(empresaId);
        return {
            ...empresa,
            documentos
        };
    }
    catch (error) {
        console.error('Erro no service ao buscar empresa completa:', error);
        throw error;
    }
};
const buscarEmpresaPorCnpjCompleta = async (cnpj) => {
    try {
        const empresa = await empresaRepository.getEmpresaByCnpj(cnpj);
        const documentos = await empresaRepository.getDocumentosByEmpresaId(empresa.id);
        return {
            ...empresa,
            documentos
        };
    }
    catch (error) {
        console.error('Erro no service ao buscar empresa por CNPJ:', error);
        throw error;
    }
};
const processarDocumentosEmpresa = async (empresaId, documentos) => {
    try {
        const documentosProcessados = [];
        for (const doc of documentos) {
            if (doc.arquivo) {
                const documentoSalvo = await empresaRepository.uploadDocumento(empresaId, doc.arquivo, doc.nomeDocumento, doc.dataExpiracao);
                documentosProcessados.push(documentoSalvo);
            }
        }
        return documentosProcessados;
    }
    catch (error) {
        console.error('Erro no service ao processar documentos:', error);
        throw error;
    }
};
const putEmpresa = async (id, empresaInput) => {
    const empresaAtualizada = await empresaRepository.updateEmpresa(id, empresaInput);
    return empresaAtualizada;
};
export default {
    atualizarConfiguracoesEmpresa,
    buscarEmpresaCompleta,
    buscarEmpresaPorCnpjCompleta,
    processarDocumentosEmpresa,
    putEmpresa
};
