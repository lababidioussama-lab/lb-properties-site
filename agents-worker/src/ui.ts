import { ROSTER, byId, portrait, type Agent, type Dept } from "./roster";
import type { Proposal } from "./engine";

const esc = (s: unknown) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

const CSS = `
:root{--bg:#06080d;--bg2:#0a0e17;--panel:#0d1220;--panel2:#111829;--line:#1c2742;--line2:#27355a;--text:#e9eef9;--mute:#8996b3;--acc:#3d7dff;--acc2:#7aa7ff;--ok:#2fbf84;--bad:#ef5b6b;--warn:#e8b04a;--glow:rgba(61,125,255,.16)}
@media (prefers-color-scheme:light){:root{--bg:#f2f5fb;--bg2:#e9eef8;--panel:#fff;--panel2:#f3f6fc;--line:#dbe3f2;--line2:#c3d0ea;--text:#0f1729;--mute:#58668a;--acc:#2158d0;--acc2:#2158d0;--ok:#168a5c;--bad:#c63a4a;--warn:#a8741a;--glow:rgba(33,88,208,.10)}}
*{box-sizing:border-box}html{-webkit-text-size-adjust:100%}
body{margin:0;background:radial-gradient(1200px 520px at 80% -10%,var(--glow),transparent 60%),var(--bg);color:var(--text);font:15px/1.55 "Manrope","Segoe UI",system-ui,sans-serif;-webkit-font-smoothing:antialiased;min-height:100dvh}
a{color:inherit;text-decoration:none}button,input,textarea{font:inherit;color:inherit}
:focus-visible{outline:2px solid var(--acc2);outline-offset:2px;border-radius:8px}
.wrap{max-width:1200px;margin:0 auto;padding:18px 16px 64px}
.top{display:flex;align-items:center;gap:12px;justify-content:space-between;margin-bottom:26px}
.serif,h1,h2.room,.card .nm,.brand{font-family:"Cormorant Garamond","Times New Roman",serif}
.brand{font-size:21px;font-weight:600;letter-spacing:.2px;line-height:1.1}.brand small{display:block;color:var(--mute);font:500 11.5px "Manrope",sans-serif;letter-spacing:.35px;margin-top:2px}
.btn{background:var(--acc);border:0;color:#fff;padding:9px 16px;border-radius:10px;cursor:pointer;font-weight:600;min-height:40px;transition:filter .15s}.btn:hover{filter:brightness(1.1)}
.btn.ghost{background:transparent;border:1px solid var(--line2);color:var(--text)}.btn.ghost:hover{border-color:var(--acc)}.btn.bad{background:transparent;border:1px solid var(--bad);color:var(--bad)}
.btn:disabled{opacity:.5;cursor:default}
h1{font-size:38px;font-weight:600;margin:0 0 6px;letter-spacing:-.2px;line-height:1.05}
.sub{color:var(--mute);margin:0 0 6px;max-width:70ch}
.stats{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin:22px 0 6px}@media(max-width:820px){.stats{grid-template-columns:1fr 1fr}}
.stat{background:var(--panel);border:1px solid var(--line);border-radius:14px;padding:13px 15px}.stat .k{color:var(--mute);font-size:12px;font-weight:600;letter-spacing:.2px}.stat .v{font-size:25px;font-weight:700;letter-spacing:-.5px;margin-top:2px}.stat .v small{font-size:13px;color:var(--mute);font-weight:500;letter-spacing:0}
.bar{height:5px;background:var(--line);border-radius:3px;margin-top:8px;overflow:hidden}.bar i{display:block;height:100%;background:var(--acc);border-radius:3px}.bar.hot i{background:var(--warn)}.bar.max i{background:var(--bad)}
.room{margin-top:34px}
h2.room{font-size:25px;font-weight:600;margin:0 0 3px;display:flex;align-items:baseline;gap:10px}h2.room span{font:500 12.5px "Manrope",sans-serif;color:var(--mute)}
.room .plate{height:2px;width:46px;background:var(--rc,var(--acc));border-radius:2px;margin:6px 0 14px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(270px,1fr));gap:12px}
.card{display:flex;gap:13px;align-items:flex-start;background:var(--panel);border:1px solid var(--line);border-left:3px solid var(--rc,var(--acc));border-radius:14px;padding:13px;transition:border-color .15s,transform .15s,box-shadow .15s;position:relative}
.card:hover{border-color:var(--line2);border-left-color:var(--rc,var(--acc));transform:translateY(-2px);box-shadow:0 10px 28px -14px rgba(0,0,0,.6)}
.who{position:relative;flex:none}.who svg{display:block;border-radius:50%;box-shadow:0 0 0 2px var(--line2)}
.pres{position:absolute;right:1px;bottom:2px;width:13px;height:13px;border-radius:50%;background:var(--ok);border:2px solid var(--panel)}
.card .nm{font-size:20px;font-weight:600;line-height:1.1}.card .tt{color:var(--acc2);font-size:12.5px;font-weight:600;margin:3px 0 4px;line-height:1.3}.card .ds{color:var(--mute);font-size:12.8px;line-height:1.4}
.dot{position:absolute;top:10px;right:10px;min-width:22px;height:22px;border-radius:11px;background:var(--bad);color:#fff;font-size:12px;font-weight:700;display:grid;place-items:center;padding:0 6px}
.ai{display:inline-block;font:600 10.5px "Manrope",sans-serif;color:var(--mute);border:1px solid var(--line2);border-radius:6px;padding:0 6px;margin-left:8px;vertical-align:4px;letter-spacing:.3px}
.banner{display:flex;gap:22px;align-items:center;flex-wrap:wrap;background:linear-gradient(120deg,var(--panel),var(--panel2));border:1px solid var(--line);border-radius:18px;padding:22px;margin-bottom:16px;position:relative;overflow:hidden}
.banner:before{content:"";position:absolute;inset:0;background:radial-gradient(500px 200px at 0 0,var(--glow),transparent 70%);pointer-events:none}
.banner .who svg{box-shadow:0 0 0 3px var(--line2),0 12px 30px -10px rgba(0,0,0,.7)}.banner .pres{width:18px;height:18px;right:4px;bottom:6px;border-width:3px}
.chips{display:flex;gap:6px;flex-wrap:wrap;margin-top:10px}.chip{font-size:12px;font-weight:600;border:1px solid var(--line2);color:var(--mute);border-radius:20px;padding:3px 10px;background:var(--bg2)}
.cols{display:grid;grid-template-columns:1.15fr .85fr;gap:14px}@media(max-width:880px){.cols{grid-template-columns:1fr}}
.panel{background:var(--panel);border:1px solid var(--line);border-radius:16px;padding:16px}.panel h3{margin:0 0 12px;font-size:14px;font-weight:700;letter-spacing:.1px}
.prop{border:1px solid var(--line);border-radius:12px;padding:12px;margin-bottom:10px;background:var(--panel2)}
.prop .meta{color:var(--mute);font-size:12.5px;margin-bottom:6px}.prop textarea{width:100%;min-height:120px;background:var(--bg);border:1px solid var(--line);border-radius:8px;padding:9px;resize:vertical;margin-top:6px;line-height:1.5}
.row{display:flex;gap:8px;flex-wrap:wrap;margin-top:8px}
.chat{display:flex;flex-direction:column;gap:12px;max-height:460px;overflow:auto;margin-bottom:12px;padding-right:2px}
.msg{display:flex;gap:9px;align-items:flex-end}.msg.me{justify-content:flex-end}.msg svg{width:30px;height:30px;border-radius:50%;flex:none}
.m{padding:9px 13px;border-radius:14px;max-width:86%;white-space:pre-wrap;word-wrap:break-word;font-size:14.5px;line-height:1.55}.me .m{background:var(--acc);color:#fff;border-bottom-right-radius:4px}.ag .m{background:var(--panel2);border:1px solid var(--line);border-bottom-left-radius:4px}
.typing{display:inline-flex;gap:4px;padding:3px 0}.typing i{width:6px;height:6px;border-radius:50%;background:var(--mute);animation:b 1s infinite}.typing i:nth-child(2){animation-delay:.15s}.typing i:nth-child(3){animation-delay:.3s}@keyframes b{0%,60%,100%{opacity:.3;transform:none}30%{opacity:1;transform:translateY(-3px)}}
@media (prefers-reduced-motion:reduce){.typing i{animation:none}.card{transition:none}}
.send{display:flex;gap:8px}.send input{flex:1;background:var(--bg);border:1px solid var(--line2);border-radius:12px;padding:10px 13px;min-height:46px}
.quick{display:flex;flex-direction:column;gap:6px;margin-bottom:12px}.quick button{text-align:left;background:var(--bg2);border:1px solid var(--line);color:var(--text);border-radius:10px;padding:8px 12px;cursor:pointer;font-size:13.5px}.quick button:hover{border-color:var(--acc)}
.login{max-width:390px;margin:13vh auto 0;padding:0 16px}.login .panel{padding:26px}.login .brand{font-size:26px;margin-bottom:6px}
.field{display:block;margin:13px 0}.field span{display:block;color:var(--mute);font-size:12.5px;font-weight:600;margin-bottom:5px}
.field input{width:100%;background:var(--bg);border:1px solid var(--line2);border-radius:10px;padding:11px 12px;min-height:46px}
.err{color:var(--bad);min-height:20px;font-size:13.5px;margin-top:10px}.hist{color:var(--mute);font-size:13px}
.pill{display:inline-flex;align-items:center;gap:7px;font-size:12.5px;font-weight:600;color:var(--ok);border:1px solid var(--line2);border-radius:20px;padding:3px 11px}.pill:before{content:"";width:7px;height:7px;border-radius:50%;background:currentColor}.pill.off{color:var(--mute)}
`;

