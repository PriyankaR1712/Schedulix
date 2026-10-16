
import "./App.css";

function App() {
  return (
    <main className="app-shell">
      <nav className="navbar">
        <a className="brand" href="/">
          <span className="brand-mark">S</span>
          <span>Schedulix</span>
        </a>
        <span className="nav-label">OS LAB + JOB ENGINE</span>
      </nav>

      <section className="hero">
        <div className="eyebrow">
          <span className="status-dot" />
          SYSTEM WORKSPACE
        </div>

        <h1>
          Schedule smarter.
          <br />
          <span>Execute reliably.</span>
        </h1>

        <p className="hero-description">
          Explore CPU scheduling algorithms, visualize process execution,
          and manage background jobs in one unified workspace.
        </p>

        <div className="module-grid">
          <article className="module-card">
            <div className="card-icon">01</div>
            <p className="card-label">MODULE ONE</p>
            <h2>CPU Scheduling</h2>
            <p>
              Simulate scheduling algorithms, compare performance metrics,
              and visualize execution with a Gantt chart.
            </p>
            <span className="coming-soon">PLANNED</span>
          </article>

          <article className="module-card">
            <div className="card-icon">02</div>
            <p className="card-label">MODULE TWO</p>
            <h2>Background Jobs</h2>
            <p>
              Submit predefined tasks, track execution status,
              inspect failures, and monitor workers.
            </p>
            <span className="coming-soon">PLANNED</span>
          </article>
        </div>

        <div className="footer-note">
          <span className="status-dot" />
          Frontend workspace initialized
          <span className="separator">·</span>
          API integration pending
        </div>
      </section>
    </main>
  );
}

export default App;
