from flask import Flask, request, jsonify, send_file, g
from flask_cors import CORS
import os
from dotenv import load_dotenv
from pymongo import MongoClient
from datetime import datetime, timedelta, timezone
from bson import ObjectId
import io
import asyncio
from playwright.async_api import async_playwright
import re
import bcrypt
import jwt

load_dotenv()

app = Flask(__name__)
CORS(app)

# MongoDB setup
MONGO_URI = os.getenv("MONGO_URI")
client = MongoClient(MONGO_URI)
db = client["billing-app"]  # shared (auth) database
users = db["users"]

# --- Multi-tenant helpers ---


def get_tenant_db_name(user_doc) -> str:
    """Return a valid MongoDB database name for the user's tenant.

    MongoDB Atlas limits database names to a maximum of 38 bytes. The old
    format (billing-app-user-<ObjectId>) could exceed this limit. We now use
    a shorter, stable name derived from the user id: "u_<ObjectId>".

    If an existing tenant_db is present but too long, we transparently migrate
    to the new short name.
    """
    existing = user_doc.get("tenant_db")
    if existing and len(existing) <= 38:
        return existing
    # New compact format: prefix + 24-hex ObjectId => 2 + 1 + 24 = 27 chars
    short_name = f"u_{str(user_doc['_id'])}"
    return short_name


def ensure_tenant_db(user_doc):
    """Ensure a per-user database exists and is recorded on the user doc.

    Creates a dedicated database name for the user (if not already set) and
    returns a handle to that database. Collections are created lazily by MongoDB
    on first write, so we don't need to explicitly create them here.
    """
    tenant_db_name = get_tenant_db_name(user_doc)
    # Persist tenant_db name on the user document if missing or changed (migration)
    if user_doc.get("tenant_db") != tenant_db_name:
        try:
            users.update_one({"_id": user_doc["_id"]}, {
                             "$set": {"tenant_db": tenant_db_name}})
            user_doc["tenant_db"] = tenant_db_name
        except Exception as e:
            print("Failed to set tenant_db on user:", e)
    return client[tenant_db_name]


def _get_tenant_db():
    dbh = getattr(g, "db", None)
    if dbh is None:
        raise RuntimeError("Tenant DB not set on request context")
    return dbh


def invoices_col():
    return _get_tenant_db()["invoices"]


def buyers_col():
    return _get_tenant_db()["buyers"]


def products_col():
    return _get_tenant_db()["products"]


# Ensure unique index for users email
try:
    users.create_index("email", unique=True)
except Exception as e:
    # Index might already exist; log and continue
    print("Index creation error (users.email):", e)

# JWT setup
JWT_SECRET = os.getenv("JWT_SECRET", "change-me-in-prod")
JWT_ALGO = "HS256"


def generate_jwt(user_doc):
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(user_doc["_id"]),
        "email": user_doc.get("email"),
        "role": user_doc.get("role", "user"),
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(days=7)).timestamp()),
    }
    token = jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGO)
    # pyjwt>=2 returns str
    return token


def decode_jwt(token: str):
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGO])
    except jwt.ExpiredSignatureError:
        return {"error": "Token expired"}
    except jwt.InvalidTokenError:
        return {"error": "Invalid token"}


PUBLIC_PATHS = set([
    "/auth/login",
    "/auth/signup",
])


@app.before_request
def auth_guard():
    # Allow CORS preflight
    if request.method == "OPTIONS":
        return None

    path = request.path
    if path in PUBLIC_PATHS or path.startswith("/static/"):
        return None

    # Expect Bearer token
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        return jsonify({"error": "Authorization header missing or malformed"}), 401

    token = auth_header.split(" ", 1)[1].strip()
    payload = decode_jwt(token)
    if isinstance(payload, dict) and payload.get("error"):
        return jsonify(payload), 401

    user_id = payload.get("sub")
    if not user_id:
        return jsonify({"error": "Invalid token payload"}), 401
    try:
        user = users.find_one({"_id": ObjectId(user_id)})
        if not user:
            return jsonify({"error": "User not found"}), 401
        # Ensure per-user tenant database and attach to request context
        tenant_db = ensure_tenant_db(user)
        g.user = user
        g.user_id = user_id
        g.db = tenant_db
    except Exception as e:
        print("Auth guard error:", e)
        return jsonify({"error": "Invalid user in token"}), 401
    return None


