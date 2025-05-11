from flask import Flask, request, jsonify
from flask_cors import CORS
import os
from dotenv import load_dotenv
from pymongo import MongoClient
from datetime import datetime
from bson import ObjectId  # Import ObjectId

load_dotenv()

app = Flask(__name__)
CORS(app)

# MongoDB setup
MONGO_URI = os.getenv("MONGO_URI")
client = MongoClient(MONGO_URI)
db = client["billing-app"]
invoices = db["invoices"]

@app.route("/")
def home():
    return jsonify({"message": "Billing backend is live!"})

# Function to convert ObjectId to string
def convert_objectid(invoice):
    invoice["_id"] = str(invoice["_id"])  # Convert ObjectId to string
    return invoice

# GET route to fetch all invoices
@app.route("/invoices", methods=["GET"])
def get_invoices():
    # Fetch all invoices, excluding the '_id' field
    all_invoices = list(invoices.find({}, {"_id": 1, "invoice_no": 1, "date": 1, "buyer_name": 1, "address": 1, "items": 1, "subtotal": 1, "cgst": 1, "sgst": 1, "total_amount": 1}))
    
    # Convert ObjectId to string for each invoice
    all_invoices = [convert_objectid(invoice) for invoice in all_invoices]
    
    return jsonify(all_invoices)


# POST route to create invoice
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

    invoices.insert_one(invoice)
    invoice["_id"] = str(invoice["_id"])  # Convert the ObjectId to string before returning
    return jsonify({"message": "Invoice saved successfully", "invoice": invoice})

if __name__ == "__main__":
    app.run(debug=True)
