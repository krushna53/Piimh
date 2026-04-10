import React, { useState } from "react";
import { v4 as uuidv4 } from "uuid";

const HdfcPaymentForm = () => {
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    amount: "500.00",
    customerId: "CUST_" + uuidv4(),
    customerEmail: "customer@example.com",
    customerPhone: "9999999999",
    orderId: "ORD_" + uuidv4(),
    firstName: "",
    lastName: "",
  });

  const startPayment = async () => {
    try {
      setLoading(true);

      const res = await fetch(
        "http://localhost:3001/api/v1/api/hdfc/create-session",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(form),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error("Payment initiation failed");
      }

      window.location.href = data.paymentLink;
    } catch (err) {
      alert(err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <div className="page">
      <div className="card">
        <h2>HDFC Payment</h2>
        <input
          type="text"
          name="firstName"
          placeholder="First Name"
          value={form.firstName}
          onChange={handleChange}
        />

        <input
          type="text"
          name="lastName"
          placeholder="Last Name"
          value={form.lastName}
          onChange={handleChange}
        />

        <select name="amount" value={form.amount} onChange={handleChange}>
          <option value="100.00">5RS</option>
          <option value="100.00">10RS</option>
          <option value="100.00">1000rs</option>
          <option value="200.00">200RS</option>
          <option value="500.00">500RS</option>
          <option value="1000.00">1000RS</option>
        </select>

        <input
          type="email"
          name="customerEmail"
          placeholder="Email"
          value={form.customerEmail}
          onChange={handleChange}
        />

        <input
          type="text"
          name="customerPhone"
          placeholder="Phone"
          value={form.customerPhone}
          onChange={handleChange}
        />

        <button onClick={startPayment} disabled={loading}>
          {loading ? "Processing..." : "Pay Now"}
        </button>
      </div>
    </div>
  );
};

export default HdfcPaymentForm;