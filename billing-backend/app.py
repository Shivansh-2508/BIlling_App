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

# GET: All invoices
@app.route("/invoices", methods=["GET"])
def get_invoices():
    all_invoices = list(invoices.find({}, {
        "_id": 1,
        "invoice_no": 1,
        "date": 1,
        "buyer_name": 1,
        "address": 1,
        "gstin": 1,
        "items": 1,
        "subtotal": 1,
        "cgst": 1,
        "sgst": 1,
        "total_amount": 1
    }))
    all_invoices = [convert_objectid(inv) for inv in all_invoices]
    return jsonify(all_invoices)

# GET: Single invoice by ID
@app.route("/invoices/<invoice_id>", methods=["GET"])
def get_invoice(invoice_id):
    try:
        invoice = invoices.find_one({"_id": ObjectId(invoice_id)})
        if not invoice:
            return jsonify({"error": "Invoice not found"}), 404
        
        # Debug: Check if GSTIN exists in retrieved invoice
        print(f"Retrieved invoice {invoice_id}, GSTIN: {invoice.get('gstin', 'NOT FOUND')}")
        
        return jsonify(convert_objectid(invoice))
    except Exception as e:
        print(f"Error fetching invoice {invoice_id}:", e)
        return jsonify({"error": "Invalid invoice ID or server error"}), 400

# POST: Create new invoice
@app.route('/invoices', methods=['POST'])
def add_invoice():
    try:
        data = request.get_json()
        
        # Debug: Print received data to check GSTIN
        print("Received invoice data:", data)
        print("GSTIN value:", data.get('gstin', 'NOT FOUND'))

        # Validate required fields - gstin should be optional
        required_fields = ['invoice_no', 'date', 'buyer_name', 'address', 'items', 'subtotal', 'cgst', 'sgst', 'total_amount']
        
        # Check for missing fields
        missing_fields = []
        for field in required_fields:
            if field not in data or data[field] is None:
                missing_fields.append(field)
        
        if missing_fields:
            return jsonify({'error': f'Missing fields: {", ".join(missing_fields)}'}), 400

        # Ensure gstin field exists, even if empty
        if 'gstin' not in data:
            data['gstin'] = ''
            print("GSTIN field was missing, setting to empty string")
        
        # Additional validation for GSTIN (optional)
        gstin_value = data.get('gstin', '')
        if gstin_value and len(gstin_value) != 15:
            print(f"Warning: GSTIN {gstin_value} is not 15 characters long")

        # Ensure all expected fields are present for consistency
        invoice_data = {
            'invoice_no': data['invoice_no'],
            'date': data['date'],
            'buyer_name': data['buyer_name'],
            'address': data['address'],
            'gstin': data.get('gstin', ''),  # Default to empty string if not provided
            'items': data['items'],
            'subtotal': data['subtotal'],
            'cgst': data['cgst'],
            'sgst': data['sgst'],
            'total_amount': data['total_amount']
        }

        result = invoices.insert_one(invoice_data)
        print(f"Invoice saved with ID: {result.inserted_id}")
        
        return jsonify({'message': 'Invoice saved', 'id': str(result.inserted_id)}), 201
        
    except Exception as e:
        print('Error in /invoices:', e)
        import traceback
        traceback.print_exc()
        return jsonify({'error': 'Internal server error'}), 500

# PUT: Update invoice
@app.route('/invoices/<invoice_id>', methods=['PUT'])
def update_invoice(invoice_id):
    try:
        data = request.get_json()
        
        # Ensure gstin field exists in update data
        if 'gstin' not in data:
            data['gstin'] = ''
            
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

# DELETE: Delete invoice
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

# GET: All buyers (for dropdown)
@app.route("/buyers", methods=["GET"])
def get_buyers():
    all_buyers = list(buyers.find({}, {"_id": 1, "name": 1, "address": 1, "gstin": 1}))
    for buyer in all_buyers:
        buyer["_id"] = str(buyer["_id"])
        # Ensure gstin field exists
        if "gstin" not in buyer:
            buyer["gstin"] = ""
    return jsonify(all_buyers)

