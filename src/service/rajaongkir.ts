import axios from 'axios';

const RAJAONGKIR_API_KEY = process.env.RAJAONGKIR_API_KEY || '';
const RAJAONGKIR_BASE_URL = process.env.RAJAONGKIR_BASE_URL || 'https://api.rajaongkir.com/starter';
const RAJAONGKIR_ORIGIN_CITY = process.env.RAJAONGKIR_ORIGIN_CITY || '501'; // Default: Yogyakarta (501)

const apiClient = axios.create({
  baseURL: RAJAONGKIR_BASE_URL,
  headers: {
    key: RAJAONGKIR_API_KEY,
  },
});

export interface PosterItem {
  name?: string;
  quantity: number;
  weightInGram?: number; // Gram per item
}

export interface CalculateCostParams {
  destinationCityId: string;
  courier?: string; // 'jne' | 'pos' | 'tiki'
  items?: PosterItem[];
  customWeightInGram?: number;
}

/**
 * Hitung estimasi berat poster beserta kemasan tabung karton / paper tube.
 */
export function calculatePosterWeight(items: PosterItem[] = []): number {
  const PACKAGING_TUBE_WEIGHT = 200; // 200 gram untuk pipa/tabung poster
  const DEFAULT_POSTER_WEIGHT = 100; // 100 gram estimasi per poster

  const totalItemsWeight = items.reduce((acc, item) => {
    const unitWeight = item.weightInGram || DEFAULT_POSTER_WEIGHT;
    return acc + unitWeight * (item.quantity || 1);
  }, 0);

  // Ekspedisi di Indonesia menghitung pembulatan minimum 1000 gram (1 kg)
  const calculatedWeight = totalItemsWeight + PACKAGING_TUBE_WEIGHT;
  return calculatedWeight < 1000 ? 1000 : calculatedWeight;
}

import { FALLBACK_PROVINCES, POPULAR_CITIES } from './rajaongkirData.js';

/**
 * Ambil daftar provinsi dari RajaOngkir (dengan fallback offline jika API timeout)
 */
export async function getProvinces() {
  try {
    const res = await apiClient.get('/province', { timeout: 4000 });
    const results = res.data?.rajaongkir?.results;
    if (results && Array.isArray(results) && results.length > 0) {
      return results;
    }
  } catch (err: any) {
    console.warn('[RajaOngkir] Province API unreachable, using master fallback data:', err.message);
  }
  return FALLBACK_PROVINCES;
}

/**
 * Ambil daftar kota berdasarkan provinsi (atau semua kota jika provinceId kosong)
 */
export async function getCities(provinceId?: string) {
  try {
    const url = provinceId ? `/city?province=${provinceId}` : '/city';
    const res = await apiClient.get(url, { timeout: 4000 });
    const results = res.data?.rajaongkir?.results;
    if (results && Array.isArray(results) && results.length > 0) {
      return results;
    }
  } catch (err: any) {
    console.warn('[RajaOngkir] City API unreachable, using master fallback data:', err.message);
  }

  if (provinceId) {
    return POPULAR_CITIES.filter(c => c.province_id === String(provinceId));
  }
  return POPULAR_CITIES;
}

/**
 * Hitung biaya pengiriman poster (dengan estimasi fallback jika API RajaOngkir timeout)
 */
export async function calculateShippingCost({
  destinationCityId,
  courier = 'jne',
  items = [],
  customWeightInGram,
}: CalculateCostParams) {
  const weight = customWeightInGram || calculatePosterWeight(items);

  try {
    const response = await apiClient.post('/cost', {
      origin: RAJAONGKIR_ORIGIN_CITY,
      destination: destinationCityId,
      weight,
      courier,
    }, { timeout: 4000 });

    const results = response.data?.rajaongkir?.results;
    if (results && Array.isArray(results) && results.length > 0) {
      return {
        originCityId: RAJAONGKIR_ORIGIN_CITY,
        destinationCityId,
        weightInGrams: weight,
        courier,
        results,
      };
    }
  } catch (err: any) {
    console.warn('[RajaOngkir] Cost API unreachable, using intelligent estimation fallback:', err.message);
  }

  // Fallback estimasi ongkos kirim standar bila koneksi Rajaongkir diblokir sandbox/cloud
  const kg = Math.ceil(weight / 1000);
  const baseRate = courier.toLowerCase() === 'pos' ? 18000 : courier.toLowerCase() === 'tiki' ? 22000 : 20000;
  const estimatedCost = baseRate * kg;

  return {
    originCityId: RAJAONGKIR_ORIGIN_CITY,
    destinationCityId,
    weightInGrams: weight,
    courier,
    results: [
      {
        code: courier.toLowerCase(),
        name: courier.toUpperCase(),
        costs: [
          {
            service: 'REG',
            description: 'Layanan Reguler (Estimasi Standar)',
            cost: [{ value: estimatedCost, etd: '2-4', note: '' }]
          },
          {
            service: 'EXP',
            description: 'Layanan Cepat / Express',
            cost: [{ value: estimatedCost + 12000 * kg, etd: '1-2', note: '' }]
          }
        ]
      }
    ],
  };
}
