import { Pinecone } from '@pinecone-database/pinecone';
import { Pool } from 'pg';
const pc = new Pinecone({
    apiKey: process.env.PINECONE_API_KEY || ''
});
// Configuração do PostgreSQL
const pool = new Pool({
    host: 'db.hdlowzlkwrboqfzjewom.supabase.co',
    port: 5432,
    database: 'postgres',
    user: 'postgres',
    password: process.env.SUPABASE_DB_PASSWORD || '',
    ssl: { rejectUnauthorized: false }
});
export default pool;
