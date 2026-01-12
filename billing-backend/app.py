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

# MongoDB setup
MONGO_URI = os.getenv("MONGO_URI")
client = MongoClient(MONGO_URI)
db = client["billing-app"]
invoices = db["invoices"]
buyers = db["buyers"]
products = db["products"]
purchases = db["purchases"]
suppliers = db["suppliers"]
payments = db["payments"]

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
        "total_amount": 1,
        "status": 1
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
            'total_amount': data['total_amount'],
            'status': 'unpaid'
        }

        result = invoices.insert_one(invoice_data)
        print(f"Invoice saved with ID: {result.inserted_id}")
        
        # --- Deduct stock for each product in the invoice ---
        for item in data['items']:
            product_name = item.get('product_name')
            qty_to_deduct = float(item.get('packing_qty', 0)) * float(item.get('no_of_units', 0))
            if product_name and qty_to_deduct > 0:
                # Find the product by name
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

@app.route('/invoices/<invoice_id>/status', methods=['PUT'])
def update_invoice_status(invoice_id):
    try:
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
def delete_invoice(invoice_id):
    try:
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
            "total_amount": 1,
            "status": 1
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


# --- Supplier Routes ---

@app.route("/suppliers", methods=["GET"])
def get_suppliers():
    all_suppliers = list(suppliers.find({}, {"_id": 1, "name": 1, "address": 1, "contact": 1}))
    for supplier in all_suppliers:
        supplier["_id"] = str(supplier["_id"])
    return jsonify(all_suppliers)


@app.route("/suppliers", methods=["POST"])
def add_supplier():
    data = request.json
    name = data.get("name")
    address = data.get("address")
    contact = data.get("contact", "")

    if not name or not address:
        return jsonify({"error": "Name and address are required"}), 400

    supplier_data = {
        "name": name,
        "address": address,
        "contact": contact
    }

    result = suppliers.insert_one(supplier_data)
    return jsonify({"message": "Supplier added", "id": str(result.inserted_id)}), 201


