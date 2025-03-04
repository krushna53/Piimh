import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { documentToReactComponents } from "@contentful/rich-text-react-renderer";
import { BLOCKS } from "@contentful/rich-text-types";
import client from "../client";
import Aos from "aos";
import CollapsibleComponent from "../Components/CollapsibleComponent"
const Program = () => {
  const { slug } = useParams();
  const [backgroundImage, setBackgroundImage] = useState("");
  const [entry, setEntry] = useState([]);

  useEffect(() => {
    Aos.init({ duration: 2000 });
    const fetchPage = async () => {
      try {
        const response = await client.getEntries({
          content_type: "basicPage",
          "sys.id": "6uUfGCHDHxY6JVNq2Wkbep",
        });
        if (response.items.length) {
          setEntry(response.items);

          // Set the banner image URL here
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
                    <span className="vc_sep_line"></span>
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
        const { title, subTitle, pageComponent, pageType, componentType } =
          item.fields;
        const id = item.sys.id;

        return (
          <React.Fragment key={id}>
            {pageComponent.map((component) => {
              const {
                title: componentTitle,
                description,
                twoColumDescription,
                subTitle,
                bgColor,
                componentType: type,
                pageType,
              } = component.fields;
              // console.log(component.fields)
              // WHY THIS PROGRAM section
              if (pageType === "Program" && type === "program-program") {
                return (
                  <React.Fragment key={component.sys.id}>
                    {/* <section className="program">
                      <div className="basicComponent">
                        <div className="container">
                          <div className="title_subtitle">
                            <h2>{componentTitle}</h2>
                            <span className="vc_sep_line"></span>
                            <p>{subTitle}</p>
                          </div>
                          <div className="d-flex">
                            {renderRichText(component.fields.description)}
                            {renderRichText(twoColumDescription)}
                          </div>
                        </div>
                      </div>
                    </section> */}
                  </React.Fragment>
                );
                
                
              }  // WHY THIS PROGRAM section below section
              
              else if (pageType === "Program" && type === "program-details") {
                return (
                  <React.Fragment key={component.sys.id}>
                    {/* <section className="program-details">
                      <div className="basicComponent">
                        <div className="container">
                          <div className="title_subtitle">
                            <p>{subTitle}</p>
                            <h2>{componentTitle}</h2>
                            <span className="vc_sep_line"></span>
                          </div>
                          <div className="basicComponent_content">
                            {renderRichText(component.fields.description)}
                          </div>
                        </div>
                      </div>
                    </section> */}
                  </React.Fragment>
                );
              } else if (component.sys.contentType.sys.id === "bannerSection") {
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
                        {/* <h1>{componentTitle}</h1> */}
                        <div className="d-flex">
                          {renderRichText(description)}
                        </div>
                      </div>
                    </section>
                  </React.Fragment>
                );
              }
            
              // what-is-this-program section
              else if (
                pageType === "Program" &&
                type === "program-what-is-this-program"
              ) {
                return (
                  <React.Fragment key={component.sys.id}>
                    {/* <section className="what-is-this-program">
                      <div className="basicComponent">
                        <div className="container">
                          <h2 data-aos="fade-left" data-aos-offset="200">{componentTitle}</h2>
                          <span className="divider-separator"></span>
                          <div className="basicComponent_content" data-aos="fade-right" data-aos-offset="200">
                            {renderRichText(component.fields.description)}
                          </div>
                        </div>
                      </div>
                    </section> */}
                    <CollapsibleComponent/>
                  </React.Fragment>
                );
              }
              
              // Milestones section
              else if (pageType === "Program" && type === "Milestones") {
                
                return (
                  <React.Fragment key={component.sys.id}>
                    {/* <section className="Milestones">
                      <div className="basicComponent">
                        <div className="container">
                        <div className="title_subtitle">
                            <p data-aos="fade-left" data-aos-offset="200">{subTitle}</p>
                            <h2 data-aos="fade-right" data-aos-offset="200">{componentTitle}</h2>
                            <span className="vc_sep_line"></span>
                          </div>
                          <div className="basicComponent_content">
                            {renderRichText(component.fields.description)}
                          </div>
                        
                        </div>
                      </div>
                    </section> */}
                  </React.Fragment>
                );
              }
              // WHAT IS PSYCHOTHERAPY section
              else {
                return (
                  <React.Fragment key={component.sys.id}>
                    {/* <section className="Home-about">
                      <div
                        className="basicComponent"
                        style={{ backgroundColor: bgColor }}
                      >
                        <div className="container">
                          <div className="basicComponent_wrapper">
                            <h2 data-aos="fade-left" data-aos-offset="200">{componentTitle}</h2>
                            <h3 data-aos="fade-right" data-aos-offset="200">{subTitle}</h3>
                            <div className="basicComponent_content" data-aos="fade-left" data-aos-offset="200">
                              {renderRichText(component.fields.description)}
                            </div>
                          </div>
                        </div>
                      </div>
                    </section> */}
                  </React.Fragment>
                  
                );
              }
            })}
          </React.Fragment>
          
        );
      })}
      <div className="brochure">
        <div className="container">
      <a href="https://bit.ly/piimh_Psychotherapy_Training" target="_blank" >Practitioner Certification Training Program in Psychotherapy</a>
      </div>
      </div>
    </>
  );
};

export default Program;
