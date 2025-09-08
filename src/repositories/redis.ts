// import { createClient } from 'redis';
// import * as fs from 'fs';
// import * as path from 'path';

// interface Municipio {
//   codigo_ibge: string;
//   nome: string;
//   latitude: number;
//   longitude: number;
//   capital: number;
//   codigo_uf: string;
//   siafi_id: string;
//   ddd: string;
//   fuso_horario: string;
// }

// interface PNCPItem {
//   numeroItem: number;
//   descricao: string;
//   materialOuServico: string;
//   materialOuServicoNome: string;
//   valorUnitarioEstimado: number;
//   valorTotal: number;
//   quantidade: number;
//   unidadeMedida: string;
//   orcamentoSigiloso: boolean;
//   itemCategoriaId: number;
//   itemCategoriaNome: string;
//   patrimonio: any;
//   codigoRegistroImobiliario: any;
//   criterioJulgamentoId: number;
//   criterioJulgamentoNome: string;
//   situacaoCompraItem: number;
//   situacaoCompraItemNome: string;
//   tipoBeneficio: number;
//   tipoBeneficioNome: string;
//   incentivoProdutivoBasico: boolean;
//   dataInclusao: string;
//   dataAtualizacao: string;
//   temResultado: boolean;
//   imagem: number;
//   aplicabilidadeMargemPreferenciaNormal: boolean;
//   aplicabilidadeMargemPreferenciaAdicional: boolean;
//   percentualMargemPreferenciaNormal: any;
//   percentualMargemPreferenciaAdicional: any;
//   ncmNbsCodigo: any;
//   ncmNbsDescricao: any;
//   catalogo: any;
//   categoriaItemCatalogo: any;
//   catalogoCodigoItem: any;
//   informacaoComplementar: any;
//   tipoMargemPreferencia: any;
//   exigenciaConteudoNacional: boolean;
// }

// interface PNCPLicitacao {
//   numeroControlePNCP: string;
//   dataAtualizacaoGlobal: string;
//   modalidadeId: number;
//   srp: boolean;
//   orgaoEntidade: {
//     cnpj: string;
//     razaoSocial: string;
//     poderId: string;
//     esferaId: string;
//   };
//   anoCompra: number;
//   sequencialCompra: number;
//   dataInclusao: string;
//   dataPublicacaoPncp: string;
//   dataAtualizacao: string;
//   numeroCompra: string;
//   unidadeOrgao: {
//     ufNome: string;
//     codigoIbge: string;
//     codigoUnidade: string;
//     nomeUnidade: string;
//     ufSigla: string;
//     municipioNome: string;
//   };
//   amparoLegal: {
//     descricao: string;
//     nome: string;
//     codigo: number;
//   };
//   dataAberturaProposta: string;
//   dataEncerramentoProposta: string;
//   informacaoComplementar: string;
//   processo: string;
//   objetoCompra: string;
//   linkSistemaOrigem: string;
//   justificativaPresencial: string | null;
//   unidadeSubRogada: any;
//   orgaoSubRogado: any;
//   valorTotalHomologado: number | null;
//   modoDisputaId: number;
//   linkProcessoEletronico: string | null;
//   valorTotalEstimado: number;
//   modalidadeNome: string;
//   modoDisputaNome: string;
//   tipoInstrumentoConvocatorioCodigo: number;
//   tipoInstrumentoConvocatorioNome: string;
//   fontesOrcamentarias: any[];
//   situacaoCompraId: number;
//   situacaoCompraNome: string;
//   usuarioNome: string;
//   itens: PNCPItem[];
// }

// const client = createClient({ url: 'redis://localhost:6379' });
// const TTL_SEMANA = 7 * 24 * 60 * 60;
// const TTL_ANO = 365 * 24 * 60 * 60; // 365 dias em segundos

// const connect = async () => {
//   if (!client.isOpen) {
//     await client.connect();
//   }
// };

// const saveLicitacoes = async (licitacoes: PNCPLicitacao[]): Promise<number> => {
//   try {
//     await connect();
//     const pipeline = client.multi();
    
//     for (const licitacao of licitacoes) {
//       const key = `licitacao:${licitacao.numeroControlePNCP}`;
//       pipeline.setEx(key, TTL_SEMANA, JSON.stringify(licitacao));
//     }
    
//     await pipeline.exec();
//     return licitacoes.length;
//   } catch (error) {
//     console.error('Erro ao salvar licitações:', error);
//     return 0;
//   }
// };

// const getLicitacao = async (numeroControlePNCP: string): Promise<PNCPLicitacao | null> => {
//   try {
//     await connect();
//     const key = `licitacao:${numeroControlePNCP}`;
//     const data = await client.get(key);
    
//     if (data) {
//       const licitacao = JSON.parse(data) as PNCPLicitacao;
//       console.log(`✅ Licitação encontrada: ${numeroControlePNCP} com ${licitacao.itens?.length || 0} itens`);
//       return licitacao;
//     }
    
//     console.log(`🔍 Licitação não encontrada: ${numeroControlePNCP}`);
//     return null;
//   } catch (error) {
//     console.error('Erro ao buscar licitação:', error);
//     return null;
//   }
// };

