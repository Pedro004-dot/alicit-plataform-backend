import empresaRepository from '../../repositories/empresaRepository';
import userRepository from '../../repositories/userRepository';
import { EmpresaInput } from '../../controller/empresa/createEmpresaController';

const createEmpresa = async (empresaInput: EmpresaInput & { usuario_id: number }) => { 
    console.log(`Empresa ${empresaInput.nome}`);
    
    const empresa = await empresaRepository.createEmpresa(empresaInput);
    if(!empresa) {
        throw new Error('Erro ao criar empresa');
    }

    if (empresaInput.usuario_id) {
        await userRepository.createUserEmpresaRelation(empresaInput.usuario_id, empresa.id);
    }

    return empresa;
};
export default { createEmpresa };