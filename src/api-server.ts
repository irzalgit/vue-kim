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

// Health check, berguna untuk cek server aktif dari browser/HP
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

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
