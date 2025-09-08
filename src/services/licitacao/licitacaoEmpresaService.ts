import licitacaoEmpresaRepository from "../../repositories/licitacaoEmpresaRepository";

interface CriarLicitacaoEmpresaInput {
  cnpjEmpresa: string;
  numeroControlePNCP: string;
  status?: string;
}

const statusValidos = [
  "nao_definido", "em_analise", "proposta", "enviada", 
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

export default { 
  criar, 
  atualizarStatus, 
  atualizarStatusPorChaves,
  listarPorEmpresa, 
  buscarPorId, 
  buscarOuCriar,
  deletar, 
  statusValidos 
};