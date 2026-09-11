/* ================= ENGINE (no DOM) ============================================ */

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const QPTS = [0, 2, 6, 10];
const QLABEL = ["Poor", "Weak", "Reasonable", "Best"];
const QFX = {
    3: { heat: -2, impact: 0,  trust: 4,  hours: 1 },
    2: { heat: 0,  impact: 4,  trust: 1,  hours: 1.5 },
    1: { heat: 1,  impact: 6,  trust: -4, hours: 2 },
    0: { heat: 2,  impact: 10, trust: -8, hours: 3 }
};
const DIFF = {
    easy:  { name: "Easy",      p: 0.08,  quirk: 0.20, w: [0.15, 0.40, 0.45] },
    real:  { name: "Realistic", p: 0,     quirk: 0.30, w: [0.30, 0.45, 0.25] },
    night: { name: "Nightmare", p: -0.10, quirk: 0.45, w: [0.50, 0.40, 0.10] }
};
const POSTURE_P = [-0.18, 0, 0.08];
const ESC_AT = 6, MAX_INJ = 6, SERIOUS_P = 0.3, QUIZ_P = 0.65;

const tname = id => TECH[id][0].replace(/\s*\(.*\)$/, "");
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const INJ_BY_ID = Object.fromEntries(INJ.map(i => [i.id, Object.assign({ inj: true }, i)]));
const scen = id => SCEN.find(s => s.id === id);

