import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";

const PaymentStatus = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState("checking");
  const [orderDetails, setOrderDetails] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const checkPaymentStatus = async () => {
      try {
        // Get order ID from URL params or sessionStorage
        const orderId =
          searchParams.get("order_id") || sessionStorage.getItem("pendingOrderId");

        if (!orderId) {
          setStatus("error");
          setError("Order ID not found. Please start payment again.");
          return;
        }

        console.log("🔍 Checking payment status for:", orderId);

        // Query the backend to get transaction status
        const res = await fetch(`/api/v1/hdfc/transaction-log/${orderId}`);
        const data = await res.json();

        if (!res.ok || !data.success) {
          setStatus("error");
          setError("Failed to retrieve payment status");
          return;
        }

        const transactionData = data.data;
        setOrderDetails(transactionData);

        // Determine status based on backend log
        if (transactionData.status === "Success") {
          setStatus("success");
        } else if (transactionData.status === "Failed") {
          setStatus("failed");
          setError(transactionData.errorMessage || "Payment was not successful");
        } else {
          setStatus("pending");
        }
      } catch (err) {
        console.error(" Error checking status:", err);
        setStatus("error");
        setError(err.message || "Unable to check payment status");
      }
    };

    checkPaymentStatus();
  }, [searchParams]);

  if (status === "checking") {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <div style={styles.spinner} />
          <p style={styles.checkingText}>Verifying payment...</p>
          <p style={styles.checkingSubtext}>
            Please wait while we confirm your transaction
          </p>
        </div>
      </div>
    );
  }

  if (status === "success") {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <div style={styles.successIcon}>●</div>
          <h1 style={styles.successTitle}>Payment Successful!</h1>
          <p style={styles.successText}>
            Thank you for your payment of ₹{orderDetails?.amount || "N/A"}
          </p>

          {orderDetails && (
            <div style={styles.detailsBox}>
              <div style={styles.detailRow}>
                <span style={styles.detailLabel}>Order ID:</span>
                <span style={styles.detailValue}>{orderDetails.orderId}</span>
              </div>
              <div style={styles.detailRow}>
                <span style={styles.detailLabel}>Amount:</span>
                <span style={styles.detailValue}>₹{orderDetails.amount}</span>
              </div>
              <div style={styles.detailRow}>
                <span style={styles.detailLabel}>Status:</span>
                <span style={{ ...styles.detailValue, color: "#22c55e" }}>
                  {orderDetails.status}
                </span>
              </div>
              {orderDetails.responseHash && (
                <div style={styles.detailRow}>
                  <span style={styles.detailLabel}>Transaction ID:</span>
                  <span style={styles.detailValue}>
                    {orderDetails.responseHash.substring(0, 16)}...
                  </span>
                </div>
              )}
            </div>
          )}

          <button style={styles.continueBtn} onClick={() => navigate("/")}>
            Return to Home
          </button>
        </div>
      </div>
    );
  }

  if (status === "failed") {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <div style={styles.failureIcon}>✕</div>
          <h1 style={styles.failureTitle}>Payment Failed</h1>
          <p style={styles.failureText}>
            {error || "Your payment could not be processed"}
          </p>

          {orderDetails && (
            <div style={styles.detailsBox}>
              <div style={styles.detailRow}>
                <span style={styles.detailLabel}>Order ID:</span>
                <span style={styles.detailValue}>{orderDetails.orderId}</span>
              </div>
              <div style={styles.detailRow}>
                <span style={styles.detailLabel}>Amount:</span>
                <span style={styles.detailValue}>₹{orderDetails.amount}</span>
              </div>
              {orderDetails.errorMessage && (
                <div style={styles.detailRow}>
                  <span style={styles.detailLabel}>Error:</span>
                  <span style={{ ...styles.detailValue, color: "#ef4444" }}>
                    {orderDetails.errorMessage}
                  </span>
                </div>
              )}
            </div>
          )}

          <button style={styles.retryBtn} onClick={() => navigate("/payment")}>
            Try Again
          </button>
          <button style={styles.homeBtn} onClick={() => navigate("/")}>
            Return to Home
          </button>
        </div>
      </div>
    );
  }

  if (status === "pending") {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <div style={styles.warningIcon}>⏳</div>
          <h1 style={styles.pendingTitle}>Payment Pending</h1>
          <p style={styles.pendingText}>
            Your payment is still being processed. Please wait a moment and try
            again.
          </p>

          {orderDetails && (
            <div style={styles.detailsBox}>
              <div style={styles.detailRow}>
                <span style={styles.detailLabel}>Order ID:</span>
                <span style={styles.detailValue}>{orderDetails.orderId}</span>
              </div>
              <div style={styles.detailRow}>
                <span style={styles.detailLabel}>Amount:</span>
                <span style={styles.detailValue}>₹{orderDetails.amount}</span>
              </div>
              <div style={styles.detailRow}>
                <span style={styles.detailLabel}>Status:</span>
                <span style={{ ...styles.detailValue, color: "#f59e0b" }}>
                  {orderDetails.status}
                </span>
              </div>
            </div>
          )}

          <button
            style={styles.retryBtn}
            onClick={() => window.location.reload()}
          >
            Check Status Again
          </button>
        </div>
      </div>
    );
  }

  // Error status
  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.errorIcon}>!</div>
        <h1 style={styles.errorTitle}>Error</h1>
        <p style={styles.errorText}>{error || "An unexpected error occurred"}</p>

        <button style={styles.homeBtn} onClick={() => navigate("/payment")}>
          Try Again
        </button>
      </div>
    </div>
  );
};

