// ==========================================================
// TRUCO ONLINE BRASIL — lógica do jogo, bots, online e interface
// ==========================================================
const RANKS = ["4", "5", "6", "7", "Q", "J", "K", "A", "2", "3"],
  SUITS = ["♣", "♥", "♠", "♦"],
  V = [1, 3, 6, 9, 12],
  LN = ["", "TRUCO", "SEIS", "NOVE", "DOZE"];
const BN = [
  "LAVINIO",
  "LAVINETE",
  "PUFF",
  "BARBOSA DISCO VOADOR",
  "TIA DA CANTINA",
  "RIQUINHO",
  "DJEGO",
  "BARBARA DO RH",
];
// Manilha = carta seguinte à vira na ordem 4,5,6,7,Q,J,K,A,2,3 (depois do 3 volta ao 4).
const manilhaRank = (vira) => RANKS[(RANKS.indexOf(vira.r) + 1) % RANKS.length];
// Força: cartas comuns 1..10; manilhas 11..14 (naipes: ♦ < ♠ < ♥ < ♣).
const SUIT_POWER = { "♦": 11, "♠": 12, "♥": 13, "♣": 14 };
const pw = (c) =>
  S && S.vira && c.r == manilhaRank(S.vira) ? SUIT_POWER[c.s] : RANKS.indexOf(c.r) + 1;
