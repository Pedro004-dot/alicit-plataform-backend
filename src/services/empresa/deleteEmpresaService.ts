
import empresaRepository from '../../repositories/empresaRepository';

const deleteEmpresa = async (id: string) => { 
    const result = await empresaRepository.deleteEmpresa(id);
    return result;
};

export default { deleteEmpresa };