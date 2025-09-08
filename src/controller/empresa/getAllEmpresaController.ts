import { Request, Response } from "express";
import getAllEmpresaService from "../../services/empresa/getAllEmpresaService";


  
const getAllEmpresa = async (req: Request, res: Response) => {
  
  try {
    const getAllEmpresa = await getAllEmpresaService.getAllEmpresa();
    
    res.status(201).json(getAllEmpresa);
   return getAllEmpresa; 
  } catch (error) {
    console.error("Erro ao buscar empresas:", error);
    res.status(500).json({ error: "Erro ao buscar empresas" });
  }
};

export default { getAllEmpresa };