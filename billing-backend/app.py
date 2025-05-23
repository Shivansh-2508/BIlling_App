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
buyers = db["buyers"]
products = db["products"]

@app.route("/")
def home():
    return jsonify({"message": "Billing backend is live!"})

# Utility: Convert ObjectId to string
def convert_objectid(doc):
    if doc and "_id" in doc and isinstance(doc["_id"], ObjectId):
        doc["_id"] = str(doc["_id"])
    return doc

# --- Invoice Routes ---

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

@app.route("/invoices/<invoice_id>", methods=["GET"])
def get_invoice(invoice_id):
    try:
        invoice = invoices.find_one({"_id": ObjectId(invoice_id)})
        if not invoice:
            return jsonify({"error": "Invoice not found"}), 404
        return jsonify(convert_objectid(invoice))
    except Exception as e:
        print(f"Error fetching invoice {invoice_id}:", e)
        return jsonify({"error": "Invalid invoice ID or server error"}), 400

@app.route('/invoices', methods=['POST'])
def add_invoice():
    try:
        data = request.get_json()
        required_fields = ['invoice_no', 'date', 'buyer_name', 'address', 'items', 'subtotal', 'cgst', 'sgst', 'total_amount']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'Missing field: {field}'}), 400

        result = invoices.insert_one(data)
        return jsonify({'message': 'Invoice saved', 'id': str(result.inserted_id)}), 201
    except Exception as e:
        print('Error in /invoices:', e)
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/invoices/<invoice_id>', methods=['PUT'])
def update_invoice(invoice_id):
    try:
        data = request.get_json()
        result = invoices.update_one(
            {"_id": ObjectId(invoice_id)},
            {"$set": data}
        )
        if result.matched_count == 0:
            return jsonify({"error": "Invoice not found"}), 404
        return jsonify({"message": "Invoice updated successfully"}), 200
    except Exception as e:
        print(f"Error updating invoice {invoice_id}:", e)
        return jsonify({"error": "Invalid invoice ID or server error"}), 400

@app.route('/invoices/<invoice_id>', methods=['DELETE'])
def delete_invoice(invoice_id):
    try:
        result = invoices.delete_one({"_id": ObjectId(invoice_id)})
        if result.deleted_count == 0:
            return jsonify({"error": "Invoice not found"}), 404
        return jsonify({"message": "Invoice deleted successfully"}), 200
    except Exception as e:
        print(f"Error deleting invoice {invoice_id}:", e)
        return jsonify({"error": "Invalid invoice ID or server error"}), 400

# --- Buyer Routes ---

@app.route("/buyers", methods=["GET"])
def get_buyers():
    all_buyers = list(buyers.find({}, {"_id": 1, "name": 1, "address": 1, "gstin": 1}))
    for buyer in all_buyers:
        buyer["_id"] = str(buyer["_id"])
    return jsonify(all_buyers)

@app.route("/buyers/<buyer_id>", methods=["GET"])
def get_buyer(buyer_id):
    try:
        buyer = buyers.find_one({"_id": ObjectId(buyer_id)})
        if not buyer:
            return jsonify({"error": "Buyer not found"}), 404
        return jsonify(convert_objectid(buyer))
    except Exception as e:
        print(f"Error fetching buyer {buyer_id}:", e)
        return jsonify({"error": "Invalid buyer ID or server error"}), 400

@app.route("/buyers", methods=["POST"])
def add_buyer():
    data = request.json
    name = data.get("name")
    address = data.get("address")
    gstin = data.get("gstin", "")

    if not name or not address:
        return jsonify({"error": "Both name and address are required"}), 400

    result = buyers.insert_one({
        "name": name, 
        "address": address,
        "gstin": gstin
    })
    return jsonify({"message": "Buyer added successfully", "id": str(result.inserted_id)}), 201

@app.route('/buyers/<buyer_id>', methods=['PUT'])
def update_buyer(buyer_id):
    try:
        data = request.get_json()
        result = buyers.update_one(
            {"_id": ObjectId(buyer_id)},
            {"$set": data}
        )
        if result.matched_count == 0:
            return jsonify({"error": "Buyer not found"}), 404
        return jsonify({"message": "Buyer updated successfully"}), 200
    except Exception as e:
        print(f"Error updating buyer {buyer_id}:", e)
        return jsonify({"error": "Invalid buyer ID or server error"}), 400

@app.route('/buyers/<buyer_id>', methods=['DELETE'])
def delete_buyer(buyer_id):
    try:
        result = buyers.delete_one({"_id": ObjectId(buyer_id)})
        if result.deleted_count == 0:
            return jsonify({"error": "Buyer not found"}), 404
        return jsonify({"message": "Buyer deleted successfully"}), 200
    except Exception as e:
        print(f"Error deleting buyer {buyer_id}:", e)
        return jsonify({"error": "Invalid buyer ID or server error"}), 400

