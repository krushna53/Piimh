import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import client from "../client";
const Contact = () => {
  const { slug } = useParams();
  const [entry, setEntry] = useState([]);

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
            <form className="form">
              <div className="input-field">
                <label htmlFor="name">
                  Your Name <span>*</span>
                </label>
                <input
                  type="text"
                  id="name"
                  name="user_name"
                  // value={name}
                  // onChange={(e) => setName(e.target.value)}
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
                  // value={email}
                  // onChange={(e) => setEmail(e.target.value)}
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
                  // value={message}
                  //  onChange= /*{(e) => setMessage(e.target.value)}*/
                  cols="40"
                  rows="10"
                ></textarea>
              </div>
              <input type="submit" value="Submit" className="submit_btn" />
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
