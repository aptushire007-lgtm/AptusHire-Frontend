/* ============================================================
   ForCandidates.jsx  —  /welcome
   Pixel-perfect Flowmingo "for candidates" landing page.
   Uses a scoped .fmc CSS class so Tailwind's 14 px floor
   never fires on this page.
   ============================================================ */
import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import api from "../api/client.js";

/* ───── colours ─────────────────────────────────────────────── */
const O  = "#FF9022";          // orange light
const O2 = "#F2560A";          // orange mid
const O3 = "#E0330C";          // orange dark
const BK = "#17130E";          // near-black
const WM = "#8A8177";          // warm muted
const BG_DARK = "#0B0A09";

/* ───── page-scoped CSS ─────────────────────────────────────── */
const CSS = `
.fmc *{box-sizing:border-box;margin:0;padding:0;}
.fmc{
  font-family:-apple-system,BlinkMacSystemFont,"SF Pro Text","Helvetica Neue",Arial,sans-serif;
  color:${BK};background:#fff;
}
.fmc h1,.fmc h2,.fmc h3,.fmc h4{
  font-family:-apple-system,BlinkMacSystemFont,"SF Pro Display","Helvetica Neue",Arial,sans-serif;
  letter-spacing:-0.04em;line-height:1.06;font-weight:normal;
}

/* ── size helpers (override Tailwind 14px floor) ── */
.fmc .s10{font-size:10px!important;line-height:1.4;}
.fmc .s11{font-size:11px!important;line-height:1.4;}
.fmc .s12{font-size:12px!important;line-height:1.5;}
.fmc .s13{font-size:13px!important;line-height:1.5;}
.fmc .s14{font-size:14px!important;line-height:1.6;}
.fmc .s145{font-size:14.5px!important;line-height:1.55;}
.fmc .s15{font-size:15px!important;line-height:1.55;}
.fmc .s16{font-size:16px!important;line-height:1.6;}
.fmc .s21{font-size:21px!important;line-height:1.3;}
.fmc .s26{font-size:26px!important;line-height:1.2;}
.fmc .s30{font-size:30px!important;line-height:1.08;}
.fmc .s36{font-size:36px!important;line-height:1.06;}
.fmc .s40{font-size:40px!important;line-height:1.06;}
.fmc .s42{font-size:42px!important;line-height:1.02;}
.fmc .s54{font-size:54px!important;line-height:1.04;}
.fmc .s60{font-size:60px!important;line-height:1.02;}

/* ── header ── */
.fmc-hdr{
  position:fixed;inset:0 0 auto 0;z-index:100;
  background:rgba(255,255,255,0.96);
  backdrop-filter:saturate(140%) blur(18px);
  box-shadow:rgba(23,19,14,0.1) 0 -1px 0 inset,rgba(23,19,14,0.4) 0 14px 36px -30px;
}
.fmc-hdr-inner{
  max-width:1200px;margin:0 auto;height:60px;
  display:flex;align-items:center;gap:16px;padding:0 20px;
  position:relative;
}
.fmc-logo{text-decoration:none;display:inline-flex;align-items:center;}
.fmc-logo span{font-size:20px;font-weight:800;letter-spacing:-0.03em;}
.fmc-logo .lo{color:${O2};}
.fmc-logo .lk{color:${BK};}

/* candidates chip */
.fmc-cands{
  display:inline-flex;align-items:center;background:rgba(0,0,0,0.06);
  border-radius:999px;height:26px;padding:0 4px;
}
.fmc-cands button{
  display:flex;align-items:center;gap:5px;height:100%;border:none;
  background:transparent;border-radius:999px;padding:0 10px;cursor:pointer;
}

/* center nav */
.fmc-nav{
  position:absolute;left:50%;transform:translateX(-50%);
  display:flex;align-items:center;gap:2px;
}
.fmc-nav a,.fmc-nav button{
  display:flex;align-items:center;height:36px;border-radius:999px;
  padding:0 14px;color:${BK};text-decoration:none;border:none;
  background:transparent;cursor:pointer;font-weight:400;
  transition:background .2s;
}
.fmc-nav a:hover,.fmc-nav button:hover{background:rgba(0,0,0,0.05);}

/* right CTA "Let the job find me" */
.fmc-cta-pill{
  display:inline-flex;align-items:center;justify-content:center;
  height:44px;border-radius:999px;padding:0 6px 0 16px;
  background:${BK};color:#fff;text-decoration:none;border:none;cursor:pointer;
  gap:8px;font-weight:500;
  transition:transform .4s cubic-bezier(.32,.72,0,1),opacity .3s;
}
.fmc-cta-pill:hover{transform:translateY(-1px);}
.fmc-cta-pill .chip{
  display:flex;align-items:center;justify-content:center;
  width:32px;height:32px;border-radius:999px;
  background:rgba(255,255,255,0.14);flex-shrink:0;
}

/* ── hero ── */
.fmc-hero{
  position:relative;overflow:hidden;padding:144px 24px 96px;
  background:${BG_DARK};
}
.fmc-hero-bg{
  position:absolute;inset:0;
  background:
    linear-gradient(180deg,rgba(11,10,9,0.72) 0%,rgba(11,10,9,0.55) 40%,rgba(11,10,9,0.5) 68%,rgba(11,10,9,0.7) 100%),
    linear-gradient(118deg,rgba(224,51,12,0) 34%,rgba(242,86,10,0.26) 100%),
    linear-gradient(90deg,rgba(11,10,9,0.45) 0%,rgba(11,10,9,0.22) 34%,rgba(11,10,9,0) 58%),
    url('https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=1920&q=80') center/cover no-repeat;
}
.fmc-hero-inner{max-width:1120px;margin:0 auto;position:relative;}
.fmc-hero-grid{display:grid;grid-template-columns:.88fr 1.12fr;gap:48px;align-items:center;}

/* hero h1 gradient text */
.fmc-h1-grad{
  display:block;
  background:linear-gradient(100deg,${O} 0%,${O2} 55%,${O3} 100%);
  -webkit-background-clip:text;-webkit-text-fill-color:transparent;
  background-clip:text;padding-bottom:.04em;
}

/* hero primary btn (white) */
.fmc-btn-white{
  display:inline-flex;align-items:center;justify-content:center;
  height:54px;border-radius:999px;padding:12px 12px 12px 28px;
  background:#fff;color:${BK};text-decoration:none;border:none;cursor:pointer;
  font-weight:600;font-size:15px;gap:0;
  box-shadow:0 1px 2px rgba(23,19,14,.06),0 8px 24px -16px rgba(23,19,14,.35);
  transition:transform .5s cubic-bezier(.32,.72,0,1),background .5s;
}
.fmc-btn-white:hover{background:#F7F6F4;transform:translateY(-1px);}
.fmc-btn-white .chip{
  display:flex;align-items:center;justify-content:center;
  width:32px;height:32px;border-radius:999px;
  background:rgba(0,0,0,0.07);margin-left:12px;flex-shrink:0;
}

/* laptop mockup */
.fmc-laptop{padding:0 6%;}
.fmc-laptop-body{
  position:relative;border-radius:14px 14px 4px 4px;
  background:#101013;padding:2.6% 1.8% 1.8%;
  box-shadow:0 50px 100px -30px rgba(0,0,0,.7);
}
.fmc-laptop-dot{
  position:absolute;top:1.1%;left:50%;transform:translateX(-50%);
  width:4px;height:4px;border-radius:50%;background:#2a2a2e;
}
.fmc-laptop-screen{border-radius:6px;overflow:hidden;}
.fmc-laptop-base{
  position:relative;margin:0 -6.5%;height:15px;
  border-radius:0 0 12px 12px;
  background:linear-gradient(180deg,#E7E8EC 0%,#C9CBD1 55%,#9EA0A6 100%);
  box-shadow:0 18px 40px -18px rgba(0,0,0,.55);
}
.fmc-laptop-notch{
  position:absolute;left:50%;top:0;transform:translateX(-50%);
  width:13%;height:6px;border-radius:0 0 8px 8px;
  background:linear-gradient(180deg,#A9ABB1,#C6C8CE);
}

/* ── trust bar ── */
.fmc-trust{
  border-top:1px solid rgba(0,0,0,.07);
  border-bottom:1px solid rgba(0,0,0,.07);
  background:#FAF9F7;padding:40px 24px;
}
.fmc-trust-inner{
  max-width:1120px;margin:0 auto;
  display:flex;flex-wrap:wrap;align-items:center;
  justify-content:center;gap:20px 36px;
}

/* ── features ── */
.fmc-feat{position:relative;overflow:hidden;background:#fff;padding:112px 24px 96px;}
.fmc-feat-glow1{
  position:absolute;top:-35%;left:-8%;width:560px;height:560px;
  border-radius:50%;filter:blur(110px);pointer-events:none;
  background:radial-gradient(circle,rgba(242,86,10,.10),transparent 68%);
}
.fmc-feat-glow2{
  position:absolute;bottom:-40%;right:-6%;width:520px;height:520px;
  border-radius:50%;filter:blur(120px);pointer-events:none;
  background:radial-gradient(circle,rgba(255,183,77,.08),transparent 68%);
}
.fmc-feat-grid{
  display:grid;grid-template-columns:repeat(3,1fr);gap:20px;margin-top:48px;
}
.fmc-feat-card{
  position:relative;display:block;overflow:hidden;border-radius:22px;
  min-height:380px;text-decoration:none;
  transition:transform .5s cubic-bezier(.32,.72,0,1);
}
.fmc-feat-card:hover{transform:translateY(-6px);}
.fmc-feat-card img{
  position:absolute;inset:0;width:100%;height:100%;object-fit:cover;
  transition:transform .7s cubic-bezier(.32,.72,0,1);
}
.fmc-feat-card:hover img{transform:scale(1.04);}
.fmc-feat-card-ov{
  position:absolute;inset:0;
  background:linear-gradient(180deg,rgba(11,10,9,.38) 0%,rgba(11,10,9,.18) 40%,rgba(11,10,9,.78) 100%);
}
.fmc-feat-card-body{
  position:relative;display:flex;flex-direction:column;
  justify-content:flex-end;height:100%;min-height:380px;padding:28px;
}
.fmc-feat-badge{
  display:inline-flex;align-items:center;border-radius:999px;
  padding:6px 14px;margin-top:20px;width:fit-content;
  box-shadow:0 0 0 1px rgba(255,255,255,.40) inset;color:#fff;font-weight:600;
}

/* ── walk / sticky feature ── */
.fmc-walk{position:relative;background:${BG_DARK};}
.fmc-walk-sticky{
  position:sticky;top:0;min-height:100vh;overflow:hidden;
  display:flex;align-items:center;justify-content:center;
}
.fmc-walk-bg{position:absolute;inset:0;}
.fmc-walk-content{position:relative;width:100%;max-width:1000px;margin:0 auto;padding:80px 24px;text-align:center;}

/* pill tabs */
.fmc-tab{
  display:inline-flex;align-items:center;gap:8px;
  border-radius:999px;padding:10px 20px;text-decoration:none;
  border:none;cursor:pointer;font-weight:500;
  transition:background .3s,color .3s;
}
.fmc-tab-active{background:#fff;color:${BK};}
.fmc-tab-inactive{background:rgba(255,255,255,.10);color:rgba(255,255,255,.70);}
.fmc-tab-dot-active{width:6px;height:6px;border-radius:50%;background:${O2};flex-shrink:0;}
.fmc-tab-dot-inactive{width:6px;height:6px;border-radius:50%;background:rgba(255,255,255,.30);flex-shrink:0;}

/* ghost pill (border) */
.fmc-btn-ghost{
  display:inline-flex;align-items:center;gap:6px;
  border-radius:999px;border:1px solid rgba(255,255,255,.20);
  padding:10px 20px;color:rgba(255,255,255,.80);text-decoration:none;
  font-weight:500;background:transparent;cursor:pointer;
  transition:background .2s;
}
.fmc-btn-ghost:hover{background:rgba(255,255,255,.10);}

/* mockup card */
.fmc-mock{
  background:#fff;border-radius:20px;padding:20px;
  box-shadow:0 40px 100px -40px rgba(0,0,0,.8);
  overflow:hidden;text-align:left;
}

/* ── jobs section ── */
.fmc-jobs{
  position:relative;overflow:hidden;
  border-top:1px solid #DADADC;border-bottom:1px solid #DADADC;
  background:#F8F8F9;padding:80px 24px;
}
.fmc-marquee-wrap{
  overflow:hidden;
  -webkit-mask-image:linear-gradient(90deg,transparent,#000 10%,#000 90%,transparent);
  mask-image:linear-gradient(90deg,transparent,#000 10%,#000 90%,transparent);
}
.fmc-marquee-track{
  display:flex;gap:12px;width:max-content;
  animation:marquee 50s linear infinite;
}
.fmc-marquee-wrap:hover .fmc-marquee-track{animation-play-state:paused;}
@keyframes marquee{from{transform:translateX(0)}to{transform:translateX(-50%)}}
.fmc-company-pill{
  display:inline-flex;align-items:center;gap:10px;white-space:nowrap;
  border-radius:16px;border:1px solid rgba(0,0,0,.07);background:#fff;
  padding:10px 16px;box-shadow:0 1px 3px rgba(0,0,0,.04);flex-shrink:0;
}
.fmc-company-logo{
  width:28px;height:28px;border-radius:10px;overflow:hidden;background:#fff;
  box-shadow:0 0 0 1px rgba(0,0,0,.06);display:flex;align-items:center;
  justify-content:center;flex-shrink:0;
}
.fmc-company-logo img{width:100%;height:100%;object-fit:contain;padding:2px;}
.fmc-company-init{
  width:28px;height:28px;border-radius:10px;background:${BK};
  display:flex;align-items:center;justify-content:center;
  color:#fff;font-size:11px;font-weight:700;flex-shrink:0;
}
.fmc-chip-industry{
  border-radius:999px;background:rgba(0,0,0,.04);
  padding:8px 16px;text-decoration:none;color:${BK};
  transition:background .2s,color .2s;
}
.fmc-chip-industry:hover{background:rgba(226,78,18,.10);color:#C7430F;}
.fmc-jobs-grid{
  display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-top:32px;
}
.fmc-job-card{
  display:flex;flex-direction:column;border-radius:16px;
  border:1px solid rgba(0,0,0,.07);background:#fff;padding:20px;
  text-decoration:none;color:${BK};height:100%;
  transition:transform .3s,box-shadow .3s;
}
.fmc-job-card:hover{transform:translateY(-4px);box-shadow:0 16px 40px -12px rgba(0,0,0,.14);}
.fmc-job-init{
  width:40px;height:40px;border-radius:10px;background:${BK};
  display:flex;align-items:center;justify-content:center;
  color:#fff;flex-shrink:0;font-weight:600;
}
.fmc-btn-view-all{
  display:inline-flex;align-items:center;justify-content:center;
  height:54px;border-radius:999px;padding:0 32px;
  background:rgba(0,0,0,.06);color:${BK};text-decoration:none;
  font-weight:600;border:none;cursor:pointer;margin-top:36px;
  transition:background .2s;
}
.fmc-btn-view-all:hover{background:rgba(0,0,0,.10);}

/* ── how section ── */
.fmc-how{position:relative;overflow:hidden;background:${BG_DARK};padding:64px 24px 128px;}
.fmc-step{
  display:flex;align-items:baseline;gap:36px;
  border-top:1px solid rgba(255,255,255,.10);padding:28px 0;
  transition:color .3s;
}
.fmc-step:last-child{border-bottom:1px solid rgba(255,255,255,.10);}
.fmc-step-num{
  width:72px;flex-shrink:0;font-size:64px;font-weight:300;
  letter-spacing:-0.04em;line-height:1;color:rgba(255,255,255,.22);
  transition:color .5s,-webkit-text-fill-color .5s;
}
.fmc-step:hover .fmc-step-num{
  background:linear-gradient(100deg,${O} 0%,${O2} 55%,${O3} 100%);
  -webkit-background-clip:text;-webkit-text-fill-color:transparent;
  background-clip:text;
}

/* ── FAQ ── */
.fmc-faq{background:${BG_DARK};padding:64px 24px 112px;}
.fmc-faq-item{border-top:1px solid rgba(255,255,255,.12);}
.fmc-faq-item:last-child{border-bottom:1px solid rgba(255,255,255,.12);}
.fmc-faq-q{
  width:100%;display:flex;align-items:center;justify-content:space-between;
  gap:24px;padding:32px 0;border:none;background:transparent;
  cursor:pointer;text-align:left;color:#fff;
}
.fmc-faq-plus{
  flex-shrink:0;color:rgba(255,255,255,.80);
  transition:transform .3s;
}
.fmc-faq-plus.open{transform:rotate(45deg);}
.fmc-faq-a{
  padding-bottom:36px;color:rgba(255,255,255,.62);
  max-width:74ch;line-height:1.62;
}

/* ── closing CTA ── */
.fmc-closing{background:#fff;padding:10px;}
.fmc-closing-inner{
  position:relative;isolation:isolate;overflow:hidden;
  border-radius:26px;background:${BK};padding:64px 24px 144px;
  text-align:center;
}
.fmc-glow-bottom{
  position:absolute;bottom:-70%;left:-10%;right:-10%;height:140%;
  background:radial-gradient(42% 55% at 50% 92%,rgba(255,144,34,.45) 0%,transparent 70%);
  pointer-events:none;
}
.fmc-line-bottom{
  position:absolute;bottom:0;left:0;right:0;height:2px;
  background:linear-gradient(90deg,transparent 12%,rgba(255,144,34,.75) 50%,transparent 88%);
  pointer-events:none;
}

/* ── footer ── */
.fmc-footer{border-top:1px solid #DADADC;background:#F3F4F6;padding:56px 24px 32px;}
.fmc-footer-grid{
  max-width:1180px;margin:0 auto;
  display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:40px;
}
.fmc-footer-logo span{font-size:20px;font-weight:800;letter-spacing:-0.03em;}
.fmc-footer-ul{list-style:none;margin-top:12px;display:flex;flex-direction:column;gap:8px;}
.fmc-footer-ul a{text-decoration:none;color:#736C64;transition:color .2s;}
.fmc-footer-ul a:hover{color:${BK};}
.fmc-footer-cta{
  display:inline-flex;align-items:center;justify-content:center;
  height:44px;border-radius:999px;background:${BK};
  padding:0 20px;color:#fff;text-decoration:none;
  font-weight:600;margin-top:16px;border:none;cursor:pointer;
  transition:background .2s;
}
.fmc-footer-cta:hover{background:#000;}
.fmc-footer-bottom{
  max-width:1180px;margin:40px auto 0;
  display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;
  gap:8px 20px;border-top:1px solid #DADADC;padding-top:24px;
}

/* ── reveal animation ── */
@keyframes fcReveal{from{opacity:0;transform:translateY(40px);}to{opacity:1;transform:translateY(0);}}
.fmc-reveal{animation:fcReveal .7s cubic-bezier(.22,1,.36,1) both;}

/* ── ping dot ── */
@keyframes fcPing{75%,100%{transform:scale(2);opacity:0;}}
.fmc-ping{animation:fcPing 1.4s cubic-bezier(0,0,.2,1) infinite;}

/* ── scrollbar none ── */
.fmc ::-webkit-scrollbar{display:none;}
`;

