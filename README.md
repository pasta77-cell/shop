# Shop

A small web app for managing sales and inventory, built with **Flask** and **SQLite**.

## Overview

- Record sales with a simple search-and-basket flow.
- Manage your product inventory (price, stock, address).
- Review incoming purchase batches in a separate **Incoming** queue before applying them to inventory (approve updates/creates articles; reject discards).

## Tech stack

- Python, Flask
- SQLite (`shop.db`)
- HTML/CSS/Vanilla JS (templates + `static/`)

## Features

### Sales (`/`)
- Search products and add them to a basket.
- Confirm a sale (updates stock and stores sale + line items).
- View today’s sales and day total.

### Inventory (`/inventory`)
- List and search articles.
- Edit price, stock, and address.
- Add new articles.

### Incoming (`/incoming`)
- Separate list for items **not yet** in main inventory.
- Add items manually (reference/source, product name, quantity bought, unit purchase price, selling price, note).
- Import pending items from `incoming_photos/facture_produits_prix.csv` (one click).
- **Approve**:
  - If a product with the same normalized name exists: add to stock and update selling price.
  - If it does not exist: create a new article (selling price set, stock set to qty bought, address empty by default).
- **Reject**: mark an incoming item as rejected (no inventory changes).

## Getting started

### Requirements
- Python 3.8+ (recommended)
- Dependencies in `requirements.txt` (Flask, pytest)

### Install

```bash
python3 -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
Run
python3 app.py
Then open http://127.0.0.1:5000.
The database (shop.db) is initialized automatically on startup if needed.
Project structure
- app.py — Flask routes and API endpoints
- db.py — database schema and business logic
- templates/ — HTML templates
- static/ — CSS and JavaScript
- incoming_photos/ — place reference files here (e.g. photos/CSVs)
- CSV import expects: incoming_photos/facture_produits_prix.csv
- import_articles.py — helper script for importing articles from CSV
- tests/ — test files (pytest)
Incoming CSV format
File path: incoming_photos/facture_produits_prix.csv
Expected header:
Product Name, Quantity Bought, Unit Purchase Price, Selling Price
Decimal values are converted to the app’s internal scaled price format.
Testing
pytest
Notes
- Prices are displayed in the UI as TND with 3 decimal places.
- Incoming is intended as a review step before changes affect main inventory/sales stock.