@app.route("/")
def home():
    return jsonify({"message": "Billing backend is live!"})

# ---------------------- AUTH ROUTES ----------------------


def valid_email(email: str) -> bool:
    return bool(re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", email or ""))


def password_rules(password: str) -> str | None:
    if not password or len(password) < 8:
        return "Password must be at least 8 characters"
    return None


@app.route("/auth/signup", methods=["POST"])
def signup():
    data = request.get_json(force=True, silent=True) or {}
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""
    role = (data.get("role") or "user").strip() or "user"

    if not valid_email(email):
        return jsonify({"error": "Invalid email"}), 400
    rule_err = password_rules(password)
    if rule_err:
        return jsonify({"error": rule_err}), 400

    try:
        # Hash password with bcrypt
        hashed = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt())
        user_doc = {
            "email": email,
            "hashed_password": hashed.decode("utf-8"),
            "role": role,
            "created_at": datetime.now(timezone.utc),
        }
        res = users.insert_one(user_doc)
        user_doc["_id"] = res.inserted_id
        # Provision a dedicated tenant DB for this user and persist the name
        tenant_db = ensure_tenant_db(user_doc)
        # Optionally touch collections so they appear immediately (no-op writes avoided)
        _ = tenant_db.name  # keep reference used
        token = generate_jwt(user_doc)
        return jsonify({
            "message": "Signup successful",
            "token": token,
            "user": {
                "id": str(user_doc["_id"]),
                "email": user_doc["email"],
                "role": user_doc.get("role", "user"),
                "createdAt": user_doc["created_at"].isoformat() + "Z",
                "tenantDb": user_doc.get("tenant_db"),
            },
        }), 201
    except Exception as e:
        if "E11000" in str(e):
            return jsonify({"error": "Email already registered"}), 409
        print("Signup error:", e)
        return jsonify({"error": "Internal server error"}), 500


@app.route("/auth/login", methods=["POST"])
def login():
    data = request.get_json(force=True, silent=True) or {}
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    if not valid_email(email) or not password:
        return jsonify({"error": "Email and password are required"}), 400

    user = users.find_one({"email": email})
    if not user:
        return jsonify({"error": "Invalid credentials"}), 401

    hashed = (user.get("hashed_password") or "").encode("utf-8")
    if not hashed or not bcrypt.checkpw(password.encode("utf-8"), hashed):
        return jsonify({"error": "Invalid credentials"}), 401

    token = generate_jwt(user)
    return jsonify({
        "message": "Login successful",
        "token": token,
        "user": {
            "id": str(user["_id"]),
            "email": user.get("email"),
            "role": user.get("role", "user"),
            "createdAt": (user.get("created_at") or datetime.utcnow()).isoformat() + "Z",
        },
    }), 200


@app.route("/auth/me", methods=["GET"])
def me():
    # Protected by auth_guard
    user = getattr(g, "user", None)
    if not user:
        return jsonify({"error": "Unauthorized"}), 401
    return jsonify({
        "id": str(user["_id"]),
        "email": user.get("email"),
        "role": user.get("role", "user"),
        "createdAt": (user.get("created_at") or datetime.utcnow()).isoformat() + "Z",
    }), 200


@app.route("/auth/clear", methods=["POST"])  # stateless; client clears token
def clear_auth():
    return jsonify({"message": "Cleared on client. No server state."}), 200

# Utility: Convert ObjectId to string


def convert_objectid(doc):
    if doc and "_id" in doc and isinstance(doc["_id"], ObjectId):
        doc["_id"] = str(doc["_id"])
    return doc

# --- Invoice Routes ---

# GET: All invoices


