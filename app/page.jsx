// app/page.jsx
// This is the home page. It shows a login screen if you're signed out,
// and your FitTrack app if you're signed in.

"use client";
import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import FitTrack from "../components/FitTrack"; // the app I built (see next file)

export default function Page() {
  const [session, setSession] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setReady(true); });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  if (!ready) return <div style={{ padding: 60, textAlign: "center", color: "#7C9082" }}>Loading…</div>;
  if (!session) return <Login />;
  return <FitTrack session={session} />;
}

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState("signin"); // signin | signup
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true); setMsg("");
    const fn = mode === "signin"
      ? supabase.auth.signInWithPassword({ email, password })
      : supabase.auth.signUp({ email, password });
    const { error } = await fn;
    if (error) setMsg(error.message);
    else if (mode === "signup") setMsg("Account created — you can sign in now.");
    setBusy(false);
  };

  const C = { plum: "#6B4E71", sage: "#7C9082", gold: "#C9A66B", ink: "#2D2A32", line: "#E4DEE6", paper: "#FBFAFB" };
  const input = { width: "100%", padding: "12px 14px", border: `1px solid ${C.line}`, borderRadius: 11, fontSize: 15, marginBottom: 12, outline: "none", boxSizing: "border-box" };

  return (
    <div style={{ minHeight: "100vh", background: C.paper, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ width: "100%", maxWidth: 360 }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2, color: C.gold, textTransform: "uppercase", textAlign: "center" }}>The Tracker</div>
        <div style={{ fontFamily: "Georgia, serif", fontSize: 34, fontWeight: 700, color: C.plum, textAlign: "center", marginBottom: 4 }}>FitTrack</div>
        <div style={{ fontSize: 13, fontStyle: "italic", color: C.sage, textAlign: "center", marginBottom: 28 }}>
          {mode === "signin" ? "Welcome back" : "Create your account"}
        </div>
        <input style={input} type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input style={input} type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()} />
        <button onClick={submit} disabled={busy} style={{ width: "100%", padding: "13px 0", background: C.plum, color: "#fff", border: "none", borderRadius: 11, fontWeight: 700, fontSize: 15, cursor: "pointer" }}>
          {busy ? "…" : mode === "signin" ? "Sign in" : "Sign up"}
        </button>
        {msg && <div style={{ fontSize: 13, color: C.sage, textAlign: "center", marginTop: 12 }}>{msg}</div>}
        <div style={{ textAlign: "center", marginTop: 18, fontSize: 13, color: C.ink }}>
          {mode === "signin" ? "New here? " : "Have an account? "}
          <button onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setMsg(""); }}
            style={{ background: "none", border: "none", color: C.plum, fontWeight: 700, cursor: "pointer" }}>
            {mode === "signin" ? "Create one" : "Sign in"}
          </button>
        </div>
      </div>
    </div>
  );
}
