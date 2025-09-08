import empresaRepository from '../../repositories/empresaRepository';
const getAllEmpresa = async () => {
    const empresas = await empresaRepository.getAllEmpresas();
    return empresas;
};
export default { getAllEmpresa };
