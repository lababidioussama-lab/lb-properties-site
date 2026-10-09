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
/* sign-in, drawn as the CRM draws its own */
body.signin{background:radial-gradient(900px 480px at 100% -10%,rgba(47,111,214,.10),transparent 62%),radial-gradient(800px 520px at -10% 110%,rgba(11,42,74,.35),transparent 62%),#000103;display:flex;flex-direction:column;padding:0 16px}
#ribbons{position:fixed;inset:0;width:100%;height:100%;z-index:0;pointer-events:none}
.si-mid{position:relative;z-index:1;flex:1;display:flex;align-items:center;justify-content:center;padding:48px 0}
.si-card{width:100%;max-width:430px;padding:32px 30px;background:rgba(17,23,33,.8);border:1px solid rgba(255,255,255,.085);border-radius:16px;box-shadow:0 30px 70px rgba(0,0,0,.75);backdrop-filter:blur(16px) saturate(1.2);-webkit-backdrop-filter:blur(16px) saturate(1.2)}
.si-card h1{font-size:27px;margin:16px 0 0;color:#eef2f8;line-height:1.15}.si-card .intro{margin:4px 0 0;font-size:12.5px;line-height:1.6;color:#8a97aa}.si-card .intro b{color:#eef2f8}
.si-steps{margin-top:20px;display:grid;grid-template-columns:1fr 1fr;gap:4px;padding:4px;border:1px solid rgba(255,255,255,.085);border-radius:12px;background:rgba(0,0,0,.42);text-align:center;font-size:12.5px;font-weight:700}
.si-steps span{padding:8px 0;border-radius:9px;color:#8a97aa}.si-steps span.on{background:linear-gradient(135deg,#5b9bff 0%,#2f6fd6 55%,#1d4fae 100%);color:#fff}
.si-card label{display:block;margin-top:16px}.si-card label span{display:block;margin-bottom:6px;font-size:11.5px;font-weight:700;letter-spacing:.4px;color:#8a97aa}
.si-card input{width:100%;height:48px;border-radius:10px;border:1px solid rgba(255,255,255,.085);background:rgba(0,0,0,.42);padding:0 14px;font-size:15px;color:#eef2f8;outline:none;transition:border-color .15s,box-shadow .15s}
.si-card input:focus{border-color:#7fb0ff;box-shadow:0 0 0 3px rgba(79,143,240,.13)}
.si-card input.code{height:56px;text-align:center;font-size:22px;letter-spacing:.3em;font-variant-numeric:tabular-nums}
.si-msg{margin-top:16px;border-radius:10px;padding:8px 12px;font-size:12.5px;border:1px solid rgba(255,122,102,.4);background:rgba(255,122,102,.12);color:#ff7a66}
.btn-go{margin-top:16px;display:flex;width:100%;height:48px;align-items:center;justify-content:center;gap:8px;border:0;border-radius:9px;font-size:14px;font-weight:600;color:#fff;cursor:pointer;background-image:linear-gradient(135deg,#5b9bff 0%,#2f6fd6 55%,#1d4fae 100%);background-size:180% 100%;background-position:0 0;box-shadow:0 0 0 1px rgba(91,155,255,.3),0 10px 26px -12px rgba(47,111,214,.75);transition:background-position .35s ease,box-shadow .25s ease}
.btn-go:hover{background-position:100% 0;box-shadow:0 0 0 1px rgba(127,176,255,.5),0 14px 34px -10px rgba(47,111,214,.9)}.btn-go:disabled{opacity:.6;cursor:default}
.si-alt{margin-top:14px;text-align:right;font-size:12.5px}.si-alt button{background:none;border:0;color:#8a97aa;cursor:pointer}.si-alt button:hover{color:#eef2f8}
.si-foot{margin-top:24px;padding-top:16px;border-top:1px solid rgba(255,255,255,.085);display:flex;gap:8px;font-size:11.5px;line-height:1.6;color:#8a97aa}.si-foot svg{flex:none;margin-top:2px}
.si-copy{position:relative;z-index:1;padding-bottom:24px;text-align:center;font-size:11px;color:#8a97aa}

/* the office floor */
.floorhead{display:flex;align-items:flex-end;justify-content:space-between;gap:12px;flex-wrap:wrap;margin:34px 0 12px}.floorhead h2{font:600 25px "Cormorant Garamond",serif;margin:0}
.floorwrap{overflow-x:auto;border:1px solid var(--line);border-radius:18px;background:var(--bg2)}
#floor{position:relative;min-width:1040px;aspect-ratio:1160/580;overflow:hidden;background:linear-gradient(#0c1426,#0a1020 9%,transparent 9%),repeating-linear-gradient(90deg,rgba(255,255,255,.022) 0 1px,transparent 1px 86px),repeating-linear-gradient(0deg,rgba(255,255,255,.022) 0 1px,transparent 1px 62px),linear-gradient(#0b101c,#080b13)}
#floor:before{content:"";position:absolute;left:0;right:0;top:0;height:9%;background:repeating-linear-gradient(90deg,transparent 0 3%,rgba(122,167,255,.13) 3% 13.5%,transparent 13.5% 16.6%);border-bottom:2px solid #1c2742}
.rug{position:absolute;border-radius:16px;background:color-mix(in srgb,var(--rc) 8%,transparent);border:1px dashed color-mix(in srgb,var(--rc) 38%,transparent)}
.rug span{position:absolute;left:10px;top:5px;font-size:10.5px;font-weight:700;letter-spacing:.4px;color:color-mix(in srgb,var(--rc) 80%,#fff)}
.desk{position:absolute;width:0;height:0}
.desk .chair{position:absolute;left:-19px;top:-46px;width:38px;height:34px;border-radius:12px 12px 6px 6px;background:#151d30;border:1px solid #26334f}
.desk .person{position:absolute;left:-24px;top:-66px;width:48px;height:70px;display:block;transition:transform 1.5s cubic-bezier(.45,.05,.3,1);z-index:2}
.desk .person svg{position:relative;z-index:2;width:48px;height:48px;border-radius:50%;box-shadow:0 0 0 2px #26334f;display:block}
.desk .person .body{position:absolute;left:7px;top:40px;width:34px;height:30px;border-radius:12px 12px 8px 8px;z-index:1;opacity:.95}
.desk .person.away{z-index:40}.desk .person.walking svg,.desk .person.walking .body{animation:step .38s ease-in-out infinite}
.desk .person.talking svg{box-shadow:0 0 0 2px var(--acc),0 0 18px 2px rgba(61,125,255,.55)}
@keyframes step{0%,100%{transform:translateY(0)}50%{transform:translateY(-3px)}}
.desk .top{position:absolute;left:-42px;top:-12px;width:84px;height:28px;border-radius:8px;background:linear-gradient(#1b2540,#141c31);border:1px solid #2a3859;z-index:3;box-shadow:0 10px 18px -8px rgba(0,0,0,.7)}
.desk .screen{position:absolute;left:28px;top:-13px;width:28px;height:17px;border-radius:3px;background:#0b1325;border:1px solid #34456d;box-shadow:0 0 10px rgba(61,125,255,.35) inset;animation:glow 3.2s ease-in-out infinite}
@keyframes glow{0%,100%{box-shadow:0 0 6px rgba(61,125,255,.25) inset}50%{box-shadow:0 0 12px rgba(122,167,255,.7) inset}}
.desk .tag{position:absolute;left:-45px;top:19px;width:90px;text-align:center;font-size:11px;font-weight:600;color:var(--mute);z-index:3}
.bubble{position:absolute;z-index:60;background:#f4f7fd;color:#0f1729;border-radius:13px;padding:8px 12px 9px;font-size:12.5px;line-height:1.45;box-shadow:0 14px 34px -10px rgba(0,0,0,.8)}
.bubble b{display:block;font-size:11px;color:#2158d0;margin-bottom:1px}.bubble:after{content:"";position:absolute;left:var(--tail,40px);bottom:-6px;width:12px;height:12px;margin-left:-6px;background:#f4f7fd;transform:rotate(45deg)}
.paused *{animation-play-state:paused!important}
@media (prefers-reduced-motion:reduce){.desk .person{transition:none}.desk .screen,.desk .person.walking svg,.desk .person.walking .body{animation:none}}
.tline{padding:7px 0;border-bottom:1px solid var(--line);font-size:13.5px}.tline:last-child{border:0}.tline b{display:block;font-size:11.5px;color:var(--acc2)}
.two{display:grid;grid-template-columns:1.2fr .8fr;gap:14px;margin-top:14px}@media(max-width:880px){.two{grid-template-columns:1fr}}
`;

const ROOM_COLOR: Record<Dept, string> = {
  Management: "#7aa7ff", "Owner Acquisition": "#3d7dff", "Listings & Marketing": "#2fbf84",
  "Operations & Admin": "#e8b04a", "Legal & Compliance": "#b78cff", Finance: "#ff8f6b",
};

const page = (title: string, body: string, script = "", bodyClass = "") => `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><meta name="color-scheme" content="dark light"><title>${esc(title)}</title><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600;700&family=Manrope:wght@400;500;600;700&display=swap" rel="stylesheet"><style>${CSS}</style></head><body${bodyClass ? ` class="${bodyClass}"` : ""}>${body}${script ? `<script>${script}</script>` : ""}</body></html>`;

const LOCK = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`;
const SHIELD = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 13c0 5-3.5 7.5-7.7 9a1 1 0 0 1-.6 0C7.500 20.500 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.500-1.200 6.200-2.700a1.200 1.200 0 0 1 1.600 0C14.500 3.800 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/></svg>`;

/* The same sign-in the CRM draws: the ribbons, one glass card, the logo, the two steps, the gradient button. */
export const loginPage = () => page("AI office · Lababidi Properties", `<canvas id="ribbons" aria-hidden="true"></canvas>
<div class="si-mid"><div class="si-card"><img src="/logo-icon-white.png" alt="Lababidi Properties" width="52" height="52">
<h1 id="ttl">Lababidi AI Office</h1><p class="intro" id="intro">Owner only. Sign in with your CRM email and password. We then email you a security code.</p>
<div class="si-steps"><span id="s1" class="on">1. Password</span><span id="s2">2. Email code</span></div>
<form id="f"><div id="p1"><label><span>Email</span><input id="e" type="email" autocomplete="username"></label><label><span>Password</span><input id="p" type="password" autocomplete="current-password"></label></div>
<div id="p2" hidden><label><span>Security code</span><input id="c" class="code" inputmode="numeric" autocomplete="one-time-code" maxlength="6" placeholder="000000"></label></div>
<p class="si-msg" id="er" role="alert" hidden></p>
<button class="btn-go" id="go" type="submit">${LOCK}<span id="gl">Continue</span></button>
<div class="si-alt" id="alt" hidden><button type="button" id="back">Use a different account</button></div></form>
<p class="si-foot">${SHIELD}<span>Every sign-in is recorded. Sessions end after ten hours.</span></p></div></div>
<p class="si-copy">© Lababidi Properties · DET licence 1652937</p><script src="/ribbons.js" defer></script>`,
`const $=i=>document.getElementById(i);let step=1;
const M={invalid_credentials:"Email or password is not right.",rate_limited:"Too many attempts. Wait fifteen minutes.",wait:"Wait 30 seconds before asking for another code.",code_wrong:"That code is not right.",code_expired:"That code has expired. Sign in again.",code_locked:"Too many wrong codes. Sign in again to get a new one.",email_failed:"Your password is right, but we could not email your code.",account_disabled:"This account is blocked.",invalid:"Enter your email and password.",bad_origin:"Blocked as a cross-site request."};
function show(n,hint){step=n;$("p1").hidden=n!==1;$("p2").hidden=n!==2;$("alt").hidden=n!==2;$("s1").className=n===1?"on":"";$("s2").className=n===2?"on":"";$("ttl").textContent=n===1?"Lababidi AI Office":"Check your email";
$("intro").innerHTML=n===1?"Owner only. Sign in with your CRM email and password. We then email you a security code.":"We emailed a 6-digit code to <b>"+hint+"</b>. It expires in 10 minutes.";$("gl").textContent=n===1?"Continue":"Verify and sign in";if(n===2){$("c").value="";$("c").focus()}}
function err(t){$("er").hidden=!t;$("er").textContent=t||""}
$("c").oninput=()=>{$("c").value=$("c").value.replace(/\\D/g,"").slice(0,6)};
$("back").onclick=()=>{err("");show(1)};
$("f").onsubmit=async e=>{e.preventDefault();err("");const body=step===1?{email:$("e").value,password:$("p").value}:{code:$("c").value};
if(step===1&&(!body.email||!body.password))return err(M.invalid);if(step===2&&body.code.length!==6)return err(M.code_wrong);
$("go").disabled=true;$("gl").textContent="Checking…";
try{const r=await fetch("/api/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});const j=await r.json().catch(()=>null);
if(j&&j.ok&&j.step==="otp"){show(2,j.hint)}else if(j&&j.ok){location.href="/";return}else{const c=j&&j.error;if(c==="code_locked"||c==="code_expired"){show(1);$("p").value=""}else $("gl").textContent=step===1?"Continue":"Verify and sign in";err(M[c]||"Could not sign in.")}}
catch{err("Could not reach the server. Check your internet connection and try again.");$("gl").textContent=step===1?"Continue":"Verify and sign in"}
$("go").disabled=false};`, "signin");

const DEPTS: Dept[] = ["Management", "Owner Acquisition", "Listings & Marketing", "Operations & Admin", "Legal & Compliance", "Finance"];

export interface Stats { waiting: number; today: number; spend: number; budget: number; telegram: boolean; log: { at: string; who: string; what: string }[] }

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
</div>
<div class="floorhead"><div><h2>The office floor</h2><p class="sub" id="meetnote" style="margin:2px 0 0">The team is settling in…</p></div><div class="row" style="margin:0"><button class="btn ghost" id="playpause" type="button">Pause</button><button class="btn ghost" id="newmeet" type="button">New discussion</button></div></div>
<div class="floorwrap"><div id="floor" aria-label="The office floor: the staff at their desks"></div></div>
<div class="two"><div class="panel"><h3>What they are saying</h3><div id="transcript" aria-live="off"><div class="hist">The discussion appears here as it is spoken.</div></div></div>
<div class="panel"><h3>What really happened</h3>${s.log.length ? s.log.map((l) => `<div class="tline"><b>${esc(new Date(l.at).toLocaleString("en-GB", { timeZone: "Asia/Dubai", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }))}</b>${esc(l.who)} ${esc(l.what)}</div>`).join("") : `<div class="hist">Nothing yet. Give someone an order and it shows here.</div>`}</div></div>
${rooms}</div><script>window.OFFICE=${JSON.stringify({ colors: ROOM_COLOR, agents: ROSTER.map((a) => ({ id: a.id, name: a.name, first: a.name.split(" ")[0], title: a.title, dept: a.dept, shirt: a.look.shirt, svg: portrait(a, 48) })) }).replace(/</g, "\\u003c")}</script><script src="/office.js" defer></script>`);
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
