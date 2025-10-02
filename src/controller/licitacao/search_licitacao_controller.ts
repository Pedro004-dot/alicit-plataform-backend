import { Request, Response } from "express";
import searchLicitacaoService from "../../services/licitacao/searchLicitacaoService";

// 📋 MODALIDADES DISPONÍVEIS (Lei 14.133/2021)
const MODALIDADES_DISPONIVEIS = {
  1: 'Pregão',
  2: 'Concorrência', 
  3: 'Diálogo Competitivo',
  4: 'Concurso',
  5: 'Leilão'
} as const;

const searchLicitacao = async (req: Request, res: Response) => {
  try {
    const { modalidades, fonte } = req.body;
    
    // 📋 VALIDAR MODALIDADES (se informadas)
    let modalidadesValidas: number[] | undefined;
    
    if (modalidades) {
      if (!Array.isArray(modalidades)) {
        return res.status(400).json({ 
          error: "Modalidades deve ser um array de números",
          modalidadesDisponiveis: MODALIDADES_DISPONIVEIS
        });
      }
      
      modalidadesValidas = modalidades.filter((m: any) => {
        const modalidadeNum = Number(m);
        return modalidadeNum >= 1 && modalidadeNum <= 5;
      });
      
      if (modalidadesValidas.length === 0) {
        return res.status(400).json({ 
          error: "Nenhuma modalidade válida informada. Use números de 1 a 5.",
          modalidadesDisponiveis: MODALIDADES_DISPONIVEIS
        });
      }
      
      console.log(`📋 Modalidades especificadas: [${modalidadesValidas.join(', ')}]`);
    } else {
      console.log(`📋 Nenhuma modalidade especificada - buscando TODAS as modalidades`);
    }
    
    // 📅 DATA SEMPRE HOJE (não aceita parâmetros de data)
    const hoje = new Date().toISOString().split('T')[0];
    console.log(`📅 Buscando licitações do dia: ${hoje}`);
    
    const search = await searchLicitacaoService.searchLicitacao({
      dataInicio: hoje,
      dataFim: hoje,
      fonte, // opcional: especifica fonte (pncp, etc.) ou usa padrão
      modalidades: modalidadesValidas // undefined = todas, array = específicas
    });
    
    res.status(201).json({
      ...search,
      parametros: {
        data: hoje,
        modalidades: modalidadesValidas || Object.keys(MODALIDADES_DISPONIVEIS).map(Number),
        modalidadesDisponiveis: MODALIDADES_DISPONIVEIS
      }
    });
    
    return search;
  } catch (error) {
    console.error("Erro ao buscar licitação:", error);
    res.status(500).json({ error: "Erro ao buscar licitação" });
  }
};

export default { searchLicitacao, MODALIDADES_DISPONIVEIS };