import { spawn } from 'child_process';

console.log('🚀 Starting MCP server...');

// Jalankan server MCP
const server = spawn('npx', ['tsx', 'src/mcp/server.ts'], {
  stdio: ['pipe', 'pipe', 'pipe'],
  env: {
    ...process.env,
    VITE_GEMINI_API_KEY: process.env.VITE_GEMINI_API_KEY || 'dummy_key'
  }
});

// Tangkap stderr (log server)
server.stderr.on('data', (data) => {
  console.error('[SERVER LOG]', data.toString());
});

// Tangkap stdout (respons JSON-RPC)
server.stdout.on('data', (data) => {
  console.log('[SERVER RESPONSE]', data.toString());
  try {
    const json = JSON.parse(data.toString());
    console.log('[PARSED]', JSON.stringify(json, null, 2));
  } catch {
    // Bukan JSON, biarkan sebagai teks mentah
  }
});

// Kirim request tools/list setelah 2 detik
setTimeout(() => {
  console.log('\n📤 Sending tools/list request...');
  const request = {
    jsonrpc: '2.0',
    id: 1,
    method: 'tools/list',
    params: {}
  };
  server.stdin.write(JSON.stringify(request) + '\n');
}, 2000);

// Kirim request tools/call setelah 4 detik
setTimeout(() => {
  console.log('\n📤 Sending tools/call request...');
  const request = {
    jsonrpc: '2.0',
    id: 2,
    method: 'tools/call',
    params: {
      name: 'generateSoal',
      arguments: {
        mataPelajaran: 'Matematika',
        jumlahSoal: 2,
        tingkatKesulitan: 'sedang'
      }
    }
  };
  server.stdin.write(JSON.stringify(request) + '\n');
}, 4000);

// Tutup setelah 8 detik
setTimeout(() => {
  console.log('\n🛑 Stopping server...');
  server.kill();
}, 8000);

// Handle exit
server.on('close', (code) => {
  console.log(`\n✅ Server closed with code ${code}`);
});

// Handle error
server.on('error', (err) => {
  console.error('❌ Server error:', err);
});