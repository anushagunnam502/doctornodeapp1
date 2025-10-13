import { useEffect, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import api from "../api/client";

export default function VerifyEmail(){
  const nav = useNavigate();
  const [sp] = useSearchParams();
  const [email, setEmail] = useState(sp.get("email") || "");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  async function onSubmit(e){
    e.preventDefault();
    setLoading(true); setErr(""); setMsg("");
    try{
      await api.post("/api/auth/verify-email", { email, code });
      setMsg("Email verified. You can now log in.");
      setTimeout(()=> nav("/login"), 800);
    }catch(e){
      setErr(e?.response?.data?.error || e.message || "Verification failed");
    }finally{
      setLoading(false);
    }
  }

  async function resend(){
    setLoading(true); setErr(""); setMsg("");
    try{
      await api.post("/api/auth/resend-verification", { email });
      setMsg("New code sent (check server console in dev).");
    }catch(e){
      setErr(e?.response?.data?.error || e.message || "Resend failed");
    }finally{
      setLoading(false);
    }
  }

  useEffect(()=>{
    // focus UX: if code in query later we could prefill
  },[]);

  return (
    <div className="container">
      <div className="card" style={{maxWidth:520, margin:"40px auto"}}>
        <h1>Verify your email</h1>
        <p className="subtitle">Enter the 6-digit code sent to your email.</p>

        <form className="form" onSubmit={onSubmit}>
          <input
            className="input"
            type="email"
            placeholder="Your email"
            value={email}
            onChange={e=>setEmail(e.target.value)}
            required
          />
          <input
            className="input"
            placeholder="6-digit code"
            value={code}
            onChange={e=>setCode(e.target.value)}
            maxLength={6}
            required
          />
          {err && <div className="helper" style={{color:"#b91c1c"}}>⚠ {err}</div>}
          {msg && <div className="helper" style={{color:"#065f46"}}>✔ {msg}</div>}
          <button className="btn" disabled={loading}>{loading ? "Verifying…" : "Verify email"}</button>
        </form>

        <div style={{display:"flex", justifyContent:"space-between", marginTop:14}}>
          <button className="btn" onClick={resend} disabled={loading || !email}>Resend code</button>
          <span className="helper">Already verified? <Link to="/login">Sign in</Link></span>
        </div>
      </div>
    </div>
  );
}
