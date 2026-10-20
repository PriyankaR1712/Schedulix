
import { useCallback, useEffect, useState } from "react";
import "./App.css";

const API_BASE = "http://127.0.0.1:8000";

type Job = {
  id: number;
  name: string;
  task_type: string;
  status: string;
  priority: number;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  error_message: string | null;
  input_data: Record<string, unknown> | null;
  result: string | null;
  retry_count: number;
  max_retries: number;
};

type JobAttempt = {
  id: number;
  job_id: number;
  attempt_number: number;
  status: string;
  started_at: string;
  completed_at: string | null;
  error_message: string | null;
  result: string | null;
};

function formatDate(value: string | null) {
  if (!value) return "—";

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function App() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [jobName, setJobName] = useState("");
  const [taskType, setTaskType] = useState("report");
  const [priority, setPriority] = useState(3);
  const [maxRetries, setMaxRetries] = useState(2);
  const [csvFilePath, setCsvFilePath] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [createSuccess, setCreateSuccess] = useState("");
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [attempts, setAttempts] = useState<JobAttempt[]>([]);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState("");

  const fetchJobs = useCallback(async () => {
    setRefreshing(true);

    try {
      const params = new URLSearchParams({
        limit: "20",
        offset: "0",
      });

      if (statusFilter) {
        params.set("status_filter", statusFilter);
      }

      const response = await fetch(
        `${API_BASE}/jobs/?${params.toString()}`,
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch jobs (${response.status})`);
      }

      const data: Job[] = await response.json();
      setJobs(data);
      setError("");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not connect to the Schedulix API.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [statusFilter]);

  const openJobDetails = async (job: Job) => {
    setSelectedJob(job);
    setAttempts([]);
    setDetailsError("");
    setDetailsLoading(true);

    try {
      const [jobResponse, attemptsResponse] = await Promise.all([
        fetch(`${API_BASE}/jobs/${job.id}`),
        fetch(`${API_BASE}/jobs/${job.id}/attempts`),
      ]);

      if (!jobResponse.ok || !attemptsResponse.ok) {
        throw new Error("Could not load job details.");
      }

      const [jobData, attemptsData] = await Promise.all([
        jobResponse.json(),
        attemptsResponse.json(),
      ]);

      setSelectedJob(jobData);
      setAttempts(attemptsData);
    } catch (err) {
      setDetailsError(
        err instanceof Error
          ? err.message
          : "Failed to load job details.",
      );
    } finally {
      setDetailsLoading(false);
    }
  };
  
const handleCreateJob = async (
  event: React.FormEvent<HTMLFormElement>,
) => {
  event.preventDefault();

  setCreating(true);
  setCreateError("");
  setCreateSuccess("");

  const inputData =
    taskType === "csv_summary"
      ? { file_path: csvFilePath.trim() }
      : {};

  try {
    const response = await fetch(`${API_BASE}/jobs/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: jobName.trim(),
        task_type: taskType,
        priority,
        max_retries: maxRetries,
        input_data: inputData,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      const message =
        typeof data.detail === "string"
          ? data.detail
          : "Could not create the job. Check the submitted values.";

      throw new Error(message);
    }

    setCreateSuccess(`Job #${data.id} was created successfully!`);
    setJobName("");
    setTaskType("report");
    setPriority(3);
    setMaxRetries(2);
    setCsvFilePath("");
    setShowCreateForm(false);

    await fetchJobs();
  } catch (err) {
    setCreateError(
      err instanceof Error
        ? err.message
        : "Could not connect to the Schedulix API.",
    );
  } finally {
    setCreating(false);
  }
};

  useEffect(() => {
    void fetchJobs();
  }, [fetchJobs]);

  const counts = {
    total: jobs.length,
    queued: jobs.filter((job) => job.status === "queued").length,
    running: jobs.filter((job) => job.status === "running").length,
    completed: jobs.filter((job) => job.status === "completed").length,
    failed: jobs.filter((job) => job.status === "failed").length,
    cancelled: jobs.filter((job) => job.status === "cancelled").length,
  };

  return (
    <main className="app-shell">
      <nav className="navbar">
        <a className="brand" href="/">
          <span className="brand-mark">S</span>
          <span>Schedulix</span>
        </a>
        <span className="nav-label">OS LAB + JOB ENGINE</span>
      </nav>

      <section className="dashboard">
        
<div className="dashboard-heading">
  <div>
    <p className="card-label">BACKGROUND JOB ENGINE</p>
    <h1>Job monitoring</h1>
    <p className="dashboard-description">
      Monitor executions, retries, and failures from your live API.
    </p>
  </div>

  <div className="dashboard-actions">
    <button
      className="refresh-button"
      onClick={() => setShowCreateForm((visible) => !visible)}
    >
      {showCreateForm ? "Close form" : "+ Create job"}
    </button>

    <button
      className="refresh-button"
      onClick={() => void fetchJobs()}
      disabled={refreshing}
    >
      {refreshing ? "Refreshing..." : "↻ Refresh"}
    </button>
  </div>
</div>

{createSuccess && (
  <div className="success-message">{createSuccess}</div>
)}

{showCreateForm && (
  <section className="jobs-panel create-job-panel">
    <div className="jobs-toolbar">
      <div>
        <h2>Create a background job</h2>
        <p>Submit a task to the Schedulix worker queue.</p>
      </div>
    </div>

    <form className="create-job-form" onSubmit={handleCreateJob}>
      <label>
        Job name
        <input
          type="text"
          value={jobName}
          onChange={(event) => setJobName(event.target.value)}
          placeholder="e.g. Generate weekly report"
          maxLength={120}
          required
        />
      </label>

      <label>
        Task type
        <select
          value={taskType}
          onChange={(event) => setTaskType(event.target.value)}
        >
          <option value="report">Generate report</option>
          <option value="csv_summary">Summarize CSV</option>
        </select>
      </label>

      {taskType === "csv_summary" && (
        <label className="full-width-field">
          CSV file path on the backend machine
          <input
            type="text"
            value={csvFilePath}
            onChange={(event) => setCsvFilePath(event.target.value)}
            placeholder="C:/Users/PRIYANKA/Documents/Schedulix/sample.csv"
            required
          />
        </label>
      )}

      <label>
        Priority
        <select
          value={priority}
          onChange={(event) => setPriority(Number(event.target.value))}
        >
          <option value={1}>1 — Highest</option>
          <option value={2}>2 — High</option>
          <option value={3}>3 — Normal</option>
          <option value={4}>4 — Low</option>
          <option value={5}>5 — Lowest</option>
        </select>
      </label>

      <label>
        Maximum retries
        <select
          value={maxRetries}
          onChange={(event) => setMaxRetries(Number(event.target.value))}
        >
          <option value={0}>0 — No retries</option>
          <option value={1}>1 retry</option>
          <option value={2}>2 retries</option>
          <option value={3}>3 retries</option>
          <option value={4}>4 retries</option>
          <option value={5}>5 retries</option>
        </select>
      </label>

      {createError && (
        <div className="error-message form-feedback">{createError}</div>
      )}

      <div className="form-actions">
        <button
          type="button"
          className="secondary-button"
          onClick={() => setShowCreateForm(false)}
        >
          Cancel
        </button>

        <button
          type="submit"
          className="submit-button"
          disabled={creating}
        >
          {creating ? "Creating..." : "Create job"}
        </button>
      </div>
    </form>
  </section>
)}


        <div className="stats-grid">
          <article className="stat-card">
            <span>Total jobs shown</span>
            <strong>{counts.total}</strong>
          </article>
          <article className="stat-card">
            <span>Queued</span>
            <strong>{counts.queued}</strong>
          </article>
          <article className="stat-card">
            <span>Running</span>
            <strong>{counts.running}</strong>
          </article>
          <article className="stat-card">
            <span>Completed</span>
            <strong>{counts.completed}</strong>
          </article>
          <article className="stat-card">
            <span>Failed</span>
            <strong>{counts.failed}</strong>
          </article>
          <article className="stat-card">
            <span>Cancelled</span>
            <strong>{counts.cancelled}</strong>
          </article>
        </div>

        <section className="jobs-panel">
          <div className="jobs-toolbar">
            <div>
              <h2>Background jobs</h2>
              <p>Click any job to inspect its execution history</p>
            </div>

            <label className="filter-control">
              <span>Status</span>
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
              >
                <option value="">All statuses</option>
                <option value="queued">Queued</option>
                <option value="running">Running</option>
                <option value="completed">Completed</option>
                <option value="failed">Failed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </label>
          </div>

          {error && <div className="error-message">{error}</div>}

          {loading ? (
            <p className="empty-state">Loading jobs...</p>
          ) : jobs.length === 0 ? (
            <p className="empty-state">
              {error ? "Jobs could not be loaded." : "No jobs found."}
            </p>
          ) : (
            <div className="table-wrapper">
              <table className="jobs-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Job</th>
                    <th>Task</th>
                    <th>Status</th>
                    <th>Priority</th>
                    <th>Retries</th>
                    <th>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {jobs.map((job) => (
                    <tr
                      key={job.id}
                      className="clickable-job-row"
                      onClick={() => void openJobDetails(job)}
                      title={`View details for job #${job.id}`}
                    >
                      <td>#{job.id}</td>
                      <td className="job-name">{job.name}</td>
                      <td>{job.task_type}</td>
                      <td>
                        <span
                          className={`status-badge status-${job.status}`}
                        >
                          {job.status}
                        </span>
                      </td>
                      <td>{job.priority}</td>
                      <td>
                        {job.retry_count}/{job.max_retries}
                      </td>
                      <td>{formatDate(job.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {selectedJob && (
          <section className="jobs-panel job-details-panel">
            <div className="jobs-toolbar">
              <div>
                <p className="card-label">JOB DETAILS</p>
                <h2>
                  #{selectedJob.id} — {selectedJob.name}
                </h2>
                <p>
                  Inspect the job result and individual execution attempts.
                </p>
              </div>

              <button
                className="refresh-button"
                onClick={() => setSelectedJob(null)}
              >
                Close
              </button>
            </div>

            {detailsLoading ? (
              <p className="empty-state">Loading job details...</p>
            ) : detailsError ? (
              <div className="error-message">{detailsError}</div>
            ) : (
              <div className="job-details-content">
                <div className="detail-grid">
                  <div className="detail-item">
                    <span>Status</span>
                    <strong>{selectedJob.status}</strong>
                  </div>
                  <div className="detail-item">
                    <span>Task type</span>
                    <strong>{selectedJob.task_type}</strong>
                  </div>
                  <div className="detail-item">
                    <span>Priority</span>
                    <strong>{selectedJob.priority}</strong>
                  </div>
                  <div className="detail-item">
                    <span>Retries used</span>
                    <strong>
                      {selectedJob.retry_count}/{selectedJob.max_retries}
                    </strong>
                  </div>
                  <div className="detail-item">
                    <span>Created</span>
                    <strong>{formatDate(selectedJob.created_at)}</strong>
                  </div>
                  <div className="detail-item">
                    <span>Started</span>
                    <strong>{formatDate(selectedJob.started_at)}</strong>
                  </div>
                  <div className="detail-item">
                    <span>Completed</span>
                    <strong>{formatDate(selectedJob.completed_at)}</strong>
                  </div>
                </div>

                {selectedJob.error_message && (
                  <div className="error-message">
                    <strong>Latest error</strong>
                    <p>{selectedJob.error_message}</p>
                  </div>
                )}

                <h3 className="attempts-heading">
                  Execution attempts ({attempts.length})
                </h3>

                {attempts.length === 0 ? (
                  <p className="empty-state">
                    No execution attempts recorded for this job yet.
                  </p>
                ) : (
                  <div className="attempt-list">
                    {attempts.map((attempt) => (
                      <article className="attempt-card" key={attempt.id}>
                        <div className="attempt-card-heading">
                          <div>
                            <h4>Attempt {attempt.attempt_number}</h4>
                            <p>Record ID: {attempt.id}</p>
                          </div>
                          <span
                            className={`status-badge status-${attempt.status}`}
                          >
                            {attempt.status}
                          </span>
                        </div>

                        <div className="attempt-times">
                          <span>
                            <strong>Started:</strong>{" "}
                            {formatDate(attempt.started_at)}
                          </span>
                          <span>
                            <strong>Finished:</strong>{" "}
                            {formatDate(attempt.completed_at)}
                          </span>
                        </div>

                        {attempt.error_message && (
                          <div className="attempt-error">
                            {attempt.error_message}
                          </div>
                        )}

                        {attempt.result && (
                          <details className="attempt-result">
                            <summary>View result</summary>
                            <pre>{attempt.result}</pre>
                          </details>
                        )}
                      </article>
                    ))}
                  </div>
                )}
              </div>
            )}
          </section>
        )}

        <p className="dashboard-footer">
          Schedulix · Live data from FastAPI and PostgreSQL
        </p>
      </section>
    </main>
  );
}

export default App;
