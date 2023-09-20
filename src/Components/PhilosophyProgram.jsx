import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import client from "../client";
import { documentToReactComponents } from "@contentful/rich-text-react-renderer";

const PhilosophyProgram = () => {
  const { slug } = useParams();
  const [entry, setEntry] = useState([]);

  useEffect(() => {
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
          const { title, description, subTitle, ctaButton, link  } = item.fields;
          const bgImage = item.fields.bgImage.fields.file.url;
          const id = item.sys.id;
          const richTextContent = documentToReactComponents(description);
          return (
            <React.Fragment key={id}>
              <div className="basicComponent"
                style={{ backgroundColor: bgImage }}>
                <div className="container">
                  <div className="basicComponent_wrapper">
                    <div>
                      <h3>{subTitle}</h3>
                      <h2>{title}</h2>
                      <div className="basicComponent_content">
                        {richTextContent}
                        
                      </div>
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
