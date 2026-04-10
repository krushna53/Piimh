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

    console.log(31, payload);

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

module.exports = { createHdfcSession };
