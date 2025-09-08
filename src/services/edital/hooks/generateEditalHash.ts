import { createHash } from 'crypto';

export function generateEditalHash(empresaId?: string): string {
  // Gerar hash simples baseado no empresaId ou usar default
  const hashInput = empresaId || 'default-empresa';
  return createHash('sha256').update(hashInput).digest('hex').substring(0, 16);
}
