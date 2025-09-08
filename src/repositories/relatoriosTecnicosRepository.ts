import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export interface RelatorioTecnico {
    id: string;
    licitacao_empresa_id: string;
    empresa_cnpj: string;
    numero_controle_pncp: string;
    url_storage: string;
    nome_arquivo: string;
    status_relatorio: string;
    metadados: any;
    created_at: string;
    updated_at: string;
}

export interface CreateRelatorioInput {
    licitacao_empresa_id: string;
    empresa_cnpj: string;
    numero_controle_pncp: string;
    tipo_relatorio?: string;
    url_storage: string;
    nome_arquivo: string;
    path_storage?: string;
    status_relatorio?: string;
    metadados?: any;
    dados_pdf?: any;
}

const createRelatorio = async (relatorioData: CreateRelatorioInput): Promise<RelatorioTecnico> => {
    const { data, error } = await supabase
        .from('relatorios_tecnicos')
        .insert({
            licitacao_empresa_id: relatorioData.licitacao_empresa_id,
            empresa_cnpj: relatorioData.empresa_cnpj,
            numero_controle_pncp: relatorioData.numero_controle_pncp,
            url_storage: relatorioData.url_storage,
            nome_arquivo: relatorioData.nome_arquivo,
            status_relatorio: relatorioData.status_relatorio || 'gerado',
            metadados: relatorioData.metadados || {},
            dados_pdf: relatorioData.dados_pdf || {},
            updated_at: new Date().toISOString()
        })
        .select()
        .single();

    if (error) throw error;
    return data;
};

const getRelatoriosByEmpresa = async (empresaCNPJ: string): Promise<RelatorioTecnico[]> => {
    const { data, error } = await supabase
        .from('relatorios_tecnicos')
        .select('*')
        .eq('empresa_cnpj', empresaCNPJ)
        .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
};

const getRelatorioByEmpresaAndPNCP = async (
    empresaCNPJ: string, 
    numeroControlePNCP: string
): Promise<RelatorioTecnico | null> => {
    const { data, error } = await supabase
        .from('relatorios_tecnicos')
        .select('*')
        .eq('empresa_cnpj', empresaCNPJ)
        .eq('numero_controle_pncp', numeroControlePNCP)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    return data || null;
};

const getRelatorioById = async (id: string): Promise<RelatorioTecnico | null> => {
    const { data, error } = await supabase
        .from('relatorios_tecnicos')
        .select('*')
        .eq('id', id)
        .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    return data || null;
};

const getRelatoriosByTipo = async (empresaCNPJ: string, numeroControlePNCP: string, tipo: string): Promise<RelatorioTecnico[]> => {
    const { data, error } = await supabase
        .from('relatorios_tecnicos')
        .select('*')
        .eq('empresa_cnpj', empresaCNPJ)
        .eq('numero_controle_pncp', numeroControlePNCP)
        .eq('tipo_relatorio', tipo)
        .order('created_at', { ascending: false });

    if (error) {
        throw new Error(`Erro ao buscar relatórios por tipo: ${error.message}`);
    }

    return data || [];
};

const relatorioExiste = async (
    empresaCNPJ: string, 
    numeroControlePNCP: string
): Promise<boolean> => {
    const { count, error } = await supabase
        .from('relatorios_tecnicos')
        .select('id', { count: 'exact', head: true })
        .eq('empresa_cnpj', empresaCNPJ)
        .eq('numero_controle_pncp', numeroControlePNCP);
    
    if (error) throw error;
    return (count || 0) > 0;
};

const deleteRelatorio = async (id: string): Promise<void> => {
    const { error } = await supabase
        .from('relatorios_tecnicos')
        .delete()
        .eq('id', id);
    
    if (error) throw error;
};

const uploadRelatorioToStorage = async (
    empresaCNPJ: string,
    numeroControlePNCP: string,
    nomeArquivo: string,
    buffer: Buffer
): Promise<string> => {
    const fileName = `${empresaCNPJ}/${numeroControlePNCP}/${Date.now()}-${nomeArquivo}`;
    
    const { data: uploadData, error: uploadError } = await supabase.storage
        .from('relatorios-tecnicos')
        .upload(fileName, buffer, {
            contentType: 'application/pdf',
            upsert: false
        });

    if (uploadError) throw uploadError;
    return uploadData.path;
};

const downloadRelatorioFromStorage = async (urlStorage: string): Promise<Buffer> => {
    const { data, error } = await supabase.storage
        .from('relatorios-tecnicos')
        .download(urlStorage);

    if (error) throw error;
    return Buffer.from(await data.arrayBuffer());
};

const generateSignedUrl = async (urlStorage: string, expiresIn: number = 3600): Promise<string> => {
    const { data, error } = await supabase.storage
        .from('relatorios-tecnicos')
        .createSignedUrl(urlStorage, expiresIn);

    if (error) throw error;
    return data.signedUrl;
};

const updateStatus = async (id: string, status: string): Promise<void> => {
    const { error } = await supabase
        .from('relatorios_tecnicos')
        .update({ 
            status_relatorio: status,
            updated_at: new Date().toISOString()
        })
        .eq('id', id);
    
    if (error) throw error;
};

export default {
    createRelatorio,
    getRelatoriosByEmpresa,
    getRelatorioByEmpresaAndPNCP,
    getRelatorioById,
    getRelatoriosByTipo,
    relatorioExiste,
    deleteRelatorio,
    uploadRelatorioToStorage,
    downloadRelatorioFromStorage,
    generateSignedUrl,
    updateStatus
};