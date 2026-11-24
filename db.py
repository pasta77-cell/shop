import sqlite3, csv, unicodedata, re, os
from datetime import datetime

DB = os.path.join(os.path.dirname(__file__), "shop.db")

def get_conn():
    c = sqlite3.connect(DB)
    c.execute("PRAGMA foreign_keys=ON")
    return c

def init_db():
    c = get_conn()
    c.executescript("""
    CREATE TABLE IF NOT EXISTS articles(
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      name_norm TEXT NOT NULL,
      price INTEGER NOT NULL DEFAULT 0,
      stock INTEGER NOT NULL DEFAULT 0,
      address TEXT NOT NULL DEFAULT ''
    );
    CREATE TABLE IF NOT EXISTS sales(
      id INTEGER PRIMARY KEY,
      sold_at TEXT NOT NULL,
      total INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS sale_items(
      id INTEGER PRIMARY KEY,
      sale_id INTEGER NOT NULL REFERENCES sales(id),
      article_id INTEGER NOT NULL REFERENCES articles(id),
      quantity INTEGER NOT NULL,
      unit_price INTEGER NOT NULL
    );
    """)
    cols = [r[1] for r in c.execute("PRAGMA table_info(articles)").fetchall()]
    if "address" not in cols:
        c.execute("ALTER TABLE articles ADD COLUMN address TEXT NOT NULL DEFAULT ''")
    c.commit(); c.close()

def norm(s):
    s = unicodedata.normalize("NFKD", s or "")
    s = "".join(ch for ch in s if not unicodedata.combining(ch))
    s = s.lower().strip()
    s = re.sub(r"\s+", " ", s)
    return s

def parse_price(v):
    v = (v or "").strip()
    if not v: return None
    v = v.replace(" ", "").replace(",", ".")
    try:
        return int(round(float(v) * 1000))
    except ValueError:
        return None

def import_articles(path):
    c = get_conn()
    read=imp=skip=0
    reasons=[]
    with open(path, newline="", encoding="utf-8") as f:
        r = csv.DictReader(f)
        for row in r:
            read += 1
            name = (row.get("Designation") or "").strip()
            if not name:
                skip+=1; reasons.append((read,"blank name")); continue
            stock_raw = (row.get("QT") or "").strip()
            if stock_raw == "":
                skip+=1; reasons.append((read,"blank stock")); continue
            try:
                stock = int(float(stock_raw.replace(",",".")))
            except ValueError:
                skip+=1; reasons.append((read,"bad stock")); continue
            price = parse_price(row.get("Price vente"))
            if price is None:
                price = 0
            # duplicate check
            exists = c.execute("SELECT 1 FROM articles WHERE name=?", (name,)).fetchone()
            if exists:
                skip+=1; reasons.append((read,"duplicate name")); continue
            c.execute("INSERT INTO articles(name,name_norm,price,stock) VALUES (?,?,?,?)",
                      (name, norm(name), price, stock))
            imp += 1
    c.commit(); c.close()
    print(f"rows read={read} imported={imp} skipped={skip}")
    for r_,reason in reasons[:50]:
        print(f"  row {r_}: {reason}")
    return read, imp, skip

def search(q):
    nq = norm(q)
    if not nq: return []
    c = get_conn()
    rows = c.execute("SELECT id,name,price,stock FROM articles").fetchall()
    c.close()
    res = []
    for aid,name,price,stock in rows:
        nn = norm(name)
        if nq in nn:
            res.append((nn.startswith(nq), len(name), name, aid, price, stock))
    res.sort(key=lambda x:(not x[0], x[1], x[2]))
    out=[]
    for _,_,name,aid,price,stock in res[:8]:
        out.append({"id":aid,"name":name,"price":price,"stock":stock})
    return out

def confirm_sale(items):
    c = get_conn()
    cur = c.cursor()
    warnings = []
    try:
        cur.execute("BEGIN IMMEDIATE")
        cur.execute("INSERT INTO sales(sold_at,total) VALUES (?,0)", (datetime.now().isoformat(),))
        sale_id = cur.lastrowid
        total = 0
        for it in items:
            aid = int(it["article_id"])
            qty = int(it["qty"])
            if qty < 1:
                raise ValueError("qty must be >= 1")
            row = cur.execute("SELECT name,price,stock FROM articles WHERE id=?", (aid,)).fetchone()
            if row is None:
                raise ValueError(f"unknown article {aid}")
            name, price, stock = row
            if qty > stock:
                warnings.append(f"{name}: only {stock} in stock, sold {qty}")
            cur.execute("UPDATE articles SET stock=stock-? WHERE id=?", (qty, aid))
            cur.execute("INSERT INTO sale_items(sale_id,article_id,quantity,unit_price) VALUES (?,?,?,?)",
                        (sale_id, aid, qty, price))
            total += qty * price
        cur.execute("UPDATE sales SET total=? WHERE id=?", (total, sale_id))
        c.commit()
        return sale_id, warnings, total
    except Exception:
        c.rollback()
        raise
    finally:
        c.close()

def today_sales():
    c = get_conn()
    sales = c.execute("SELECT id,sold_at,total FROM sales WHERE date(sold_at)=date('now','localtime') ORDER BY id").fetchall()
    out=[]
    for sid,sold_at,total in sales:
        items = c.execute("""SELECT a.name,si.quantity,si.unit_price FROM sale_items si JOIN articles a ON a.id=si.article_id WHERE si.sale_id=?""",(sid,)).fetchall()
        out.append({"id":sid,"sold_at":sold_at,"total":total,"items":items})
    c.close()
    return out

def today_total():
    c=get_conn()
    t=c.execute("SELECT COALESCE(SUM(total),0) FROM sales WHERE date(sold_at)=date('now','localtime')").fetchone()[0]
    c.close()
    return t

def all_articles():
    c = get_conn()
    rows = c.execute("SELECT id,name,price,stock,address FROM articles ORDER BY name").fetchall()
    c.close()
    return rows

def update_article(aid, price, stock, address):
    c = get_conn()
    c.execute("UPDATE articles SET price=?, stock=?, address=? WHERE id=?", (price, stock, address, aid))
    c.commit(); c.close()

def add_article(name, price, stock, address):
    name = (name or "").strip()
    if not name:
        raise ValueError("name is required")
    address = (address or "").strip()
    nn = norm(name)
    c = get_conn()
    try:
        exists = c.execute("SELECT 1 FROM articles WHERE name_norm=?", (nn,)).fetchone()
        if exists:
            raise ValueError("product already exists")
        cur = c.cursor()
        cur.execute("INSERT INTO articles(name,name_norm,price,stock,address) VALUES (?,?,?,?,?)",
                    (name, nn, int(price), int(stock), address))
        aid = cur.lastrowid
        c.commit()
        return {"id": aid, "name": name, "price": int(price), "stock": int(stock), "address": address}
    finally:
        c.close()