function hashSeed(s) {
    let h = 2166136261;
    for (const c of String(s)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); }
    return h >>> 0;
}
function rnd(run) { // mulberry32, state kept in the run so resume is exact
    let t = run.rs = (run.rs + 0x6D2B79F5) | 0;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const pick = (run, a) => a[Math.floor(rnd(run) * a.length)];
function shuffle(run, arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd(run) * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
}
function sub(run, s) {
    if (s == null) return "";
    return String(s).replace(/\{(\w+)\}/g, (m, k) =>
        k === "elapsed" ? String(Math.round(run.clock)) : (run.ctx[k] != null ? run.ctx[k] : m));
}
function fmtClock(run, h) {
    const sc = scen(run.sid);
    const t = (h == null ? run.clock : h);
    const mins = sc.start[1] * 60 + sc.start[2] + Math.round(t * 60);
    const d = DAYS[(sc.start[0] + Math.floor(mins / 1440)) % 7];
    const hh = Math.floor((mins % 1440) / 60), mm = mins % 60;
    return d + " " + String(hh).padStart(2, "0") + ":" + String(mm).padStart(2, "0");
}
const fmtT = h => { const m = Math.round(h * 60); return "T+" + String(Math.floor(m / 60)).padStart(2, "0") + ":" + String(m % 60).padStart(2, "0"); };

/* ---------- new run ---------- */
function newRun(cfg) {
    const seed = (cfg.seed || "").trim().toUpperCase() || Math.random().toString(36).slice(2, 8).toUpperCase();
    const run = {
        v: 1, id: Date.now().toString(36) + Math.floor(Math.random() * 1e4), seed, rs: hashSeed(seed),
        team: (cfg.team || "").trim() || "Lead analyst", diff: DIFF[cfg.diff] ? cfg.diff : "real",
        workshop: !!cfg.workshop, quizOn: cfg.quiz !== false, started: new Date().toISOString()
    };
    const sc = cfg.scenario && scen(cfg.scenario) ? scen(cfg.scenario) : pick(run, SCEN);
    run.sid = sc.id;
    const pool = sc.orgs ? ORGS.filter(x => sc.orgs.includes(x[0])) : ORGS.filter(x => !x[4]);
    const o = pick(run, pool);
    const person = () => [pick(run, FIRST), pick(run, LAST)];
    const fd = person(), ap = person(), dv = person();
    run.ctx = {
        org: o[0], sector: o[2].toLowerCase(), nis2: o[3], staff: String(250 + Math.floor(rnd(run) * 76) * 50),
        ceo: person().join(" "), fd: fd.join(" "), fdlast: fd[1], admin: person().join(" "),
        dpo: person().join(" "), comms: person().join(" "), apclerk: ap.join(" "), salesop: person().join(" "),
        fdmail: (fd[0] + "." + fd[1]).toLowerCase() + "@" + o[1] + ".example",
        apmail: (ap[0] + "." + ap[1]).toLowerCase() + "@" + o[1] + ".example",
        site: pick(run, SITES), supplier: pick(run, SUPPLIERS), saas: pick(run, SAAS),
        vendor: "EdgeGate", agent: "Ask" + o[0].split(" ")[0], agentid: "svc-ai-agent",
        dev: dv.join(" "), devuser: (dv[0][0] + dv[1]).toLowerCase(), orgslug: o[1], plantsite: pick(run, PLANTS)
    };
    run.posture = {};
    const w = DIFF[run.diff].w;
    Object.keys(CONTROLS).forEach(k => {
        const r = rnd(run);
        run.posture[k] = r < w[0] ? 0 : r < w[0] + w[1] ? 1 : 2;
    });
    Object.assign(run, {
        heat: 3 + (run.posture.edr === 0 ? 1 : 0), impact: 5, trust: 55 + run.posture.plan * 5,
        clock: 0, effort: 0, flags: {}, log: [], kc: {}, tech: [], quiz: { ok: 0, n: 0 },
        injUsed: [], sinceInj: 0, ret: null, pending: null, status: "active", failed: false
    });
    goto(run, "BRIEF");
    return run;
}

/* ---------- graph ---------- */
function getNode(run, id) {
    const sc = scen(run.sid);
    if (id === "BRIEF") return { id: "BRIEF", ph: "prep", title: sc.name, text: sc.intro, opts: [{ t: "Take the call" }] };
    if (SHARED[id]) return SHARED[id];
    if (id === "ESC") return sc.esc;
    if (id === "LL") return sc.ll;
    if (INJ_BY_ID[id]) return INJ_BY_ID[id];
    return sc.nodes.find(n => n.id === id) || null;
}
function defaultNext(run, id) {
    const sc = scen(run.sid);
    if (id === "BRIEF") return "PREP";
    if (id === "PREP") return sc.nodes[0].id;
    if (id === "LL") return "PIR";
    if (id === "PIR") return "END";
    if (id === "FAIL") return "LL";
    const i = sc.nodes.findIndex(n => n.id === id);
    if (i >= 0) return i < sc.nodes.length - 1 ? sc.nodes[i + 1].id : "LL";
    return null; // injects and escalation return to run.ret
}
function applyFx(run, fx) {
    if (!fx) return;
    run.heat = clamp(run.heat + (fx.heat || 0), 0, 10);
    run.impact = clamp(run.impact + (fx.impact || 0), 0, 100);
    run.trust = clamp(run.trust + (fx.trust || 0), 0, 100);
}
function goto(run, id) {
    let guard = 0;
    while (id && id !== "END") {
        const n = getNode(run, id);
        if (!n) throw new Error("Missing node: " + id);
        if ((n.if && !run.flags[n.if]) || (n.unless && run.flags[n.unless])) {
            id = defaultNext(run, id) || run.ret;
            if (++guard > 50) throw new Error("Skip loop");
            continue;
        }
        break;
    }
    run.pending = null;
    if (!id || id === "END") { finish(run); return; }
    const n = getNode(run, id);
    run.node = id;
    if (!n.inj && id !== "ESC") run.curPh = n.ph;
    if (n.at != null) run.clock = Math.max(run.clock, n.at);
    if (id === "ESC") run.flags.escalated = 1;
    applyFx(run, n.enter);
    run.order = shuffle(run, n.opts.map((_, i) => i));
    run.qz = makeQuiz(run, n);
    if (n.kc && !(run.qz && run.qz.type === "kc")) run.kc[n.kc] = 1;
}
function phaseOf(run, id) {
    const n = id && getNode(run, id);
    return n && typeof n.ph === "string" ? n.ph : null;
}
const effPh = (run, n) => (n.inj || n.id === "ESC") ? run.curPh : n.ph;

/* ---------- injects and quiz ---------- */
function pickInject(run, ph) {
    if (run.injUsed.length >= MAX_INJ || run.sinceInj < 1) return null;
    const sc = scen(run.sid);
    const ok = INJ.filter(i => !run.injUsed.includes(i.id) && (!i.ph || i.ph.includes(ph)) &&
        (!i.tag || sc.tags.includes(i.tag)) && (!i.cond || i.cond(run)));
    const serious = ok.filter(i => i.kind === "s"), quirky = ok.filter(i => i.kind === "q");
    const r = rnd(run);
    if (serious.length && r < SERIOUS_P) return pick(run, serious);
    if (quirky.length && r >= SERIOUS_P && r < SERIOUS_P + DIFF[run.diff].quirk) return pick(run, quirky);
    return null;
}
/* Quiz answers must not be readable from the screen. A technique "leaks" if any significant word
   of its name appears in what the player can see while answering. */
const QSTOP = new Set("the of and for to from in on or a an with by use data account accounts over".split(" "));
const qstem = w => w.toLowerCase().replace(/[^a-z0-9]/g, "").replace(/(ing|ed|es|s)$/, "");
const qwords = str => String(str).split(/[^A-Za-z0-9]+/).map(qstem).filter(w => w.length > 2 && !QSTOP.has(w));
function leaks(run, n, id) {
    const name = new Set(qwords(TECH[id][0].replace(/\(.*\)/, "")));
    const shown = [n.title, n.text, n.art, n.obs].concat(n.opts.map(o => o.t)).map(x => sub(run, x || "")).join(" ");
    return qwords(shown).some(w => name.has(w));
}
function makeQuiz(run, n) {
    if (!n.att || !n.att.length || n.ph === "lessons" || n.noquiz) return null;
    const gate = rnd(run), kind = rnd(run); // always drawn so the toggle never changes the dice
    const clean = n.att.filter(t => TECH[t] && !leaks(run, n, t));
    const obs = sub(run, n.obs || n.title);
    let z;
    if (kind < 0.35 || !clean.length) {
        const stage = TECH[n.att[0]][2];
        const ks = shuffle(run, [stage].concat(shuffle(run, KC.map(k => k[0]).filter(k => k !== stage)).slice(0, 3)));
        z = { type: "kc", q: "Which kill chain stage does this behaviour belong to?", obs,
              opts: ks.map(k => KCNAME[k]), ans: ks.indexOf(stage), picked: null };
    } else {
        const ans = clean[0];
        const fam = k => k.startsWith("AML") ? "atlas" : /^T0\d/.test(k) ? "ics" : "ent";
        const others = Object.keys(TECH).filter(k => !n.att.includes(k));
        let pool = others.filter(k => fam(k) === fam(ans));
        if (pool.length < 3) pool = pool.concat(shuffle(run, others.filter(k => fam(k) === "ent")).slice(0, 3 - pool.length));
        const ids = shuffle(run, [ans].concat(shuffle(run, pool).slice(0, 3)));
        z = { type: "att", q: "Which technique best describes this behaviour?", obs,
              opts: ids.map(k => k + "  " + tname(k)), ans: ids.indexOf(ans), picked: null };
    }
    return (run.quizOn === false || gate > QUIZ_P) ? null : z;
}
function answerQuiz(run, i) {
    const z = run.pending && run.pending.quiz;
    if (!z || z.picked != null) return;
    z.picked = i;
    run.quiz.n++;
    const ok = i === z.ans;
    if (ok) run.quiz.ok++;
    const last = run.log[run.log.length - 1];
    if (last) last.quiz = { type: z.type, ok, ans: z.opts[z.ans] };
}

/* ---------- decisions ---------- */
function bestIndex(n) {
    const top = Math.max.apply(null, n.opts.map(o => o.q));
    return n.opts.findIndex(o => o.q === top);
}
function choose(run, oi) {
    if (run.pending || run.status !== "active") return null;
    const n = getNode(run, run.node), o = n.opts[oi];
    if (!o) return null;

    if (o.q == null) { // info screens
        goto(run, o.next || defaultNext(run, run.node) || run.ret);
        return null;
    }

    const ph = (n.inj || n.id === "ESC") ? run.curPh : n.ph;
    const lessons = ph === "lessons";
    const res = { oi, ok: true, lucky: false, roll: null, p: null, failText: null };
    let fx;
    if (lessons) {
        fx = { heat: 0, impact: 0, trust: o.q >= 2 ? 2 : -2, hours: 0.5 };
    } else {
        fx = Object.assign({}, QFX[o.q]);
        if (n.hours != null) fx.hours = n.hours;
        if (o.q >= 2) {
            let p = o.p != null ? o.p : (o.q === 3 ? 0.78 : 0.85);
            p += DIFF[run.diff].p;
            (o.u || []).forEach(c => { p += POSTURE_P[run.posture[c]] || 0; });
            p = clamp(p, 0.05, 0.97);
            res.roll = rnd(run); res.p = p; res.ok = res.roll < p;
            if (!res.ok) {
                fx.heat = o.q === 3 ? 0 : 1; fx.impact += 5; fx.trust -= 3; fx.hours += 1.5;
                res.failText = sub(run, o.f || pick(run, FAILS));
            }
        } else {
            res.roll = rnd(run);
            if (res.roll < 0.12) {
                res.lucky = true;
                fx.heat = Math.floor(fx.heat / 2); fx.impact = Math.round(fx.impact / 2); fx.trust = Math.round(fx.trust / 2);
            }
        }
    }
    if (o.fx) Object.keys(o.fx).forEach(k => { fx[k] = (fx[k] || 0) + o.fx[k]; });

    const before = { heat: run.heat, impact: run.impact, trust: run.trust }, t0 = run.clock;
    run.heat = clamp(run.heat + fx.heat, 0, 10);
    const drift = lessons ? 0 : Math.round(run.heat * 0.5);
    run.impact = clamp(run.impact + fx.impact + drift, 0, 100);
    run.trust = clamp(run.trust + fx.trust, 0, 100);
    run.clock += fx.hours; run.effort += fx.hours;
    res.delta = { heat: run.heat - before.heat, impact: run.impact - before.impact, trust: run.trust - before.trust, hours: fx.hours };

    if (o.set) run.flags[o.set] = 1;
    (n.att || []).forEach(t => { if (!run.tech.includes(t)) run.tech.push(t); });

    const bi = bestIndex(n);
    run.log.push({
        id: n.id, ph, inj: !!n.inj, esc: n.id === "ESC", title: sub(run, n.title), t: t0,
        choice: sub(run, o.t), q: o.q, ok: res.ok, lucky: res.lucky, roll: res.roll, p: res.p,
        why: sub(run, o.w), best: bi !== oi ? sub(run, n.opts[bi].t) : null,
        bestWhy: bi !== oi ? sub(run, n.opts[bi].w) : null, att: n.att || [], quiz: null
    });
    res.quiz = run.qz || null;
    run.qz = null;

    // where next
    let next = o.next || defaultNext(run, run.node);
    if (next == null) { next = run.ret; run.ret = null; }
    if (!n.inj) run.sinceInj++;
    if (!lessons && run.impact >= 100 && !run.failed) {
        run.failed = true; run.ret = null; next = "FAIL";
    } else if (!lessons && ph !== "prep" && !["LL", "PIR", "END", "FAIL"].includes(next)) {
        const sc = scen(run.sid);
        if ((o.esc || run.heat >= ESC_AT) && !run.flags.escalated && sc.esc) {
            run.ret = next; next = "ESC";
        } else if (!n.inj && n.id !== "ESC") {
            const inj = pickInject(run, phaseOf(run, next) || ph);
            if (inj) { run.ret = next; next = inj.id; run.injUsed.push(inj.id); run.sinceInj = 0; }
        }
    }
    res.next = next;
    run.pending = res;
    return res;
}
function cont(run) {
    if (!run.pending) return;
    const n = getNode(run, run.node);
    if (n.kc) run.kc[n.kc] = 1;
    (n.att || []).forEach(t => { if (TECH[t]) run.kc[TECH[t][2]] = 1; });
    goto(run, run.pending.next);
}
function validRun(r) {
    try { return !!(r && r.v === 1 && scen(r.sid) && (r.node === "END" || getNode(r, r.node))); } catch (e) { return false; }
}

/* ---------- scoring ---------- */
function score(run) {
    const dec = run.log.filter(l => l.q != null);
    const decPct = dec.length ? dec.reduce((a, l) => a + QPTS[l.q], 0) / (dec.length * 10) : 0;
    const par = Math.max(1, dec.length * 1.3);
    const parts = {
        decisions: decPct,
        impact: (100 - run.impact) / 100,
        speed: clamp(1 - Math.max(0, run.effort - par) / par, 0, 1),
        trust: run.trust / 100,
        knowledge: run.quiz.n ? run.quiz.ok / run.quiz.n : 0.5
    };
    const W = { decisions: 0.4, impact: 0.25, speed: 0.1, trust: 0.15, knowledge: 0.1 };
    if (run.quizOn === false) {
        delete W.knowledge; delete parts.knowledge;
        const sum = Object.values(W).reduce((a, b) => a + b, 0);
        Object.keys(W).forEach(k => { W[k] = W[k] / sum; });
    }
    let total = Math.round(1000 * Object.keys(W).reduce((a, k) => a + parts[k] * W[k], 0));
    if (run.failed) total = Math.round(total * 0.7);
    const grade = total >= 850 ? ["A", "CISO material"] : total >= 700 ? ["B", "Safe pair of hands"] :
                  total >= 550 ? ["C", "Survived, just about"] : total >= 400 ? ["D", "Awkward board meeting"] :
                  ["F", "Front page news"];
    const phases = PHASES.map(([k, name]) => {
        const d = dec.filter(l => l.ph === k);
        return { k, name, n: d.length, pct: d.length ? d.reduce((a, l) => a + QPTS[l.q], 0) / (d.length * 10) : null };
    });
    const outcome = run.failed ? "Failed: the incident overwhelmed the organisation" :
                    run.impact < 30 ? "Contained with limited impact" :
                    run.impact < 60 ? "Contained with significant impact" : "Contained, at heavy cost";
    return { total, grade, parts, W, phases, outcome, decisions: dec.length };
}
function finish(run) {
    if (run.status === "done") return;
    run.status = "done";
    run.pending = null;
    run.node = "END";
    run.ended = new Date().toISOString();
    run.result = score(run);
}
