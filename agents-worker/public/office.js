/* The office floor: everyone at their desk, getting up to talk to each other.
   What they say comes from /api/meeting (written from the CRM's real numbers). */
(function () {
  const data = window.OFFICE;
  const floor = document.getElementById("floor");
  if (!data || !floor) return;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const $ = (id) => document.getElementById(id);

  /* Three rows of desks, grouped by department. */
  const ROWS = [
    { y: 30, groups: ["Management", "Legal & Compliance", "Finance"] },
    { y: 58, groups: ["Owner Acquisition"] },
    { y: 86, groups: ["Listings & Marketing", "Operations & Admin"] },
  ];
  const STEP = 11.4, GAP = 5.2;
  const seat = {};
  for (const row of ROWS) {
    const groups = row.groups.map((g) => data.agents.filter((a) => a.dept === g));
    const width = groups.reduce((n, g) => n + g.length * STEP, 0) + (groups.length - 1) * GAP - STEP;
    let x = 50 - width / 2;
    groups.forEach((g, gi) => {
      const x0 = x;
      g.forEach((a) => { seat[a.id] = { x, y: row.y }; x += STEP; });
      const rug = document.createElement("div");
      rug.className = "rug";
      rug.style.cssText = `left:${x0 - STEP / 2 + 0.8}%;width:${g.length * STEP - 1.6}%;top:${row.y - 19}%;height:25%;--rc:${data.colors[row.groups[gi]]}`;
      rug.innerHTML = `<span>${row.groups[gi]}</span>`;
      floor.appendChild(rug);
      x += GAP;
    });
  }

  const el = {};
  for (const a of data.agents) {
    const s = seat[a.id];
    const d = document.createElement("div");
    d.className = "desk";
    d.style.cssText = `left:${s.x}%;top:${s.y}%`;
    d.innerHTML = `<div class="chair"></div><a class="person" href="/a/${a.id}" title="${a.name} · ${a.title}">${a.svg}<i class="body" style="background:${a.shirt}"></i></a><div class="top"><i class="screen"></i></div><div class="tag">${a.first}</div>`;
    floor.appendChild(d);
    el[a.id] = { desk: d, person: d.querySelector(".person"), screen: d.querySelector(".screen") };
    d.querySelector(".screen").style.animationDelay = `${(a.id.length * 0.37) % 3}s`;
  }

  const bubble = document.createElement("div");
  bubble.className = "bubble";
  bubble.hidden = true;
  floor.appendChild(bubble);

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  let playing = true, token = 0, lines = [];

  function px(id) {
    const r = floor.getBoundingClientRect();
    return { x: (seat[id].x / 100) * r.width, y: (seat[id].y / 100) * r.height, w: r.width, h: r.height };
  }

  async function walk(id, toId) {
    const p = el[id].person;
    if (reduce) return;
    if (!toId) { p.classList.add("walking"); p.style.transform = ""; await sleep(1500); p.classList.remove("walking", "away"); return; }
    const a = px(id), b = px(toId);
    const side = a.x <= b.x ? -1 : 1;
    const dx = b.x - a.x + side * a.w * 0.047, dy = b.y - a.y + a.h * 0.035;
    p.classList.add("walking", "away");
    p.style.transform = `translate(${dx}px,${dy}px)`;
    el[id].desk.style.zIndex = 30;
    await sleep(1500);
    p.classList.remove("walking");
  }

  function say(id, text) {
    const who = data.agents.find((a) => a.id === id);
    const r = el[id].person.getBoundingClientRect(), f = floor.getBoundingClientRect();
    bubble.innerHTML = `<b>${who.name}</b><span></span>`;
    bubble.lastChild.textContent = text;
    bubble.hidden = false;
    const w = Math.min(280, f.width * 0.34);
    bubble.style.width = w + "px";
    const cx = r.left - f.left + r.width / 2;
    const left = Math.max(8, Math.min(f.width - w - 8, cx - w / 2));
    bubble.style.left = left + "px";
    bubble.style.setProperty("--tail", Math.max(14, Math.min(w - 14, cx - left)) + "px");
    bubble.style.top = Math.max(4, r.top - f.top - bubble.offsetHeight - 12) + "px";
    el[id].person.classList.add("talking");
  }

  function log(l) {
    const box = $("transcript");
    if (!box) return;
    const a = data.agents.find((x) => x.id === l.from), b = data.agents.find((x) => x.id === l.to);
    const row = document.createElement("div");
    row.className = "tline";
    row.innerHTML = `<b></b><span></span>`;
    row.firstChild.textContent = `${a.first} to ${b.first}`;
    row.lastChild.textContent = l.text;
    const hint = box.querySelector(".hist"); if (hint) hint.remove();
    box.prepend(row);
    while (box.children.length > 14) box.lastChild.remove();
  }

  async function run() {
    const my = ++token;
    let at = null; // who is standing where: { id, to }
    for (let i = 0; ; i = (i + 1) % lines.length) {
      if (my !== token) return;
      while (!playing || document.hidden) { await sleep(400); if (my !== token) return; }
      if (!lines.length) { await sleep(1000); continue; }
      const l = lines[i];
      // A reply from the person being visited needs nobody to move.
      const isReply = at && at.id === l.to && at.to === l.from;
      if (!isReply) {
        if (at) { await walk(at.id, null); el[at.id].desk.style.zIndex = ""; at = null; }
        await walk(l.from, l.to);
        at = { id: l.from, to: l.to };
      }
      if (my !== token) return;
      say(l.from, l.text);
      log(l);
      await sleep(Math.min(9000, 2600 + l.text.length * 42));
      bubble.hidden = true;
      el[l.from].person.classList.remove("talking");
      await sleep(500);
      if (i === lines.length - 1) {
        if (at) { await walk(at.id, null); el[at.id].desk.style.zIndex = ""; at = null; }
        await sleep(6000);
      }
    }
  }

  function reset() {
    token++;
    bubble.hidden = true;
    for (const id in el) { el[id].person.style.transform = ""; el[id].person.classList.remove("walking", "away", "talking"); el[id].desk.style.zIndex = ""; }
  }

  async function load(force) {
    const note = $("meetnote"), btn = $("newmeet");
    if (btn) btn.disabled = true;
    if (force && note) note.textContent = "The team is gathering its thoughts…";
    try {
      const r = await fetch("/api/meeting", { method: force ? "POST" : "GET" });
      const j = await r.json();
      if (j.ok && j.lines && j.lines.length) {
        reset();
        lines = j.lines;
        if (note) note.textContent = `Discussion written from the CRM's live numbers at ${new Date(j.at).toLocaleString("en-GB", { timeZone: "Asia/Dubai", hour: "2-digit", minute: "2-digit", day: "numeric", month: "short" })} (Dubai). They only talk here: nothing is acted on without your approval.`;
        setTimeout(run, 600);
      } else if (note) note.textContent = j.error === "budget" ? "The monthly AI budget is used up, so there is no new discussion." : "No discussion yet. Press New discussion.";
    } catch { if (note) note.textContent = "Could not load the discussion."; }
    if (btn) btn.disabled = false;
  }

  const pp = $("playpause");
  if (pp) pp.onclick = () => { playing = !playing; pp.textContent = playing ? "Pause" : "Play"; floor.classList.toggle("paused", !playing); };
  const nm = $("newmeet");
  if (nm) nm.onclick = () => load(true);
  window.addEventListener("resize", () => { if (!bubble.hidden) bubble.hidden = true; });
  load(false);
})();
