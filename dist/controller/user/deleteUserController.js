import deleteUserService from "../../services/user/deleteUserService";
const deleteUser = async (req, res) => {
    try {
        const { id } = req.body;
        if (!id) {
            return res.status(400).json({ error: "ID não informado" });
        }
        const deleteUser = await deleteUserService.deleteUser(id);
        res.status(201).json(deleteUser);
        return deleteUser;
    }
    catch (error) {
        console.error("Erro ao deletar user:", error);
        res.status(500).json({ error: "Erro ao deletar user" });
    }
};
export default { deleteUser };
