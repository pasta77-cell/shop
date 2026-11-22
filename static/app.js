let items=[], sel=null, currentQty=1;
const q=document.getElementById("q"), sug=document.getElementById("sug"), qtybox=document.getElementById("qtybox");
const qty=document.getElementById("qty"), basket=document.getElementById("basket"), warn=document.getElementById("warn");
function fmt(m){return (m/1000).toFixed(3);}
function renderSug(list){
  sug.innerHTML=list.map((it,i)=>`<li data-i="${i}">${it.name} — ${it.price?fmt(it.price):"—"} TND — stock ${it.stock}</li>`).join("");
  [...sug.children].forEach((li,i)=>li.onclick=()=>pick(i));
}
async function search(){
  const r=await fetch("/suggest?q="+encodeURIComponent(q.value));
  const list=await r.json();
  renderSug(list);
}
q.addEventListener("input", search);
q.addEventListener("keydown", e=>{
  if(e.key==="ArrowDown"||e.key==="ArrowUp"){
    // simple: move selection
    e.preventDefault();
  }
  if(e.key==="Enter"){
    const li=sug.querySelector("li"); // top
    if(li){ li.click(); }
  }
});
function pick(i){
  const li=sug.children[i];
  // need item data; re-fetch
  fetch("/suggest?q="+encodeURIComponent(q.value)).then(r=>r.json()).then(list=>{
    sel=list[i];
    sug.innerHTML="";
    q.value=sel.name;
    currentQty=1; qty.value=1; qtybox.style.display="block"; qty.focus();
  });
}
qty.addEventListener("keydown", e=>{
  if(e.key==="Enter"){
    let v=parseInt(qty.value); if(!v||v<1) v=1;
    addToBasket(sel, v);
    qtybox.style.display="none";
    q.value=""; sel=null; q.focus();
  }
});
function addToBasket(it, qtyv){
  const ex=items.find(x=>x.article_id===it.id);
  if(ex){ ex.qty+=qtyv; }
  else { items.push({article_id:it.id,name:it.name,unit_price:it.price,qty:qtyv}); }
  renderBasket();
}
function renderBasket(){
  let total=0;
  basket.innerHTML="<tr><th>Name</th><th>Price</th><th>Qty</th><th>Line</th><th></th></tr>"+
    items.map((it,i)=>{const line=it.unit_price*it.qty; total+=line; return `<tr><td>${it.name}</td><td>${fmt(it.unit_price)}</td><td>${it.qty}</td><td>${fmt(line)}</td><td><button onclick="removeItem(${i})">x</button></td></tr>`;}).join("");
  document.getElementById("btotal").textContent=fmt(total);
}
function removeItem(i){ items.splice(i,1); renderBasket(); }
document.getElementById("clear").onclick=()=>{items=[];renderBasket();};
document.getElementById("confirm").onclick=async ()=>{
  if(!items.length) return;
  document.getElementById("confirm").disabled=true;
  const r=await fetch("/confirm",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({items:items.map(x=>({article_id:x.article_id,qty:x.qty})})});
  const d=await r.json();
  document.getElementById("confirm").disabled=false;
  if(d.warnings&&d.warnings.length) warn.textContent=d.warnings.join("; ");
  else warn.textContent="";
  items=[]; renderBasket();
  loadToday();
};
async function loadToday(){
  const r=await fetch("/today"); const d=await r.json();
  let html=""; let tot=0;
  for(const s of d.sales){
    html+=`<div><strong>Sale ${s.id}</strong> ${s.sold_at}<br>`;
    for(const it of s.items) html+=`&nbsp;&nbsp;${it[0]} x${it[1]} = ${fmt(it[1]*it[2])}<br>`;
    html+=`Total ${fmt(s.total)}</div><hr>`;
    tot+=s.total;
  }
  html+=`<strong>Day total ${fmt(tot)} TND</strong>`;
  document.getElementById("today").innerHTML=html;
}
document.getElementById("invbtn").onclick=async ()=>{
  const box=document.getElementById("inv");
  if(box.style.display==="block"){box.style.display="none";return;}
  const r=await fetch("/inventory"); const list=await r.json();
  box.innerHTML="<input id='invq' placeholder='search'><table id='invt'></table>";
  const render=(filter)=>{
    const t=document.getElementById("invt");
    t.innerHTML="<tr><th>Name</th><th>Price</th><th>Stock</th></tr>"+
      list.filter(x=>x.name.toLowerCase().includes((filter||"").toLowerCase())).map(x=>
        `<tr><td>${x.name}</td><td><input data-id="${x.id}" class="ip" value="${x.price/1000}" style="width:70px"></td><td><input data-id="${x.id}" class="is" value="${x.stock}" style="width:60px"></td><td><button data-id="${x.id}" class="save">save</button></td></tr>`).join("");
    t.querySelectorAll(".save").forEach(b=>b.onclick=async ()=>{
      const id=b.dataset.id;
      const price=Math.round(parseFloat(t.querySelector(`.ip[data-id="${id}"]`).value)*1000);
      const stock=parseInt(t.querySelector(`.is[data-id="${id}"]`).value);
      await fetch("/update_article",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({id,price,stock})});
    });
  };
  render("");
  document.getElementById("invq").oninput=e=>render(e.target.value);
  box.style.display="block";
};
loadToday();
