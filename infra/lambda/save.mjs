// Save na nuvem do Aldoria: GET/PUT /save, um arquivo por usuário em saves/<sub>.json no bucket do site.
// O sub vem do JWT já validado pelo API Gateway (autorizador do Cognito).
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';

const s3 = new S3Client({});
const BUCKET = process.env.BUCKET;
const MAX_BYTES = 2 * 1024 * 1024;
const MAX_CHARS = 8, MAX_BANK = 400;

const res = (code, body) => ({ statusCode: code, headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });

async function read(key) {
  try {
    const r = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
    return JSON.parse(await r.Body.transformToString());
  } catch (e) {
    if (e.name === 'NoSuchKey' || e.$metadata?.httpStatusCode === 404) return null;
    throw e;
  }
}

// formato mínimo da conta do jogo (a checagem de trapaça fica para uma etapa futura)
function valid(d) {
  if (!d || typeof d !== 'object' || typeof d.name !== 'string' || !Array.isArray(d.chars) || d.chars.length > MAX_CHARS) return false;
  if (!d.bank || !Array.isArray(d.bank.items) || d.bank.items.length > MAX_BANK) return false;
  return d.chars.every(c => c && typeof c.id === 'string' && c.data && typeof c.data.cls === 'string');
}

export const handler = async (event) => {
  const sub = event.requestContext?.authorizer?.jwt?.claims?.sub;
  if (!sub || !/^[0-9a-f-]{36}$/i.test(sub)) return res(401, { erro: 'sem usuário' });
  const key = `saves/${sub}.json`;
  const method = event.requestContext.http.method;

  if (method === 'GET') {
    const cur = await read(key);
    return cur ? res(200, cur) : res(404, { erro: 'sem save' });
  }

  if (method === 'PUT') {
    const raw = event.isBase64Encoded ? Buffer.from(event.body || '', 'base64').toString('utf8') : (event.body || '');
    if (raw.length > MAX_BYTES) return res(413, { erro: 'save grande demais' });
    let req;
    try { req = JSON.parse(raw); } catch { return res(400, { erro: 'JSON inválido' }); }
    if (!valid(req.data)) return res(400, { erro: 'save inválido' });
    const cur = await read(key);
    // outro dispositivo salvou depois da última sincronização deste: devolve a versão da nuvem
    if (cur && !req.force && (req.baseT || 0) !== cur.t) return res(409, cur);
    const t = Math.max(Date.now(), (cur?.t || 0) + 1);
    await s3.send(new PutObjectCommand({ Bucket: BUCKET, Key: key, Body: JSON.stringify({ t, data: req.data }), ContentType: 'application/json' }));
    return res(200, { t });
  }

  return res(405, { erro: 'método não permitido' });
};
