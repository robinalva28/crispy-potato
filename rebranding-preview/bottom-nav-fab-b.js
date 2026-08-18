const html=document.documentElement;html.classList.add('dark');
const fab=document.getElementById('fab'),sd=document.getElementById('sd'),ov=document.getElementById('ov'),sh=document.getElementById('sh'),bm=document.getElementById('btnMas');
let fo=false,so=false;
function sy(){ov.classList.toggle('open',fo||so);}
function of(){fo=true;fab.classList.add('open');sd.classList.add('open');sy();}
function cf(){fo=false;fab.classList.remove('open');sd.classList.remove('open');sy();}
function os(){so=true;sh.classList.add('open');cf();sy();}
function cs(){so=false;sh.classList.remove('open');sy();}
fab.onclick=()=>{cs();fo?cf():of();};
bm.onclick=()=>{cf();so?cs():os();};
ov.onclick=()=>{cf();cs();};
const gs=[['Alquiler','$ 680.000','05/08 · Vivienda','= $ 680.000',1],['Expensas','$ 120.000','10/08 · pendiente','= $ 120.000',0],['Tarjeta Visa','~ $ 350.000','18/08 · por confirmar','+ u$d 35,50',0],['Streaming','$ 15.978','02/08 · Servicios','+ u$d 12,99',1],['Luz (EDESUR)','$ 85.000','12/08 · Servicios','= $ 85.000',1],['Internet','$ 42.000','08/08 · Servicios','= $ 42.000',1]];
document.getElementById('lista').innerHTML=gs.map(g=>'<div class="row g"><div style="width:24px;height:24px;border-radius:9999px;display:flex;align-items:center;justify-content:center;font-size:11px;color:#fff;flex-shrink:0;background:'+(g[4]?'linear-gradient(135deg,#10b981,#34d399)':'transparent;border:2px solid rgba(251,191,36,.7)')+'">'+(g[4]?'✓':'')+'</div><div style="flex:1;min-width:0"><div style="display:flex;justify-content:space-between"><span style="font-size:14px;font-weight:600">'+g[0]+'</span><span style="font-size:14px;font-weight:700" class="num">'+g[1]+'</span></div><div style="display:flex;justify-content:space-between;opacity:.4;font-size:11px"><span>'+g[2]+'</span><span class="num">'+g[3]+'</span></div></div></div>').join('');
const mi=[['🗂','Agrupar'],['⚙','Presupuestos'],['🔒','Cerrar mes'],['❓','Guía'],['🔊','Sonidos'],['📤','Exportar'],['📥','Importar'],['☀️','Modo']];
document.getElementById('shGrid').innerHTML=mi.map(([i,l])=>'<button class="sh-i" onclick="cs();alert(\''+l+' — demo\')"><i>'+i+'</i>'+l+'</button>').join('');