"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const pinecone_1 = require("@pinecone-database/pinecone");
const pg_1 = require("pg");
const pc = new pinecone_1.Pinecone({
    apiKey: process.env.PINECONE_API_KEY || ''
});
// Configuração do PostgreSQL
const pool = new pg_1.Pool({
    host: 'db.hdlowzlkwrboqfzjewom.supabase.co',
    port: 5432,
    database: 'postgres',
    user: 'postgres',
    password: process.env.SUPABASE_DB_PASSWORD || '',
    ssl: { rejectUnauthorized: false }
});
exports.default = pool;
