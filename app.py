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
    data = request.json or {}
    items = data.get("items", [])
    if not items:
        return jsonify({"error":"empty"}), 400
    sid, warnings, total = db.confirm_sale(items)
    return jsonify({"id":sid,"warnings":warnings,"total":total})

@app.route("/today")
def today():
    return jsonify({"sales":db.today_sales(),"total":db.today_total()})

@app.route("/inventory")
def inventory():
    return jsonify([{"id":a[0],"name":a[1],"price":a[2],"stock":a[3]} for a in db.all_articles()])

@app.route("/update_article", methods=["POST"])
def update_article():
    d = request.json
    price = int(d["price"]) if d.get("price") is not None else 0
    db.update_article(d["id"], price, int(d["stock"]))
    return jsonify({"ok":True})

if __name__ == "__main__":
    db.init_db()
    threading.Timer(1.0, lambda: webbrowser.open("http://127.0.0.1:5000/")).start()
    app.run()
