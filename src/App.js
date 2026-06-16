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
import HdfcPaymentForm from "./Pages/HdfcPayment";
import PaymentStatus from "./Pages/PaymentStatus";
import OrderStatusCheck from "./Pages/OrderStatusCheck";

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
        <Route exact path='/payment' element={<HdfcPaymentForm />} />
        <Route exact path='/payment-status' element={<PaymentStatus />} />
        <Route exact path='/order-status' element={<OrderStatusCheck />} />
      </Routes>
      <StayConnected/>
      <Footer />
      </div>
    </>
  );
}

export default App;
