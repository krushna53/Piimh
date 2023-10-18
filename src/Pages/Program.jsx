import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { documentToReactComponents } from "@contentful/rich-text-react-renderer";
import { BLOCKS } from "@contentful/rich-text-types";
import client from "../client";

const Program = () => {
  const { slug } = useParams();
  const [backgroundImage, setBackgroundImage] = useState("");
  const [entry, setEntry] = useState([]);

  useEffect(() => {
    const fetchPage = async () => {
      try {
        const response = await client.getEntries({
          content_type: "programs",
          "fields.slug": slug,
        });
        if (response.items.length) {
          setEntry(response.items);

          const bannerSection = response.items[0].fields.pageComponent.find(
            (component) => component.sys.contentType.sys.id === "bannerSection"
          );
          if (bannerSection) {
            const bannerImage =
              bannerSection.fields.backgroundImage?.fields.file.url || "";
            setBackgroundImage(bannerImage);
          }
        }
      } catch (error) {
        console.error(error);
      }
    };
    fetchPage();
  }, [slug]);

  const hasBannerSection = (pageComponent) => {
    return (
      Array.isArray(pageComponent) &&
      pageComponent.some(
        (component) => component.sys.contentType.sys.id === "bannerSection"
      )
    );
  };

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
        const { title, subTitle, pageComponent } = item.fields;
        const id = item.sys.id;

        return (
          <React.Fragment key={id}>
            {pageComponent &&
              pageComponent.map((component) => {
                const {
                  title: componentTitle,
                  description,
                  subTitle,
                  bgColor,
                  componentType,
                } = component.fields;

                if (componentType === "AboutUs-Director") {
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
                            {renderRichText(description)}
                          </div>
                        </div>
                      </section>
                    </React.Fragment>
                  );
                } else if (
                  component.sys.contentType.sys.id === "bannerSection"
                ) {
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
                } else if (componentType === "AboutUs-Philosophy") {
                  return (
                    <React.Fragment key={component.sys.id}>
                      <section className="TitleDescriptionSection">
                        <div className="basicComponent">
                          <div className="container">
                            <h2>{componentTitle}</h2>
                            <span className="divider-separator"></span>
                            <div className="basicComponent_content">
                              {renderRichText(description)}
                            </div>
                          </div>
                        </div>
                      </section>
                    </React.Fragment>
                  );
                } else {
                  return (
                    <React.Fragment key={component.sys.id}>
                      <section className="Home-about">
                        <div
                          className="basicComponent"
                          style={{ backgroundColor: bgColor }}
                        >
                          <div className="container">
                            <div className="basicComponent_wrapper">
                              <h2>{componentTitle}</h2>
                              <h3>{subTitle}</h3>
                              <div className="basicComponent_content">
                                {renderRichText(description)}
                              </div>
                            </div>
                          </div>
                        </div>
                      </section>
                    </React.Fragment>
                  );
                }
              })}

            {!hasBannerSection(pageComponent) && (
              <section className="basicpage_main">
                <div className="container">
                  <div className="basicPage">
                    <div className="basicPage_wrapper">
                      <h2>{title}</h2>
                      <h3>{subTitle}</h3>
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

export default Program;
