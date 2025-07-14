from flask import Flask, request, jsonify, send_file, jsonify
from flask_cors import CORS
import os
from dotenv import load_dotenv
from pymongo import MongoClient
from datetime import datetime
from bson import ObjectId
import io
import asyncio
from playwright.async_api import async_playwright

load_dotenv()

app = Flask(__name__)
CORS(app)


# --- Dynamic MongoDB connection per user ---
from firebase_utils import verify_firebase_token, get_user_mongo_uri
from functools import lru_cache
from threading import Lock

# Cache MongoClient per user (thread-safe)
_mongo_clients = {}
_mongo_clients_lock = Lock()

def get_user_db(user_id):
    """
    Get (and cache) a MongoClient for the user's Mongo URI, return the DB handle.
    """
    from pymongo import MongoClient
    with _mongo_clients_lock:
        if user_id in _mongo_clients:
            client = _mongo_clients[user_id]
        else:
            mongo_uri = get_user_mongo_uri(user_id)
            if not mongo_uri:
                raise Exception("No Mongo URI found for user")
            client = MongoClient(mongo_uri)
            _mongo_clients[user_id] = client
    # Use a fixed DB name, or fetch from user profile if needed
    return client["billing-app"]

# --- Auth decorator ---
from functools import wraps
def require_firebase_auth(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({'error': 'Missing or invalid Authorization header'}), 401
        id_token = auth_header.split('Bearer ')[-1]
        try:
            decoded_token = verify_firebase_token(id_token)
            user_id = decoded_token['uid']
        except Exception as e:
            print('Firebase token verification failed:', e)
            return jsonify({'error': 'Invalid or expired token'}), 401
        # Attach user_id to request context
        request.user_id = user_id
        return f(*args, **kwargs)
    return decorated

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
@require_firebase_auth
def get_invoices():
    db = get_user_db(request.user_id)
    invoices = db["invoices"]
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
        "total_amount": 1,
        "status": 1
    }))
    all_invoices = [convert_objectid(inv) for inv in all_invoices]
    return jsonify(all_invoices)

# GET: Single invoice by ID
@app.route("/invoices/<invoice_id>", methods=["GET"])
@require_firebase_auth
def get_invoice(invoice_id):
    try:
        db = get_user_db(request.user_id)
        invoices = db["invoices"]
        invoice = invoices.find_one({"_id": ObjectId(invoice_id)})
        if not invoice:
            return jsonify({"error": "Invoice not found"}), 404
        print(f"Retrieved invoice {invoice_id}, GSTIN: {invoice.get('gstin', 'NOT FOUND')}")
        return jsonify(convert_objectid(invoice))
    except Exception as e:
        print(f"Error fetching invoice {invoice_id}:", e)
        return jsonify({"error": "Invalid invoice ID or server error"}), 400

# POST: Create new invoice
@app.route('/invoices', methods=['POST'])
@require_firebase_auth
def add_invoice():
    try:
        db = get_user_db(request.user_id)
        invoices = db["invoices"]
        products = db["products"]
        data = request.get_json()
        print("Received invoice data:", data)
        print("GSTIN value:", data.get('gstin', 'NOT FOUND'))
        required_fields = ['invoice_no', 'date', 'buyer_name', 'address', 'items', 'subtotal', 'cgst', 'sgst', 'total_amount']
        missing_fields = [field for field in required_fields if field not in data or data[field] is None]
        if missing_fields:
            return jsonify({'error': f'Missing fields: {", ".join(missing_fields)}'}), 400
        if 'gstin' not in data:
            data['gstin'] = ''
            print("GSTIN field was missing, setting to empty string")
        gstin_value = data.get('gstin', '')
        if gstin_value and len(gstin_value) != 15:
            print(f"Warning: GSTIN {gstin_value} is not 15 characters long")
        invoice_data = {
            'invoice_no': data['invoice_no'],
            'date': data['date'],
            'buyer_name': data['buyer_name'],
            'address': data['address'],
            'gstin': data.get('gstin', ''),
            'items': data['items'],
            'subtotal': data['subtotal'],
            'cgst': data['cgst'],
            'sgst': data['sgst'],
            'total_amount': data['total_amount'],
            'status': 'unpaid'
        }
        result = invoices.insert_one(invoice_data)
        print(f"Invoice saved with ID: {result.inserted_id}")
        for item in data['items']:
            product_name = item.get('product_name')
            qty_to_deduct = float(item.get('packing_qty', 0)) * float(item.get('no_of_units', 0))
            if product_name and qty_to_deduct > 0:
                product = products.find_one({"name": product_name})
                if product:
                    new_stock = float(product.get('stock_quantity', 0)) - qty_to_deduct
                    products.update_one(
                        {"_id": product["_id"]},
                        {"$set": {"stock_quantity": new_stock}}
                    )
                    print(f"Deducted {qty_to_deduct} from {product_name}, new stock: {new_stock}")
        return jsonify({'message': 'Invoice saved', 'id': str(result.inserted_id)}), 201
    except Exception as e:
        print('Error in /invoices:', e)
        import traceback
        traceback.print_exc()
        return jsonify({'error': 'Internal server error'}), 500

# PUT: Update invoice
@app.route('/invoices/<invoice_id>', methods=['PUT'])
@require_firebase_auth
def update_invoice(invoice_id):
    try:
        db = get_user_db(request.user_id)
        invoices = db["invoices"]
        data = request.get_json()
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

