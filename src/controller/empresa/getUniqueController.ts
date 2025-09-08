import { Request, Response } from "express";
import getUniqueEmpresaService from "../../services/empresa/getUniqueEmpresaService";


  
const getUniqueEmpresa = async (req: Request, res: Response) => {
  
  try {
    const {cnpj} = req.params;
    if(!cnpj) {
        return res.status(400).json({ error: "CNPJ não informado" });
    }
    const decodedCnpj = decodeURIComponent(cnpj);
    
    const getUniqueEmpresa = await getUniqueEmpresaService.getUniqueEmpresa(decodedCnpj);
    
    
    
   return res.status(200).json(getUniqueEmpresa); 
  } catch (error) {
    console.error("Erro ao buscar empresa:", error);
    res.status(500).json({ error: "Erro ao buscar empresa" });
  }
};

export default { getUniqueEmpresa };