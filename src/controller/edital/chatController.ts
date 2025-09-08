import { Request, Response } from "express";
import { EditalChatService } from "../../services/edital/chatService";

export class EditalChatController {
  private chatService: EditalChatService;

  constructor() {
    this.chatService = new EditalChatService();
  }

  async chat(req: Request, res: Response): Promise<void> {
    try {
      const { licitacaoId, query, empresa_id } = req.body;
      if (!licitacaoId || !query || !empresa_id) {
        res.status(400).json({ error: "Você deve mandar todas as informações necessarias para o chat, licitacaoId, query e empresa_id" });
        return;
      }
      const result = await this.chatService.chat(licitacaoId, query, empresa_id); 
      res.json(result);
    } catch (error: any) {
      console.error(`❌ Erro no chat:`, error);
      res.status(500).json({ error: "Erro no chat" });
    }
  }
}