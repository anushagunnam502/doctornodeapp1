import { NavLink, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Header(){
  const { user, isAuthed, logout } = useAuth();
  return (
    <header className="header">
      <div className="header-inner container">
        <Link to="/" className="brand">
          <span className="brand-badge"></span>
          DoctorNode App
        </Link>
        <nav className="nav">
          {isAuthed ? (
            <>
              <span style={{marginRight:10, color:"#334155"}}>Hi, <b>{user?.name}</b></span>
              <NavLink to="/doctors">Doctors</NavLink>
              <button className="btn" style={{marginLeft:14}} onClick={logout}>Logout</button>
            </>
          ) : (
            <>
              <NavLink to="/login">Login</NavLink>
              <NavLink to="/register">Register</NavLink>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
