import { ROSTER, portrait, type Agent, type Dept } from "./roster";
import type { Proposal } from "./engine";

const esc = (s: unknown) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

const CSS = `
:root{--bg:#07090f;--panel:#0e131f;--panel2:#121a2b;--line:#1f2a42;--text:#e8edf8;--mute:#8a97b4;--acc:#3d7dff;--ok:#2fbf84;--bad:#ef5b6b;--warn:#e8b04a}
@media (prefers-color-scheme:light){:root{--bg:#f3f6fc;--panel:#fff;--panel2:#f0f4fb;--line:#d8e0f0;--text:#101828;--mute:#5a6785;--acc:#2158d0;--ok:#168a5c;--bad:#c63a4a;--warn:#a8741a}}
*{box-sizing:border-box}html{-webkit-text-size-adjust:100%}body{margin:0;background:var(--bg);color:var(--text);font:15px/1.5 "Inter",system-ui,Segoe UI,Roboto,sans-serif;min-height:100dvh}
a{color:inherit;text-decoration:none}button,input,textarea{font:inherit;color:inherit}
.wrap{max-width:1180px;margin:0 auto;padding:20px 16px 60px}
.top{display:flex;align-items:center;gap:12px;justify-content:space-between;margin-bottom:22px}
.brand{font-weight:650;letter-spacing:.2px}.brand small{display:block;color:var(--mute);font-weight:400;font-size:12.5px}
.btn{background:var(--acc);border:0;color:#fff;padding:9px 16px;border-radius:10px;cursor:pointer;font-weight:600;min-height:40px}
.btn.ghost{background:transparent;border:1px solid var(--line);color:var(--text)}.btn.bad{background:transparent;border:1px solid var(--bad);color:var(--bad)}
.btn:disabled{opacity:.5;cursor:default}
h1{font-size:26px;margin:0 0 4px;letter-spacing:-.3px}h2{font-size:13px;color:var(--mute);font-weight:600;margin:30px 0 12px;text-transform:none;letter-spacing:.3px}
.sub{color:var(--mute);margin:0 0 6px;max-width:68ch}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:12px}
.card{display:flex;gap:12px;align-items:center;background:var(--panel);border:1px solid var(--line);border-radius:14px;padding:12px;transition:border-color .15s,transform .15s;position:relative}
.card:hover{border-color:var(--acc);transform:translateY(-1px)}.card .nm{font-weight:600}.card .tt{color:var(--mute);font-size:12.5px;line-height:1.35}
.card svg,.hero svg{border-radius:50%;flex:none}
.dot{position:absolute;top:10px;right:10px;min-width:22px;height:22px;border-radius:11px;background:var(--bad);color:#fff;font-size:12px;font-weight:700;display:grid;place-items:center;padding:0 6px}
.ai{display:inline-block;font-size:11px;color:var(--mute);border:1px solid var(--line);border-radius:6px;padding:0 6px;margin-left:6px;vertical-align:1px}
.hero{display:flex;gap:18px;align-items:center;flex-wrap:wrap;margin-bottom:8px}.hero svg{width:110px;height:110px}
.cols{display:grid;grid-template-columns:1.1fr .9fr;gap:16px}@media(max-width:860px){.cols{grid-template-columns:1fr}}
.panel{background:var(--panel);border:1px solid var(--line);border-radius:14px;padding:16px}.panel h3{margin:0 0 10px;font-size:15px}
.prop{border:1px solid var(--line);border-radius:12px;padding:12px;margin-bottom:10px;background:var(--panel2)}
.prop .meta{color:var(--mute);font-size:12.5px;margin-bottom:6px}.prop textarea{width:100%;min-height:110px;background:var(--bg);border:1px solid var(--line);border-radius:8px;padding:8px;resize:vertical}
.row{display:flex;gap:8px;flex-wrap:wrap;margin-top:8px}
.chat{display:flex;flex-direction:column;gap:10px;max-height:420px;overflow:auto;margin-bottom:10px;padding-right:2px}
.m{padding:9px 12px;border-radius:12px;max-width:92%;white-space:pre-wrap;word-wrap:break-word}.m.me{align-self:flex-end;background:var(--acc);color:#fff}.m.ag{background:var(--panel2);border:1px solid var(--line)}
.send{display:flex;gap:8px}.send input{flex:1;background:var(--bg);border:1px solid var(--line);border-radius:10px;padding:10px 12px;min-height:44px}
.login{max-width:380px;margin:12vh auto 0;padding:0 16px}.login .panel{padding:22px}
.field{display:block;margin:12px 0}.field span{display:block;color:var(--mute);font-size:12.5px;margin-bottom:4px}
.field input{width:100%;background:var(--bg);border:1px solid var(--line);border-radius:10px;padding:11px 12px;min-height:44px}
.err{color:var(--bad);min-height:20px;font-size:13.5px;margin-top:8px}.hist{color:var(--mute);font-size:13px}
.tg{display:inline-flex;align-items:center;gap:6px;color:var(--acc);font-weight:600}
`;