@app.route("/invoices", methods=["GET"])
def get_invoices():
    all_invoices = list(invoices_col().find({}, {
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
        invoice = invoices_col().find_one({"_id": ObjectId(invoice_id)})
        if not invoice:
            return jsonify({"error": "Invoice not found"}), 404

        # Debug: Check if GSTIN exists in retrieved invoice
        print(
            f"Retrieved invoice {invoice_id}, GSTIN: {invoice.get('gstin', 'NOT FOUND')}")

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
        required_fields = ['invoice_no', 'date', 'buyer_name',
                           'address', 'items', 'subtotal', 'cgst', 'sgst', 'total_amount']

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
            # Default to empty string if not provided
            'gstin': data.get('gstin', ''),
            'items': data['items'],
            'subtotal': data['subtotal'],
            'cgst': data['cgst'],
            'sgst': data['sgst'],
            'total_amount': data['total_amount'],
            'status': 'unpaid'
        }

        result = invoices_col().insert_one(invoice_data)
        print(f"Invoice saved with ID: {result.inserted_id}")

        # --- Deduct stock for each product in the invoice ---
        for item in data['items']:
            product_name = item.get('product_name')
            qty_to_deduct = float(item.get('packing_qty', 0)) * \
                float(item.get('no_of_units', 0))
            if product_name and qty_to_deduct > 0:
                # Find the product by name
                product = products_col().find_one({"name": product_name})
                if product:
                    new_stock = float(product.get(
                        'stock_quantity', 0)) - qty_to_deduct
                    products_col().update_one(
                        {"_id": product["_id"]},
                        {"$set": {"stock_quantity": new_stock}}
                    )
                    print(
                        f"Deducted {qty_to_deduct} from {product_name}, new stock: {new_stock}")

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

        result = invoices_col().update_one(
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
        result = invoices_col().update_one(
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
        result = invoices_col().delete_one({"_id": ObjectId(invoice_id)})
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
    all_buyers = list(buyers_col().find(
        {}, {"_id": 1, "name": 1, "address": 1, "gstin": 1}))
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
        buyer = buyers_col().find_one({"_id": ObjectId(buyer_id)})
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

    result = buyers_col().insert_one(buyer_data)
    return jsonify({"message": "Buyer added successfully", "id": str(result.inserted_id)}), 201

# PUT: Update buyer


@app.route('/buyers/<buyer_id>', methods=['PUT'])
def update_buyer(buyer_id):
    try:
        data = request.get_json()

        # Ensure gstin field exists in update data
        if 'gstin' not in data:
            data['gstin'] = ''

        result = buyers_col().update_one(
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
        result = buyers_col().delete_one({"_id": ObjectId(buyer_id)})
        if result.deleted_count == 0:
            return jsonify({"error": "Buyer not found"}), 404
        return jsonify({"message": "Buyer deleted successfully"}), 200
    except Exception as e:
        print(f"Error deleting buyer {buyer_id}:", e)
        return jsonify({"error": "Invalid buyer ID or server error"}), 400

# --- Product Routes ---


@app.route("/products", methods=["GET"])
def get_products():
    all_products = list(products_col().find({}, {
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
        product = products_col().find_one({"_id": ObjectId(product_id)})
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

    result = products_col().insert_one(product_data)
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

        product = products_col().find_one({"_id": ObjectId(product_id)})
        if not product:
            return jsonify({"error": "Product not found"}), 404

        current_stock = float(product.get("stock_quantity", 0))
        new_stock = current_stock + delta  # Allow negative stock

        result = products_col().update_one(
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
        result = products_col().update_one(
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
        result = products_col().delete_one({"_id": ObjectId(product_id)})
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
        buyer = buyers_col().find_one({"_id": ObjectId(buyer_id)})
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
                    datetime.strptime(start_date, '%Y-%m-%d')
                    date_query['$gte'] = start_date
                except ValueError:
                    return jsonify({"error": "Invalid start_date format. Use YYYY-MM-DD"}), 400

            if end_date:
                try:
                    # Validate date format
                    datetime.strptime(end_date, '%Y-%m-%d')
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
        invoices_list = list(invoices_col().find(query, projection))

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
