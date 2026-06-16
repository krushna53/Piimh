# 🔄 Complete Payment Flow - Frontend & Backend Sync

## Payment Journey Flow Diagram

```
┌──────────────────────────────────────────────────────────────────────────┐
│                          FRONTEND (/payment page)                         │
│                                                                            │
│  User fills form:                                                         │
│  - First Name, Last Name                                                  │
│  - Email, Phone                                                           │
│  - Amount (select or custom)                                              │
│  - Auto-generated: orderId, customerId                                    │
│                                                                            │
│  [Validates: Email, Phone, All Fields] ✓                                  │
│  └─────────────────────┬─────────────────────┘                            │
└──────────────────────────────────────────────────────────────────────────┘
                         │
                         │ POST /api/v1/hdfc/create-session
                         │ {orderId, amount, email, phone, firstName, lastName}
                         │
                         ↓
┌──────────────────────────────────────────────────────────────────────────┐
│                      BACKEND (Node.js + Express)                          │
│                                                                            │
│  1️⃣  Receive Request                                                      │
│     └─ Validate input (email format, phone, amount > 0) ✓                 │
│                                                                            │
│  2️⃣  Log to Firebase as "Pending"                                         │
│     └─ transactions/{orderId}                                             │
│        {                                                                   │
│          orderId, amount, status: "Pending",                              │
│          customerId, customerEmail, customerPhone,                        │
│          source: "create-session",                                        │
│          timestamp: [server timestamp]                                    │
│        }                                                                   │
│                                                                            │
│  3️⃣  Create HDFC Session                                                  │
│     └─ POST https://smartgateway.hdfcuat.bank.in/session                  │
│        └─ Return URL: /api/v1/hdfc/payment-callback  ← WEBHOOK            │
│                                                                            │
│  4️⃣  Return Payment Link to Frontend                                      │
│     └─ {                                                                   │
│        success: true,                                                     │
│        orderId: "ORD_xxx",                                                │
│        paymentLink: "https://smartgateway.hdfcuat.bank.in/pay?session=..." │
│      }                                                                     │
└──────────────────────────────────────────────────────────────────────────┘
                         │
                         │ return paymentLink
                         │
                         ↓
┌──────────────────────────────────────────────────────────────────────────┐
│                     FRONTEND - Redirect to HDFC                           │
│                                                                            │
│  [Stores orderId in sessionStorage]                                       │
│  window.location.href = paymentLink                                       │
│  └─ User redirected to HDFC payment page                                  │
│     (User sees: Enter card details, OTP, etc.)                            │
│                                                                            │
│  Payment outcomes:                                                        │
│  ✅ User completes payment → HDFC confirms                                │
│  ❌ User cancels payment → HDFC marks as cancelled                        │
│  ⏱️  User timeout → HDFC marks as failed                                  │
└──────────────────────────────────────────────────────────────────────────┘
                         │
        ┌────────────────┴────────────────┐
        │                                  │
        ↓ Success                          ↓ Failure
   
┌────────────────┐                   ┌────────────────┐
│ HDFC confirms  │                   │ HDFC fails     │
│ payment        │                   │ payment        │
└────────────┬───┘                   └────────────┬───┘
             │                                    │
             │ Redirect to callback URL           │ Redirect to callback URL
             │ GET/POST /api/v1/hdfc/payment-callback
             │ {order_id, status:"success", amount, hash}
             │
             ↓
┌──────────────────────────────────────────────────────────────────────────┐
│                  BACKEND - Payment Callback Handler                       │
│                                                                            │
│  1️⃣  Receive HDFC Callback                                               │
│     └─ order_id: "ORD_xxx"                                                │
│     └─ status: "success" or "failed" or "cancelled"                       │
│     └─ hash: "transaction-hash-from-hdfc"                                 │
│                                                                            │
│  2️⃣  Log Callback to Firebase                                             │
│     └─ Update transactions/{orderId}:                                     │
│        {                                                                   │
│          status: "Success" or "Failed",  ← UPDATED from "Pending"        │
│          responseHash: hash,             ← New                            │
│          hdfcStatus: status,             ← New                            │
│          source: "payment-callback",     ← New                            │
│          callbackAt: [timestamp],        ← New                            │
│          fullResponse: {...}             ← Full HDFC response             │
│        }                                                                   │
│                                                                            │
│     └─ Append to sub-collection:                                          │
│        transactions/{orderId}/history    ← Audit trail                    │
│        {                                                                   │
│          status: "Success",                                               │
│          timestamp: [server timestamp],                                   │
│          details: {...}                                                   │
│        }                                                                   │
│                                                                            │
│  3️⃣  Redirect to Frontend Status Page                                     │
│     └─ res.redirect(`/payment-status?order_id=${orderId}`)                │
│        (Preserve order_id in URL for reference)                           │
└──────────────────────────────────────────────────────────────────────────┘
                         │
                         │ Redirect: /payment-status?order_id=ORD_xxx
                         │
                         ↓
┌──────────────────────────────────────────────────────────────────────────┐
│                    FRONTEND - Payment Status Page                         │
│                                                                            │
│  1️⃣  Component Mounts (useEffect)                                         │
│     └─ Get order_id from URL params or sessionStorage                     │
│                                                                            │
│  2️⃣  Show "Verifying payment..." spinner                                  │
│                                                                            │
│  3️⃣  Query Backend for Status                                             │
│     └─ GET /api/v1/hdfc/transaction-log/{orderId}                         │
│     └─ Backend returns:                                                   │
│        {                                                                   │
│          success: true,                                                   │
│          data: {                                                          │
│            orderId: "ORD_xxx",                                            │
│            amount: 1000,                                                  │
│            status: "Success" | "Failed" | "Pending",                      │
│            responseHash: "hash",                                          │
│            timestamp: "2026-05-13T...",                                   │
│            ...                                                            │
│          }                                                                │
│        }                                                                  │
│                                                                            │
│  4️⃣  Display Appropriate Screen:                                          │
│                                                                            │
│     ✅ Success:                                                            │
│        ├─ Green checkmark icon                                            │
│        ├─ "Payment Successful!"                                           │
│        ├─ Show: Order ID, Amount, Status, Transaction ID                 │
│        └─ Buttons: [Return to Home] [Download Receipt]                   │
│                                                                            │
│     ❌ Failed:                                                             │
│        ├─ Red X icon                                                      │
│        ├─ "Payment Failed"                                                │
│        ├─ Show: Error message, Order ID, Amount                           │
│        └─ Buttons: [Try Again] [Return to Home]                           │
│                                                                            │
│     ⏱️  Pending:                                                           │
│        ├─ Warning icon                                                    │
│        ├─ "Payment Pending"                                               │
│        ├─ "Still being processed, please wait..."                         │
│        └─ Button: [Check Status Again]                                    │
│                                                                            │
│     ⚠️  Error:                                                             │
│        ├─ Error icon                                                      │
│        ├─ "Error"                                                         │
│        └─ Button: [Try Again]                                             │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## 📊 Complete Data Flow

### Step 1: Payment Initiation (Frontend → Backend)

**Request:**
```javascript
POST /api/v1/hdfc/create-session

