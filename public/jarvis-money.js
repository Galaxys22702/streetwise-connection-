'use strict';
(() => {
  const key='jarvis.money.inventory.v1', reviewKey='jarvis.money.review.v1';
  const $=id=>document.getElementById(id);
  let beats=[];
  try {const v=JSON.parse(localStorage.getItem(key)||'[]');beats=Array.isArray(v)?v.filter(x=>x&&typeof x.title==='string').slice(0,500):[]} catch {beats=[]}
  const money=n=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(n);
  function recalc(){const p=Math.max(0,Number($('price').value)||0),s=Math.max(0,Number($('sales').value)||0);$('revenue').textContent=money(p*s)}
  function draw(){
    const inventory=$('inventory');inventory.replaceChildren();
    if(!beats.length){const li=document.createElement('li');li.textContent='No beats entered yet.';inventory.append(li)}
    beats.forEach((b,i)=>{const li=document.createElement('li');const text=document.createElement('span');text.textContent=b.title+' • '+(b.genre||'Uncategorized')+' • '+b.license+' ';const remove=document.createElement('button');remove.type='button';remove.className='secondary';remove.textContent='Remove';remove.setAttribute('aria-label','Remove '+b.title);remove.addEventListener('click',()=>{beats.splice(i,1);save();draw()});li.append(text,remove);inventory.append(li)});
    const gates=$('gates');gates.replaceChildren();[
      ['Inventory entered',beats.length>0],['Rights reviewed for every beat',beats.length>0&&beats.every(b=>b.license!=='draft')],['All beats marked ready for review',beats.length>0&&beats.every(b=>b.license==='ready-for-review')],['Payment / delivery integration verified',false],['Publishing approved',false]
    ].forEach(([label,done])=>{const li=document.createElement('li');li.textContent=(done?'✓ ':'○ ')+label;gates.append(li)});
    $('approval').textContent=localStorage.getItem(reviewKey)==='yes'?'Preparation reviewed locally • Launch NOT APPROVED':'Launch status: NOT APPROVED';
  }
  function save(){try{localStorage.setItem(key,JSON.stringify(beats));$('notice').textContent='Saved to this browser.'}catch{$('notice').textContent='Could not save. Export a backup.'}}
  $('price').addEventListener('input',recalc);$('sales').addEventListener('input',recalc);
  $('beatForm').addEventListener('submit',e=>{e.preventDefault();const title=$('title').value.trim(),genre=$('genre').value.trim(),license=$('license').value;if(!title||beats.length>=500)return;beats.push({title,genre,license});save();$('beatForm').reset();draw()});
  $('review').addEventListener('click',()=>{localStorage.setItem(reviewKey,'yes');draw()});
  $('clear').addEventListener('click',()=>{if(!confirm('Delete ALL locally stored Money Mode beats on this browser? This cannot be undone without a backup.'))return;beats=[];localStorage.removeItem(key);localStorage.removeItem(reviewKey);draw();$('notice').textContent='Local inventory deleted.'});
  $('export').addEventListener('click',()=>{const blob=new Blob([JSON.stringify({version:1,beats,exportedAt:new Date().toISOString()},null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='jarvis-money-beats.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),500)});
  recalc();draw();
})();