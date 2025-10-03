import { createClient } from '@supabase/supabase-js';
import { EmpresaInput } from '../controller/empresa/createEmpresaController';
import { EmpresaProduto } from '../types/empresaTypes';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);
const createEmpresa = async (empresaData: EmpresaInput) => {
    const { data, error } = await supabase
        .from('empresas')
        .insert({
            nome: empresaData.nome,
            cnpj: empresaData.cnpj,
            razao_social: empresaData.razaoSocial,
            email: empresaData.email,
            telefone: empresaData.telefone,
            cep: empresaData.CEP,
            cidade: empresaData.cidades,
            endereco: empresaData.endereco,
            descricao: empresaData.descricao,
            responsavel_legal: empresaData.responsavelLegal,
            raio_distancia: empresaData.raioDistancia,
            cidade_radar: empresaData.cidadeRadar,
            porte: empresaData.porte
        })
        .select()
        .single();

    if (error) throw error;

    // ✅ Inserir dados bancários se fornecidos (agora obrigatório)
    if (empresaData.dadosBancarios && data.id) {
        await supabase
            .from('dados_bancarios')
            .insert({
                empresa_id: data.id,
                banco: empresaData.dadosBancarios.banco,
                agencia: empresaData.dadosBancarios.agencia,
                numero_conta: empresaData.dadosBancarios.numeroConta,
                nome_titular: empresaData.dadosBancarios.nomeTitular,
                tipo_conta: empresaData.dadosBancarios.tipoConta
            });
    }

    // ✅ Inserir produtos/serviços na nova tabela unificada
    if (data.id) {
        const produtosServicosData: any[] = [];

        // Suporte ao novo formato unificado
        if (empresaData.produtosServicos) {
            produtosServicosData.push(...empresaData.produtosServicos.map(item => ({
                empresa_id: data.id,
                nome: item.nome,
                descricao: item.descricao,
                valor: item.valor,
                tipo: item.tipo
            })));
        }

        // Suporte ao formato legado de produtos (strings)
        if (empresaData.produtos) {
            const produtos = Array.isArray(empresaData.produtos) ? empresaData.produtos : [];
            produtos.forEach(produto => {
                if (typeof produto === 'string') {
                    produtosServicosData.push({
                        empresa_id: data.id,
                        nome: produto,
                        tipo: 'produto' as const
                    });
                } else {
                    produtosServicosData.push({
                        empresa_id: data.id,
                        nome: produto.nome,
                        descricao: produto.descricao,
                        valor: produto.valor,
                        tipo: 'produto' as const
                    });
                }
            });
        }

        // Suporte ao formato legado de serviços (strings)
        if (empresaData.servicos) {
            const servicos = Array.isArray(empresaData.servicos) ? empresaData.servicos : [];
            servicos.forEach(servico => {
                if (typeof servico === 'string') {
                    produtosServicosData.push({
                        empresa_id: data.id,
                        nome: servico,
                        tipo: 'servico' as const
                    });
                } else {
                    produtosServicosData.push({
                        empresa_id: data.id,
                        nome: servico.nome,
                        descricao: servico.descricao,
                        valor: servico.valor,
                        tipo: 'servico' as const
                    });
                }
            });
        }

        // Inserir todos os produtos/serviços de uma vez
        if (produtosServicosData.length > 0) {
            await supabase.from('empresas_produtos').insert(produtosServicosData);
        }
    }

    // ✅ Inserir documentos se fornecidos
    if (empresaData.documentos && data.id) {
        for (const documento of empresaData.documentos) {
            if (documento.arquivo) {
                await uploadDocumento(data.id, documento.arquivo, documento.nomeDocumento, documento.dataExpiracao);
            }
        }
    }

    return data;
};

const getAllEmpresas = async () => {
    const { data, error } = await supabase
        .from('empresas')
        .select(`
            *,
            dados_bancarios(*),
            empresas_produtos(nome, tipo, descricao, valor),
            empresa_documentos(*)
        `);
    
    if (error) throw error;
    return data;
};

// Função unificada para buscar produtos de uma empresa
const getProdutosByEmpresaId = async (empresaId: string): Promise<EmpresaProduto[]> => {
    const { data, error } = await supabase
        .from('empresas_produtos')
        .select('*')
        .eq('empresa_id', empresaId)
        .eq('tipo', 'produto');
    
    if (error) throw error;
    return data || [];
};

// Função unificada para buscar serviços de uma empresa
const getServicosByEmpresaId = async (empresaId: string): Promise<EmpresaProduto[]> => {
    const { data, error } = await supabase
        .from('empresas_produtos')
        .select('*')
        .eq('empresa_id', empresaId)
        .eq('tipo', 'servico');
    
    if (error) throw error;
    return data || [];
};

