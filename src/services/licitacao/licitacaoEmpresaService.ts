import licitacaoEmpresaRepository from "../../repositories/licitacaoEmpresaRepository";
import pineconeLicitacaoRepository from "../../repositories/pineconeLicitacaoRepository";
import supabaseLicitacaoRepository from "../../repositories/supabaseLicitacaoRepository";
import LicitacaoDecisaoRepository from "../../repositories/licitacaoDecisaoRepository";

interface CriarLicitacaoEmpresaInput {
  cnpjEmpresa: string;
  numeroControlePNCP: string;
  status?: string;
}

const statusValidos = [
  "nao_definido", "selecionada", "nao_analisado", "em_analise", "analisado", "proposta", "enviada", 
  "vencida", "recusada", "perdida"
];

const validarStatus = (status: string): boolean => {
  return statusValidos.includes(status);
};

const criar = async (data: CriarLicitacaoEmpresaInput) => {
  const status = data.status || "nao_definido";
  
  if (!validarStatus(status)) {
    throw new Error(`Status inválido: ${status}`);
  }

  return await licitacaoEmpresaRepository.criar({
    ...data,
    status
  });
};

const atualizarStatus = async (id: number, novoStatus: string) => {
  if (!validarStatus(novoStatus)) {
    throw new Error(`Status inválido: ${novoStatus}`);
  }

  return await licitacaoEmpresaRepository.atualizarStatus(id, novoStatus);
};

const listarPorEmpresa = async (cnpj: string) => {
  return await licitacaoEmpresaRepository.listarPorEmpresa(cnpj);
};

const buscarPorId = async (id: number) => {
  const licitacao = await licitacaoEmpresaRepository.buscarPorId(id);
  if (!licitacao) {
    throw new Error("Licitação não encontrada");
  }
  return licitacao;
};

const buscarOuCriar = async (numeroControlePNCP: string, empresaCnpj: string) => {
  const existente = await licitacaoEmpresaRepository.buscarPorChaves(numeroControlePNCP, empresaCnpj);
  
  if (existente) {
    return existente;
  }
  
  // ✅ NOVA LÓGICA: Garantir que a licitação existe no Supabase antes de criar o relacionamento
  console.log(`🔍 Verificando se licitação ${numeroControlePNCP} existe no Supabase...`);
  
  try {
    const licitacaoExistente = await LicitacaoDecisaoRepository.getLicitacao(numeroControlePNCP);
    
    if (!licitacaoExistente) {
      console.log(`📥 Licitação ${numeroControlePNCP} não encontrada no Supabase, buscando no Pinecone...`);
      
      // Buscar do Supabase primeiro, depois Pinecone como fallback
      let licitacaoEncontrada = await supabaseLicitacaoRepository.getLicitacao(numeroControlePNCP);
      
      if (!licitacaoEncontrada) {
        console.log(`📥 Licitação ${numeroControlePNCP} não encontrada no Supabase, buscando no Pinecone...`);
        licitacaoEncontrada = await pineconeLicitacaoRepository.getLicitacao(numeroControlePNCP);
      }
      
      if (licitacaoEncontrada) {
        console.log(`💾 Salvando licitação ${numeroControlePNCP} no Supabase...`);
        await LicitacaoDecisaoRepository.salvarLicitacaoCompleta(licitacaoEncontrada);
        console.log(`✅ Licitação ${numeroControlePNCP} sincronizada com sucesso`);
      } else {
        console.warn(`⚠️ Licitação ${numeroControlePNCP} não encontrada em nenhum banco`);
        throw new Error(`Licitação ${numeroControlePNCP} não encontrada`);
      }
    } else {
      console.log(`✅ Licitação ${numeroControlePNCP} já existe no Supabase`);
    }
  } catch (error) {
    console.error(`❌ Erro ao verificar/sincronizar licitação ${numeroControlePNCP}:`, error);
    throw error;
  }
  
  // Agora criar o relacionamento licitacao_empresa
  return await criar({
    numeroControlePNCP,
    cnpjEmpresa: empresaCnpj,
    status: "nao_definido"
  });
};

const atualizarStatusPorChaves = async (numeroControlePNCP: string, empresaCnpj: string, novoStatus: string) => {
  if (!validarStatus(novoStatus)) {
    throw new Error(`Status inválido: ${novoStatus}`);
  }

  const licitacao = await buscarOuCriar(numeroControlePNCP, empresaCnpj);
  
  return await licitacaoEmpresaRepository.atualizarStatus(licitacao.id, novoStatus);
};

const deletar = async (id: number) => {
  return await licitacaoEmpresaRepository.deletar(id);
};

const deletarPorStatus = async (statusList: string[]) => {
  const statusInvalidos = statusList.filter(status => !validarStatus(status));
  
  if (statusInvalidos.length > 0) {
    throw new Error(`Status inválidos: ${statusInvalidos.join(', ')}`);
  }

  return await licitacaoEmpresaRepository.deletarPorStatus(statusList);
};

export default { 
  criar, 
  atualizarStatus, 
  atualizarStatusPorChaves,
  listarPorEmpresa, 
  buscarPorId, 
  buscarOuCriar,
  deletar,
  deletarPorStatus,
  statusValidos 
};