// // Cache Service - Otimização de performance para matching (mantido para compatibilidade)
// const textCache = new Map<string, string[]>();
// const scoreCache = new Map<string, number>();

// const clearTextCache = (): void => textCache.clear();
// const clearScoreCache = (): void => scoreCache.clear();
// const clearAllCaches = (): void => {
//   textCache.clear();
//   scoreCache.clear();
// };

// const getCachedText = (key: string): string[] | undefined => textCache.get(key);
// const setCachedText = (key: string, value: string[]): void => {
//   textCache.set(key, value);
// };

// const getCachedScore = (key: string): number | undefined => scoreCache.get(key);
// const setCachedScore = (key: string, value: number): void => {
//   scoreCache.set(key, value);
// };

// // Função para ler e parsear o arquivo CSV de municípios
// const readMunicipiosCSV = async (csvPath: string): Promise<Municipio[]> => {
//   try {
//     const csvContent = await fs.promises.readFile(csvPath, 'utf-8');
//     const lines = csvContent.split('\n');
//     const municipios: Municipio[] = [];

//     // Pula o cabeçalho (primeira linha)
//     for (let i = 1; i < lines.length; i++) {
//       const line = lines[i].trim();
//       if (line) {
//         const columns = line.split(',');
//         if (columns.length >= 9) {
//           const municipio: Municipio = {
//             codigo_ibge: columns[0],
//             nome: columns[1],
//             latitude: parseFloat(columns[2]),
//             longitude: parseFloat(columns[3]),
//             capital: parseInt(columns[4]),
//             codigo_uf: columns[5],
//             siafi_id: columns[6],
//             ddd: columns[7],
//             fuso_horario: columns[8]
//           };
//           municipios.push(municipio);
//         }
//       }
//     }

//     console.log(`📊 CSV carregado: ${municipios.length} municípios encontrados`);
//     return municipios;
//   } catch (error) {
//     console.error('❌ Erro ao ler arquivo CSV:', error);
//     throw error;
//   }
// };

// // Função para carregar municípios no Redis
// const loadMunicipiosToRedis = async (): Promise<number> => {
//   try {
//     await connect();
    
//     // Caminho para o arquivo CSV (assumindo que está na raiz do projeto)
//     const csvPath = path.join(__dirname, '../../../municipios.csv');
    
//     console.log('🔄 Iniciando carregamento de municípios...');
//     const municipios = await readMunicipiosCSV(csvPath);
    
//     const pipeline = client.multi();
    
//     for (const municipio of municipios) {
//       // Chave por código IBGE
//       const keyIbge = `municipio:ibge:${municipio.codigo_ibge}`;
//       pipeline.setEx(keyIbge, TTL_ANO, JSON.stringify(municipio));
      
//       // Chave por nome (para busca por nome)
//       const keyNome = `municipio:nome:${municipio.nome.toLowerCase().replace(/\s+/g, '_')}`;
//       pipeline.setEx(keyNome, TTL_ANO, JSON.stringify(municipio));
//     }
    
//     await pipeline.exec();
    
//     console.log(`✅ ${municipios.length} municípios carregados no Redis com TTL de 365 dias`);
//     return municipios.length;
//   } catch (error) {
//     console.error('❌ Erro ao carregar municípios no Redis:', error);
//     return 0;
//   }
// };

// // Função para buscar município por código IBGE
// const getMunicipioByIbge = async (codigoIbge: string): Promise<Municipio | null> => {
//   try {
//     await connect();
//     const key = `municipio:ibge:${codigoIbge}`;
//     const data = await client.get(key);
    
//     if (data) {
//       return JSON.parse(data) as Municipio;
//     }
    
//     return null;
//   } catch (error) {
//     console.error('❌ Erro ao buscar município por IBGE:', error);
//     return null;
//   }
// };

// // Função para buscar município por nome
// const getMunicipioByNome = async (nome: string): Promise<Municipio | null> => {
//   try {
//     await connect();
//     const key = `municipio:nome:${nome.toLowerCase().replace(/\s+/g, '_')}`;
//     const data = await client.get(key);
    
//     if (data) {
//       return JSON.parse(data) as Municipio;
//     }
    
//     return null;
//   } catch (error) {
//     console.error('❌ Erro ao buscar município por nome:', error);
//     return null;
//   }
// };

// // Função para verificar se os municípios já estão carregados
// const checkMunicipiosLoaded = async (): Promise<boolean> => {
//   try {
//     await connect();
//     const keys = await client.keys('municipio:ibge:*');
//     return keys.length > 0;
//   } catch (error) {
//     console.error('❌ Erro ao verificar municípios:', error);
//     return false;
//   }
// };

// export default { 
//   saveLicitacoes, 
//   getLicitacao, 
//   getCachedText, 
//   setCachedText, 
//   getCachedScore, 
//   setCachedScore, 
//   clearTextCache, 
//   clearScoreCache, 
//   clearAllCaches,
//   loadMunicipiosToRedis,
//   getMunicipioByIbge,
//   getMunicipioByNome,
//   checkMunicipiosLoaded
// };