# GET: Single buyer by ID
@app.route("/buyers/<buyer_id>", methods=["GET"])
def get_buyer(buyer_id):
    try:
        buyer = buyers.find_one({"_id": ObjectId(buyer_id)})
        if not buyer:
            return jsonify({"error": "Buyer not found"}), 404
        
        # Ensure gstin field exists
        if "gstin" not in buyer:
            buyer["gstin"] = ""
            
        return jsonify(convert_objectid(buyer))
    except Exception as e:
        print(f"Error fetching buyer {buyer_id}:", e)
        return jsonify({"error": "Invalid buyer ID or server error"}), 400

# POST: Add new buyer (admin use)
@app.route("/buyers", methods=["POST"])
def add_buyer():
    data = request.json
    name = data.get("name")
    address = data.get("address")
    gstin = data.get("gstin", "")  # GST number, optional with empty default

    if not name or not address:
        return jsonify({"error": "Both name and address are required"}), 400

    buyer_data = {
        "name": name, 
        "address": address,
        "gstin": gstin
    }

    result = buyers.insert_one(buyer_data)
    return jsonify({"message": "Buyer added successfully", "id": str(result.inserted_id)}), 201

# PUT: Update buyer
@app.route('/buyers/<buyer_id>', methods=['PUT'])
def update_buyer(buyer_id):
    try:
        data = request.get_json()
        
        # Ensure gstin field exists in update data
        if 'gstin' not in data:
            data['gstin'] = ''
            
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

# DELETE: Delete buyer
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
        "stock_quantity": 1,
        "default_rate_per_kg": 1,
        "hsn_code": 1
    }))
    for product in all_products:
        product["_id"] = str(product["_id"])
        if "hsn_code" not in product:
            product["hsn_code"] = ""
        if "stock_quantity" not in product:
            product["stock_quantity"] = 0
        if "default_rate_per_kg" not in product:
            product["default_rate_per_kg"] = 0
    return jsonify(all_products)


@app.route("/products/<product_id>", methods=["GET"])
def get_product(product_id):
    try:
        product = products.find_one({"_id": ObjectId(product_id)})
        if not product:
            return jsonify({"error": "Product not found"}), 404
        if "hsn_code" not in product:
            product["hsn_code"] = ""
        if "stock_quantity" not in product:
            product["stock_quantity"] = 0
        if "default_rate_per_kg" not in product:
            product["default_rate_per_kg"] = 0
        return jsonify(convert_objectid(product))
    except Exception as e:
        print(f"Error fetching product {product_id}:", e)
        return jsonify({"error": "Invalid product ID or server error"}), 400

@app.route("/products", methods=["POST"])
def add_product():
    data = request.json
    name = data.get("name")
    stock_quantity = data.get("stock_quantity", 0)
    default_rate_per_kg = data.get("default_rate_per_kg", 0)
    hsn_code = data.get("hsn_code", "")

    if not name or not hsn_code or stock_quantity is None or default_rate_per_kg is None:
        return jsonify({"error": "Product name, HSN code, stock quantity, and rate per kg are required"}), 400

    product_data = {
        "name": name,
        "stock_quantity": stock_quantity,
        "default_rate_per_kg": default_rate_per_kg,
        "hsn_code": hsn_code
    }

    result = products.insert_one(product_data)
    return jsonify({"message": "Product added successfully", "id": str(result.inserted_id)}), 201


