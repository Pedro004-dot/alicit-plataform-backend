"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.estaNoRaio = exports.calcularDistanciaHaversine = void 0;
/**
 * Calcula distância entre duas coordenadas usando fórmula Haversine
 * @param coord1 - Coordenadas do ponto 1
 * @param coord2 - Coordenadas do ponto 2
 * @returns Distância em quilômetros
 */
const calcularDistanciaHaversine = (coord1, coord2) => {
    const R = 6371; // Raio da Terra em km
    const dLat = (coord2.lat - coord1.lat) * Math.PI / 180;
    const dLng = (coord2.lng - coord1.lng) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(coord1.lat * Math.PI / 180) * Math.cos(coord2.lat * Math.PI / 180) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};
exports.calcularDistanciaHaversine = calcularDistanciaHaversine;
/**
 * Verifica se uma coordenada está dentro do raio especificado
 * @param coordenadas1 - Coordenadas do centro
 * @param coordenadas2 - Coordenadas do ponto a verificar
 * @param raio - Raio em quilômetros
 * @returns True se estiver dentro do raio
 */
const estaNoRaio = (coordenadas1, coordenadas2, raio) => {
    const distancia = (0, exports.calcularDistanciaHaversine)(coordenadas1, coordenadas2);
    return distancia <= raio;
};
exports.estaNoRaio = estaNoRaio;