const page = (title: string, body: string, script = "") => `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>${esc(title)}</title><style>${CSS}</style></head><body>${body}${script ? `<script>${script}</script>` : ""}</body></html>`;

export const loginPage = () => page("AI office sign-in", `<div class="login"><div class="panel"><div class="brand">Lababidi Properties<small>AI office · private</small></div>
<form id="f"><label class="field" id="l1"><span>Email</span><input id="e" type="email" autocomplete="username" required></label>
<label class="field" id="l2"><span>Password</span><input id="p" type="password" autocomplete="current-password" required></label>
<label class="field" id="l3" hidden><span>Code we emailed you</span><input id="c" inputmode="numeric" autocomplete="one-time-code" maxlength="6"></label>
<button class="btn" id="go" style="width:100%">Continue</button><div class="err" id="er"></div></form></div></div>`,
`const $=i=>document.getElementById(i);let step=1;
const M={invalid_credentials:"Email or password is not right.",rate_limited:"Too many tries. Wait 15 minutes.",wait:"Wait 30 seconds, then try again.",code_wrong:"That code is not right.",code_expired:"The code expired. Start again.",code_locked:"Too many wrong codes. Start again.",email_failed:"The email could not be sent.",account_disabled:"This account is switched off.",bad_origin:"Blocked."};
$("f").onsubmit=async e=>{e.preventDefault();$("er").textContent="";$("go").disabled=true;
const body=step==1?{email:$("e").value,password:$("p").value}:{code:$("c").value};
try{const r=await fetch("/api/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});const j=await r.json();
if(j.ok&&j.step==="otp"){step=2;$("l1").hidden=$("l2").hidden=true;$("l3").hidden=false;$("c").focus();$("er").textContent="We emailed a six-digit code to "+j.hint+".";$("er").style.color="var(--mute)"}
else if(j.ok){location.href="/"}else{$("er").style.color="";$("er").textContent=M[j.error]||"Could not sign in."}}catch{$("er").textContent="Could not reach the server."}
$("go").disabled=false};`);

const DEPTS: Dept[] = ["Management", "Owner Acquisition", "Listings & Marketing", "Operations & Admin", "Legal & Compliance", "Finance"];

export function homePage(pending: Map<string, number>, telegram: boolean): string {
  const total = [...pending.values()].reduce((a, b) => a + b, 0);
  const sections = DEPTS.map((d) => `<h2>${esc(d)}</h2><div class="grid">${ROSTER.filter((a) => a.dept === d).map((a) => card(a, pending.get(a.id) ?? 0)).join("")}</div>`).join("");
  return page("AI office", `<div class="wrap"><div class="top"><div class="brand">Lababidi Properties<small>AI office</small></div><div class="row" style="margin:0"><a class="btn ghost" href="https://crm.lababidiproperties.com/admin">CRM</a><button class="btn ghost" onclick="fetch('/api/logout',{method:'POST'}).then(()=>location.href='/')">Sign out</button></div></div>
<h1>${ROSTER.length} experts at your service</h1>
<p class="sub">Each one has their own office. Open an office to give an order, read their work and approve or reject what they prepare. They are AI staff: they prepare, you decide. Nothing is sent, published or changed until you press Approve.</p>
<p class="sub">${total ? `<b>${total} waiting for your decision.</b> ` : "Nothing waiting for you. "}${telegram ? `<span class="tg">Telegram is connected: message @Lababidiproperties_bot to talk to any of them.</span>` : `Telegram is not connected yet.`}</p>
${sections}</div>`);
}

