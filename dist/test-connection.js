"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const supabase_js_1 = require("@supabase/supabase-js");
const dotenv = __importStar(require("dotenv"));
// Carregar variáveis de ambiente
dotenv.config();
console.log('🔍 Testando conexão Supabase...');
console.log('SUPABASE_URL:', process.env.SUPABASE_URL ? 'DEFINIDA' : 'NÃO DEFINIDA');
console.log('SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'DEFINIDA' : 'NÃO DEFINIDA');
console.log('SUPABASE_ANON_KEY:', process.env.SUPABASE_ANON_KEY ? 'DEFINIDA' : 'NÃO DEFINIDA');
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
console.log('🔑 Usando chave:', supabaseKey.substring(0, 20) + '...');
const supabase = (0, supabase_js_1.createClient)(supabaseUrl, supabaseKey);
async function testConnection() {
    try {
        console.log('📊 Testando SELECT na tabela users...');
        const { data: selectData, error: selectError } = await supabase
            .from('users')
            .select('*')
            .limit(1);
        if (selectError) {
            console.error('❌ Erro no SELECT:', selectError);
        }
        else {
            console.log('✅ SELECT funcionou:', selectData);
        }
        console.log('➕ Testando INSERT na tabela users...');
        const { data: insertData, error: insertError } = await supabase
            .from('users')
            .insert({
            nome: 'Teste Conexão',
            email: 'teste.conexao@teste.com',
            telefone: '11888888888',
            senha: 'senha123',
            ativo: true
        })
            .select()
            .single();
        if (insertError) {
            console.error('❌ Erro no INSERT:', insertError);
        }
        else {
            console.log('✅ INSERT funcionou:', insertData);
        }
    }
    catch (error) {
        console.error('💥 Erro geral:', error);
    }
}
testConnection();