@app.route('/products/<product_id>/stock', methods=['PUT'])
def update_stock_quantity(product_id):
    try:
        data = request.get_json()
        delta = data.get('quantity')
        if delta is None:
            return jsonify({"error": "Quantity is required"}), 400
        try:
            delta = float(delta)
        except (ValueError, TypeError):
            return jsonify({"error": "Invalid quantity format"}), 400

        product = products.find_one({"_id": ObjectId(product_id)})
        if not product:
            return jsonify({"error": "Product not found"}), 404

        current_stock = float(product.get("stock_quantity", 0))
        new_stock = current_stock + delta  # Allow negative stock

        result = products.update_one(
            {"_id": ObjectId(product_id)},
            {"$set": {"stock_quantity": new_stock}}
        )
        return jsonify({"message": "Stock quantity updated successfully", "stock_quantity": new_stock}), 200
    except Exception as e:
        print(f"Error updating stock for product {product_id}: {e}")
        return jsonify({"error": "Invalid product ID or server error"}), 400
    
@app.route('/products/<product_id>', methods=['PUT'])
def update_product(product_id):
    try:
        data = request.get_json()
        update_data = {}
        if "name" in data:
            update_data["name"] = data["name"]
        if "hsn_code" in data:
            update_data["hsn_code"] = data["hsn_code"]
        if "stock_quantity" in data:
            update_data["stock_quantity"] = data["stock_quantity"]
        if "default_rate_per_kg" in data:
            update_data["default_rate_per_kg"] = data["default_rate_per_kg"]
        if not update_data:
            return jsonify({"error": "No valid fields to update"}), 400
        result = products.update_one(
            {"_id": ObjectId(product_id)},
            {"$set": update_data}
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
# Optimized route with better date handling, error handling and performance
@app.route('/statements/<buyer_id>', methods=['GET'])
def get_buyer_statement(buyer_id):
    try:
        # Get date filter parameters
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        
        # Validate buyer_id first
        if not ObjectId.is_valid(buyer_id):
            return jsonify({"error": "Invalid buyer ID format"}), 400
            
        # First, get the buyer name from the ID
        buyer = buyers.find_one({"_id": ObjectId(buyer_id)})
        if not buyer:
            return jsonify({"error": "Buyer not found"}), 404
        
        buyer_name = buyer["name"]
        
        # Build query for invoices
        query = {'buyer_name': buyer_name}
        
        # Add date filtering if provided
        if start_date or end_date:
            date_query = {}
            if start_date:
                try:
                    # Validate date format
                    start_date_obj = datetime.strptime(start_date, '%Y-%m-%d')
                    date_query['$gte'] = start_date
                except ValueError:
                    return jsonify({"error": "Invalid start_date format. Use YYYY-MM-DD"}), 400
                    
            if end_date:
                try:
                    # Validate date format
                    end_date_obj = datetime.strptime(end_date, '%Y-%m-%d')
                    date_query['$lte'] = end_date
                except ValueError:
                    return jsonify({"error": "Invalid end_date format. Use YYYY-MM-DD"}), 400
                    
            if date_query:
                query['date'] = date_query
        
        # Define projection to retrieve only needed fields for better performance
        projection = {
            "_id": 1,
            "invoice_no": 1,
            "date": 1,
            "items": 1,
            "total_amount": 1
        }
        
        # Then get invoices for this buyer with date filters
        invoices_list = list(invoices.find(query, projection))
        
        # Early return if no invoices found
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
        
        # Convert ObjectId to string for each invoice
        for inv in invoices_list:
            inv['_id'] = str(inv['_id'])
        
        # Calculate statement totals efficiently
        total_qty = 0
        total_amount = 0
        
        for inv in invoices_list:
            # Add to total amount
            total_amount += inv.get('total_amount', 0)
            
            # Process each item in the invoice to collect quantities
            if 'items' in inv and isinstance(inv['items'], list):
                for item in inv['items']:
                    # Safely convert total_qty to a number if it's not already
                    if 'total_qty' in item:
                        try:
                            if isinstance(item['total_qty'], str):
                                item['total_qty'] = float(item['total_qty'])
                            total_qty += float(item['total_qty'])
                        except (ValueError, TypeError):
                            # Skip invalid values
                            continue
        
        # Create the response object
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
        # Log the full error for debugging
        import traceback
        print('Error in /statements/<buyer_id>:', str(e))
        print(traceback.format_exc())
        return jsonify({'error': 'Internal Server Error'}), 500



if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)