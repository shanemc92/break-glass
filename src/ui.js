/* ================= UI ========================================================= */

const PH_SHORT = ["Prepare", "Identify", "Contain", "Eradicate", "Recover", "Lessons"];
const KC_SHORT = ["Recon", "Weaponise", "Delivery", "Exploit", "Install", "C2", "Actions"];
const KEYS = "ABCD";
const HISTORY_MAX = 30;

function blankState() {
    return { schema: APP.schema, app: APP.id,
             cfg: { team: "", scenario: "random", diff: "real", seed: "", workshop: false, quiz: true },
             run: null, view: null, history: [] };
}
let state = blankState();
function persist() { store.set("state", JSON.stringify(state)); }
function restore() {
    const raw = store.get("state");
    if (!raw) return;
    try {
        const d = JSON.parse(raw);
        if (d && d.app === APP.id) state = Object.assign(blankState(), d);
    } catch (e) {}
}

const pct = v => Math.round(v * 100);
const sign = v => (v > 0 ? "+" : "") + v;
const hrs = h => { const m = Math.round(h * 60); return Math.floor(m / 60) + "h" + String(m % 60).padStart(2, "0"); };
function kids(node, list) { list.forEach(k => k && node.appendChild(k)); return node; }
function span(cls, txt) { return el("span", cls, txt); }
function table(head, rows) {
    const t = el("table"), tr = el("tr");
    head.forEach(h => tr.appendChild(el("th", null, h)));
    t.appendChild(tr);
    rows.forEach(r => {
        const row = el("tr");
        r.forEach(c => { const td = el("td"); if (c instanceof Node) td.appendChild(c); else td.textContent = c; row.appendChild(td); });
        t.appendChild(row);
    });
    const w = el("div", "tw");
    w.appendChild(t);
    return w;
}
function header(txt) { const h = el("div", "section-header"); h.appendChild(span(null, txt)); return h; }

/* ---------- setup ---------- */
function initSetup() {
    const sel = $("#cScen");
    sel.appendChild(Object.assign(el("option", null, "Random"), { value: "random" }));
    SCEN.forEach(s => sel.appendChild(Object.assign(el("option", null, s.name), { value: s.id })));
    Object.keys(DIFF).forEach(k => $("#cDiff").appendChild(Object.assign(el("option", null, DIFF[k].name), { value: k })));
    const list = $("#scenList");
    SCEN.forEach(s => {
        const row = el("div", "scn-row");
        row.appendChild(el("b", null, s.name));
        row.appendChild(el("div", "note", s.blurb));
        list.appendChild(row);
    });
    [["#cTeam", "team"], ["#cSeed", "seed"]].forEach(([id, k]) =>
        $(id).addEventListener("input", e => { state.cfg[k] = e.target.value; persist(); }));
    [["#cScen", "scenario"], ["#cDiff", "diff"]].forEach(([id, k]) =>
        $(id).addEventListener("change", e => { state.cfg[k] = e.target.value; persist(); }));
    toggle($("#tgWs"), on => { state.cfg.workshop = on; persist(); applyWorkshop(); });
    toggle($("#tgQuiz"), on => { state.cfg.quiz = on; persist(); });
}
function renderSetup() {
    $("#cTeam").value = state.cfg.team || "";
    $("#cSeed").value = state.cfg.seed || "";
    $("#cScen").value = state.cfg.scenario || "random";
    $("#cDiff").value = state.cfg.diff || "real";
    $("#tgWs").classList.toggle("active", !!state.cfg.workshop);
    $("#tgWs").setAttribute("aria-checked", String(!!state.cfg.workshop));
    const qOn = state.cfg.quiz !== false;
    $("#tgQuiz").classList.toggle("active", qOn);
    $("#tgQuiz").setAttribute("aria-checked", String(qOn));
}
function applyWorkshop() {
    const on = state.run ? state.run.workshop : state.cfg.workshop;
    document.body.classList.toggle("ws", !!on);
}

