import { Request, Response } from "express";
import findLicitacaoService from "../../services/licitacao/findLicitacaoService";

interface FindRequest {
  cnpj: string;
  palavraChave: string;
  valorMinimo?: number;
  valorMaximo?: number;
  tipoLicitacao?: string;
  dataInicio?: string;
  dataFim?: string;
  fonte?: string;
  raioDistancia?: number;
  cidade_radar?: string;
}

const findLicitacao = async (req: Request, res: Response) => {
  try {
    const findRequest: FindRequest = req.body;
    
    // Validação obrigatória
    if ( !findRequest.palavraChave) {
      return res.status(400).json({ 
        error: "A palavraChave é obrigatória" 
      });
    }

    // Validação dos valores
    if (findRequest.valorMinimo && findRequest.valorMinimo <= 0) {
      return res.status(400).json({ 
        error: "ValorMinimo deve ser maior que zero" 
      });
    }

    if (findRequest.valorMaximo && findRequest.valorMaximo <= 0) {
      return res.status(400).json({ 
        error: "ValorMaximo deve ser maior que zero" 
      });
    }

    if (findRequest.valorMinimo && findRequest.valorMaximo && 
        findRequest.valorMinimo > findRequest.valorMaximo) {
      return res.status(400).json({ 
        error: "ValorMinimo não pode ser maior que ValorMaximo" 
      });
    }

    console.log('📊 Recebendo busca manual:', findRequest);
    
    const licitacoes = await findLicitacaoService.findWithKeywordAndFilters(findRequest);
    res.status(200).json(licitacoes);
  } catch (error) {
    console.error("Erro ao buscar licitação:", error);
    res.status(500).json({ error: "Erro ao buscar licitação" });
  }
};

 export default { findLicitacao };

//Objejtivo de buscar licitação pelo numero do controle PNCP