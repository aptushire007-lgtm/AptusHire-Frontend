import { useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Sparkles,
  UploadCloud,
  Send,
  ScanSearch,
  Bot,
  MessageSquareText,
  ListChecks,
  Bell,
  Bookmark,
  Clock,
  ThumbsUp,
  Workflow,
  ShieldCheck,
  Video,
  DollarSign,
  Mail,
  Phone,
  CheckCircle2,
} from "lucide-react";
import MarketingNavbar from "../components/marketing/MarketingNavbar.jsx";
import Button from "../components/ui/Button.jsx";
import { Card, IconTile } from "../components/ui/Card.jsx";
import { useTheme } from "../context/ThemeContext.jsx";

const FEATURES = [
  { icon: UploadCloud, title: "One Resume, Every Job", desc: "Upload your resume once and reuse it for every application, with a full version history if you update it later." },
  { icon: ScanSearch, title: "See Your Match Score", desc: "AI screening scores your resume against each job's real requirements, so you know where you stand before you wait." },
  { icon: Send, title: "Apply in Minutes", desc: "Your saved profile and resume pre-fill every application — no retyping the same details job after job." },
  { icon: Bot, title: "AI Interviews On Your Schedule", desc: "Pass screening and get invited to a live AI interview you can take whenever suits you — no recruiter calendar tag." },
  { icon: MessageSquareText, title: "Structured Feedback", desc: "Every AI interview ends with a clear, evidence-based report so you actually know how you did." },
  { icon: ListChecks, title: "Real-Time Application Tracking", desc: "Follow every application's exact stage — applied, in ATS review, interview-ready, or decided — with no guessing." },
  { icon: Bell, title: "Instant Notifications", desc: "Get notified the moment your status changes, an interview is scheduled, or a recruiter responds." },
  { icon: Bookmark, title: "Saved & Recommended Jobs", desc: "Bookmark roles you're considering and get new openings recommended based on your skills and profile." },
];

const FLOW = [
  "Create Account",
  "Build Profile",
  "Apply to Jobs",
  "AI Resume Screening",
  "AI Interview",
  "Get Feedback",
  "Receive Decision",
];

const WHY_US = [
  { icon: Clock, title: "Faster Results", desc: "Know where you stand in days, not weeks of silence after hitting submit." },
  { icon: ThumbsUp, title: "Fair & Consistent", desc: "Every resume and interview is scored against the same criteria — not a recruiter's mood that day." },
  { icon: Workflow, title: "Apply Once, Reuse Everywhere", desc: "Save your details once and apply to any open role in minutes, not hours." },
  { icon: Video, title: "Interview On Your Time", desc: "No scheduling back-and-forth — take your AI interview whenever works for you." },
  { icon: ShieldCheck, title: "Transparent Feedback", desc: "Get a real, structured report after every interview instead of being ghosted." },
  { icon: DollarSign, title: "Always Free for Candidates", desc: "Creating an account, applying, and interviewing never costs you anything." },
];

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