const styles = {
  container: {
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
    boxShadow:
      "0 4px 6px -1px rgba(0,0,0,0.05), 0 24px 48px -8px rgba(26, 63, 170, 0.12)",
    padding: "3rem 2.5rem",
    maxWidth: "500px",
    width: "100%",
    textAlign: "center",
  },
  spinner: {
    width: "50px",
    height: "50px",
    border: "3px solid #e4e8f5",
    borderTopColor: "#1a3faa",
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
    margin: "0 auto 1.5rem",
  },
  checkingText: {
    fontSize: "18px",
    fontWeight: "600",
    color: "#0f1c3f",
    margin: "0 0 0.5rem 0",
  },
  checkingSubtext: {
    fontSize: "14px",
    color: "#7b8ab8",
    margin: 0,
  },
  successIcon: {
    width: "70px",
    height: "70px",
    borderRadius: "50%",
    background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
    color: "white",
    fontSize: "40px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    margin: "0 auto 1.5rem",
    fontWeight: "bold",
  },
  successTitle: {
    fontSize: "24px",
    fontWeight: "700",
    color: "#10b981",
    margin: "0 0 0.5rem 0",
  },
  successText: {
    fontSize: "15px",
    color: "#7b8ab8",
    margin: "0 0 1.5rem 0",
  },
  failureIcon: {
    width: "70px",
    height: "70px",
    borderRadius: "50%",
    background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
    color: "white",
    fontSize: "40px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    margin: "0 auto 1.5rem",
    fontWeight: "bold",
  },
  failureTitle: {
    fontSize: "24px",
    fontWeight: "700",
    color: "#ef4444",
    margin: "0 0 0.5rem 0",
  },
  failureText: {
    fontSize: "15px",
    color: "#7b8ab8",
    margin: "0 0 1.5rem 0",
  },
  errorIcon: {
    width: "70px",
    height: "70px",
    borderRadius: "50%",
    background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
    color: "white",
    fontSize: "40px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    margin: "0 auto 1.5rem",
    fontWeight: "bold",
  },
  errorTitle: {
    fontSize: "24px",
    fontWeight: "700",
    color: "#f59e0b",
    margin: "0 0 0.5rem 0",
  },
  errorText: {
    fontSize: "15px",
    color: "#7b8ab8",
    margin: "0 0 1.5rem 0",
  },
  warningIcon: {
    width: "70px",
    height: "70px",
    borderRadius: "50%",
    background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
    color: "white",
    fontSize: "40px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    margin: "0 auto 1.5rem",
  },
  pendingTitle: {
    fontSize: "24px",
    fontWeight: "700",
    color: "#f59e0b",
    margin: "0 0 0.5rem 0",
  },
  pendingText: {
    fontSize: "15px",
    color: "#7b8ab8",
    margin: "0 0 1.5rem 0",
  },
  detailsBox: {
    background: "#f4f6ff",
    borderRadius: "12px",
    padding: "1.25rem",
    margin: "1.5rem 0",
    textAlign: "left",
  },
  detailRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "0.75rem 0",
  },
  detailLabel: {
    fontSize: "13px",
    fontWeight: "600",
    color: "#7b8ab8",
  },
  detailValue: {
    fontSize: "14px",
    fontWeight: "600",
    color: "#0f1c3f",
  },
  continueBtn: {
    width: "100%",
    padding: "12px",
    background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
    color: "white",
    border: "none",
    borderRadius: "10px",
    fontSize: "15px",
    fontWeight: "600",
    cursor: "pointer",
    marginTop: "1rem",
  },
  retryBtn: {
    width: "100%",
    padding: "12px",
    background: "linear-gradient(135deg, #1a3faa 0%, #2952cc 100%)",
    color: "white",
    border: "none",
    borderRadius: "10px",
    fontSize: "15px",
    fontWeight: "600",
    cursor: "pointer",
    marginTop: "1rem",
  },
  homeBtn: {
    width: "100%",
    padding: "12px",
    background: "#f4f6ff",
    color: "#1a3faa",
    border: "1.5px solid #e4e8f5",
    borderRadius: "10px",
    fontSize: "15px",
    fontWeight: "600",
    cursor: "pointer",
    marginTop: "0.75rem",
  },
};

export default PaymentStatus;
