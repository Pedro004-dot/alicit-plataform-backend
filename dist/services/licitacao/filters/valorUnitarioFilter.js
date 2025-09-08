"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.filtroValorUnitario = void 0;
exports.filtroValorUnitario = {
    nome: 'valor_unitario',
    prioridade: 4,
    estaAtivo: (perfil) => {
        return !!(perfil.valorMinimoUnitario || perfil.valorMaximoUnitario);
    },
    aplicar: async (licitacoes, perfil) => {
        return licitacoes.filter(licitacao => {
            // Uma licitação passa no filtro se pelo menos um item estiver DENTRO da faixa
            return licitacao.itens.some(item => {
                const valorUnitario = item.valorUnitarioEstimado;
                // Item deve estar dentro de AMBOS os limites (se especificados)
                const dentroDoMinimo = !perfil.valorMinimoUnitario || valorUnitario >= perfil.valorMinimoUnitario;
                const dentroDoMaximo = !perfil.valorMaximoUnitario || valorUnitario <= perfil.valorMaximoUnitario;
                return dentroDoMinimo && dentroDoMaximo;
            });
        });
    }
};