// Nova função para buscar todos os produtos/serviços de uma empresa
const getProdutosServicosByEmpresaId = async (empresaId: string): Promise<EmpresaProduto[]> => {
    const { data, error } = await supabase
        .from('empresas_produtos')
        .select('*')
        .eq('empresa_id', empresaId);
    
    if (error) throw error;
    return data || [];
};

const getEmpresaById = async (id: string) => {
    const { data, error } = await supabase
        .from('empresas')
        .select(`
            *,
            dados_bancarios(
                agencia,
                numero_conta,
                nome_titular,
                banco,
                tipo_conta
            )
        `)
        .eq('id', id)
        .single();
    
    if (error) throw error;
    
    // Transformar dados bancários para estrutura flat
    const dadosBancarios = data.dados_bancarios?.[0];
    return {
        ...data,
        agencia: dadosBancarios?.agencia || '',
        numeroConta: dadosBancarios?.numero_conta || '',
        nomeTitular: dadosBancarios?.nome_titular || '',
        banco: dadosBancarios?.banco || '',
        tipoConta: dadosBancarios?.tipo_conta || ''
    };
};

// dentro de getEmpresaByCnpj
const getEmpresaByCnpj = async (cnpj: string) => {
    const clean = cnpj.replace(/\D/g, '');
  
    // tenta bater tanto com a forma limpa quanto com a mascarada
    const { data, error } = await supabase
      .from('empresas')
      .select(`
        *,
        dados_bancarios(
          agencia,
          numero_conta,
          nome_titular,
          banco,
          tipo_conta
        ),
        empresas_produtos(nome, tipo, descricao, valor),
        empresa_documentos(
          nome_documento,
          descricao,
          data_vencimento,
          status_documento
        )
      `)
      .or(`cnpj.eq.${clean},cnpj.eq.${cnpj}`)
      .maybeSingle();
  
    if (error) throw error;
    if (!data) return null;
  
    const dadosBancarios = data.dados_bancarios?.[0];
    return {
      ...data,
      agencia: dadosBancarios?.agencia || '',
      numeroConta: dadosBancarios?.numero_conta || '',
      nomeTitular: dadosBancarios?.nome_titular || '',
      banco: dadosBancarios?.banco || '',
      tipoConta: dadosBancarios?.tipo_conta || '',
      faturamento: data.faturamento ?? null,        // ajuste conforme onde de fato está
      capitalSocial: data.capitalSocial ?? null     // ajuste conforme onde de fato está
    };
  };

const updateEmpresa = async (id: string, empresaData: Partial<EmpresaInput>) => {
    const { data, error } = await supabase
        .from('empresas')
        .update({
            nome: empresaData.nome,
            cnpj: empresaData.cnpj,
            razao_social: empresaData.razaoSocial,
            email: empresaData.email,
            telefone: empresaData.telefone,
            cep: empresaData.CEP,
            cidade: empresaData.cidades,
            endereco: empresaData.endereco,
            descricao: empresaData.descricao,
            responsavel_legal: empresaData.responsavelLegal,
            raio_distancia: empresaData.raioDistancia,
            cidade_radar: empresaData.cidadeRadar,
            porte: empresaData.porte,
            updated_at: new Date().toISOString()
        })
        .eq('cnpj', id)
        .select()
        .single();

    if (error) throw error;

    // ✅ Atualizar produtos/serviços se fornecidos
    if (empresaData.produtosServicos && data.id) {
        // Primeiro, deletar produtos/serviços existentes
        await supabase
            .from('empresas_produtos')
            .delete()
            .eq('empresa_id', data.id);

        // Depois, inserir os novos produtos/serviços
        if (empresaData.produtosServicos.length > 0) {
            const produtosServicosData = empresaData.produtosServicos.map(item => ({
                empresa_id: data.id,
                nome: item.nome,
                descricao: item.descricao,
                valor: item.valor,
                tipo: item.tipo
            }));

            await supabase.from('empresas_produtos').insert(produtosServicosData);
        }
    }

    return data;
};

const deleteEmpresa = async (id: string) => {
    const { error } = await supabase
        .from('empresas')
        .delete()
        .eq('id', id);
    
    if (error) throw error;
    return { message: 'Empresa deletada com sucesso' };
};

