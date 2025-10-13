import { Routes, Route, Navigate } from "react-router-dom";
import Header from "./components/Header";
import Login from "./pages/Login";
import Register from "./pages/Register";
import VerifyEmail from "./pages/VerifyEmail";
import Doctors from "./pages/Doctors";
import { useAuth } from "./context/AuthContext";

function Home(){
  return (
    <div className="container">
      <div className="card" style={{marginTop:24}}>
        <h1>DoctorNode App</h1>
        <p className="subtitle">
          Book appointments with trusted doctors. Clean blue & white UI, powered by your Node API.
        </p>
        <div className="footer-space"></div>
      </div>
    </div>
  );
}

function Protected({ children }){
  const { isAuthed } = useAuth();
  if (!isAuthed) return <Navigate to="/login" replace/>;
  return children;
}

export default function App(){
  return (
    <>
      <Header />
      <Routes>
        <Route path="/" element={<Home/>}/>
        <Route path="/login" element={<Login/>}/>
        <Route path="/register" element={<Register/>}/>
        <Route path="/verify-email" element={<VerifyEmail/>}/>
        <Route path="/doctors" element={<Protected><Doctors/></Protected>} />
        <Route path="*" element={<Navigate to="/" replace/>}/>
      </Routes>
    </>
  );
}