const card = (a: Agent, n: number) => `<a class="card" href="/a/${a.id}">${portrait(a, 64)}<div><div class="nm">${esc(a.name)}<span class="ai">AI</span></div><div class="tt">${esc(a.title)}</div></div>${n ? `<span class="dot">${n}</span>` : ""}</a>`;

export function agentPage(a: Agent, props: Proposal[], chat: { role: string; text: string }[]): string {
  const waiting = props.filter((p) => !p.decision);
  const done = props.filter((p) => p.decision).slice(0, 8);
  const pcard = (p: Proposal) => `<div class="prop" data-id="${esc(p.id)}"><div class="meta">${esc(p.kind === "reply" ? "Reply draft" : p.kind === "listing" ? "Advert text" : "Report / note")} · ${esc(new Date(p.created_at).toLocaleString("en-GB", { timeZone: "Asia/Dubai" }))}</div><b>${esc(p.title)}</b>
<textarea>${esc(p.draft.text ?? "")}</textarea>${p.draft.description_ar ? `<div class="hist" dir="rtl" style="margin-top:6px">${esc(p.draft.description_ar)}</div>` : ""}
<div class="hist" style="margin-top:6px">${p.kind === "reply" ? "Approving saves this in the lead's notes. You send it yourself." : p.kind === "listing" ? "Approving updates the listing in the CRM only." : "Approving records it. Nothing else happens."}</div>
<div class="row"><button class="btn" onclick="decide(this,'approved')">Approve</button><button class="btn bad" onclick="decide(this,'rejected')">Reject</button></div></div>`;
  const msgs = chat.map((m) => `<div class="m ${m.role === "user" ? "me" : "ag"}">${esc(m.text)}</div>`).join("");
  return page(`${a.name} · AI office`, `<div class="wrap"><div class="top"><a class="btn ghost" href="/">All offices</a><div class="brand">Lababidi Properties<small>AI office</small></div></div>
<div class="hero">${portrait(a, 110)}<div><h1>${esc(a.name)}<span class="ai">AI</span></h1><p class="sub">${esc(a.title)} · ${esc(a.dept)}</p><p class="sub">${esc(a.does)}</p></div></div>
<div class="cols"><div class="panel"><h3>Talk to ${esc(a.name.split(" ")[0])}</h3><div class="chat" id="chat">${msgs || `<div class="hist">Give an order or ask for a report. For example: "Give me your report on what needs my attention."</div>`}</div>
<form class="send" id="sf"><input id="q" placeholder="Tell ${esc(a.name.split(" ")[0])} what to do…" autocomplete="off"><button class="btn" id="sb">Send</button></form>
<div class="row"><button class="btn ghost" onclick="ask('Give me your report: what you are working on, what needs my decision, and what you recommend.')">Ask for a report</button></div></div>
<div class="panel"><h3>Waiting for your approval (${waiting.length})</h3><div id="props">${waiting.map(pcard).join("") || `<div class="hist">Nothing waiting.</div>`}</div>
${done.length ? `<h3 style="margin-top:18px">Decided</h3>${done.map((p) => `<div class="hist">${p.decision!.outcome === "approved" ? "✅" : "✖"} ${esc(p.title)}</div>`).join("")}` : ""}</div></div></div>`,
`const A=${JSON.stringify(a.id)},$=i=>document.getElementById(i),chat=$("chat");chat.scrollTop=1e9;
function bubble(t,c){const d=document.createElement("div");d.className="m "+c;d.textContent=t;chat.appendChild(d);chat.scrollTop=1e9;return d}
async function ask(t){bubble(t,"me");const w=bubble("…","ag");$("sb").disabled=true;
try{const r=await fetch("/api/chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({agent:A,text:t})});const j=await r.json();
w.textContent=j.ok?j.text:(j.error==="daily_cap"?"Daily limit reached.":"Could not get an answer. Nothing was done.");if(j.ok&&j.proposals&&j.proposals.length)location.reload()}catch{w.textContent="Could not reach the server."}$("sb").disabled=false}
$("sf").onsubmit=e=>{e.preventDefault();const t=$("q").value.trim();if(!t)return;$("q").value="";ask(t)};
async function decide(b,o){const p=b.closest(".prop");b.disabled=true;const r=await fetch("/api/decide",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:p.dataset.id,outcome:o,text:p.querySelector("textarea").value})});const j=await r.json();alert(j.message||"Done");location.reload()}`);
}
