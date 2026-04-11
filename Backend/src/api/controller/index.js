const axios = require("axios");

const createHdfcSession = async (req, res) => {
  try {
    const {
      amount,
      customerId,
      customerEmail,
      customerPhone,
      orderId,
      firstName,
      lastName,
    } = req.body;
    const protocol = req.protocol; // http or https
    const host = req.get('host');

    const fullUrl = `${protocol}://${host}`;
    const payload = {
      order_id: orderId,
      amount: amount,
      customer_id: customerId,
      customer_email: customerEmail,
      customer_phone: customerPhone,
      payment_page_client_id: "hdfcmaster",
      action: "paymentPage",
      currency: "INR",
      return_url: `${ fullUrl }`+ "/payment",
      description: "Complete your payment",
      first_name: firstName,
      last_name: lastName,
    };

    console.log(31, payload);

    const response = await axios.post(
      `${ process.env.HDFC_BASE_URL }` + "/session",
      payload,
      {
        headers: {
          "Content-Type": "application/json",
          "x-merchantid": process.env.HDFC_MERCHANT_ID,
          "x-customerid": process.env.HDFC_CUSTOMER_ID,
          Authorization: process.env.HDFC_AUTH_HEADER,
        },
      },
    );

    res.json({
      paymentLink:
        response.data.payment_links?.web || response.data.payment_link,
      raw: response.data,
    });
  } catch (error) {
    console.log("ERROR FULL ❌", JSON.stringify(error.response?.data, null, 2));

    res.status(500).json({
      message:
        error.response?.data ||
        error.message ||
        "Unable to create payment session",
    });
  }
};

const axios = require("axios");

const createHdfcSession = async (req, res) => {
  try {
    const {
      amount,
      customerId,
      customerEmail,
      customerPhone,
      orderId,
      firstName,
      lastName,
    } = req.body;

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
      "https://smartgateway.hdfcuat.bank.in/session",
      payload,
      {
        headers: {
          "Content-Type": "application/json",
          "x-merchantid": "SG4356",
          "x-customerid": "rdhmkl",
          Authorization: "Basic MjMzQTJBRjQ2REI0NTNCOTQ0Q0JBMUFCNDlGOTIyOg==",
        },
      },
    );

    res.json({
      paymentLink:
        response.data.payment_links?.web || response.data.payment_link,
      raw: response.data,
    });
  } catch (error) {
    console.log("ERROR FULL ❌", JSON.stringify(error.response?.data, null, 2));

    res.status(500).json({
      message:
        error.response?.data ||
        error.message ||
        "Unable to create payment session",
    });
  }
};

const getOrderStatus = async (req, res) => {
  const orderId = req.query.orderId;
  try {
    const response = await axios.get(
      `https://smartgateway.hdfcuat.bank.in/orders/${orderId}`,
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: "Basic RDFEN0RCN0ZBQUI0NUNFQjQyNDczN0YzODYyQjlBOg==",
        },
      },
    );
    return res.json({
      success: true,
      orderId: response.data.order_id,
      status: response.data.status,
      amount: response.data.amount,
    });
  } catch (error) {
    console.error("❌ Error:", error.response?.data || error.message);
    throw error;
  }
};

module.exports = { createHdfcSession, getOrderStatus };

