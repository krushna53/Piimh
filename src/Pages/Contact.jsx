import React, { useEffect, useState } from "react";
import emailjs from "@emailjs/browser";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useParams } from "react-router-dom";
import client from "../client";
const Contact = () => {
  const { slug } = useParams();
  const [entry, setEntry] = useState([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [service, setService] = useState("");
  const [message, setMessage] = useState("");

  const notify = () => {
    toast.success(
      "Thank you for contacting Piimh. We will respond to your message within 3 working days.😊",
      {
        position: "top-right",
        autoClose: 1500,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
        theme: "dark",
      }
    );
  };
  const handleSubmit = (e) => {
    e.preventDefault();

    const templateParams = {
      user_name: name,
      user_email: email,
      service: service,
      message: message,
    };

    emailjs
      .send(
        process.env.REACT_APP_EMAILJS_SERVICEID,
        process.env.REACT_APP_EMAILJS_TEMPLATEID,
        templateParams,
        process.env.REACT_APP_EMAILJS_PUBLICKEY
      )
      .then(
        (response) => {
          notify();
          setName("");
          setEmail("");
          setService("");
          setMessage("");

          console.log("Email sent:", response);
        },
        (error) => {
          console.error("Failed to send the email:", error);
        }
      );
  };
  useEffect(() => {
    const fetchPage = async () => {
      try {
        const response = await client.getEntries({
          content_type: "component",
          "sys.id": "44domFAPPtLBfKhcsj6tye",
        });
        console.log(response);
        if (response.items.length) {
          setEntry(response.items);
        }
      } catch (error) {
        console.error(error);
      }
    };
    fetchPage();
  }, [slug]);
  return (
    <>
      <div className="form-container">
        <div className="container">
          <div className="contact_us">
            <h2>CONTACT US</h2>
          </div>
          <div className="d-flex">
            <form className="form" onSubmit={handleSubmit}>
              <div className="input-field">
                <label htmlFor="name">
                  Your Name <span>*</span>
                </label>
                <input
                  type="text"
                  id="name"
                  name="user_name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div className="input-field">
                <label htmlFor="email">
                  Your Email <span>*</span>{" "}
                </label>
                <input
                  type="email"
                  name="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="text-area">
                <label htmlFor="message">
                  Comment or Message <span>*</span>
                </label>
                <textarea
                  name="message"
                  id="message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  cols="40"
                  rows="10"
                ></textarea>
              </div>
              <input type="submit" value="Submit" className="submit_btn" />
              <ToastContainer
                position="top-right"
                autoClose={5000}
                hideProgressBar={false}
                newestOnTop={false}
                closeOnClick
                rtl={false}
                pauseOnFocusLoss
                draggable
                pauseOnHover
                theme="dark"
              />
            </form>
            <div className="map">
              {entry.map((item) => {
                const googleMapsUrl = item.fields.googleMapsUrl; // Replace with your actual field name
                return (
                  <>
                    <iframe
                      src={googleMapsUrl}
                      width="100%"
                      height="400"
                      allowFullScreen
                      title="Google Map"
                    ></iframe>
                  </>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Contact;
