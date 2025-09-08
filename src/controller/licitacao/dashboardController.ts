import { Request, Response } from "express";
import dashboardService from "../../services/licitacao/dashboardService";

const getDashboardData = async (req: Request, res: Response) => {
  try {
    const { cnpj } = req.params;
    const data = await dashboardService.getDashboardData(cnpj);
    res.status(200).json({ 
      success: true, 
      data, 
      message: "Dados do dashboard obtidos com sucesso" 
    });
  } catch (error) {
    console.error("Erro ao buscar dados do dashboard:", error);
    res.status(500).json({ error: "Erro ao buscar dados do dashboard" });
  }
};

const getLicitacoesComEstagios = async (req: Request, res: Response) => {
  try {
    const { cnpj } = req.params;
    const data = await dashboardService.getLicitacoesComEstagios(cnpj);
    res.status(200).json({ 
      success: true, 
      data, 
      total: data.length 
    });
  } catch (error) {
    console.error("Erro ao buscar licitações com estágios:", error);
    res.status(500).json({ error: "Erro ao buscar licitações com estágios" });
  }
};

export default { getDashboardData, getLicitacoesComEstagios };


