export interface Province {
  province_id: string;
  province: string;
}

export interface City {
  city_id: string;
  province_id: string;
  province: string;
  type: string;
  city_name: string;
  postal_code: string;
}

export const FALLBACK_PROVINCES: Province[] = [
  { province_id: "1", province: "Bali" },
  { province_id: "2", province: "Bangka Belitung" },
  { province_id: "3", province: "Banten" },
  { province_id: "4", province: "Bengkulu" },
  { province_id: "5", province: "DI Yogyakarta" },
  { province_id: "6", province: "DKI Jakarta" },
  { province_id: "7", province: "Gorontalo" },
  { province_id: "8", province: "Jambi" },
  { province_id: "9", province: "Jawa Barat" },
  { province_id: "10", province: "Jawa Tengah" },
  { province_id: "11", province: "Jawa Timur" },
  { province_id: "12", province: "Kalimantan Barat" },
  { province_id: "13", province: "Kalimantan Selatan" },
  { province_id: "14", province: "Kalimantan Tengah" },
  { province_id: "15", province: "Kalimantan Timur" },
  { province_id: "16", province: "Kalimantan Utara" },
  { province_id: "17", province: "Kepulauan Riau" },
  { province_id: "18", province: "Lampung" },
  { province_id: "19", province: "Maluku" },
  { province_id: "20", province: "Maluku Utara" },
  { province_id: "21", province: "Nanggroe Aceh Darussalam (NAD)" },
  { province_id: "22", province: "Nusa Tenggara Barat (NTB)" },
  { province_id: "23", province: "Nusa Tenggara Timur (NTT)" },
  { province_id: "24", province: "Papua" },
  { province_id: "25", province: "Papua Barat" },
  { province_id: "26", province: "Riau" },
  { province_id: "27", province: "Sulawesi Barat" },
  { province_id: "28", province: "Sulawesi Selatan" },
  { province_id: "29", province: "Sulawesi Tengah" },
  { province_id: "30", province: "Sulawesi Tenggara" },
  { province_id: "31", province: "Sulawesi Utara" },
  { province_id: "32", province: "Sumatera Barat" },
  { province_id: "33", province: "Sumatera Selatan" },
  { province_id: "34", province: "Sumatera Utara" }
];

