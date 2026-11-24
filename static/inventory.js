let list=[];
const invt=document.getElementById("invt");
const invq=document.getElementById("invq");
const invstatus=document.getElementById("invstatus");
const invcount=document.getElementById("invcount");
const addstatus=document.getElementById("addstatus");
const LIMIT=100;
let searchTimer=null;
function fmt(m){return (m/1000).toFixed(3);}
function esc(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));}
function setInvStatus(msg){invstatus.textContent=msg;}
function setAddStatus(msg,err){addstatus.textContent=msg; addstatus.style.color=err?"#b00":"#060";}

function render(filter){
  const q=(filter||"").toLowerCase();
  const matches=list.filter(x=>x.name.toLowerCase().includes(q) || (x.address||"").toLowerCase().includes(q));
  const shown=matches.slice(0,LIMIT);
  invcount.textContent = matches.length>LIMIT ? `Showing ${shown.length} of ${matches.length} matches — refine search` : `${matches.length} item${matches.length===1?"":"s"}`;
  invt.innerHTML="<tr><th>Name</th><th>Price (TND)</th><th>Stock</th><th>Address</th><th></th></tr>"+
    shown.map(x=>
      `<tr>
        <td>${esc(x.name)}</td>
        <td><input data-id="${x.id}" class="ip" value="${x.price?fmt(x.price):"0.000"}" style="width:80px"></td>
        <td><input data-id="${x.id}" class="is" value="${x.stock}" style="width:70px"></td>
        <td><input data-id="${x.id}" class="ia" value="${esc(x.address||"")}" style="width:160px"></td>
        <td><button data-id="${x.id}" class="save">Save</button></td>
      </tr>`).join("");
}

invt.addEventListener("click", async e=>{
  const b=e.target.closest(".save");
  if(!b) return;
  const id=Number(b.dataset.id);
  const priceVal=parseFloat(invt.querySelector(`.ip[data-id="${id}"]`).value);
  const stockVal=parseInt(invt.querySelector(`.is[data-id="${id}"]`).value,10);
  const address=invt.querySelector(`.ia[data-id="${id}"]`).value.trim();
  const price=Number.isFinite(priceVal)?Math.round(priceVal*1000):0;
  const stock=Number.isFinite(stockVal)?stockVal:0;
  b.disabled=true; b.textContent="..."; setInvStatus("");
  try{
    const r=await fetch("/api/update_article",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({id,price,stock,address})});
    const d=await r.json().catch(()=>({}));
    if(!r.ok) throw new Error(d.error||"save failed");
    const art=list.find(x=>x.id===id);
    if(art){ art.price=price; art.stock=stock; art.address=address; }
    b.textContent="Saved"; setInvStatus("Saved.");
  }catch(err){
    b.textContent="Error"; setInvStatus(String(err.message||"Could not save."));
  }
  b.disabled=false;
  setTimeout(()=>{ b.textContent="Save"; setInvStatus(""); },1200);
});

async function load(){
  try{
    const r=await fetch("/api/inventory");
    if(!r.ok) throw new Error("load failed");
    list=await r.json();
    render(invq.value);
  }catch(_){
    setInvStatus("Could not load inventory.");
  }
}

invq.addEventListener("input", e=>{
  clearTimeout(searchTimer);
  const v=e.target.value;
  searchTimer=setTimeout(()=>render(v), 200);
});

document.getElementById("add-product").onclick=async ()=>{
  const btn=document.getElementById("add-product");
  const name=document.getElementById("new-name").value.trim();
  const priceVal=parseFloat(document.getElementById("new-price").value);
  const stockVal=parseInt(document.getElementById("new-stock").value,10);
  const address=document.getElementById("new-address").value.trim();
  const price=Number.isFinite(priceVal)?Math.round(priceVal*1000):0;
  const stock=Number.isFinite(stockVal)?stockVal:0;
  btn.disabled=true; setAddStatus("Adding...", false);
  try{
    const r=await fetch("/api/add_article",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({name,price,stock,address})});
    const d=await r.json().catch(()=>({}));
    if(!r.ok) throw new Error(d.error||"Could not add product");
    document.getElementById("new-name").value="";
    document.getElementById("new-price").value="";
    document.getElementById("new-stock").value="";
    document.getElementById("new-address").value="";
    setAddStatus("Product added.", false);
    await load();
  }catch(err){
    setAddStatus(String(err.message||"Could not add product"), true);
  }finally{
    btn.disabled=false;
  }
};

load();