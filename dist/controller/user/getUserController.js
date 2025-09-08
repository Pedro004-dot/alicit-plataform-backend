import getUserService from "../../services/user/getUserService";
const getUser = async (req, res) => {
    try {
        const { id } = req.body;
        if (!id) {
            return res.status(400).json({ error: "ID não informado" });
        }
        const getUser = await getUserService.getUser(id);
        res.status(201).json(getUser);
        return getUser;
    }
    catch (error) {
        console.error("Erro ao buscar user:", error);
        res.status(500).json({ error: "Erro ao buscar user" });
    }
};
export default { getUser };
