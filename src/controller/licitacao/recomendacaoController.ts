import { Request, Response } from "express";
import recomendacaoService from "../../services/licitacao/recomendacaoService";

const listarRecomendacoes = async (req: Request, res: Response) => {
  try {
    const { cnpj } = req.params;
    
    if (!cnpj) {
      return res.status(400).json({ 
        error: "CNPJ da empresa é obrigatório" 
      });
    }

    // Decodificar CNPJ da URL
    const decodedCnpj = decodeURIComponent(cnpj);
    console.log(`📋 Listando recomendações para empresa ${decodedCnpj}`);
    const resultado = await recomendacaoService.listarRecomendacoesPendentes(decodedCnpj);
    
    res.status(200).json(resultado);
  } catch (error) {
    console.error("Erro ao listar recomendações:", error);
    res.status(500).json({ error: "Erro ao listar recomendações" });
  }
};

const removerRecomendacao = async (req: Request, res: Response) => {
  try {
    const { numeroControlePNCP, empresaCnpj } = req.body;
    
    if (!numeroControlePNCP || !empresaCnpj) {
      return res.status(400).json({ 
        error: "Número de controle PNCP e CNPJ da empresa são obrigatórios" 
      });
    }

    console.log(`🗑️ Removendo recomendação ${numeroControlePNCP} da empresa ${empresaCnpj}`);
    const resultado = await recomendacaoService.removerRecomendacao(numeroControlePNCP, empresaCnpj);
    
    res.status(200).json(resultado);
  } catch (error) {
    console.error("Erro ao remover recomendação:", error);
    res.status(500).json({ error: "Erro ao remover recomendação" });
  }
};

const limparRecomendacoesAntigas = async (req: Request, res: Response) => {
  try {
    const { dias = 30 } = req.body;
    
    console.log(`🧹 Limpando recomendações antigas (>${dias} dias)`);
    const resultado = await recomendacaoService.limparRecomendacoesAntigas(dias);
    
    res.status(200).json(resultado);
  } catch (error) {
    console.error("Erro ao limpar recomendações antigas:", error);
    res.status(500).json({ error: "Erro ao limpar recomendações antigas" });
  }
};

export default { 
  listarRecomendacoes,
  removerRecomendacao,
  limparRecomendacoesAntigas
};