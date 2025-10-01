import { Request, Response } from "express";
import searchLicitacaoService from "../../services/licitacao/searchLicitacaoService";

const searchLicitacao = async (req: Request, res: Response) => {
  try {
    const { dataFim, fonte, dataInicio } = req.body;
    
    const search = await searchLicitacaoService.searchLicitacao({
      dataInicio,
      dataFim,
      fonte // opcional: especifica fonte (pncp, etc.) ou usa padrão
    });
    
    res.status(201).json(search);
    return search;
  } catch (error) {
    console.error("Erro ao buscar licitação:", error);
    res.status(500).json({ error: "Erro ao buscar licitação" });
  }
};

export default { searchLicitacao };