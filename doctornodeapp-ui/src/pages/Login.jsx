import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Login(){
  const { login, loading, error } = useAuth();
  const nav = useNavigate();
  const [email,setEmail] = useState("");
  const [password,setPassword] = useState("");

  async function onSubmit(e){
    e.preventDefault();
    try{
      await login({ email, password });
      nav("/");
    }catch(e){
      const status = e?.response?.status;
      const msg = e?.response?.data?.error || e.message || "";
      // If backend blocks with 409 for unverified email, send user to /verify-email
      if (status === 409 || /not verified/i.test(msg)) {
        nav(`/verify-email?email=${encodeURIComponent(email)}`);
        return;
      }
      // Otherwise, AuthContext already set the error; just stay here
    }
  }

  return (
    <div className="container">
      <div className="card" style={{maxWidth:460, margin:"40px auto"}}>
        <h1>Welcome back</h1>
        <p className="subtitle">Sign in to book appointments and manage your profile.</p>
        <form className="form" onSubmit={onSubmit}>
          <input className="input" type="email" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} required />
          <input className="input" type="password" placeholder="Password" value={password} onChange={e=>setPassword(e.target.value)} required />
          {error && <div className="helper" style={{color:"#b91c1c"}}>⚠ {error}</div>}
          <button className="btn" disabled={loading}>{loading ? "Signing in…" : "Sign in"}</button>
        </form>
        <p className="helper" style={{marginTop:14}}>
          New here? <Link to="/register">Create an account</Link>
        </p>
      </div>
    </div>
  );
}
