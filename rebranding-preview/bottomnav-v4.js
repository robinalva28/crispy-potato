(function(){
'use strict';
var fab=document.getElementById('fab'),sd=document.getElementById('sd'),ov=document.getElementById('ov'),
  sh=document.getElementById('sh'),bm=document.getElementById('btnMas'),
  btnView=document.getElementById('btnView'),btnViewLabel=document.getElementById('btnViewLabel'),
  btnViewIco=btnView.querySelector('.ico'),viewMenu=document.getElementById('viewMenu'),
  hdrTitle=document.getElementById('hdrTitle'),btnEditMes=document.getElementById('btnEditMes'),
  shItems=document.getElementById('shItems'),lista=document.getElementById('lista');
var fabOpen=false,sheetOpen=false,menuOpen=false;
/* ---------- helpers de paneles (solo uno abierto a la vez) ---------- */
function syncOverlay(){ov.classList.toggle('open',fabOpen||sheetOpen||menuOpen)}
function closeFab(){fabOpen=false;fab.classList.remove('open');sd.classList.remove('open');syncOverlay()}
function closeSheet(){sheetOpen=false;sh.classList.remove('open');syncOverlay()}
function closeMenu(){menuOpen=false;viewMenu.classList.remove('open');syncOverlay()}
function closeAll(){closeFab();closeSheet();closeMenu()}
/* ---------- FAB + Speed Dial ---------- */
fab.onclick=function(){closeSheet();closeMenu();fabOpen?closeFab():openFab()};
function openFab(){fabOpen=true;fab.classList.add('open');sd.classList.add('open');syncOverlay()}
/* ---------- Mini menú de vista ---------- */
btnView.onclick=function(){closeFab();closeSheet();menuOpen?closeMenu():openMenu()};
function openMenu(){menuOpen=true;viewMenu.classList.add('open');syncOverlay()}
viewMenu.querySelectorAll('.vm-item').forEach(function(el){
  el.onclick=function(){
    var v=el.getAttribute('data-view');
    var isPresu=v==='presupuesto';
    btnViewIco.textContent=isPresu?'📋':'💰';
    btnViewLabel.textContent=isPresu?'Presupuesto':'Ahorro';
    btnView.classList.toggle('on',isPresu);
    hdrTitle.textContent=isPresu?'Agosto 2026 · Presupuesto':'Agosto 2026 · Ahorro';
    viewMenu.querySelectorAll('.vm-item').forEach(function(x){x.classList.toggle('on',x===el)});
    closeMenu();
  };
});
/* ---------- Bottom Sheet "Más" ---------- */
bm.onclick=function(){closeFab();closeMenu();sheetOpen?closeSheet():openSheet()};
function openSheet(){sheetOpen=true;sh.classList.add('open');syncOverlay();renderSheet()}
function renderSheet(){
  var dark=document.documentElement.classList.contains('dark');
  var items=[
    ['🗂','Agrupar por categoría',null],
    ['⚙','Presupuestos por categoría',null],
    ['🔓','Reabrir mes',null],
    ['🔒','Cerrar mes',null],
    ['❓','Guía de uso',null],
    [dark?'☀️':'🌙',dark?'Modo claro':'Modo oscuro','theme'],
    ['🔊','Sonidos',null],
    ['📤','Exportar datos',null],
    ['📥','Importar datos',null]
  ];
  var trailing=dark?'<span class="trailing">Oscuro</span>':'<span class="trailing">Claro</span>';
  shItems.innerHTML=items.map(function(it){
    var ico=it[0],label=it[1],kind=it[2];
    var tr=kind==='theme'?trailing:'';
    return '<button class="sh-item" data-kind="'+(kind||'')+'"><span class="ico">'+ico+'</span>'+label+tr+'</button>';
  }).join('');
  shItems.querySelectorAll('.sh-item').forEach(function(b){
    b.onclick=function(){
      var k=b.getAttribute('data-kind');
      if(k==='theme'){
        document.documentElement.classList.toggle('dark');
        renderSheet();
        return;
      }
      var label=b.childNodes[1].textContent.trim();
      closeSheet();
      alert(label+' — demo');
    };
  });
}
/* ---------- Overlay: cierra cualquier panel + blur oscuro ---------- */
ov.onclick=closeAll;
/* ---------- Header: editar mes ---------- */
btnEditMes.onclick=function(){alert('Editar mes — demo')};
/* ---------- Speed dial actions ---------- */
document.getElementById('siAdd').onclick=function(){closeFab();alert('Agregar Gasto — demo')};
document.getElementById('siPhoto').onclick=function(){closeFab();alert('Foto de apuntes — demo')};
/* ---------- Lista demo (idéntica a v3) ---------- */
var gs=[['Alquiler','$ 680.000','05/08 · Vivienda','= $ 680.000',1],['Expensas','$ 120.000','10/08','= $ 120.000',2],['Tarjeta Visa','~ $ 350.000','18/08','+ u$d 35,50',3],['Streaming','$ 15.978','02/08 · Servicios','+ u$d 12,99',1],['Luz (EDESUR)','$ 85.000','12/08 · Servicios','= $ 85.000',1],['Internet','$ 42.000','08/08 · Servicios','= $ 42.000',1],['Super (Coto)','$ 210.000','20/08 · Otros','= $ 210.000',1],['Obra social','$ 95.000','03/08 · Salud','= $ 95.000',1],['Cable','$ 22.000','15/08','= $ 22.000',2]];
function checkSt(t){if(t===1)return'background:linear-gradient(135deg,#10b981,#34d399)';if(t===2)return'border:2px solid rgba(251,191,36,.6)';return'border:2px dashed #a78bfa'}
function tag(t){return t===2?'<span class="meta pend">pendiente</span> ':t===3?'<span class="meta porc">por confirmar</span> ':''}
lista.innerHTML=gs.map(function(g){return '<div class="gasto"><div class="check" style="'+checkSt(g[4])+'">'+(g[4]===1?'✓':'')+'</div><div class="info"><div class="l1"><span class="nombre">'+g[0]+'</span><span class="monto">'+g[1]+'</span></div><div class="l2"><span class="meta">'+g[2]+' · '+tag(g[4])+'</span><span class="sub">'+g[3]+'</span></div></div></div>'}).join('');
})();