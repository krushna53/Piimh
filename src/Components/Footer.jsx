import React from "react";
import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <>
      <div className="footer">
        <div className="footer_container">
          <div className="footer_title">
            <h2>Policies</h2>
          </div>
          <div className="policies">
            <button>
              <Link to="/page/terms-of-service">
                <span>Terms Of Service</span>
              </Link>
            </button>
            <button>
              <Link to="/page/privacy-statement">
                <span>Privacy Statement</span>
              </Link>
            </button>
            <button>
              <Link to="/page/refunds">
                <span>Refunds</span>
              </Link>
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default Footer;
