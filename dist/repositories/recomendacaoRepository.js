import { supabase } from '../config/supabase';
import pineconeLicitacaoRepository from './pineconeLicitacaoRepository';
import LicitacaoDecisaoRepository from './licitacaoDecisaoRepository';
class RecomendacaoRepository {
    async salvarRecomendacoes(recomendacoes) {
        console.log(`🔍 Verificando ${recomendacoes.length} licitações no Supabase...`);
        // 1. Verificar quais licitações existem no Supabase
        const numerosPNCP = recomendacoes.map(rec => rec.numeroControlePNCP);
        const { data: licitacoesExistentes, error: verificarError } = await supabase
            .from('licitacoes')
            .select('numero_controle_pncp')
            .in('numero_controle_pncp', numerosPNCP);
        if (verificarError) {
            throw new Error(`Erro ao verificar licitações existentes: ${verificarError.message}`);
        }
        // 2. Identificar licitações faltantes
        const licitacoesExistentesSet = new Set(licitacoesExistentes?.map(l => l.numero_controle_pncp) || []);
        const licitacoesFaltantes = numerosPNCP.filter(numeroPNCP => !licitacoesExistentesSet.has(numeroPNCP));
        // 3. Criar licitações faltantes usando o método existente
        if (licitacoesFaltantes.length > 0) {
            console.log(`🔄 Sincronizando ${licitacoesFaltantes.length} licitações do Pinecone para Supabase...`);
            const licitacaoDecisaoRepo = LicitacaoDecisaoRepository;
            for (const numeroPNCP of licitacoesFaltantes) {
                try {
                    // Buscar do Pinecone
                    const licitacaoPinecone = await pineconeLicitacaoRepository.getLicitacao(numeroPNCP);
                    if (licitacaoPinecone) {
                        // Salvar no Supabase usando método existente
                        await licitacaoDecisaoRepo.salvarLicitacaoCompleta(licitacaoPinecone);
                        console.log(`✅ Licitação ${numeroPNCP} sincronizada`);
                    }
                    else {
                        console.warn(`⚠️ Licitação ${numeroPNCP} não encontrada no Pinecone`);
                    }
                }
                catch (error) {
                    console.error(`❌ Erro ao sincronizar licitação ${numeroPNCP}:`, error);
                    // Continuar com as outras licitações mesmo se uma falhar
                }
            }
        }
        // 4. Agora salvar as recomendações (todas as licitações devem existir)
        const recomendacoesFormatadas = recomendacoes.map(rec => ({
            numero_controle_pncp: rec.numeroControlePNCP,
            empresa_cnpj: rec.empresaCnpj, // Manter formatação original do CNPJ
            status: 'nao_definido', // Usar status padronizado
            origem_recomendacao: true,
            match_score: rec.matchScore,
            data_matching: new Date().toISOString(),
            detalhes_matching: rec.detalhesMatching
        }));
        const { data, error } = await supabase
            .from('licitacoes_empresa')
            .upsert(recomendacoesFormatadas, {
            onConflict: 'numero_controle_pncp,empresa_cnpj',
            ignoreDuplicates: false
        })
            .select();
        if (error) {
            throw new Error(`Erro ao salvar recomendações: ${error.message}`);
        }
        console.log(`✅ ${data?.length || 0} recomendações salvas com sucesso`);
        return data || [];
    }
    async listarRecomendacoesPendentes(empresaCnpj) {
        // Usar CNPJ com formatação original
        const { data, error } = await supabase
            .from('licitacoes_empresa')
            .select(`
        *,
        licitacoes!inner(
          numero_controle_pncp,
          objeto_compra,
          modalidade_nome,
          valor_total_estimado,
          data_abertura_proposta,
          data_encerramento_proposta,
          uf_sigla,
          municipio_nome,
          situacao_compra_nome,
          orgao_entidade,
          unidade_orgao_completo,
          amparo_legal,
          processo,
          informacao_complementar,
          link_sistema_origem,
          link_processo_eletronico,
          justificativa_presencial,
          valor_total_homologado,
          situacao_compra_id,
          unidade_sub_rogada,
          orgao_sub_rogado,
          fontes_orcamentarias,
          usuario_nome,
          licitacao_itens(*)
        )
      `)
            .eq('empresa_cnpj', empresaCnpj)
            .eq('origem_recomendacao', true)
            .eq('status', 'nao_definido') // Recomendações pendentes
            .order('match_score', { ascending: false })
            .order('data_matching', { ascending: false });
        if (error) {
            throw new Error(`Erro ao listar recomendações: ${error.message}`);
        }
        return data || [];
    }
    async removerRecomendacao(numeroControlePNCP, empresaCnpj) {
        // Usar CNPJ com formatação original
        const { error } = await supabase
            .from('licitacoes_empresa')
            .delete()
            .eq('numero_controle_pncp', numeroControlePNCP)
            .eq('empresa_cnpj', empresaCnpj)
            .eq('origem_recomendacao', true);
        if (error) {
            throw new Error(`Erro ao remover recomendação: ${error.message}`);
        }
    }
    async limparRecomendacoesAntigas(diasParaExpirar) {
        const dataLimite = new Date();
        dataLimite.setDate(dataLimite.getDate() - diasParaExpirar);
        const { data, error } = await supabase
            .from('licitacoes_empresa')
            .delete()
            .eq('origem_recomendacao', true)
            .eq('status', 'nao_definido') // Recomendações pendentes
            .lt('data_matching', dataLimite.toISOString())
            .select('id');
        if (error) {
            throw new Error(`Erro ao limpar recomendações antigas: ${error.message}`);
        }
        return data?.length || 0;
    }
    async verificarRecomendacaoExistente(numeroControlePNCP, empresaCnpj) {
        // Usar CNPJ com formatação original
        const { data, error } = await supabase
            .from('licitacoes_empresa')
            .select('*')
            .eq('numero_controle_pncp', numeroControlePNCP)
            .eq('empresa_cnpj', empresaCnpj)
            .eq('origem_recomendacao', true)
            .single();
        if (error && error.code !== 'PGRST116') {
            throw new Error(`Erro ao verificar recomendação: ${error.message}`);
        }
        return data;
    }
}
export default new RecomendacaoRepository();
