import React, { useState,useEffect } from "react";
import { useCollapse } from "react-collapsed";
import client from "../client";
import { documentToReactComponents } from "@contentful/rich-text-react-renderer";
import Aos from "aos";
const CollapsibleComponent = () => {
  const [entries, setEntries] = useState([]);

  useEffect(() => {
    const fetchEntries = async () => {
      try {
        const response = await client.getEntries({
          content_type: "collapsingTitle",
        });

        if (response.items.length > 0) {
          setEntries(response.items);
        }
      } catch (error) {
        console.error(error);
      }
    };

    fetchEntries();
  }, []);

  return (
    <div className="collapsible-bg">
      <div className="container">
        <div className="collapsible">
          {entries.map((entry, index) => {
            const richTextContent = documentToReactComponents(entry.fields.content);

            return (
              <div key={index}>
                <CollapsibleItem
                  title={entry.fields.title}
                  richTextContent={richTextContent}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const CollapsibleItem = ({ title, richTextContent }) => {
  const [isExpanded, setExpanded] = useState(false);
  const { getToggleProps, getCollapseProps } = useCollapse({
    isExpanded,
  });
  const handleToggle = () => {
    setExpanded((prevState) => !prevState);
  };
  return (
    <div>
      <button data-aos="fade-left" data-aos-offset="150" className="button" onClick={handleToggle}>
        <div className="title">
          <h3 data-aos="fade-right" data-aos-offset="150">{title}</h3>
          <span>{isExpanded ? "-" : "+"}</span>
        </div>
      </button>

      {isExpanded && (
        <div className="Content">
          <div>{richTextContent}</div>
        </div>
      )}
    </div>
  );
};

export default CollapsibleComponent;
