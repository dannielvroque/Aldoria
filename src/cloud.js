'use strict';
/* ===== Aldoria — save na nuvem (cloud.js) =====
   Login por e-mail e senha no Cognito (API JSON por fetch, sem SDK) e save pela API em infra/cloud.tf.
   CLOUD_CFG é injetado pelo build.py a partir de cloud.json (raiz do repositório); sem ele o recurso fica oculto e o jogo segue 100% offline. */
const Cloud = (() => {
  const CFG = (typeof CLOUD_CFG !== 'undefined' && CLOUD_CFG && CLOUD_CFG.api && CLOUD_CFG.cid) ? CLOUD_CFG : null;
  const KEY = 'aldoria_cloud_v1';
  let S = null; // sessão: { email, refresh, id, exp }
  try { S = JSON.parse(localStorage.getItem(KEY)); } catch (e) { S = null; }
  if (!S || !S.refresh) S = null;
  const persist = () => { try { if (S) localStorage.setItem(KEY, JSON.stringify(S)); else localStorage.removeItem(KEY); } catch (e) { /* ignora */ } };

  const MSG = {
    UsernameExistsException: 'Já existe uma conta com esse e-mail. Use Entrar.',
    InvalidPasswordException: 'Senha fraca: use 8 ou mais caracteres, com letras minúsculas e números.',
    InvalidParameterException: 'Dados inválidos. Confira o e-mail e a senha (mínimo 8 caracteres).',
    NotAuthorizedException: 'E-mail ou senha incorretos.',
    UserNotFoundException: 'E-mail ou senha incorretos.',
    UserNotConfirmedException: 'Conta ainda não confirmada. Digite o código enviado ao seu e-mail.',
    CodeMismatchException: 'Código incorreto.',
    ExpiredCodeException: 'Código expirado. Peça um novo.',
    LimitExceededException: 'Muitas tentativas. Aguarde um pouco e tente de novo.',
    TooManyRequestsException: 'Muitas tentativas. Aguarde um pouco e tente de novo.',
    TooManyFailedAttemptsException: 'Muitas tentativas. Aguarde um pouco e tente de novo.',
  };
  const fail = (code, msg) => { const e = new Error(MSG[code] || msg || 'Falha de conexão. Tente de novo.'); e.code = code; return e; };

  async function idp(target, body) {
    let r;
    try { r = await fetch('https://cognito-idp.' + CFG.region + '.amazonaws.com/', { method: 'POST', headers: { 'Content-Type': 'application/x-amz-json-1.1', 'X-Amz-Target': 'AWSCognitoIdentityProviderService.' + target }, body: JSON.stringify(body) }); }
    catch (e) { throw fail('net'); }
    let j = {}; try { j = await r.json(); } catch (e) { /* corpo vazio */ }
    if (!r.ok) throw fail(String(j.__type || '').split('#').pop(), j.message);
    return j;
  }
  const tokens = (email, a) => { S = { email, refresh: a.RefreshToken || (S && S.refresh), id: a.IdToken, exp: Date.now() + (a.ExpiresIn || 3600) * 1000 - 60000 }; persist(); };

  async function token() {
    if (!S) throw fail('nosession', 'Sem login.');
    if (S.id && Date.now() < S.exp) return S.id;
    try { const j = await idp('InitiateAuth', { ClientId: CFG.cid, AuthFlow: 'REFRESH_TOKEN_AUTH', AuthParameters: { REFRESH_TOKEN: S.refresh } }); tokens(S.email, j.AuthenticationResult); return S.id; }
    catch (e) { if (e.code === 'NotAuthorizedException') { S = null; persist(); e.message = 'Sessão expirada. Entre de novo.'; } throw e; }
  }
  async function api(method, body) {
    const t = await token(); let r;
    try { r = await fetch(CFG.api + '/save', { method, headers: { Authorization: 'Bearer ' + t, 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined }); }
    catch (e) { throw fail('net'); }
    let j = {}; try { j = await r.json(); } catch (e) { /* corpo vazio */ }
    return { status: r.status, body: j };
  }
  const norm = e => String(e || '').trim().toLowerCase();

  return {
    available: !!CFG,
    email: () => S ? S.email : null,
    signUp: (email, pw) => idp('SignUp', { ClientId: CFG.cid, Username: norm(email), Password: pw, UserAttributes: [{ Name: 'email', Value: norm(email) }] }),
    confirm: (email, code) => idp('ConfirmSignUp', { ClientId: CFG.cid, Username: norm(email), ConfirmationCode: String(code).trim() }),
    resend: email => idp('ResendConfirmationCode', { ClientId: CFG.cid, Username: norm(email) }),
    forgot: email => idp('ForgotPassword', { ClientId: CFG.cid, Username: norm(email) }),
    reset: (email, code, pw) => idp('ConfirmForgotPassword', { ClientId: CFG.cid, Username: norm(email), ConfirmationCode: String(code).trim(), Password: pw }),
    async login(email, pw) {
      const j = await idp('InitiateAuth', { ClientId: CFG.cid, AuthFlow: 'USER_PASSWORD_AUTH', AuthParameters: { USERNAME: norm(email), PASSWORD: pw } });
      if (!j.AuthenticationResult) throw fail('challenge', 'Não foi possível entrar.');
      tokens(norm(email), j.AuthenticationResult);
    },
    logout() { S = null; persist(); },
    /* { t, data } da nuvem, ou null se ainda não há save */
    async get() { const r = await api('GET'); if (r.status === 404) return null; if (r.status !== 200) throw fail('api', 'Falha ao ler o save da nuvem (' + r.status + ').'); return r.body; },
    /* { ok:true, t } ou { ok:false, cloud } em conflito (outro dispositivo salvou depois) */
    async put(data, baseT, force) {
      const r = await api('PUT', { data, baseT: baseT || 0, force: !!force });
      if (r.status === 200) return { ok: true, t: r.body.t };
      if (r.status === 409) return { ok: false, cloud: r.body };
      throw fail('api', r.status === 413 ? 'Save grande demais para a nuvem.' : 'Falha ao gravar na nuvem (' + r.status + ').');
    },
  };
})();
