import deleteEmpresaService from "../../services/empresa/deleteEmpresaService";
const deleteEmpresa = async (req, res) => {
    try {
        const { cnpj } = req.body;
        if (!cnpj) {
            return res.status(400).json({ error: "CNPJ não informado" });
        }
        const deleteEmpresa = await deleteEmpresaService.deleteEmpresa(cnpj);
        res.status(201).json(deleteEmpresa);
        return deleteEmpresa;
    }
    catch (error) {
        console.error("Erro ao deletar empresa:", error);
        res.status(500).json({ error: "Erro ao deletar empresa" });
    }
};
export default { deleteEmpresa };
