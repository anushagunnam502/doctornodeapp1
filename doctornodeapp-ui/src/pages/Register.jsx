import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Register(){
  const { register, loading, error } = useAuth();
  const nav = useNavigate();
  const [name,setName] = useState("");
  const [email,setEmail] = useState("");
  const [password,setPassword] = useState("");

  async function onSubmit(e){
    e.preventDefault();
    await register({ name, email, password });
    nav("/login");
  }

  return (
    <div className="container">
      <div className="card" style={{maxWidth:520, margin:"40px auto"}}>
        <h1>Create account</h1>
        <p className="subtitle">Join and start booking appointments.</p>
        <form className="form" onSubmit={onSubmit}>
          <input className="input" placeholder="Full name" value={name} onChange={e=>setName(e.target.value)} required />
          <input className="input" type="email" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} required />
          <input className="input" type="password" placeholder="Password" value={password} onChange={e=>setPassword(e.target.value)} required />
          {error && <div className="helper" style={{color:"#b91c1c"}}>⚠ {error}</div>}
          <button className="btn" disabled={loading}>{loading ? "Creating…" : "Create account"}</button>
        </form>
        <p className="helper" style={{marginTop:14}}>
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
