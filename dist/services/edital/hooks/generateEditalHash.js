"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateEditalHash = generateEditalHash;
const crypto_1 = require("crypto");
function generateEditalHash(empresaId) {
    // Gerar hash simples baseado no empresaId ou usar default
    const hashInput = empresaId || 'default-empresa';
    return (0, crypto_1.createHash)('sha256').update(hashInput).digest('hex').substring(0, 16);
}
