import jwt from 'jsonwebtoken';
export const authMiddleware = (req, res, next) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    console.log('🔍 AuthMiddleware - Token recebido:', token ? 'Sim' : 'Não');
    console.log('🔍 AuthMiddleware - JWT_SECRET configurado:', process.env.JWT_SECRET ? 'Sim' : 'Não');
    if (!token) {
        console.log('❌ Token não fornecido');
        return res.status(401).json({ error: 'Token não fornecido' });
    }
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
        console.log('✅ Token decodificado:', decoded);
        req.user = decoded;
        next();
    }
    catch (error) {
        console.log('❌ Erro ao verificar token:', error);
        return res.status(401).json({ error: 'Token inválido' });
    }
};
// ✅ Função adminOnly removida - role não está mais no JWT
