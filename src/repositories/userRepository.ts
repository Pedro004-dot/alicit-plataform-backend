import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const createUser = async (userInput: any) => {
    const { data, error } = await supabase
        .from('users')
        .insert({
            nome: userInput.nome,
            email: userInput.email,
            telefone: userInput.telefone,
            senha: userInput.senha,
            ativo: userInput.ativo ?? true
        })
        .select()
        .single();

    if (error) throw error;
    return data;
};

const createUserEmpresaRelation = async (userId: number, empresaId: string) => {
    const { data, error } = await supabase
        .from('user_empresa')
        .insert({
            id_user: userId,
            id_empresa: empresaId
        })
        .select()
        .single();

    if (error) throw error;
    return data;
};

const getUser = async (id: string) => {
    const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id_user', id)
        .single();

    if (error) throw error;
    return data;
};

const getAllUser = async () => {
    const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('ativo', true);

    if (error) throw error;
    return data;
};

const updateUser = async (id: string, userInput: any) => {
    const { data, error } = await supabase
        .from('users')
        .update({
            nome: userInput.nome,
            email: userInput.email,
            telefone: userInput.telefone,
            ativo: userInput.ativo
        })
        .eq('id_user', id)
        .select()
        .single();

    if (error) throw error;
    return data;
};

const deleteUser = async (id: string) => {
    const { data, error } = await supabase
        .from('users')
        .update({ ativo: false })
        .eq('id_user', id)
        .select()
        .single();

    if (error) throw error;
    return data;
};

export default {
    createUser,
    createUserEmpresaRelation,
    getUser,
    getAllUser,
    updateUser,
    deleteUser
};