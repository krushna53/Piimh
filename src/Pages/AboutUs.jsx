// About.js
import React from "react";
import Banner from "../Components/Banner";

const AboutUs = () => {
  const slug = "about-page-banner"; // Set the slug for the about page banner
  console.log("Slug for About Page:", slug);
  return (
    <>
      {/* Other content */}
      <Banner slug={slug} />
      {/* Other content */}
    </>
  );
};

export default AboutUs;
