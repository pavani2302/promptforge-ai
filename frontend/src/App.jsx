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
} from "./api";


// ============================================================
// EMPTY RESULT
// ============================================================

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


// ============================================================
// SCORE NORMALIZATION
// ============================================================

function normalizeScore(value) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return 0;
  }

  return Math.max(
    0,
    Math.min(100, Math.round(number))
  );
}


// ============================================================
// RESULT NORMALIZATION
// ============================================================

function normalizeResult(data) {
  return {
    score: normalizeScore(data?.score),

    clarity: normalizeScore(
      data?.clarity
    ),

    specificity: normalizeScore(
      data?.specificity
    ),

    context: normalizeScore(
      data?.context
    ),

    constraints: normalizeScore(
      data?.constraints
    ),

    output_format: normalizeScore(
      data?.output_format
    ),

    optimized_prompt:
      typeof data?.optimized_prompt ===
      "string"
        ? data.optimized_prompt
        : "",

    suggestions:
      Array.isArray(data?.suggestions)
        ? [
            ...new Set(
              data.suggestions.map(String)
            ),
          ]
        : [],

    tags:
      Array.isArray(data?.tags)
        ? [
            ...new Set(
              data.tags.map(String)
            ),
          ]
        : [],
  };
}


// ============================================================
// RESTORE LAST RESULT
// ============================================================

function getStoredResult() {
  try {
    const saved =
      sessionStorage.getItem(
        "promptforge_last_result"
      );

    if (!saved) {
      return emptyResult;
    }

    return normalizeResult(
      JSON.parse(saved)
    );
  } catch (error) {
    console.error(
      "Failed to restore PromptForge result:",
      error
    );

    return emptyResult;
  }
}


// ============================================================
// APP
// ============================================================

