import React, { useEffect } from "react";
import Aos from "aos";

import { Link } from "react-router-dom";
const Footer = () => {
  useEffect(() => {
    Aos.init({ duration: 1000 });
  }, []);
  return (
    <>
      <div className="footer">
        <div className="container">
          <div className="footer_title">
            <h2 data-aos="fade-left" data-aos-offset="200">Policies</h2>
          </div>
          <div className="policies">
            <button>
              <Link to="page/terms-of-service">
                <span>Terms Of Service</span>
              </Link>
            </button>
            <button>
              <Link to="page/privacy-statement">
                <span>Privacy Statement</span>
              </Link>
            </button>
            <button>
              <Link to="page/refunds">
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
