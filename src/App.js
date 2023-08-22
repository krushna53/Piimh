import React from "react";
import { Route, Routes } from "react-router-dom";
import Home from "./Pages/Home";
import AboutUs from "./Pages/AboutUs";
import Programs from "./Pages/Programs";
import Publication from "./Pages/Publication";
import Contact from "./Pages/Contact";
import BasicPage from "./Pages/BasicPage";
function App() {
  return (
    <>
      <Routes>
        <Route exact path='/' element={<Home />} />
        <Route exact path='/about us' element={<AboutUs />} />
        <Route exact path='/programs' element={<Programs />} />
        <Route exact path='/publication' element={<Publication />} />
        <Route exact path='/contact' element={<Contact />} />
        <Route exact path='/page/:slug' element={<BasicPage />} />
      </Routes>
    </>
  );
}

export default App;
