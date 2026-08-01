import { z } from 'zod';
import { generateSoalAdaptif } from '../../agent/generateSoal';

const GenerateSoalSchema = z.object({
  mataPelajaran: z.string().min(1, "Mata pelajaran wajib diisi"),
  jumlahSoal: z.number().int().min(1).max(20).default(5),
  tingkatKesulitan: z.enum(['mudah', 'sedang', 'sulit']).optional(), // tidak digunakan langsung, bisa diabaikan
  kelasTarget: z.number().optional(),
  modeFilter: z.enum(['hanya', 'sampai']).optional(),
  selectedModel: z.string().optional(),
  bloomTarget: z.string().optional(),
  fokusTopik: z.array(z.string()).optional(),
  riwayatPertanyaan: z.array(z.string()).optional(),
});


export async function generateSoalTool(input: unknown) {
  const parsed = GenerateSoalSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(`Invalid input: ${parsed.error.message}`);
  }

  const params = parsed.data;

  // Parameter statistikElemenTerakhir: default {}
  const result = await generateSoalAdaptif(
    params.mataPelajaran,
    params.jumlahSoal,
    {}, // statistikElemenTerakhir
    params.kelasTarget,
    params.modeFilter,
    params.selectedModel,
    params.bloomTarget,
    params.fokusTopik,
    params.riwayatPertanyaan
  );

  return result;
}

export const generateSoalToolDefinition = {
  name: 'generateSoal',
  description: 'Menghasilkan soal secara adaptif berdasarkan mata pelajaran, jumlah, dan parameter lainnya.',
  inputSchema: {
    type: 'object',
    properties: {
      mataPelajaran: { type: 'string', description: 'Nama mata pelajaran' },
      jumlahSoal: { type: 'integer', minimum: 1, maximum: 20, default: 5, description: 'Jumlah soal' },
      kelasTarget: { type: 'integer', description: 'Target kelas (opsional)' },
      modeFilter: { type: 'string', enum: ['hanya', 'sampai'], description: 'Mode filter' },
      selectedModel: { type: 'string', description: 'Model AI yang dipilih' },
      bloomTarget: { type: 'string', description: 'Target taksonomi Bloom' },
      fokusTopik: { type: 'array', items: { type: 'string' }, description: 'Topik yang difokuskan' },
      riwayatPertanyaan: { type: 'array', items: { type: 'string' }, description: 'Riwayat pertanyaan sebelumnya' }
    },
    required: ['mataPelajaran']
  }
};
