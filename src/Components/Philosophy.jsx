import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import client from "../client";
import { documentToReactComponents } from "@contentful/rich-text-react-renderer";

const Philosophy = () => {
  const { slug } = useParams();
  const [entry, setEntry] = useState([]);

  useEffect(() => {
    const fetchPage = async () => {
      try {
        const response = await client.getEntries({
          content_type: "component",
          "sys.id": "lWGmoCodntEZhNx8FHv5s",
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
      <section className="philosophy">
        {entry.map((item) => {
          const { title, description, subTitle } = item.fields;
          const imageUrl = item.fields.image.fields.file.url;
          const id = item.sys.id;
          const richTextContent = documentToReactComponents(description);
          return (
            <React.Fragment key={id}>
              <div className="basicComponent">
                <div className="container">
                  <div className="basicComponent_wrapper">
                    <div>
                      <img src={imageUrl} alt={title} width={100} />
                    </div>
                    <div>
                      <h3>{subTitle}</h3>
                      <h2>{title}</h2>
                      <div className="basicComponent_content">
                        {richTextContent}
                      </div>
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

export default Philosophy;
