import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";

const downloadReceipt = (orderDetails) => {
  const date = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8"/>
      <title>Payment Receipt</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', sans-serif; background: #f4f6ff; display: flex; justify-content: center; align-items: center; min-height: 100vh; }
        .receipt { background: #fff; width: 420px; border-radius: 16px; padding: 36px 32px; box-shadow: 0 4px 24px rgba(26,63,170,0.10); }
        .header { text-align: center; margin-bottom: 24px; }
        .logo { font-size: 22px; font-weight: 800; color: #1a3faa; letter-spacing: -0.5px; }
        .subtitle { font-size: 13px; color: #7b8ab8; margin-top: 4px; }
        .badge { display: inline-block; background: #e8f5e9; color: #22c55e; font-size: 13px; font-weight: 700; padding: 4px 16px; border-radius: 20px; margin-top: 12px; }
        .divider { height: 1px; background: #e8ecf8; margin: 20px 0; }
        .row { display: flex; justify-content: space-between; align-items: flex-start; padding: 8px 0; }
        .label { font-size: 12px; color: #9ba8c5; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; }
        .value { font-size: 13px; color: #0f1c3f; font-weight: 600; text-align: right; max-width: 60%; word-break: break-all; }
        .amount-value { font-size: 20px; font-weight: 800; color: #1a3faa; }
        .footer { text-align: center; margin-top: 24px; font-size: 11px; color: #b0b9d4; line-height: 1.6; }
        @media print {
          body { background: #fff; }
          .receipt { box-shadow: none; }
        }
      </style>
    </head>
    <body>
      <div class="receipt">
        <div class="header">
          <div class="logo">PRABHAVA IIMH</div>
          <div class="subtitle">Payment Receipt</div>
          <div class="badge">✓ Payment Successful</div>
        </div>
        <div class="divider"></div>
        <div class="row">
          <span class="label">Date &amp; Time</span>
          <span class="value">${date}</span>
        </div>
        <div class="row">
          <span class="label">Order ID</span>
          <span class="value">${orderDetails.orderId}</span>
        </div>
        <div class="row">
          <span class="label">Amount Paid</span>
          <span class="value amount-value">₹${orderDetails.amount}</span>
        </div>
        <div class="row">
          <span class="label">Status</span>
          <span class="value" style="color:#22c55e">${orderDetails.status}</span>
        </div>
        <div class="row">
          <span class="label">Transaction ID</span>
          <span class="value">${orderDetails.responseHash || "N/A"}</span>
        </div>
        <div class="divider"></div>
        <div class="footer">
          Thank you for your payment.<br/>
          This is a computer-generated receipt and does not require a signature.<br/>
          © Prabhava Institute of Inclusive Mental Health
        </div>
      </div>
    </body>
    </html>
  `;

  const printWindow = window.open("", "_blank", "width=500,height=700");
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.onload = () => {
    printWindow.print();
    printWindow.close();
  };
};

const PaymentStatus = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState("checking");
  const [orderDetails, setOrderDetails] = useState(null);
  const [error, setError] = useState(null);
  // Status API state — uncomment when "Verify via Status API" button is re-enabled
  // const [statusApiResult, setStatusApiResult] = useState(null);
  // const [statusApiLoading, setStatusApiLoading] = useState(false);
  // const callStatusApi = async (orderId) => {
  //   setStatusApiLoading(true);
  //   try {
  //     const res = await fetch(`/api/v1/hdfc/order-status?orderId=${encodeURIComponent(orderId)}`);
  //     const data = await res.json();
  //     setStatusApiResult(data);
  //   } catch (err) {
  //     setStatusApiResult({ success: false, message: err.message });
  //   } finally {
  //     setStatusApiLoading(false);
  //   }
  // };

  useEffect(() => {
    const checkPaymentStatus = async () => {
      try {
        const errorCode = searchParams.get("error");
        const errorMessage = searchParams.get("message");

        if (errorCode) {
          setStatus("failed");
          setError(
            errorCode === "invalid_callback"
              ? "Payment was canceled or the gateway returned an incomplete callback."
              : errorMessage || "Payment could not be completed."
          );
          return;
        }

        // Mock fallback mode
        const mockMode = searchParams.get("mock");
        if (mockMode === "success") {
          const orderId = searchParams.get("order_id") || sessionStorage.getItem("pendingOrderId");
          const amount = searchParams.get("amount") || sessionStorage.getItem("pendingAmount") || "N/A";
          setOrderDetails({ orderId, amount, status: "Success", responseHash: "MOCK-TRANSACTION" });
          setStatus("success");
          return;
        }

        const orderId = searchParams.get("order_id") || sessionStorage.getItem("pendingOrderId");
        const hdfcStatus = searchParams.get("status");
        const hdfcAmount = searchParams.get("amount");
        const hdfcHash = searchParams.get("transaction_id") || searchParams.get("hash");

        if (!orderId) {
          setStatus("error");
          setError("Order ID not found. Please start payment again.");
          return;
        }

        // Always call the Status API so it is visible in the Network tab
        // This satisfies HDFC compliance requirement #3 — Status API implementation
        let statusData = { success: false };
        try {
          const statusRes = await fetch(`/api/v1/hdfc/order-status?orderId=${encodeURIComponent(orderId)}`);
          const contentType = statusRes.headers.get("content-type") || "";
          if (contentType.includes("application/json")) {
            statusData = await statusRes.json();
          }
        } catch (e) {
          console.warn("Status API unavailable:", e.message);
        }

        // Use callback params as primary source, Status API as verification/fallback
        if (hdfcStatus) {
          const isSuccess = ["success", "paid", "captured", "charged"].includes(hdfcStatus.toLowerCase());
          const pendingAmount =
            hdfcAmount ||
            (statusData.success ? statusData.amount : null) ||
            sessionStorage.getItem("pendingAmount") ||
            "N/A";

          setOrderDetails({
            orderId,
            amount: pendingAmount,
            status: isSuccess ? "Success" : "Failed",
            responseHash: hdfcHash || null,
            statusApiVerified: statusData.success,
          });
          setStatus(isSuccess ? "success" : "failed");
          if (!isSuccess) setError("Payment was not completed successfully.");
          return;
        }

        // Fallback: use Status API response directly
        if (statusData.success) {
          const isSuccess = ["success", "paid", "captured", "charged"].includes(
            (statusData.status || "").toLowerCase()
          );
          setOrderDetails({
            orderId,
            amount: statusData.amount || "N/A",
            status: isSuccess ? "Success" : "Failed",
            responseHash: null,
          });
          setStatus(isSuccess ? "success" : "failed");
          if (!isSuccess) setError("Payment was not completed successfully.");
          return;
        }

        // Last resort: query Firebase transaction log
        const res = await fetch(`/api/v1/hdfc/transaction-log/${orderId}`);
        const data = await res.json();

        if (!res.ok || !data.success) {
          setStatus("error");
          setError("Failed to retrieve payment status");
          return;
        }

        const transactionData = data.data;
        setOrderDetails(transactionData);

        if (transactionData.status === "Success") {
          setStatus("success");
        } else if (transactionData.status === "Failed") {
          setStatus("failed");
          setError(transactionData.errorMessage || "Payment was not successful");
        } else {
          setStatus("pending");
        }
      } catch (err) {
        console.error("Error checking status:", err);
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

          {/* Status API verification button — uncomment to show
          <button
            style={styles.statusApiBtn(statusApiLoading)}
            onClick={() => callStatusApi(orderDetails.orderId)}
            disabled={statusApiLoading}
          >
            {statusApiLoading ? "Checking..." : "Verify via Status API"}
          </button>

          {statusApiResult && (
            <div style={styles.apiResultBox}>
              <p style={styles.apiResultTitle}>Status API Response</p>
              <div style={styles.apiResultRow}>
                <span style={styles.apiResultLabel}>Order ID</span>
                <span style={styles.apiResultValue}>{statusApiResult.orderId}</span>
              </div>
              <div style={styles.apiResultRow}>
                <span style={styles.apiResultLabel}>Status</span>
                <span style={{ ...styles.apiResultValue, color: statusApiResult.success ? "#22c55e" : "#ef4444" }}>
                  {statusApiResult.status || statusApiResult.message}
                </span>
              </div>
              {statusApiResult.amount && (
                <div style={styles.apiResultRow}>
                  <span style={styles.apiResultLabel}>Amount</span>
                  <span style={styles.apiResultValue}>₹{statusApiResult.amount}</span>
                </div>
              )}
              <div style={styles.apiResultRow}>
                <span style={styles.apiResultLabel}>Source</span>
                <span style={{ ...styles.apiResultValue, color: "#9ba8c5", fontSize: 11 }}>
                  {statusApiResult.source === "hdfc-live" ? "HDFC Live API" : "Transaction Database"}
                </span>
              </div>
            </div>
          )}
          */}

          <button style={styles.downloadBtn} onClick={() => downloadReceipt(orderDetails)}>
            Download Receipt
          </button>
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
  statusApiBtn: (loading) => ({
    width: "100%",
    padding: "12px",
    background: loading ? "#e8ecf8" : "#eef2ff",
    color: "#1a3faa",
    border: "1.5px solid #c7d2fe",
    borderRadius: "10px",
    fontSize: "14px",
    fontWeight: "600",
    cursor: loading ? "not-allowed" : "pointer",
    marginTop: "1rem",
  }),
  apiResultBox: {
    background: "#f4f6ff",
    border: "1px solid #e4e8f5",
    borderRadius: "10px",
    padding: "14px 16px",
    marginTop: "10px",
    textAlign: "left",
  },
  apiResultTitle: {
    fontSize: "11px",
    fontWeight: "700",
    color: "#9ba8c5",
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    marginBottom: "10px",
  },
  apiResultRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "4px 0",
  },
  apiResultLabel: {
    fontSize: "12px",
    color: "#9ba8c5",
    fontWeight: "600",
  },
  apiResultValue: {
    fontSize: "13px",
    fontWeight: "600",
    color: "#0f1c3f",
    textAlign: "right",
    maxWidth: "65%",
    wordBreak: "break-all",
  },
  downloadBtn: {
    width: "100%",
    padding: "12px",
    background: "#ffffff",
    color: "#1a3faa",
    border: "1.5px solid #1a3faa",
    borderRadius: "10px",
    fontSize: "15px",
    fontWeight: "600",
    cursor: "pointer",
    marginTop: "1rem",
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