export default function Landing() {
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    if (theme !== "light") setTheme("light");
  }, [theme, setTheme]);

  return (
    <div className="min-h-screen bg-[#F8FAF9] text-[#17221C]">
      <MarketingNavbar />

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-[#E5EBE7] bg-white">
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-64 bg-[radial-gradient(ellipse_at_bottom,#E4F8C6_0%,transparent_70%)] opacity-70" />
        <div className="relative mx-auto max-w-3xl px-5 py-24 text-center sm:px-8">
          <motion.div initial="hidden" animate="show" variants={fadeUp}>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#C7DDD1] bg-[#E8F2EC] px-3.5 py-1 text-xs font-semibold text-[#176B45]">
              <Sparkles className="h-3.5 w-3.5" /> AI-Powered Recruitment Platform
            </span>
            <h1 className="mt-5 text-[32px] font-bold leading-[38px] tracking-[-0.6px] text-[#17221C] sm:text-[40px] sm:leading-[48px]">
              Land Your Dream Job with AI-Powered Hiring.
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-[15px] leading-6 text-[#64736A] sm:text-base">
              Apply once, let AI resume screening and interviews do the heavy lifting, and grow your career with
              feedback that actually helps — every step tracked in one place.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Button as={Link} to="/register" size="lg">
                Create Account <ArrowRight className="h-4 w-4" />
              </Button>
              <Button as={Link} to="/" variant="secondary" size="lg">
                Explore Jobs
              </Button>
            </div>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-sm text-[#64736A]">
              <div className="flex items-center gap-1.5 font-medium">
                <CheckCircle2 className="h-4 w-4 text-[#176B45]" /> Free for candidates, always
              </div>
              <div className="flex items-center gap-1.5 font-medium">
                <CheckCircle2 className="h-4 w-4 text-[#176B45]" /> Apply in minutes
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-7xl px-5 py-20 sm:px-8">
        <motion.div initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.3 }} variants={fadeUp} className="mx-auto max-w-2xl text-center">
          <h2 className="text-[24px] leading-[30px] font-bold text-[#17221C]">Everything you need to land your next role</h2>
          <p className="mt-3 text-[13px] leading-5 text-[#64736A]">From first upload to your next offer — everything in one place.</p>
        </motion.div>
        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f, i) => (
            <motion.div key={f.title} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.3 }} variants={fadeUp} transition={{ delay: (i % 4) * 0.06 }}>
              <Card interactive className="group h-full rounded-2xl border border-[#E5EBE7] bg-white p-6 shadow-[0_1px_4px_rgba(27,67,50,0.07)]">
                <IconTile icon={f.icon} tone={i % 4 === 3 ? "ember" : "brand"} className="mb-4" />
                <h3 className="text-[15px] font-semibold text-[#17221C]">{f.title}</h3>
                <p className="mt-2 text-[13px] leading-5 text-[#64736A]">{f.desc}</p>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="border-y border-[#E5EBE7] bg-white py-20">
        <div className="mx-auto max-w-5xl px-5 sm:px-8">
          <motion.div initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.3 }} variants={fadeUp} className="mx-auto max-w-2xl text-center">
            <h2 className="text-[24px] leading-[30px] font-bold text-[#17221C]">How it works</h2>
            <p className="mt-3 text-[13px] leading-5 text-[#64736A]">From creating your account to hearing back — a fully connected journey.</p>
          </motion.div>
          <div className="mt-16 flex flex-col gap-0 lg:flex-row lg:items-center lg:justify-between">
            {FLOW.map((step, i) => (
              <motion.div
                key={step}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.5 }}
                transition={{ delay: i * 0.08 }}
                className="relative flex flex-1 items-center gap-4 lg:flex-col lg:gap-3 lg:text-center"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#176B45] text-sm font-semibold text-white shadow-[0_1px_4px_rgba(27,67,50,0.07)]">
                  {i + 1}
                </div>
                <p className="text-[13px] font-semibold text-[#17221C] lg:mt-1">{step}</p>
                {i < FLOW.length - 1 && (
                  <div className="hidden h-px flex-1 bg-gradient-to-r from-[#D4F056] to-[#F4FDE8] lg:block" />
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Why choose us */}
      <section id="why-us" className="mx-auto max-w-7xl px-5 py-24 sm:px-8">
        <motion.div initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.3 }} variants={fadeUp} className="mx-auto max-w-2xl text-center">
          <h2 className="text-[24px] leading-[30px] font-bold text-[#17221C]">Why candidates choose AptusHire</h2>
        </motion.div>
        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {WHY_US.map((f, i) => {
            return (
              <motion.div key={f.title} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.3 }} variants={fadeUp} transition={{ delay: (i % 3) * 0.08 }}>
                <Card className="h-full rounded-2xl border border-[#E5EBE7] bg-white p-6 shadow-[0_1px_4px_rgba(27,67,50,0.07)]">
                  <IconTile icon={f.icon} tone="brand" className="mb-4" />
                  <h3 className="text-[15px] font-semibold text-[#17221C]">{f.title}</h3>
                  <p className="mt-2 text-[13px] leading-5 text-[#64736A]">{f.desc}</p>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* About */}
      <section id="about" className="border-y border-[#E5EBE7] bg-white py-20">
        <div className="mx-auto max-w-3xl px-5 text-center sm:px-8">
          <h2 className="text-[24px] leading-[30px] font-bold text-[#17221C]">About AptusHire</h2>
          <p className="mt-4 text-[15px] leading-6 text-[#64736A]">
            AptusHire connects candidates with companies using AI-driven resume screening and real-time interviews
            — so you spend less time waiting and more time showing what you can actually do. Every application you
            submit, interview you take, and piece of feedback you receive lives in one dashboard you control.
          </p>
          <Button as={Link} to="/register" size="lg" className="mt-8">
            Create Account <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-5 py-20 sm:px-8">
        <div className="rounded-2xl border border-[#C7DDD1] bg-[#E8F2EC] px-8 py-14 text-center shadow-[0_1px_4px_rgba(27,67,50,0.07)]">
          <h2 className="text-[24px] leading-[30px] font-bold text-[#17221C]">Ready to start applying?</h2>
          {/* white/90 rather than brand-100: brand-100 on the gradient's
              lightest stop is 4.49:1, which rounds to "fails". */}
          <p className="mx-auto mt-3 max-w-xl text-[13px] leading-5 text-[#64736A]">
            Create your free account and apply to your first job in minutes.
          </p>
          <Button as={Link} to="/register" size="lg" className="mt-8">
            Create Account <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </section>

      <footer id="contact" className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-5 py-12 sm:px-8">
          <div className="flex flex-col justify-between gap-8 sm:flex-row">
            <div>
              <div className="flex items-center gap-2 font-display text-lg font-bold text-slate-900">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#176B45] text-white">
                  <Sparkles className="h-4.5 w-4.5" />
                </span>
                AptusHire
              </div>
              <p className="mt-3 max-w-xs text-sm text-slate-500">
                AI-powered hiring for candidates who want a faster, fairer path to their next role.
              </p>
            </div>
            <div className="text-sm text-slate-600">
              <div className="font-semibold text-slate-800">Get in Touch</div>
              <a href="mailto:careers@AptusHire.ai" className="mt-2 flex items-center gap-2 hover:text-[#176B45]">
                <Mail className="h-4 w-4" /> careers@AptusHire.ai
              </a>
              <a href="tel:+911140001234" className="mt-2 flex items-center gap-2 hover:text-[#176B45]">
                <Phone className="h-4 w-4" /> +91 11 4000 1234
              </a>
            </div>
          </div>
          <p className="mt-10 text-xs text-slate-400">© {new Date().getFullYear()} AptusHire. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

