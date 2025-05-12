from flask import Flask, request, jsonify
from flask_cors import CORS
import os
from dotenv import load_dotenv
from pymongo import MongoClient
from datetime import datetime
from bson import ObjectId

load_dotenv()

app = Flask(__name__)
CORS(app)

# MongoDB setup
MONGO_URI = os.getenv("MONGO_URI")
client = MongoClient(MONGO_URI)
db = client["billing-app"]
invoices = db["invoices"]
buyers = db["buyers"]  # Moved to top

@app.route("/")
def home():
    return jsonify({"message": "Billing backend is live!"})

# Utility: Convert ObjectId to string
def convert_objectid(doc):
    doc["_id"] = str(doc["_id"])
    return doc

# --- Invoice Routes ---

# GET: All invoices
@app.route("/invoices", methods=["GET"])
def get_invoices():
    all_invoices = list(invoices.find({}, {
        "_id": 1,
        "invoice_no": 1,
        "date": 1,
        "buyer_name": 1,
        "address": 1,
        "items": 1,
        "subtotal": 1,
        "cgst": 1,
        "sgst": 1,
        "total_amount": 1
    }))
    all_invoices = [convert_objectid(inv) for inv in all_invoices]
    return jsonify(all_invoices)

# POST: Create new invoice
@app.route("/invoices", methods=["POST"])
def create_invoice():
    data = request.json

    for item in data["items"]:
        item["total_qty"] = item["packing_qty"] * item["units"]
        item["amount"] = item["total_qty"] * item["rate_per_kg"]

    subtotal = sum(item["amount"] for item in data["items"])
    cgst = subtotal * 0.09
    sgst = subtotal * 0.09
    total_amount = subtotal + cgst + sgst

    invoice = {
        "invoice_no": data["invoice_no"],
        "date": data.get("date", datetime.now().strftime("%Y-%m-%d")),
        "buyer_name": data["buyer_name"],
        "address": data["address"],
        "items": data["items"],
        "subtotal": subtotal,
        "cgst": cgst,
        "sgst": sgst,
        "total_amount": total_amount,
    }

    result = invoices.insert_one(invoice)
    invoice["_id"] = str(result.inserted_id)

    return jsonify({"message": "Invoice saved successfully", "invoice": invoice})

# --- Buyer Routes ---

# GET: All buyers (for dropdown)
@app.route("/buyers", methods=["GET"])
def get_buyers():
    all_buyers = list(buyers.find({}, {"_id": 1, "name": 1, "address": 1}))
    for buyer in all_buyers:
        buyer["_id"] = str(buyer["_id"])
    return jsonify(all_buyers)

# POST: Add new buyer (admin use)
@app.route("/buyers", methods=["POST"])
def add_buyer():
    data = request.json
    name = data.get("name")
    address = data.get("address")

    if not name or not address:
        return jsonify({"error": "Both name and address are required"}), 400

    buyers.insert_one({"name": name, "address": address})
    return jsonify({"message": "Buyer added successfully"}), 201

if __name__ == "__main__":
    app.run(debug=True)
