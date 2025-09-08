import { loginService } from '../../services/auth/loginService';
export const loginController = async (req, res) => {
    try {
        const { email, senha } = req.body;
        if (!email || !senha) {
            return res.status(400).json({ error: 'Email e senha são obrigatórios' });
        }
        const result = await loginService(email, senha);
        return res.status(200).json(result);
    }
    catch (error) {
        return res.status(401).json({ error: error.message });
    }
};