/* ---------- game ---------- */
function renderPlay() {
    const r = state.run;
    $("#setup").hidden = !!r;
    $("#game").hidden = !r;
    $("#promptTxt").textContent = r ? scen(r.sid).name.toLowerCase().replace(/ /g, "-") + " " + fmtClock(r) : "ready";
    applyWorkshop();
    if (!r) { renderSetup(); return; }
    renderStatus(r);
    renderStage(r);
    renderLog(r);
}

function meter(label, val, cls, txt) {
    const m = el("div", "meter");
    const lab = el("div", "lab");
    lab.appendChild(span(null, label));
    lab.appendChild(span(null, txt));
    const bar = el("div", "bar " + cls), fill = el("i");
    fill.style.width = clamp(val, 0, 100) + "%";
    bar.appendChild(fill);
    return kids(m, [lab, bar]);
}
function renderStatus(r) {
    const sc = scen(r.sid), host = $("#status");
    host.textContent = "";
    const n = getNode(r, r.node);
    const top = el("div", "top");
    top.appendChild(kids(el("div"), [span("scn", sc.name), span("dim", "  " + r.ctx.org)]));
    const clocks = el("div");
    clocks.appendChild(span("clock", fmtClock(r) + "  " + fmtT(r.clock)));
    if (sc.tags.includes("pii")) clocks.appendChild(span("reg " + (r.clock > 60 ? "bad" : ""), "  GDPR " + Math.max(0, Math.round(72 - r.clock)) + "h"));
    if (r.ctx.nis2) clocks.appendChild(span("reg " + (r.clock > 18 ? "bad" : ""), "  NIS2 " + Math.max(0, Math.round(24 - r.clock)) + "h"));
    top.appendChild(clocks);
    host.appendChild(top);

    const ms = el("div", "meters");
    ms.appendChild(meter("Business impact", r.impact, "bad", r.impact + "/100"));
    ms.appendChild(meter("Attacker momentum", r.heat * 10, "warn", r.heat + "/10"));
    ms.appendChild(meter("Stakeholder trust", r.trust, "ok", r.trust + "/100"));
    host.appendChild(ms);

    const z = r.pending ? r.pending.quiz : r.qz;
    const hideKc = !!(z && z.type === "kc" && z.picked == null);
    const cur = PHASES.findIndex(p => p[0] === effPh(r, n));
    host.appendChild(el("div", "strip-label", "Incident response phase"));
    const ps = el("div", "strip ph");
    PHASES.forEach((p, i) => {
        const d = el("div", i === cur ? "cur" : i < cur ? "done" : "", PH_SHORT[i]);
        d.title = p[1];
        ps.appendChild(d);
    });
    host.appendChild(ps);
    host.appendChild(el("div", "strip-label", "Attacker progress on the kill chain"));
    const ks = el("div", "strip kc");
    KC.forEach((k, i) => {
        const d = el("div", (r.kc[k[0]] ? "hit" : "") + (n.kc === k[0] && !hideKc ? " cur" : ""), KC_SHORT[i]);
        d.title = k[1];
        ks.appendChild(d);
    });
    host.appendChild(ks);
}

function renderBrief(r, host) {
    const sc = scen(r.sid);
    host.appendChild(el("p", "narr", sub(r, sc.intro)));
    const g = el("div", "brief-grid");
    const prof = el("div");
    prof.appendChild(header("Organisation"));
    prof.appendChild(table(["", ""], [
        ["Name", r.ctx.org], ["Sector", r.ctx.sector], ["Staff", r.ctx.staff],
        ["CEO", r.ctx.ceo], ["Finance Director", r.ctx.fd], ["DPO", r.ctx.dpo],
        ["Comms lead", r.ctx.comms], ["Infrastructure", r.ctx.admin], ["NIS2 in scope", r.ctx.nis2 ? "Yes" : "No"]
    ]));
    const post = el("div");
    post.appendChild(header("Security posture"));
    post.appendChild(table(["Control", "State"], Object.keys(CONTROLS).map(k =>
        [CONTROLS[k].name, span("lv" + r.posture[k], CONTROLS[k].lv[r.posture[k]])])));
    post.appendChild(el("div", "note", "Posture changes the odds. Good controls make the right moves more likely to work."));
    host.appendChild(kids(g, [prof, post]));
}

