import React, { useEffect, useState } from "react";
import {
  Copy,
  Sparkles,
  LogOut,
  History as HistoryIcon,
  ShieldCheck,
  Trash2,
} from "lucide-react";

import {
  login,
  register,
  optimize,
  history,
  deletePrompt,
  getMe,
} from "./api";

import AdminDashboard from "./AdminDashboard";

const emptyResult = {
  score: 0,
  clarity: 0,
  specificity: 0,
  context: 0,
  constraints: 0,
  output_format: 0,
  optimized_prompt: "",
  suggestions: [],
  tags: [],
};

function normalizeScore(value) {
  const number = Number(value);

  if (!Number.isFinite(number)) return 0;

  return Math.max(0, Math.min(100, Math.round(number)));
}

function normalizeResult(data) {
  return {
    score: normalizeScore(data?.score),
    clarity: normalizeScore(data?.clarity),
    specificity: normalizeScore(data?.specificity),
    context: normalizeScore(data?.context),
    constraints: normalizeScore(data?.constraints),
    output_format: normalizeScore(data?.output_format),
    optimized_prompt:
      typeof data?.optimized_prompt === "string"
        ? data.optimized_prompt
        : "",
    suggestions: Array.isArray(data?.suggestions)
      ? [...new Set(data.suggestions.map(String))]
      : [],
    tags: Array.isArray(data?.tags)
      ? [...new Set(data.tags.map(String))]
      : [],
  };
}

function getStoredResult() {
  try {
    const saved = sessionStorage.getItem("promptforge_last_result");
    return saved ? normalizeResult(JSON.parse(saved)) : emptyResult;
  } catch {
    return emptyResult;
  }
}

