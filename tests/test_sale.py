import os, db
DBF="test.db"
def setup_module():
    if os.path.exists(DBF): os.remove(DBF)
    db.DB=DBF
    db.init_db()
    c=db.get_conn()
    c.execute("INSERT INTO articles(name,name_norm,price,stock) VALUES (?,?,?,?)",("A","a",1000,5))
    c.execute("INSERT INTO articles(name,name_norm,price,stock) VALUES (?,?,?,?)",("B","b",2000,2))
    c.commit(); c.close()

def test_confirm_drops_stock_and_records():
    sid,warns,total=db.confirm_sale([{"article_id":1,"qty":2},{"article_id":2,"qty":1}])
    assert warns==[]
    c=db.get_conn()
    assert c.execute("SELECT stock FROM articles WHERE id=1").fetchone()[0]==3
    assert c.execute("SELECT stock FROM articles WHERE id=2").fetchone()[0]==1
    assert c.execute("SELECT COUNT(*) FROM sale_items WHERE sale_id=?",(sid,)).fetchone()[0]==2
    assert total==4000
    c.close()

def test_oversell_warns():
    sid,warns,total=db.confirm_sale([{"article_id":2,"qty":10}])
    assert warns
    c=db.get_conn()
    assert c.execute("SELECT stock FROM articles WHERE id=2").fetchone()[0]==-9
    c.close()

def test_rollback():
    try:
        db.confirm_sale([{"article_id":999,"qty":1}])
    except Exception:
        pass
    c=db.get_conn()
    assert c.execute("SELECT COUNT(*) FROM sales").fetchone()[0]==2
    c.close()