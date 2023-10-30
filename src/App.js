import React from "react";
import { Route, Routes } from "react-router-dom";
import Home from "./Pages/Home";
import Contact from "./Pages/Contact";
import BasicPage from "./Pages/BasicPage";
import Header from "./Components/Header";
import Footer from "./Components/Footer";
import StayConnected from './Components/StayConnected'
import './style.css'
import '../src/dist/aos.css'
import Program from "./Pages/Program";
function App() {
  return (
    <>
      <Header />
      <div className="wrapper"> 
      <Routes>
        <Route exact path='/:slug' element={<BasicPage />} />
        <Route exact path='/programs' element={<Program />} />
        <Route exact path='/' element={<Home />} />
        <Route exact path='/contact' element={<Contact />} />
      </Routes>
      <StayConnected/>
      <Footer />
      </div>
    </>
  );
}

export default App;
