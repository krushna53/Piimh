import React from "react";
import { Route, Routes } from "react-router-dom";
import Home from "./Pages/Home";
import AboutUs from "./Pages/AboutUs";
import Programs from "./Pages/Programs";
import Publication from "./Pages/Publication";
import Contact from "./Pages/Contact";
import BasicPage from "./Pages/BasicPage";
import Header from "./Components/Header";
import Banner from "./Components/Banner";
import Footer from "./Components/Footer";
function App() {
  return (
    <>
    <Header/>
    <Banner/>
    
      <Routes>
      <Route exact path='/page/:slug' element={<BasicPage />} />
        <Route exact path='/' element={<Home />} />
        <Route exact path='/aboutus' element={<AboutUs />} />
        <Route exact path='/programs' element={<Programs />} />
        <Route exact path='/publication' element={<Publication />} />
        <Route exact path='/contact' element={<Contact />} />
        <Route exact path='/page/:slug' element={<BasicPage />} />
      </Routes>
      <Footer/>
    </>
  );
}

export default App;
