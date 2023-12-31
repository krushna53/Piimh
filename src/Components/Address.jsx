import React from "react";

const Address = () => {
  return (
    <>
      <div className="address">
        <div className="reach">
          <p>REACH US THROUGH</p>
          <ul>
            <li>
              <span><i className="fa-solid fa-location-dot"></i></span>
              <span>834, 31sr A cross Thilaknagar Jayanagar Bangalore 41</span>
            </li>
            <li>
              <span><i className="fa-solid fa-phone"></i></span>
              <span>+91 99720 97848</span>
            </li>
            <li>
              <span><i className="fa-regular fa-envelope"></i></span>
              <span>deepak@piimh.com</span>
            </li>
          </ul>
        </div>
        <div className="social">
          <p>SOCIAL NETWORKS</p>
         
            <ul>
              <li>
                <span><i className="fa-brands fa-facebook-f"></i></span>
                <span>Coming Soon</span>
              </li>
              <li>
                <span><i className="fa-brands fa-twitter"></i></span>
                <span>Coming Soon</span>
              </li>
              <li>
                <span><i className="fa-brands fa-instagram"></i></span>
                <span>Coming Soon</span>
              </li>
              <li>
                <span><i className="fa-brands fa-google-plus-g"></i></span>
                <span>Coming Soon</span>
              </li>
            </ul> 
        </div>
      </div>
    </>
  );
};

export default Address;