function renderStage(r) {
    const host = $("#stage");
    host.textContent = "";
    const n = getNode(r, r.node), p = r.pending;
    const ph = effPh(r, n);
    const z = p ? p.quiz : r.qz;
    const kick = el("div", "kicker");
    if (n.inj) kick.appendChild(span("tag-inj", "INJECT  "));
    if (n.id === "ESC") kick.appendChild(span("tag-esc", "ESCALATION  "));
    const showKc = n.kc && !(z && z.type === "kc" && z.picked == null);
    kick.appendChild(span(null, (PHNAME[ph] || "") + (showKc ? "  /  " + KCNAME[n.kc] : "")));
    host.appendChild(kick);
    host.appendChild(el("h2", "node-title", sub(r, n.title)));

    if (n.id === "BRIEF") renderBrief(r, host);
    else host.appendChild(el("p", "narr", sub(r, n.text)));
    if (n.art) host.appendChild(el("pre", "art", sub(r, n.art)));
    if (r.workshop && n.disc && !p) host.appendChild(el("div", "disc", "Discuss: " + sub(r, n.disc)));

    const gate = !!(p && p.quiz && p.quiz.picked == null);
    const opts = el("div", "opts");
    r.order.forEach((oi, pos) => {
        const o = n.opts[oi];
        const b = el("button", "opt");
        b.type = "button";
        if (o.q != null) b.appendChild(span("k", KEYS[pos]));
        b.appendChild(span("t", sub(r, o.t)));
        if (p) {
            b.disabled = true;
            if (oi === p.oi) b.classList.add("chosen");
            if (!gate) b.appendChild(span("q q" + o.q, QLABEL[o.q]));
        } else {
            b.addEventListener("click", () => pickOption(oi));
        }
        opts.appendChild(b);
    });
    host.appendChild(opts);
    if (gate) {
        const box = el("div", "outcome");
        box.appendChild(renderQuiz(r, p.quiz));
        box.appendChild(el("div", "note", "Answer the analyst check to see how your decision played out. Keys 1-4 or A-D."));
        host.appendChild(box);
    } else if (p) host.appendChild(renderOutcome(r, n, p));
}

function renderOutcome(r, n, p) {
    const o = n.opts[p.oi], box = el("div", "outcome");
    if (p.quiz) box.appendChild(renderQuiz(r, p.quiz));
    const roll = el("div", "log");
    if (p.p != null) {
        roll.appendChild(span(null, "odds " + pct(p.p) + "%, rolled " + pct(p.roll) + ": "));
        roll.appendChild(span(p.ok ? "ok" : "bad", p.ok ? "it works" : "it didn't go to plan"));
    } else if (p.lucky) {
        roll.appendChild(span("ok", "lucky break, it could have been worse"));
    } else if (effPh(r, n) !== "lessons") {
        roll.appendChild(span("warn", "no rescue roll, consequences follow"));
    }
    if (roll.childNodes.length) box.appendChild(roll);
    box.appendChild(el("p", null, p.ok ? sub(r, o.r || (o.q === 3 ? "Approved and funded, with an owner and a date." : "Approved. It doesn't close the gap that let this attack happen.")) : p.failText));

    const d = p.delta, dl = el("div", "log");
    if (effPh(r, n) !== "lessons") {
        [["impact", d.impact, d.impact <= 0], ["momentum", d.heat, d.heat <= 0], ["trust", d.trust, d.trust >= 0]].forEach(([k, v, good]) => {
            dl.appendChild(span(null, k + " "));
            dl.appendChild(span("gap " + (v === 0 ? "" : good ? "ok" : "bad"), sign(v)));
        });
        dl.appendChild(span("a", "time " + hrs(d.hours)));
        box.appendChild(dl);
    }
    box.appendChild(el("p", "why", "Why: " + sub(r, o.w)));
    const bi = bestIndex(n);
    if (bi !== p.oi) box.appendChild(el("p", "why", "Best move: " + sub(r, n.opts[bi].t) + ". " + sub(r, n.opts[bi].w)));

    if (n.att && n.att.length) {
        const chips = el("div", "chips");
        n.att.forEach(t => {
            const c = el("span", "chip", t + "  " + tname(t) + "  (" + TECH[t][1] + ")");
            chips.appendChild(c);
        });
        const lab = el("div", "strip-label", "Observed attacker behaviour");
        box.appendChild(lab);
        box.appendChild(chips);
    }
    const row = el("div", "row");
    row.appendChild(el("div", "spacer"));
    const c = el("button", "btn btn-primary", "Continue");
    c.id = "btnCont";
    c.addEventListener("click", doContinue);
    row.appendChild(c);
    box.appendChild(row);
    return box;
}