const ROOM_COLOR: Record<Dept, string> = {
  Management: "#7aa7ff", "Owner Acquisition": "#3d7dff", "Listings & Marketing": "#2fbf84",
  "Operations & Admin": "#e8b04a", "Legal & Compliance": "#b78cff", Finance: "#ff8f6b",
};

const page = (title: string, body: string, script = "") => `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><meta name="color-scheme" content="dark light"><title>${esc(title)}</title><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600;700&family=Manrope:wght@400;500;600;700&display=swap" rel="stylesheet"><style>${CSS}</style></head><body>${body}${script ? `<script>${script}</script>` : ""}</body></html>`;

export const loginPage = () => page("AI office sign-in", `<div class="login"><div class="panel"><div class="brand">Lababidi Properties<small>AI office · private</small></div>
<p class="sub" style="margin:10px 0 4px">Sign in with your CRM email and password. We will email you a six-digit code.</p>
<form id="f"><label class="field" id="l1"><span>Email</span><input id="e" type="email" autocomplete="username" required></label>
<label class="field" id="l2"><span>Password</span><input id="p" type="password" autocomplete="current-password" required></label>
<label class="field" id="l3" hidden><span>Code we emailed you</span><input id="c" inputmode="numeric" autocomplete="one-time-code" maxlength="6"></label>
<button class="btn" id="go" style="width:100%">Continue</button><div class="err" id="er" role="alert"></div></form></div></div>`,
`const $=i=>document.getElementById(i);let step=1;
const M={invalid_credentials:"Email or password is not right.",rate_limited:"Too many tries. Wait 15 minutes.",wait:"Wait 30 seconds, then try again.",code_wrong:"That code is not right.",code_expired:"The code expired. Start again.",code_locked:"Too many wrong codes. Start again.",email_failed:"The email could not be sent.",account_disabled:"This account is switched off.",bad_origin:"Blocked."};
$("f").onsubmit=async e=>{e.preventDefault();$("er").textContent="";$("go").disabled=true;
const body=step==1?{email:$("e").value,password:$("p").value}:{code:$("c").value};
try{const r=await fetch("/api/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});const j=await r.json();
if(j.ok&&j.step==="otp"){step=2;$("l1").hidden=$("l2").hidden=true;$("l3").hidden=false;$("c").focus();$("er").textContent="We emailed a six-digit code to "+j.hint+".";$("er").style.color="var(--mute)"}
else if(j.ok){location.href="/"}else{$("er").style.color="";$("er").textContent=M[j.error]||"Could not sign in."}}catch{$("er").textContent="Could not reach the server."}
$("go").disabled=false};`);

