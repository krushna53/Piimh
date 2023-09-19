import React ,{ useEffect } from  "react";
import Aos from "aos";
const Footer = () => {
  useEffect(() => {
    Aos.init({ duration: 2000 });
  }, );
  return (
    <>
      <div className="footer">
        <div className="footer_container">
          <div className="footer_title">
            <h2 data-aos="fade-right" data-aos-offset="200">Policies</h2>
          </div>

          <div className="policies">
            <a href="https://piimh.com/termsofservice/" target="_blank">
              <button>
                <span>Terms Of Service</span>
              </button>
            </a>
            <a href="https://piimh.com/termsofservice/" target="_blank">
              <button>
                <span>Privacy Statement</span>
              </button>
            </a>
            <a href="https://piimh.com/termsofservice/" target="_blank">
              <button>
                <span>Refunds</span>
              </button>
            </a>
          </div>
        </div>
      </div>
    </>
  );
};

export default Footer;
