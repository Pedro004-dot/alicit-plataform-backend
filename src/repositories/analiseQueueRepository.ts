import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

interface CriarAnaliseData {
  numeroControlePNCP: string;
  empresaCnpj: string;
}

interface AnaliseRecord {
  id: string;
  numero_controle_pncp: string;
  empresa_cnpj: string;
  status: string;
  timestamp: string;
  tempo_inicio?: string;
  tempo_fim?: string;
  erro_detalhes?: string;
  posicao_fila?: number;
}

const criar = async (data: CriarAnaliseData): Promise<AnaliseRecord> => {
  const { data: result, error } = await supabase
    .from('analises_queue')
    .insert({
      numero_controle_pncp: data.numeroControlePNCP,
      empresa_cnpj: data.empresaCnpj,
      status: 'pendente',
      timestamp: new Date().toISOString()
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Erro ao criar análise na fila: ${error.message}`);
  }

  return result;
};

const buscarPorNumeroControle = async (numeroControlePNCP: string): Promise<AnaliseRecord | null> => {
  const { data, error } = await supabase
    .from('analises_queue')
    .select('*')
    .eq('numero_controle_pncp', numeroControlePNCP)
    .order('timestamp', { ascending: false })
    .limit(1)
    .single();

  if (error && error.code !== 'PGRST116') {
    throw new Error(`Erro ao buscar análise: ${error.message}`);
  }

  return data;
};

const contarPorStatus = async (status: string): Promise<number> => {
  const { count, error } = await supabase
    .from('analises_queue')
    .select('id', { count: 'exact' })
    .eq('status', status);

  if (error) {
    throw new Error(`Erro ao contar análises por status: ${error.message}`);
  }

  return count || 0;
};

const buscarProximaPendente = async (): Promise<AnaliseRecord | null> => {
  const { data, error } = await supabase
    .from('analises_queue')
    .select('*')
    .eq('status', 'pendente')
    .order('timestamp', { ascending: true })
    .limit(1)
    .single();

  if (error && error.code !== 'PGRST116') {
    throw new Error(`Erro ao buscar próxima análise pendente: ${error.message}`);
  }

  return data;
};

const atualizarStatus = async (id: string, novoStatus: string): Promise<void> => {
  const updateData: any = { status: novoStatus };

  if (novoStatus === 'processando') {
    updateData.tempo_inicio = new Date().toISOString();
  } else if (novoStatus === 'concluida' || novoStatus === 'erro') {
    updateData.tempo_fim = new Date().toISOString();
  }

  const { error } = await supabase
    .from('analises_queue')
    .update(updateData)
    .eq('id', id);

  if (error) {
    throw new Error(`Erro ao atualizar status da análise: ${error.message}`);
  }
};

const salvarErro = async (id: string, erro: string): Promise<void> => {
  const { error } = await supabase
    .from('analises_queue')
    .update({
      status: 'erro',
      erro_detalhes: erro,
      tempo_fim: new Date().toISOString()
    })
    .eq('id', id);

  if (error) {
    throw new Error(`Erro ao salvar erro da análise: ${error.message}`);
  }
};

const calcularPosicaoFila = async (id: string): Promise<number> => {
  const { data: analise, error: analiseError } = await supabase
    .from('analises_queue')
    .select('timestamp')
    .eq('id', id)
    .single();

  if (analiseError) {
    throw new Error(`Erro ao buscar análise para calcular posição: ${analiseError.message}`);
  }

  const { count, error: countError } = await supabase
    .from('analises_queue')
    .select('id', { count: 'exact' })
    .eq('status', 'pendente')
    .lt('timestamp', analise.timestamp);

  if (countError) {
    throw new Error(`Erro ao calcular posição na fila: ${countError.message}`);
  }

  return (count || 0) + 1;
};

export default {
  criar,
  buscarPorNumeroControle,
  contarPorStatus,
  buscarProximaPendente,
  atualizarStatus,
  salvarErro,
  calcularPosicaoFila
};