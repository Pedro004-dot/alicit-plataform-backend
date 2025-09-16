"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const supabase_js_1 = require("@supabase/supabase-js");
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
const supabase = (0, supabase_js_1.createClient)(supabaseUrl, supabaseKey);
const createEmpresa = async (empresaData) => {
    const { data, error } = await supabase
        .from('empresas')
        .insert({
        nome: empresaData.nome,
        cnpj: empresaData.cnpj,
        razao_social: empresaData.razaoSocial,
        email: empresaData.email,
        telefone: empresaData.telefone,
        cep: empresaData.CEP, // ✅ Usar CEP como está na interface
        cidade: empresaData.cidades, // ✅ Usar cidades como está na interface
        endereco: empresaData.endereco,
        descricao: empresaData.descricao,
        responsavel_legal: empresaData.responsavelLegal,
        raio_distancia: empresaData.raioDistancia,
        cidade_radar: empresaData.cidadeRadar,
        porte: empresaData.porte,
        palavras_chave: empresaData.palavrasChave,
        produto_servico: empresaData.produtoServico
    })
        .select()
        .single();
    if (error)
        throw error;
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
    // ✅ Inserir produtos se fornecidos
    if (empresaData.produtos && data.id) {
        const produtosData = empresaData.produtos.map(produto => ({
            empresa_id: data.id,
            produto
        }));
        await supabase.from('empresa_produtos').insert(produtosData);
    }
    // ✅ Inserir serviços se fornecidos
    if (empresaData.servicos && data.id) {
        const servicosData = empresaData.servicos.map(servico => ({
            empresa_id: data.id,
            servico
        }));
        await supabase.from('empresa_servicos').insert(servicosData);
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
            empresa_produtos(produto),
            empresa_servicos(servico),
            empresa_documentos(*)
        `);
    if (error)
        throw error;
    return data;
};
// Função para buscar produtos de uma empresa
const getProdutosByEmpresaId = async (empresaId) => {
    const { data, error } = await supabase
        .from('empresa_produtos')
        .select('produto')
        .eq('empresa_id', empresaId);
    if (error)
        throw error;
    return data;
};
// Função para buscar serviços de uma empresa
const getServicosByEmpresaId = async (empresaId) => {
    const { data, error } = await supabase
        .from('empresa_servicos')
        .select('servico')
        .eq('empresa_id', empresaId);
    if (error)
        throw error;
    return data;
};
const getEmpresaById = async (id) => {
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
    if (error)
        throw error;
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
const getEmpresaByCnpj = async (cnpj) => {
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
        empresa_produtos(produto),
        empresa_servicos(servico),
        empresa_documentos(
          nome_documento,
          descricao,
          data_vencimento,
          status_documento
        )
      `)
        .or(`cnpj.eq.${clean},cnpj.eq.${cnpj}`)
        .maybeSingle();
    if (error)
        throw error;
    if (!data)
        return null;
    const dadosBancarios = data.dados_bancarios?.[0];
    return {
        ...data,
        agencia: dadosBancarios?.agencia || '',
        numeroConta: dadosBancarios?.numero_conta || '',
        nomeTitular: dadosBancarios?.nome_titular || '',
        banco: dadosBancarios?.banco || '',
        tipoConta: dadosBancarios?.tipo_conta || '',
        faturamento: data.faturamento ?? null, // ajuste conforme onde de fato está
        capitalSocial: data.capitalSocial ?? null // ajuste conforme onde de fato está
    };
};
const updateEmpresa = async (id, empresaData) => {
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
        palavras_chave: empresaData.palavrasChave,
        produto_servico: empresaData.produtoServico,
        updated_at: new Date().toISOString()
    })
        .eq('cnpj', id)
        .select()
        .single();
    if (error)
        throw error;
    return data;
};
const deleteEmpresa = async (id) => {
    const { error } = await supabase
        .from('empresas')
        .delete()
        .eq('id', id);
    if (error)
        throw error;
    return { message: 'Empresa deletada com sucesso' };
};
// Funções para gerenciar documentos
const uploadDocumento = async (empresaId, file, nomeDocumento, dataExpiracao) => {
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
    }
    else {
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
        }
        else {
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
const getDocumentosByEmpresaId = async (empresaId) => {
    const { data, error } = await supabase
        .from('empresa_documentos')
        .select('*')
        .eq('empresa_id', empresaId);
    if (error)
        throw error;
    return data;
};
const deleteDocumento = async (documentoId) => {
    // Primeiro buscar o documento para pegar o path do storage
    const { data: documento, error: fetchError } = await supabase
        .from('empresa_documentos')
        .select('url_storage')
        .eq('id', documentoId)
        .single();
    if (fetchError)
        throw fetchError;
    // Deletar do storage
    const { error: storageError } = await supabase.storage
        .from('empresa-documentos')
        .remove([documento.url_storage]);
    if (storageError)
        throw storageError;
    // Deletar da tabela
    const { error } = await supabase
        .from('empresa_documentos')
        .delete()
        .eq('id', documentoId);
    if (error)
        throw error;
    return { message: 'Documento deletado com sucesso' };
};
const updateDadosBancarios = async (empresaId, dadosBancarios) => {
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
        if (error)
            throw error;
        return data;
    }
    else {
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
        if (error)
            throw error;
        return data;
    }
};
const updateStatusDocumento = async (documentoId, novoStatus) => {
    const { data, error } = await supabase
        .from('empresa_documentos')
        .update({
        status_documento: novoStatus,
        updated_at: new Date().toISOString()
    })
        .eq('id', documentoId)
        .select()
        .single();
    if (error)
        throw error;
    return data;
};
exports.default = {
    createEmpresa,
    getAllEmpresas,
    getProdutosByEmpresaId,
    getServicosByEmpresaId,
    getEmpresaById,
    getEmpresaByCnpj,
    updateEmpresa,
    deleteEmpresa,
    uploadDocumento,
    getDocumentosByEmpresaId,
    deleteDocumento,
    updateDadosBancarios,
    updateStatusDocumento
};
