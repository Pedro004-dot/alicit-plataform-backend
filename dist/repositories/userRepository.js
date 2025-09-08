"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const supabase_js_1 = require("@supabase/supabase-js");
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = (0, supabase_js_1.createClient)(supabaseUrl, supabaseKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});
const createUser = async (userInput) => {
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
    if (error)
        throw error;
    return data;
};
const createUserEmpresaRelation = async (userId, empresaId) => {
    const { data, error } = await supabase
        .from('user_empresa')
        .insert({
        id_user: userId,
        id_empresa: empresaId
    })
        .select()
        .single();
    if (error)
        throw error;
    return data;
};
const getUser = async (id) => {
    const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id_user', id)
        .single();
    if (error)
        throw error;
    return data;
};
const getAllUser = async () => {
    const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('ativo', true);
    if (error)
        throw error;
    return data;
};
const updateUser = async (id, userInput) => {
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
    if (error)
        throw error;
    return data;
};
const deleteUser = async (id) => {
    const { data, error } = await supabase
        .from('users')
        .update({ ativo: false })
        .eq('id_user', id)
        .select()
        .single();
    if (error)
        throw error;
    return data;
};
exports.default = {
    createUser,
    createUserEmpresaRelation,
    getUser,
    getAllUser,
    updateUser,
    deleteUser
};
