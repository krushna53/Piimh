import React from "react";

const Contact = () => {
  return (
    <>
      <div className="form-container">
        <div className="contact_us">
          <h2>CONTACT US</h2>
        </div>
        <form>
          <div className="d-flex">
            <div className="input-field">
              <label htmlFor="name">Your Name <span>*</span></label>
              <input
                type="text"
                id="name"
                name="user_name"
                // value={name}
                // onChange={(e) => setName(e.target.value)}
                required
              />
              <label className="frist" htmlFor="name">Frist</label>
            </div>
            <div className="input-field">
            <label htmlFor="name"> </label>
              <input
                type="email"
                name="email"
                id="email"
                // value={email}
                // onChange={(e) => setEmail(e.target.value)}
                required
              />
              <label className="last" htmlFor="name">Last</label>
            </div>
          </div>
          <div className="input-field">
              <label htmlFor="email">Your Email <span>*</span> </label>
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
            <label htmlFor="message">Comment or Message <span>*</span></label>
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
      </div>
    </>
  );
};

export default Contact;
