import os, db

DBF = "test_inventory.db"

def setup_module():
    if os.path.exists(DBF):
        os.remove(DBF)
    db.DB = DBF
    db.init_db()

def teardown_module():
    if os.path.exists(DBF):
        os.remove(DBF)


def test_add_article_defaults_and_address():
    art = db.add_article("Widget", 1500, 3, "A1")
    assert art["name"] == "Widget"
    assert art["price"] == 1500
    assert art["stock"] == 3
    assert art["address"] == "A1"
    rows = db.all_articles()
    assert any(r[1] == "Widget" and r[4] == "A1" for r in rows)


def test_add_article_requires_name_and_blocks_duplicate():
    try:
        db.add_article("  ", 0, 0, "")
        assert False, "expected ValueError"
    except ValueError as e:
        assert "name is required" in str(e)
    db.add_article("Dup", 0, 0, "")
    try:
        db.add_article("dup", 100, 1, "B2")
        assert False, "expected duplicate error"
    except ValueError as e:
        assert "already exists" in str(e)


def test_update_article_updates_address():
    art = db.add_article("ShelfItem", 2000, 5, "C1")
    db.update_article(art["id"], 2500, 7, "D9")
    rows = db.all_articles()
    row = [r for r in rows if r[0] == art["id"]][0]
    assert row[2] == 2500
    assert row[3] == 7
    assert row[4] == "D9"