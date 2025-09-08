
import empresaRepository from '../../repositories/empresaRepository';

const getUniqueEmpresa = async (id: string) => { 
    const empresa = await empresaRepository.getEmpresaById(id);
    return empresa;
};

export default { getUniqueEmpresa };