const axios = require("axios");

exports.handler = async (event) => {
  console.log("=== HDFC Create Session Handler Started ===");
  console.log("HTTP Method:", event.httpMethod);
  console.log("Request Headers:", JSON.stringify(event.headers, null, 2));
  
  // Handle preflight CORS request
  if (event.httpMethod === "OPTIONS") {
    console.log("Handling OPTIONS (CORS preflight)");
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    };
  }

  if (event.httpMethod !== "POST") {
    console.error("Invalid HTTP method. Expected POST, got:", event.httpMethod);
    return {
      statusCode: 405,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "Method Not Allowed" }),
    };
  }

  try {
    console.log("Raw event body:", event.body);
    
    let parsedBody;
    try {
      parsedBody = JSON.parse(event.body);
      console.log("✓ Request body parsed successfully:", JSON.stringify(parsedBody, null, 2));
    } catch (parseError) {
      console.error("✗ Failed to parse request body:", parseError.message);
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          success: false,
          message: "Invalid JSON in request body",
          error: parseError.message
        }),
      };
    }

    const {
      amount,
      customerId,
      customerEmail,
      customerPhone,
      orderId,
      firstName,
      lastName,
    } = parsedBody;

    console.log("Request Parameters:", {
      orderId,
      amount,
      customerId,
      customerEmail,
      customerPhone,
      firstName,
      lastName,
    });

    // Validate required fields
    const requiredFields = { orderId, amount, customerId, customerEmail, customerPhone };
    const missingFields = Object.entries(requiredFields)
      .filter(([key, value]) => !value)
      .map(([key]) => key);

    if (missingFields.length > 0) {
      console.error("✗ Missing required fields:", missingFields);
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          success: false,
          message: `Missing required fields: ${missingFields.join(", ")}`,
          missingFields
        }),
      };
    }

    console.log("✓ All required fields present");

    // Validate environment variables
    const hdfc_base_url = process.env.HDFC_BASE_URL;
    const hdfc_merchant_id = process.env.HDFC_MERCHANT_ID;
    const hdfc_customer_id = process.env.HDFC_CUSTOMER_ID;
    const hdfc_auth_header = process.env.HDFC_AUTH_HEADER;

    console.log("Environment Variables Check:", {
      HDFC_BASE_URL: hdfc_base_url ? "✓ Set" : "✗ Missing",
      HDFC_MERCHANT_ID: hdfc_merchant_id ? "✓ Set" : "✗ Missing",
      HDFC_CUSTOMER_ID: hdfc_customer_id ? "✓ Set" : "✗ Missing",
      HDFC_AUTH_HEADER: hdfc_auth_header ? "✓ Set" : "✗ Missing",
    });

    if (!hdfc_base_url || !hdfc_merchant_id || !hdfc_auth_header) {
      console.error("✗ Missing HDFC environment variables");
      return {
        statusCode: 500,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          success: false,
          message: "Server configuration error: Missing HDFC credentials",
          missingVars: {
            HDFC_BASE_URL: !hdfc_base_url,
            HDFC_MERCHANT_ID: !hdfc_merchant_id,
            HDFC_AUTH_HEADER: !hdfc_auth_header,
          }
        }),
      };
    }

    const payload = {
      order_id: orderId,
      amount: amount,
      customer_id: customerId,
      customer_email: customerEmail,
      customer_phone: customerPhone,
      payment_page_client_id: "hdfcmaster",
      action: "paymentPage",
      currency: "INR",
      return_url: (process.env.BACKEND_URL || "https://payments.piimh.com") + "/api/v1/hdfc/payment-callback",
      description: "Complete your payment",
      first_name: firstName,
      last_name: lastName,
    };

    console.log("HDFC Request Payload:", JSON.stringify(payload, null, 2));

    const hdfc_url = `${hdfc_base_url}/session`;
    console.log("Sending request to HDFC URL:", hdfc_url);
    console.log("Request Headers:", {
      "Content-Type": "application/json",
      "x-merchantid": hdfc_merchant_id,
      "x-customerid": hdfc_customer_id || "rdhmkl",
      Authorization: hdfc_auth_header ? "***REDACTED***" : "MISSING",
    });

    const response = await axios.post(
      hdfc_url,
      payload,
      {
        headers: {
          "Content-Type": "application/json",
          "x-merchantid": hdfc_merchant_id,
          "x-customerid": hdfc_customer_id || "rdhmkl",
          Authorization: hdfc_auth_header,
        },
        timeout: 10000,
      }
    );

    console.log("✓ HDFC Response Status:", response.status, response.statusText);
    console.log("✓ HDFC Response Data:", JSON.stringify(response.data, null, 2));

    const paymentLink = response.data.payment_links?.web || response.data.payment_link;
    
    if (!paymentLink) {
      console.warn("⚠ No payment link in HDFC response");
    } else {
      console.log("✓ Payment link extracted:", paymentLink.substring(0, 50) + "...");
    }

    return {
      statusCode: 200,
      headers: { 
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({
        success: true,
        orderId: orderId,
        paymentLink: paymentLink,
        raw: response.data,
      }),
    };
  } catch (error) {
    console.error("=== ERROR in HDFC Create Session ===");
    console.error("Error Type:", error.constructor.name);
    console.error("Error Message:", error.message);
    console.error("Error Stack:", error.stack);

    if (error.response) {
      console.error("✗ HDFC API Error Response:");
      console.error("  Status:", error.response.status, error.response.statusText);
      console.error("  Headers:", JSON.stringify(error.response.headers, null, 2));
      console.error("  Data:", JSON.stringify(error.response.data, null, 2));
      console.error("  Config URL:", error.config?.url);
      console.error("  Config Method:", error.config?.method);
      console.error("  Config Headers:", JSON.stringify(error.config?.headers, null, 2));
    } else if (error.request) {
      console.error("✗ No response from HDFC (request was made but no response):");
      console.error("  Request:", JSON.stringify(error.request, null, 2));
    } else {
      console.error("✗ Error setting up request:");
      console.error("  Details:", error.message);
    }

    const statusCode = error.response?.status || 500;
    const errorMessage = error.response?.data?.message || error.message || "Unable to create payment session";

    console.error(`Returning error response with status ${statusCode}`);

    return {
      statusCode: statusCode,
      headers: { 
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({
        success: false,
        message: errorMessage,
        error: {
          type: error.constructor.name,
          message: error.message,
          hdfc_error: error.response?.data || null,
          details: error.response?.statusText || "Unknown error"
        },
      }),
    };
  }
};
