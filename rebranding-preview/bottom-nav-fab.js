const html = document.documentElement;
html.classList.add('dark');
const fab = document.getElementById('fab');
const speedDial = document.getElementById('speedDial');
const dimOverlay = document.getElementById('dimOverlay');
const sheet = document.getElementById('sheet');
const btnMas = document.getElementById('btn-mas');
let fabOpen = false, sheetOpen = false;
function syncOverlay() { dimOverlay.classList.toggle('open', fabOpen || sheetOpen); }
function openFab() { fabOpen = true; fab.classList.add('open'); speedDial.classList.add('open'); syncOverlay(); }
function closeFab() { fabOpen = false; fab.classList.remove('open'); speedDial.classList.remove('open'); syncOverlay(); }
function openSheet() { sheetOpen = true; sheet.classList.add('open'); closeFab(); syncOverlay(); }
function closeSheet() { sheetOpen = false; sheet.classList.remove('open'); syncOverlay(); }
fab.addEventListener('click', () => { closeSheet(); fabOpen ? closeFab() : openFab(); });
btnMas.addEventListener('click', () => { closeFab(); sheetOpen ? closeSheet() : openSheet(); });
dimOverlay.addEventListener('click', () => { closeFab(); closeSheet(); });

const gastos = [
  { n: 'Alquiler', m: '$ 680.000', s: '05/08 · Vivienda', t: '= $ 680.000', ok: 1 },
  { n: 'Expensas', m: '$ 120.000', s: '10/08 · pendiente', t: '= $ 120.000', ok: 0, p: 1 },
  { n: 'Tarjeta Visa', m: '~ $ 350.000', s: '18/08 · por confirmar', t: '+ u$d 35,50', ok: 0, pc: 1 },
  { n: 'Streaming', m: '$ 15.978', s: '02/08 · Servicios', t: '+ u$d 12,99', ok: 1 },
  { n: 'Luz (EDESUR)', m: '$ 85.000', s: '12/08 · Servicios', t: '= $ 85.000', ok: 1 },
  { n: 'Internet', m: '$ 42.000', s: '08/08 · Servicios', t: '= $ 42.000', ok: 1 }
];
document.getElementById('lista-gastos').innerHTML = gastos.map(g =>
  '<div class="flex items-center gap-3 rounded-2xl g px-3.5 py-3 ' + (g.p ? 'opacity-70' : '') + '">' +
  '<div class="w-6 h-6 shrink-0 rounded-full flex items-center justify-center text-[11px] text-white" style="' +
  (g.ok ? 'background:linear-gradient(135deg,#10b981,#34d399)' : g.pc ? 'border:2px dashed #a78bfa' : 'border:2px solid rgba(251,191,36,.7)') + '">' +
  (g.ok ? '✓' : '') + '</div>' +
  '<div class="flex-1 min-w-0"><div class="flex justify-between"><span class="text-sm font-semibold">' + g.n +
  '</span><span class="text-sm font-bold num">' + g.m + '</span></div>' +
  '<div class="flex justify-between"><span class="text-[11px] opacity-40">' + g.s + '</span><span class="text-[11px] opacity-40 num">' + g.t + '</span></div></div></div>'
).join('');

const mas = [['🗂','Agrupar'],['⚙','Presupuestos'],['🔒','Cerrar mes'],['❓','Guía'],['🔊','Sonidos'],['📤','Exportar'],['📥','Importar'],['☀️','Modo']];
document.getElementById('sheet-grid').innerHTML = mas.map(([i,l]) =>
  '<button class="sheet-item" onclick="closeSheet();alert(\'' + l + ' — demo\')"><span class="icon">' + i + '</span>' + l + '</button>'
).join('');