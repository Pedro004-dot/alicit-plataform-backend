import createUserService from "../../services/user/createUserService";
const createUser = async (req, res) => {
    try {
        const { nome, email, senha } = req.body;
        if (!nome || !email || !senha) {
            return res.status(400).json({ error: "Nome, email e senha são obrigatórios" });
        }
        const createUser = await createUserService.createUser(req.body);
        res.status(201).json(createUser);
        return createUser;
    }
    catch (error) {
        console.error("Erro ao criar user:", error);
        res.status(500).json({ error: error.message || "Erro ao criar user" });
    }
};
export default { createUser };
