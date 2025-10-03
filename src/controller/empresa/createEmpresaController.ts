import { Request, Response } from "express";
import createEmpresaService from "../../services/empresa/createEmpresaService";

export interface DocumentoInput {
    nomeDocumento: string;
    dataExpiracao: string;
    arquivo?: any;
}

export interface DadosBancariosInput {
    banco?: string;
    agencia: string; // ✅ Obrigatório
    numeroConta: string; // ✅ Obrigatório
    nomeTitular: string; // ✅ Obrigatório
    tipoConta?: string;
}

export interface ProdutoServicoInput {
    nome: string;
    descricao?: string;
    valor?: number;
    tipo: 'produto' | 'servico';
}

export interface EmpresaInput {
    nome: string;
    cnpj: string;
    email: string;
    telefone: string;
    CEP: string;
    endereco: string;
    descricao: string;
    razaoSocial: string;
    responsavelLegal?: string;
    documentos?: DocumentoInput[];
    produtos?: string[] | ProdutoServicoInput[];
    servicos?: string[] | ProdutoServicoInput[];
    produtosServicos?: ProdutoServicoInput[];
    cidades?: string;
    cidadeRadar?: string;
    dadosBancarios: DadosBancariosInput;
    raioDistancia?: number;
    porte?: string[];
}
  
const createEmpresa = async (req: Request, res: Response) => {
  
  try {
    const empresaInput: EmpresaInput = req.body;
    
    // ✅ Validação completa incluindo dados bancários
    if(!empresaInput.nome || !empresaInput.cnpj || !empresaInput.razaoSocial || 
       !empresaInput.endereco || !empresaInput.email || !empresaInput.telefone || 
       !empresaInput.CEP || !empresaInput.descricao || 
       !empresaInput.dadosBancarios?.agencia || 
       !empresaInput.dadosBancarios?.numeroConta || !empresaInput.dadosBancarios?.nomeTitular) {
        return res.status(400).json({ error: "Dados obrigatórios não informados" });
    }

    // ✅ Extrair usuario_id do JWT (do middleware de autenticação)
    const usuario_id = req.user?.userId;
    if(!usuario_id) {
        return res.status(400).json({ error: "Usuário não autenticado" });
    }

    const search = await createEmpresaService.createEmpresa({ ...empresaInput, usuario_id: Number(usuario_id) });
    
    res.status(201).json(search);
   return search;
  } catch (error: any) {
    console.error("Erro ao criar empresa:", error);
    res.status(500).json({ error: error.message || "Erro ao criar empresa" });
  }
};

export default { createEmpresa };