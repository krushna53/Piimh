import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import client from "../client";
import { documentToReactComponents } from "@contentful/rich-text-react-renderer";

const Director = () => {
  const { slug } = useParams();
  const [entry, setEntry] = useState([]);

  useEffect(() => {
    const fetchPage = async () => {
      try {
        const response = await client.getEntries({
          content_type: "component",
          "sys.id": "2Aq8vl8W4kEQtRerKjccgg",
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
      <section className="director">
        {entry.map((item) => {
          const { title, description, subTitle, ctaButton, link } = item.fields;
          const imageUrl = item.fields.image.fields.file.url;
          const id = item.sys.id;
          const richTextContent = documentToReactComponents(description);
          return (
            <React.Fragment key={id}>
              <div className="basicComponent">
                <div className="container">
                  <div className="title_subtitle">
                    <h2>{title}</h2>
                    <h3>{subTitle}</h3>
                  </div>
                  <div className="basicComponent_wrapper">
                    <div className="basicComponent_content">
                      {richTextContent}
                      <a href={link} className="cta-button">
                        {ctaButton}
                      </a>
                    </div>
                    <div className="right_img">
                      <img src={imageUrl} alt={title} width={100} />
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

export default Director;
