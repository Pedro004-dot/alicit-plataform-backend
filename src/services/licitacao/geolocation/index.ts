// Exports centralizados da geolocation
export { Municipio, Coordenadas, FiltroGeografico } from './types';
export { getCoordenadasCidade, clearCoordenadasCache } from './coordenadasService';
export { calcularDistanciaHaversine, estaNoRaio } from './distanciaCalculator';
export { filterLicitacoesPorGeografia, clearCidadesRaioCache } from './geoFilter';
