import createEmpresaService from "../../services/empresa/createEmpresaService";
const createEmpresa = async (req, res) => {
    try {
        const empresaInput = req.body;
        // ✅ Validação completa incluindo dados bancários
        if (!empresaInput.nome || !empresaInput.cnpj || !empresaInput.razaoSocial ||
            !empresaInput.endereco || !empresaInput.email || !empresaInput.telefone ||
            !empresaInput.CEP || !empresaInput.descricao || !empresaInput.palavrasChave ||
            !empresaInput.produtoServico || !empresaInput.dadosBancarios?.agencia ||
            !empresaInput.dadosBancarios?.numeroConta || !empresaInput.dadosBancarios?.nomeTitular) {
            return res.status(400).json({ error: "Dados obrigatórios não informados" });
        }
        // ✅ Extrair usuario_id do JWT (do middleware de autenticação)
        const usuario_id = req.user?.userId;
        if (!usuario_id) {
            return res.status(400).json({ error: "Usuário não autenticado" });
        }
        const search = await createEmpresaService.createEmpresa({ ...empresaInput, usuario_id: Number(usuario_id) });
        res.status(201).json(search);
        return search;
    }
    catch (error) {
        console.error("Erro ao criar empresa:", error);
        res.status(500).json({ error: error.message || "Erro ao criar empresa" });
    }
};
export default { createEmpresa };