// Funções para gerenciar documentos
const uploadDocumento = async (empresaId: string, file: Buffer | File, nomeDocumento: string, dataExpiracao?: string) => {
    console.log('🗂️ [REPO] Iniciando upload no repositório...');
    console.log('🗂️ [REPO] EmpresaId:', empresaId);
    console.log('🗂️ [REPO] Nome documento:', nomeDocumento);
    console.log('🗂️ [REPO] Data expiração:', dataExpiracao);
    console.log('🗂️ [REPO] Arquivo tipo:', file instanceof Buffer ? 'Buffer' : typeof file);
    console.log('🗂️ [REPO] Supabase URL:', supabaseUrl);
    console.log('🗂️ [REPO] Supabase Key existe:', !!supabaseKey);
    
    const fileName = `${empresaId}/${Date.now()}-${nomeDocumento}`;
    console.log('🗂️ [REPO] Nome do arquivo no storage:', fileName);
    
    // ✅ Verificar se o bucket existe
    console.log('🪣 [STORAGE] Verificando buckets disponíveis...');
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
    if (bucketsError) {
        console.error('❌ [STORAGE] Erro ao listar buckets:', bucketsError);
    } else {
        console.log('🪣 [STORAGE] Buckets disponíveis:', buckets?.map(b => b.name));
        
        // Verificar se o bucket empresa-documentos existe
        const bucketExists = buckets?.some(b => b.name === 'empresa-documentos');
        if (!bucketExists) {
            console.log('🪣 [STORAGE] Bucket empresa-documentos não existe, criando...');
            const { error: createBucketError } = await supabase.storage.createBucket('empresa-documentos', {
                public: false,
                fileSizeLimit: 10485760 // 10MB
            });
            if (createBucketError) {
                console.error('❌ [STORAGE] Erro ao criar bucket:', createBucketError);
                throw createBucketError;
            }
            console.log('✅ [STORAGE] Bucket empresa-documentos criado com sucesso!');
        } else {
            console.log('✅ [STORAGE] Bucket empresa-documentos já existe');
        }
    }
    
    // Upload para storage
    console.log('☁️ [STORAGE] Fazendo upload para Supabase Storage...');
    const { data: uploadData, error: uploadError } = await supabase.storage
        .from('empresa-documentos')
        .upload(fileName, file);

    if (uploadError) {
        console.error('❌ [STORAGE] Erro no upload:', uploadError);
        throw uploadError;
    }

    console.log('✅ [STORAGE] Upload realizado com sucesso:', uploadData);

    // Salvar referência na tabela
    console.log('💾 [DB] Salvando referência na tabela empresa_documentos...');
    const { data, error } = await supabase
        .from('empresa_documentos')
        .insert({
            empresa_id: empresaId,
            nome_documento: nomeDocumento,
            url_storage: uploadData.path,
            data_vencimento: dataExpiracao ? new Date(dataExpiracao).toISOString().split('T')[0] : null,
            status_documento: 'pendente'
        })
        .select()
        .single();

    if (error) {
        console.error('❌ [DB] Erro ao salvar na tabela:', error);
        throw error;
    }

    console.log('✅ [DB] Documento salvo na tabela com sucesso:', data);
    return data;
};

const getDocumentosByEmpresaId = async (empresaId: string) => {
    const { data, error } = await supabase
        .from('empresa_documentos')
        .select('*')
        .eq('empresa_id', empresaId);
    
    if (error) throw error;
    return data;
};

const deleteDocumento = async (documentoId: string) => {
    // Primeiro buscar o documento para pegar o path do storage
    const { data: documento, error: fetchError } = await supabase
        .from('empresa_documentos')
        .select('url_storage')
        .eq('id', documentoId)
        .single();

    if (fetchError) throw fetchError;

    // Deletar do storage
    const { error: storageError } = await supabase.storage
        .from('empresa-documentos')
        .remove([documento.url_storage]);

    if (storageError) throw storageError;

    // Deletar da tabela
    const { error } = await supabase
        .from('empresa_documentos')
        .delete()
        .eq('id', documentoId);
    
    if (error) throw error;
    return { message: 'Documento deletado com sucesso' };
};

const updateDadosBancarios = async (empresaId: string, dadosBancarios: any) => {
    // Verificar se já existe dados bancários para esta empresa
    const { data: existing } = await supabase
        .from('dados_bancarios')
        .select('id')
        .eq('empresa_id', empresaId)
        .single();

    if (existing) {
        // Atualizar dados existentes
        const { data, error } = await supabase
            .from('dados_bancarios')
            .update({
                banco: dadosBancarios.banco,
                agencia: dadosBancarios.agencia,
                numero_conta: dadosBancarios.numeroConta,
                nome_titular: dadosBancarios.nomeTitular,
                tipo_conta: dadosBancarios.tipoConta
            })
            .eq('empresa_id', empresaId)
            .select()
            .single();

        if (error) throw error;
        return data;
    } else {
        // Criar novos dados bancários
        const { data, error } = await supabase
            .from('dados_bancarios')
            .insert({
                empresa_id: empresaId,
                banco: dadosBancarios.banco,
                agencia: dadosBancarios.agencia,
                numero_conta: dadosBancarios.numeroConta,
                nome_titular: dadosBancarios.nomeTitular,
                tipo_conta: dadosBancarios.tipoConta
            })
            .select()
            .single();

        if (error) throw error;
        return data;
    }
};

