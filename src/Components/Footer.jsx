import React from "react";

const Footer = () => {
  return (
    <>
      <div className="footer">
        <div className="footer_container">
          <div className="footer_title">
            <h2>Policies</h2>
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
