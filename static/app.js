let items=[], sel=null, suggestions=[], currentQty=1;
const q=document.getElementById("q"), sug=document.getElementById("sug"), qtybox=document.getElementById("qtybox");
const qty=document.getElementById("qty"), basket=document.getElementById("basket"), warn=document.getElementById("warn");
function fmt(m){return (m/1000).toFixed(3);}
function esc(s){return String(s).replace(/[&<>"']/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));}
function renderSug(list){
  suggestions=list;
  sug.innerHTML=list.map((it,i)=>`<li data-i="${i}">${esc(it.name)} — ${it.price?fmt(it.price):"—"} TND — stock ${it.stock}</li>`).join("");
  [...sug.children].forEach((li,i)=>li.onclick=()=>pick(i));
}
async function search(){
  try{
    const r=await fetch("/suggest?q="+encodeURIComponent(q.value));
    if(!r.ok) throw new Error("search failed");
    renderSug(await r.json());
  }catch(_){
    suggestions=[]; sug.innerHTML="";
  }
}
q.addEventListener("input", search);
q.addEventListener("keydown", e=>{
  if(e.key==="ArrowDown"||e.key==="ArrowUp"){
    e.preventDefault();
  }
  if(e.key==="Enter"){
    const li=sug.querySelector("li");
    if(li){ li.click(); }
  }
});
function pick(i){
  const it=suggestions[i];
  if(!it) return;
  sel=it;
  sug.innerHTML=""; suggestions=[];
  q.value=sel.name;
  currentQty=1; qty.value=1; qtybox.style.display="block"; qty.focus();
}
function commitQty(){
  if(!sel) return;
  let v=parseInt(qty.value); if(!v||v<1) v=1;
  addToBasket(sel, v);
  qtybox.style.display="none";
  q.value=""; sel=null; q.focus();
}
qty.addEventListener("keydown", e=>{
  if(e.key==="Enter"){ e.preventDefault(); commitQty(); }
});
document.getElementById("addbtn").onclick=commitQty;
function addToBasket(it, qtyv){
  const ex=items.find(x=>x.article_id===it.id);
  if(ex){ ex.qty+=qtyv; }
  else { items.push({article_id:it.id,name:it.name,unit_price:it.price,qty:qtyv}); }
  renderBasket();
}
function renderBasket(){
  let total=0;
  basket.innerHTML="<tr><th>Name</th><th>Price</th><th>Qty</th><th>Line</th><th></th></tr>"+
    items.map((it,i)=>{const line=(it.unit_price||0)*it.qty; total+=line; const p=it.unit_price?fmt(it.unit_price):"—"; const l=it.unit_price?fmt(line):"—"; return `<tr><td>${esc(it.name)}</td><td>${p}</td><td>${it.qty}</td><td>${l}</td><td><button onclick="removeItem(${i})">x</button></td></tr>`;}).join("");
  document.getElementById("btotal").textContent=fmt(total);
}
function removeItem(i){ items.splice(i,1); renderBasket(); }
document.getElementById("clear").onclick=()=>{items=[];renderBasket();};
document.getElementById("confirm").onclick=async ()=>{
  if(!items.length) return;
  const btn=document.getElementById("confirm");
  btn.disabled=true;
  warn.textContent="";
  try{
    const r=await fetch("/confirm",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({items:items.map(x=>({article_id:x.article_id,qty:x.qty}))})});
    const d=await r.json().catch(()=>({}));
    if(!r.ok){
      warn.textContent=d.error ? String(d.error) : "Sale failed.";
      return;
    }
    if(d.warnings&&d.warnings.length) warn.textContent=d.warnings.join("; ");
    items=[]; renderBasket();
    loadToday();
  }catch(_){
    warn.textContent="Sale failed.";
  }finally{
    btn.disabled=false;
  }
};
async function loadToday(){
  try{
    const r=await fetch("/today"); if(!r.ok) throw new Error("today failed");
    const d=await r.json();
    let html="";
    for(const s of d.sales){
      html+=`<div><strong>Sale ${s.id}</strong> ${esc(s.sold_at)}<br>`;
      for(const it of s.items) html+=`&nbsp;&nbsp;${esc(it[0])} x${it[1]} = ${fmt(it[1]*it[2])}<br>`;
      html+=`Total ${fmt(s.total)}</div><hr>`;
    }
    html+=`<strong>Day total ${fmt(d.total)} TND</strong>`;
    document.getElementById("today").innerHTML=html;
  }catch(_){
    document.getElementById("today").textContent="Could not load today's sales.";
  }
}

loadToday();
