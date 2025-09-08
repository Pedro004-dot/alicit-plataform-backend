"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EditalChatController = void 0;
const chatService_1 = require("../../services/edital/chatService");
class EditalChatController {
    constructor() {
        this.chatService = new chatService_1.EditalChatService();
    }
    async chat(req, res) {
        try {
            const { licitacaoId, query, empresa_id } = req.body;
            if (!licitacaoId || !query || !empresa_id) {
                res.status(400).json({ error: "Você deve mandar todas as informações necessarias para o chat, licitacaoId, query e empresa_id" });
                return;
            }
            const result = await this.chatService.chat(licitacaoId, query, empresa_id);
            res.json(result);
        }
        catch (error) {
            console.error(`❌ Erro no chat:`, error);
            res.status(500).json({ error: "Erro no chat" });
        }
    }
}
exports.EditalChatController = EditalChatController;
