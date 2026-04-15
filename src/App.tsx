import { useState, useEffect, useRef, useCallback } from "react";

// ─── THEME ──────────────────────────────────────────────────────────────────
const theme = {
  bg: "#0D0F14",
  surface: "#161A22",
  surfaceHigh: "#1E2430",
  border: "#262D3A",
  accent: "#5B8AF5",
  accentSoft: "#1E2D4F",
  accentGlow: "rgba(91,138,245,0.25)",
  green: "#34C97B",
  greenSoft: "#112A1E",
  amber: "#F5A623",
  amberSoft: "#2A1E0E",
  red: "#F55B5B",
  redSoft: "#2A1111",
  text: "#E8ECF2",
  textSub: "#7C8899",
  textMuted: "#3D4A5C",
};

const globalStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=DM+Sans:ital,wght@0,300;0,400;0,500;1,300&display=swap');

  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: ${theme.bg}; font-family: 'DM Sans', sans-serif; color: ${theme.text}; }

  ::-webkit-scrollbar { width: 4px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: ${theme.border}; border-radius: 2px; }

  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(18px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes fadeIn {
    from { opacity: 0; } to { opacity: 1; }
  }
  @keyframes pulse {
    0%,100% { box-shadow: 0 0 0 0 ${theme.accentGlow}; }
    50%      { box-shadow: 0 0 0 12px transparent; }
  }
  @keyframes spin {
    from { transform: rotate(0deg); }
    to   { transform: rotate(360deg); }
  }
  @keyframes timerPulse {
    0%,100% { opacity: 1; }
    50%      { opacity: 0.6; }
  }
  @keyframes slideIn {
    from { opacity: 0; transform: translateX(-12px); }
    to   { opacity: 1; transform: translateX(0); }
  }
  @keyframes scaleIn {
    from { opacity: 0; transform: scale(0.9); }
    to   { opacity: 1; transform: scale(1); }
  }
`;

// ─── ICONS ───────────────────────────────────────────────────────────────────
const Icon = ({ name, size = 20, color = "currentColor" }) => {
  const icons = {
    today: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="3"/><path d="M16 2v4M8 2v4M3 10h18"/>
      </svg>
    ),
    energy: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
      </svg>
    ),
    agenda: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>
      </svg>
    ),
    insights: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 20V10M12 20V4M6 20v-6"/>
      </svg>
    ),
    check: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12"/>
      </svg>
    ),
    plus: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round">
        <path d="M12 5v14M5 12h14"/>
      </svg>
    ),
    timer: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2.5M9.5 3h5M12 5V3"/>
      </svg>
    ),
    play: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill={color} stroke="none">
        <polygon points="5 3 19 12 5 21 5 3"/>
      </svg>
    ),
    pause: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill={color} stroke="none">
        <rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/>
      </svg>
    ),
    reset: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>
      </svg>
    ),
    close: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round">
        <path d="M18 6 6 18M6 6l12 12"/>
      </svg>
    ),
    arrow: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 12h14M12 5l7 7-7 7"/>
      </svg>
    ),
    wave: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 12c1.5-3 3-4.5 4.5-4.5S9 9 10.5 9s3-3 4.5-3 3 1.5 4.5 4.5 3 4.5 4.5 4.5"/>
      </svg>
    ),
  };
  return icons[name] || null;
};

// ─── ONBOARDING ───────────────────────────────────────────────────────────────
function Onboarding({ onComplete }) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    if (step === 1 && inputRef.current) inputRef.current.focus();
  }, [step]);

  const steps = [
    {
      content: (
        <div style={{ textAlign: "center", animation: "scaleIn 0.5s ease" }}>
          <div style={{
            width: 80, height: 80, borderRadius: 24,
            background: `linear-gradient(135deg, ${theme.accent}, #8B5CF6)`,
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 28px", fontSize: 36,
            boxShadow: `0 20px 60px ${theme.accentGlow}`
          }}>✈️</div>
          <h1 style={{ fontFamily: "Syne", fontSize: 32, fontWeight: 800, marginBottom: 12 }}>
            Bienvenido a<br/>
            <span style={{ background: `linear-gradient(135deg, ${theme.accent}, #A78BFA)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              WorkPilot
            </span>
          </h1>
          <p style={{ color: theme.textSub, fontSize: 15, lineHeight: 1.6, maxWidth: 280, margin: "0 auto" }}>
            Tu copiloto de productividad personal. Vamos a configurar tu espacio en 30 segundos.
          </p>
        </div>
      ),
      cta: "Empezar →"
    },
    {
      content: (
        <div style={{ animation: "fadeUp 0.4s ease" }}>
          <p style={{ color: theme.textSub, fontSize: 13, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 24, fontFamily: "Syne" }}>
            Paso 1 de 2
          </p>
          <h2 style={{ fontFamily: "Syne", fontSize: 26, fontWeight: 700, marginBottom: 8 }}>
            ¿Cómo te llamas?
          </h2>
          <p style={{ color: theme.textSub, fontSize: 14, marginBottom: 28 }}>
            Así personalizaremos tu experiencia.
          </p>
          <input
            ref={inputRef}
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === "Enter" && name.trim() && setStep(2)}
            placeholder="Tu nombre..."
            style={{
              width: "100%", padding: "14px 18px",
              background: theme.surfaceHigh, border: `1.5px solid ${name ? theme.accent : theme.border}`,
              borderRadius: 12, color: theme.text, fontSize: 16,
              fontFamily: "DM Sans", outline: "none",
              transition: "border-color 0.2s",
            }}
          />
        </div>
      ),
      cta: "Continuar",
      disabled: !name.trim()
    },
    {
      content: (
        <div style={{ animation: "fadeUp 0.4s ease" }}>
          <p style={{ color: theme.textSub, fontSize: 13, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 24, fontFamily: "Syne" }}>
            Paso 2 de 2
          </p>
          <h2 style={{ fontFamily: "Syne", fontSize: 26, fontWeight: 700, marginBottom: 8 }}>
            ¿Cuál es tu rol?
          </h2>
          <p style={{ color: theme.textSub, fontSize: 14, marginBottom: 24 }}>
            Opcional — para sugerencias más relevantes.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {["Analista / Coordinador", "Desarrollador", "Diseñador", "Manager", "Otro"].map(r => (
              <button
                key={r}
                onClick={() => setRole(r)}
                style={{
                  padding: "12px 18px", borderRadius: 10, textAlign: "left",
                  background: role === r ? theme.accentSoft : theme.surfaceHigh,
                  border: `1.5px solid ${role === r ? theme.accent : theme.border}`,
                  color: role === r ? theme.accent : theme.text, cursor: "pointer",
                  fontSize: 14, fontFamily: "DM Sans", transition: "all 0.15s",
                }}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
      ),
      cta: "Entrar a WorkPilot",
      disabled: false
    }
  ];

  const current = steps[step];

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: theme.bg, padding: 24, position: "relative", overflow: "hidden"
    }}>
      {/* Ambient glow */}
      <div style={{
        position: "absolute", top: "20%", left: "50%", transform: "translateX(-50%)",
        width: 400, height: 400, borderRadius: "50%",
        background: `radial-gradient(circle, ${theme.accentGlow} 0%, transparent 70%)`,
        pointerEvents: "none"
      }}/>

      <div style={{
        width: "100%", maxWidth: 360,
        background: theme.surface, borderRadius: 24,
        border: `1px solid ${theme.border}`,
        padding: "40px 32px",
        boxShadow: "0 40px 80px rgba(0,0,0,0.5)",
        position: "relative", zIndex: 1,
      }}>
        {current.content}

        {/* Progress dots */}
        {step > 0 && (
          <div style={{ display: "flex", gap: 6, justifyContent: "center", marginTop: 28, marginBottom: 24 }}>
            {[1, 2].map(i => (
              <div key={i} style={{
                width: i <= step ? 20 : 6, height: 6, borderRadius: 3,
                background: i <= step ? theme.accent : theme.textMuted,
                transition: "all 0.3s ease"
              }}/>
            ))}
          </div>
        )}

        <button
          onClick={() => {
            if (step < steps.length - 1) setStep(step + 1);
            else onComplete({ name: name.trim() || "Amigo", role });
          }}
          disabled={current.disabled}
          style={{
            width: "100%", padding: "14px",
            background: current.disabled
              ? theme.surfaceHigh
              : `linear-gradient(135deg, ${theme.accent}, #7C4DFF)`,
            border: "none", borderRadius: 12, color: current.disabled ? theme.textMuted : "#fff",
            fontSize: 15, fontWeight: 600, fontFamily: "Syne",
            cursor: current.disabled ? "not-allowed" : "pointer",
            marginTop: step === 0 ? 32 : 0,
            transition: "all 0.2s",
            boxShadow: current.disabled ? "none" : `0 8px 24px ${theme.accentGlow}`,
          }}
        >
          {current.cta}
        </button>

        {step > 0 && (
          <button
            onClick={() => setStep(step - 1)}
            style={{
              width: "100%", padding: "10px", marginTop: 10,
              background: "transparent", border: "none",
              color: theme.textSub, fontSize: 14, cursor: "pointer", fontFamily: "DM Sans"
            }}
          >
            ← Atrás
          </button>
        )}
      </div>
    </div>
  );
}

