import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import client from "../client";
import { documentToReactComponents } from "@contentful/rich-text-react-renderer";
import Aos from "aos";
const BasicComponent = () => {
  const { slug } = useParams();
  const [entry, setEntry] = useState([]);

  useEffect(() => {
    Aos.init({ duration: 2000 });
    const fetchPage = async () => {
      try {
        const response = await client.getEntries({
          content_type: "component",
          "sys.id":"j1FEf5PgGNafEVuvrRmSE",
        });
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
      <section className="Home-about">
        <div className="home-basic">
        {entry.map((item) => {
          const { title, description, subTitle, bgColor, ctaButton, link,hideTitleAndSubtitle } =
            item.fields;
          console.log(item.fields);
          const id = item.sys.id;
          const richTextContent = documentToReactComponents(description);
          return (
            <React.Fragment key={id}>
              <div
                className="basicComponent"
                style={{ backgroundColor: bgColor }}
              >
                <div className="container">
                  <div className="basicComponent_wrapper">
                  {!hideTitleAndSubtitle && (
                <h2 data-aos="fade-right" data-aos-offset="200">
                  {title}
                </h2>
              )}
              {!hideTitleAndSubtitle && (
                <h3 data-aos="fade-left" data-aos-offset="200">
                  {subTitle}
                </h3>
              )}
                    <div className="basicComponent_content"  data-aos="fade-right" data-aos-offset="200">
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
        </div>
      </section>
    </>
  );
};

export default BasicComponent;
