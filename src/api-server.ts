import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { generateSoalTool } from './mcp/tools/generateSoal.js';

const app = express();
app.use(cors());
app.use(express.json());

app.post('/api/generate-soal', async (req, res) => {
  try {
    const result = await generateSoalTool(req.body);
    res.json(result);
  } catch (error: any) {
    console.error('Error generateSoal:', error.message);
    res.status(400).json({ error: error.message });
  }
});

// Health check, berguna untuk cek server aktif dari browser/HP
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

const PORT = Number(process.env.API_PORT) || 3000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`API server berjalan di http://0.0.0.0:${PORT}`);
});
