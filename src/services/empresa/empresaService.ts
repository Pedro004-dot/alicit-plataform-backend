import empresaRepository from '../../repositories/empresaRepository';
import { EmpresaPerfil } from '../licitacao/metrics/types';

interface EmpresaParaMatching {
  cnpj: string;
  nome: string;
  perfil: EmpresaPerfil;
}

class EmpresaService {
  async buscarEmpresasParaMatching(): Promise<EmpresaParaMatching[]> {
    console.log('🏢 Iniciando busca de empresas para matching em lote...');
    
    
    try {
      // Buscar todas empresas ativas
      const empresas = await empresaRepository.getAllEmpresas();
      console.log(empresas);
      
      if (!empresas || empresas.length === 0) {
        console.log('⚠️ Nenhuma empresa encontrada no sistema');
        return [];
      }

      console.log(`📊 Encontradas ${empresas.length} empresas para processamento`);
      
      const empresasParaMatching: EmpresaParaMatching[] = [];
      
      for (const empresa of empresas) {
        try {
          const perfil = await this.montarPerfilEmpresa(empresa);
          
          // Validar se empresa tem dados mínimos para matching
          // Empresa precisa ter pelo menos: termos OU (razão social + descrição) OU palavras-chave
          const temDadosMinimos = perfil.termosInteresse.length > 0 || 
                                 (perfil.razaoSocial && perfil.descricao) || 
                                 perfil.palavrasChave;
          
        if (temDadosMinimos) {
            empresasParaMatching.push({
              cnpj: empresa.cnpj,
              nome: empresa.nome,
              perfil
            });
            console.log(`✅ Empresa ${empresa.nome} (${empresa.cnpj}) adicionada para matching`);
          } else {
            console.log(`⚠️ Empresa ${empresa.nome} sem dados suficientes para matching`);
          }
        } catch (error) {
          console.error(`❌ Erro ao montar perfil da empresa ${empresa.nome}:`, error);
        }
      }

      console.log(`🎯 Total de empresas preparadas para matching: ${empresasParaMatching.length}`);
      return empresasParaMatching;
      
    } catch (error) {
      console.error('❌ Erro ao buscar empresas para matching:', error);
      throw new Error('Falha ao buscar empresas para processamento em lote');
    }
  }

  private async montarPerfilEmpresa(empresa: any): Promise<EmpresaPerfil> {
    console.log(`🔧 Montando perfil para empresa: ${empresa.nome}`);
    
    const perfil: EmpresaPerfil = {
      // === IDENTIFICAÇÃO ===
      id: empresa.id,
      cnpj: empresa.cnpj,
      nome: empresa.nome,
      razaoSocial: empresa.razao_social,
      
      // === LOCALIZAÇÃO ===
      cidade: empresa.cidade,
      cep: empresa.cep,
      endereco: empresa.endereco,
      cidadeRadar: empresa.cidade_radar,
      raioRadar: empresa.raio_distancia,
      
      // === NEGÓCIO ===
      descricao: empresa.descricao,
      produtoServico: empresa.produto_servico,
      palavrasChave: empresa.palavras_chave,
      porte: empresa.porte,
      
      // === CONTATO ===
      email: empresa.email,
      telefone: empresa.telefone,
      responsavelLegal: empresa.responsavel_legal,
      
      // === MATCHING PARAMS ===
      termosInteresse: []
    };

    // Buscar produtos da empresa
    try {
      const produtos = await empresaRepository.getProdutosByEmpresaId(empresa.id);
      if (produtos && produtos.length > 0) {
        perfil.produtos = produtos.map((p: any) => p.produto);
        perfil.termosInteresse.push(...produtos.map((p: any) => p.produto));
        console.log(`📦 ${produtos.length} produtos adicionados aos termos de interesse`);
      }
    } catch (error) {
      console.error(`⚠️ Erro ao buscar produtos da empresa ${empresa.nome}:`, error);
    }

    // Buscar serviços da empresa
    try {
      const servicos = await empresaRepository.getServicosByEmpresaId(empresa.id);
      if (servicos && servicos.length > 0) {
        perfil.servicos = servicos.map((s: any) => s.servico);
        perfil.termosInteresse.push(...servicos.map((s: any) => s.servico));
        console.log(`🔧 ${servicos.length} serviços adicionados aos termos de interesse`);
      }
    } catch (error) {
      console.error(`⚠️ Erro ao buscar serviços da empresa ${empresa.nome}:`, error);
    }

    // Log do filtro geográfico configurado
    if (perfil.cidadeRadar && perfil.raioRadar) {
      console.log(`🌍 Filtro geográfico configurado: ${perfil.cidadeRadar} + ${perfil.raioRadar}m`);
    } else {
      console.log(`🌍 Sem filtro geográfico: cidade_radar=${perfil.cidadeRadar}, raio=${perfil.raioRadar}`);
    }

    // Remover duplicatas dos termos de interesse
    perfil.termosInteresse = [...new Set(perfil.termosInteresse)];
    
    console.log(`✅ Perfil montado: ${perfil.termosInteresse.length} termos, filtro geo: ${perfil.cidadeRadar ? 'sim' : 'não'}`);
    return perfil;
  }

}

export default new EmpresaService();