function renderQuiz(r, z) {
    const q = el("div", "quiz");
    q.appendChild(el("div", "strip-label", "Analyst check, bonus points"));
    q.appendChild(el("div", "qq", z.q));
    q.appendChild(el("div", "qobs", z.obs));
    const g = el("div", "qopts");
    z.opts.forEach((txt, i) => {
        const b = el("button", "btn btn-sm", (z.picked == null ? KEYS[i] + "  " : "") + txt);
        b.type = "button";
        if (z.picked != null) {
            b.disabled = true;
            if (i === z.ans) b.classList.add("right");
            else if (i === z.picked) b.classList.add("wrong");
        } else b.addEventListener("click", () => { answerQuiz(r, i); persist(); renderPlay(); });
        g.appendChild(b);
    });
    q.appendChild(g);
    if (z.picked != null) q.appendChild(el("div", "log " + (z.picked === z.ans ? "ok" : "bad"),
        z.picked === z.ans ? "Correct." : "Not quite. Answer: " + z.opts[z.ans]));
    return q;
}

function renderLog(r) {
    const host = $("#log");
    host.textContent = "";
    if (!r.log.length) { host.appendChild(el("div", "note", "Decisions will appear here.")); return; }
    const hideLast = !!(r.pending && r.pending.quiz && r.pending.quiz.picked == null);
    r.log.slice(0, hideLast ? -1 : undefined).reverse().forEach(l => {
        const row = el("div", "log");
        row.appendChild(span("a", fmtT(l.t) + "  "));
        row.appendChild(span(null, "[" + (PHNAME[l.ph] || "") + "] " + l.title + ": "));
        row.appendChild(span("q" + l.q, QLABEL[l.q]));
        if (l.p != null && !l.ok) row.appendChild(span("bad", " (failed roll)"));
        if (l.lucky) row.appendChild(span("ok", " (lucky)"));
        host.appendChild(row);
    });
}

function pickOption(oi) {
    const r = state.run;
    if (!r || r.pending) return;
    choose(r, oi);
    afterMove();
}
function doContinue() {
    const r = state.run;
    if (!r || !r.pending) return;
    cont(r);
    afterMove();
    window.scrollTo({ top: 0, behavior: "smooth" });
}
function afterMove() {
    const r = state.run;
    if (r.status === "done") {
        state.history.unshift(r);
        state.history = state.history.slice(0, HISTORY_MAX);
        state.view = r.id;
        state.run = null;
        persist();
        notify("Incident closed: " + r.result.total + " / 1000, grade " + r.result.grade[0]);
        renderPlay(); renderHistory(); renderDebrief();
        tab("debrief");
        return;
    }
    persist();
    renderPlay();
}

/* ---------- debrief ---------- */
function viewedRun() { return state.history.find(h => h.id === state.view) || state.history[0] || null; }

