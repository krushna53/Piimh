import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import client from "../client";
import { documentToReactComponents } from "@contentful/rich-text-react-renderer";

const StayConnected = () => {
  const { slug } = useParams();
  const [entry, setEntry] = useState([]);

  useEffect(() => {
    const fetchPage = async () => {
      try {
        const response = await client.getEntries({
          content_type: "component",
          "sys.id": "44domFAPPtLBfKhcsj6tye",
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
      <section className="stay-connected">
        {entry.map((item) => {
          const { title, subTitle } = item.fields;
          const imageUrl = item.fields.image.fields.file.url;
          const googleMapsUrl = item.fields.googleMapsUrl; // Replace with your actual field name
          const id = item.sys.id;

          return (
            <React.Fragment key={id}>
              <div className="basicComponent">
                <div className="container">
                  <div className="basicComponent_wrapper">
                    <div>
                      <h3>{subTitle}</h3>
                      <h2>{title}</h2>
                      <div className="basicComponent_content">
                        <div>
                          {/* Manually create and render the Google Maps iframe */}
                          <iframe
                            src={googleMapsUrl}
                            width="100%"
                            height="400"
                            allowFullScreen
                            title="Google Map"
                          ></iframe>
                        </div>
                        <div>
                          <img src={imageUrl} alt={title} width={100} />
                        </div>
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

export default StayConnected;
