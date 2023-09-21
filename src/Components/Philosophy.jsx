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

 const options = {
  renderNode: {
    'heading-3 & heading-4': (node, children) => (
      <div>
        <h3 className="your-h3-class">{children}</h3>
        <h4 className="your-h4-class">{children}</h4>
      </div>
    ),
  },
};


  return (
    <>
      <section className="philosophy">
        {entry.map((item) => {
          const { title, description, subTitle } = item.fields;
          const imageUrl = item.fields.image.fields.file.url;
          const id = item.sys.id;
          const richTextContent = documentToReactComponents(description, options);
          return (
            <React.Fragment key={id}>
              <div className="container">
                <div className="basicComponent">
                  <div className="title_sub_title">
                    <h3>{subTitle}</h3>
                    <h2 className="heading-title">{title}</h2>
                  </div>
                  <div className="basicComponent_wrapper d-flex">
                    <div className="Right_img">
                      <img src={imageUrl} alt={title} width={100} />
                    </div>
                    <div className="basicComponent_content">
                      {richTextContent}
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