function summaryText(r) {
    const sc = scen(r.sid), s = r.result;
    let t = "On " + fmtClock(r, 0) + ", " + r.ctx.org + " (" + r.ctx.sector + ", " + r.ctx.staff + " staff) " + sub(r, sc.sum) + ". ";
    t += "The response, led by " + r.team + ", ran for " + hrs(r.clock) + " of simulated time across " + s.decisions + " decisions. ";
    t += s.outcome + ". Business impact finished at " + r.impact + "/100 and stakeholder trust at " + r.trust + "/100.";
    if (r.flags.escalated) t += " The attacker reached an objective before containment: " + sc.escSum;
    return t;
}
function debriefData(r) {
    const sc = scen(r.sid);
    return {
        sc, s: r.result, summary: summaryText(r),
        chain: KC.map(([k, name]) => ({
            name,
            pre: sc.pre.filter(p => p.kc === k).map(p => ({ att: p.att, txt: sub(r, p.txt) })),
            seen: r.tech.filter(t => TECH[t] && TECH[t][2] === k)
        })).filter(c => c.pre.length || c.seen.length),
        reviews: r.log.filter(l => l.q != null && l.q < 3),
        gaps: Object.keys(CONTROLS).filter(k => r.posture[k] < 2).map(k => ({ k, name: CONTROLS[k].name, lv: CONTROLS[k].lv[r.posture[k]], level: r.posture[k], fix: CONTROLS[k].fix })),
        ll: r.log.find(l => l.id === "LL"), pir: r.log.find(l => l.id === "PIR")
    };
}
const knowledgeLine = r => r.quizOn === false ? "Analyst checks were switched off for this run." :
    "Analyst checks: " + r.quiz.ok + " of " + r.quiz.n + " correct.";
const techLine = t => t + " " + tname(t) + " (" + TECH[t][1] + ")";

