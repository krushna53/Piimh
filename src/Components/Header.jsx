import React, { useState, useEffect } from "react";
import { NavLink, useLocation } from "react-router-dom";
import client from "../client";

const Header = () => {
  const [menuItems, setMenuItems] = useState([]);
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false); // State for responsive menu toggle

  useEffect(() => {
    async function getMenuItems() {
      const entries = await client.getEntries({
        content_type: "menu",
      });
      setMenuItems(entries.items);
    }
    getMenuItems();
  }, []);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  return (
    <>
      <header>
        <div className="container">
          <div className="d-flex">
            <div className="logo">
            <a href="/">
            <img src="logo.png" alt="Logo" /> </a>
                     
              
            </div>
            <div className="humber_menu" onClick={toggleMenu}>
              <i className="fas fa-bars"></i>
            </div>
            <nav className={isMenuOpen ? "open" : ""}>
              <ul>
                {menuItems.map((items) => (
                  <li key={items.sys.id}>
                    <NavLink
                      to={items.fields.link}
                      className={
                        location.pathname === items.fields.link ? "active" : ""
                      }
                    >
                      {items.fields.name}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </div>
      </header>
    </>
  );
};

export default Header;
