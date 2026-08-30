import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { generateSoalTool } from './mcp/tools/generateSoal.js';
import { OAuth2Client } from 'google-auth-library';
import { google } from 'googleapis';

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

// Endpoint Animasi Matematika via Python Engine
app.post('/api/animate-math', async (req, res) => {
  try {
    const { spawn } = await import('child_process');
    const pythonProcess = spawn('python3', ['/root/vue-kim/src/agent/math_animator.py']);
    
    let output = '';
    let errorOutput = '';

    pythonProcess.stdout.on('data', (data) => {
      output += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    pythonProcess.on('close', (code) => {
      if (code === 0 && output) {
        try {
          const parsed = JSON.parse(output);
          return res.json(parsed);
        } catch (e) {
          return res.status(500).json({ error: 'Failed to parse python output' });
        }
      }
      res.status(500).json({ error: errorOutput || 'Python process exited with error' });
    });

    pythonProcess.stdin.write(JSON.stringify(req.body));
    pythonProcess.stdin.end();
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Health check, berguna untuk cek server aktif dari browser/HP
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// ==================== RAJAONGKIR SHIPPING ENDPOINTS ====================
import { getProvinces, getCities, calculateShippingCost } from './service/rajaongkir.js';

// Ambil daftar provinsi
app.get('/api/shipping/provinces', async (_req, res) => {
  try {
    const provinces = await getProvinces();
    res.json(provinces);
  } catch (err: any) {
    res.status(500).json({ error: err.response?.data || err.message });
  }
});

// Ambil daftar kota (bisa filter ?provinceId=...)
app.get('/api/shipping/cities', async (req, res) => {
  try {
    const provinceId = req.query.provinceId as string | undefined;
    const cities = await getCities(provinceId);
    res.json(cities);
  } catch (err: any) {
    res.status(500).json({ error: err.response?.data || err.message });
  }
});

// Hitung ongkir pesanan poster
app.post('/api/shipping/cost', async (req, res) => {
  try {
    const { destinationCityId, courier, items, customWeightInGram } = req.body;
    if (!destinationCityId) {
      return res.status(400).json({ error: 'destinationCityId wajib diisi' });
    }

    const result = await calculateShippingCost({
      destinationCityId,
      courier,
      items,
      customWeightInGram,
    });
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.response?.data || err.message });
  }
});
// =======================================================================

const oauth2Client = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

app.get('/api/auth/google', (_req, res) => {
  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/userinfo.profile', 'https://www.googleapis.com/auth/userinfo.email']
  });
  res.redirect(url);
});

app.get('/api/auth/google/callback', async (req, res) => {
  const { code } = req.query;
  if (!code) return res.status(400).send('No code');
  try {
    const { tokens } = await oauth2Client.getToken(code as string);
    oauth2Client.setCredentials(tokens);
    
    // Fetch user info
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client as any });
    const userInfo = await oauth2.userinfo.get();
    
    // TODO: Implement actual session management (e.g., JWT, session cookie)
    console.log('User logged in:', userInfo.data);
    
    // Redirect to frontend after success
    res.redirect(`${process.env.FRONTEND_URL}/dashboard`);
  } catch (e: any) {
    console.error('Auth error:', e);
    res.status(500).send('Auth failed: ' + e.message);
  }
});

const PORT = Number(process.env.PORT) || 5000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`API server berjalan di http://0.0.0.0:${PORT}`);
});
