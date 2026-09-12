"use client";
export default function ErrorPage({reset}:{reset:()=>void}){return <main className="admin-login admin-panel"><h1>Administrator service unavailable</h1><p role="alert">No data is shown. Please retry or contact your operator.</p><button className="action" onClick={reset}>Retry</button></main>;}