// ─── POMODORO ────────────────────────────────────────────────────────────────
function PomodoroTimer() {
  const MODES = [
    { label: "Foco", minutes: 25, color: theme.accent },
    { label: "Descanso", minutes: 5, color: theme.green },
    { label: "Largo", minutes: 15, color: theme.amber },
  ];
  const [modeIdx, setModeIdx] = useState(0);
  const [seconds, setSeconds] = useState(MODES[0].minutes * 60);
  const [running, setRunning] = useState(false);
  const [sessions, setSessions] = useState(0);
  const intervalRef = useRef(null);

  const mode = MODES[modeIdx];
  const total = mode.minutes * 60;
  const progress = 1 - seconds / total;
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const strokeDash = circumference * (1 - progress);

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setSeconds(s => {
          if (s <= 1) {
            clearInterval(intervalRef.current);
            setRunning(false);
            if (modeIdx === 0) setSessions(n => n + 1);
            return 0;
          }
          return s - 1;
        });
      }, 1000);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [running, modeIdx]);

  const switchMode = (idx) => {
    clearInterval(intervalRef.current);
    setModeIdx(idx);
    setSeconds(MODES[idx].minutes * 60);
    setRunning(false);
  };

  const reset = () => {
    clearInterval(intervalRef.current);
    setSeconds(total);
    setRunning(false);
  };

  const mins = String(Math.floor(seconds / 60)).padStart(2, "0");
  const secs = String(seconds % 60).padStart(2, "0");

  return (
    <div style={{ animation: "fadeUp 0.4s ease" }}>
      <h2 style={{ fontFamily: "Syne", fontSize: 20, fontWeight: 700, marginBottom: 20 }}>
        Temporizador Pomodoro
      </h2>

      {/* Mode tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 28, background: theme.surfaceHigh, padding: 4, borderRadius: 12 }}>
        {MODES.map((m, i) => (
          <button
            key={m.label}
            onClick={() => switchMode(i)}
            style={{
              flex: 1, padding: "8px 4px", borderRadius: 9,
              background: modeIdx === i ? theme.surface : "transparent",
              border: modeIdx === i ? `1px solid ${theme.border}` : "none",
              color: modeIdx === i ? m.color : theme.textSub,
              fontSize: 13, fontWeight: 600, fontFamily: "Syne", cursor: "pointer",
              transition: "all 0.2s",
            }}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* SVG ring timer */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 28 }}>
        <div style={{ position: "relative", width: 140, height: 140 }}>
          <svg width="140" height="140" style={{ transform: "rotate(-90deg)" }}>
            <circle cx="70" cy="70" r={radius} fill="none" stroke={theme.surfaceHigh} strokeWidth="8"/>
            <circle
              cx="70" cy="70" r={radius} fill="none"
              stroke={mode.color} strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDash}
              style={{ transition: "stroke-dashoffset 0.9s linear", filter: `drop-shadow(0 0 6px ${mode.color})` }}
            />
          </svg>
          <div style={{
            position: "absolute", inset: 0, display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
          }}>
            <span style={{
              fontFamily: "Syne", fontSize: 36, fontWeight: 800, color: mode.color,
              animation: running ? "timerPulse 2s ease infinite" : "none",
              letterSpacing: "-1px"
            }}>
              {mins}:{secs}
            </span>
            <span style={{ fontSize: 11, color: theme.textSub, fontFamily: "Syne", textTransform: "uppercase", letterSpacing: "0.08em" }}>
              {mode.label}
            </span>
          </div>
        </div>

        {/* Sessions count */}
        <div style={{ display: "flex", gap: 6, marginTop: 14 }}>
          {[0,1,2,3].map(i => (
            <div key={i} style={{
              width: 10, height: 10, borderRadius: "50%",
              background: i < (sessions % 4) ? theme.accent : theme.surfaceHigh,
              border: `1.5px solid ${i < (sessions % 4) ? theme.accent : theme.border}`,
              transition: "all 0.3s",
            }}/>
          ))}
          <span style={{ color: theme.textSub, fontSize: 12, marginLeft: 4 }}>
            {sessions} sesiones
          </span>
        </div>
      </div>

      {/* Controls */}
      <div style={{ display: "flex", gap: 12 }}>
        <button
          onClick={reset}
          style={{
            width: 48, height: 48, borderRadius: 12,
            background: theme.surfaceHigh, border: `1px solid ${theme.border}`,
            color: theme.textSub, cursor: "pointer", display: "flex",
            alignItems: "center", justifyContent: "center",
            transition: "all 0.2s",
          }}
        >
          <Icon name="reset" size={18}/>
        </button>
        <button
          onClick={() => setRunning(!running)}
          style={{
            flex: 1, height: 48, borderRadius: 12,
            background: running
              ? theme.surfaceHigh
              : `linear-gradient(135deg, ${mode.color}cc, ${mode.color})`,
            border: running ? `1px solid ${theme.border}` : "none",
            color: running ? mode.color : "#fff",
            fontFamily: "Syne", fontWeight: 700, fontSize: 15,
            cursor: "pointer", display: "flex", alignItems: "center",
            justifyContent: "center", gap: 8,
            boxShadow: running ? "none" : `0 8px 20px ${mode.color}44`,
            transition: "all 0.2s",
          }}
        >
          <Icon name={running ? "pause" : "play"} size={16}/>
          {running ? "Pausar" : "Iniciar"}
        </button>
      </div>
    </div>
  );
}

