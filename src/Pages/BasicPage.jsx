import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { documentToReactComponents } from "@contentful/rich-text-react-renderer";
import { BLOCKS } from "@contentful/rich-text-types";
import client from "../client";
import Aos from "aos";
const BasicPage = () => {
  const { slug } = useParams();
  const [backgroundImage, setBackgroundImage] = useState("");
  const [entry, setEntry] = useState([]);
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [slug]);
  useEffect(() => {
    Aos.init({ duration: 2000 });
    const fetchPage = async () => {
      try {
        const response = await client.getEntries({
          content_type: "basicPage",
          "fields.slug": slug,
        });
        if (response.items.length) {
          setEntry(response.items);
          console.log(response);

          // Set the banner image URL here
          if (response.items[0].fields.pageComponent) {
            const bannerSection = response.items[0].fields.pageComponent.find(
              (component) =>
                component.sys.contentType.sys.id === "bannerSection"
            );
            if (bannerSection) {
              const bannerImage =
                bannerSection.fields.backgroundImage?.fields.file.url || "";
              setBackgroundImage(bannerImage);
            }
          }
        }
      } catch (error) {
        console.error(error);
      }
    };
    fetchPage();
  }, [slug]);

  // Function to check if the "Page Component" reference field contains "bannerSection"
  const hasBannerSection = (pageComponent) => {
    return (
      Array.isArray(pageComponent) &&
      pageComponent.some(
        (component) => component.sys.contentType.sys.id === "bannerSection"
      )
    );
  };

  // Rest of your code...
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
    <>
      {entry.map((item) => {
        const { title, subTitle, pageComponent, componentType } = item.fields;
        const id = item.sys.id;
        console.log(item.fields);
        return (
          <React.Fragment key={id}>
            {pageComponent &&
              pageComponent.map((component) => {
                const {
                  title: componentTitle,
                  description,
                  subTitle,
                  bgColor,
                  componentType: type,
                } = component.fields;

                // Render the "Director and Lead Trainer" section
                if (type === "AboutUs-Director") {
                  return (
                    <React.Fragment key={component.sys.id}>
                      <section className="director">
                        <div className="basicComponent">
                          <div className="container">
                            <div className="title_subtitle">
                              <h2>{componentTitle}</h2>
                              <span className="vc_sep_line"></span>
                              <h3>{subTitle}</h3>
                            </div>
                            {renderRichText(component.fields.description)}
                          </div>
                        </div>
                      </section>
                    </React.Fragment>
                  );
                } else if (
                  component.sys.contentType.sys.id === "bannerSection"
                ) {
                  // Render banner section
                  return (
                    <React.Fragment key={component.sys.id}>
                      <section
                        className="banner"
                        style={{
                          backgroundImage: `url(${backgroundImage})`,
                        }}
                      >
                        <div className="background-overlay"></div>
                        <div className="container">
                          <div className="d-flex">
                            {renderRichText(description)}
                          </div>
                        </div>
                      </section>
                    </React.Fragment>
                  );
                } else if (type === "AboutUs-Philosophy") {
                  // Render the "HOW WE LIVE OUR PHILOSOPHY" section
                  return (
                    <React.Fragment key={component.sys.id}>
                      <section className="TitleDescriptionSection">
                        <div className="basicComponent">
                          <div className="container">
                            <h2>{componentTitle}</h2>
                            <span className="divider-separator"></span>
                            <div className="basicComponent_content">
                              {renderRichText(component.fields.description)}
                            </div>
                          </div>
                        </div>
                      </section>
                    </React.Fragment>
                  );
                } else {
                  // Render other components with different titles
                  return (
                    <React.Fragment key={component.sys.id}>
                      <section className="Home-about">
                        <div
                          className="basicComponent"
                          style={{ backgroundColor: bgColor }}
                        >
                          <div className="container">
                            <div className="basicComponent_wrapper">
                              <h2 data-aos="fade-left" data-aos-offset="200">
                                {componentTitle}
                              </h2>
                              <h3 data-aos="fade-right" data-aos-offset="200">
                                {subTitle}
                              </h3>
                              <div
                                className="basicComponent_content"
                                data-aos="fade-left"
                                data-aos-offset="200"
                              >
                                {renderRichText(component.fields.description)}
                              </div>
                            </div>
                          </div>
                        </div>
                      </section>
                    </React.Fragment>
                  );
                }
              })}

            {/* Conditionally render the code block */}
            {!hasBannerSection(pageComponent) && (
              <section className="basicpage_main">
                <div className="container">
                  <div className="basicPage">
                    <div className="basicPage_wrapper">
                      <h1>{title}</h1>
                      <h2>{subTitle}</h2>
                      <div className="basicPage_content">
                        {renderRichText(item.fields.description)}
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            )}
          </React.Fragment>
        );
      })}
    </>
  );
};

export default BasicPage;
