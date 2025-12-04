"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/app/utils/supabase/client";

/**
 * STORES MANAGEMENT COMPONENT - COMPLETELY REBUILT
 *
 * Simple, robust implementation focused on reliability:
 * - Direct Supabase queries without context dependencies
 * - Comprehensive error handling
 * - No external state dependencies
 */

// Types
interface Store {
  id: string;
  store_name: string | null;
  store_url: string | null;
  is_store_listed: boolean | null;
  is_inventory_fetched: boolean | null;
  created_at: string | null;
}

// Colors
const colors = {
  bg: "#1B1F3B",
  card: "#252A4A",
  accent: "#3A6EA5",
  white: "#FFFFFF",
  muted: "#94A3B8",
  success: "#10B981",
  warning: "#F59E0B",
  error: "#EF4444",
  border: "#374151",
};

export function Stores() {
  // All state in one place
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editStore, setEditStore] = useState<Store | null>(null);
  const [formName, setFormName] = useState("");
  const [formUrl, setFormUrl] = useState("");
  const [formActive, setFormActive] = useState(true);
  const [saving, setSaving] = useState(false);

  // Delete modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteStore, setDeleteStore] = useState<Store | null>(null);

  const LIMIT = 10;

  // Fetch stores from Supabase
  const fetchStores = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const start = (page - 1) * LIMIT;

      const { data, count, error: fetchError } = await supabase
        .from("stores")
        .select("*", { count: "exact" })
        .range(start, start + LIMIT - 1)
        .order("created_at", { ascending: false });

      if (fetchError) {
        throw new Error(fetchError.message);
      }

      setStores(data || []);
      setTotal(count || 0);
    } catch (err) {
      console.error("Error fetching stores:", err);
      setError(err instanceof Error ? err.message : "Failed to load stores");
      setStores([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page]);

  // Load stores on mount and page change
  useEffect(() => {
    fetchStores();
  }, [fetchStores]);

  // Open add modal
  const handleAdd = () => {
    setEditStore(null);
    setFormName("");
    setFormUrl("");
    setFormActive(true);
    setShowModal(true);
  };

  // Open edit modal
  const handleEdit = (store: Store) => {
    setEditStore(store);
    setFormName(store.store_name || "");
    setFormUrl(store.store_url || "");
    setFormActive(store.is_store_listed ?? true);
    setShowModal(true);
  };

  // Save store (add or update)
  const handleSave = async () => {
    if (!formName.trim() || !formUrl.trim()) {
      alert("Please fill in all required fields");
      return;
    }

    setSaving(true);
    try {
      const supabase = createClient();

      if (editStore) {
        // Update existing store
        const { error: updateError } = await supabase
          .from("stores")
          .update({
            store_name: formName.trim(),
            store_url: formUrl.trim(),
            is_store_listed: formActive,
          })
          .eq("id", editStore.id);

        if (updateError) throw new Error(updateError.message);
      } else {
        // Create new store
        const { error: insertError } = await supabase
          .from("stores")
          .insert({
            store_name: formName.trim(),
            store_url: formUrl.trim(),
            is_store_listed: formActive,
            is_inventory_fetched: false,
          });

        if (insertError) throw new Error(insertError.message);
      }

      setShowModal(false);
      fetchStores();
    } catch (err) {
      console.error("Error saving store:", err);
      alert(err instanceof Error ? err.message : "Failed to save store");
    } finally {
      setSaving(false);
    }
  };

  // Toggle store status
  const handleToggle = async (store: Store) => {
    try {
      const supabase = createClient();
      const { error: toggleError } = await supabase
        .from("stores")
        .update({ is_store_listed: !store.is_store_listed })
        .eq("id", store.id);

      if (toggleError) throw new Error(toggleError.message);
      fetchStores();
    } catch (err) {
      console.error("Error toggling store:", err);
      alert(err instanceof Error ? err.message : "Failed to update store");
    }
  };

  // Delete store
  const handleDelete = async () => {
    if (!deleteStore) return;

    setSaving(true);
    try {
      const supabase = createClient();
      const { error: deleteError } = await supabase
        .from("stores")
        .delete()
        .eq("id", deleteStore.id);

      if (deleteError) throw new Error(deleteError.message);

      setShowDeleteModal(false);
      setDeleteStore(null);
      fetchStores();
    } catch (err) {
      console.error("Error deleting store:", err);
      alert(err instanceof Error ? err.message : "Failed to delete store");
    } finally {
      setSaving(false);
    }
  };

  // Calculate stats
  const activeCount = stores.filter((s) => s.is_store_listed).length;
  const syncedCount = stores.filter((s) => s.is_inventory_fetched).length;
  const totalPages = Math.ceil(total / LIMIT);

  // Error state
  if (error && !loading) {
    return (
      <div style={{ padding: "2rem", backgroundColor: colors.bg, minHeight: "100vh" }}>
        <div style={{ backgroundColor: colors.card, borderRadius: "1rem", padding: "3rem", textAlign: "center" }}>
          <div style={{
            width: "4rem",
            height: "4rem",
            borderRadius: "50%",
            backgroundColor: `${colors.error}20`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 1rem"
          }}>
            <span style={{ color: colors.error, fontSize: "2rem" }}>!</span>
          </div>
          <h2 style={{ color: colors.white, marginBottom: "0.5rem" }}>Error Loading Stores</h2>
          <p style={{ color: colors.muted, marginBottom: "1.5rem" }}>{error}</p>
          <button
            onClick={fetchStores}
            style={{
              backgroundColor: colors.accent,
              color: colors.white,
              border: "none",
              padding: "0.75rem 1.5rem",
              borderRadius: "0.5rem",
              cursor: "pointer",
              fontWeight: 500,
            }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: "1.5rem", backgroundColor: colors.bg, minHeight: "100vh" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
        <div>
          <h1 style={{ color: colors.white, fontSize: "1.75rem", fontWeight: 700, marginBottom: "0.25rem" }}>
            Store Management
          </h1>
          <p style={{ color: colors.muted }}>Manage your Shopify stores</p>
        </div>
        <button
          onClick={handleAdd}
          style={{
            backgroundColor: colors.accent,
            color: colors.white,
            border: "none",
            padding: "0.75rem 1.25rem",
            borderRadius: "0.5rem",
            cursor: "pointer",
            fontWeight: 500,
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
          }}
        >
          <span style={{ fontSize: "1.25rem" }}>+</span>
          Add Store
        </button>
      </div>

      {/* Stats Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem", marginBottom: "2rem" }}>
        <StatCard label="Total Stores" value={total} color={colors.accent} />
        <StatCard label="Active Stores" value={activeCount} color={colors.success} />
        <StatCard label="Inactive Stores" value={stores.length - activeCount} color={colors.warning} />
        <StatCard label="Inventory Synced" value={syncedCount} color={colors.success} />
      </div>

      {/* Stores Table */}
      <div style={{ backgroundColor: colors.card, borderRadius: "1rem", overflow: "hidden" }}>
        {/* Table Header */}
        <div style={{ padding: "1rem 1.5rem", borderBottom: `1px solid ${colors.border}` }}>
          <h2 style={{ color: colors.white, fontSize: "1.1rem", fontWeight: 600 }}>All Stores</h2>
        </div>

        {loading ? (
          <div style={{ padding: "4rem", textAlign: "center" }}>
            <div style={{
              width: "3rem",
              height: "3rem",
              border: `3px solid ${colors.border}`,
              borderTopColor: colors.accent,
              borderRadius: "50%",
              animation: "spin 1s linear infinite",
              margin: "0 auto 1rem"
            }} />
            <p style={{ color: colors.muted }}>Loading stores...</p>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        ) : stores.length === 0 ? (
          <div style={{ padding: "4rem", textAlign: "center" }}>
            <p style={{ color: colors.muted, marginBottom: "1rem" }}>No stores found</p>
            <button
              onClick={handleAdd}
              style={{
                backgroundColor: colors.accent,
                color: colors.white,
                border: "none",
                padding: "0.75rem 1.25rem",
                borderRadius: "0.5rem",
                cursor: "pointer",
                fontWeight: 500,
              }}
            >
              Add Your First Store
            </button>
          </div>
        ) : (
          <>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ backgroundColor: colors.bg }}>
                  <th style={{ ...thStyle, color: colors.muted }}>Store Name</th>
                  <th style={{ ...thStyle, color: colors.muted }}>URL</th>
                  <th style={{ ...thStyle, color: colors.muted }}>Status</th>
                  <th style={{ ...thStyle, color: colors.muted }}>Inventory</th>
                  <th style={{ ...thStyle, color: colors.muted, textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {stores.map((store) => (
                  <tr key={store.id} style={{ borderBottom: `1px solid ${colors.border}` }}>
                    <td style={{ ...tdStyle, color: colors.white, fontWeight: 500 }}>
                      {store.store_name || "Unnamed Store"}
                    </td>
                    <td style={tdStyle}>
                      {store.store_url ? (
                        <a
                          href={`https://${store.store_url}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: colors.accent, textDecoration: "none" }}
                        >
                          {store.store_url}
                        </a>
                      ) : (
                        <span style={{ color: colors.muted }}>-</span>
                      )}
                    </td>
                    <td style={tdStyle}>
                      <span
                        onClick={() => handleToggle(store)}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "0.5rem",
                          padding: "0.25rem 0.75rem",
                          borderRadius: "999px",
                          fontSize: "0.875rem",
                          cursor: "pointer",
                          backgroundColor: store.is_store_listed ? `${colors.success}20` : `${colors.error}20`,
                          color: store.is_store_listed ? colors.success : colors.error,
                        }}
                      >
                        <span style={{
                          width: "0.5rem",
                          height: "0.5rem",
                          borderRadius: "50%",
                          backgroundColor: store.is_store_listed ? colors.success : colors.error
                        }} />
                        {store.is_store_listed ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td style={tdStyle}>
                      <span style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "0.5rem",
                        padding: "0.25rem 0.75rem",
                        borderRadius: "999px",
                        fontSize: "0.875rem",
                        backgroundColor: store.is_inventory_fetched ? `${colors.success}20` : `${colors.warning}20`,
                        color: store.is_inventory_fetched ? colors.success : colors.warning,
                      }}>
                        {store.is_inventory_fetched ? "Synced" : "Pending"}
                      </span>
                    </td>
                    <td style={{ ...tdStyle, textAlign: "right" }}>
                      <button
                        onClick={() => handleEdit(store)}
                        style={actionBtnStyle}
                        title="Edit"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => {
                          setDeleteStore(store);
                          setShowDeleteModal(true);
                        }}
                        style={{ ...actionBtnStyle, color: colors.error, marginLeft: "0.5rem" }}
                        title="Delete"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            {totalPages > 1 && (
              <div style={{
                padding: "1rem 1.5rem",
                borderTop: `1px solid ${colors.border}`,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center"
              }}>
                <span style={{ color: colors.muted, fontSize: "0.875rem" }}>
                  Page {page} of {totalPages} ({total} stores)
                </span>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    style={{
                      ...paginationBtnStyle,
                      opacity: page === 1 ? 0.5 : 1,
                      cursor: page === 1 ? "not-allowed" : "pointer",
                    }}
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    style={{
                      ...paginationBtnStyle,
                      opacity: page === totalPages ? 0.5 : 1,
                      cursor: page === totalPages ? "not-allowed" : "pointer",
                    }}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div style={modalOverlayStyle}>
          <div style={modalStyle}>
            <h2 style={{ color: colors.white, marginBottom: "1.5rem" }}>
              {editStore ? "Edit Store" : "Add New Store"}
            </h2>

            <div style={{ marginBottom: "1rem" }}>
              <label style={labelStyle}>Store Name *</label>
              <input
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="My Store"
                style={inputStyle}
              />
            </div>

            <div style={{ marginBottom: "1rem" }}>
              <label style={labelStyle}>Store URL *</label>
              <input
                type="text"
                value={formUrl}
                onChange={(e) => setFormUrl(e.target.value)}
                placeholder="mystore.myshopify.com"
                style={inputStyle}
              />
            </div>

            <div style={{ marginBottom: "1.5rem" }}>
              <label style={{ ...labelStyle, display: "flex", alignItems: "center", gap: "0.75rem", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={formActive}
                  onChange={(e) => setFormActive(e.target.checked)}
                  style={{ width: "1.25rem", height: "1.25rem", accentColor: colors.accent }}
                />
                <span>Store is Active</span>
              </label>
            </div>

            <div style={{ display: "flex", gap: "1rem", justifyContent: "flex-end" }}>
              <button
                onClick={() => setShowModal(false)}
                style={cancelBtnStyle}
                disabled={saving}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                style={saveBtnStyle}
                disabled={saving}
              >
                {saving ? "Saving..." : editStore ? "Update Store" : "Add Store"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && deleteStore && (
        <div style={modalOverlayStyle}>
          <div style={modalStyle}>
            <h2 style={{ color: colors.white, marginBottom: "1rem" }}>Delete Store?</h2>
            <p style={{ color: colors.muted, marginBottom: "1.5rem" }}>
              Are you sure you want to delete "{deleteStore.store_name || "this store"}"? This action cannot be undone.
            </p>
            <div style={{ display: "flex", gap: "1rem", justifyContent: "flex-end" }}>
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteStore(null);
                }}
                style={cancelBtnStyle}
                disabled={saving}
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                style={{ ...saveBtnStyle, backgroundColor: colors.error }}
                disabled={saving}
              >
                {saving ? "Deleting..." : "Delete Store"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Stat Card Component
function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{
      backgroundColor: colors.card,
      padding: "1.25rem",
      borderRadius: "0.75rem",
    }}>
      <p style={{ color: colors.muted, fontSize: "0.875rem", marginBottom: "0.25rem" }}>{label}</p>
      <p style={{ color: colors.white, fontSize: "1.75rem", fontWeight: 700 }}>{value}</p>
      <div style={{
        height: "3px",
        backgroundColor: `${color}30`,
        borderRadius: "999px",
        marginTop: "0.75rem",
        overflow: "hidden"
      }}>
        <div style={{
          height: "100%",
          width: "40%",
          backgroundColor: color,
          borderRadius: "999px"
        }} />
      </div>
    </div>
  );
}

// Styles
const thStyle: React.CSSProperties = {
  padding: "1rem 1.5rem",
  textAlign: "left",
  fontSize: "0.75rem",
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: "0.05em",
};

const tdStyle: React.CSSProperties = {
  padding: "1rem 1.5rem",
  color: colors.muted,
};

const actionBtnStyle: React.CSSProperties = {
  background: "none",
  border: "none",
  color: colors.accent,
  cursor: "pointer",
  padding: "0.5rem",
  fontSize: "0.875rem",
  fontWeight: 500,
};

const paginationBtnStyle: React.CSSProperties = {
  backgroundColor: colors.bg,
  color: colors.white,
  border: `1px solid ${colors.border}`,
  padding: "0.5rem 1rem",
  borderRadius: "0.5rem",
  fontSize: "0.875rem",
};

const modalOverlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  backgroundColor: "rgba(0, 0, 0, 0.7)",
  backdropFilter: "blur(4px)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 50,
  padding: "1rem",
};

const modalStyle: React.CSSProperties = {
  backgroundColor: colors.card,
  borderRadius: "1rem",
  padding: "2rem",
  width: "100%",
  maxWidth: "28rem",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  color: colors.white,
  fontSize: "0.875rem",
  fontWeight: 500,
  marginBottom: "0.5rem",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "0.75rem 1rem",
  backgroundColor: colors.bg,
  border: `1px solid ${colors.border}`,
  borderRadius: "0.5rem",
  color: colors.white,
  fontSize: "1rem",
  outline: "none",
};

const cancelBtnStyle: React.CSSProperties = {
  backgroundColor: colors.bg,
  color: colors.muted,
  border: `1px solid ${colors.border}`,
  padding: "0.75rem 1.5rem",
  borderRadius: "0.5rem",
  cursor: "pointer",
  fontWeight: 500,
};

const saveBtnStyle: React.CSSProperties = {
  backgroundColor: colors.accent,
  color: colors.white,
  border: "none",
  padding: "0.75rem 1.5rem",
  borderRadius: "0.5rem",
  cursor: "pointer",
  fontWeight: 500,
};