@app.route('/suppliers/<supplier_id>', methods=['PUT'])
def update_supplier(supplier_id):
    try:
        data = request.get_json()
        result = suppliers.update_one(
            {"_id": ObjectId(supplier_id)},
            {"$set": data}
        )
        if result.matched_count == 0:
            return jsonify({"error": "Supplier not found"}), 404
        return jsonify({"message": "Supplier updated"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 400


@app.route('/suppliers/<supplier_id>', methods=['DELETE'])
def delete_supplier(supplier_id):
    try:
        result = suppliers.delete_one({"_id": ObjectId(supplier_id)})
        if result.deleted_count == 0:
            return jsonify({"error": "Supplier not found"}), 404
        return jsonify({"message": "Supplier deleted"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 400


# --- Purchase Routes ---

@app.route("/purchases", methods=["GET"])
def get_purchases():
    try:
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        
        query = {}
        if start_date or end_date:
            date_query = {}
            if start_date:
                date_query['$gte'] = start_date
            if end_date:
                date_query['$lte'] = end_date
            if date_query:
                query['date'] = date_query
        
        all_purchases = list(purchases.find(query))
        
        for purchase in all_purchases:
            purchase["_id"] = str(purchase["_id"])
        
        return jsonify(all_purchases)
    except Exception as e:
        return jsonify({"error": str(e)}), 400


@app.route("/purchases/<purchase_id>", methods=["GET"])
def get_purchase(purchase_id):
    try:
        purchase = purchases.find_one({"_id": ObjectId(purchase_id)})
        if not purchase:
            return jsonify({"error": "Purchase not found"}), 404
        return jsonify(convert_objectid(purchase))
    except Exception as e:
        return jsonify({"error": str(e)}), 400


@app.route("/purchases", methods=["POST"])
def add_purchase():
    try:
        data = request.get_json()
        
        required_fields = ['purchase_no', 'date', 'supplier_name', 'amount']
        missing_fields = [field for field in required_fields if field not in data or data[field] is None]
        
        if missing_fields:
            return jsonify({'error': f'Missing fields: {", ".join(missing_fields)}'}), 400

        purchase_data = {
            'purchase_no': data['purchase_no'],
            'date': data['date'],
            'supplier_name': data['supplier_name'],
            'amount': float(data['amount']),
            'invoice_number': data.get('invoice_number'),
            'invoice_file': data.get('invoice_file'),
            'description': data.get('description'),
            'reference': data.get('reference'),
            'status': 'completed',
            'timestamp': datetime.now().isoformat()
        }

        result = purchases.insert_one(purchase_data)
        return jsonify({'message': 'Purchase recorded', 'id': str(result.inserted_id)}), 201
    except Exception as e:
        print(f'Error in /purchases: {e}')
        return jsonify({'error': str(e)}), 500


@app.route('/purchases/<purchase_id>', methods=['PUT'])
def update_purchase(purchase_id):
    try:
        data = request.get_json()
        result = purchases.update_one(
            {"_id": ObjectId(purchase_id)},
            {"$set": data}
        )
        if result.matched_count == 0:
            return jsonify({"error": "Purchase not found"}), 404
        return jsonify({"message": "Purchase updated"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 400


@app.route('/purchases/<purchase_id>', methods=['DELETE'])
def delete_purchase(purchase_id):
    try:
        result = purchases.delete_one({"_id": ObjectId(purchase_id)})
        if result.deleted_count == 0:
            return jsonify({"error": "Purchase not found"}), 404
        return jsonify({"message": "Purchase deleted"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 400


# --- Buyer Accounts Routes ---

# GET: All buyer accounts with summary
@app.route('/buyer-accounts', methods=['GET'])
def get_buyer_accounts():
    try:
        all_buyers = list(buyers.find({}, {"_id": 1, "name": 1}))
        accounts = []
        
        for buyer in all_buyers:
            buyer_id = str(buyer["_id"])
            buyer_name = buyer.get("name", "Unknown")
            
            # Get all invoices for this buyer
            buyer_invoices = list(invoices.find({"buyer_name": buyer_name}, {"total_amount": 1, "invoice_no": 1, "date": 1}))
            total_invoiced = sum(inv.get("total_amount", 0) for inv in buyer_invoices)
            
            # Get all payments for this buyer
            buyer_payments = list(payments.find({"buyer_id": ObjectId(buyer_id)}, {"amount": 1}))
            total_paid = sum(pay.get("amount", 0) for pay in buyer_payments)
            
            balance = total_invoiced - total_paid
            
            accounts.append({
                "buyerId": buyer_id,
                "buyerName": buyer_name,
                "totalInvoiced": total_invoiced,
                "totalPaid": total_paid,
                "balance": balance,
                "invoiceCount": len(buyer_invoices),
                "paymentCount": len(buyer_payments)
            })
        
        return jsonify(accounts), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# GET: Single buyer ledger with transactions
@app.route('/buyer-accounts/<buyer_id>', methods=['GET'])
def get_buyer_ledger(buyer_id):
    try:
        buyer = buyers.find_one({"_id": ObjectId(buyer_id)})
        if not buyer:
            return jsonify({"error": "Buyer not found"}), 404
        
        buyer_name = buyer.get("name", "Unknown")
        
        # Get all invoices for this buyer
        buyer_invoices = list(invoices.find({"buyer_name": buyer_name}, 
                                           {"total_amount": 1, "invoice_no": 1, "date": 1}))
        total_invoiced = sum(inv.get("total_amount", 0) for inv in buyer_invoices)
        
        # Get all payments for this buyer
        buyer_payments = list(payments.find({"buyer_id": ObjectId(buyer_id)}, 
                                           {"amount": 1, "date": 1, "reference": 1}))
        total_paid = sum(pay.get("amount", 0) for pay in buyer_payments)
        
        # Build transactions list
        transactions = []
        
        # Add invoices as transactions
        for inv in buyer_invoices:
            transactions.append({
                "date": inv.get("date", ""),
                "type": "invoice",
                "invoiceNumber": inv.get("invoice_no", ""),
                "description": f"Invoice {inv.get('invoice_no', '')}",
                "amount": inv.get("total_amount", 0),
                "reference": ""
            })
        
        # Add payments as transactions
        for pay in buyer_payments:
            transaction = {
                "date": pay.get("date", ""),
                "type": "payment",
                "description": "Payment received",
                "amount": pay.get("amount", 0),
                "reference": pay.get("reference", "")
            }
            # Include image if exists
            if pay.get("image"):
                transaction["image"] = f"data:image/jpeg;base64,{pay.get('image')}" if not pay.get('image').startswith('data:') else pay.get('image')
            transactions.append(transaction)
        
        # Sort transactions by date
        transactions.sort(key=lambda x: x["date"])
        
        balance = total_invoiced - total_paid
        
        return jsonify({
            "buyerId": buyer_id,
            "buyerName": buyer_name,
            "totalInvoiced": total_invoiced,
            "totalPaid": total_paid,
            "balance": balance,
            "transactions": transactions
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# POST: Record payment for buyer
@app.route('/buyer-accounts/<buyer_id>/payment', methods=['POST'])
def record_payment(buyer_id):
    try:
        # Handle both JSON and FormData
        if request.is_json:
            data = request.get_json()
            image_data = None
        else:
            data = request.form.to_dict()
            image_file = request.files.get('image')
            image_data = None
            if image_file:
                image_data = image_file.read().decode('utf-8', errors='ignore')
        
        if not data.get("date") or not data.get("amount"):
            return jsonify({"error": "Date and amount are required"}), 400
        
        buyer = buyers.find_one({"_id": ObjectId(buyer_id)})
        if not buyer:
            return jsonify({"error": "Buyer not found"}), 404
        
        payment_doc = {
            "buyer_id": ObjectId(buyer_id),
            "buyer_name": buyer.get("name", "Unknown"),
            "date": data.get("date"),
            "amount": float(data.get("amount", 0)),
            "reference": data.get("reference", ""),
            "created_at": datetime.now().isoformat()
        }
        
        # Add image if provided
        if image_data:
            # Convert to base64 for storage
            import base64
            try:
                if request.is_json:
                    payment_doc["image"] = image_data
                else:
                    image_binary = request.files.get('image').read()
                    payment_doc["image"] = base64.b64encode(image_binary).decode('utf-8')
            except:
                pass
        
        result = payments.insert_one(payment_doc)
        
        return jsonify({
            "message": "Payment recorded successfully",
            "_id": str(result.inserted_id)
        }), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# --- Financial Analytics Routes ---

@app.route('/financial-summary', methods=['GET'])
def financial_summary():
    try:
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        
        # Build date query
        date_query = {}
        if start_date:
            date_query['$gte'] = start_date
        if end_date:
            date_query['$lte'] = end_date
        
        # Query filters
        invoice_query = {}
        purchase_query = {}
        if date_query:
            invoice_query['date'] = date_query
            purchase_query['date'] = date_query
        
        # Get all relevant invoices and purchases
        all_invoices = list(invoices.find(invoice_query, {"total_amount": 1, "status": 1}))
        all_purchases = list(purchases.find(purchase_query, {"amount": 1}))
        
        # Calculate totals
        total_revenue = sum(inv.get('total_amount', 0) for inv in all_invoices)
        paid_revenue = sum(inv.get('total_amount', 0) for inv in all_invoices if inv.get('status') == 'paid')
        unpaid_revenue = total_revenue - paid_revenue
        
        total_expenses = sum(pur.get('amount', 0) for pur in all_purchases)
        
        gross_profit = total_revenue - total_expenses
        profit_margin = (gross_profit / total_revenue * 100) if total_revenue > 0 else 0
        
        summary = {
            'period': {
                'start_date': start_date,
                'end_date': end_date
            },
            'revenue': {
                'total': total_revenue,
                'paid': paid_revenue,
                'unpaid': unpaid_revenue
            },
            'expenses': total_expenses,
            'profit': {
                'gross': gross_profit,
                'margin_percentage': round(profit_margin, 2)
            },
            'invoice_count': len(all_invoices),
            'purchase_count': len(all_purchases)
        }
        
        return jsonify(summary), 200
    except Exception as e:
        print(f'Error in /financial-summary: {e}')
        return jsonify({'error': str(e)}), 500


@app.route('/inventory-report', methods=['GET'])
def inventory_report():
    try:
        all_products = list(products.find({}, {
            "_id": 1,
            "name": 1,
            "stock_quantity": 1,
            "default_rate_per_kg": 1
        }))
        
        total_inventory_value = 0
        low_stock_items = []
        
        for product in all_products:
            product["_id"] = str(product["_id"])
            stock = float(product.get('stock_quantity', 0))
            rate = float(product.get('default_rate_per_kg', 0))
            product_value = stock * rate
            total_inventory_value += product_value
            product['inventory_value'] = product_value
            
            # Flag low stock items (less than 10 units)
            if stock < 10:
                low_stock_items.append({
                    'product': product['name'],
                    'stock': stock
                })
        
        report = {
            'total_products': len(all_products),
            'total_inventory_value': round(total_inventory_value, 2),
            'low_stock_count': len(low_stock_items),
            'low_stock_items': low_stock_items,
            'products': all_products
        }
        
        return jsonify(report), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)