const DEPTS: Dept[] = ["Management", "Owner Acquisition", "Listings & Marketing", "Operations & Admin", "Legal & Compliance", "Finance"];

export interface Stats { waiting: number; today: number; spend: number; budget: number; telegram: boolean }

export function homePage(pending: Map<string, number>, s: Stats): string {
  const pct = Math.min(100, Math.round((s.spend / s.budget) * 100));
  const rooms = DEPTS.map((d) => {
    const people = ROSTER.filter((a) => a.dept === d);
    return `<section class="room" style="--rc:${ROOM_COLOR[d]}"><h2 class="room">${esc(d)}<span>${people.length} ${people.length === 1 ? "expert" : "experts"}</span></h2><div class="plate"></div><div class="grid">${people.map((a) => card(a, pending.get(a.id) ?? 0)).join("")}</div></section>`;
  }).join("");
  return page("AI office · Lababidi Properties", `<div class="wrap"><div class="top"><div class="brand">Lababidi Properties<small>AI office</small></div><div class="row" style="margin:0"><a class="btn ghost" href="https://crm.lababidiproperties.com/admin">Open CRM</a><button class="btn ghost" onclick="fetch('/api/logout',{method:'POST'}).then(()=>location.href='/')">Sign out</button></div></div>
<h1>Your office, Oussama.</h1>
<p class="sub">${ROSTER.length} named experts, each in their own office. Open one to give an order, read their work and approve or reject what they prepare. They are AI staff: they prepare, you decide. Nothing is sent, published or changed until you press Approve.</p>
<div class="stats">
<div class="stat"><div class="k">Waiting for your approval</div><div class="v">${s.waiting}</div></div>
<div class="stat"><div class="k">Orders given today</div><div class="v">${s.today}</div></div>
<div class="stat"><div class="k">AI spend this month (estimate)</div><div class="v">$${s.spend.toFixed(2)} <small>of $${s.budget}</small></div><div class="bar ${pct >= 100 ? "max" : pct >= 80 ? "hot" : ""}"><i style="width:${pct}%"></i></div></div>
<div class="stat"><div class="k">Telegram</div><div class="v" style="font-size:16px;margin-top:7px"><span class="pill ${s.telegram ? "" : "off"}">${s.telegram ? "Connected · @Lababidiproperties_bot" : "Not connected"}</span></div></div>
</div>${rooms}</div>`);
}

