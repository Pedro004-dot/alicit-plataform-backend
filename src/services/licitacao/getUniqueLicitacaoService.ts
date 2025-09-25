import licitacaoRepository from "../../repositories/licitacaoRepository";

interface FindRequest {
    numeroControlePNCP:string;
}


const getUniqueLicitacao = async (findRequest: FindRequest) => {
    const licitacao =await licitacaoRepository.getLicitacaoByNumeroControlePNCP(findRequest.numeroControlePNCP);
     console.log(`[SERVICE] Lictacao  ${findRequest.numeroControlePNCP} encontrada: ${licitacao}`);
    return licitacao;
};

export default { getUniqueLicitacao };
