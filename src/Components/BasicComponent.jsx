import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import client from "../client";
import { documentToReactComponents } from "@contentful/rich-text-react-renderer";

const BasicComponent = () => {
  const { slug } = useParams();
  const [entry, setEntry] = useState([]);

  useEffect(() => {
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
      <section>
        {entry.map((item) => {
          const { title, description, subTitle, bgColor, ctaButton, link } =
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
                    <h2>{title}</h2>
                    <h3>{subTitle}</h3>
                    <div className="basicComponent_content">
                      {richTextContent}
                    </div>
                    <a href={link} className="cta-button">
                      {ctaButton}
                    </a>
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

export default BasicComponent;
