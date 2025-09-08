import { Request, Response } from "express";
import searchLicitacaoService from "../../services/licitacao/searchLicitacaoService";

const searchLicitacao = async (req: Request, res: Response) => {
  
  try {
    const { palavraChave, tipoLicitacao, dataInicio, dataFim,valorMinimo, valorMaximo, fonte } = req.body;

    const search = await searchLicitacaoService.searchLicitacao({palavraChave, tipoLicitacao, dataInicio, dataFim,valorMinimo, valorMaximo, fonte});
    
    res.status(201).json(search);
   return search;
  } catch (error) {
    console.error("Erro ao buscar licitação:", error);
    res.status(500).json({ error: "Erro ao buscar licitação" });
  }
};

export default { searchLicitacao };