const updateStatusDocumento = async (documentoId: string, novoStatus: string) => {
    const { data, error } = await supabase
        .from('empresa_documentos')
        .update({ 
            status_documento: novoStatus,
            updated_at: new Date().toISOString()
        })
        .eq('id', documentoId)
        .select()
        .single();

    if (error) throw error;
    return data;
};

// ✅ NOVA FUNÇÃO: Buscar contexto completo da empresa para agentes
const getEmpresaContextoCompleto = async (cnpj: string) => {
    const cleanCnpj = cnpj.replace(/\D/g, '');
    
    const { data, error } = await supabase
        .from('empresa_contexto_completo')
        .select('*')
        .or(`cnpj.eq.${cleanCnpj},cnpj.eq.${cnpj}`)
        .maybeSingle();
    
    if (error) {
        console.error('❌ [REPO] Erro ao buscar contexto da empresa:', error);
        throw error;
    }
    
    if (!data) {
        console.log(`⚠️ [REPO] Empresa não encontrada: ${cnpj}`);
        return null;
    }
    
    console.log(`✅ [REPO] Contexto completo encontrado para empresa: ${data.nome}`);
    
    // Transformar dados para formato esperado pelos agentes
    return {
        id: data.id,
        nome: data.nome,
        cnpj: data.cnpj,
        razaoSocial: data.razao_social,
        descricao: data.descricao,
        porte: data.porte,
        localizacao: {
            cidade: data.cidade,
            endereco: data.endereco,
            raioDistancia: data.raio_distancia
        },
        
        // Core Business
        palavrasChave: data.palavras_chave,
        produtoServico: data.produto_servico,
        produtos: data.produtos || [],
        servicos: data.servicos || [],
        
        // Dados Financeiros
        financeiro: {
            faturamento: data.faturamento,
            capitalSocial: data.capitalSocial,
            faturamentoMensal: data.faturamento_mensal,
            margemLucroMedia: data.margem_lucro_media,
            capitalGiroDisponivel: data.capital_giro_disponivel,
            experienciaLicitacoesAnos: data.experiencia_licitacoes_anos,
            numeroLicitacoesParticipadas: data.numero_licitacoes_participadas,
            numeroLicitacoesVencidas: data.numero_licitacoes_vencidas,
            capacidadeSeguroGarantia: data.capacidade_seguro_garantia
        },
        
        // Capacidades Técnicas/Operacionais
        capacidades: {
            capacidadeProducaoMensal: data.capacidade_producao_mensal,
            numeroFuncionarios: data.numero_funcionarios,
            certificacoes: data.certificacoes || [],
            alcanceGeografico: data.alcance_geografico || [],
            setoresExperiencia: data.setores_experiencia || [],
            tempoMercadoAnos: data.tempo_mercado_anos,
            prazoMinimoExecucao: data.prazo_minimo_execucao,
            prazoMaximoExecucao: data.prazo_maximo_execucao,
            capacidadeContratoSimultaneos: data.capacidade_contratos_simultaneos
        },
        
        // Situação Jurídica
        juridico: {
            situacaoReceitaFederal: data.situacao_receita_federal,
            certidoesStatus: data.certidoes_status || {},
            impedimentoLicitar: data.impedimento_licitar,
            atestadosCapacidadeTecnica: data.atestados_capacidade_tecnica || []
        },
        
        // Perfil Comercial
        comercial: {
            modalidadesPreferenciais: data.modalidades_preferenciais || [],
            margemCompetitiva: data.margem_competitiva,
            valorMinimoContrato: data.valor_minimo_contrato,
            valorMaximoContrato: data.valor_maximo_contrato,
            taxaSucessoLicitacoes: data.taxa_sucesso_licitacoes,
            orgaosParceiros: data.orgaos_parceiros || []
        }
    };
};

export default {
    createEmpresa,
    getAllEmpresas,
    getProdutosByEmpresaId,
    getServicosByEmpresaId,
    getProdutosServicosByEmpresaId,
    getEmpresaById,
    getEmpresaByCnpj,
    updateEmpresa,
    deleteEmpresa,
    uploadDocumento,
    getDocumentosByEmpresaId,
    deleteDocumento,
    updateDadosBancarios,
    updateStatusDocumento,
    getEmpresaContextoCompleto
};