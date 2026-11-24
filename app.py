import webbrowser, threading
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

if __name__ == "__main__":
    db.init_db()
    threading.Timer(1.0, lambda: webbrowser.open("http://127.0.0.1:5000/")).start()
    app.run()
