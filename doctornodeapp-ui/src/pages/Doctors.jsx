import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/client";
import { useAuth } from "../context/AuthContext";

export default function Doctors(){
  const { isAuthed } = useAuth();
  const [q, setQ] = useState("");
  const [city, setCity] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [rows, setRows] = useState([]);

  async function load(){ 
    if(!isAuthed) return;
    setLoading(true); setError("");
    try{
      const { data } = await api.get("/api/doctors", { params: { q, city } });
      setRows(data || []);
    }catch(e){
      setError(e?.response?.data?.error || e.message || "Failed to load doctors");
    }finally{
      setLoading(false);
    }
  }

  useEffect(()=>{ load(); /* initial */ }, []); // eslint-disable-line

  function onSubmit(e){
    e.preventDefault();
    load();
  }

  return (
    <div className="container">
      <div className="card" style={{marginTop:24}}>
        <h1>Find Doctors</h1>
        <p className="subtitle">Search by name or specialty, optionally filter by city.</p>

        <form className="form" onSubmit={onSubmit} style={{gridTemplateColumns:"1fr 1fr auto", gap:12}}>
          <input className="input" placeholder="Search name or specialty (e.g., Cardiology)" value={q} onChange={e=>setQ(e.target.value)} />
          <input className="input" placeholder="City (optional)" value={city} onChange={e=>setCity(e.target.value)} />
          <button className="btn" disabled={loading}>{loading ? "Searching…" : "Search"}</button>
        </form>

        {error && <div className="helper" style={{color:"#b91c1c", marginTop:10}}>⚠ {error}</div>}

        <div style={{display:"grid", gap:16, marginTop:20}}>
          {rows.map(d => (
            <div key={d.id} className="card" style={{boxShadow:"none", borderColor:"#e2e8f0"}}>
              {/* title row with Book button on the right */}
              <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", gap:12}}>
                <h2 style={{marginBottom:6}}>{d.name}</h2>
                <Link
                  className="btn"
                  to={`/book?doctorId=${encodeURIComponent(d.id)}`}
                  title={`Book ${d.name}`}
                >
                  Book
                </Link>
              </div>

              <div className="helper">Specialty: <b>{d.specialty || "—"}</b></div>
              <div className="helper">City: <b>{d.city || "—"}</b> · Fee: <b>{d.fee != null ? ("$"+d.fee) : "—"}</b></div>
              <div className="helper">Email: <b>{d.email}</b> {d.phone ? <> · Phone: <b>{d.phone}</b></> : null}</div>
            </div>
          ))}
          {!loading && rows.length === 0 && <div className="helper" style={{marginTop:6}}>No doctors yet. Try a different search.</div>}
        </div>
      </div>
    </div>
  );
}
