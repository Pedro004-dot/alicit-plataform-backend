import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

interface User {
  id_user: number;
  nome: string;
  email: string;
  senha: string;
  telefone?: string;
  data_cadastro?: Date;
  ativo: boolean;
}

interface UserEmpresas {
  id_empresa: string;
  nome: string;
  cnpj: string;
}

export const findUserByEmail = async (email: string): Promise<User | null> => {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', email)
    .eq('ativo', true)
    .single();

  if (error) return null;
  return data;
};

export const getUserEmpresas = async (userId: number): Promise<UserEmpresas[]> => {
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

  if (error) return [];
  
  return data.map((item: any) => ({
    id_empresa: item.empresas.id,
    nome: item.empresas.nome,
    cnpj: item.empresas.cnpj
  }));
};