import { CONFIG } from './config.js';
import { API } from './api.js';

// =============================
// DOM HELPERS
// =============================
export function $(sel){ return document.querySelector(sel); }
export function el(tag, attrs={}, children=[]){
  const d = document.createElement(tag);
  Object.entries(attrs).forEach(([k,v])=>{
    if(k==='class') d.className = v;
    else if(k.startsWith('on')) d.addEventListener(k.slice(2), v);
    else d.setAttribute(k,v);
  });
  (Array.isArray(children)?children:[children]).forEach(c=>{
    if(typeof c==='string') d.appendChild(document.createTextNode(c));
    else if(c) d.appendChild(c);
  });
  return d;
}

// =============================
// MODAL UI GENERATOR
// =============================
export function openModal(html){
  const root = document.getElementById('modal-root');
  root.innerHTML = `
  <div class="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
    <div class="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-4">
      ${html}
      <div class="mt-3 text-right">
        <button id='modal-close' class='px-3 py-1 border rounded'>Close</button>
      </div>
    </div>
  </div>`;
  document.getElementById('modal-close').onclick = ()=> root.innerHTML='';
}

export function notify(msg){ alert(msg); }

// =============================
// AUTH BUTTON RENDERER
// =============================
export function renderAuthArea(getToken, openLogin, openRegister, logout){
  const authArea = $('#auth-area'); authArea.innerHTML='';
  if(!getToken()){
    const btnLogin = el('button',{ class:'px-3 py-1 border rounded', onclick: openLogin },'Login');
    const btnReg = el('button',{ class:'px-3 py-1 border rounded ml-2', onclick: openRegister },'Register');
    authArea.appendChild(btnLogin); authArea.appendChild(btnReg);
  } else {
    const span = el('span',{ class:'muted mr-2' },'Signed in');
    const btnOut = el('button',{ class:'px-3 py-1 border rounded', onclick: logout },'Logout');
    authArea.appendChild(span); authArea.appendChild(btnOut);
  }
}

// =============================
// INITIAL PAGE UI BUILDER
// =============================
export function initUI(){

  // LEFT — Quick Add Expense
  document.getElementById('quick-add-card').innerHTML = `
    <h3 class='font-medium mb-2'>Quick Add Expense</h3>
    <form id='quick-add-form' class='space-y-2'>
      <select id='quick-category' class='w-full p-2 border rounded'><option>Loading...</option></select>
      <input id='quick-amount' type='number' placeholder='Amount' class='w-full p-2 border rounded'/>
      <input id='quick-desc' type='text' placeholder='Description optional' class='w-full p-2 border rounded'/>
      <div class='flex gap-2'>
        <button id='btn-quick-add' class='flex-1 bg-blue-600 text-white p-2 rounded'>Add</button>
        <button id='btn-export' type='button' class='flex-1 border p-2 rounded'>Export CSV</button>
      </div>
    </form>`;

  // LEFT — Filters
  document.getElementById('filters-card').innerHTML = `
    <h3 class='font-medium'>Filters</h3>
    <div class='mt-2 space-y-2'>
      <select id='filter-category' class='w-full p-2 border rounded'></select>
      <input id='filter-from' type='date' class='w-full p-2 border rounded'/>
      <input id='filter-to' type='date' class='w-full p-2 border rounded'/>
      <div class='flex gap-2'>
        <button id='btn-apply-filters' class='flex-1 bg-green-600 text-white p-2 rounded'>Apply</button>
        <button id='btn-clear-filters' class='flex-1 border p-2 rounded'>Clear</button>
      </div>
    </div>`;

  document.getElementById('insights-card').innerHTML = `
    <h3 class='font-medium'>Insights</h3>
    <div id='insights' class='mt-2 muted'>Login to view analytics</div>`;

  // MIDDLE — Chart
  document.getElementById('dashboard-card').innerHTML = `
    <div class='flex items-start justify-between'>
      <div>
        <h2 class='text-lg font-semibold'>Dashboard</h2>
        <div class='muted'>Analisa pengeluaran</div>
      </div>
      <div>
        <select id='chart-range' class='p-2 border rounded'>
          <option value='7'>7 hari</option>
          <option value='30' selected>30 hari</option>
          <option value='365'>1 tahun</option>
          <option value='custom'>Custom</option>
        </select>
      </div>
    </div>
    <canvas id='expenses-chart' class='mt-4' height='170'></canvas>`;

  // MIDDLE — Expense List
  document.getElementById('recent-card').innerHTML = `
    <h3 class='font-medium'>Recent Expenses</h3>
    <ul id='expenses-list' class='space-y-2 max-h-64 overflow-auto mt-3'></ul>`;

  // MIDDLE — Calendar Heatmap style
  document.getElementById('calendar-card').innerHTML = `
    <h3 class='font-medium'>Calendar</h3>
    <div id='calendar' class='mt-2 grid grid-cols-7 gap-1 text-sm'></div>`;

  // RIGHT — Categories
  document.getElementById('categories-card').innerHTML = `
    <div class='flex items-center justify-between mb-2'>
      <h3 class='font-medium'>Categories</h3>
      <button id='btn-new-cat' class='text-sm border px-2 py-1 rounded'>New</button>
    </div>
    <ul id='categories-list' class='space-y-2 max-h-64 overflow-auto'></ul>`;

  // RIGHT — Settings
  document.getElementById('settings-card').innerHTML = `
    <h3 class='font-medium'>Settings</h3>
    <div class='mt-2'>
      <label class='flex items-center gap-2'>
        <input id='notif-toggle' type='checkbox'> Spending limit notification
      </label>
      <input id='spend-limit' type='number' placeholder='Daily limit (IDR)' class='w-full p-2 border rounded mt-2'>
      <div class='muted mt-2'>Akan muncul peringatan jika melewati limit.</div>
    </div>`;

  // THEME SWITCH
  document.getElementById('btn-theme').onclick = ()=>document.documentElement.classList.toggle('dark');
}

// =============================
// GLOBAL EVENTS
// =============================
window.addEventListener('keydown', e=>{
  if(e.key==='/' && document.activeElement.tagName !== 'INPUT'){
    e.preventDefault();
    const q = prompt('Search expenses (category/desc)');
    if(q) window.dispatchEvent(new CustomEvent('et:search',{detail:q}));
  }
});

export function checkSpendingWarning(expenses){
  const toggle=$('#notif-toggle'); const limit=Number($('#spend-limit')?.value||0);
  if(!toggle?.checked||!limit) return;
  const today=new Date().toISOString().slice(0,10);
  const total=expenses.filter(e=>e.created_at?.startsWith(today))
                      .reduce((s,a)=>s+Number(a.amount),0);
  if(total>limit) alert(`⚠ Limit harian terlampaui Rp ${total.toLocaleString()}`);
}

export function triggerRefresh(){
  window.dispatchEvent(new Event('et:refresh'));
}
