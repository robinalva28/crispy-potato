const fab=document.getElementById('fab'),sd=document.getElementById('sd'),ov=document.getElementById('ov'),sh=document.getElementById('sh'),bm=document.getElementById('btnMas');
let fo=false,so=false;
function sy(){ov.classList.toggle('open',fo||so)}
function of(){fo=true;fab.classList.add('open');sd.classList.add('open');sy()}
function cf(){fo=false;fab.classList.remove('open');sd.classList.remove('open');sy()}
function os(){so=true;sh.classList.add('open');cf();sy()}
function cs(){so=false;sh.classList.remove('open');sy()}
fab.onclick=()=>{cs();fo?cf():of()};
bm.onclick=()=>{cf();so?cs():os()};
ov.onclick=()=>{cf();cs()};
document.getElementById('siAdd').onclick=()=>{cf();alert('Agregar Gasto — demo')};
document.getElementById('siPhoto').onclick=()=>{cf();alert('Foto de apuntes — demo')};
const gs=[['Alquiler','$ 680.000','05/08 · Vivienda','= $ 680.000',1],['Expensas','$ 120.000','10/08','= $ 120.000',2],['Tarjeta Visa','~ $ 350.000','18/08','+ u$d 35,50',3],['Streaming','$ 15.978','02/08 · Servicios','+ u$d 12,99',1],['Luz (EDESUR)','$ 85.000','12/08 · Servicios','= $ 85.000',1],['Internet','$ 42.000','08/08 · Servicios','= $ 42.000',1],['Super (Coto)','$ 210.000','20/08 · Otros','= $ 210.000',1],['Obra social','$ 95.000','03/08 · Salud','= $ 95.000',1],['Cable','$ 22.000','15/08','= $ 22.000',2]];
function checkSt(t){if(t===1)return'background:linear-gradient(135deg,#10b981,#34d399)';if(t===2)return'border:2px solid rgba(251,191,36,.6)';return'border:2px dashed #a78bfa'}
function tag(t){return t===2?'<span class="meta pend">pendiente</span> ':t===3?'<span class="meta porc">por confirmar</span> ':''}
document.getElementById('lista').innerHTML=gs.map(g=>'<div class="gasto"><div class="check" style="'+checkSt(g[4])+'">'+(g[4]===1?'✓':'')+'</div><div class="info"><div class="l1"><span class="nombre">'+g[0]+'</span><span class="monto">'+g[1]+'</span></div><div class="l2"><span class="meta">'+g[2]+' · '+tag(g[4])+'</span><span class="sub">'+g[3]+'</span></div></div></div>').join('');
const mi=[['🗂','Agrupar por categoría'],['⚙','Presupuestos por categoría'],['🔒','Cerrar mes'],['❓','Guía de uso'],['🔊','Sonidos'],['📤','Exportar datos'],['📥','Importar datos']];
document.getElementById('shItems').innerHTML=mi.map(([i,l])=>'<button class="sh-item" onclick="cs();alert(\''+l+' — demo\')"><span class="ico">'+i+'</span>'+l+'</button>').join('');