"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loginController = void 0;
const loginService_js_1 = require("../../services/auth/loginService.js");
const loginController = async (req, res) => {
    try {
        const { email, senha } = req.body;
        if (!email || !senha) {
            return res.status(400).json({ error: 'Email e senha são obrigatórios' });
        }
        const result = await (0, loginService_js_1.loginService)(email, senha);
        return res.status(200).json(result);
    }
    catch (error) {
        return res.status(401).json({ error: error.message });
    }
};
exports.loginController = loginController;