const tm = (s) => s % 2,
  esc = (s) =>
    String(s).replace(
      /[&<>"']/g,
      (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
    );
let view = "home",
  n = 4,
  nick = "MARRECO",
  code = "",
  S = null,
  seats = [],
  me = 0,
  room = null,
  R = null,
  isHost = false,
  tmr = null,
  ID = Math.random().toString(36).slice(2, 9),
  jt = null;
// ---------- gritos de zueira (aparecem grandes no meio da tela) ----------
const CALLS = {
  1: ["TRUCO, LADRÃO!", "É TRUCO, MARRECO!", "Qual o nome do Jogo? E TRUCOOO rato!!!"],
  2: ["SEIS, RATO!", "SEISSSS SEU BOIOLA"],
  3: ["NOVEEEE!!", "È NOVEEEE"],
  4: ["SÓ JOGO VALENDO DOZE", "DOZE ENTÃO SEU LIXO"],
};
const pick = (a) => a[(Math.random() * a.length) | 0];
const shout = (t) => {
  S.shout = { t, id: (S.shout ? S.shout.id : 0) + 1 };
};
let lastShout = 0;
function showShout(t) {
  const e = document.getElementById("shout");
  if (!e) return;
  e.textContent = t;
  e.classList.remove("go");
  void e.offsetWidth; // reinicia a animação
  e.classList.add("go");
}
// ---------- motor do jogo ----------
const nm = (s) => S.seats[s].name,
  say = (m) => (S.msg = m);
const actor = () =>
  S.phase == "play" ? S.turn : S.phase == "resp" || S.phase == "onze" ? S.resp : -1;
function respSeat(t) {
  const c = [];
  for (let s = t; s < S.n; s += 2) c.push(s);
  return c.find((s) => !S.seats[s].bot) ?? c[0];
}
function deal() {
  const d = [];
  for (const r of RANKS) for (const s of SUITS) d.push({ r, s });
  for (let i = d.length - 1; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0;
    [d[i], d[j]] = [d[j], d[i]];
  }
  S.hands = [];
  for (let i = 0; i < S.n; i++) S.hands.push(d.splice(0, 3));
  S.vira = d.pop(); // a vira fica virada no meio da mesa
  Object.assign(S, {
    table: [],
    res: [],
    val: 1,
    lvl: 0,
    blk: -1,
    pend: null,
    nr: false,
    onze: -1,
    ferro: false,
    phase: "play",
  });
  S.dealer = (S.dealer + 1) % S.n;
  S.lead0 = (S.dealer + 1) % S.n;
  S.turn = S.lead0;
  const a = S.score[0] == 11,
    b = S.score[1] == 11;
  if (a && b) {
    S.ferro = S.nr = true;
    say("Mão de 11! Cartas às cegas, vale 1 ponto.");
  } else if (a || b) {
    S.onze = a ? 0 : 1;
    S.nr = true;
    S.val = 3;
    S.phase = "onze";
    S.resp = respSeat(S.onze);
    say("Mão de onze! Time de " + nm(S.onze) + " decide: jogar valendo 3 ou correr.");
  } else say("Nova mão — " + nm(S.turn) + " começa.");
}
function ask(t, l, seat) {
  S.pend = { t, l };
  S.resp = respSeat(1 - t);
  S.phase = "resp";
  say(nm(seat) + ": " + LN[l] + "!");
  shout(pick(CALLS[l]));
}
function round() {
  const m = Math.max(...S.table.map((x) => pw(x.c))),
    top = S.table.filter((x) => pw(x.c) == m),
    ts = new Set(top.map((x) => tm(x.s)));
  let w = -1;
  if (ts.size == 1) {
    w = [...ts][0];
    S.nextLead = top[0].s;
  } else S.nextLead = S.table[0].s;
  S.res.push(w);
  S.phase = "pause";
  say(w < 0 ? "Amarrou! Empatou a rodada." : "Rodada pro time de " + nm(top[0].s));
  if (w < 0) shout("Amarrou! ");
}
function decide() {
  const r = S.res,
    c = [0, 0];
  r.forEach((x) => x >= 0 && c[x]++);
  if (c[0] >= 2) return 0;
  if (c[1] >= 2) return 1;
  if (r.length >= 2) {
    if (r[0] < 0 && r[1] >= 0) return r[1];
    if (r[0] >= 0 && r[1] < 0) return r[0];
  }
  if (r.length == 3) {
    if (c[0] != c[1]) return c[0] > c[1] ? 0 : 1;
    return r[0] >= 0 ? r[0] : tm(S.lead0);
  }
  return -1;
}
function endHand(t, p) {
  S.score[t] += p;
  S.phase = "hend";
  say("Time de " + nm(t) + " levou " + p + " ponto" + (p > 1 ? "s" : "") + "!");
  if (S.score[t] >= 12) {
    S.phase = "end";
    S.win = t;
  }
}
function cont() {
  const w = decide();
  if (w >= 0) return endHand(w, S.val);
  S.table = [];
  S.turn = S.nextLead;
  S.phase = "play";
}
function apply(seat, a, i) {
  const P = S.phase;
  if (a == "play" && P == "play" && S.turn == seat && Number.isInteger(i)) {
    const h = S.hands[seat];
    if (!h[i]) return;
    const c = h.splice(i, 1)[0];
    S.table.push({ s: seat, c });
    say(nm(seat) + " jogou");
    if (S.table.length == S.n) round();
    else S.turn = (seat + 1) % S.n;
  } else if (
    a == "truco" &&
    P == "play" &&
    S.turn == seat &&
    !S.nr &&
    S.lvl < 4 &&
    tm(seat) != S.blk
  )
    ask(tm(seat), S.lvl + 1, seat);
  else if (P == "resp" && seat == S.resp) {
    const p = S.pend;
    if (a == "accept") {
      S.lvl = p.l;
      S.val = V[p.l];
      S.blk = p.t;
      S.pend = null;
      S.phase = "play";
      say(nm(seat) + " aceitou! Vale " + S.val + ".");
      shout("Desce! ");
    } else if (a == "run") {
      say(nm(seat) + " correu!");
      shout("CORREU! FRANGO");
      endHand(p.t, V[p.l - 1]);
    } else if (a == "raise" && p.l < 4) ask(tm(seat), p.l + 1, seat);
  } else if (P == "onze" && seat == S.resp) {
    if (a == "accept") {
      S.phase = "play";
      say("Vamos jogar valendo 3!");
    } else if (a == "run") {
      say(nm(seat) + " correu da mão de onze.");
      endHand(1 - S.onze, 1);
    }
  }
}
// ---------- bots ----------
function bot() {
  const s = actor();
  if (s < 0 || !S.seats[s].bot) return null;
  const P = S.phase,
    h = S.hands[s],
    t = tm(s),
    ps = h.map(pw),
    avg = ps.reduce((a, b) => a + b, 0) / (ps.length || 1),
    r = Math.random();
  const won = S.res.filter((x) => x == t).length,
    lost = S.res.filter((x) => x == 1 - t).length;
  if (P == "onze") return [s, avg > 6.2 || r < 0.35 ? "accept" : "run"];
  if (P == "resp") {
    const l = S.pend.l,
      th = 6.3 + l * 0.7 - (won ? 1.5 : 0) + (lost ? 1.5 : 0);
    if (l < 4 && avg > th + 2.5 && r < 0.4) return [s, "raise"];
    return [s, avg > th || r < 0.12 ? "accept" : "run"];
  }
  const m = ps.filter((x) => x >= 11).length;
  if (
    !S.nr &&
    S.lvl < 4 &&
    t != S.blk &&
    r < 0.35 &&
    (m >= 2 || (m >= 1 && avg > 7) || Math.random() < 0.05)
  )
    return [s, "truco"];
  const o = h.map((_, i) => i).sort((a, b) => ps[a] - ps[b]);
  let k;
  if (!S.table.length) k = S.res.length == 0 && o.length > 2 ? o[1] : o[o.length - 1];
  else {
    const bt = S.table.reduce((b, x) => (pw(x.c) > pw(b.c) ? x : b));
    k = tm(bt.s) == t ? o[0] : (o.find((i) => ps[i] > pw(bt.c)) ?? o[0]);
  }
  return [s, "play", k];
}
function sched() {
  clearTimeout(tmr);
  if (!isHost || !S) return;
  const P = S.phase;
  let d = 0,
    f = null;
  if (P == "pause") {
    d = 1500;
    f = cont;
  } else if (P == "hend") {
    d = 2600;
    f = deal;
  } else {
    const b = bot();
    if (b) {
      d = 900 + Math.random() * 900;
      f = () => apply(...b);
    }
  }
  if (f)
    tmr = setTimeout(() => {
      f();
      sync();
    }, d);
}
function sync() {
  render();
  if (isHost && R && S) R.emit("state", S);
  sched();
}
function act(a, i) {
  if (isHost) {
    apply(me, a, i);
    sync();
  } else R && R.emit("act", { id: ID, a, i });
}
// ---------- fluxo / online ----------
// Mensagens de erro do online (net aparece na tela)
let net = "";
const ERR = {
  not_permitted:
    "Sua conta não tem permissão pra mexer nas salas. Peça pro dono do site te liberar como colaborador.",
  not_granted: "Você precisa estar logado no Claude pra jogar online (link público não conecta).",
  limit_reached: "Salas lotadas agora. Tenta de novo daqui a pouco.",
  upstream_error: "A conexão falhou. Tenta de novo.",
  invalid_argument: "Código de sala inválido.",
  no_room: "Não achei essa sala. Confere o código com o anfitrião.",
  timeout: "A conexão demorou demais. Confere sua internet (e se o site está em https).",
  no_net:
    "Online indisponível aqui. Hospede os arquivos (GitHub Pages ou Netlify) pra jogar por código.",
};
const netErr = (e) => (net = ERR[e && e.code] || "Não rolou conectar. Tenta de novo.");
// IMPORTANTE: nome de sala só aceita letras minúsculas, números, _ . -
const roomName = () => "truco-" + code.toLowerCase();
const mkSeats = () =>
  Array.from({ length: n }, (_, i) =>
    i
      ? { name: BN[i - 1], bot: true, id: null }
      : { name: nick.trim() || "Jogador", bot: false, id: ID },
  );
function startGame() {
  if (!isHost) return;
  if (!S) seats = seats.slice();
  S = { n: seats.length, seats, score: [0, 0], dealer: seats.length - 2 };
  lastShout = 0;
  me = seats.findIndex((s) => s.id == ID);
  deal();
  view = "game";
  sync();
}
function local() {
  isHost = true;
  R = null;
  S = null;
  net = "";
  seats = mkSeats();
  startGame();
}
// anfitrião reenvia o estado (eventos não são guardados pela sala)
const push = () => {
  if (isHost && R) R.emit(S ? "state" : "lobby", S || { seats }).catch(() => {});
};
function wire() {
  R.on(
    "lobby",
    (m) => {
      if (isHost || !m.data || !Array.isArray(m.data.seats)) return;
      seats = m.data.seats.slice(0, 6);
      n = seats.length;
      clearInterval(jt);
      if (view != "game") view = "room";
      render();
    },
    (e) => {
      netErr(e);
      render();
    },
  );
  R.on("state", (m) => {
    if (isHost || !m.data || !m.data.seats) return;
    const s = m.data.seats.findIndex((x) => x.id == ID);
    if (s < 0) {
      net = "A partida já começou sem você ";
      return render();
    }
    S = m.data;
    me = s;
    clearInterval(jt);
    view = "game";
    render();
  });
  R.on("join", (m) => {
    const d = m.data;
    if (!isHost || S || !d || !d.id) return;
    if (!seats.some((s) => s.id == d.id)) {
      const i = seats.findIndex((s) => s.bot);
      if (i >= 0)
        seats[i] = { name: String(d.name || "Jogador").slice(0, 14), bot: false, id: String(d.id) };
    }
    push();
    render();
  });
  R.on("act", (m) => {
    const d = m.data;
    if (!isHost || !S || !d) return;
    const s = S.seats.findIndex((x) => x.id == d.id && !x.bot);
    if (s >= 0) {
      apply(s, String(d.a), d.i);
      sync();
    }
  });
  // alguém entrou na sala -> reenvia o estado pra ele
  R.onPeers((c) => {
    if (c.joined.some((p) => !p.isMe)) push();
  });
  R.onConnection(() => render());
}
// ---------- conexão por CÓDIGO (WebRTC via PeerJS, sem login e sem servidor seu) ----------
// O anfitrião vira um "peer" com id fixo derivado do código; os convidados conectam nele.
// Se o PeerJS não estiver disponível (ex.: dentro do Claude), usa as salas do Claude como plano B.
const PID = (c) => "trucobr-" + c.toLowerCase();
const canOnline = () => typeof Peer !== "undefined" || !!room;
function makeAdapter() {
  const h = {},
    conns = new Set(),
    peerH = [],
    connH = [];
  let peer = null,
    up = false;
  return {
    emit: (t, d) => {
      conns.forEach((c) => c.open && c.send({ t, d }));
      return Promise.resolve();
    },
    on: (t, f) => {
      (h[t] = h[t] || []).push(f);
      return () => {};
    },
    onPeers: (f) => peerH.push(f),
    onConnection: (f) => connH.push(f),
    connected: () => up,
    leave: () => {
      try {
        peer && peer.destroy();
      } catch (e) {}
      return Promise.resolve();
    },
    _h: h,
    _conns: conns,
    _peerH: peerH,
    setPeer: (p) => (peer = p),
    setUp: (v) => {
      up = v;
      connH.forEach((f) => f(v));
    },
  };
}
function hook(A, c) {
  A._conns.add(c);
  c.on("data", (m) => {
    if (m && m.t) (A._h[m.t] || []).forEach((f) => f({ data: m.d, isMe: false }));
  });
  c.on("close", () => A._conns.delete(c));
}
function peerHost(cd) {
  return new Promise((resolve, reject) => {
    const A = makeAdapter(),
      p = new Peer(PID(cd)),
      to = setTimeout(() => reject({ code: "timeout" }), 8000);
    p.on("open", () => {
      clearTimeout(to);
      A.setPeer(p);
      A.setUp(true);
      resolve(A);
    });
    p.on("error", (e) => {
      clearTimeout(to);
      reject({ code: e.type == "unavailable-id" ? "taken" : "upstream_error" });
    });
    p.on("connection", (c) =>
      c.on("open", () => {
        hook(A, c);
        A._peerH.forEach((f) => f({ joined: [{ isMe: false }] }));
      }),
    );
    p.on("disconnected", () => A.setUp(false));
  });
}
function peerJoin(cd) {
  return new Promise((resolve, reject) => {
    const A = makeAdapter(),
      p = new Peer(),
      to = setTimeout(() => {
        reject({ code: "timeout" });
        try {
          p.destroy();
        } catch (e) {}
      }, 9000);
    p.on("open", () => {
      const c = p.connect(PID(cd), { reliable: true });
      c.on("open", () => {
        clearTimeout(to);
        hook(A, c);
        A.setPeer(p);
        A.setUp(true);
        resolve(A);
      });
      c.on("close", () => A.setUp(false));
    });
    p.on("error", (e) => {
      clearTimeout(to);
      reject({ code: e.type == "peer-unavailable" ? "no_room" : "upstream_error" });
    });
  });
}
async function openNet(asHost) {
  if (typeof Peer !== "undefined") {
    try {
      return asHost ? await peerHost(code) : await peerJoin(code);
    } catch (e) {
      if (e.code == "taken" || e.code == "no_room" || !room) throw e;
    }
  }
  if (room) return room.join(roomName());
  throw { code: "no_net" };
}
async function create() {
  if (!canOnline()) return;
  net = "";
  for (let k = 0; k < 5; k++) {
    code = Math.random().toString(36).slice(2, 7).toUpperCase();
    try {
      R = await openNet(true);
      break;
    } catch (e) {
      if (e.code != "taken" || k == 4) {
        R = null;
        netErr(e);
        return render();
      }
    }
  }
  isHost = true;
  seats = mkSeats();
  S = null;
  wire();
  view = "room";
  render();
  push();
}
async function joinRoom() {
  if (!canOnline()) return;
  net = "";
  if (code.length < 5) {
    net = "Digita o código de 5 letras da sala.";
    return render();
  }
  try {
    R = await openNet(false);
  } catch (e) {
    R = null;
    netErr(e);
    return render();
  }
  isHost = false;
  S = null;
  wire();
  view = "room";
  seats = [{ name: "Procurando a sala…", bot: true }];
  render();
  let tries = 0;
  const go = () => {
    if (++tries > 12) {
      clearInterval(jt);
      net = "Não achei essa sala. Confere o código com o anfitrião.";
      return render();
    }
    R.emit("join", { id: ID, name: nick.trim() || "Jogador" }).catch(() => {});
  };
  go();
  jt = setInterval(go, 1800);
}
function leave() {
  clearTimeout(tmr);
  clearInterval(jt);
  try {
    R && R.leave();
  } catch (e) {}
  R = null;
  S = null;
  isHost = false;
  net = "";
  view = "home";
  render();
}
setInterval(push, 3000);
// ---------- interface ----------
const MANILHA = { 14: "ZAP", 13: "COPAS", 12: "ESPADILHA", 11: "OUROS" };
const cardH = (c, k = "") => {
    const p = pw(c);
    return `<div class="cd ${k} ${"♥♦".includes(c.s) ? "r" : ""} ${p >= 11 ? "man" : ""}"><b>${esc(c.r)}</b><i>${esc(c.s)}</i>${p >= 11 ? `<em>${MANILHA[p]}</em>` : ""}</div>`;
  },
  back = (k = "") => `<div class="cd bk ${k}"></div>`;
function homeV() {
  return `<section class="card"><h2>VAMO DE TRUCO </h2>
<label> Seu Nome :<input value="${esc(nick)}" maxlength="14" oninput="nick=this.value"></label>
<div class="modes">${[
    [2, "1 x 1"],
    [4, "2 x 2"],
    [6, "3 x 3"],
  ]
    .map(
      ([k, l]) =>
        `<button class="mode ${n == k ? "on" : ""}" onclick="n=${k};render()">${l}</button>`,
    )
    .join("")}</div>
<button class="big" onclick="local()"> JOGAR CONTRA OS BOTS<small></small></button>
<button class="big alt" onclick="create()" ${canOnline() ? "" : "disabled"}>🍺 CRIAR SALA ONLINE<small></small></button>
<div class="join"><input placeholder="CÓDIGO" maxlength="5" value="${esc(code)}" oninput="code=this.value.toUpperCase().trim()"><button onclick="joinRoom()" ${canOnline() ? "" : "disabled"}>ENTRAR</button></div>
${net ? `<p class="err">${esc(net)}</p>` : ""}
${canOnline() ? "" : '<p class="hint">Online indisponível aqui — só contra os bots, parça. Hospede o site (GitHub Pages/Netlify) pra jogar por código.</p>'}
<details><summary> Regras (pra ninguém dizer que é roubo)</summary><p>Baralho de 40 cartas (sem 8, 9, 10 e coringas). A cada mão sai uma <b>vira</b> no meio da mesa e a <b>manilha</b> é a carta seguinte na ordem 4 › 5 › 6 › 7 › Q › J › K › A › 2 › 3 (se a vira for 3, a manilha é o 4). As manilhas vencem tudo, e entre elas a ordem é <b>♣ Zap › ♥ Copas › ♠ Espadilha › ♦ Ouros</b>. As demais cartas: 3 › 2 › A › K › J › Q › 7 › 6 › 5 › 4. Melhor de 3 rodadas; empate (embuchou) resolve pela rodada que vale. A mão vale 1; <b>Truco</b> 3, <b>Seis</b> 6, <b>Nove</b> 9, <b>Doze</b> 12 — quem aceita ganha o direito de aumentar. Vence quem fizer 12 pontos. <b>Mão de onze</b>: o time com 11 vê as cartas do parceiro e joga valendo 3 ou corre (1 ponto pro rival). <b>Mão de ferro</b> (11 x 11): cartas às cegas, vale 1.</p></details></section>`;
}
function roomV() {
  return `<section class="card"><h2>Sala <span class="code">${esc(code)}</span></h2>
<p class="hint">${R && R.connected() ? "🟢 Conectado" : "🟡 Conectando…"} · Manda o código pra galera. Vaga vazia vira bot.</p>
<div class="slots">${seats.map((s, i) => `<div class="slot ${i % 2 ? "b" : ""}">${s.bot ? "Bot · " : "🧑 "}${esc(s.name)}<small>Time ${(i % 2) + 1}</small></div>`).join("")}</div>
${net ? `<p class="err">${esc(net)}</p>` : ""}
${isHost ? '<button class="big" onclick="startGame()">▶ COMEÇAR A ZUEIRA</button>' : '<p class="hint">Esperando o anfitrião começar… 🍿</p>'}
<button onclick="leave()">Sair</button></section>`;
}
function gameV() {
  const mr = manilhaRank(S.vira);
  const N = S.n,
    mt = tm(me),
    P = S.phase,
    A = actor();
  const pos = (v) => {
    const t = (v * 2 * Math.PI) / N;
    return [
      50 - 41 * Math.sin(t),
      50 + 41 * Math.cos(t),
      50 - 20 * Math.sin(t),
      50 + 19 * Math.cos(t),
    ];
  };
  const reveal = (s) => S.onze == mt && tm(s) == mt && s != me;
  const seatsH = S.seats
    .map((_, s) => {
      const v = (s - me + N) % N,
        p = pos(v);
      return `<div class="seat ${tm(s) == mt ? "us" : "them"} ${A == s ? "turn" : ""}" style="left:${p[0]}%;top:${v == 0 ? 93 : p[1]}%"><span class="tag">${esc(nm(s))}</span>${v ? `<div class="mini">${S.hands[s].map((c) => (reveal(s) ? cardH(c, "sm") : back("sm"))).join("")}</div>` : ""}</div>`;
    })
    .join("");
  const tbl = S.table
    .map((x) => {
      const p = pos((x.s - me + N) % N);
      return `<div class="pl" style="left:${p[2]}%;top:${p[3]}%">${cardH(x.c)}</div>`;
    })
    .join("");
  const myTurn = P == "play" && S.turn == me,
    dots = S.res
      .map(
        (w) =>
          `<span class="dot" style="background:${w < 0 ? "#999" : w == mt ? "#2c2" : "#d33"}"></span>`,
      )
      .join("");
  let ac = "";
  if (myTurn && !S.nr && S.lvl < 4 && mt != S.blk)
    ac = `<button class="t" onclick="act('truco')">${LN[S.lvl + 1]}!</button>`;
  if (P == "resp" && S.resp == me)
    ac = `<button class="ok" onclick="act('accept')">Aceitar</button>${S.pend.l < 4 ? `<button class="t" onclick="act('raise')">${LN[S.pend.l + 1]}!</button>` : ""}<button class="no" onclick="act('run')">Correr</button>`;
  if (P == "onze" && S.resp == me)
    ac = `<button class="ok" onclick="act('accept')">Jogar valendo 3</button><button class="no" onclick="act('run')">Correr</button>`;
  const over =
    P == "end"
      ? `<div class="over"><div class="card"><h2>${S.win == mt ? "🏆 GANHOU!! " : "💀 PERDEU!! "}</h2><p>${S.score[mt]} x ${S.score[1 - mt]}</p>${isHost ? '<button class="big" onclick="startGame()">Jogar de novo</button>' : ""}<button onclick="leave()">Sair da mesa</button></div></div>`
      : "";
  return `<div class="top"><div class="board">Nós <b>${S.score[mt]}</b> × <b>${S.score[1 - mt]}</b> Eles</div><div class="board">Vale <b>${S.val}</b> ${dots}</div><button onclick="leave()">Sair</button></div>
<div class="table"><div class="glass g1"></div><div class="glass g2"></div><div class="vira">${cardH(S.vira, "md")}<small>VIRA</small></div>${seatsH}${tbl}</div><div class="msg">${esc(S.msg || "")}</div>
<div class="hand">${S.hands[me].map((c, i) => `<button ${myTurn ? "" : "disabled"} onclick="act('play',${i})">${S.ferro ? back() : cardH(c)}</button>`).join("")}</div><div class="acts">${ac}</div><div class="rank">Manilha desta mão: <b>${mr}♣ Zap › ${mr}♥ Copas › ${mr}♠ Espadilha › ${mr}♦ Ouros</b> › ${[
    ...RANKS,
  ]
    .reverse()
    .filter((r) => r != mr)
    .join(" › ")}</div>${over}`;
}
function render() {
  // piso só durante a partida; fora dela o fundo é uma cor sólida
  document.body.classList.toggle("floor", view == "game" && !!S);
  document.getElementById("app").innerHTML =
    view == "game" && S ? gameV() : view == "room" ? roomV() : homeV();
  if (view == "game" && S && S.shout && S.shout.id != lastShout) {
    lastShout = S.shout.id;
    showShout(S.shout.t);
  }
}
const cnt = document.getElementById("cnt");
if (cnt) cnt.textContent = String(100000 + ((Math.random() * 899999) | 0));
render();
(async () => {
  try {
    if (window.claude) {
      room = await claude.use("room");
      if (view == "home") render();
    }
  } catch (e) {}
})();
