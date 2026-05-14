import React, { useState } from "react";
import { v4 as uuidv4 } from "uuid";
import "aos/dist/aos.css";

const AMOUNTS = [
  { label: "₹1", value: "1.00" },
  { label: "₹5", value: "5.00" },
  { label: "₹10", value: "10.00" },
  { label: "₹200", value: "200.00" },
  { label: "₹500", value: "500.00" },
  { label: "₹1,000", value: "1000.00" },
];

const styles = {
  page: {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #f0f4ff 0%, #fafbff 60%, #eef2ff 100%)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "2rem 1rem",
    fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
  },
  card: {
    background: "#ffffff",
    borderRadius: "20px",
    boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05), 0 24px 48px -8px rgba(26, 63, 170, 0.12)",
    padding: "2.5rem",
    width: "100%",
    maxWidth: "460px",
  },
  header: {
    display: "flex",
    alignItems: "center",
    gap: "14px",
    marginBottom: "2rem",
  },
  iconWrap: {
    width: "48px",
    height: "48px",
    borderRadius: "14px",
    background: "linear-gradient(135deg, #1a3faa 0%, #2952cc 100%)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  brandTitle: {
    fontSize: "18px",
    fontWeight: "700",
    color: "#0f1c3f",
    margin: 0,
    letterSpacing: "-0.3px",
  },
  brandSub: {
    fontSize: "13px",
    color: "#7b8ab8",
    margin: 0,
    marginTop: "2px",
  },
  divider: {
    height: "1px",
    background: "linear-gradient(90deg, #e8ecf8 0%, #f5f6fa 100%)",
    marginBottom: "1.75rem",
  },
  sectionLabel: {
    fontSize: "11px",
    fontWeight: "600",
    color: "#9ba8c5",
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    marginBottom: "10px",
  },
  amountGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: "8px",
    marginBottom: "1.75rem",
  },
  amtBtn: (selected) => ({
    padding: "11px 8px",
    border: selected ? "1.5px solid #1a3faa" : "1.5px solid #e4e8f5",
    borderRadius: "10px",
    background: selected ? "#eef2ff" : "#fafbff",
    color: selected ? "#1a3faa" : "#4a5580",
    fontSize: "14px",
    fontWeight: selected ? "700" : "500",
    cursor: "pointer",
    transition: "all 0.15s ease",
    textAlign: "center",
    outline: "none",
  }),
  fieldRow: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "12px",
  },
  field: {
    marginBottom: "14px",
  },
  label: {
    display: "block",
    fontSize: "11px",
    fontWeight: "600",
    color: "#9ba8c5",
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    marginBottom: "7px",
  },
  input: {
    width: "100%",
    padding: "11px 14px",
    border: "1.5px solid #e4e8f5",
    borderRadius: "10px",
    background: "#fafbff",
    color: "#0f1c3f",
    fontSize: "14px",
    outline: "none",
    transition: "border-color 0.15s, box-shadow 0.15s",
    boxSizing: "border-box",
    fontFamily: "inherit",
  },
  totalRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "14px 16px",
    background: "#f4f6ff",
    borderRadius: "12px",
    marginBottom: "1.5rem",
  },
  totalLabel: {
    fontSize: "13px",
    color: "#7b8ab8",
    fontWeight: "500",
  },
  totalAmount: {
    fontSize: "22px",
    fontWeight: "700",
    color: "#1a3faa",
    letterSpacing: "-0.5px",
  },
  payBtn: (loading) => ({
    width: "100%",
    padding: "14px",
    background: loading
      ? "#6b82c4"
      : "linear-gradient(135deg, #1a3faa 0%, #2952cc 100%)",
    color: "#fff",
    border: "none",
    borderRadius: "12px",
    fontSize: "15px",
    fontWeight: "600",
    cursor: loading ? "not-allowed" : "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    letterSpacing: "0.01em",
    transition: "opacity 0.15s, transform 0.1s",
    outline: "none",
  }),
  security: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "6px",
    marginTop: "14px",
    fontSize: "12px",
    color: "#b0b9d4",
  },
};

const CardIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <rect x="2" y="5" width="20" height="14" rx="3" stroke="white" strokeWidth="1.6" />
    <path d="M2 10h20" stroke="white" strokeWidth="1.6" />
    <rect x="5" y="14" width="5" height="2" rx="1" fill="white" />
  </svg>
);

const LockIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
    <rect x="5" y="11" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.8" />
    <path d="M8 11V7a4 4 0 018 0v4" stroke="currentColor" strokeWidth="1.8" />
  </svg>
);

const ShieldIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="white" strokeWidth="1.8" strokeLinejoin="round" />
    <path d="M9 12l2 2 4-4" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const HdfcPaymentForm = () => {
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState(null);
  const [form, setForm] = useState({
    amount: "1000.00",
    customerId: "CUST_" + uuidv4(),
    customerEmail: "",
    customerPhone: "",
    orderId: "ORD_" + uuidv4(),
    firstName: "",
    lastName: "",
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const selectAmount = (value) => {
    setForm({ ...form, amount: value });
  };

  const formatAmount = (val) => {
    const num = parseFloat(val);
    return "₹" + num.toLocaleString("en-IN");
  };

  const startPayment = async () => {
    if (!form.firstName || !form.lastName || !form.customerEmail || !form.customerPhone) {
      alert("Please fill in all fields before proceeding.");
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.customerEmail)) {
      alert("Please enter a valid email address.");
      return;
    }

    // Validate phone (at least 10 digits)
    if (form.customerPhone.replace(/\D/g, "").length < 10) {
      alert("Please enter a valid phone number.");
      return;
    }

    try {
      setLoading(true);
      console.log(" Initiating payment session:", form.orderId);

      const res = await fetch("/api/v1/hdfc/create-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          amount: parseFloat(form.amount), // Ensure amount is a number
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Payment initiation failed");
      }

      if (!data.paymentLink) {
        throw new Error("No payment link received from server");
      }

      console.log(" Payment session created:", data.orderId);
      console.log(" Redirecting to HDFC payment page...");

      // Store orderId in sessionStorage for reference after callback
      sessionStorage.setItem("pendingOrderId", form.orderId);
      sessionStorage.setItem("pendingAmount", form.amount);

      // Redirect to HDFC payment page
      window.location.href = data.paymentLink;
    } catch (err) {
      console.error("Payment error:", err);
      alert(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = (name) => ({
    ...styles.input,
    borderColor: focusedField === name ? "#1a3faa" : "#e4e8f5",
    boxShadow: focusedField === name ? "0 0 0 3px rgba(26, 63, 170, 0.08)" : "none",
  });

  return (
    <div style={styles.page}>
      <div style={styles.card}>

        {/* Header */}
        <div style={styles.header}>
          <div style={styles.iconWrap}>
            <CardIcon />
          </div>
          <div>
            <p style={styles.brandTitle}>HDFC Payment</p>
            <p style={styles.brandSub}>Secure checkout · SSL encrypted</p>
          </div>
        </div>

        <div style={styles.divider} />

        {/* Amount Selection */}
        <div style={{ marginBottom: "1.75rem" }}>
          <p style={styles.sectionLabel}>Select amount</p>
          <div style={styles.amountGrid}>
            {AMOUNTS.map(({ label, value }) => (
              <button
                key={value}
                style={styles.amtBtn(form.amount === value)}
                onClick={() => selectAmount(value)}
                onMouseEnter={(e) => {
                  if (form.amount !== value) {
                    e.currentTarget.style.borderColor = "#b0bce8";
                    e.currentTarget.style.background = "#f4f6ff";
                  }
                }}
                onMouseLeave={(e) => {
                  if (form.amount !== value) {
                    e.currentTarget.style.borderColor = "#e4e8f5";
                    e.currentTarget.style.background = "#fafbff";
                  }
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Name Fields */}
        <div style={styles.fieldRow}>
          <div style={styles.field}>
            <label style={styles.label}>First name</label>
            <input
              type="text"
              name="firstName"
              placeholder="Rahul"
              value={form.firstName}
              onChange={handleChange}
              onFocus={() => setFocusedField("firstName")}
              onBlur={() => setFocusedField(null)}
              style={inputStyle("firstName")}
            />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Last name</label>
            <input
              type="text"
              name="lastName"
              placeholder="Sharma"
              value={form.lastName}
              onChange={handleChange}
              onFocus={() => setFocusedField("lastName")}
              onBlur={() => setFocusedField(null)}
              style={inputStyle("lastName")}
            />
          </div>
        </div>

        {/* Email */}
        <div style={styles.field}>
          <label style={styles.label}>Email address</label>
          <input
            type="email"
            name="customerEmail"
            placeholder="rahul@example.com"
            value={form.customerEmail}
            onChange={handleChange}
            onFocus={() => setFocusedField("customerEmail")}
            onBlur={() => setFocusedField(null)}
            style={inputStyle("customerEmail")}
          />
        </div>

        {/* Phone */}
        <div style={styles.field}>
          <label style={styles.label}>Phone number</label>
          <input
            type="tel"
            name="customerPhone"
            placeholder="+91 98765 43210"
            value={form.customerPhone}
            onChange={handleChange}
            onFocus={() => setFocusedField("customerPhone")}
            onBlur={() => setFocusedField(null)}
            style={inputStyle("customerPhone")}
          />
        </div>

        {/* Total Row */}
        <div style={styles.totalRow}>
          <span style={styles.totalLabel}>Total payable</span>
          <span style={styles.totalAmount}>{formatAmount(form.amount)}</span>
        </div>

        {/* Pay Button */}
        <button
          style={styles.payBtn(loading)}
          onClick={startPayment}
          disabled={loading}
          onMouseEnter={(e) => {
            if (!loading) e.currentTarget.style.opacity = "0.9";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = "1";
          }}
          onMouseDown={(e) => {
            if (!loading) e.currentTarget.style.transform = "scale(0.99)";
          }}
          onMouseUp={(e) => {
            e.currentTarget.style.transform = "scale(1)";
          }}
        >
          {loading ? (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ animation: "spin 1s linear infinite" }}>
                <circle cx="12" cy="12" r="10" stroke="white" strokeWidth="2" strokeDasharray="32" strokeDashoffset="10" strokeLinecap="round" />
              </svg>
              Processing...
            </>
          ) : (
            <>
              <ShieldIcon />
              Pay {formatAmount(form.amount)} securely
            </>
          )}
        </button>

        {/* Security Note */}
        <div style={styles.security}>
          <LockIcon />
          <span>256-bit SSL · PCI DSS compliant · HDFC SmartGateway</span>
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default HdfcPaymentForm;
