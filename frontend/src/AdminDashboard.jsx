import React, { useCallback, useEffect, useState } from "react";
import {
  Activity,
  Users,
  UserCheck,
  UserX,
  Sparkles,
  Search,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";

import {
  getAdminStats,
  getAdminUsers,
  updateAdminUserStatus,
} from "./api";

import "./AdminDashboard.css";

const initialStats = {
  total_users: 0,
  active_users: 0,
  disabled_users: 0,
  total_prompts: 0,
  prompts_today: 0,
  prompts_this_month: 0,
};

export default function AdminDashboard() {
  const [stats, setStats] = useState(initialStats);
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [busyUserId, setBusyUserId] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [statsResponse, usersResponse] = await Promise.all([
        getAdminStats(),
        getAdminUsers({
          search,
          page,
          page_size: 10,
        }),
      ]);

      setStats({
        ...initialStats,
        ...statsResponse.data,
      });

      setUsers(usersResponse.data.items || []);
      setTotalPages(usersResponse.data.total_pages || 1);
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          "Could not load administrator dashboard."
      );
    } finally {
      setLoading(false);
    }
  }, [search, page]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  async function handleSearch(event) {
    event.preventDefault();
    setPage(1);
    setNotice("");
    setError("");

    // The search state is controlled by the input.
    // The effect reloads the dashboard when it changes.
  }

  async function toggleUser(user) {
    const nextStatus = !user.is_active;
    const action = nextStatus ? "activate" : "deactivate";

    if (!window.confirm(`Are you sure you want to ${action} ${user.email}?`)) {
      return;
    }

    setBusyUserId(user.id);
    setError("");
    setNotice("");

    try {
      await updateAdminUserStatus(user.id, nextStatus);

      setNotice(
        `${user.name || user.email} was ${nextStatus ? "activated" : "deactivated"}.`
      );

      await loadDashboard();
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          "Unable to update this account."
      );
    } finally {
      setBusyUserId(null);
    }
  }

  const cards = [
    {
      label: "Total users",
      value: stats.total_users,
      icon: Users,
    },
    {
      label: "Active users",
      value: stats.active_users,
      icon: UserCheck,
    },
    {
      label: "Disabled users",
      value: stats.disabled_users,
      icon: UserX,
    },
    {
      label: "Total prompts",
      value: stats.total_prompts,
      icon: Sparkles,
    },
    {
      label: "Prompts today",
      value: stats.prompts_today,
      icon: Activity,
    },
    {
      label: "Prompts this month",
      value: stats.prompts_this_month,
      icon: ShieldCheck,
    },
  ];

  return (
    <main className="admin-page">
      <section className="admin-hero">
        <div>
          <div className="admin-eyebrow">
            <ShieldCheck size={16} />
            ADMINISTRATION
          </div>

          <h1>Admin Dashboard</h1>

          <p>
            Manage PromptForge accounts and monitor prompt activity.
          </p>
        </div>

        <button
          type="button"
          className="admin-refresh"
          onClick={loadDashboard}
          disabled={loading}
        >
          <RefreshCw size={16} />
          Refresh
        </button>
      </section>

      {error && (
        <div className="admin-message admin-error">
          {error}
        </div>
      )}

      {notice && (
        <div className="admin-message admin-success">
          {notice}
        </div>
      )}

      <section className="admin-stats">
        {cards.map(({ label, value, icon: Icon }) => (
          <article className="admin-stat-card" key={label}>
            <div className="admin-stat-icon">
              <Icon size={20} />
            </div>

            <div className="admin-stat-label">{label}</div>

            <div className="admin-stat-value">
              {Number(value || 0).toLocaleString()}
            </div>
          </article>
        ))}
      </section>

      <section className="admin-users-card">
        <div className="admin-users-heading">
          <div>
            <h2>User management</h2>
            <p>Search accounts and change their status.</p>
          </div>
        </div>

        <form className="admin-search" onSubmit={handleSearch}>
          <Search size={18} />

          <input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder="Search by name or email"
            aria-label="Search users by name or email"
          />

          <button type="submit">Search</button>
        </form>

        {loading ? (
          <div className="admin-empty">Loading dashboard...</div>
        ) : users.length === 0 ? (
          <div className="admin-empty">No users found.</div>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Role</th>
                  <th>Prompts</th>
                  <th>Status</th>
                  <th>Registered</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <div className="admin-user-name">
                        {user.name || "Unnamed user"}
                      </div>
                      <div className="admin-user-email">
                        {user.email}
                      </div>
                    </td>

                    <td>
                      <span className="admin-role">
                        {user.role}
                      </span>
                    </td>

                    <td>{user.prompt_count}</td>

                    <td>
                      <span
                        className={
                          user.is_active
                            ? "admin-status is-active"
                            : "admin-status is-disabled"
                        }
                      >
                        {user.is_active ? "Active" : "Disabled"}
                      </span>
                    </td>

                    <td>
                      {user.created_at
                        ? new Date(user.created_at).toLocaleDateString()
                        : "—"}
                    </td>

                    <td>
                      {user.role === "admin" ? (
                        <span className="admin-protected">
                          Protected
                        </span>
                      ) : (
                        <button
                          type="button"
                          className={
                            user.is_active
                              ? "admin-action deactivate"
                              : "admin-action activate"
                          }
                          disabled={busyUserId === user.id}
                          onClick={() => toggleUser(user)}
                        >
                          {busyUserId === user.id
                            ? "Saving..."
                            : user.is_active
                              ? "Deactivate"
                              : "Activate"}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="admin-pagination">
          <span>Page {page} of {totalPages}</span>

          <div>
            <button
              type="button"
              disabled={page <= 1 || loading}
              onClick={() => setPage((current) => current - 1)}
            >
              Previous
            </button>

            <button
              type="button"
              disabled={page >= totalPages || loading}
              onClick={() => setPage((current) => current + 1)}
            >
              Next
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}