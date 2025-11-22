import { Routes, Route } from "react-router-dom";
import Header from "./components/Header.jsx";

import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import VerifyEmail from "./pages/VerifyEmail.jsx";
import Doctors from "./pages/Doctors.jsx";
import Appointments from "./pages/Appointments.jsx"; // << Book page
import MyAppointments from "./pages/MyAppointments.jsx";
import DoctorAppointments from "./pages/DoctorAppointments.jsx";


function Home() {
    return (
    <div className="container">
      <div className="card" style={{ marginTop: 24 }}>
      <h1>Welcome</h1>
        <p className="subtitle">Login/Register, browse Doctors, or Book an appointment.</p>
    </div>
      </div>
  );
}

export default function App() {
  return (
    <>
      <Header />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/doctors" element={<Doctors />} />
        <Route path="/book" element={<Appointments />} />   {/* <- NEW */}
        <Route path="/appointments" element={<MyAppointments />} />
         <Route path="/doctor-appointments" element={<DoctorAppointments />} />
        <Route path="*" element={<Home />} />

      </Routes>
    </> 
  );
}
