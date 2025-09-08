"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const supabase_1 = require("../config/supabase");
class UsuarioRepository {
    async getEmpresaAtiva(userId) {
        const { data, error } = await supabase_1.supabase
            .from('user_empresa_ativa')
            .select(`
        empresa_cnpj,
        empresas(
          cnpj,
          nome,
          id
        )
      `)
            .eq('id_user', userId)
            .single();
        if (error && error.code !== 'PGRST116') {
            throw new Error(`Erro ao buscar empresa ativa: ${error.message}`);
        }
        return data ? {
            cnpj: data.empresa_cnpj,
            nome: data.empresas?.[0]?.nome || '',
            id: data.empresas?.[0]?.id || ''
        } : null;
    }
    async setEmpresaAtiva(userId, empresaCnpj) {
        const { error } = await supabase_1.supabase
            .from('user_empresa_ativa')
            .upsert({
            id_user: userId,
            empresa_cnpj: empresaCnpj,
            updated_at: new Date().toISOString()
        });
        if (error) {
            throw new Error(`Erro ao definir empresa ativa: ${error.message}`);
        }
    }
    async getEmpresasDoUsuario(userId) {
        const { data, error } = await supabase_1.supabase
            .from('user_empresa')
            .select(`
        empresas(
          cnpj,
          nome,
          id
        )
      `)
            .eq('id_user', userId);
        if (error) {
            throw new Error(`Erro ao buscar empresas do usuário: ${error.message}`);
        }
        return data?.map(item => ({
            cnpj: item.empresas?.[0]?.cnpj || '',
            nome: item.empresas?.[0]?.nome || '',
            id: item.empresas?.[0]?.id || ''
        })) || [];
    }
}
exports.default = new UsuarioRepository();
