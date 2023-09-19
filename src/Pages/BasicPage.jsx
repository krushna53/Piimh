import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import client from "../client";
import { documentToReactComponents } from "@contentful/rich-text-react-renderer";
import Banner from "../Components/Banner";

const BasicPage = () => {
  const { slug } = useParams();
  const [entry, setEntry] = useState([]);

  useEffect(() => {
    const fetchPage = async () => {
      try {
        const response = await client.getEntries({
          content_type: "basicPage",
          "fields.slug": slug,
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
      <section className="basicpage_main">
        <div className="container">
          {entry.map((item) => {
            const { title, description, subTitle } = item.fields;
            const id = item.sys.id;
            const richTextContent = documentToReactComponents(description);
            return (
              <React.Fragment key={id}>
                <div className="basicPage">
                  <div className="basicPage_wrapper">
                    <h2>{title}</h2>
                    <h3>{subTitle}</h3>
                    <div className="basicPage_content">{richTextContent}</div>
                  </div>
                </div>
                <Banner />
              </React.Fragment>
            );
          })}
        </div>
      </section>
    </>
  );
};

export default BasicPage;
