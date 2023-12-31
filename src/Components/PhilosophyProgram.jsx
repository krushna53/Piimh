import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import client from "../client";
import { documentToReactComponents } from "@contentful/rich-text-react-renderer";
import Aos from "aos";
const PhilosophyProgram = () => {
  const { slug } = useParams();
  const [entry, setEntry] = useState([]);

  useEffect(() => {
    Aos.init({ duration: 2000 });
    const fetchPage = async () => {
      try {
        const response = await client.getEntries({
          content_type: "component",
          "sys.id": "wDrTLBLEbCgDDSbIZGx15",
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
      <section className="philosophy-program">
        {entry.map((item) => {
          const { title, description, ctaButton, link } = item.fields;
          const bgImage = item.fields.bgImage.fields.file.url;
          const id = item.sys.id;
          const richTextContent = documentToReactComponents(description);

          const sectionStyle = {
            backgroundImage: `url(${bgImage})`, // Set background image using the backgroundImage CSS property
          };

          return (
            <React.Fragment key={id}>
              <div className="basicComponent" style={sectionStyle}>
                <div className="elementor-background-overlay"></div>
                <div className="container">
                  <div className="basicComponent_wrapper">
                    <div className="background-overlay"></div>
                    <h2 data-aos="fade-left" data-aos-offset="200">{title}</h2>
                    <div className="basicComponent_content" data-aos="fade-right" data-aos-offset="200">
                      {richTextContent}
                      <a href={link} className="cta-button">
                        {ctaButton}
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </React.Fragment>
          );
        })}
      </section>
    </>
  );
};

export default PhilosophyProgram;
