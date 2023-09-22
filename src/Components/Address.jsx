import React from "react";

const Address = () => {
  return (
    <>
      <div className="address">
        <div className="reach">
          <p>REACH US THROUGH</p>
          <ul>
            <li>
              <span><i class="fa-solid fa-location-dot"></i></span>
              <span>834, 31sr A cross Thilaknagar Jayanagar Bangalore 41</span>
            </li>
            <li>
              <span><i class="fa-solid fa-phone"></i></span>
              <span>+91 99720 97848</span>
            </li>
            <li>
              <span><i class="fa-regular fa-envelope"></i></span>
              <span>deepak@piimh.com</span>
            </li>
          </ul>
        </div>
        <div className="social">
          <p>SOCIAL NETWORKS</p>
          <div className="d-flex">
            <ul>
              <li>
                <span><i class="fa-brands fa-facebook-f"></i></span>
                <span>Coming Soon</span>
              </li>
              <li>
                <span><i class="fa-brands fa-twitter"></i></span>
                <span>Coming Soon</span>
              </li>
              <li>
                <span><i class="fa-brands fa-instagram"></i></span>
                <span>Coming Soon</span>
              </li>
              <li>
                <span><i class="fa-brands fa-google-plus-g"></i></span>
                <span>Coming Soon</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </>
  );
};

export default Address;