function renderDebrief() {
    const host = $("#debrief");
    host.textContent = "";
    const r = viewedRun();
    $("#debriefBar").hidden = !r;
    if (!r) { host.appendChild(el("div", "empty", "No finished incidents yet. Run one from the play tab.")); return; }
    const d = debriefData(r), s = d.s;

    const head = el("div", "panel");
    head.appendChild(header("Incident debrief"));
    const hg = el("div", "brief-grid");
    const sc = el("div");
    sc.appendChild(el("div", "score-big", s.total + " / 1000"));
    sc.appendChild(el("div", "grade", "Grade " + s.grade[0] + ": " + s.grade[1]));
    sc.appendChild(el("p", null, s.outcome));
    const meta = table(["", ""], [
        ["Scenario", d.sc.name], ["Organisation", r.ctx.org], ["Team", r.team],
        ["Difficulty", DIFF[r.diff].name], ["Seed", r.seed], ["Analyst checks", r.quizOn === false ? "Off" : "On"],
        ["Played", r.started.slice(0, 16).replace("T", " ")]
    ]);
    head.appendChild(kids(hg, [sc, meta]));
    host.appendChild(head);

    const sum = el("div", "panel");
    sum.appendChild(header("Summary"));
    sum.appendChild(el("p", "narr", d.summary));
    sum.appendChild(el("p", "note", "Threat actor: " + d.sc.actor));
    host.appendChild(sum);

    const card = el("div", "panel");
    card.appendChild(header("Scorecard"));
    const g2 = el("div", "brief-grid");
    g2.appendChild(table(["Component", "Score", "Weight"], Object.keys(s.W).map(k =>
        [k.charAt(0).toUpperCase() + k.slice(1), pct(s.parts[k]) + "%", pct(s.W[k]) + "%"])));
    g2.appendChild(table(["Phase", "Decisions", "Score"], s.phases.map(p =>
        [p.name, String(p.n), p.pct == null ? "-" : pct(p.pct) + "%"])));
    card.appendChild(g2);
    card.appendChild(el("div", "note", knowledgeLine(r) + (r.failed ? " Failed runs are capped at 70%." : "")));
    host.appendChild(card);

    const chain = el("div", "panel");
    chain.appendChild(header("Attack path: kill chain and ATT&CK"));
    d.chain.forEach(c => {
        chain.appendChild(el("h3", null, c.name));
        const ul = el("ul");
        c.pre.forEach(p => ul.appendChild(el("li", null, (p.att ? techLine(p.att) + ": " : "") + p.txt + " (before detection)")));
        c.seen.forEach(t => ul.appendChild(el("li", null, techLine(t))));
        chain.appendChild(ul);
    });
    host.appendChild(chain);

    const tl = el("div", "panel");
    tl.appendChild(header("Timeline"));
    tl.appendChild(table(["Time", "Phase", "Situation", "Decision", "Rating"], r.log.map(l => [
        fmtT(l.t) + " " + fmtClock(r, l.t), PHNAME[l.ph] || "", (l.inj ? "Inject: " : l.esc ? "Escalation: " : "") + l.title,
        l.choice, span("q" + l.q, QLABEL[l.q] + (l.p != null && !l.ok ? ", failed roll" : l.lucky ? ", lucky" : ""))])));
    host.appendChild(tl);

    const rev = el("div", "panel");
    rev.appendChild(header("Decision review"));
    if (!d.reviews.length) rev.appendChild(el("p", null, "Every decision was the best available. Frame this one."));
    d.reviews.forEach(l => {
        rev.appendChild(el("h3", null, l.title + "  (" + (PHNAME[l.ph] || "") + ", " + QLABEL[l.q] + ")"));
        const ul = el("ul");
        ul.appendChild(el("li", null, "You chose: " + l.choice));
        ul.appendChild(el("li", null, "Better: " + l.best));
        ul.appendChild(el("li", null, "Why: " + l.bestWhy));
        rev.appendChild(ul);
    });
    host.appendChild(rev);

    const ll = el("div", "panel");
    ll.appendChild(header("Lessons learned"));
    ll.appendChild(el("h3", null, "Preparation gaps"));
    const ul1 = el("ul");
    if (!d.gaps.length) ul1.appendChild(el("li", null, "No posture gaps. Keep testing what you have."));
    d.gaps.forEach(g => ul1.appendChild(el("li", null, g.name + " (" + g.lv + "): " + g.fix)));
    ll.appendChild(ul1);
    ll.appendChild(el("h3", null, "From your decisions"));
    const ul2 = el("ul");
    const seen = new Set();
    d.reviews.filter(l => l.ph !== "lessons").forEach(l => { if (!seen.has(l.bestWhy)) { seen.add(l.bestWhy); ul2.appendChild(el("li", null, l.bestWhy)); } });
    if (!ul2.childNodes.length) ul2.appendChild(el("li", null, "No decision gaps this run."));
    ll.appendChild(ul2);
    if (d.ll) { ll.appendChild(el("h3", null, "Headline improvement chosen")); ll.appendChild(el("p", null, d.ll.choice + " (" + QLABEL[d.ll.q] + ")")); }
    if (d.pir) { ll.appendChild(el("h3", null, "Post-incident review approach")); ll.appendChild(el("p", null, d.pir.choice + " (" + QLABEL[d.pir.q] + ")")); }
    host.appendChild(ll);
}

/* ---------- markdown ---------- */
const mdc = s => String(s == null ? "" : s).replace(/\|/g, "\\|").replace(/\n/g, " ");
const mdTable = (h, rows) => "| " + h.join(" | ") + " |\n|" + h.map(() => "---").join("|") + "|\n" +
    rows.map(r => "| " + r.map(mdc).join(" | ") + " |").join("\n") + "\n";