export default function App() {
  const [mode, setMode] = useState("login");
  const [auth, setAuth] = useState(
    Boolean(localStorage.getItem("token"))
  );

  const [currentUser, setCurrentUser] = useState(null);
  const [checkingUser, setCheckingUser] = useState(
    Boolean(localStorage.getItem("token"))
  );

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
  });

  const [prompt, setPrompt] = useState("");
  const [result, setResult] = useState(getStoredResult);
  const [historyRows, setHistoryRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const [useCase, setUseCase] = useState("DevOps");
  const [tone, setTone] = useState("Professional");
  const [model, setModel] = useState("General");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!auth) {
      setCurrentUser(null);
      setCheckingUser(false);
      return;
    }

    let cancelled = false;
    setCheckingUser(true);

    getMe()
      .then((response) => {
        if (!cancelled) setCurrentUser(response.data);
      })
      .catch((err) => {
        if (cancelled) return;

        localStorage.removeItem("token");
        setCurrentUser(null);
        setAuth(false);
        setError(
          err.response?.data?.detail ||
            "Your session has expired. Please log in again."
        );
      })
      .finally(() => {
        if (!cancelled) setCheckingUser(false);
      });

    return () => {
      cancelled = true;
    };
  }, [auth]);

  useEffect(() => {
    try {
      sessionStorage.setItem(
        "promptforge_last_result",
        JSON.stringify(result)
      );
    } catch (err) {
      console.error("Failed to save result:", err);
    }
  }, [result]);

  useEffect(() => {
    if (auth && currentUser && currentUser.role === "user") {
      loadHistory();
    }
  }, [auth, currentUser]);

  async function loadHistory() {
    try {
      const response = await history();
      setHistoryRows(
        Array.isArray(response.data) ? response.data : []
      );
    } catch (err) {
      console.error("History loading failed:", err);
    }
  }

  async function submitAuth(event) {
    event.preventDefault();
    setError("");

    try {
      const response =
        mode === "login"
          ? await login(form.email, form.password)
          : await register(
              form.name,
              form.email,
              form.password
            );

      localStorage.setItem(
        "token",
        response.data.access_token
      );

      setAuth(true);
      setCurrentUser(null);
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          "Authentication failed"
      );
    }
  }

  async function runOptimize() {
    if (!prompt.trim()) {
      setError("Please enter a prompt first.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await optimize({
        prompt,
        use_case: useCase,
        tone,
        model_target: model,
        title: "Prompt optimization",
      });

      const normalized = normalizeResult(response.data);
      setResult(normalized);

      sessionStorage.setItem(
        "promptforge_last_result",
        JSON.stringify(normalized)
      );

      await loadHistory();
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          "Optimization failed"
      );
    } finally {
      setLoading(false);
    }
  }

  function loadHistoryItem(item) {
    const historyResult = normalizeResult(item);

    setPrompt(item.original_prompt || "");
    setResult(historyResult);
    setError("");

    sessionStorage.setItem(
      "promptforge_last_result",
      JSON.stringify(historyResult)
    );
  }

  async function handleDeletePrompt(id) {
    if (
      !window.confirm(
        "Are you sure you want to delete this prompt from history?"
      )
    ) {
      return;
    }

    setDeletingId(id);
    setError("");

    try {
      await deletePrompt(id);

      setHistoryRows((rows) =>
        rows.filter((row) => row.id !== id)
      );
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          "Failed to delete prompt"
      );
    } finally {
      setDeletingId(null);
    }
  }

  function logout() {
    localStorage.removeItem("token");
    sessionStorage.removeItem("promptforge_last_result");

    setAuth(false);
    setCurrentUser(null);
    setResult(emptyResult);
    setHistoryRows([]);
    setPrompt("");
    setForm({ name: "", email: "", password: "" });
    setError("");
  }

  const metrics = [
    ["Clarity", result.clarity],
    ["Specificity", result.specificity],
    ["Context", result.context],
    ["Constraints", result.constraints],
    ["Output Format", result.output_format],
  ];

  if (!auth) {
    return (
      <div className="auth">
        <div className="card authcard">
          <div className="logo">
            <Sparkles />
            PromptForge AI
          </div>

          <h1>
            {mode === "login"
              ? "Welcome back"
              : "Create your account"}
          </h1>

          <p>Advanced prompt engineering workspace.</p>

          <form onSubmit={submitAuth}>
            {mode === "register" && (
              <input
                placeholder="Name"
                required
                value={form.name}
                onChange={(event) =>
                  setForm({
                    ...form,
                    name: event.target.value,
                  })
                }
              />
            )}

            <input
              type="email"
              placeholder="Email"
              required
              value={form.email}
              onChange={(event) =>
                setForm({
                  ...form,
                  email: event.target.value,
                })
              }
            />

            <input
              type="password"
              placeholder="Password"
              required
              value={form.password}
              onChange={(event) =>
                setForm({
                  ...form,
                  password: event.target.value,
                })
              }
            />

            <button type="submit" className="primary">
              {mode === "login" ? "Login" : "Register"}
            </button>
          </form>

          {error && <div className="error">{error}</div>}

          <button
            className="link"
            type="button"
            onClick={() => {
              setError("");
              setMode((value) =>
                value === "login" ? "register" : "login"
              );
            }}
          >
            {mode === "login"
              ? "Create account"
              : "Back to login"}
          </button>
        </div>
      </div>
    );
  }

  if (checkingUser || !currentUser) {
    return (
      <div className="auth">
        <div className="card authcard">
          <p>Loading your account...</p>
          {error && <div className="error">{error}</div>}
        </div>
      </div>
    );
  }

  if (currentUser.role === "admin") {
    return (
      <>
        <header>
          <div className="brand">
            <Sparkles />
            PromptForge <span>Admin</span>
          </div>

          <div className="headerRight">
            <span>{currentUser.email}</span>
            <button type="button" onClick={logout}>
              <LogOut size={17} />
              Logout
            </button>
          </div>
        </header>

        <AdminDashboard />
      </>
    );
  }

  return (
    <div>
      <header>
        <div className="brand">
          <Sparkles />
          PromptForge <span>AI</span>
        </div>

        <div className="headerRight">
          <span>
            <ShieldCheck size={16} />
            Azure OpenAI
          </span>

          <button type="button" onClick={logout}>
            <LogOut size={17} />
            Logout
          </button>
        </div>
      </header>

      <main>
        <section className="hero">
          <div>
            <p className="eyebrow">
              ADVANCED PROMPT ENGINEERING
            </p>

            <h1>
              Turn rough ideas into{" "}
              <span>production-ready prompts.</span>
            </h1>

            <p>
              Optimize, evaluate, version and reuse prompts
              from one workspace.
            </p>
          </div>
        </section>

        <div className="grid">
          <section className="card editor">
            <div className="sectionTitle">
              <div>
                <h2>Prompt Optimizer</h2>
                <p>Describe what you want the AI to do.</p>
              </div>
              <Sparkles />
            </div>

            <textarea
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              placeholder="Example: Create a Kubernetes troubleshooting guide..."
            />

            <div className="controls">
              <label>
                Use case
                <select
                  value={useCase}
                  onChange={(event) => setUseCase(event.target.value)}
                >
                  <option>DevOps</option>
                  <option>Software Development</option>
                  <option>Career</option>
                  <option>Marketing</option>
                  <option>Research</option>
                  <option>General</option>
                </select>
              </label>

              <label>
                Tone
                <select
                  value={tone}
                  onChange={(event) => setTone(event.target.value)}
                >
                  <option>Professional</option>
                  <option>Beginner Friendly</option>
                  <option>Technical</option>
                  <option>Concise</option>
                  <option>Detailed</option>
                </select>
              </label>

              <label>
                Target
                <select
                  value={model}
                  onChange={(event) => setModel(event.target.value)}
                >
                  <option>General</option>
                  <option>Azure OpenAI</option>
                  <option>ChatGPT</option>
                  <option>Claude</option>
                  <option>Gemini</option>
                </select>
              </label>
            </div>

            <button
              className="primary optimize"
              type="button"
              onClick={runOptimize}
              disabled={loading}
            >
              {loading ? (
                "Optimizing..."
              ) : (
                <>
                  <Sparkles size={18} />
                  Optimize Prompt
                </>
              )}
            </button>

            {error && <div className="error">{error}</div>}
          </section>

          <section className="card result">
            <div className="sectionTitle">
              <div>
                <h2>Optimized Prompt</h2>
                <p>AI-generated prompt and evaluation.</p>
              </div>

              <button
                type="button"
                onClick={() =>
                  navigator.clipboard.writeText(
                    result.optimized_prompt || ""
                  )
                }
                disabled={!result.optimized_prompt}
              >
                <Copy size={17} />
                Copy
              </button>
            </div>

            <div className="output">
              {result.optimized_prompt ||
                "Your optimized prompt will appear here."}
            </div>

            <div className="score">
              <span>Overall Score</span>
              <strong>{normalizeScore(result.score)}</strong>
              <span>/100</span>
            </div>

            <div className="metrics">
              {metrics.map(([label, value]) => {
                const safeValue = normalizeScore(value);

                return (
                  <div className="metricRow" key={label}>
                    <div className="metricHeader">
                      <span className="metricLabel">{label}</span>
                      <b className="metricValue">{safeValue}%</b>
                    </div>

                    <div className="bar">
                      <i style={{ width: `${safeValue}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>

            {result.suggestions.length > 0 && (
              <div className="suggestions">
                <h3>Suggestions</h3>
                {result.suggestions.map((suggestion, index) => (
                  <div key={`${suggestion}-${index}`}>
                    ✓ {suggestion}
                  </div>
                ))}
              </div>
            )}

            {result.tags.length > 0 && (
              <div className="tags">
                {result.tags.map((tag) => (
                  <span key={tag}>
                    #{tag.replace(/^#/, "")}
                  </span>
                ))}
              </div>
            )}
          </section>
        </div>

        <section className="card historyCard">
          <div className="sectionTitle">
            <div>
              <h2 className="historyTitle">
                <HistoryIcon />
                Prompt History
              </h2>
              <p>Recent optimized prompts stored in PostgreSQL.</p>
            </div>
          </div>

          <div className="history">
            {historyRows.map((row) => (
              <div className="historyRow" key={row.id}>
                <button
                  type="button"
                  className="historyContent"
                  onClick={() => loadHistoryItem(row)}
                  disabled={deletingId === row.id}
                >
                  <b>{row.title}</b>
                  <span>
                    {(row.original_prompt || "").slice(0, 90)}
                  </span>
                  <strong>{normalizeScore(row.score)}</strong>
                </button>

                <button
                  type="button"
                  className="deleteButton"
                  title="Delete prompt"
                  onClick={() => handleDeletePrompt(row.id)}
                  disabled={deletingId === row.id}
                >
                  <Trash2 size={17} />
                  {deletingId === row.id ? "Deleting..." : "Delete"}
                </button>
              </div>
            ))}

            {historyRows.length === 0 && (
              <p className="muted">No prompt history yet.</p>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}