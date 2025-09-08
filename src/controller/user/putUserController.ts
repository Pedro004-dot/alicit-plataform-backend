import { Request, Response } from "express";
import putUserService from "../../services/user/putUserService";


  
const putUser = async (req: Request, res: Response) => {
  
  try {
    const {id} = req.body;
    if(!id) {
        return res.status(400).json({ error: "ID não informado" });
    }

    const putUser = await putUserService.putUser(id, req.body);
    
    res.status(201).json(putUser);
   return putUser; 
  } catch (error) {
    console.error("Erro ao atualizar user:", error);
    res.status(500).json({ error: "Erro ao atualizar user" });
  }
};

export default { putUser };