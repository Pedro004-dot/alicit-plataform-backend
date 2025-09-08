export interface Municipio {
  codigo_ibge: string;
  nome: string;
  latitude: number;
  longitude: number;
  capital: number;
  codigo_uf: string;
  siafi_id: string;
  ddd: string;
  fuso_horario: string;
}

export interface Coordenadas {
  lat: number;
  lng: number;
}

export interface FiltroGeografico {
  cidadeRadar: string;
  raioRadar: number;
}