const card = (a: Agent, n: number) => `<a class="card" href="/a/${a.id}"><div class="who">${portrait(a, 62)}<span class="pres" title="Available"></span></div><div><div class="nm">${esc(a.name)}<span class="ai">AI</span></div><div class="tt">${esc(a.title)}</div><div class="ds">${esc(a.does)}</div></div>${n ? `<span class="dot" title="${n} waiting for approval">${n}</span>` : ""}</a>`;

const SKILL: Record<string, string> = { find_owners: "Owner database", crm_snapshot: "Live CRM numbers", leads: "Leads", listings: "Listings", team: "Team records", propose: "Drafts for approval" };

export function agentPage(a: Agent, props: Proposal[], chat: { role: string; text: string }[]): string {
  const waiting = props.filter((p) => !p.decision);
  const done = props.filter((p) => p.decision).slice(0, 8);
  const boss = a.id === "md" ? null : byId(a.id === "coordinator" ? "md" : "coordinator");
  const first = a.name.split(" ")[0];
  const pcard = (p: Proposal) => `<div class="prop" data-id="${esc(p.id)}"><div class="meta">${esc(p.kind === "reply" ? "Reply draft" : p.kind === "listing" ? "Advert text" : "Report / note")} · ${esc(new Date(p.created_at).toLocaleString("en-GB", { timeZone: "Asia/Dubai" }))}</div><b>${esc(p.title)}</b>
<textarea aria-label="Draft text, editable">${esc(p.draft.text ?? "")}</textarea>${p.draft.description_ar ? `<div class="hist" dir="rtl" style="margin-top:6px">${esc(p.draft.description_ar)}</div>` : ""}
<div class="hist" style="margin-top:6px">${p.kind === "reply" ? "Approving saves this in the lead's notes. You send it yourself." : p.kind === "listing" ? "Approving updates the listing in the CRM only." : "Approving records it. Nothing else happens."}</div>
<div class="row"><button class="btn" onclick="decide(this,'approved')">Approve</button><button class="btn bad" onclick="decide(this,'rejected')">Reject</button></div></div>`;
  const av = portrait(a, 30);
  const msgs = chat.map((m) => (m.role === "user" ? `<div class="msg me"><div class="m">${esc(m.text)}</div></div>` : `<div class="msg ag">${av}<div class="m">${esc(m.text)}</div></div>`)).join("");
  return page(`${a.name} · AI office`, `<div class="wrap"><div class="top"><a class="btn ghost" href="/">‹ All offices</a><div class="brand">Lababidi Properties<small>AI office</small></div></div>
<div class="banner"><div class="who">${portrait(a, 124)}<span class="pres" title="Available"></span></div><div style="flex:1;min-width:240px"><h1>${esc(a.name)}<span class="ai">AI</span></h1><p class="sub serif" style="font-size:20px;color:var(--acc2);margin-bottom:2px">${esc(a.title)}</p><p class="sub">${esc(a.dept)}${boss ? ` · works with ${esc(boss.name)}` : ""}</p><p class="sub" style="color:var(--text)">${esc(a.does)}</p>
<div class="chips">${a.tools.map((t) => `<span class="chip">${esc(SKILL[t] ?? t)}</span>`).join("")}</div></div></div>
<div class="cols"><div class="panel"><h3>Talk to ${esc(first)}</h3>
${a.quick?.length ? `<div class="quick">${a.quick.map((q) => `<button type="button" data-q="${esc(q)}">${esc(q)}</button>`).join("")}</div>` : ""}
<div class="chat" id="chat" aria-live="polite">${msgs}</div>
<form class="send" id="sf"><input id="q" placeholder="Tell ${esc(first)} what to do…" autocomplete="off" aria-label="Message"><button class="btn" id="sb">Send</button></form></div>
<div class="panel"><h3>Waiting for your approval (${waiting.length})</h3><div id="props">${waiting.map(pcard).join("") || `<div class="hist">Nothing waiting. When ${esc(first)} prepares something for you, it appears here and in Telegram.</div>`}</div>
${done.length ? `<h3 style="margin-top:18px">Recently decided</h3>${done.map((p) => `<div class="hist">${p.decision!.outcome === "approved" ? "Approved" : "Rejected"} · ${esc(p.title)}</div>`).join("")}` : ""}</div></div></div>`,
`const A=${JSON.stringify(a.id)},AV=${JSON.stringify(av)},$=i=>document.getElementById(i),chat=$("chat");chat.scrollTop=1e9;
function add(t,me){const w=document.createElement("div");w.className="msg "+(me?"me":"ag");w.innerHTML=(me?"":AV)+'<div class="m"></div>';const m=w.lastChild;if(t===null)m.innerHTML='<span class="typing"><i></i><i></i><i></i></span>';else m.textContent=t;chat.appendChild(w);chat.scrollTop=1e9;return m}
async function ask(t){add(t,true);const w=add(null,false);$("sb").disabled=true;
try{const r=await fetch("/api/chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({agent:A,text:t})});const j=await r.json();
w.textContent=j.ok?j.text:(j.error==="daily_cap"?"The daily message limit has been reached.":j.error==="budget"?"The monthly AI budget has been reached, so the office has paused.":"I could not answer just now. Nothing was done.");if(j.ok&&j.proposals&&j.proposals.length)setTimeout(()=>location.reload(),1600)}catch{w.textContent="Could not reach the server."}$("sb").disabled=false;chat.scrollTop=1e9}
$("sf").onsubmit=e=>{e.preventDefault();const t=$("q").value.trim();if(!t)return;$("q").value="";ask(t)};
document.querySelectorAll(".quick button").forEach(b=>b.onclick=()=>{const t=b.dataset.q;if(t.endsWith(": ")||t.endsWith(" ")){$("q").value=t;$("q").focus()}else ask(t)});
async function decide(b,o){const p=b.closest(".prop");b.disabled=true;const r=await fetch("/api/decide",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:p.dataset.id,outcome:o,text:p.querySelector("textarea").value})});const j=await r.json();alert(j.message||"Done");location.reload()}`);
}
