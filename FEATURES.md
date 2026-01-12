# Complete Billing & Management App

A comprehensive business management system for handling invoices, purchases, inventory, and financial analytics.

## 🎯 Features Overview

### 1. **Financial Dashboard** (`/financial`)
Complete financial overview with real-time metrics:
- **Total Revenue**: Track all sales with breakdown of paid vs unpaid invoices
- **Total Expenses**: Monitor all purchases from suppliers
- **Profit/Loss**: Calculate gross profit and profit margin percentage
- **Net Cash Position**: Shows financial health after all expenses
- **Inventory Value**: Real-time total value of all stock
- **Low Stock Alerts**: Identify products with stock below 10 units
- **Financial Metrics**: Invoices count, purchases count, avg invoice/purchase value, collections rate

### 2. **Purchase Management** (`/purchases`)
Track all supplier purchases:
- View all purchase orders with filters
- Search by purchase number or supplier name
- Date range filtering
- Summary statistics showing total purchases and amounts
- Create new purchase orders with automatic stock updates

### 3. **Create Purchase** (`/purchases/create`)
Add new purchase orders:
- Auto-generate purchase order numbers
- Select suppliers from list
- Add multiple items with automatic rate calculation
- Calculate totals with 5% tax
- Auto-update product stock on purchase

### 4. **Enhanced Home Dashboard** (`/`)
Updated dashboard with all features:
- Financial Dashboard link (primary feature)
- Purchase management access
- Invoice management
- Stock management
- Buyer directory
- Statement generation

### 5. **Inventory Report** (Part of Financial Dashboard)
Complete inventory tracking:
- Total products count
- Total inventory value calculation
- Low stock identification
- Top 10 products by inventory value
- Stock quantity and value per product

## 📊 Financial Calculations

### Revenue
```
Total Revenue = Sum of all invoice amounts
Paid Revenue = Sum of invoices with 'paid' status
Pending Revenue = Total Revenue - Paid Revenue
Collection Rate = (Paid Revenue / Total Revenue) * 100
```

### Expenses
```
Total Expenses = Sum of all purchase amounts
Average Purchase Value = Total Expenses / Number of Purchases
```

### Profit/Loss
```
Gross Profit = Total Revenue - Total Expenses
Profit Margin = (Gross Profit / Total Revenue) * 100
Net Cash Position = Total Revenue - Total Expenses
```

### Inventory Value
```
Inventory Value = Product Stock Quantity × Default Rate Per Unit
Total Inventory Value = Sum of all product inventory values
```

## 🗄️ Database Schema

### Suppliers Collection
```json
{
  "_id": ObjectId,
  "name": string,
  "address": string,
  "contact": string
}
```

### Purchases Collection
```json
{
  "_id": ObjectId,
  "purchase_no": string,
  "date": string (YYYY-MM-DD),
  "supplier_name": string,
  "items": [
    {
      "product_name": string,
      "quantity": number,
      "rate": number,
      "amount": number
    }
  ],
  "subtotal": number,
  "tax": number,
  "total_amount": number,
  "status": string ("completed")
}
```

## 🔗 API Endpoints

### Financial Endpoints

#### Get Financial Summary
```
GET /financial-summary?start_date=2024-01-01&end_date=2024-12-31
```
Returns profit/loss, revenue, expenses, and key metrics.

#### Get Inventory Report
```
GET /inventory-report
```
Returns all products with inventory values and low stock alerts.

### Supplier Endpoints

#### Get All Suppliers
```
GET /suppliers
```

#### Add New Supplier
```
POST /suppliers
Body: {
  "name": string,
  "address": string,
  "contact": string
}
```

#### Update Supplier
```
PUT /suppliers/<supplier_id>
Body: { name, address, contact }
```

#### Delete Supplier
```
DELETE /suppliers/<supplier_id>
```

### Purchase Endpoints

#### Get All Purchases
```
GET /purchases?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD
```

#### Get Single Purchase
```
GET /purchases/<purchase_id>
```

#### Create Purchase
```
POST /purchases
Body: {
  "purchase_no": string,
  "date": string,
  "supplier_name": string,
  "items": [...],
  "subtotal": number,
  "tax": number,
  "total_amount": number
}
```

#### Update Purchase
```
PUT /purchases/<purchase_id>
```

#### Delete Purchase
```
DELETE /purchases/<purchase_id>
```

## 📈 Usage Flows

### Creating a Purchase Order
1. Navigate to `/purchases/create`
2. Fill in purchase order number (auto-generated)
3. Select date and supplier
4. Add items (products with quantities and rates)
5. System auto-calculates amounts and 5% tax
6. Submit - stock is automatically updated

### Viewing Financial Dashboard
1. Navigate to `/financial`
2. (Optional) Select start and end dates
3. Click "Generate Report"
4. View:
   - Revenue cards (total, paid, pending)
   - Expense cards
   - Profit/Loss cards
   - Inventory status
   - Low stock warnings

### Purchase History
1. Navigate to `/purchases`
2. Use date filters or search
3. View summary statistics
4. Click to view details

## 🚀 Installation & Setup

### Backend Setup
```bash
cd billing-backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
python app.py
```

### Frontend Setup
```bash
cd billing-app
npm install
npm run dev
```

## 📝 Environment Variables

Create `.env` file in billing-backend:
```
MONGO_URI=your_mongodb_connection_string
```

Create `.env.local` in billing-app:
```
NEXT_PUBLIC_API_URL=http://localhost:5000
```

## 💡 Key Features

✅ Complete purchase tracking with auto stock updates
✅ Real-time financial dashboard with profit/loss calculation
✅ Inventory value tracking with low stock alerts
✅ Date range filtering for all reports
✅ Search functionality for invoices and purchases
✅ Tax calculation (5% on purchases)
✅ Revenue paid vs pending tracking
✅ Supplier management
✅ Responsive design for all devices
✅ Professional UI with Tailwind CSS

## 🔄 Workflow Example

1. **Create Products** → Add inventory items with rates
2. **Add Suppliers** → Create supplier directory
3. **Create Invoices** → Sell to buyers (stock decreases)
4. **Create Purchases** → Buy from suppliers (stock increases)
5. **View Financial Dashboard** → Monitor profit/loss in real-time
6. **Check Inventory** → Get alerts for low stock items
7. **Generate Reports** → Export statements and financial data

## 📊 Key Metrics Tracked

- Total Revenue (Sales)
- Total Expenses (Purchases)
- Profit/Loss
- Profit Margin %
- Cash Flow Position
- Collection Rate
- Inventory Value
- Stock Levels
- Average Transaction Values
- Low Stock Items

---

**Built with**: Next.js, React, Flask, MongoDB, Tailwind CSS
