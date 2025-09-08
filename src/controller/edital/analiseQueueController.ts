import { Request, Response } from "express";
import analiseQueueService from "../../services/edital/analiseQueueService";

const iniciarAnalise = async (req: Request, res: Response) => {
  try {
    const { numeroControlePNCP, empresaCnpj } = req.body;

    if (!numeroControlePNCP || !empresaCnpj) {
      return res.status(400).json({ 
        error: "numeroControlePNCP e empresaCnpj são obrigatórios" 
      });
    }

    await analiseQueueService.adicionarAnalise(numeroControlePNCP, empresaCnpj);

    res.status(201).json({ 
      message: "Análise adicionada à fila com sucesso",
      numeroControlePNCP
    });

  } catch (error) {
    console.error("❌ Erro ao iniciar análise:", error);
    res.status(500).json({ error: "Erro ao iniciar análise" });
  }
};

const buscarStatusAnalise = async (req: Request, res: Response) => {
  try {
    const { numeroControlePNCP } = req.params;

    if (!numeroControlePNCP) {
      return res.status(400).json({ 
        error: "numeroControlePNCP é obrigatório" 
      });
    }

    // Decodificar o número de controle da URL
    const numeroDecodificado = decodeURIComponent(numeroControlePNCP);
    
    const status = await analiseQueueService.buscarStatusAnalise(numeroDecodificado);

    res.status(200).json(status);

  } catch (error) {
    console.error("❌ Erro ao buscar status da análise:", error);
    res.status(500).json({ error: "Erro ao buscar status da análise" });
  }
};

export default {
  iniciarAnalise,
  buscarStatusAnalise
};