/* ── tiny SVG helpers ── */
const Chevron = ({ size = 12, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color}
    strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="m6 9 6 6 6-6" />
  </svg>
);
const ArrowDiag = ({ size = 13, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color}
    strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M7 17 17 7M9 7h8v8" />
  </svg>
);
const ArrowRight = ({ size = 14, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color}
    strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5 12h14m0 0-6-6m6 6-6 6" />
  </svg>
);
const Plus = ({ size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="1.4" strokeLinecap="round" aria-hidden="true">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);
const Shield = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);
const USFlagSVG = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 513 342"
    style={{ width: "100%", height: "100%", objectFit: "cover" }}>
    <path fill="#FFF" d="M0 0h513v342H0z" />
    <path d="M0 0h513v26.3H0zm0 52.6h513v26.3H0zm0 52.6h513v26.3H0zm0 52.6h513v26.3H0zm0 52.7h513v26.3H0zm0 52.6h513v26.3H0zm0 52.6h513V342H0z" fill="#D80027" />
    <path fill="#2E52B2" d="M0 0h256.5v184.1H0z" />
    <path d="m47.8 138.9-4-12.8-4.4 12.8H26.2l10.7 7.7-4 12.8 10.9-7.9 10.6 7.9-4.1-12.8 10.9-7.7zm56.3 0-4.1-12.8-4.2 12.8H82.6l10.7 7.7-4 12.8 10.7-7.9 10.8 7.9-4-12.8 10.7-7.7zm56.5 0-4.3-12.8-4 12.8h-13.5l11 7.7-4.2 12.8 10.7-7.9 11 7.9-4.2-12.8 10.7-7.7zm56.2 0-4-12.8-4.2 12.8h-13.3l10.8 7.7-4 12.8 10.7-7.9 10.8 7.9-4.3-12.8 11-7.7zM100 75.3l-4.2 12.8H82.6L93.3 96l-4 12.6 10.7-7.8 10.8 7.8-4-12.6 10.7-7.9h-13.4zm-56.2 0-4.4 12.8H26.2L36.9 96l-4 12.6 10.9-7.8 10.6 7.8L50.3 96l10.9-7.9H47.8zm112.5 0-4 12.8h-13.5l11 7.9-4.2 12.6 10.7-7.8 11 7.8-4.2-12.6 10.7-7.9h-13.2zm56.5 0-4.2 12.8h-13.3l10.8 7.9-4 12.6 10.7-7.8 10.8 7.8-4.3-12.6 11-7.9h-13.5zm-169-50.6-4.4 12.6H26.2l10.7 7.9-4 12.7L43.8 50l10.6 7.9-4.1-12.7 10.9-7.9H47.8zm56.2 0-4.2 12.6H82.6l10.7 7.9-4 12.7L100 50l10.8 7.9-4-12.7 10.7-7.9h-13.4zm56.3 0-4 12.6h-13.5l11 7.9-4.2 12.7 10.7-7.9 11 7.9-4.2-12.7 10.7-7.9h-13.2zm56.5 0-4.2 12.6h-13.3l10.8 7.9-4 12.7 10.7-7.9 10.8 7.9-4.3-12.7 11-7.9h-13.5z" fill="#FFF" />
  </svg>
);

