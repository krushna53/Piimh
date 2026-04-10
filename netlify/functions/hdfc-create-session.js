const axios = require("axios");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ message: "Method Not Allowed" }),
    };
  }

  try {
    const {
      amount,
      customerId,
      customerEmail,
      customerPhone,
      orderId,
      firstName,
      lastName,
    } = JSON.parse(event.body);

    const payload = {
      order_id: orderId,
      amount: amount,
      customer_id: customerId,
      customer_email: customerEmail,
      customer_phone: customerPhone,
      payment_page_client_id: "hdfcmaster",
      action: "paymentPage",
      currency: "INR",
      return_url: "https://shop.merchant.com",
      description: "Complete your payment",
      first_name: firstName,
      last_name: lastName,
    };

    const response = await axios.post(
      `${process.env.HDFC_BASE_URL}/session`,
      payload,
      {
        headers: {
          "Content-Type": "application/json",
          "x-merchantid": process.env.HDFC_MERCHANT_ID,
          "x-customerid": process.env.HDFC_CUSTOMER_ID,
          Authorization: process.env.HDFC_AUTH_HEADER,
        },
      }
    );

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        paymentLink:
          response.data.payment_links?.web || response.data.payment_link,
        raw: response.data,
      }),
    };
  } catch (error) {
    console.error("HDFC Error:", JSON.stringify(error.response?.data, null, 2));

    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message:
          error.response?.data ||
          error.message ||
          "Unable to create payment session",
      }),
    };
  }
};
