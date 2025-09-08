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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const openai_1 = __importDefault(require("openai"));
const dotenv = __importStar(require("dotenv"));
dotenv.config();
async function testApiKey() {
    console.log('🔑 Testando API Key...');
    console.log('API Key length:', process.env.OPENAI_API_KEY?.length || 0);
    console.log('API Key preview:', process.env.OPENAI_API_KEY?.substring(0, 20) + '...');
    const client = new openai_1.default({
        apiKey: process.env.OPENAI_API_KEY,
    });
    try {
        const response = await client.embeddings.create({
            model: 'text-embedding-3-small',
            input: ['Teste simples'],
            encoding_format: 'float',
        });
        console.log('✅ API Key funcionando! Embedding gerado com', response.data[0].embedding.length, 'dimensões');
    }
    catch (error) {
        console.error('❌ Erro na API Key:', error.message);
    }
}
testApiKey().catch(console.error);
