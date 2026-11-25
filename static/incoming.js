let items = [];
const table = document.getElementById("incomingt");
const statusFilter = document.getElementById("status-filter");
const addstatus = document.getElementById("addstatus");
const liststatus = document.getElementById("liststatus");
const importstatus = document.getElementById("importstatus");

function fmt(m) { return (m / 1000).toFixed(3); }
function esc(s) { return String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[c])); }
function setAddStatus(msg, err) { addstatus.textContent = msg; addstatus.style.color = err ? "#b00" : "#060"; }
function setListStatus(msg) { liststatus.textContent = msg; }

function render() {
  if (!items.length) {
    table.innerHTML = "<tr><td>No items.</td></tr>";
    return;
  }
  let html = "<tr><th>ID</th><th>Source</th><th>Product name</th><th>Qty</th><th>Unit purchase (TND)</th><th>Selling price (TND)</th><th>Status</th><th>Note</th><th>Actions</th></tr>";
  for (const x of items) {
    html += `<tr>
      <td>${x.id}</td>
      <td>${esc(x.source_image || "")}</td>
      <td>${esc(x.product_name)}</td>
      <td>${x.qty_bought}</td>
      <td>${fmt(x.unit_purchase_price)}</td>
      <td>${fmt(x.sell_price)}</td>
      <td>${esc(x.status)}</td>
      <td>${esc(x.note || "")}</td>
      <td>`;
    if (x.status === "pending") {
      html += `<button data-id="${x.id}" class="approve">Approve</button> <button data-id="${x.id}" class="reject">Reject</button>`;
    } else {
      html += "-";
    }
    html += `</td></tr>`;
  }
  table.innerHTML = html;
}

async function load() {
  setListStatus("Loading...");
  try {
    const st = statusFilter.value;
    const url = "/api/incoming" + (st ? ("?status=" + encodeURIComponent(st)) : "");
    const r = await fetch(url);
    if (!r.ok) throw new Error("load failed");
    items = await r.json();
    render();
    setListStatus("");
  } catch (e) {
    setListStatus("Could not load.");
  }
}

statusFilter.addEventListener("change", load);

const importBtn = document.getElementById("import-csv");
if (importBtn) {
  importBtn.addEventListener("click", async () => {
    importBtn.disabled = true;
    importstatus.textContent = "Importing...";
    importstatus.style.color = "#000";
    try {
      const r = await fetch("/api/incoming/import_csv", { method: "POST" });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || "Import failed");
      let msg = `Imported ${d.added} item(s).`;
      if (d.errors && d.errors.length) msg += ` Errors: ${d.errors.slice(0, 5).join(" | ")}`;
      importstatus.textContent = msg;
      importstatus.style.color = d.errors && d.errors.length ? "#b00" : "#060";
      await load();
    } catch (err) {
      importstatus.textContent = String(err.message || "Import failed");
      importstatus.style.color = "#b00";
    } finally {
      importBtn.disabled = false;
    }
  });
}

table.addEventListener("click", async (e) => {
  const btnApprove = e.target.closest(".approve");
  const btnReject = e.target.closest(".reject");
  if (btnApprove) {
    const id = Number(btnApprove.dataset.id);
    btnApprove.disabled = true;
    try {
      const r = await fetch(`/api/incoming/${id}/approve`, { method: "POST" });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || "approve failed");
      await load();
    } catch (err) {
      alert(String(err.message || "Could not approve"));
      btnApprove.disabled = false;
    }
    return;
  }
  if (btnReject) {
    const id = Number(btnReject.dataset.id);
    btnReject.disabled = true;
    try {
      const r = await fetch(`/api/incoming/${id}/reject`, { method: "POST" });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || "reject failed");
      await load();
    } catch (err) {
      alert(String(err.message || "Could not reject"));
      btnReject.disabled = false;
    }
    return;
  }
});

document.getElementById("add-incoming").onclick = async () => {
  const btn = document.getElementById("add-incoming");
  const product_name = document.getElementById("in-name").value.trim();
  const source_image = document.getElementById("in-source").value.trim();
  const qtyVal = parseInt(document.getElementById("in-qty").value, 10);
  const purchaseVal = parseFloat(document.getElementById("in-purchase").value);
  const sellVal = parseFloat(document.getElementById("in-sell").value);
  const note = document.getElementById("in-note").value.trim();
  const qty_bought = Number.isFinite(qtyVal) ? qtyVal : 0;
  const unit_purchase_price = Number.isFinite(purchaseVal) ? Math.round(purchaseVal * 1000) : 0;
  const sell_price = Number.isFinite(sellVal) ? Math.round(sellVal * 1000) : 0;
  btn.disabled = true;
  setAddStatus("Adding...", false);
  try {
    const r = await fetch("/api/incoming", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ product_name, source_image, qty_bought, unit_purchase_price, sell_price, note })
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(d.error || "Could not add");
    document.getElementById("in-name").value = "";
    document.getElementById("in-qty").value = "";
    document.getElementById("in-purchase").value = "";
    document.getElementById("in-sell").value = "";
    document.getElementById("in-note").value = "";
    setAddStatus("Added.", false);
    await load();
  } catch (err) {
    setAddStatus(String(err.message || "Could not add"), true);
  } finally {
    btn.disabled = false;
  }
};

load();