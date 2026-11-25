import csv, os
from flask import Flask, render_template, request, jsonify
import db

app = Flask(__name__)

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/suggest")
def suggest():
    q = request.args.get("q","")
    items = db.search(q)
    return jsonify(items)

@app.route("/confirm", methods=["POST"])
def confirm():
    data = request.get_json(silent=True) or {}
    items = data.get("items")
    if not isinstance(items, list) or not items:
        return jsonify({"error": "empty"}), 400
    try:
        normalized = []
        for it in items:
            if not isinstance(it, dict):
                return jsonify({"error": "bad item"}), 400
            normalized.append({"article_id": int(it["article_id"]), "qty": int(it["qty"])})
        sid, warnings, total = db.confirm_sale(normalized)
    except (KeyError, TypeError, ValueError) as e:
        return jsonify({"error": str(e)}), 400
    return jsonify({"id": sid, "warnings": warnings, "total": total})

@app.route("/today")
def today():
    return jsonify({"sales":db.today_sales(),"total":db.today_total()})

@app.route("/inventory")
def inventory():
    return render_template("inventory.html")

@app.route("/api/inventory")
def api_inventory():
    return jsonify([{"id": a[0], "name": a[1], "price": a[2], "stock": a[3], "address": a[4]} for a in db.all_articles()])

@app.route("/api/update_article", methods=["POST"])
def api_update_article():
    d = request.get_json(silent=True)
    if not isinstance(d, dict):
        return jsonify({"error": "bad request"}), 400
    try:
        aid = int(d["id"])
        price = int(d.get("price", 0))
        stock = int(d.get("stock", 0))
        address = (d.get("address") or "").strip()
    except (KeyError, TypeError, ValueError) as e:
        return jsonify({"error": str(e)}), 400
    db.update_article(aid, price, stock, address)
    return jsonify({"ok": True})

@app.route("/api/add_article", methods=["POST"])
def api_add_article():
    d = request.get_json(silent=True)
    if not isinstance(d, dict):
        return jsonify({"error": "bad request"}), 400
    try:
        name = (d.get("name") or "").strip()
        address = (d.get("address") or "").strip()
        price = int(d.get("price", 0) or 0)
        stock = int(d.get("stock", 0) or 0)
        article = db.add_article(name, price, stock, address)
    except (KeyError, TypeError, ValueError) as e:
        return jsonify({"error": str(e)}), 400
    return jsonify(article)


@app.route("/incoming")
def incoming_page():
    return render_template("incoming.html")


@app.route("/api/incoming", methods=["GET"])
def api_incoming_list():
    status = request.args.get("status")
    if status == "":
        status = None
    return jsonify(db.list_incoming_items(status))


@app.route("/api/incoming", methods=["POST"])
def api_incoming_add():
    d = request.get_json(silent=True)
    if not isinstance(d, dict):
        return jsonify({"error": "bad request"}), 400
    try:
        product_name = (d.get("product_name") or "").strip()
        source_image = (d.get("source_image") or "").strip()
        note = (d.get("note") or "").strip()
        qty_bought = int(d.get("qty_bought", 0))
        unit_purchase_price = int(d.get("unit_purchase_price", 0) or 0)
        sell_price = int(d.get("sell_price", 0) or 0)
        item = db.add_incoming_item(source_image, product_name, qty_bought, unit_purchase_price, sell_price, note)
    except (KeyError, TypeError, ValueError) as e:
        return jsonify({"error": str(e)}), 400
    return jsonify(item)


@app.route("/api/incoming/import_csv", methods=["POST"])
def api_incoming_import_csv():
    base_dir = os.path.dirname(__file__)
    csv_path = os.path.join(base_dir, "incoming_photos", "facture_produits_prix.csv")
    if not os.path.exists(csv_path):
        return jsonify({"error": "CSV file not found: incoming_photos/facture_produits_prix.csv"}), 400
    added = 0
    errors = []
    try:
        with open(csv_path, newline="", encoding="utf-8-sig") as f:
            r = csv.DictReader(f)
            for i, row in enumerate(r, start=2):  # data starts line 2
                try:
                    name = (row.get("Product Name") or "").strip()
                    if not name:
                        errors.append(f"row {i}: empty name"); continue
                    qty_raw = (row.get("Quantity Bought") or "").strip()
                    up_raw = (row.get("Unit Purchase Price") or "").strip()
                    sp_raw = (row.get("Selling Price") or "").strip()
                    qty_bought = int(float(qty_raw.replace(",", "."))) if qty_raw != "" else 0
                    # convert decimal to scaled int (e.g. 16.425 -> 16425)
                    unit_purchase_price = int(round(float(up_raw.replace(",", ".")) * 1000)) if up_raw != "" else 0
                    sell_price = int(round(float(sp_raw.replace(",", ".")) * 1000)) if sp_raw != "" else 0
                    db.add_incoming_item("facture.jpeg", name, qty_bought, unit_purchase_price, sell_price, "imported from facture_produits_prix.csv")
                    added += 1
                except Exception as e:
                    errors.append(f"row {i}: {e}")
    except Exception as e:
        return jsonify({"error": str(e)}), 400
    return jsonify({"added": added, "errors": errors[:20]})


@app.route("/api/incoming/<int:item_id>/approve", methods=["POST"])
def api_incoming_approve(item_id):
    try:
        res = db.approve_incoming_item(item_id)
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    return jsonify({"ok": True, **res})


@app.route("/api/incoming/<int:item_id>/reject", methods=["POST"])
def api_incoming_reject(item_id):
    try:
        res = db.reject_incoming_item(item_id)
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    return jsonify({"ok": True, **res})


if __name__ == "__main__":
    db.init_db()
    app.run(host="0.0.0.0", port=5000)
