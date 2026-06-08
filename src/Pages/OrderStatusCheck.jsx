import React, { useState } from "react";

const OrderStatusCheck = () => {
  const [orderId, setOrderId] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const checkStatus = async () => {
    if (!orderId.trim()) return alert("Please enter an Order ID");
    setLoading(true);
    setResult(null);
    setError(null);

    try {
      const res = await fetch(`/api/v1/hdfc/order-status?orderId=${encodeURIComponent(orderId.trim())}`);
      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.message || "Failed to fetch order status");
      } else {
        setResult(data);
      }
    } catch (err) {
      setError(err.message || "Network error");
    } finally {
      setLoading(false);
    }
  };

  const isSuccess = result && ["success", "paid", "captured", "charged"].includes(
    (result.status || "").toLowerCase()
  );

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h2 style={styles.title}>Order Status Check</h2>
        <p style={styles.subtitle}>Enter your Order ID to verify payment status</p>

        <div style={styles.inputRow}>
          <input
            style={styles.input}
            type="text"
            placeholder="ORD_xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
            value={orderId}
            onChange={(e) => setOrderId(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && checkStatus()}
          />
          <button style={styles.btn(loading)} onClick={checkStatus} disabled={loading}>
            {loading ? "Checking..." : "Check Status"}
          </button>
        </div>

        {error && (
          <div style={styles.errorBox}>
            <span style={styles.errorIcon}>✕</span>
            <span>{error}</span>
          </div>
        )}

        {result && (
          <div style={styles.resultBox}>
            <div style={styles.statusBadge(isSuccess)}>
              {isSuccess ? "✓ Payment Successful" : "✕ Payment Failed / Pending"}
            </div>
            <div style={styles.divider} />
            <div style={styles.row}>
              <span style={styles.label}>Order ID</span>
              <span style={styles.value}>{result.orderId}</span>
            </div>
            <div style={styles.row}>
              <span style={styles.label}>Status</span>
              <span style={{ ...styles.value, color: isSuccess ? "#22c55e" : "#ef4444" }}>
                {result.status}
              </span>
            </div>
            {result.amount && (
              <div style={styles.row}>
                <span style={styles.label}>Amount</span>
                <span style={styles.value}>₹{result.amount}</span>
              </div>
            )}
            <div style={styles.row}>
              <span style={styles.label}>Source</span>
              <span style={{ ...styles.value, fontSize: 12, color: "#9ba8c5" }}>
                {result.source === "hdfc-live" ? "HDFC Live API" : "Transaction Database"}
              </span>
            </div>
            <div style={styles.divider} />
            <div style={styles.apiNote}>
              API called: <code style={styles.code}>GET /api/v1/hdfc/order-status?orderId={result.orderId}</code>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const styles = {
  page: {
    minHeight: "60vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: "40px 16px",
    background: "linear-gradient(135deg, #f0f4ff 0%, #fafbff 100%)",
  },
  card: {
    background: "#fff",
    borderRadius: 16,
    padding: "36px 32px",
    width: "100%",
    maxWidth: 560,
    boxShadow: "0 4px 24px rgba(26,63,170,0.10)",
  },
  title: {
    fontSize: 22,
    fontWeight: 700,
    color: "#0f1c3f",
    margin: "0 0 6px 0",
  },
  subtitle: {
    fontSize: 14,
    color: "#7b8ab8",
    margin: "0 0 24px 0",
  },
  inputRow: {
    display: "flex",
    gap: 10,
    marginBottom: 20,
  },
  input: {
    flex: 1,
    padding: "11px 14px",
    border: "1.5px solid #e4e8f5",
    borderRadius: 10,
    fontSize: 13,
    color: "#0f1c3f",
    outline: "none",
    background: "#fafbff",
  },
  btn: (loading) => ({
    padding: "11px 20px",
    background: loading ? "#6b82c4" : "linear-gradient(135deg, #1a3faa 0%, #2952cc 100%)",
    color: "#fff",
    border: "none",
    borderRadius: 10,
    fontSize: 14,
    fontWeight: 600,
    cursor: loading ? "not-allowed" : "pointer",
    whiteSpace: "nowrap",
  }),
  errorBox: {
    background: "#fef2f2",
    border: "1px solid #fecaca",
    borderRadius: 10,
    padding: "12px 16px",
    color: "#ef4444",
    fontSize: 14,
    display: "flex",
    gap: 8,
    alignItems: "center",
  },
  errorIcon: { fontWeight: 700 },
  resultBox: {
    background: "#f4f6ff",
    borderRadius: 12,
    padding: "20px",
    marginTop: 4,
  },
  statusBadge: (success) => ({
    display: "inline-block",
    background: success ? "#e8f5e9" : "#fef2f2",
    color: success ? "#22c55e" : "#ef4444",
    fontWeight: 700,
    fontSize: 14,
    padding: "6px 16px",
    borderRadius: 20,
    marginBottom: 16,
  }),
  divider: {
    height: 1,
    background: "#e8ecf8",
    margin: "12px 0",
  },
  row: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "6px 0",
  },
  label: {
    fontSize: 12,
    fontWeight: 600,
    color: "#9ba8c5",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
  },
  value: {
    fontSize: 13,
    fontWeight: 600,
    color: "#0f1c3f",
    textAlign: "right",
    maxWidth: "65%",
    wordBreak: "break-all",
  },
  apiNote: {
    fontSize: 12,
    color: "#9ba8c5",
    marginTop: 4,
  },
  code: {
    background: "#e8ecf8",
    padding: "2px 6px",
    borderRadius: 4,
    fontSize: 11,
    color: "#1a3faa",
    wordBreak: "break-all",
  },
};

export default OrderStatusCheck;
