import getAllUserService from "../../services/user/getAllUserService";
const getAllUser = async (req, res) => {
    try {
        const getAllUser = await getAllUserService.getAllUser();
        res.status(201).json(getAllUser);
        return getAllUser;
    }
    catch (error) {
        console.error("Erro ao buscar users:", error);
        res.status(500).json({ error: "Erro ao buscar users" });
    }
};
export default { getAllUser };
