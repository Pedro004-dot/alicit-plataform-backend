import licitacaoEmpresaService from "../../services/licitacao/licitacaoEmpresaService";
const criar = async (req, res) => {
    try {
        const { cnpjEmpresa, numeroControlePNCP, status } = req.body;
        // Usar buscarOuCriar para evitar duplicatas
        let licitacao = await licitacaoEmpresaService.buscarOuCriar(numeroControlePNCP, cnpjEmpresa);
        // Se foi fornecido um status, atualizar
        if (status && status !== licitacao.status) {
            licitacao = await licitacaoEmpresaService.atualizarStatusPorChaves(numeroControlePNCP, cnpjEmpresa, status);
        }
        res.status(201).json(licitacao);
    }
    catch (error) {
        console.error("Erro ao criar licitacao_empresa:", error);
        res.status(500).json({ error: "Erro ao criar licitacao_empresa" });
    }
};
const atualizarStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        const licitacao = await licitacaoEmpresaService.atualizarStatus(Number(id), status);
        res.status(200).json(licitacao);
    }
    catch (error) {
        console.error("Erro ao atualizar status:", error);
        res.status(500).json({ error: "Erro ao atualizar status" });
    }
};
const listarTodas = async (req, res) => {
    try {
        const { cnpj } = req.params;
        const licitacoes = await licitacaoEmpresaService.listarPorEmpresa(cnpj);
        res.status(200).json(licitacoes);
    }
    catch (error) {
        console.error("Erro ao listar licitacoes:", error);
        res.status(500).json({ error: "Erro ao listar licitacoes" });
    }
};
const buscarUma = async (req, res) => {
    try {
        const { id } = req.params;
        const licitacao = await licitacaoEmpresaService.buscarPorId(Number(id));
        res.status(200).json(licitacao);
    }
    catch (error) {
        console.error("Erro ao buscar licitacao:", error);
        res.status(500).json({ error: "Erro ao buscar licitacao" });
    }
};
const atualizarStatusPorChaves = async (req, res) => {
    try {
        const { numeroControlePNCP, empresaCnpj, status } = req.body;
        const resultado = await licitacaoEmpresaService.atualizarStatusPorChaves(numeroControlePNCP, empresaCnpj, status);
        res.status(200).json(resultado);
    }
    catch (error) {
        console.error("Erro ao atualizar status por chaves:", error);
        res.status(500).json({ error: "Erro ao atualizar status" });
    }
};
const deletar = async (req, res) => {
    try {
        const { id } = req.params;
        await licitacaoEmpresaService.deletar(Number(id));
        res.status(204).send();
    }
    catch (error) {
        console.error("Erro ao deletar licitacao:", error);
        res.status(500).json({ error: "Erro ao deletar licitacao" });
    }
};
export default { criar, atualizarStatus, atualizarStatusPorChaves, listarTodas, buscarUma, deletar };
