
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

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString();
}

function formatResult(value: string | null) {
  if (!value) return "No result available yet.";

  try {
    return JSON.stringify(JSON.parse(value), null, 2);
  } catch {
    return value;
  }
}

function App() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [allJobs, setAllJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [refreshing, setRefreshing] = useState(false);

  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [attempts, setAttempts] = useState<JobAttempt[]>([]);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState("");

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [jobName, setJobName] = useState("");
  const [taskType, setTaskType] = useState("report");
  const [priority, setPriority] = useState(3);
  const [maxRetries, setMaxRetries] = useState(2);
  const [csvFilePath, setCsvFilePath] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [createSuccess, setCreateSuccess] = useState("");

  const [cancellingJobId, setCancellingJobId] = useState<number | null>(
    null,
  );

  const fetchJobs = useCallback(async () => {
    setRefreshing(true);
    setError("");

    try {
      const params = new URLSearchParams({
        limit: "20",
        offset: "0",
      });

      if (statusFilter !== "all") {
        params.set("status_filter", statusFilter);
      }

      const response = await fetch(
        `${API_BASE}/jobs/?${params.toString()}`,
      );

      if (!response.ok) {
        throw new Error("Could not load jobs from the API.");
      }

      const data: Job[] = await response.json();
      setJobs(data);

      if (statusFilter === "all") {
        setAllJobs(data);
      } else {
        const allResponse = await fetch(
        `${API_BASE}/jobs/?limit=100&offset=0`,
        );

        if (allResponse.ok) {
          const allData: Job[] = await allResponse.json();
          setAllJobs(allData);
        }
      }
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

      if (!jobResponse.ok) {
        throw new Error("Could not load job details.");
      }

      if (!attemptsResponse.ok) {
        throw new Error("Could not load execution history.");
      }

      const jobData: Job = await jobResponse.json();
      const attemptsData: JobAttempt[] =
        await attemptsResponse.json();

      setSelectedJob(jobData);
      setAttempts(attemptsData);
    } catch (err) {
      setDetailsError(
        err instanceof Error
          ? err.message
          : "Could not load job details.",
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

  const handleCancelJob = async (jobId: number) => {
    const confirmed = window.confirm(
      `Are you sure you want to cancel job #${jobId}?`,
    );

    if (!confirmed) return;

    setCancellingJobId(jobId);
    setError("");

    try {
      const response = await fetch(
        `${API_BASE}/jobs/${jobId}/cancel`,
        { method: "POST" },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          typeof data.detail === "string"
            ? data.detail
            : "Could not cancel this job.",
        );
      }

      await fetchJobs();

      if (selectedJob?.id === jobId) {
        const jobResponse = await fetch(
          `${API_BASE}/jobs/${jobId}`,
        );

        if (jobResponse.ok) {
          const updatedJob: Job = await jobResponse.json();
          setSelectedJob(updatedJob);
          await openJobDetails(updatedJob);
        }
      }
    } catch (err) {
      window.alert(
        err instanceof Error
          ? err.message
          : "Could not connect to the Schedulix API.",
      );
    } finally {
      setCancellingJobId(null);
    }
  };

  useEffect(() => {
    void fetchJobs();
  }, [fetchJobs]);

  const totalJobs = allJobs.length;

const queuedJobs = allJobs.filter(
  (job) => job.status === "queued",
).length;

const runningJobs = allJobs.filter(
  (job) => job.status === "running",
).length;

const completedJobs = allJobs.filter(
  (job) => job.status === "completed",
).length;

const failedJobs = allJobs.filter(
  (job) => job.status === "failed",
).length;

const cancelledJobs = allJobs.filter(
  (job) => job.status === "cancelled",
).length;

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-icon">S</div>
          <div>
            <h2>Schedulix</h2>
            <p>Background job orchestration</p>
          </div>
        </div>

        <div className="api-indicator">
          <span className="status-dot" />
          Local API
        </div>
      </header>

      <main className="dashboard">
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
              type="button"
              className="refresh-button"
              onClick={() =>
                setShowCreateForm((visible) => !visible)
              }
            >
              {showCreateForm ? "Close form" : "+ Create job"}
            </button>

            <button
              type="button"
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

            <form
              className="create-job-form"
              onSubmit={handleCreateJob}
            >
              <label>
                Job name
                <input
                  type="text"
                  value={jobName}
                  onChange={(event) =>
                    setJobName(event.target.value)
                  }
                  placeholder="e.g. Generate weekly report"
                  maxLength={120}
                  required
                />
              </label>

              <label>
                Task type
                <select
                  value={taskType}
                  onChange={(event) =>
                    setTaskType(event.target.value)
                  }
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
                    onChange={(event) =>
                      setCsvFilePath(event.target.value)
                    }
                    placeholder="C:/Users/PRIYANKA/Documents/Schedulix/sample.csv"
                    required
                  />
                </label>
              )}

              <label>
                Priority
                <select
                  value={priority}
                  onChange={(event) =>
                    setPriority(Number(event.target.value))
                  }
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
                  onChange={(event) =>
                    setMaxRetries(Number(event.target.value))
                  }
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
                <div className="error-message form-feedback">
                  {createError}
                </div>
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

        {error && (
          <div className="error-message">
            {error}
            <button
              type="button"
              className="secondary-button"
              onClick={() => void fetchJobs()}
            >
              Try again
            </button>
          </div>
        )}

        <section className="stats-grid">
          <div className="stat-card">
            <p>Total jobs shown</p>
            <h2>{totalJobs}</h2>
            <span>Latest 20 jobs</span>
          </div>

          <div className="stat-card">
            <p>Queued</p>
            <h2>{queuedJobs}</h2>
            <span>Waiting for a worker</span>
          </div>

          <div className="stat-card">
            <p>Running</p>
            <h2>{runningJobs}</h2>
            <span>Currently processing</span>
          </div>

          <div className="stat-card">
            <p>Completed</p>
            <h2>{completedJobs}</h2>
            <span>Successfully finished</span>
          </div>

          <div className="stat-card">
            <p>Failed</p>
            <h2>{failedJobs}</h2>
            <span>Needs investigation</span>
          </div>
          
          <div className="stat-card">
            <p>Cancelled</p>
            <h2>
              {cancelledJobs}
            </h2>
            <span>Cancelled before execution</span>
          </div>

        </section>

        <section className="jobs-panel">
          <div className="jobs-toolbar">
            <div>
              <h2>Background jobs</h2>
              <p>Select a job to inspect its result and attempt history.</p>
            </div>

            <select
              className="status-filter"
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value)
              }
              aria-label="Filter jobs by status"
            >
              <option value="all">All statuses</option>
              <option value="queued">Queued</option>
              <option value="running">Running</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          {loading ? (
            <div className="empty-state">Loading jobs...</div>
          ) : jobs.length === 0 ? (
            <div className="empty-state">
              No jobs found for this filter.
            </div>
          ) : (
            <div className="table-container">
              <table className="jobs-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Name</th>
                    <th>Task type</th>
                    <th>Status</th>
                    <th>Priority</th>
                    <th>Retries</th>
                    <th>Created</th>
                    <th>Actions</th>
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
                      <td>
                        {job.status === "queued" && (
                          <button
                            type="button"
                            className="cancel-job-button"
                            disabled={cancellingJobId === job.id}
                            onClick={(event) => {
                              event.stopPropagation();
                              void handleCancelJob(job.id);
                            }}
                          >
                            {cancellingJobId === job.id
                              ? "Cancelling..."
                              : "Cancel"}
                          </button>
                        )}
                      </td>
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
                  Inspect the current state, output, and execution attempts.
                </p>
              </div>

              <button
                type="button"
                className="refresh-button"
                onClick={() => setSelectedJob(null)}
              >
                Close details
              </button>
            </div>

            {detailsLoading && (
              <div className="empty-state">
                Loading job details...
              </div>
            )}

            {detailsError && (
              <div className="error-message">{detailsError}</div>
            )}

            {!detailsLoading && !detailsError && (
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
                    <span>Retries</span>
                    <strong>
                      {selectedJob.retry_count} /{" "}
                      {selectedJob.max_retries}
                    </strong>
                  </div>

                  <div className="detail-item">
                    <span>Created at</span>
                    <strong>
                      {formatDate(selectedJob.created_at)}
                    </strong>
                  </div>

                  <div className="detail-item">
                    <span>Started at</span>
                    <strong>
                      {formatDate(selectedJob.started_at)}
                    </strong>
                  </div>

                  <div className="detail-item">
                    <span>Completed at</span>
                    <strong>
                      {formatDate(selectedJob.completed_at)}
                    </strong>
                  </div>
                </div>

                {selectedJob.error_message && (
                  <div className="error-message">
                    <strong>Error:</strong>{" "}
                    {selectedJob.error_message}
                  </div>
                )}

                <div className="detail-section">
                  <h3>Execution result</h3>
                  <pre className="result-output">
                    {formatResult(selectedJob.result)}
                  </pre>
                </div>

                {selectedJob.input_data && (
                  <div className="detail-section">
                    <h3>Input data</h3>
                    <pre className="result-output">
                      {JSON.stringify(
                        selectedJob.input_data,
                        null,
                        2,
                      )}
                    </pre>
                  </div>
                )}

                <div className="detail-section">
                  <h3>Execution history</h3>

                  {attempts.length === 0 ? (
                    <p className="empty-state">
                      No execution attempts recorded yet.
                    </p>
                  ) : (
                    <div className="attempt-list">
                      {attempts.map((attempt) => (
                        <div
                          className="attempt-card"
                          key={attempt.id}
                        >
                          <div className="attempt-heading">
                            <div>
                              <strong>
                                Attempt #{attempt.attempt_number}
                              </strong>
                              <p>
                                Started:{" "}
                                {formatDate(attempt.started_at)}
                              </p>
                            </div>

                            <span
                              className={`status-badge status-${attempt.status}`}
                            >
                              {attempt.status}
                            </span>
                          </div>

                          <p>
                            Completed:{" "}
                            {formatDate(attempt.completed_at)}
                          </p>

                          {attempt.error_message && (
                            <div className="error-message">
                              {attempt.error_message}
                            </div>
                          )}

                          {attempt.result && (
                            <pre className="result-output">
                              {formatResult(attempt.result)}
                            </pre>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}

export default App;
