import sys, db
db.init_db()
db.import_articles(sys.argv[1] if len(sys.argv)>1 else "database.csv")
