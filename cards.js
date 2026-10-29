const F = ["\u0415\u0420", "\u041A\u041F\u0420\u0424", "\u041B\u0414\u041F\u0420", "\u041D\u041B", "\u0421\u0420\u0417\u041F", "\u0412\u043D\u0435"];
const MON = ["\u044F\u043D\u0432\u0430\u0440\u044F", "\u0444\u0435\u0432\u0440\u0430\u043B\u044F", "\u043C\u0430\u0440\u0442\u0430", "\u0430\u043F\u0440\u0435\u043B\u044F", "\u043C\u0430\u044F", "\u0438\u044E\u043D\u044F", "\u0438\u044E\u043B\u044F", "\u0430\u0432\u0433\u0443\u0441\u0442\u0430", "\u0441\u0435\u043D\u0442\u044F\u0431\u0440\u044F", "\u043E\u043A\u0442\u044F\u0431\u0440\u044F", "\u043D\u043E\u044F\u0431\u0440\u044F", "\u0434\u0435\u043A\u0430\u0431\u0440\u044F"];
const CATS = ["\u0417\u0430", "\u041F\u0440\u043E\u0442\u0438\u0432", "\u0412\u043E\u0437\u0434\u0435\u0440\u0436\u0430\u043B\u0438\u0441\u044C", "\u041D\u0435 \u0433\u043E\u043B\u043E\u0441\u043E\u0432\u0430\u043B\u0438"];
function billNo(doc) {
  const m = doc.match(/(\d+-\d+)/);
  return m ? m[1] : null;
}
const normRead = (r) => r === "2 \u0447\u0442\u0435\u043D\u0438\u0435" ? "2-\u0435" : r === "3 \u0447\u0442\u0435\u043D\u0438\u0435" ? "3-\u0435" : r.startsWith("2 \u0447\u0442\u0435\u043D\u0438\u0435 \u0442\u0430\u0431") ? "2-\u0435, \u043F\u043E\u043F\u0440\u0430\u0432\u043A\u0438" : r;
const WDN = ["\u0432\u043E\u0441\u043A\u0440\u0435\u0441\u0435\u043D\u044C\u0435", "\u043F\u043E\u043D\u0435\u0434\u0435\u043B\u044C\u043D\u0438\u043A", "\u0432\u0442\u043E\u0440\u043D\u0438\u043A", "\u0441\u0440\u0435\u0434\u0430", "\u0447\u0435\u0442\u0432\u0435\u0440\u0433", "\u043F\u044F\u0442\u043D\u0438\u0446\u0430", "\u0441\u0443\u0431\u0431\u043E\u0442\u0430"];
function qrMatrix(text) {
  const data = Array.from(new TextEncoder().encode(text));
  const ECW = [10, 16, 26, 18, 24, 16, 18, 22, 22, 26], NB = [1, 1, 1, 2, 2, 4, 4, 4, 5, 5];
  const rawMods = (v) => {
    let r = (16 * v + 128) * v + 64;
    if (v >= 2) {
      const n = Math.floor(v / 7) + 2;
      r -= (25 * n - 10) * n - 55;
      if (v >= 7) r -= 36;
    }
    return r;
  };
  let ver = 1;
  for (; ver <= 10; ver++) {
    const cap = Math.floor(rawMods(ver) / 8) - ECW[ver - 1] * NB[ver - 1];
    if (4 + (ver < 10 ? 8 : 16) + data.length * 8 <= cap * 8) break;
  }
  if (ver > 10) throw new Error("qr too long");
  const total = Math.floor(rawMods(ver) / 8), ecl = ECW[ver - 1], nb = NB[ver - 1], dcw = total - ecl * nb;
  const bits = [];
  const put = (val, n) => {
    for (let i2 = n - 1; i2 >= 0; i2--) bits.push(val >>> i2 & 1);
  };
  put(4, 4);
  put(data.length, ver < 10 ? 8 : 16);
  data.forEach((b) => put(b, 8));
  put(0, Math.min(4, dcw * 8 - bits.length));
  put(0, (8 - bits.length % 8) % 8);
  for (let p = 236; bits.length < dcw * 8; p ^= 236 ^ 17) put(p, 8);
  const dc = [];
  for (let i2 = 0; i2 < bits.length; i2 += 8) dc.push(parseInt(bits.slice(i2, i2 + 8).join(""), 2));
  const mul = (x, y) => {
    let z = 0;
    for (let i2 = 7; i2 >= 0; i2--) {
      z = z << 1 ^ (z >>> 7) * 285;
      z ^= (y >>> i2 & 1) * x;
    }
    return z & 255;
  };
  const gen = [];
  for (let i2 = 0; i2 < ecl - 1; i2++) gen.push(0);
  gen.push(1);
  let root = 1;
  for (let i2 = 0; i2 < ecl; i2++) {
    for (let j = 0; j < gen.length; j++) {
      gen[j] = mul(gen[j], root);
      if (j + 1 < gen.length) gen[j] ^= gen[j + 1];
    }
    root = mul(root, 2);
  }
  const rem = (d) => {
    const r = gen.map(() => 0);
    for (const b of d) {
      const f = b ^ r.shift();
      r.push(0);
      gen.forEach((g, i2) => r[i2] ^= mul(g, f));
    }
    return r;
  };
  const nShort = nb - total % nb, shortLen = Math.floor(total / nb);
  const blocks = [];
  for (let i2 = 0, k = 0; i2 < nb; i2++) {
    const dl = shortLen - ecl + (i2 < nShort ? 0 : 1);
    const d = dc.slice(k, k + dl);
    k += dl;
    const e = rem(d);
    if (i2 < nShort) d.push(0);
    blocks.push(d.concat(e));
  }
  const all = [];
  for (let i2 = 0; i2 < blocks[0].length; i2++) blocks.forEach((b, j) => {
    if (i2 !== shortLen - ecl || j >= nShort) all.push(b[i2]);
  });
  const S = ver * 4 + 17;
  const M = [], F2 = [];
  for (let i2 = 0; i2 < S; i2++) {
    M.push(new Array(S).fill(false));
    F2.push(new Array(S).fill(false));
  }
  const set = (x, y, d) => {
    M[y][x] = d;
    F2[y][x] = true;
  };
  for (let i2 = 0; i2 < S; i2++) {
    set(6, i2, i2 % 2 === 0);
    set(i2, 6, i2 % 2 === 0);
  }
  const finder = (x, y) => {
    for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) {
      const d = Math.max(Math.abs(dx), Math.abs(dy));
      const xx = x + dx, yy = y + dy;
      if (xx >= 0 && xx < S && yy >= 0 && yy < S) set(xx, yy, d !== 2 && d !== 4);
    }
  };
  finder(3, 3);
  finder(S - 4, 3);
  finder(3, S - 4);
  if (ver > 1) {
    const n = Math.floor(ver / 7) + 2, step = ver === 32 ? 26 : Math.ceil((ver * 4 + 4) / (n * 2 - 2)) * 2;
    const pos = [6];
    for (let p = S - 7; pos.length < n; p -= step) pos.splice(1, 0, p);
    pos.forEach((a, i2) => pos.forEach((b, j) => {
      if (i2 === 0 && j === 0 || i2 === 0 && j === n - 1 || i2 === n - 1 && j === 0) return;
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) set(a + dx, b + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
    }));
  }
  const fmt = (mask) => {
    const d = 0 << 3 | mask;
    let r = d;
    for (let i2 = 0; i2 < 10; i2++) r = r << 1 ^ (r >>> 9) * 1335;
    const b = (d << 10 | r) ^ 21522;
    const g = (i2) => (b >>> i2 & 1) === 1;
    for (let i2 = 0; i2 <= 5; i2++) set(8, i2, g(i2));
    set(8, 7, g(6));
    set(8, 8, g(7));
    set(7, 8, g(8));
    for (let i2 = 9; i2 < 15; i2++) set(14 - i2, 8, g(i2));
    for (let i2 = 0; i2 < 8; i2++) set(S - 1 - i2, 8, g(i2));
    for (let i2 = 8; i2 < 15; i2++) set(8, S - 15 + i2, g(i2));
    set(8, S - 8, true);
  };
  fmt(0);
  if (ver >= 7) {
    let r = ver;
    for (let i2 = 0; i2 < 12; i2++) r = r << 1 ^ (r >>> 11) * 7973;
    const b = ver << 12 | r;
    for (let i2 = 0; i2 < 18; i2++) {
      const bt = (b >>> i2 & 1) === 1, a = S - 11 + i2 % 3, c = Math.floor(i2 / 3);
      set(a, c, bt);
      set(c, a, bt);
    }
  }
  let i = 0;
  for (let right = S - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    for (let vert = 0; vert < S; vert++) for (let j = 0; j < 2; j++) {
      const x = right - j, up = (right + 1 & 2) === 0, y = up ? S - 1 - vert : vert;
      if (!F2[y][x] && i < all.length * 8) {
        M[y][x] = (all[i >>> 3] >>> 7 - (i & 7) & 1) === 1;
        i++;
      }
    }
  }
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) if (!F2[y][x] && (x + y) % 2 === 0) M[y][x] = !M[y][x];
  return M;
}
let PLAIN = {};
const READW = { "1-\u0435": "\u043F\u0435\u0440\u0432\u043E\u0435 \u0447\u0442\u0435\u043D\u0438\u0435", "2-\u0435": "\u0432\u0442\u043E\u0440\u043E\u0435 \u0447\u0442\u0435\u043D\u0438\u0435", "3-\u0435": "\u0442\u0440\u0435\u0442\u044C\u0435 \u0447\u0442\u0435\u043D\u0438\u0435", "2-\u0435, \u043F\u043E\u043F\u0440\u0430\u0432\u043A\u0438": "\u0432\u0442\u043E\u0440\u043E\u0435 \u0447\u0442\u0435\u043D\u0438\u0435, \u043F\u043E\u043F\u0440\u0430\u0432\u043A\u0438" };
const readWord = (r) => {
  const n = normRead(r);
  return READW[n] || (n && n !== "\u2014" ? n : "");
};
function drawCards(v, day) {
  const W = 1080, H = 1920, L = 80, TOP = 290, RFULL = 1e3, RLOW = 915, RY = 1200;
  const FF = 'Inter, "Segoe UI", Roboto, "Helvetica Neue", Arial, "DejaVu Sans", sans-serif';
  const BL = "rgb(10,100,214)", GRB = "rgb(236,238,242)", TXC = "rgb(20,20,24)", MU = "rgb(110,112,120)";
  const COLS4 = ["rgb(52,199,89)", "rgb(255,59,48)", "rgb(255,159,10)", "rgb(199,199,204)"];
  const pl = PLAIN[v.id] || {};
  const title = pl.title || v.full;
  const rw = readWord(v.reading);
  const bn = billNo(v.doc);
  const dt = new Date(+day.slice(6, 10), +day.slice(3, 5) - 1, +day.slice(0, 2));
  const ds = `${dt.getDate()} ${MON[dt.getMonth()]} ${dt.getFullYear()}`, wd = WDN[dt.getDay()];
  const rlim = (y2) => y2 < RY ? RFULL : RLOW;
  const mk = () => {
    const c = document.createElement("canvas");
    c.width = W;
    c.height = H;
    const x = c.getContext("2d");
    x.fillStyle = "#FFFFFF";
    x.fillRect(0, 0, W, H);
    x.textBaseline = "top";
    return [c, x];
  };
  const rr = (x, a, b, c, d, r, col) => {
    x.fillStyle = col;
    x.beginPath();
    x.roundRect ? x.roundRect(a, b, c - a, d - b, r) : x.rect(a, b, c - a, d - b);
    x.fill();
  };
  const fnt = (x, s, w = 400) => {
    x.font = `${w} ${s}px ${FF}`;
  };
  const tx = (x, s, a, b, sz, w, col) => {
    fnt(x, sz, w);
    x.fillStyle = col;
    x.fillText(s, a, b);
    return x.measureText(s).width;
  };
  const ct = (x, s, cx, b, sz, w, col) => {
    fnt(x, sz, w);
    x.fillStyle = col;
    x.fillText(s, cx - x.measureText(s).width / 2, b);
  };
  const capMid = (x, top, sz, w) => {
    fnt(x, sz, w);
    const m = x.measureText("\u041D");
    return top + (m.actualBoundingBoxDescent - m.actualBoundingBoxAscent) / 2;
  };
  const pill = (x, s, bx, cy, h, sz, padX, minW, bg, col) => {
    fnt(x, sz, 800);
    const m = x.measureText(s), mc = x.measureText("\u041D");
    const gw = m.actualBoundingBoxLeft + m.actualBoundingBoxRight;
    const pw = Math.max(minW, Math.round(gw + padX * 2));
    rr(x, bx, cy - h / 2, bx + pw, cy + h / 2, h / 2, bg);
    x.fillStyle = col;
    x.fillText(s, bx + pw / 2 - (m.actualBoundingBoxRight - m.actualBoundingBoxLeft) / 2, cy + (mc.actualBoundingBoxAscent - mc.actualBoundingBoxDescent) / 2);
    return pw;
  };
  const wrap = (x, s, mw) => {
    const out = [];
    let line = "";
    for (const w of s.split(" ")) {
      const t = (line + " " + w).trim();
      if (x.measureText(t).width <= mw) line = t;
      else {
        if (line) out.push(line);
        line = w;
      }
    }
    out.push(line);
    return out;
  };
  const header = (x) => {
    rr(x, L, TOP, RFULL, TOP + 230, 30, GRB);
    tx(x, "\u0420\u0410\u0411\u041E\u0422\u0410 \u0413\u041E\u0421\u0414\u0423\u041C\u042B", L + 34, TOP + 30, 40, 800, TXC);
    tx(x, "\u0418 \u041F\u0420\u0410\u0412\u0418\u0422\u0415\u041B\u042C\u0421\u0422\u0412\u0410", L + 34, TOP + 78, 40, 800, TXC);
    const dw = tx(x, ds + " ", L + 34, TOP + 150, 38, 800, TXC);
    tx(x, wd, L + 34 + dw, TOP + 150, 38, 400, MU);
    const qrs = [...bn ? [["\u0417\u0430\u043A\u043E\u043D\u043E\u043F\u0440\u043E\u0435\u043A\u0442", `https://sozd.duma.gov.ru/bill/${bn}`]] : [], ["\u0413\u043E\u043B\u043E\u0441\u043E\u0432\u0430\u043D\u0438\u0435", `http://vote.duma.gov.ru/vote/${v.id}`]];
    qrs.forEach(([lab, u], k) => {
      const i = qrs.length === 2 ? k : 1;
      const qx = RFULL - 34 - 150 - (1 - i) * 175;
      rr(x, qx - 8, TOP + 22, qx + 158, TOP + 178, 16, "#FFFFFF");
      const M = qrMatrix(u);
      const n = M.length + 2, s = 140 / n;
      x.fillStyle = BL;
      M.forEach((row, r) => row.forEach((on, c) => {
        if (on) x.fillRect(Math.floor(qx + (c + 1) * s), Math.floor(TOP + 30 + (r + 1) * s), Math.ceil(s), Math.ceil(s));
      }));
      ct(x, lab, qx + 75, TOP + 188, 21, 800, BL);
    });
    return TOP + 270;
  };
  const pillC = v.ok ? ["rgb(220,245,226)", "rgb(30,140,60)"] : ["rgb(253,228,228)", "rgb(200,30,30)"];
  const pillT = v.ok ? "\u041F\u0420\u0418\u041D\u042F\u0422" : "\u041E\u0422\u041A\u041B\u041E\u041D\u0401\u041D";
  const donut = (x, cx, cy, r, w, vals) => {
    const tot2 = vals.reduce((a2, b) => a2 + b, 0);
    x.lineWidth = w;
    const rm = r - w / 2;
    if (!tot2) {
      x.strokeStyle = COLS4[3];
      x.beginPath();
      x.arc(cx, cy, rm, 0, Math.PI * 2);
      x.stroke();
      return;
    }
    let a = -Math.PI / 2;
    vals.forEach((n, i) => {
      if (!n) return;
      const e = a + n / tot2 * Math.PI * 2;
      x.strokeStyle = COLS4[i];
      x.beginPath();
      x.arc(cx, cy, rm, a, e);
      x.stroke();
      a = e;
    });
  };
  const [c1, x1] = mk();
  let y = header(x1);
  fnt(x1, 50, 800);
  const tl = wrap(x1, v.q, RFULL - L - 280);
  tl.forEach((l, i) => {
    tx(x1, l, L, y, 50, 800, TXC);
    if (i === tl.length - 1) {
      fnt(x1, 50, 800);
      const bx = L + x1.measureText(l).width + 28;
      pill(x1, pillT, bx, capMid(x1, y, 50, 800), 62, 34, 32, 250, pillC[0], pillC[1]);
    }
    y += 64;
  });
  y += 20;
  fnt(x1, 30, 400);
  let fl = wrap(x1, title, RFULL - L);
  if (fl.length > 6) {
    fl = fl.slice(0, 6);
    fl[5] = fl[5].replace(/[\s,.;:]*\S*$/, "") + "\u2026";
  }
  fl.forEach((l) => {
    tx(x1, l, L, y, 30, 400, MU);
    y += 40;
  });
  y += 18;
  tx(x1, [bn ? `\u2116 ${bn}` : "", rw].filter(Boolean).join(" \xB7 "), L, y + 11, 26, 500, MU);
  y += 90;
  {
    const cx = L + 130, cy = y + 130;
    donut(x1, cx, cy, 125, 40, v.total);
    ct(x1, String(v.total[0]), cx, cy - 46, 66, 800, TXC);
    ct(x1, "\u0437\u0430", cx, cy + 30, 26, 400, MU);
    const lx = L + 320, rx = RFULL - 20;
    CATS.forEach((n, i) => {
      const yy = y + 20 + i * 62;
      x1.fillStyle = COLS4[i];
      x1.beginPath();
      x1.arc(lx + 11, yy + 23, 11, 0, Math.PI * 2);
      x1.fill();
      tx(x1, n, lx + 40, yy, 34, 400, TXC);
      const s = String(v.total[i]);
      fnt(x1, 38, 800);
      tx(x1, s, rx - x1.measureText(s).width, yy - 2, 38, 800, i === 0 && v.total[i] ? COLS4[0] : v.total[i] ? TXC : COLS4[3]);
    });
  }
  y += 290;
  if (v.fr) {
    x1.fillStyle = GRB;
    x1.fillRect(L, y - 1, RLOW - L, 2);
    y += 24;
    tx(x1, "\u041F\u041E \u0424\u0420\u0410\u041A\u0426\u0418\u042F\u041C", L, y, 24, 800, MU);
    y += 50;
    const step = (RLOW - 5 - L) / 6;
    const CAP = ["\u0437\u0430", "\u043F\u0440\u043E\u0442\u0438\u0432", "\u0432\u043E\u0437\u0434\u0435\u0440\u0436\u0430\u043B\u0438\u0441\u044C", "\u043D\u0435 \u0433\u043E\u043B\u043E\u0441."];
    F.forEach((n, i) => {
      const f = v.fr[n];
      const cx = L + step * i + step / 2;
      const vv = f.v;
      const sz = f.size || vv.reduce((a, b) => a + b, 0) || 1;
      ct(x1, n, cx, y, 28, 800, TXC);
      ct(x1, `(${f.size})`, cx, y + 36, 20, 400, MU);
      const cy = y + 140;
      donut(x1, cx, cy, 66, 16, vv);
      let k = 0;
      vv.forEach((q, j) => {
        if (q > vv[k]) k = j;
      });
      ct(x1, `${Math.round(100 * vv[k] / sz)}%`, cx, cy - 26, 32, 800, TXC);
      ct(x1, CAP[k], cx, cy + 14, 15, 400, MU);
      const lbl = vv[0] ? `${vv[0]} \u0437\u0430` : vv[k] ? `${vv[k]} ${CAP[k]}` : "0 \u0437\u0430";
      ct(x1, lbl, cx, cy + 84, 22, 700, vv[0] ? COLS4[0] : MU);
    });
    y += 270;
  }
  {
    let lx = L;
    CATS.forEach((n, i) => {
      x1.fillStyle = COLS4[i];
      x1.beginPath();
      x1.arc(lx + 9, y + 15, 9, 0, Math.PI * 2);
      x1.fill();
      const w = tx(x1, n, lx + 26, y, 22, 400, TXC);
      lx += 26 + w + 28;
    });
  }
  y += 50;
  tx(x1, "\u0420\u0430\u0431\u043E\u0442\u0430 \u0413\u043E\u0441\u0434\u0443\u043C\u044B \u0438 \u041F\u0440\u0430\u0432\u0438\u0442\u0435\u043B\u044C\u0441\u0442\u0432\u0430", L, y, 24, 700, BL);
  const [c2, x2] = mk();
  y = header(x2);
  fnt(x2, 50, 800);
  wrap(x2, v.q, RFULL - L).slice(0, 2).forEach((l) => {
    tx(x2, l, L, y, 50, 800, TXC);
    y += 62;
  });
  y += 10;
  const pc2 = y + 23;
  const pw2 = pill(x2, pillT, L, pc2, 46, 26, 24, 200, pillC[0], pillC[1]);
  fnt(x2, 28, 500);
  {
    const mm = x2.measureText("\u041D");
    tx(x2, [`${v.total[0]} \u0437\u0430 \u0438\u0437 450`, rw].filter(Boolean).join(" \xB7 "), L + pw2 + 20, pc2 - (mm.actualBoundingBoxDescent - mm.actualBoundingBoxAscent) / 2, 28, 500, MU);
  }
  y += 80;
  const tot = v.total[0];
  const nextFb = v.ok ? normRead(v.reading) === "1-\u0435" ? "\u0417\u0430\u043A\u043E\u043D\u043E\u043F\u0440\u043E\u0435\u043A\u0442 \u043F\u0435\u0440\u0435\u0445\u043E\u0434\u0438\u0442 \u043A\u043E \u0432\u0442\u043E\u0440\u043E\u043C\u0443 \u0447\u0442\u0435\u043D\u0438\u044E." : normRead(v.reading) === "3-\u0435" ? "\u0417\u0430\u043A\u043E\u043D \u043D\u0430\u043F\u0440\u0430\u0432\u043B\u044F\u0435\u0442\u0441\u044F \u0432 \u0421\u043E\u0432\u0435\u0442 \u0424\u0435\u0434\u0435\u0440\u0430\u0446\u0438\u0438." : "\u0421\u043B\u0435\u0434\u0443\u044E\u0449\u0438\u0439 \u044D\u0442\u0430\u043F \u2014 \u043D\u0430 \u0441\u0442\u0440\u0430\u043D\u0438\u0446\u0435 \u0437\u0430\u043A\u043E\u043D\u043E\u043F\u0440\u043E\u0435\u043A\u0442\u0430 \u0432 sozd.duma.gov.ru." : `\u0420\u0435\u0448\u0435\u043D\u0438\u0435 \u043D\u0435 \u043D\u0430\u0431\u0440\u0430\u043B\u043E \u043D\u0435\u043E\u0431\u0445\u043E\u0434\u0438\u043C\u043E\u0433\u043E \u0447\u0438\u0441\u043B\u0430 \u0433\u043E\u043B\u043E\u0441\u043E\u0432 \xAB\u0437\u0430\xBB: \u043F\u043E\u043B\u0443\u0447\u0435\u043D\u043E ${tot} \u0438\u0437 450.`;
  const secs = [
    ["\u0421\u0423\u0422\u042C", pl.sut || [`\u0414\u0435\u043F\u0443\u0442\u0430\u0442\u044B \u0433\u043E\u043B\u043E\u0441\u043E\u0432\u0430\u043B\u0438 \u043F\u043E \u0432\u043E\u043F\u0440\u043E\u0441\u0443: ${title.replace(/…$/, "")}${/[.…]$/.test(title) ? "" : "."}`, `\u0418\u0442\u043E\u0433: ${tot} \u0437\u0430 \u0438\u0437 450 \u2014 ${v.ok ? "\u043F\u0440\u0438\u043D\u044F\u0442\u043E" : "\u043E\u0442\u043A\u043B\u043E\u043D\u0435\u043D\u043E"}${rw ? ` (${rw})` : ""}.`]],
    [v.ok ? "\u041A\u041E\u0413\u041E \u041A\u041E\u0421\u041D\u0401\u0422\u0421\u042F" : "\u041A\u041E\u0413\u041E \u041A\u041E\u0421\u041D\u0423\u041B\u041E\u0421\u042C \u0411\u042B", [pl.who || "\u041F\u043E\u0434\u0440\u043E\u0431\u043D\u043E\u0441\u0442\u0438 \u2014 \u0432 \u0442\u0435\u043A\u0441\u0442\u0435 \u0437\u0430\u043A\u043E\u043D\u043E\u043F\u0440\u043E\u0435\u043A\u0442\u0430 \u043D\u0430 sozd.duma.gov.ru."]],
    [v.ok ? "\u0427\u0422\u041E \u0414\u0410\u041B\u042C\u0428\u0415" : "\u041F\u041E\u0427\u0415\u041C\u0423 \u041E\u0422\u041A\u041B\u041E\u041D\u0418\u041B\u0418", [pl.next || nextFb]]
  ];
  for (const [hd, ps] of secs) {
    if (y > 1680 - 100) break;
    tx(x2, hd, L, y, 27, 800, BL);
    y += 48;
    for (const p of ps) {
      fnt(x2, 37, 400);
      for (const ln of wrap(x2, p, rlim(y + 50) - L)) {
        if (y + 50 > 1680) break;
        tx(x2, ln, L, y, 37, 400, TXC);
        y += 50;
      }
      y += 10;
    }
    y += 22;
  }
  return [c1, c2];
}
window.drawCards = drawCards;
window.setPlain = (id, p) => {
  if (p) PLAIN[id] = p;
};
