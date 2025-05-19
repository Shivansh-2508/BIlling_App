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
@app.route('/invoices', methods=['POST'])
def add_invoice():
    try:
        data = request.get_json()

        # Optional: Add validation if needed
        required_fields = ['invoice_no', 'date', 'buyer_name', 'address', 'items', 'subtotal', 'cgst', 'sgst', 'total_amount']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'Missing field: {field}'}), 400

        result = invoices.insert_one(data)
        return jsonify({'message': 'Invoice saved', 'id': str(result.inserted_id)}), 201
    except Exception as e:
        print('Error in /invoices:', e)
        return jsonify({'error': 'Internal server error'}), 500
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



    
# --- Product Routes ---
products = db["products"]

@app.route("/products", methods=["GET"])
def get_products():
    all_products = list(products.find({}, {"_id": 1, "name": 1, "default_packing_qty": 1, "default_rate_per_kg": 1}))
    for product in all_products:
        product["_id"] = str(product["_id"])
    return jsonify(all_products)

@app.route("/products", methods=["POST"])
def add_product():
    data = request.json
    name = data.get("name")
    default_packing_qty = data.get("default_packing_qty", 0)
    default_rate_per_kg = data.get("default_rate_per_kg", 0)

    if not name:
        return jsonify({"error": "Product name is required"}), 400

    products.insert_one({
        "name": name,
        "default_packing_qty": default_packing_qty,
        "default_rate_per_kg": default_rate_per_kg
    })
    return jsonify({"message": "Product added successfully"}), 201





if __name__ == "__main__":
    app.run(debug=True)