export default function App() {
  // ==========================================================
  // AUTH
  // ==========================================================

  const [mode, setMode] =
    useState("login");

  const [auth, setAuth] =
    useState(
      !!localStorage.getItem("token")
    );


  // ==========================================================
  // AUTH FORM
  // ==========================================================

  const [form, setForm] =
    useState({
      name: "",
      email: "",
      password: "",
    });


  // ==========================================================
  // PROMPT
  // ==========================================================

  const [prompt, setPrompt] =
    useState("");


  // ==========================================================
  // RESULT
  // ==========================================================

  const [result, setResult] =
    useState(getStoredResult);


  // ==========================================================
  // HISTORY
  // ==========================================================

  const [historyRows, setHistoryRows] =
    useState([]);


  // ==========================================================
  // LOADING
  // ==========================================================

  const [loading, setLoading] =
    useState(false);


  // ==========================================================
  // DELETE STATE
  // ==========================================================

  const [deletingId, setDeletingId] =
    useState(null);


  // ==========================================================
  // CONTROLS
  // ==========================================================

  const [useCase, setUseCase] =
    useState("DevOps");

  const [tone, setTone] =
    useState("Professional");

  const [model, setModel] =
    useState("General");


  // ==========================================================
  // ERROR
  // ==========================================================

  const [error, setError] =
    useState("");


  // ==========================================================
  // LOAD HISTORY WHEN AUTHENTICATED
  // ==========================================================

  useEffect(() => {
    if (auth) {
      loadHistory();
    }
  }, [auth]);


  // ==========================================================
  // SAVE RESULT
  // ==========================================================

  useEffect(() => {
    try {
      sessionStorage.setItem(
        "promptforge_last_result",
        JSON.stringify(result)
      );
    } catch (error) {
      console.error(
        "Failed to save PromptForge result:",
        error
      );
    }
  }, [result]);


  // ==========================================================
  // LOAD HISTORY
  // ==========================================================

  async function loadHistory() {
    try {
      const response =
        await history();

      if (
        Array.isArray(
          response.data
        )
      ) {
        setHistoryRows(
          response.data
        );
      } else {
        setHistoryRows([]);
      }
    } catch (error) {
      console.error(
        "History loading failed:",
        error
      );

      // Do NOT clear the current result.
      // History failure must not affect
      // the score/progress bars.
    }
  }


  // ==========================================================
  // LOGIN / REGISTER
  // ==========================================================

  async function submitAuth(e) {
    e.preventDefault();

    setError("");

    try {
      const response =
        mode === "login"
          ? await login(
              form.email,
              form.password
            )
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
    } catch (e) {
      setError(
        e.response?.data?.detail ||
          "Authentication failed"
      );
    }
  }


  // ==========================================================
  // OPTIMIZE PROMPT
  // ==========================================================

  async function runOptimize() {
    if (!prompt.trim()) {
      setError(
        "Please enter a prompt first."
      );

      return;
    }

    setLoading(true);
    setError("");

    try {
      const response =
        await optimize({
          prompt,
          use_case: useCase,
          tone,
          model_target: model,
          title: "Prompt optimization",
        });


      // ------------------------------------------------------
      // API RESPONSE
      // ------------------------------------------------------

      console.log(
        "PromptForge API response:",
        response.data
      );


      // ------------------------------------------------------
      // NORMALIZE
      // ------------------------------------------------------

      const normalized =
        normalizeResult(
          response.data
        );


      console.log(
        "PromptForge normalized result:",
        normalized
      );


      // ------------------------------------------------------
      // UPDATE RESULT
      // ------------------------------------------------------

      setResult(normalized);


      // ------------------------------------------------------
      // SAVE RESULT IMMEDIATELY
      // ------------------------------------------------------

      sessionStorage.setItem(
        "promptforge_last_result",
        JSON.stringify(
          normalized
        )
      );


      // ------------------------------------------------------
      // REFRESH HISTORY
      //
      // This does NOT change result.
      // ------------------------------------------------------

      await loadHistory();
    } catch (e) {
      console.error(
        "Optimization error:",
        e
      );

      setError(
        e.response?.data?.detail ||
          "Optimization failed"
      );
    } finally {
      setLoading(false);
    }
  }


  // ==========================================================
  // LOAD HISTORY ITEM
  // ==========================================================

  function loadHistoryItem(item) {
    const historyResult =
      normalizeResult({
        score:
          item.score,

        clarity:
          item.clarity,

        specificity:
          item.specificity,

        context:
          item.context,

        constraints:
          item.constraints,

        output_format:
          item.output_format,

        optimized_prompt:
          item.optimized_prompt,

        suggestions:
          item.suggestions,

        tags:
          item.tags,
      });


    // Restore original prompt
    setPrompt(
      item.original_prompt || ""
    );


    // Restore metrics/result
    setResult(
      historyResult
    );


    // Save to session
    sessionStorage.setItem(
      "promptforge_last_result",
      JSON.stringify(
        historyResult
      )
    );


    setError("");
  }


  // ==========================================================
  // DELETE PROMPT
  // ==========================================================

  async function handleDeletePrompt(
    id
  ) {
    const confirmed =
      window.confirm(
        "Are you sure you want to delete this prompt from history?"
      );

    if (!confirmed) {
      return;
    }

    setDeletingId(id);
    setError("");

    try {
      await deletePrompt(id);


      // Remove only the deleted row.
      //
      // IMPORTANT:
      // We intentionally DO NOT call setResult().
      // Therefore the current score and progress
      // bars remain unchanged.

      setHistoryRows(
        (currentRows) =>
          currentRows.filter(
            (row) =>
              row.id !== id
          )
      );
    } catch (error) {
      console.error(
        "Failed to delete prompt:",
        error
      );

      setError(
        error.response?.data?.detail ||
          "Failed to delete prompt"
      );
    } finally {
      setDeletingId(null);
    }
  }


  // ==========================================================
  // LOGOUT
  // ==========================================================

  function logout() {
    localStorage.removeItem(
      "token"
    );

    sessionStorage.removeItem(
      "promptforge_last_result"
    );

    setAuth(false);

    setResult(
      emptyResult
    );

    setHistoryRows([]);

    setPrompt("");

    setError("");
  }


  // ==========================================================
  // METRICS
  // ==========================================================

  const metrics = [
    [
      "Clarity",
      result.clarity,
    ],

    [
      "Specificity",
      result.specificity,
    ],

    [
      "Context",
      result.context,
    ],

    [
      "Constraints",
      result.constraints,
    ],

    [
      "Output Format",
      result.output_format,
    ],
  ];


  // ==========================================================
  // LOGIN / REGISTER SCREEN
  // ==========================================================

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


          <p>
            Advanced prompt engineering
            workspace.
          </p>


          <form
            onSubmit={
              submitAuth
            }
          >

            {mode ===
              "register" && (
              <input
                placeholder="Name"
                value={
                  form.name
                }
                onChange={(e) =>
                  setForm({
                    ...form,
                    name:
                      e.target.value,
                  })
                }
              />
            )}


            <input
              type="email"
              placeholder="Email"
              value={
                form.email
              }
              onChange={(e) =>
                setForm({
                  ...form,
                  email:
                    e.target.value,
                })
              }
            />


            <input
              type="password"
              placeholder="Password"
              value={
                form.password
              }
              onChange={(e) =>
                setForm({
                  ...form,
                  password:
                    e.target.value,
                })
              }
            />


            <button
              type="submit"
              className="primary"
            >
              {mode ===
              "login"
                ? "Login"
                : "Register"}
            </button>

          </form>


          {error && (
            <div className="error">
              {error}
            </div>
          )}


          <button
            className="link"
            onClick={() =>
              setMode(
                mode ===
                  "login"
                  ? "register"
                  : "login"
              )
            }
          >
            {mode ===
            "login"
              ? "Create account"
              : "Back to login"}
          </button>

        </div>

      </div>
    );
  }


  // ==========================================================
  // MAIN APPLICATION
  // ==========================================================

  return (
    <div>

      {/* ======================================================
          HEADER
      ====================================================== */}

      <header>

        <div className="brand">

          <Sparkles />

          PromptForge{" "}
          <span>AI</span>

        </div>


        <div className="headerRight">

          <span>

            <ShieldCheck
              size={16}
            />

            Azure OpenAI

          </span>


          <button
            onClick={
              logout
            }
          >

            <LogOut
              size={17}
            />

            Logout

          </button>

        </div>

      </header>


      {/* ======================================================
          MAIN
      ====================================================== */}

      <main>

        {/* ====================================================
            HERO
        ==================================================== */}

        <section className="hero">

          <div>

            <p className="eyebrow">
              ADVANCED PROMPT
              ENGINEERING
            </p>


            <h1>

              Turn rough ideas
              into{" "}

              <span>
                production-ready
                prompts.
              </span>

            </h1>


            <p>
              Optimize, evaluate,
              version and reuse
              prompts from one
              workspace.
            </p>

          </div>

        </section>


        {/* ====================================================
            EDITOR + RESULT
        ==================================================== */}

        <div className="grid">

          {/* ==================================================
              PROMPT EDITOR
          ================================================== */}

          <section className="card editor">

            <div className="sectionTitle">

              <div>

                <h2>
                  Prompt Optimizer
                </h2>

                <p>
                  Describe what you
                  want the AI to do.
                </p>

              </div>

              <Sparkles />

            </div>


            <textarea
              value={
                prompt
              }
              onChange={(e) =>
                setPrompt(
                  e.target.value
                )
              }
              placeholder="Example: Create a Kubernetes troubleshooting guide..."
            />


            {/* ==============================================
                CONTROLS
            ============================================== */}

            <div className="controls">

              <label>

                Use case

                <select
                  value={
                    useCase
                  }
                  onChange={(e) =>
                    setUseCase(
                      e.target.value
                    )
                  }
                >

                  <option>
                    DevOps
                  </option>

                  <option>
                    Software Development
                  </option>

                  <option>
                    Career
                  </option>

                  <option>
                    Marketing
                  </option>

                  <option>
                    Research
                  </option>

                  <option>
                    General
                  </option>

                </select>

              </label>


              <label>

                Tone

                <select
                  value={
                    tone
                  }
                  onChange={(e) =>
                    setTone(
                      e.target.value
                    )
                  }
                >

                  <option>
                    Professional
                  </option>

                  <option>
                    Beginner Friendly
                  </option>

                  <option>
                    Technical
                  </option>

                  <option>
                    Concise
                  </option>

                  <option>
                    Detailed
                  </option>

                </select>

              </label>


              <label>

                Target

                <select
                  value={
                    model
                  }
                  onChange={(e) =>
                    setModel(
                      e.target.value
                    )
                  }
                >

                  <option>
                    General
                  </option>

                  <option>
                    Azure OpenAI
                  </option>

                  <option>
                    ChatGPT
                  </option>

                  <option>
                    Claude
                  </option>

                  <option>
                    Gemini
                  </option>

                </select>

              </label>

            </div>


            {/* ==============================================
                OPTIMIZE BUTTON
            ============================================== */}

            <button
              className="primary optimize"
              onClick={
                runOptimize
              }
              disabled={
                loading
              }
            >

              {loading ? (
                "Optimizing..."
              ) : (
                <>
                  <Sparkles
                    size={18}
                  />

                  Optimize Prompt
                </>
              )}

            </button>


            {error && (
              <div className="error">
                {error}
              </div>
            )}

          </section>


          {/* ==================================================
              RESULT
          ================================================== */}

          <section className="card result">

            <div className="sectionTitle">

              <div>

                <h2>
                  Optimized Prompt
                </h2>

                <p>
                  AI-generated
                  production-ready
                  version.
                </p>

              </div>


              <button
                onClick={() =>
                  navigator.clipboard.writeText(
                    result.optimized_prompt ||
                      ""
                  )
                }
                disabled={
                  !result.optimized_prompt
                }
              >

                <Copy
                  size={17}
                />

                Copy

              </button>

            </div>


            {/* ==============================================
                OPTIMIZED PROMPT
            ============================================== */}

            <div className="output">

              {result.optimized_prompt ||
                "Your optimized prompt will appear here."}

            </div>


            {/* ==============================================
                OVERALL SCORE
            ============================================== */}

            <div className="score">

              <span>
                Overall Score
              </span>


              <strong>
                {normalizeScore(
                  result.score
                )}
              </strong>


              <span>
                /100
              </span>

            </div>


            {/* ==============================================
                METRICS
            ============================================== */}

            <div className="metrics">

              {metrics.map(
                ([
                  label,
                  value,
                ]) => {

                  const safeValue =
                    normalizeScore(
                      value
                    );


                  return (
                    <div
                      className="metricRow"
                      key={
                        label
                      }
                    >

                      <div className="metricHeader">

                        <span className="metricLabel">
                          {label}
                        </span>


                        <b className="metricValue">
                          {safeValue}%
                        </b>

                      </div>


                      <div className="bar">

                        <i
                          style={{
                            width: `${safeValue}%`,
                          }}
                        />

                      </div>

                    </div>
                  );
                }
              )}

            </div>


            {/* ==============================================
                SUGGESTIONS
            ============================================== */}

            {result.suggestions
              .length > 0 && (

              <div className="suggestions">

                <h3>
                  Suggestions
                </h3>


                {result.suggestions.map(
                  (
                    suggestion,
                    index
                  ) => (

                    <div
                      key={`${suggestion}-${index}`}
                    >

                      ✓{" "}
                      {suggestion}

                    </div>

                  )
                )}

              </div>

            )}


            {/* ==============================================
                TAGS
            ============================================== */}

            {result.tags.length >
              0 && (

              <div className="tags">

                {[
                  ...new Set(
                    result.tags
                  ),
                ].map(
                  (tag) => (

                    <span
                      key={
                        tag
                      }
                    >

                      #
                      {tag.replace(
                        /^#/,
                        ""
                      )}

                    </span>

                  )
                )}

              </div>

            )}

          </section>

        </div>


        {/* ====================================================
            HISTORY
        ==================================================== */}

        <section className="card historyCard">

          <div className="sectionTitle">

            <div>

              <h2 className="historyTitle">

                <HistoryIcon />

                Prompt History

              </h2>


              <p>
                Recent optimized
                prompts stored in
                PostgreSQL.
              </p>

            </div>

          </div>


          <div className="history">

            {historyRows.map(
              (row) => (

                <div
                  className="historyRow"
                  key={
                    row.id
                  }
                >

                  {/* ==========================================
                      HISTORY ITEM
                  ========================================== */}

                  <button
                    className="historyContent"
                    onClick={() =>
                      loadHistoryItem(
                        row
                      )
                    }
                    disabled={
                      deletingId ===
                      row.id
                    }
                  >

                    <b>
                      {row.title}
                    </b>


                    <span>
                      {(
                        row.original_prompt ||
                        ""
                      ).slice(
                        0,
                        90
                      )}
                    </span>


                    <strong>
                      {normalizeScore(
                        row.score
                      )}
                    </strong>

                  </button>


                  {/* ==========================================
                      DELETE
                  ========================================== */}

                  <button
                    className="deleteButton"
                    title="Delete prompt"
                    aria-label={`Delete ${row.title}`}
                    onClick={() =>
                      handleDeletePrompt(
                        row.id
                      )
                    }
                    disabled={
                      deletingId ===
                      row.id
                    }
                  >

                    <Trash2
                      size={17}
                    />


                    {deletingId ===
                    row.id
                      ? "Deleting..."
                      : "Delete"}

                  </button>

                </div>

              )
            )}


            {/* ==============================================
                EMPTY HISTORY
            ============================================== */}

            {historyRows.length ===
              0 && (

              <p className="muted">
                No prompt history yet.
              </p>

            )}

          </div>

        </section>

      </main>

    </div>
  );
}