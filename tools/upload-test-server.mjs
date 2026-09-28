// Local target for the plugin's HTTP upload pipeline (debug/testing only).
//
//   npm run upload-test-server            -> answers 200 (batch acknowledged)
//   STATUS=503 npm run upload-test-server -> retryable failure (batch stays queued)
//   STATUS=400 npm run upload-test-server -> permanent failure (batch dropped)
//
// Android emulator URL: http://10.0.2.2:3000/positions   (cleartext allowed in debug builds only)
// iOS simulator URL:    http://localhost:3000/positions
// Physical device:      http://<your-mac-LAN-IP>:3000/positions  (or use an HTTPS tunnel)
import { createServer } from 'node:http';

const PORT = Number(process.env.PORT ?? 3000);
const STATUS = Number(process.env.STATUS ?? 200);
const seen = new Map(); // device -> Set of position ids (server-side dedupe by id, as the docs advise)

createServer((request, response) => {
  if (request.method !== 'POST') {
    response.writeHead(405).end();
    return;
  }
  let body = '';
  request.on('data', (chunk) => (body += chunk));
  request.on('end', () => {
    try {
      const { positions = [], extras = {} } = JSON.parse(body);
      const device = String(extras.device ?? 'unknown');
      const ids = seen.get(device) ?? new Set();
      const fresh = positions.filter((p) => !ids.has(p.id));
      fresh.forEach((p) => ids.add(p.id));
      seen.set(device, ids);
      console.log(
        `[${new Date().toISOString()}] ${request.headers.authorization ? 'auth ✓' : 'no auth'} ` +
          `device=${device} batch=${positions.length} new=${fresh.length} total=${ids.size} -> ${STATUS}`,
      );
      fresh.forEach((p) => console.log(`   #${p.id} ${p.latitude},${p.longitude} ±${p.accuracy}m`));
    } catch {
      console.log('Invalid JSON body');
    }
    response.writeHead(STATUS).end();
  });
}).listen(PORT, () => console.log(`Upload test server on http://0.0.0.0:${PORT} (responding ${STATUS})`));
