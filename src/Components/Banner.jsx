import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { documentToReactComponents } from "@contentful/rich-text-react-renderer";
import { BLOCKS } from "@contentful/rich-text-types";
import client from "../client";

const Banner = () => {
  const [bannerItems, setBannerItems] = useState([]);
  const [backgroundImage, setBackgroundImage] = useState("");
  const { slug } = useParams();


 useEffect(() => {
    async function getMenuItems() {
      try {
  
        const entries = await client.getEntries({
          content_type: "bannerSection",
          "sys.id": '4hURH4J5WPqHSjm3vABwxo',
        });
        setBannerItems(entries.items.reverse());
        console.log(entries)
        setBackgroundImage(
          entries.items[0]?.fields.backgroundImage?.fields.file.url || ""
        );
      } catch (error) {
        console.error("Error fetching menu items:", error);
      }
    }
    getMenuItems();
  }, [slug]);

  const renderCustomRichTextHeading = (node, children) => (
    <div className="custom-rich-text-heading">
      {children.map((child, index) => (
        <h1 key={index}>{child}</h1>
      ))}
    </div>
  );

  const renderCustomRichTextSubheading = (node, children) => (
    <div className="custom-rich-text-subheading">
      {children.map((child, index) => (
        <h2 key={index}>{child}</h2>
      ))}
    </div>
  );

  const headingRenderers = {
    [BLOCKS.HEADING_1]: renderCustomRichTextHeading,
    [BLOCKS.HEADING_2]: renderCustomRichTextSubheading,
  };

  const renderRichText = (richText) => {
    if (richText) {
      return (
        <div className="custom-rich-text-container">
          {documentToReactComponents(richText, {
            renderNode: {
              ...headingRenderers,
              [BLOCKS.EMBEDDED_ASSET]: (node) => {
                const { title, description, file } = node.data.target.fields;
                const imageUrl = file.url;
                const altText = description || title || "Image";
                return (
                  <div className="custom-rich-text-block">
                    <img src={imageUrl} alt={altText} loading="lazy" />
                  </div>
                );
              },
            },
          })}
        </div>
      );
    }
    return null;
  };


  return (
    <section
      className="banner"
      style={{ backgroundImage: `url(${backgroundImage})` }}
    >
      <div className="background-overlay"></div>
      <div className="container">
      <div className="d-flex">
        {bannerItems.map((item) => (
          <React.Fragment key={item.sys.id}>
            {renderRichText(item.fields.description)}
          </React.Fragment>
        ))}
      </div>
      </div>
    </section>
  );
};

export default Banner;