@app.route('/invoices/<invoice_id>/status', methods=['PUT'])
@require_firebase_auth
def update_invoice_status(invoice_id):
    try:
        db = get_user_db(request.user_id)
        invoices = db["invoices"]
        data = request.get_json()
        status = data.get('status')
        if status not in ['paid', 'unpaid']:
            return jsonify({'error': 'Invalid status'}), 400
        result = invoices.update_one(
            {"_id": ObjectId(invoice_id)},
            {"$set": {"status": status}}
        )
        if result.matched_count == 0:
            return jsonify({"error": "Invoice not found"}), 404
        return jsonify({"message": "Status updated"}), 200
    except Exception as e:
        print(f"Error updating status for invoice {invoice_id}:", e)
        return jsonify({"error": "Invalid invoice ID or server error"}), 400
    
# DELETE: Delete invoice
@app.route('/invoices/<invoice_id>', methods=['DELETE'])
@require_firebase_auth
def delete_invoice(invoice_id):
    try:
        db = get_user_db(request.user_id)
        invoices = db["invoices"]
        result = invoices.delete_one({"_id": ObjectId(invoice_id)})
        if result.deleted_count == 0:
            return jsonify({"error": "Invoice not found"}), 404
        return jsonify({"message": "Invoice deleted successfully"}), 200
    except Exception as e:
        print(f"Error deleting invoice {invoice_id}:", e)
        return jsonify({"error": "Invalid invoice ID or server error"}), 400

@app.route('/export-invoice-pdf', methods=['POST'])
def export_invoice_pdf():
    data = request.get_json()
    html_content = data.get('html')
    file_name = data.get('file_name', 'invoice.pdf')

    if not html_content:
        return jsonify({'error': 'No HTML provided'}), 400

    pdf_bytes = asyncio.run(html_to_pdf_playwright(html_content))
    pdf_file = io.BytesIO(pdf_bytes)
    pdf_file.seek(0)

    return send_file(
        pdf_file,
        mimetype='application/pdf',
        as_attachment=True,
        download_name=file_name
    )

async def html_to_pdf_playwright(html_content):
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()
        await page.set_content(html_content, wait_until="networkidle")
        pdf_bytes = await page.pdf(format="A4", print_background=True)
        await browser.close()
        return pdf_bytes
    
# --- Buyer Routes ---

# GET: All buyers (for dropdown)
@app.route("/buyers", methods=["GET"])
@require_firebase_auth
def get_buyers():
    db = get_user_db(request.user_id)
    buyers = db["buyers"]
    all_buyers = list(buyers.find({}, {"_id": 1, "name": 1, "address": 1, "gstin": 1}))
    for buyer in all_buyers:
        buyer["_id"] = str(buyer["_id"])
        if "gstin" not in buyer:
            buyer["gstin"] = ""
    return jsonify(all_buyers)

# GET: Single buyer by ID
@app.route("/buyers/<buyer_id>", methods=["GET"])
@require_firebase_auth
def get_buyer(buyer_id):
    try:
        db = get_user_db(request.user_id)
        buyers = db["buyers"]
        buyer = buyers.find_one({"_id": ObjectId(buyer_id)})
        if not buyer:
            return jsonify({"error": "Buyer not found"}), 404
        if "gstin" not in buyer:
            buyer["gstin"] = ""
        return jsonify(convert_objectid(buyer))
    except Exception as e:
        print(f"Error fetching buyer {buyer_id}:", e)
        return jsonify({"error": "Invalid buyer ID or server error"}), 400

# POST: Add new buyer (admin use)
@app.route("/buyers", methods=["POST"])
@require_firebase_auth
def add_buyer():
    db = get_user_db(request.user_id)
    buyers = db["buyers"]
    data = request.json
    name = data.get("name")
    address = data.get("address")
    gstin = data.get("gstin", "")
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
@require_firebase_auth
def update_buyer(buyer_id):
    try:
        db = get_user_db(request.user_id)
        buyers = db["buyers"]
        data = request.get_json()
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
@require_firebase_auth
def delete_buyer(buyer_id):
    try:
        db = get_user_db(request.user_id)
        buyers = db["buyers"]
        result = buyers.delete_one({"_id": ObjectId(buyer_id)})
        if result.deleted_count == 0:
            return jsonify({"error": "Buyer not found"}), 404
        return jsonify({"message": "Buyer deleted successfully"}), 200
    except Exception as e:
        print(f"Error deleting buyer {buyer_id}:", e)
        return jsonify({"error": "Invalid buyer ID or server error"}), 400

# --- Product Routes ---

@app.route("/products", methods=["GET"])
@require_firebase_auth
def get_products():
    db = get_user_db(request.user_id)
    products = db["products"]
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
@require_firebase_auth
def get_product(product_id):
    try:
        db = get_user_db(request.user_id)
        products = db["products"]
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
@require_firebase_auth
def add_product():
    db = get_user_db(request.user_id)
    products = db["products"]
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
@require_firebase_auth
def update_stock_quantity(product_id):
    try:
        db = get_user_db(request.user_id)
        products = db["products"]
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
        new_stock = current_stock + delta
        result = products.update_one(
            {"_id": ObjectId(product_id)},
            {"$set": {"stock_quantity": new_stock}}
        )
        return jsonify({"message": "Stock quantity updated successfully", "stock_quantity": new_stock}), 200
    except Exception as e:
        print(f"Error updating stock for product {product_id}: {e}")
        return jsonify({"error": "Invalid product ID or server error"}), 400
    
@app.route('/products/<product_id>', methods=['PUT'])
@require_firebase_auth
def update_product(product_id):
    try:
        db = get_user_db(request.user_id)
        products = db["products"]
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
@require_firebase_auth
def delete_product(product_id):
    try:
        db = get_user_db(request.user_id)
        products = db["products"]
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
        db = get_user_db(request.user_id)
        buyers = db["buyers"]
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
            "total_amount": 1,
            "status": 1
        }
        
        # Then get invoices for this buyer with date filters
        invoices = db["invoices"]
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