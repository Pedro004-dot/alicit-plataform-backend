export const filtroValor = {
    nome: 'valor',
    prioridade: 2,
    estaAtivo: (perfil) => {
        return !!(perfil.valorMinimo || perfil.valorMaximo);
    },
    aplicar: async (licitacoes, perfil) => {
        return licitacoes.filter(licitacao => {
            const valor = licitacao.valorTotalEstimado;
            // Verifica valor mínimo
            if (perfil.valorMinimo && valor < perfil.valorMinimo) {
                return false;
            }
            // Verifica valor máximo  
            if (perfil.valorMaximo && valor > perfil.valorMaximo) {
                return false;
            }
            return true;
        });
    }
};