function debriefMd(r) {
    const d = debriefData(r), s = d.s, L = [];
    L.push("# Incident debrief: " + d.sc.name, "");
    L.push(mdTable(["Field", "Value"], [
        ["Organisation", r.ctx.org + " (" + r.ctx.sector + ", " + r.ctx.staff + " staff)"], ["Team", r.team],
        ["Difficulty", DIFF[r.diff].name], ["Seed", r.seed], ["Played", r.started.slice(0, 16).replace("T", " ")],
        ["Simulated duration", hrs(r.clock)], ["Score", s.total + " / 1000, grade " + s.grade[0] + " (" + s.grade[1] + ")"],
        ["Outcome", s.outcome]]));
    L.push("## Summary", "", d.summary, "", "**Threat actor:** " + d.sc.actor, "");
    L.push("## Scorecard", "");
    L.push(mdTable(["Component", "Score", "Weight"], Object.keys(s.W).map(k => [k.charAt(0).toUpperCase() + k.slice(1), pct(s.parts[k]) + "%", pct(s.W[k]) + "%"])));
    L.push(mdTable(["Phase", "Decisions", "Score"], s.phases.map(p => [p.name, p.n, p.pct == null ? "-" : pct(p.pct) + "%"])));
    L.push(knowledgeLine(r), "");
    L.push("## Security posture", "");
    L.push(mdTable(["Control", "State"], Object.keys(CONTROLS).map(k => [CONTROLS[k].name, CONTROLS[k].lv[r.posture[k]]])));
    L.push("## Attack path: kill chain and MITRE ATT&CK", "");
    d.chain.forEach(c => {
        L.push("### " + c.name, "");
        c.pre.forEach(p => L.push("- " + (p.att ? techLine(p.att) + ": " : "") + p.txt + " (before detection)"));
        c.seen.forEach(t => L.push("- " + techLine(t)));
        L.push("");
    });
    L.push("## Timeline", "");
    L.push(mdTable(["Time", "Clock", "Phase", "Situation", "Decision", "Rating"], r.log.map(l => [
        fmtT(l.t), fmtClock(r, l.t), PHNAME[l.ph] || "", (l.inj ? "Inject: " : l.esc ? "Escalation: " : "") + l.title, l.choice,
        QLABEL[l.q] + (l.p != null && !l.ok ? ", failed roll" : l.lucky ? ", lucky" : "")])));
    L.push("## Decision review", "");
    if (!d.reviews.length) L.push("Every decision was the best available.", "");
    d.reviews.forEach(l => {
        L.push("### " + l.title + " (" + (PHNAME[l.ph] || "") + ", " + QLABEL[l.q] + ")", "");
        L.push("- You chose: " + l.choice, "- Better: " + l.best, "- Why: " + l.bestWhy, "");
    });
    L.push("## Lessons learned", "", "### Preparation gaps", "");
    if (!d.gaps.length) L.push("- No posture gaps. Keep testing what you have.");
    d.gaps.forEach(g => L.push("- **" + g.name + "** (" + g.lv + "): " + g.fix));
    L.push("", "### From your decisions", "");
    const seen = new Set();
    d.reviews.filter(l => l.ph !== "lessons").forEach(l => { if (!seen.has(l.bestWhy)) { seen.add(l.bestWhy); L.push("- " + l.bestWhy); } });
    if (!seen.size) L.push("- No decision gaps this run.");
    if (d.ll) L.push("", "### Headline improvement chosen", "", d.ll.choice + " (" + QLABEL[d.ll.q] + ")");
    if (d.pir) L.push("", "### Post-incident review approach", "", d.pir.choice + " (" + QLABEL[d.pir.q] + ")");
    L.push("", "---", "Generated by " + APP.id + " v" + APP.version + ". Fictional organisation and scenario for training use.");
    return L.join("\n") + "\n";
}
const runName = (r, ext) => slug(r.team + "-" + r.sid + "-" + r.started.slice(0, 10)) + "." + ext;