{
  "orderId": "ORD_12345678-1234-1234-1234",
  "amount": 1000,
  "customerId": "CUST_87654321-4321-4321-4321",
  "customerEmail": "user@example.com",
  "customerPhone": "9876543210",
  "firstName": "Rahul",
  "lastName": "Sharma"
}
```

**Response:**
```json
{
  "success": true,
  "orderId": "ORD_12345678-1234-1234-1234",
  "paymentLink": "https://smartgateway.hdfcuat.bank.in/pay?session=abc123def456...",
  "message": "Payment session created successfully"
}
```

**Firebase Log (Pending):**
```
Collection: transactions
Document: ORD_12345678-1234-1234-1234

{
  "orderId": "ORD_12345678-1234-1234-1234",
  "amount": 1000,
  "status": "Pending",
  "responseHash": null,
  "customerId": "CUST_87654321-4321-4321-4321",
  "customerEmail": "user@example.com",
  "customerPhone": "9876543210",
  "sessionInitiated": true,
  "source": "create-session",
  "lastUpdated": 1715587200000  // Server timestamp
}
```

---

### Step 2: Payment Completion (HDFC → Backend Webhook)

**HDFC Redirects Back:**
```
GET /api/v1/hdfc/payment-callback?order_id=ORD_12345678-1234-1234-1234&status=success&amount=1000&hash=abc123xyz
```

**Backend Processing:**
- Receives callback from HDFC
- Validates order_id and status
- Updates Firebase with Success/Failed
- Appends to history sub-collection
- Redirects to `/payment-status?order_id=ORD_12345678-1234-1234-1234`

**Firebase Log (Updated):**
```
Collection: transactions
Document: ORD_12345678-1234-1234-1234

{
  "orderId": "ORD_12345678-1234-1234-1234",
  "amount": 1000,
  "status": "Success",  ← CHANGED from "Pending"
  "responseHash": "abc123xyz",  ← NEW from HDFC
  "hdfcStatus": "success",  ← NEW
  "source": "payment-callback",  ← NEW
  "callbackAt": "2026-05-13T04:44:25.039Z",  ← NEW
  "lastUpdated": 1715587245000  ← NEW timestamp
}

