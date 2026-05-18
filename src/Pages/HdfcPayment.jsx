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
  page: { display: "flex", justifyContent: "center", padding: "24px" },
  card: { width: 420, background: "#fff", borderRadius: 12, padding: 20, boxShadow: "0 6px 20px rgba(12,24,60,0.08)" },
  header: { display: "flex", gap: 12, alignItems: "center", marginBottom: 12 },
  iconWrap: { width: 44, height: 44, borderRadius: 10, background: "#1a3faa", display: "flex", alignItems: "center", justifyContent: "center" },
  brandTitle: { fontSize: 16, fontWeight: 700, margin: 0, letterSpacing: "-0.3px" },
  brandSub: { fontSize: 13, color: "#7b8ab8", margin: 0, marginTop: 2 },
  divider: { height: 1, background: "linear-gradient(90deg, #e8ecf8 0%, #f5f6fa 100%)", marginBottom: 28 },
  sectionLabel: { fontSize: 11, fontWeight: 600, color: "#9ba8c5", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 10 },
  amountGrid: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 28 },
  amtBtn: (selected) => ({ padding: "11px 8px", border: selected ? "1.5px solid #1a3faa" : "1.5px solid #e4e8f5", borderRadius: 10, background: selected ? "#eef2ff" : "#fafbff", color: selected ? "#1a3faa" : "#4a5580", fontSize: 14, fontWeight: selected ? 700 : 500, cursor: "pointer" }),
  fieldRow: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 },
  field: { marginBottom: 14 },
  label: { display: "block", fontSize: 11, fontWeight: 600, color: "#9ba8c5", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 7 },
  input: { width: "100%", padding: "11px 14px", border: "1.5px solid #e4e8f5", borderRadius: 10, background: "#fafbff", color: "#0f1c3f", fontSize: 14, outline: "none" },
  totalRow: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 16px", background: "#f4f6ff", borderRadius: 12, marginBottom: 24 },
  totalLabel: { fontSize: 13, color: "#7b8ab8", fontWeight: 500 },
  totalAmount: { fontSize: 22, fontWeight: 700, color: "#1a3faa", letterSpacing: "-0.5px" },
  payBtn: (loading) => ({ width: "100%", padding: 14, background: loading ? "#6b82c4" : "linear-gradient(135deg, #1a3faa 0%, #2952cc 100%)", color: "#fff", border: "none", borderRadius: 12, fontSize: 15, fontWeight: 600, cursor: loading ? "not-allowed" : "pointer" }),
  security: { display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 14, fontSize: 12, color: "#b0b9d4" },
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

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  const selectAmount = (value) => setForm({ ...form, amount: value });
  const formatAmount = (val) => {
    const num = parseFloat(val || "0");
    return "₹" + num.toLocaleString("en-IN");
  };

  const startPayment = async () => {
    if (!form.firstName || !form.lastName || !form.customerEmail || !form.customerPhone) return alert("Please fill in all fields before proceeding.");
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.customerEmail)) return alert("Please enter a valid email address.");
    if (form.customerPhone.replace(/\D/g, "").length < 10) return alert("Please enter a valid phone number.");

    try {
      setLoading(true);
      const requestPayload = { ...form, amount: parseFloat(form.amount) };
      const res = await fetch("/api/v1/hdfc/create-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestPayload),
      });

      const text = await res.text();
      let data = {};
      if (text) {
        try { data = JSON.parse(text); } catch { data = { message: text }; }
      }

      if (!res.ok) throw new Error(data.message || `Payment initiation failed (Status: ${res.status})`);
      if (!data.paymentLink) throw new Error("No payment link received from server");

      sessionStorage.setItem("pendingOrderId", form.orderId);
      sessionStorage.setItem("pendingAmount", form.amount);
      window.location.href = data.paymentLink;
    } catch (err) {
      console.error(err);
      alert(`Payment error: ${err.message || err}`);
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = (name) => ({ ...styles.input, borderColor: focusedField === name ? "#1a3faa" : "#e4e8f5", boxShadow: focusedField === name ? "0 0 0 3px rgba(26,63,170,0.08)" : "none" });

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.header}>
          <div style={styles.iconWrap}><CardIcon /></div>
          <div>
            <p style={styles.brandTitle}>HDFC Payment</p>
            <p style={styles.brandSub}>Secure checkout · SSL encrypted</p>
          </div>
        </div>

        <div style={styles.divider} />

        <div style={{ marginBottom: 28 }}>
          <p style={styles.sectionLabel}>Select amount</p>
          <div style={styles.amountGrid}>
            {AMOUNTS.map(({ label, value }) => (
              <button key={value} style={styles.amtBtn(form.amount === value)} onClick={() => selectAmount(value)}>{label}</button>
            ))}
          </div>
        </div>

        <div style={styles.fieldRow}>
          <div style={styles.field}>
            <label style={styles.label}>First name</label>
            <input name="firstName" value={form.firstName} onChange={handleChange} onFocus={() => setFocusedField("firstName")} onBlur={() => setFocusedField(null)} style={inputStyle("firstName")} />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Last name</label>
            <input name="lastName" value={form.lastName} onChange={handleChange} onFocus={() => setFocusedField("lastName")} onBlur={() => setFocusedField(null)} style={inputStyle("lastName")} />
          </div>
        </div>

        <div style={styles.field}>
          <label style={styles.label}>Email address</label>
          <input name="customerEmail" type="email" value={form.customerEmail} onChange={handleChange} onFocus={() => setFocusedField("customerEmail")} onBlur={() => setFocusedField(null)} style={inputStyle("customerEmail")} />
        </div>

        <div style={styles.field}>
          <label style={styles.label}>Phone number</label>
          <input name="customerPhone" type="tel" value={form.customerPhone} onChange={handleChange} onFocus={() => setFocusedField("customerPhone")} onBlur={() => setFocusedField(null)} style={inputStyle("customerPhone")} />
        </div>

        <div style={styles.totalRow}>
          <span style={styles.totalLabel}>Total payable</span>
          <span style={styles.totalAmount}>{formatAmount(form.amount)}</span>
        </div>

        <button style={styles.payBtn(loading)} onClick={startPayment} disabled={loading}>{loading ? "Processing..." : `Pay ${formatAmount(form.amount)} securely`}</button>

        <div style={styles.security}>
          <LockIcon />
          <span>256-bit SSL · PCI DSS compliant · HDFC SmartGateway</span>
        </div>

      </div>

      <style>{`\n        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');\n        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }\n      `}</style>
    </div>
  );
};

export default HdfcPaymentForm;