/* ── initials helper ── */
function ini(name) {
  return String(name || "?").trim().split(/\s+/).slice(0, 2).map(w => w[0]).join("").toUpperCase();
}

/* ══════════════════════════════════════════════════════════════
   NAVBAR
═══════════════════════════════════════════════════════════════ */
function Navbar() {
  return (
    <header className="fmc-hdr">
      <div className="fmc-hdr-inner">
        {/* Logo */}
        <Link to="/" className="fmc-logo">
          <span><span className="lo">Aptus</span><span className="lk">Hire</span></span>
        </Link>

        {/* Candidates chip */}
        <span className="fmc-cands">
          <button>
            <span className="s10" style={{ fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: BK }}>Candidates</span>
            <Chevron size={9} />
          </button>
        </span>

        {/* Center nav */}
        <nav className="fmc-nav">
          <button className="s145">What you get <Chevron size={12} color={WM} /></button>
          <Link to="/jobs" className="s145">Jobs</Link>
          <a href="#how" className="s145">How it works</a>
        </nav>

        {/* Right */}
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 12 }}>
          {/* Flag */}
          <button aria-label="Language"
            style={{ width: 32, height: 32, borderRadius: "50%", overflow: "hidden", border: "none", cursor: "pointer", boxShadow: "0 0 0 1px rgba(0,0,0,.10)", flexShrink: 0, padding: 0 }}>
            <USFlagSVG />
          </button>
          {/* CTA */}
          <Link to="/register" className="fmc-cta-pill s135"
            style={{ fontSize: 13.5 }}>
            <span style={{ whiteSpace: "nowrap" }}>Let the job find me</span>
            <span className="chip">
              <ArrowDiag size={14} color="#fff" />
            </span>
          </Link>
        </div>
      </div>
    </header>
  );
}