Sub-collection: transactions/ORD_12345678-1234-1234-1234/history
Document: [auto-generated]

{
  "status": "Success",
  "timestamp": 1715587245000,
  "details": {
    "hdfcStatus": "success",
    "source": "payment-callback",
    ...
  }
}
```

---

### Step 3: Status Check (Frontend → Backend)

**Request:**
```javascript
GET /api/v1/hdfc/transaction-log/ORD_12345678-1234-1234-1234
```

**Response:**
```json
{
  "success": true,
  "data": {
    "orderId": "ORD_12345678-1234-1234-1234",
    "amount": 1000,
    "status": "Success",
    "responseHash": "abc123xyz",
    "customerId": "CUST_87654321-4321-4321-4321",
    "customerEmail": "user@example.com",
    "customerPhone": "9876543210",
    "hdfcStatus": "success",
    "source": "payment-callback",
    "callbackAt": "2026-05-13T04:44:25.039Z",
    "lastUpdated": {
      "_seconds": 1715587245,
      "_nanoseconds": 39000000
    }
  }
}
```

---

## 🔗 URL Endpoints Summary

### Frontend Routes
- **`/payment`** - Payment form page
- **`/payment-status`** - Payment status page (after callback)

### Backend API Routes
- **`POST /api/v1/hdfc/create-session`** - Create payment session
- **`GET /api/v1/hdfc/order-status`** - Poll HDFC for status
- **`POST /api/v1/hdfc/payment-callback`** - HDFC webhook callback
- **`GET /api/v1/hdfc/payment-callback`** - Handle GET redirects
- **`GET /api/v1/hdfc/transaction-log/:orderId`** - Get transaction log

---

## ✅ Fixed Issues

1. ✅ **Frontend API URL was wrong:**
   - ❌ Was: `/api/v1/api/hdfc/create-session` (double /api)
   - ✅ Now: `/api/v1/hdfc/create-session`

2. ✅ **Webhook Callback now redirects to frontend:**
   - ✅ Callback → Backend logs response → Frontend status page
   - ✅ Frontend queries backend for final status

3. ✅ **Dynamic logging flow:**
   - ✅ User sends request → Logs as "Pending"
   - ✅ HDFC redirects back → Logs as "Success"/"Failed"
   - ✅ Frontend queries status → Gets updated transaction

4. ✅ **Input validation:**
   - ✅ Email format
   - ✅ Phone format (10+ digits)
   - ✅ Amount > 0
   - ✅ All required fields

5. ✅ **Transaction history audit trail:**
   - ✅ Sub-collection tracks every status change
   - ✅ Timestamps recorded server-side

---

## 🧪 Testing the Complete Flow

### Test 1: Happy Path (Success)
```bash
# 1. Open frontend payment page
http://localhost:3000/payment

# 2. Fill form and click Pay
# → Frontend calls POST /api/v1/hdfc/create-session
# → Backend logs as "Pending"
# → Returns payment link
# → Browser redirects to HDFC

# 3. Simulate HDFC callback (in Postman/curl)
POST /api/v1/hdfc/payment-callback
?order_id=TEST_001&status=success&amount=1000&hash=xyz123

# 4. Check transaction log
GET /api/v1/hdfc/transaction-log/TEST_001
# → Returns status: "Success"
```

### Test 2: Failure Path
```bash
# Same as above but HDFC returns failure
POST /api/v1/hdfc/payment-callback
?order_id=TEST_002&status=failed&amount=1000

# Frontend shows failure screen
```

---

## 📝 Notes

- **Order IDs** are generated client-side using `uuidv4()`
- **Customer IDs** are also generated client-side for first-time users
- **Server Timestamps** are used for all logs (Firestore `serverTimestamp()`)
- **Idempotency:** Multiple callbacks for same order update the document (merge: true)
- **Audit Trail:** History sub-collection preserves all status changes
- **Fail-Open:** If Firebase logging fails, payments still complete (logging is non-blocking)

---

## 🚀 Production Checklist

Before pushing to production:

- ✅ Frontend API endpoints corrected
- ✅ Webhook callback implemented
- ✅ Status page created and integrated
- ✅ Input validation on frontend and backend
- ✅ Transaction history audit trail
- ✅ Error handling (Pending/Success/Failed/Error states)
- ✅ Server-side timestamps
- ✅ Firebase merge strategy for idempotency
- ⚠️ TODO: Add HDFC response hash verification
- ⚠️ TODO: Add rate limiting to create-session endpoint
- ⚠️ TODO: Set Firestore security rules for production
- ⚠️ TODO: Configure environment variables for production HDFC endpoint
