import { createClient } from '@supabase/supabase-js';
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});
export const findUserByEmail = async (email) => {
    const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .eq('ativo', true)
        .single();
    if (error)
        return null;
    return data;
};
export const getUserEmpresas = async (userId) => {
    const { data, error } = await supabase
        .from('user_empresa')
        .select(`
      empresas!inner (
        id,
        nome,
        cnpj
      )
    `)
        .eq('id_user', userId);
    if (error)
        return [];
    return data.map((item) => ({
        id_empresa: item.empresas.id,
        nome: item.empresas.nome,
        cnpj: item.empresas.cnpj
    }));
};
