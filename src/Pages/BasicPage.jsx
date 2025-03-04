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
    if (entry.length > 0) {
      const pageTitle = entry[0].fields.title.replace(/\s+/g, "-").toLowerCase();
      document.body.classList.add(pageTitle);
  
      return () => {
        document.body.classList.remove(pageTitle);
      };
    }
  }, [entry]);
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

  const hasBannerSection = (pageComponent) => {
    return (
      Array.isArray(pageComponent) &&
      pageComponent.some(
        (component) => component.sys.contentType.sys.id === "bannerSection"
      )
    );
  };

  const renderRichText = (richText) => {
    if (richText) {
      return (
        <div className="custom-rich-text-container">
          {documentToReactComponents(richText, {
            renderNode: {
              [BLOCKS.EMBEDDED_ASSET]: (node) => {
                const { title, description, file } = node.data.target.fields;
                const fileUrl = file.url;
                const fileType = file.contentType;
                const altText = description || title || "File";

                if (fileType.includes("pdf")) {
                  return (
                    <div className="custom-rich-text-block">
                      <iframe src={fileUrl} title={title} style={{ width: '100%', height: '100vh' }}></iframe>
                      {/* <p>
                        <a href={fileUrl} target="_blank" rel="noopener noreferrer">
                          View PDF
                        </a>
                      </p> */}
                    </div>
                  );
                }
                return (
                  <div className="custom-rich-text-block">
                    <img src={fileUrl} alt={altText} loading="lazy" />
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
                  componentType: type,
                } = component.fields;

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
                            {renderRichText(description)}
                          </div>
                        </div>
                      </section>
                    </React.Fragment>
                  );
                } else if (component.sys.contentType.sys.id === "bannerSection") {
                  return (
                    <React.Fragment key={component.sys.id}>
                      <section
                        className="banner"
                        style={{ backgroundImage: `url(${backgroundImage})` }}
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