/* ══════════════════════════════════════════════════════════════
   HERO
═══════════════════════════════════════════════════════════════ */
function Hero({ jobCount }) {
  return (
    <section className="fmc-hero">
      <div className="fmc-hero-bg" />
      <div className="fmc-hero-inner">
        <div className="fmc-hero-grid">
          {/* left */}
          <div className="fmc-reveal">
            <span style={{ display: "inline-flex", alignItems: "center", gap: 8, borderRadius: 999, background: "rgba(255,255,255,.10)", padding: "6px 14px" }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: O2, flexShrink: 0 }} />
              <span className="s11" style={{ fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(255,255,255,.75)" }}>For candidates · free forever</span>
            </span>

            <h1 className="s42" style={{ marginTop: 24, fontWeight: 300, color: "#fff", letterSpacing: "-0.055em", lineHeight: 1.02 }}>
              Jobs that fit you,{" "}
              <span className="fmc-h1-grad s42" style={{ fontWeight: 300, lineHeight: 1.02 }}>find you.</span>
            </h1>

            <p className="s16" style={{ marginTop: 24, maxWidth: 460, color: "rgba(255,255,255,.60)", lineHeight: 1.6 }}>
              Upload your CV once. AptusHire matches it to open jobs, and the hiring companies come to you — automatically. Free forever.
            </p>

            <div style={{ marginTop: 36, display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 12 }}>
              <Link to="/register" className="fmc-btn-white">
                Let the job find me
                <span className="chip"><ArrowDiag size={13} /></span>
              </Link>
            </div>

            <a href="#jobs"
              style={{ marginTop: 16, display: "inline-flex", alignItems: "center", gap: 6, fontSize: 14, fontWeight: 500, color: "rgba(255,255,255,.55)", textDecoration: "underline", textUnderlineOffset: 4 }}>
              or just browse {(jobCount || 13542).toLocaleString()} jobs
            </a>

            <p className="s13" style={{ marginTop: 16, color: "rgba(255,255,255,.60)" }}>
              Your CV is never public, never sold, and nobody can search for you. One switch turns everything off.
            </p>
          </div>

          {/* right — laptop */}
          <div className="fmc-reveal fmc-laptop">
            <div className="fmc-laptop-body">
              <div className="fmc-laptop-dot" />
              <div className="fmc-laptop-screen">
                {/* portal mockup */}
                <div style={{ background: "#f5f6f8", padding: "0 0 8px" }}>
                  {/* portal header */}
                  <div style={{ background: "#fff", borderBottom: "1px solid #e8e8ed", padding: "10px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#E85A1A" }}>AptusHire</span>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 10, color: "#64748B" }}>🔔</span>
                      <span style={{ fontSize: 10, color: "#64748B", border: "1px solid #e0e0e0", borderRadius: 4, padding: "1px 6px" }}>🇺🇸 English</span>
                      <span style={{ width: 24, height: 24, borderRadius: "50%", background: "#FEF3E8", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, color: "#F97316" }}>U</span>
                    </div>
                  </div>
                  {/* sidebar + content */}
                  <div style={{ display: "flex", minHeight: 180 }}>
                    {/* sidebar */}
                    <div style={{ width: 130, background: "#fff", borderRight: "1px solid #e8e8ed", padding: "12px 0", flexShrink: 0 }}>
                      <div style={{ padding: "6px 12px", fontSize: 10, color: "#64748B" }}>Welcome!</div>
                      {["Private Introduction", "Proactive Outreach", "Recommended_ 33", "CV Evaluation", "Job Preferences", "Applied Jobs", "Past Assessments"].map((item, i) => (
                        <div key={i} style={{
                          padding: "6px 12px", fontSize: 10, color: i === 2 ? "#E85A1A" : "#64748B",
                          background: i === 2 ? "rgba(232,90,26,.06)" : "transparent",
                          display: "flex", alignItems: "center", gap: 6
                        }}>
                          <span style={{ width: 12, height: 12, borderRadius: 3, background: i === 2 ? "#FEF3E8" : "#f0f0f0", flexShrink: 0 }} />
                          {item}
                          {i === 2 && <span style={{ marginLeft: "auto", fontSize: 9, background: "#FEF3E8", color: "#F97316", padding: "1px 4px", borderRadius: 999 }}>+2 New</span>}
                        </div>
                      ))}
                    </div>
                    {/* main */}
                    <div style={{ flex: 1, padding: "14px 16px" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                        <div>
                          <span style={{ fontSize: 13, fontWeight: 700 }}>Recommended Jobs</span>
                          <span style={{ fontSize: 10, color: "#F97316", marginLeft: 6, background: "#FEF3E8", padding: "1px 6px", borderRadius: 999 }}>33 Jobs</span>
                          <span style={{ fontSize: 10, color: "#64748B", marginLeft: 4 }}>+4 New</span>
                        </div>
                        <span style={{ fontSize: 10, color: "#64748B", border: "1px solid #e0e0e0", borderRadius: 4, padding: "2px 8px" }}>Search</span>
                      </div>
                      <div style={{ fontSize: 10, color: "#64748B", marginBottom: 8 }}>Auto-apply to my strong matches</div>
                      <div style={{ fontSize: 10, fontWeight: 600, color: "#64748B", marginBottom: 4 }}>Top matches</div>
                      <div style={{ display: "flex", gap: 8 }}>
                        {/* left job item */}
                        <div style={{ flex: 1, border: "1px solid #e0e0e0", borderRadius: 8, padding: "8px", fontSize: 10 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <div style={{ width: 20, height: 20, borderRadius: 4, background: "#FEF3E8", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8, fontWeight: 700, color: "#F97316", flexShrink: 0 }}>M</div>
                            <div>
                              <div style={{ fontWeight: 600 }}>Senior Backend Engineer</div>
                              <div style={{ color: "#64748B" }}>New</div>
                              <div style={{ color: "#64748B" }}>Meridian Logistics</div>
                            </div>
                          </div>
                          <div style={{ marginTop: 4, color: "#64748B" }}>Ho Chi Minh · $1,500–$2,500</div>
                          <span style={{ fontSize: 9, background: "#FEF3E8", color: "#F97316", padding: "2px 6px", borderRadius: 999, marginTop: 4, display: "inline-block" }}>Strong match</span>
                        </div>
                        {/* right detail */}
                        <div style={{ flex: 1.2, border: "1px solid #e0e0e0", borderRadius: 8, padding: "8px", fontSize: 10 }}>
                          <div style={{ fontWeight: 700, marginBottom: 4 }}>Senior Backend Engineer</div>
                          <div style={{ display: "flex", gap: 12 }}>
                            <div><div style={{ color: "#94A3B8", fontSize: 9 }}>Salary</div><div style={{ fontWeight: 600 }}>$1,500–2,500</div></div>
                            <div><div style={{ color: "#94A3B8", fontSize: 9 }}>Workplace Type</div><div style={{ fontWeight: 600 }}>Hybrid</div></div>
                            <div><div style={{ color: "#94A3B8", fontSize: 9 }}>Employment type</div><div style={{ fontWeight: 600 }}>Full-time</div></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="fmc-laptop-base"><div className="fmc-laptop-notch" /></div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════════════════════
   TRUST BAR
═══════════════════════════════════════════════════════════════ */
function TrustBar() {
  const badges = [
    { label: "GDPR compliant", color: "#1A3A9F" },
    { label: "Google Cloud Security", color: "#4285F4" },
    { label: "CLOUDFLARE", color: "#F38020" },
    { label: "Microsoft for Startups", color: "#00A4EF" },
  ];
  return (
    <section className="fmc-trust">
      <div className="fmc-trust-inner">
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          <Shield />
          <span className="s11" style={{ fontWeight: 600, letterSpacing: "0.16em", textTransform: "uppercase", color: "#8A8177" }}>Security, compliance &amp; partners</span>
        </span>
        <span style={{ width: 1, height: 32, background: "rgba(0,0,0,.12)", flexShrink: 0 }} />
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "center", gap: "12px 36px" }}>
          {badges.map((b, i) => (
            <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: i > 0 ? 0 : 0 }}>
              {i > 0 && <span style={{ width: 1, height: 32, background: "rgba(0,0,0,.12)", marginRight: 36 }} />}
              <div style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid rgba(0,0,0,.08)", background: "#fff" }}>
                <span className="s11" style={{ fontWeight: 700, color: b.color, whiteSpace: "nowrap" }}>{b.label}</span>
              </div>
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════════════════════
   CHOOSE HOW — 3 image cards
═══════════════════════════════════════════════════════════════ */
const FEAT_CARDS = [
  {
    title: "Job hunting quietly",
    desc: "Companies contact you when a job matches. Nothing public, no emails.",
    badge: "Private Introduction",
    img: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800&q=80",
  },
  {
    title: "Job hunting actively",
    desc: "We email hiring managers for you. You read the email first.",
    badge: "Proactive Outreach",
    img: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=800&q=80",
  },
  {
    title: "Just browsing jobs",
    desc: "You read the jobs yourself. No emails, nothing switches on.",
    badge: "Jobs & tracker",
    img: "https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=800&q=80",
  },
];

function ChooseSection() {
  return (
    <section id="features" className="fmc-feat">
      <div className="fmc-feat-glow1" />
      <div className="fmc-feat-glow2" />
      <div style={{ maxWidth: 1120, margin: "0 auto", position: "relative" }}>
        <div className="fmc-reveal" style={{ textAlign: "center" }}>
          <h2 className="s40" style={{ fontWeight: 400, color: BK }}>Choose how the job finds you.</h2>
          <p className="s16" style={{ marginTop: 12, maxWidth: 560, margin: "12px auto 0", color: WM, lineHeight: 1.6 }}>
            It depends on what you need. Are you job hunting quietly, actively — or just browsing? Nothing switches on until you pick one.
          </p>
        </div>

        <div className="fmc-feat-grid">
          {FEAT_CARDS.map((c, i) => (
            <a key={i} href={`#f-${i}`} className="fmc-feat-card fmc-reveal" style={{ animationDelay: `${i * 0.08}s` }}>
              <img src={c.img} alt="" />
              <div className="fmc-feat-card-ov" />
              <div className="fmc-feat-card-body">
                <span className="s26" style={{ display: "block", fontWeight: 500, letterSpacing: "-0.02em", color: "#fff" }}>{c.title}</span>
                <span className="s14" style={{ display: "block", marginTop: 10, color: "rgba(255,255,255,.75)", lineHeight: 1.6 }}>{c.desc}</span>
                <span className="fmc-feat-badge s12">{c.badge}</span>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════════════════════
   WALK — sticky scroll feature panels
═══════════════════════════════════════════════════════════════ */
const WALK_ITEMS = [
  {
    key: "intro",
    tab: "Job hunting quietly",
    title: "Your CV stays private. Matching companies come to you.",
    body: "There is no public profile and nobody can search for you. No email is ever sent from your name. A company sees your profile only when it has an open job that fits your CV — and you can turn it off any time.",
    ctaLabel: "Let companies find me",
    ctaHref: "/register",
    bg: "linear-gradient(135deg,#0d1a14 0%,#050f09 100%)",
    img: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=1920&q=80",
    mockup: (
      <div className="fmc-mock">
        <div style={{ display: "flex", alignItems: "center", gap: 12, paddingBottom: 12, borderBottom: "1px solid #f0f0f0" }}>
          <div style={{ width: 44, height: 44, borderRadius: 8, background: "#e8f4ed", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: "#F97316", flexShrink: 0 }}>ML</div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>Meridian Logistics</div>
            <div style={{ fontSize: 12, color: "#64748B" }}>Company · 200+ staff</div>
          </div>
        </div>
        <div style={{ padding: "12px 0", borderBottom: "1px solid #f0f0f0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>Backend Engineer</div>
            <div style={{ fontSize: 12, color: "#64748B" }}>1 open role</div>
          </div>
          <span style={{ fontSize: 11, fontWeight: 600, color: "#F97316", background: "#e8f4ed", padding: "3px 10px", borderRadius: 999 }}>Hiring now</span>
        </div>
        <div style={{ padding: "12px 0 8px" }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: "#64748B", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 10 }}>CANDIDATES</div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#e8f4ed", flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>Arjun R · Backend · 7 yrs</div>
              <div style={{ fontSize: 12, color: "#F97316" }}>Introduced by AptusHire</div>
            </div>
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#22c55e", marginLeft: "auto", flexShrink: 0 }} />
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 10, paddingTop: 10, borderTop: "1px solid #f0f0f0" }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: BK }}>Get discovered by joining our talent pool</div>
            <div style={{ fontSize: 11, color: "#64748B", marginTop: 3 }}>Only companies hiring your role can see you — never a public list, never your current employer.</div>
          </div>
          <div style={{ width: 40, height: 22, borderRadius: 999, background: "#22c55e", position: "relative", flexShrink: 0, cursor: "pointer" }}>
            <div style={{ position: "absolute", right: 2, top: 2, width: 18, height: 18, borderRadius: "50%", background: "#fff" }} />
          </div>
        </div>
      </div>
    ),
  },
  {
    key: "outreach",
    tab: "Job hunting actively",
    title: "We email the hiring manager for you.",
    body: "The email goes to the manager hiring for the job, not to a general jobs address. You read it first, you set how many go out a day, then it runs without you.",
    ctaLabel: "Email companies for me",
    ctaHref: "/register",
    bg: "linear-gradient(135deg,#0d1020 0%,#050810 100%)",
    img: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=1920&q=80",
    mockup: (
      <div className="fmc-mock">
        <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>Proactive Outreach</div>
        <div style={{ background: "#f9fafb", borderRadius: 10, padding: 16, fontSize: 13, lineHeight: 1.65, color: "#374151" }}>
          <div style={{ fontWeight: 600, marginBottom: 8 }}>Subject: Senior Backend Engineer — Arjun R</div>
          <p>Hi Sarah,</p>
          <p style={{ marginTop: 8 }}>I noticed Meridian Logistics is hiring for a Backend Engineer. I have 7 years of Node.js and distributed systems experience, and I believe I'd be a strong fit for the role…</p>
          <p style={{ marginTop: 8, color: "#9ca3af", fontStyle: "italic" }}>[You read every email before it sends]</p>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12, paddingTop: 12, borderTop: "1px solid #f0f0f0" }}>
          <span style={{ fontSize: 12, color: "#64748B" }}>3 emails/day · You approve each one</span>
          <span style={{ fontSize: 12, color: "#22c55e", fontWeight: 600 }}>● Active</span>
        </div>
      </div>
    ),
  },
  {
    key: "apply",
    tab: "Just browsing jobs",
    title: "See what jobs exist. Nothing else happens.",
    body: "Read any job without signing up. Apply on your own when you want to, and every application you send stays in one list.",
    ctaLabel: "Show me the jobs",
    ctaHref: "/jobs",
    bg: "linear-gradient(135deg,#07101a 0%,#030810 100%)",
    img: "https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=1920&q=80",
    mockup: (
      <div className="fmc-mock">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <div>
            <span style={{ fontSize: 14, fontWeight: 700 }}>Recommended Jobs</span>
            <span style={{ fontSize: 11, color: "#F97316", marginLeft: 6, background: "#e8f4ed", padding: "2px 7px", borderRadius: 999 }}>33 Jobs</span>
            <span style={{ fontSize: 11, color: "#64748B", marginLeft: 4 }}>+4 New</span>
          </div>
        </div>
        <div style={{ fontSize: 12, color: "#64748B", marginBottom: 12 }}>Job opportunities matched to your profile. The door is open — apply with your CV.</div>
        {[
          { init: "M", title: "Senior Backend Engineer", company: "Meridian Logistics", loc: "Ho Chi Minh, Vietnam · $1,500–$2,500", badge: "Strong match" },
          { init: "C", title: "Full Stack Engineer", company: "Cephas Consultancy", loc: "Bengaluru · Full-time", badge: null },
        ].map((j, i) => (
          <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 0", borderTop: "1px solid #f5f5f5" }}>
            <div style={{ width: 32, height: 32, borderRadius: 7, background: "#e8f4ed", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "#F97316", flexShrink: 0 }}>{j.init}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{j.title}</div>
              <div style={{ fontSize: 12, color: "#64748B" }}>{j.company}</div>
              <div style={{ fontSize: 11, color: "#94A3B8" }}>{j.loc}</div>
            </div>
            {j.badge && <span style={{ fontSize: 10, fontWeight: 600, color: "#F97316", background: "#e8f4ed", padding: "2px 8px", borderRadius: 999, flexShrink: 0 }}>{j.badge}</span>}
          </div>
        ))}
      </div>
    ),
  },
];

function WalkSection() {
  const [active, setActive] = useState(0);
  const item = WALK_ITEMS[active];

  return (
    <div className="fmc-walk">
      <div className="fmc-walk-sticky">
        {/* bg photo */}
        <div className="fmc-walk-bg">
          <img src={item.img} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg,rgba(11,10,9,.78) 0%,rgba(11,10,9,.62) 40%,rgba(11,10,9,.6) 68%,rgba(11,10,9,.8) 100%)" }} />
        </div>

        <div className="fmc-walk-content">
          {/* tab pills */}
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "center", gap: 8 }}>
            {WALK_ITEMS.map((w, i) => (
              <button key={w.key} type="button" className={`fmc-tab s14 ${i === active ? "fmc-tab-active" : "fmc-tab-inactive"}`}
                onClick={() => setActive(i)}>
                <span className={i === active ? "fmc-tab-dot-active" : "fmc-tab-dot-inactive"} />
                {w.tab}
              </button>
            ))}
          </div>

          {/* content */}
          <div key={active} className="fmc-reveal" style={{ marginTop: 32 }}>
            <h3 style={{ fontSize: 38, fontWeight: 400, color: "#fff", maxWidth: 640, margin: "0 auto", letterSpacing: "-0.04em", lineHeight: 1.08 }}>
              {item.title}
            </h3>
            <p className="s14" style={{ marginTop: 12, maxWidth: 560, margin: "12px auto 0", color: "rgba(255,255,255,.70)", lineHeight: 1.65 }}>
              {item.body}
            </p>
            <div style={{ marginTop: 24, display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "center", gap: 16 }}>
              <Link to={item.ctaHref} className="fmc-btn-white" style={{ height: 44, fontSize: 14 }}>
                {item.ctaLabel}
              </Link>
              <a href="#jobs" className="fmc-btn-ghost s14">
                Read more <ArrowRight size={14} />
              </a>
            </div>
          </div>

          {/* mockup */}
          <div key={`m-${active}`} className="fmc-reveal"
            style={{ marginTop: 36, maxWidth: 880, margin: "36px auto 0", borderRadius: 20, overflow: "hidden", boxShadow: "0 40px 100px -40px rgba(0,0,0,.8)" }}>
            {item.mockup}
          </div>
        </div>
      </div>

      {/* spacer blocks so sticky panel has room to sit */}
      <div style={{ height: "15vh" }} />
      <div style={{ height: "70vh" }} />
      <div style={{ height: "70vh" }} />
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   JOBS SECTION
═══════════════════════════════════════════════════════════════ */
const INDUSTRY_CHIPS = [
  { label: "General Business", count: 1541 },
  { label: "Sales", count: 677 },
  { label: "Management", count: 556 },
  { label: "Project Management", count: 543 },
  { label: "Analyst", count: 528 },
  { label: "Product Management", count: 512 },
  { label: "Operations", count: 467 },
  { label: "Engineering", count: 383 },
];

function JobsSection({ jobs, companies, totalCount, newCount }) {
  return (
    <section id="jobs" className="fmc-jobs">
      {/* subtle bg */}
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 60% 40%,rgba(200,200,210,.20) 0%,transparent 55%)", pointerEvents: "none" }} />
      <div style={{ maxWidth: 1120, margin: "0 auto", position: "relative" }}>
        {/* header */}
        <div className="fmc-reveal">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ position: "relative", width: 10, height: 10, display: "inline-flex", flexShrink: 0 }}>
              <span className="fmc-ping" style={{ position: "absolute", inset: 0, borderRadius: "50%", background: O2, opacity: 0.6 }} />
              <span style={{ position: "relative", width: 10, height: 10, borderRadius: "50%", background: O2, display: "block" }} />
            </span>
            <span className="s12" style={{ fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: O2 }}>Live now</span>
          </div>
          <h2 className="s40" style={{ marginTop: 12, fontWeight: 400, color: BK }}>
            {(totalCount || 13542).toLocaleString()} <span>live roles</span>
            <span style={{ color: WM }}> open right now</span>
          </h2>
          <p className="s16" style={{ marginTop: 12, maxWidth: 470, color: WM, lineHeight: 1.6 }}>
            <strong style={{ fontWeight: 600, color: "#05A165" }}>+{newCount || 116}</strong> added this week. Free to read, no account.
          </p>
        </div>

        {/* marquee */}
        <div className="fmc-reveal fmc-marquee-wrap" style={{ marginTop: 32 }}>
          <div className="fmc-marquee-track">
            {[...companies, ...companies].map((c, i) => (
              <span key={i} className="fmc-company-pill">
                {c.logoPath
                  ? <span className="fmc-company-logo"><img src={c.logoPath} alt={c.name} /></span>
                  : <span className="fmc-company-init s11">{ini(c.name)}</span>
                }
                <span className="s13" style={{ fontWeight: 500, color: BK }}>{c.name}</span>
              </span>
            ))}
          </div>
        </div>

        {/* industry chips */}
        <div className="fmc-reveal" style={{ marginTop: 28, display: "flex", flexWrap: "wrap", gap: 8 }}>
          {INDUSTRY_CHIPS.map(c => (
            <Link key={c.label} to="/jobs" className="fmc-chip-industry s13" style={{ fontWeight: 500 }}>
              {c.label}<span style={{ marginLeft: 6, opacity: 0.5 }}>{c.count.toLocaleString()}</span>
            </Link>
          ))}
        </div>

        {/* job cards */}
        <div className="fmc-jobs-grid">
          {jobs.slice(0, 6).map(job => {
            const salary = job.salary || job.salaryRange || job.compensation;
            const logo = job.company?.logoPath;
            return (
              <Link key={job._id} to={`/jobs/${job.slug || job._id}`} className="fmc-job-card fmc-reveal">
                <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                  {logo
                    ? <span style={{ width: 40, height: 40, borderRadius: 10, overflow: "hidden", background: "#fff", boxShadow: "0 0 0 1px rgba(0,0,0,.06)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <img src={logo} alt={job.company?.name} style={{ width: "100%", height: "100%", objectFit: "contain", padding: 4 }} />
                      </span>
                    : <span className="fmc-job-init s17" style={{ fontSize: 16.8 }}>{ini(job.company?.name)}</span>
                  }
                  <div style={{ minWidth: 0 }}>
                    <p className="s15" style={{ fontWeight: 600, lineHeight: 1.35, color: BK }}>{job.title}</p>
                    <p className="s13" style={{ color: WM, marginTop: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{job.company?.name}</p>
                  </div>
                </div>
                {salary && <p style={{ marginTop: "auto", paddingTop: 16, fontSize: 13, fontWeight: 600, color: BK }}>{salary}</p>}
              </Link>
            );
          })}
        </div>

        <div className="fmc-reveal" style={{ textAlign: "left" }}>
          <Link to="/jobs" className="fmc-btn-view-all s15">
            View all {(totalCount || 13542).toLocaleString()} jobs
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════════════════════
   HOW TO START
═══════════════════════════════════════════════════════════════ */
const STEPS = [
  { n: "01", title: "Upload your CV", desc: "One file. We read it, so you never retype your CV into a form." },
  { n: "02", title: "Pick what happens", desc: "Finishing setup turns on the option you picked — only that one. One switch turns it off." },
  { n: "03", title: "Wait for replies", desc: "We email you when a company answers — no need to keep checking." },
];

function HowSection() {
  return (
    <section id="how" className="fmc-how">
      <div style={{ maxWidth: 1120, margin: "0 auto" }}>
        <div className="fmc-reveal">
          <p className="s12" style={{ fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "#FF9022" }}>How to start</p>
          <h2 className="s42" style={{ marginTop: 16, maxWidth: 720, fontWeight: 400, color: "#fff" }}>
            Job searching is exhausting. This part takes two minutes.
          </h2>
          <p className="s16" style={{ marginTop: 16, maxWidth: 560, color: "rgba(255,255,255,.55)", lineHeight: 1.6 }}>
            Set this up once. After that, a company that opens a job matching your CV can reach you without you searching for it. Not every CV matches an open job — it takes two minutes to find out.
          </p>
        </div>

        <div style={{ marginTop: 64 }}>
          {STEPS.map((s, i) => (
            <div key={i} className="fmc-step fmc-reveal" style={{ animationDelay: `${i * 0.08}s` }}>
              <span className="fmc-step-num">{s.n}</span>
              <div style={{ minWidth: 0 }}>
                <span className="s21" style={{ display: "block", fontWeight: 400, letterSpacing: "-0.02em", color: "#fff" }}>{s.title}</span>
                <p className="s14" style={{ marginTop: 6, maxWidth: 380, color: "rgba(255,255,255,.55)", lineHeight: 1.6 }}>{s.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="fmc-reveal" style={{ marginTop: 48, display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12 }}>
          <Link to="/register" className="fmc-btn-white" style={{ height: 54 }}>
            Let the job find me
            <span className="chip"><ArrowDiag size={13} /></span>
          </Link>
          <Link to="/resume" className="fmc-btn-ghost s13">Free CV Evaluation →</Link>
          <Link to="/interviews" className="fmc-btn-ghost s13">Practice an AI Interview →</Link>
        </div>
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════════════════════
   FAQ
═══════════════════════════════════════════════════════════════ */
const FAQS = [
  { q: "Can my employer see me?", a: "Private Introduction: no. Nothing public, nothing anyone can search, no email in your name — only a company with an open job that fits your CV can contact you. Proactive Outreach: yes, it can. You read the exact email before anything goes out, but we choose the receiving companies by job match — so it can reach your own employer if they are hiring your job. Job hunting quietly? Switch on the introduction and leave outreach off." },
  { q: "Do emails go out without me?", a: "Only with Proactive Outreach on. Private Introduction never sends anything. With outreach on, you read the exact email and set how many send a day; we interrupt you only when someone replies." },
  { q: "Is it really free?", a: "Yes. Uploading your CV, the matching, the introductions and the outreach are all free for candidates. Optional prep and career-feedback tools exist if you ever want them — nothing on this page needs them." },
  { q: "Do I need an account?", a: "To read a job posting, no. To let companies find you, or to send outreach, yes — that is where the switches live." },
  { q: "Can I turn it off?", a: "Any time, from one switch in your settings. Turning it off stops new introductions and new outreach." },
];

function FAQSection() {
  const [open, setOpen] = useState(0);
  return (
    <section className="fmc-faq">
      <div style={{ maxWidth: 1180, margin: "0 auto" }}>
        <div className="fmc-reveal">
          <p className="s15" style={{ fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,.55)" }}>Before you upload anything</p>
          <h2 className="s40" style={{ marginTop: 12, fontWeight: 400, color: "#fff" }}>The questions everyone asks.</h2>
        </div>

        <div style={{ marginTop: 48 }}>
          {FAQS.map((faq, i) => (
            <div key={i} className="fmc-faq-item fmc-reveal" style={{ animationDelay: `${i * 0.08}s` }}>
              <button className="fmc-faq-q" onClick={() => setOpen(open === i ? -1 : i)}>
                <span style={{ fontSize: "clamp(18px,1.62vw,24px)", fontWeight: 400, lineHeight: 1.3, letterSpacing: "-0.015em" }}>{faq.q}</span>
                <span className={`fmc-faq-plus${open === i ? " open" : ""}`}><Plus /></span>
              </button>
              {open === i && (
                <p className="fmc-faq-a" style={{ fontSize: "clamp(16px,1.32vw,18.5px)" }}>{faq.a}</p>
              )}
            </div>
          ))}
        </div>

        <div className="fmc-reveal" style={{ marginTop: 40, display: "flex", flexWrap: "wrap", alignItems: "center", gap: "8px 12px", borderTop: "1px solid rgba(255,255,255,.12)", paddingTop: 32, fontSize: 15 }}>
          <span style={{ color: "rgba(255,255,255,.62)" }}>Still have a question?</span>
          <a href="mailto:support@aptushiring.com" style={{ fontWeight: 600, color: "#fff", textDecoration: "underline", textUnderlineOffset: 4 }}>support@aptushiring.com</a>
          <span style={{ color: "rgba(255,255,255,.25)" }}>·</span>
          <a href="https://wa.me/" target="_blank" rel="noreferrer" style={{ fontWeight: 600, color: "#fff", textDecoration: "underline", textUnderlineOffset: 4 }}>WhatsApp</a>
        </div>

        <div className="fmc-reveal" style={{ marginTop: 48, display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ display: "inline-flex", flexWrap: "wrap", alignItems: "center", gap: "12px 16px", borderRadius: 14, padding: "12px 20px", background: "rgba(255,255,255,.90)" }}>
            {["GDPR", "Google Cloud", "Cloudflare", "Microsoft for Startups"].map(b => (
              <span key={b} className="s11" style={{ fontWeight: 700, color: "#374151" }}>{b}</span>
            ))}
          </div>
          <p className="s12" style={{ color: "rgba(255,255,255,.60)", maxWidth: 520, lineHeight: 1.65 }}>
            Built by AptusHire. Data on Google Cloud under GDPR terms.{" "}
            <a href="/privacy" style={{ textDecoration: "underline", textUnderlineOffset: 2, color: "rgba(255,255,255,.70)" }}>Privacy</a>
            {" · "}
            <a href="/terms" style={{ textDecoration: "underline", textUnderlineOffset: 2, color: "rgba(255,255,255,.70)" }}>Terms</a>
          </p>
        </div>
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════════════════════
   CLOSING CTA
═══════════════════════════════════════════════════════════════ */
function ClosingCTA() {
  return (
    <section className="fmc-closing">
      <div className="fmc-closing-inner">
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg,#2a1a0e 0%,#17130E 50%,#0d0a07 100%)" }} />
        <div style={{ position: "absolute", inset: 0, background: "url('https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=1920&q=80') center/cover no-repeat", opacity: 0.35 }} />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg,rgba(23,19,14,.40) 0%,rgba(23,19,14,.24) 55%,rgba(23,19,14,.56) 100%)" }} />
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(52% 92% at 50% 50%,rgba(23,19,14,.84) 0%,rgba(23,19,14,.66) 50%,rgba(23,19,14,.28) 76%,transparent 92%)" }} />
        <div className="fmc-glow-bottom" />
        <div className="fmc-line-bottom" />
        <div className="fmc-reveal" style={{ position: "relative", maxWidth: 860, margin: "0 auto" }}>
          <h2 className="s54" style={{ fontWeight: 400, color: "#fff" }}>One CV. The companies come to you.</h2>
          <div style={{ marginTop: 36, display: "flex", justifyContent: "center" }}>
            <Link to="/register" className="fmc-btn-white" style={{ height: 54 }}>
              Let the job find me
              <span className="chip"><ArrowDiag size={13} /></span>
            </Link>
          </div>
          <p className="s12" style={{ marginTop: 16, color: "rgba(255,255,255,.60)" }}>Free, always — pause or leave any time.</p>
        </div>
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════════════════════
   FOOTER
═══════════════════════════════════════════════════════════════ */
function Footer() {
  return (
    <footer className="fmc-footer">
      <div className="fmc-footer-grid">
        {/* brand */}
        <div>
          <div className="fmc-footer-logo">
            <span><span style={{ color: O2 }}>Aptus</span><span style={{ color: BK }}>Hire</span></span>
          </div>
          <p className="s14" style={{ marginTop: 12, maxWidth: 260, color: "#736C64", lineHeight: 1.6 }}>
            Upload your CV once. Companies with a matching role come to you. Free for candidates, always.
          </p>
          <Link to="/register" className="fmc-footer-cta s14">Let the job find me</Link>
        </div>

        {/* for candidates */}
        <div>
          <p className="s14" style={{ fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: BK }}>For candidates</p>
          <ul className="fmc-footer-ul">
            {["Browse all jobs", "We email hiring managers", "Companies find you", "Practice an AI Interview", "Free CV check", "See a sample report", "FAQ"].map(l => (
              <li key={l}><Link to="/jobs" className="s14">{l}</Link></li>
            ))}
          </ul>
        </div>

        {/* your account */}
        <div>
          <p className="s14" style={{ fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: BK }}>Your account</p>
          <ul className="fmc-footer-ul">
            {["Private Introduction", "Proactive Outreach", "Recommended jobs", "Track your applications", "Job preferences", "Sign in"].map(l => (
              <li key={l}><Link to="/dashboard" className="s14">{l}</Link></li>
            ))}
          </ul>
        </div>

        {/* help */}
        <div>
          <p className="s14" style={{ fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: BK }}>Help</p>
          <ul className="fmc-footer-ul">
            <li><a href="mailto:support@aptushiring.com" className="s14">support@aptushiring.com</a></li>
            <li><a href="https://wa.me/" className="s14">WhatsApp</a></li>
            <li><Link to="/" className="s14">Hiring? AptusHire for companies</Link></li>
          </ul>
        </div>
      </div>

      <div className="fmc-footer-bottom">
        <p className="s13" style={{ color: "#736C64" }}>© 2026 AptusHire. All rights reserved.</p>
        <div style={{ display: "flex", gap: 20 }}>
          <Link to="/privacy" className="s13" style={{ color: "#736C64", textDecoration: "none" }}>Privacy Policy</Link>
          <Link to="/terms" className="s13" style={{ color: "#736C64", textDecoration: "none" }}>Terms of Service</Link>
        </div>
      </div>
    </footer>
  );
}

/* ══════════════════════════════════════════════════════════════
   ROOT EXPORT
═══════════════════════════════════════════════════════════════ */
export default function ForCandidates() {
  const [jobs,      setJobs]      = useState([]);
  const [companies, setCompanies] = useState([]);
  const [total,     setTotal]     = useState(0);
  const [newCount,  setNewCount]  = useState(0);
  const location = useLocation();

  // Scroll to hash anchor on mount and whenever hash changes
  // e.g. /welcome#how, /welcome#jobs, /welcome#features
  useEffect(() => {
    const hash = location.hash; // e.g. "#how"
    if (!hash) return;
    // Small delay so the page has painted before we scroll
    const t = setTimeout(() => {
      const el = document.querySelector(hash);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 120);
    return () => clearTimeout(t);
  }, [location.hash]);

  useEffect(() => {
    api.get("/jobs/published").then(res => {
      if (!Array.isArray(res.data)) return;
      const list = res.data;
      setJobs(list);
      setTotal(list.length);
      const cutoff = Date.now() - 7 * 86400000;
      setNewCount(list.filter(j => new Date(j.createdAt || 0).getTime() > cutoff).length);
      const seen = new Map();
      list.forEach(j => { if (j.company?.name && !seen.has(j.company.name)) seen.set(j.company.name, j.company); });
      setCompanies([...seen.values()]);
    }).catch(() => {});
  }, []);

  return (
    <>
      <style>{CSS}</style>
      <div className="fmc" style={{ minHeight: "100vh" }}>
        <Navbar />
        <div style={{ paddingTop: 60 }}>
          <Hero jobCount={total} />
          <TrustBar />
          <ChooseSection />
          <WalkSection />
          <JobsSection jobs={jobs} companies={companies} totalCount={total} newCount={newCount} />
          <HowSection />
          <FAQSection />
          <ClosingCTA />
          <Footer />
        </div>
      </div>
    </>
  );
}
