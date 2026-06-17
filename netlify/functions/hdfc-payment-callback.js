const FRONTEND_URL = process.env.FRONTEND_URL || "https://payments.piimh.com";

const ALLOWED_ORIGINS = [
  "http://localhost:3000",
  "https://piimh.com",
  "https://payments.piimh.com",
  process.env.FRONTEND_URL,
].filter(Boolean);

const isAllowedRedirect = (url) => {
  try {
    const parsed = new URL(url);
    return ALLOWED_ORIGINS.some((o) => {
      const allowed = new URL(o);
      return parsed.hostname === allowed.hostname && parsed.protocol === allowed.protocol;
    });
  } catch {
    return false;
  }
};

exports.handler = async (event) => {
  console.log("Payment callback received, method:", event.httpMethod);
  console.log("Query:", JSON.stringify(event.queryStringParameters));
  console.log("Body:", event.body);

  // Parse body — HDFC sends application/x-www-form-urlencoded
  let bodyParams = {};
  if (event.body) {
    try {
      const params = new URLSearchParams(event.body);
      params.forEach((v, k) => { bodyParams[k] = v; });
    } catch (e) {
      console.warn("Could not parse callback body:", e.message);
    }
  }

  const hdfcResponse = { ...(event.queryStringParameters || {}), ...bodyParams };
  const { order_id, status, amount, hash, signature } = hdfcResponse;

  console.log("Parsed callback data:", JSON.stringify(hdfcResponse));

  if (!order_id || !status) {
    return {
      statusCode: 302,
      headers: { Location: `${FRONTEND_URL}/payment-status?error=invalid_callback` },
    };
  }

  const isSuccess = ["success", "paid", "captured", "charged"].includes((status || "").toLowerCase());
  const logStatus = isSuccess ? "Success" : "Failed";
  const transactionRef = hash || signature || null;
  const paidAmount = Number(amount || 0);

  const params = new URLSearchParams({
    order_id,
    status: logStatus,
    amount: String(paidAmount),
    hash: transactionRef || "",
  });

  const redirectUrl = `${FRONTEND_URL}/payment-status?${params.toString()}`;

  if (!isAllowedRedirect(redirectUrl)) {
    console.error("Blocked unsafe redirect to:", redirectUrl);
    return { statusCode: 400, body: "Invalid redirect destination" };
  }

  console.log("Redirecting to:", redirectUrl);
  return {
    statusCode: 302,
    headers: { Location: redirectUrl },
  };
};