/* ---------- history ---------- */
function renderHistory() {
    const host = $("#hist");
    host.textContent = "";
    if (!state.history.length) { host.appendChild(el("div", "empty", "No runs yet.")); return; }
    host.appendChild(table(["Date", "Team", "Scenario", "Score", "Outcome", ""], state.history.map(h => {
        const act = el("div", "row");
        const v = el("button", "btn btn-sm", "View");
        v.addEventListener("click", () => { state.view = h.id; persist(); renderDebrief(); tab("debrief"); });
        const x = el("button", "btn btn-sm btn-danger", "x");
        x.title = "Delete run";
        x.addEventListener("click", () => {
            if (!confirm("Delete this run?")) return;
            state.history = state.history.filter(y => y.id !== h.id);
            persist(); renderHistory(); renderDebrief();
        });
        kids(act, [v, x]);
        return [h.started.slice(0, 10), h.team, scen(h.sid).name, h.result.total + " (" + h.result.grade[0] + ")", h.result.outcome, act];
    })));
}
function loadRunJson(text) {
    let d;
    try { d = JSON.parse(text); } catch (e) { notify("That file is not valid JSON", true); return; }
    const r = d && d.run;
    if (!d || d.app !== APP.id || !r || !r.result || !scen(r.sid)) { notify("That file is not a saved " + APP.id + " run", true); return; }
    if (!state.history.some(h => h.id === r.id)) state.history.unshift(r);
    state.history = state.history.slice(0, HISTORY_MAX);
    state.view = r.id;
    persist(); renderHistory(); renderDebrief(); tab("debrief");
    notify("Run loaded");
}

/* ---------- wiring ---------- */
$("#btnStart").addEventListener("click", () => {
    if (state.run && !confirm("Abandon the current run and start a new one?")) return;
    state.run = newRun(state.cfg);
    persist(); renderPlay();
});
$("#btnAbandon").addEventListener("click", () => {
    if (!confirm("Abandon this run? It won't be scored.")) return;
    state.run = null; persist(); renderPlay();
});
$("#btnMd").addEventListener("click", () => { const r = viewedRun(); if (r) { download(runName(r, "md"), debriefMd(r), "text/markdown;charset=utf-8"); notify("Saved"); } });
$("#btnJson").addEventListener("click", () => {
    const r = viewedRun(); if (!r) return;
    download(runName(r, "json"), JSON.stringify({ app: APP.id, schema: APP.schema, version: APP.version, exported: new Date().toISOString(), run: r }, null, 2), "application/json");
    notify("Saved");
});
$("#btnPrint").addEventListener("click", () => window.print());
$("#btnAgain").addEventListener("click", () => tab("play"));
$("#btnLoad").addEventListener("click", () => $("#fileIn").click());
$("#fileIn").addEventListener("change", e => { if (e.target.files[0]) read(e.target.files[0], loadRunJson); e.target.value = ""; });
$("#btnClear").addEventListener("click", () => {
    if (!confirm("Delete all saved runs from this browser?")) return;
    state.history = []; state.view = null; persist(); renderHistory(); renderDebrief();
});

document.addEventListener("keydown", e => {
    if (e.ctrlKey || e.metaKey || e.altKey || $("#pane-play").hidden) return;
    if (/^(INPUT|SELECT|TEXTAREA)$/.test(document.activeElement.tagName)) return;
    const r = state.run;
    if (!r) return;
    const k = e.key.toUpperCase();
    let pos = "1234".indexOf(k);
    if (pos < 0) pos = KEYS.indexOf(k);
    if (r.pending) {
        const z = r.pending.quiz;
        if (z && z.picked == null) {
            if (pos >= 0 && pos < z.opts.length) { e.preventDefault(); answerQuiz(r, pos); persist(); renderPlay(); }
            return;
        }
        if (e.key === "Enter") { e.preventDefault(); doContinue(); }
        return;
    }
    const n = getNode(r, r.node);
    if (n.opts[0].q == null && e.key === "Enter") { e.preventDefault(); pickOption(0); return; }
    if (pos >= 0 && pos < r.order.length) { e.preventDefault(); pickOption(r.order[pos]); }
});

restore();
initSetup();
if (state.run && !validRun(state.run)) { state.run = null; notify("A saved run from an older version was cleared"); }
state.history = state.history.filter(h => h && h.result && scen(h.sid));
if (!scen(state.cfg.scenario)) state.cfg.scenario = "random";
renderPlay();
renderHistory();
renderDebrief();