export const POPULAR_CITIES: City[] = [
  // DKI Jakarta (6)
  { city_id: "151", province_id: "6", province: "DKI Jakarta", type: "Kota", city_name: "Jakarta Barat", postal_code: "11220" },
  { city_id: "152", province_id: "6", province: "DKI Jakarta", type: "Kota", city_name: "Jakarta Pusat", postal_code: "10110" },
  { city_id: "153", province_id: "6", province: "DKI Jakarta", type: "Kota", city_name: "Jakarta Selatan", postal_code: "12120" },
  { city_id: "154", province_id: "6", province: "DKI Jakarta", type: "Kota", city_name: "Jakarta Timur", postal_code: "13330" },
  { city_id: "155", province_id: "6", province: "DKI Jakarta", type: "Kota", city_name: "Jakarta Utara", postal_code: "14140" },

  // Jawa Barat (9)
  { city_id: "22", province_id: "9", province: "Jawa Barat", type: "Kota", city_name: "Bandung", postal_code: "40111" },
  { city_id: "23", province_id: "9", province: "Jawa Barat", type: "Kabupaten", city_name: "Bandung", postal_code: "40311" },
  { city_id: "54", province_id: "9", province: "Jawa Barat", type: "Kota", city_name: "Bekasi", postal_code: "17111" },
  { city_id: "55", province_id: "9", province: "Jawa Barat", type: "Kabupaten", city_name: "Bekasi", postal_code: "17530" },
  { city_id: "78", province_id: "9", province: "Jawa Barat", type: "Kota", city_name: "Bogor", postal_code: "16111" },
  { city_id: "79", province_id: "9", province: "Jawa Barat", type: "Kabupaten", city_name: "Bogor", postal_code: "16911" },
  { city_id: "115", province_id: "9", province: "Jawa Barat", type: "Kota", city_name: "Depok", postal_code: "16411" },
  { city_id: "468", province_id: "9", province: "Jawa Barat", type: "Kota", city_name: "Tasikmalaya", postal_code: "46111" },

  // Banten (3)
  { city_id: "455", province_id: "3", province: "Banten", type: "Kota", city_name: "Tangerang", postal_code: "15111" },
  { city_id: "456", province_id: "3", province: "Banten", type: "Kota", city_name: "Tangerang Selatan", postal_code: "15310" },
  { city_id: "457", province_id: "3", province: "Banten", type: "Kabupaten", city_name: "Tangerang", postal_code: "15710" },
  { city_id: "402", province_id: "3", province: "Banten", type: "Kota", city_name: "Serang", postal_code: "42111" },
  { city_id: "106", province_id: "3", province: "Banten", type: "Kota", city_name: "Cilegon", postal_code: "42411" },

  // Jawa Tengah (10)
  { city_id: "398", province_id: "10", province: "Jawa Tengah", type: "Kota", city_name: "Semarang", postal_code: "50135" },
  { city_id: "399", province_id: "10", province: "Jawa Tengah", type: "Kabupaten", city_name: "Semarang", postal_code: "50511" },
  { city_id: "444", province_id: "10", province: "Jawa Tengah", type: "Kota", city_name: "Surakarta (Solo)", postal_code: "57111" },
  { city_id: "74", province_id: "10", province: "Jawa Tengah", type: "Kabupaten", city_name: "Banyumas (Purwokerto)", postal_code: "53111" },
  { city_id: "249", province_id: "10", province: "Jawa Tengah", type: "Kota", city_name: "Magelang", postal_code: "56111" },

  // DI Yogyakarta (5)
  { city_id: "501", province_id: "5", province: "DI Yogyakarta", type: "Kota", city_name: "Yogyakarta", postal_code: "55111" },
  { city_id: "419", province_id: "5", province: "DI Yogyakarta", type: "Kabupaten", city_name: "Sleman", postal_code: "55511" },
  { city_id: "39", province_id: "5", province: "DI Yogyakarta", type: "Kabupaten", city_name: "Bantul", postal_code: "55711" },
  { city_id: "135", province_id: "5", province: "DI Yogyakarta", type: "Kabupaten", city_name: "Gunung Kidul", postal_code: "55811" },
  { city_id: "210", province_id: "5", province: "DI Yogyakarta", type: "Kabupaten", city_name: "Kulon Progo", postal_code: "55611" },

  // Jawa Timur (11)
  { city_id: "444", province_id: "11", province: "Jawa Timur", type: "Kota", city_name: "Surabaya", postal_code: "60119" },
  { city_id: "255", province_id: "11", province: "Jawa Timur", type: "Kota", city_name: "Malang", postal_code: "65111" },
  { city_id: "409", province_id: "11", province: "Jawa Timur", type: "Kabupaten", city_name: "Sidoarjo", postal_code: "61211" },
  { city_id: "133", province_id: "11", province: "Jawa Timur", type: "Kabupaten", city_name: "Gresik", postal_code: "61111" },
  { city_id: "178", province_id: "11", province: "Jawa Timur", type: "Kota", city_name: "Kediri", postal_code: "64111" },

  // Bali (1)
  { city_id: "114", province_id: "1", province: "Bali", type: "Kota", city_name: "Denpasar", postal_code: "80111" },
  { city_id: "17", province_id: "1", province: "Bali", type: "Kabupaten", city_name: "Badung", postal_code: "80351" },

  // Sumatera Utara (34)
  { city_id: "278", province_id: "34", province: "Sumatera Utara", type: "Kota", city_name: "Medan", postal_code: "20111" },

  // Sumatera Barat (32)
  { city_id: "318", province_id: "32", province: "Sumatera Barat", type: "Kota", city_name: "Padang", postal_code: "25111" },

  // Riau (26)
  { city_id: "350", province_id: "26", province: "Riau", type: "Kota", city_name: "Pekanbaru", postal_code: "28111" },

  // Sumatera Selatan (33)
  { city_id: "327", province_id: "33", province: "Sumatera Selatan", type: "Kota", city_name: "Palembang", postal_code: "30111" },

  // Lampung (18)
  { city_id: "21", province_id: "18", province: "Lampung", type: "Kota", city_name: "Bandar Lampung", postal_code: "35111" },

  // Sulawesi Selatan (28)
  { city_id: "254", province_id: "28", province: "Sulawesi Selatan", type: "Kota", city_name: "Makassar", postal_code: "90111" },

  // Kalimantan Timur (15)
  { city_id: "387", province_id: "15", province: "Kalimantan Timur", type: "Kota", city_name: "Samarinda", postal_code: "75111" },
  { city_id: "19", province_id: "15", province: "Kalimantan Timur", type: "Kota", city_name: "Balikpapan", postal_code: "76111" }
];
