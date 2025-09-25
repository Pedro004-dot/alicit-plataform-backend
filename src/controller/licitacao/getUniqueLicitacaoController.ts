import { Request, Response } from "express";
import findLicitacaoService from "../../services/licitacao/findLicitacaoService";
import getUniqueLicitacaoService from "../../services/licitacao/getUniqueLicitacaoService";

interface FindRequest {
numeroControlePNCP:string;
}

const getUniqueLicitacao = async (req: Request, res: Response) => {
  try {
    
    const numeroControlePNCP = req.query.numero as string;

    
    const licitacoes = await getUniqueLicitacaoService.getUniqueLicitacao({numeroControlePNCP});
    console.log(`[CONTROLLER] Lictacao  ${numeroControlePNCP} encontrada: ${licitacoes}`);

    res.status(200).json(licitacoes);
    return licitacoes;
  } catch (error) {
    console.error("Erro ao buscar licitação:", error);
    res.status(500).json({ error: "Erro ao buscar licitação" });
    return res.status(500).json({ error: "Erro ao buscar licitação" });
  }
};

 export default { getUniqueLicitacao };