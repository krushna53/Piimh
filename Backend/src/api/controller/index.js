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

module.exports = { createHdfcSession };
