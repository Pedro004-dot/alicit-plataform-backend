import { Request, Response } from "express";
import matchingLicitacaoService from "../../services/licitacao/matchingLicitacaoService";
import recomendacaoService from "../../services/licitacao/recomendacaoService";
import empresaService from "../../services/empresa/empresaService";
import { MatchResult } from "../../services/licitacao/metrics/types";

/**
 * Controller para processamento de matching em lote de todas as empresas
 * SEMPRE processa todas as empresas cadastradas no sistema
 */
const calculateMatching = async (req: Request, res: Response) => {
  const inicioProcessamento = Date.now();

  
  try {
    // Buscar todas as empresas preparadas para matching
    const empresas = await empresaService.buscarEmpresasParaMatching();
    
    if (empresas.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'Nenhuma empresa encontrada para processamento',
        totalEmpresas: 0,
        resultados: []
      });
    }

    const resultados = [];
    let totalRecomendacoesCriadas = 0;
    let sucessos = 0;
    let falhas = 0;

    console.log(`🔄 Processando ${empresas.length} empresas sequencialmente...`);

    // Processar cada empresa sequencialmente
    for (let i = 0; i < empresas.length; i++) {
      const empresa = empresas[i];
      const inicioEmpresa = Date.now();
      
      try {
        console.log(`\n📈 [${i + 1}/${empresas.length}] Processando: ${empresa.nome} (${empresa.cnpj})`);
        
        // Executar matching para a empresa atual
        const matches = await matchingLicitacaoService.calculateMatching(empresa.perfil);
        
        // Salvar recomendações se houver matches
        if (matches.length > 0) {
          try {
            await recomendacaoService.salvarRecomendacoes(empresa.cnpj, matches as MatchResult[]);
            totalRecomendacoesCriadas += matches.length;
            console.log(`✅ ${matches.length} recomendações salvas para ${empresa.nome}`);
          } catch (recomendacaoError) {
            console.error(`⚠️ Erro ao salvar recomendações para ${empresa.nome}:`, recomendacaoError);
          }
        }

        const tempoEmpresa = Date.now() - inicioEmpresa;
        
        resultados.push({
          cnpj: empresa.cnpj,
          nome: empresa.nome,
          totalMatches: matches.length,
          recomendacoesSalvas: matches.length,
          tempoProcessamento: `${tempoEmpresa}ms`,
          status: 'sucesso'
        });

        sucessos++;
        console.log(`✅ Empresa ${empresa.nome} processada com sucesso em ${tempoEmpresa}ms`);
        
      } catch (empresaError) {
        falhas++;
        console.error(`❌ Erro ao processar empresa ${empresa.nome}:`, empresaError);
        
        resultados.push({
          cnpj: empresa.cnpj,
          nome: empresa.nome,
          totalMatches: 0,
          recomendacoesSalvas: 0,
          erro: empresaError instanceof Error ? empresaError.message : 'Erro desconhecido',
          status: 'falha'
        });
      }
    }

    const tempoTotal = Date.now() - inicioProcessamento;

    return res.status(200).json({
      success: true,
      message: 'Processamento de matching em lote concluído',
      estatisticas: {
        totalEmpresas: empresas.length,
        sucessos,
        falhas,
        totalRecomendacoesCriadas,
        tempoProcessamento: `${tempoTotal}ms`
      },
      resultados
    });

  } catch (error) {
    console.error('❌ Erro crítico no processamento em lote:', error);
    return res.status(500).json({ 
      success: false,
      error: 'Erro crítico no processamento de matching em lote',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
};

export default { calculateMatching };