// ─── ADD TASK MODAL ────────────────────────────────────────────────────────────
function AddTaskModal({ onAdd, onClose }) {
  const [text, setText] = useState("");
  const [priority, setPriority] = useState("media");
  const inputRef = useRef(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const priorities = [
    { id: "alta", label: "Alta", color: theme.red },
    { id: "media", label: "Media", color: theme.amber },
    { id: "baja", label: "Baja", color: theme.green },
  ];

  const submit = () => {
    if (!text.trim()) return;
    onAdd({ id: Date.now(), text: text.trim(), priority, done: false });
    onClose();
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 100,
      background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)",
      display: "flex", alignItems: "flex-end", justifyContent: "center",
      animation: "fadeIn 0.2s ease",
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        width: "100%", maxWidth: 480,
        background: theme.surface, borderRadius: "20px 20px 0 0",
        border: `1px solid ${theme.border}`, borderBottom: "none",
        padding: "8px 0 0",
        animation: "fadeUp 0.3s ease",
        boxShadow: "0 -20px 60px rgba(0,0,0,0.5)",
      }}>
        {/* Handle */}
        <div style={{ width: 36, height: 4, background: theme.border, borderRadius: 2, margin: "0 auto 20px" }}/>

        <div style={{ padding: "0 24px 32px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <h3 style={{ fontFamily: "Syne", fontSize: 18, fontWeight: 700 }}>Nueva tarea</h3>
            <button onClick={onClose} style={{ background: "none", border: "none", color: theme.textSub, cursor: "pointer", padding: 4 }}>
              <Icon name="close" size={18}/>
            </button>
          </div>

          <input
            ref={inputRef}
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => e.key === "Enter" && submit()}
            placeholder="¿Qué necesitas hacer?"
            style={{
              width: "100%", padding: "14px 16px",
              background: theme.surfaceHigh, border: `1.5px solid ${text ? theme.accent : theme.border}`,
              borderRadius: 12, color: theme.text, fontSize: 15,
              fontFamily: "DM Sans", outline: "none", marginBottom: 20,
              transition: "border-color 0.2s",
            }}
          />

          <p style={{ fontSize: 12, color: theme.textSub, fontFamily: "Syne", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>
            Prioridad
          </p>
          <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
            {priorities.map(p => (
              <button
                key={p.id}
                onClick={() => setPriority(p.id)}
                style={{
                  flex: 1, padding: "9px 0", borderRadius: 10,
                  background: priority === p.id ? `${p.color}22` : theme.surfaceHigh,
                  border: `1.5px solid ${priority === p.id ? p.color : theme.border}`,
                  color: priority === p.id ? p.color : theme.textSub,
                  fontSize: 13, fontWeight: 600, fontFamily: "Syne", cursor: "pointer",
                  transition: "all 0.15s",
                }}
              >
                {p.label}
              </button>
            ))}
          </div>

          <button
            onClick={submit}
            disabled={!text.trim()}
            style={{
              width: "100%", padding: "14px",
              background: text.trim()
                ? `linear-gradient(135deg, ${theme.accent}, #7C4DFF)`
                : theme.surfaceHigh,
              border: "none", borderRadius: 12,
              color: text.trim() ? "#fff" : theme.textMuted,
              fontSize: 15, fontWeight: 700, fontFamily: "Syne",
              cursor: text.trim() ? "pointer" : "not-allowed",
              boxShadow: text.trim() ? `0 8px 24px ${theme.accentGlow}` : "none",
              transition: "all 0.2s",
            }}
          >
            Agregar tarea
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── SCREENS ──────────────────────────────────────────────────────────────────
function ScreenHoy({ user, tasks, onAddTask, onToggleTask }) {
  const [showModal, setShowModal] = useState(false);
  const done = tasks.filter(t => t.done).length;
  const pct = tasks.length ? Math.round((done / tasks.length) * 100) : 0;

  const priorityColor = { alta: theme.red, media: theme.amber, baja: theme.green };

  return (
    <div style={{ padding: "24px 20px", animation: "fadeUp 0.35s ease" }}>
      {/* Greeting */}
      <div style={{ marginBottom: 24 }}>
        <p style={{ color: theme.textSub, fontSize: 13, fontFamily: "Syne", textTransform: "uppercase", letterSpacing: "0.1em" }}>
          {new Date().toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long" })}
        </p>
        <h1 style={{ fontFamily: "Syne", fontSize: 28, fontWeight: 800, marginTop: 4 }}>
          Hola, {user.name} 👋
        </h1>
      </div>

      {/* Progress card */}
      {tasks.length > 0 && (
        <div style={{
          background: theme.surface, borderRadius: 16, padding: "18px 20px",
          border: `1px solid ${theme.border}`, marginBottom: 20,
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
            <span style={{ fontSize: 14, color: theme.textSub }}>Progreso del día</span>
            <span style={{ fontSize: 14, fontWeight: 700, color: theme.accent }}>{pct}%</span>
          </div>
          <div style={{ height: 6, background: theme.surfaceHigh, borderRadius: 3, overflow: "hidden" }}>
            <div style={{
              height: "100%", width: `${pct}%`,
              background: `linear-gradient(90deg, ${theme.accent}, #7C4DFF)`,
              borderRadius: 3, transition: "width 0.5s ease",
            }}/>
          </div>
          <p style={{ fontSize: 12, color: theme.textMuted, marginTop: 8 }}>
            {done} de {tasks.length} tareas completadas
          </p>
        </div>
      )}

      {/* Tasks */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <h2 style={{ fontFamily: "Syne", fontSize: 16, fontWeight: 700 }}>Tareas de hoy</h2>
        <button
          onClick={() => setShowModal(true)}
          style={{
            width: 36, height: 36, borderRadius: 10,
            background: `linear-gradient(135deg, ${theme.accent}, #7C4DFF)`,
            border: "none", color: "#fff", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: `0 4px 12px ${theme.accentGlow}`,
          }}
        >
          <Icon name="plus" size={18}/>
        </button>
      </div>

      {tasks.length === 0 ? (
        <div style={{
          background: theme.surface, borderRadius: 16, padding: "32px 20px",
          border: `1px dashed ${theme.border}`, textAlign: "center",
        }}>
          <p style={{ fontSize: 28, marginBottom: 10 }}>📋</p>
          <p style={{ color: theme.textSub, fontSize: 14 }}>
            Sin tareas aún. Pulsa <strong style={{ color: theme.accent }}>+</strong> para agregar.
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {tasks.map(t => (
            <div
              key={t.id}
              onClick={() => onToggleTask(t.id)}
              style={{
                background: t.done ? theme.surfaceHigh : theme.surface,
                borderRadius: 12, padding: "14px 16px",
                border: `1px solid ${t.done ? theme.textMuted : theme.border}`,
                display: "flex", alignItems: "center", gap: 12,
                cursor: "pointer", transition: "all 0.2s",
                animation: "slideIn 0.3s ease",
                opacity: t.done ? 0.6 : 1,
              }}
            >
              <div style={{
                width: 22, height: 22, borderRadius: 6, flexShrink: 0,
                background: t.done ? theme.accent : "transparent",
                border: `2px solid ${t.done ? theme.accent : priorityColor[t.priority]}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                transition: "all 0.2s",
              }}>
                {t.done && <Icon name="check" size={12} color="#fff"/>}
              </div>
              <span style={{
                fontSize: 14, flex: 1, fontFamily: "DM Sans",
                textDecoration: t.done ? "line-through" : "none",
                color: t.done ? theme.textSub : theme.text,
              }}>
                {t.text}
              </span>
              <div style={{
                width: 6, height: 6, borderRadius: "50%",
                background: priorityColor[t.priority], flexShrink: 0,
              }}/>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <AddTaskModal
          onAdd={onAddTask}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
}

function ScreenEnergia() {
  const [levels, setLevels] = useState([7, 5, 8]);
  const labels = ["Física", "Mental", "Motivación"];
  const colors = [theme.green, theme.accent, theme.amber];

  return (
    <div style={{ padding: "24px 20px", animation: "fadeUp 0.35s ease" }}>
      <h1 style={{ fontFamily: "Syne", fontSize: 26, fontWeight: 800, marginBottom: 6 }}>Energía</h1>
      <p style={{ color: theme.textSub, fontSize: 14, marginBottom: 28 }}>¿Cómo te sientes hoy?</p>

      {labels.map((label, i) => (
        <div key={label} style={{ marginBottom: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
            <span style={{ fontFamily: "Syne", fontWeight: 600, fontSize: 15 }}>{label}</span>
            <span style={{ fontFamily: "Syne", fontWeight: 800, color: colors[i], fontSize: 18 }}>
              {levels[i]}/10
            </span>
          </div>
          <input
            type="range" min="1" max="10" value={levels[i]}
            onChange={e => {
              const n = [...levels]; n[i] = +e.target.value;
              setLevels(n);
            }}
            style={{ width: "100%", accentColor: colors[i], height: 4 }}
          />
        </div>
      ))}

      <PomodoroTimer />
    </div>
  );
}

function ScreenAgenda() {
  const events = [
    { time: "09:00", title: "Standup de equipo", dur: "30 min", color: theme.accent },
    { time: "10:30", title: "Revisión de guardería U-1747", dur: "1 hr", color: theme.green },
    { time: "13:00", title: "Comida", dur: "1 hr", color: theme.amber },
    { time: "15:00", title: "Reporte Circular 039/2026", dur: "2 hr", color: theme.red },
  ];

  return (
    <div style={{ padding: "24px 20px", animation: "fadeUp 0.35s ease" }}>
      <h1 style={{ fontFamily: "Syne", fontSize: 26, fontWeight: 800, marginBottom: 6 }}>Agenda</h1>
      <p style={{ color: theme.textSub, fontSize: 14, marginBottom: 24 }}>
        {new Date().toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long" })}
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {events.map(ev => (
          <div key={ev.time} style={{
            display: "flex", gap: 14, alignItems: "flex-start",
            animation: "slideIn 0.3s ease",
          }}>
            <div style={{ textAlign: "right", minWidth: 44 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: theme.textSub, fontFamily: "Syne" }}>{ev.time}</p>
            </div>
            <div style={{
              flex: 1, background: theme.surface, borderRadius: 12,
              padding: "12px 16px", border: `1px solid ${theme.border}`,
              borderLeft: `3px solid ${ev.color}`,
            }}>
              <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 2 }}>{ev.title}</p>
              <p style={{ fontSize: 12, color: theme.textSub }}>{ev.dur}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ScreenInsights({ tasks }) {
  const done = tasks.filter(t => t.done).length;
  const alta = tasks.filter(t => t.priority === "alta").length;
  const pct = tasks.length ? Math.round((done / tasks.length) * 100) : 0;

  const stats = [
    { label: "Tareas hoy", value: tasks.length, color: theme.accent },
    { label: "Completadas", value: done, color: theme.green },
    { label: "Prioridad alta", value: alta, color: theme.red },
    { label: "Eficiencia", value: `${pct}%`, color: theme.amber },
  ];

  return (
    <div style={{ padding: "24px 20px", animation: "fadeUp 0.35s ease" }}>
      <h1 style={{ fontFamily: "Syne", fontSize: 26, fontWeight: 800, marginBottom: 6 }}>Insights</h1>
      <p style={{ color: theme.textSub, fontSize: 14, marginBottom: 24 }}>Tu rendimiento de hoy</p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 24 }}>
        {stats.map(s => (
          <div key={s.label} style={{
            background: theme.surface, borderRadius: 16,
            padding: "18px 16px", border: `1px solid ${theme.border}`,
          }}>
            <p style={{ fontSize: 30, fontFamily: "Syne", fontWeight: 800, color: s.color }}>{s.value}</p>
            <p style={{ fontSize: 12, color: theme.textSub, marginTop: 4 }}>{s.label}</p>
          </div>
        ))}
      </div>

      <div style={{
        background: theme.surface, borderRadius: 16, padding: "20px",
        border: `1px solid ${theme.border}`,
      }}>
        <p style={{ fontFamily: "Syne", fontWeight: 700, marginBottom: 12 }}>💡 Tip del día</p>
        <p style={{ fontSize: 14, color: theme.textSub, lineHeight: 1.6 }}>
          Las personas de alto rendimiento completan primero las tareas de alta prioridad. Intenta atacar las tareas rojas antes del mediodía.
        </p>
      </div>
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function WorkPilot() {
  const [user, setUser] = useState(null);
  const [tab, setTab] = useState("hoy");
  const [tasks, setTasks] = useState([
    { id: 1, text: "Revisar convenios modificatorios", priority: "alta", done: false },
    { id: 2, text: "Actualizar Base de Datos 2026", priority: "media", done: true },
  ]);

  const navItems = [
    { id: "hoy", icon: "today", label: "Hoy" },
    { id: "energia", icon: "energy", label: "Energía" },
    { id: "agenda", icon: "agenda", label: "Agenda" },
    { id: "insights", icon: "insights", label: "Insights" },
  ];

  const addTask = (t) => setTasks(prev => [t, ...prev]);
  const toggleTask = (id) => setTasks(prev => prev.map(t => t.id === id ? { ...t, done: !t.done } : t));

  if (!user) return (
    <>
      <style>{globalStyles}</style>
      <Onboarding onComplete={setUser} />
    </>
  );

  return (
    <>
      <style>{globalStyles}</style>
      <div style={{ maxWidth: 480, margin: "0 auto", minHeight: "100vh", background: theme.bg, display: "flex", flexDirection: "column", position: "relative" }}>
        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "16px 20px 0",
          borderBottom: `1px solid ${theme.border}`,
          paddingBottom: 14,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{
              width: 28, height: 28, borderRadius: 8,
              background: `linear-gradient(135deg, ${theme.accent}, #7C4DFF)`,
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14
            }}>✈️</div>
            <span style={{ fontFamily: "Syne", fontWeight: 800, fontSize: 16 }}>WorkPilot</span>
          </div>
          <div style={{
            width: 32, height: 32, borderRadius: "50%",
            background: `linear-gradient(135deg, ${theme.accent}44, #7C4DFF44)`,
            border: `1.5px solid ${theme.accent}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 13, fontWeight: 700, color: theme.accent, fontFamily: "Syne",
          }}>
            {user.name[0].toUpperCase()}
          </div>
        </div>

        {/* Screen */}
        <div style={{ flex: 1, overflowY: "auto" }}>
          {tab === "hoy" && <ScreenHoy user={user} tasks={tasks} onAddTask={addTask} onToggleTask={toggleTask}/>}
          {tab === "energia" && <ScreenEnergia/>}
          {tab === "agenda" && <ScreenAgenda/>}
          {tab === "insights" && <ScreenInsights tasks={tasks}/>}
        </div>

        {/* Bottom nav */}
        <div style={{
          display: "flex", background: theme.surface,
          borderTop: `1px solid ${theme.border}`,
          padding: "8px 0 16px",
        }}>
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => setTab(item.id)}
              style={{
                flex: 1, display: "flex", flexDirection: "column",
                alignItems: "center", gap: 4, padding: "8px 0",
                background: "none", border: "none",
                color: tab === item.id ? theme.accent : theme.textMuted,
                cursor: "pointer", transition: "color 0.2s",
              }}
            >
              <Icon name={item.icon} size={20} color={tab === item.id ? theme.accent : theme.textMuted}/>
              <span style={{ fontSize: 11, fontFamily: "Syne", fontWeight: tab === item.id ? 700 : 400 }}>
                {item.label}
              </span>
              {tab === item.id && (
                <div style={{ width: 16, height: 2, borderRadius: 1, background: theme.accent, marginTop: 1 }}/>
              )}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