# --- Product Routes ---

@app.route("/products", methods=["GET"])
def get_products():
    all_products = list(products.find({}, {
        "_id": 1, 
        "name": 1, 
        "stock": 1 
    }))
    print(all_products) 
    for product in all_products:
        product["_id"] = str(product["_id"])
    return jsonify(all_products)

@app.route("/products", methods=["POST"])
def add_product():
    data = request.json
    name = data.get("name")
    stock = data.get("stock", 0)

    if not name:
        return jsonify({"error": "Product name is required"}), 400

    result = products.insert_one({
        "name": name,
        "stock": stock
    })
    return jsonify({"message": "Product added successfully", "id": str(result.inserted_id)}), 201

@app.route('/products/<product_id>', methods=['PUT'])
def update_product(product_id):
    try:
        data = request.get_json()
        result = products.update_one(
            {"_id": ObjectId(product_id)},
            {"$set": data}
        )
        if result.matched_count == 0:
            return jsonify({"error": "Product not found"}), 404
        return jsonify({"message": "Product updated successfully"}), 200
    except Exception as e:
        print(f"Error updating product {product_id}:", e)
        return jsonify({"error": "Invalid product ID or server error"}), 400

@app.route('/products/<product_id>', methods=['DELETE'])
def delete_product(product_id):
    try:
        result = products.delete_one({"_id": ObjectId(product_id)})
        if result.deleted_count == 0:
            return jsonify({"error": "Product not found"}), 404
        return jsonify({"message": "Product deleted successfully"}), 200
    except Exception as e:
        print(f"Error deleting product {product_id}:", e)
        return jsonify({"error": "Invalid product ID or server error"}), 400

# --- Statement Routes ---

@app.route('/statements/<buyer_id>', methods=['GET'])
def get_buyer_statement(buyer_id):
    try:
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        
        if not ObjectId.is_valid(buyer_id):
            return jsonify({"error": "Invalid buyer ID format"}), 400
            
        buyer = buyers.find_one({"_id": ObjectId(buyer_id)})
        if not buyer:
            return jsonify({"error": "Buyer not found"}), 404
        
        buyer_name = buyer["name"]
        query = {'buyer_name': buyer_name}
        
        if start_date or end_date:
            date_query = {}
            if start_date:
                try:
                    start_date_obj = datetime.strptime(start_date, '%Y-%m-%d')
                    date_query['$gte'] = start_date
                except ValueError:
                    return jsonify({"error": "Invalid start_date format. Use YYYY-MM-DD"}), 400
                    
            if end_date:
                try:
                    end_date_obj = datetime.strptime(end_date, '%Y-%m-%d')
                    date_query['$lte'] = end_date
                except ValueError:
                    return jsonify({"error": "Invalid end_date format. Use YYYY-MM-DD"}), 400
                    
            if date_query:
                query['date'] = date_query
        
        projection = {
            "_id": 1,
            "invoice_no": 1,
            "date": 1,
            "items": 1,
            "total_amount": 1
        }
        
        invoices_list = list(invoices.find(query, projection))
        
        if not invoices_list:
            return jsonify({
                'buyer': buyer_name,
                'buyer_gstin': buyer.get('gstin', ''),
                'invoice_count': 0,
                'total_qty': 0,
                'total_amount': 0,
                'invoices': [],
                'filter': {
                    'start_date': start_date,
                    'end_date': end_date
                }
            }), 200
        
        for inv in invoices_list:
            inv['_id'] = str(inv['_id'])
        
        total_qty = 0
        total_amount = 0
        
        for inv in invoices_list:
            total_amount += inv.get('total_amount', 0)
            if 'items' in inv and isinstance(inv['items'], list):
                for item in inv['items']:
                    if 'total_qty' in item:
                        try:
                            if isinstance(item['total_qty'], str):
                                item['total_qty'] = float(item['total_qty'])
                            total_qty += float(item['total_qty'])
                        except (ValueError, TypeError):
                            continue
        
        statement_data = {
            'buyer': buyer_name,
            'buyer_gstin': buyer.get('gstin', ''),
            'invoice_count': len(invoices_list),
            'total_qty': total_qty,
            'total_amount': total_amount,
            'invoices': invoices_list,
            'filter': {
                'start_date': start_date,
                'end_date': end_date
            }
        }
        
        return jsonify(statement_data), 200
        
    except Exception as e:
        import traceback
        print('Error in /statements/<buyer_id>:', str(e))
        print(traceback.format_exc())
        return jsonify({'error': 'Internal Server Error'}), 500

if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)