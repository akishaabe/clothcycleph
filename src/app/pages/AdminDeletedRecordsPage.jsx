import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowLeft, Archive, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { adminService } from "../../services/api";
import { BrandLoadingScreen } from "../components/BrandLoadingScreen";
import { formatManilaDate } from "../../utils/dateTime";

const pageSize = 25;

function parseSnapshot(snapshot) {
  if (!snapshot) return {};
  if (typeof snapshot === "object") return snapshot;

  try {
    return JSON.parse(snapshot);
  } catch {
    return { raw: snapshot };
  }
}

function formatEntityLabel(value) {
  return String(value || "record")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getRecordTitle(record) {
  const snapshot = parseSnapshot(record.snapshot);
  return (
    snapshot.name ||
    snapshot.submission_name ||
    snapshot.title ||
    snapshot.email ||
    snapshot.item_type ||
    record.entity_id ||
    "Deleted record"
  );
}

export function AdminDeletedRecordsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [records, setRecords] = useState([]);
  const [meta, setMeta] = useState({ count: 0, page: 1, limit: pageSize, total_pages: 1 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState({
    keyword: searchParams.get("keyword") || "",
    entityType: searchParams.get("entity_type") || "",
    deletedBy: searchParams.get("deleted_by") || "",
    dateFrom: searchParams.get("date_from") || "",
    dateTo: searchParams.get("date_to") || "",
  });
  const page = Math.max(1, Number(searchParams.get("page") || 1));

  const entityTypes = useMemo(() => {
    const values = records.map((record) => record.entity_type).filter(Boolean);
    return Array.from(new Set(values)).sort();
  }, [records]);

  useEffect(() => {
    let isMounted = true;

    async function loadDeletedRecords() {
      setIsLoading(true);
      setError("");

      try {
        const response = await adminService.getDeletedRecords({
          ...filters,
          page,
          limit: pageSize,
        });

        if (!isMounted) return;
        setRecords(response.data || []);
        setMeta({
          count: response.count || 0,
          page: response.page || page,
          limit: response.limit || pageSize,
          total_pages: response.total_pages || 1,
        });
      } catch (loadError) {
        if (isMounted) {
          setError(loadError.message || "Unable to load deleted records.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadDeletedRecords();
    return () => {
      isMounted = false;
    };
  }, [filters, page]);

  const updateFilters = (nextFilters, nextPage = 1) => {
    setFilters(nextFilters);
    const params = new URLSearchParams();
    Object.entries(nextFilters).forEach(([key, value]) => {
      if (!value) return;
      const paramKey = key === "entityType" ? "entity_type" : key === "deletedBy" ? "deleted_by" : key === "dateFrom" ? "date_from" : key === "dateTo" ? "date_to" : key;
      params.set(paramKey, value);
    });
    if (nextPage > 1) {
      params.set("page", String(nextPage));
    }
    setSearchParams(params);
  };

  const goToPage = (nextPage) => updateFilters(filters, Math.min(Math.max(1, nextPage), meta.total_pages || 1));

  if (isLoading && records.length === 0) {
    return (
      <BrandLoadingScreen
        title="Loading deleted records"
        message="Preparing the admin archive."
        detail="Only administrator accounts can access this audit view."
      />
    );
  }

  return (
    <div className="admin-dashboard app-darkable-page min-h-screen bg-[radial-gradient(circle_at_top_left,_#e5e7eb,_transparent_28%),linear-gradient(135deg,#f7f7f7,#ffffff,#eeeeee)] text-gray-950">
      <nav className="sticky top-0 z-20 border-b border-gray-200 bg-white/90 px-6 py-4 backdrop-blur-xl dark:border-white/10 dark:bg-[#111827]/90">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <Link to="/admin" className="inline-flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-gray-950 dark:text-gray-300 dark:hover:text-white">
            <ArrowLeft className="h-4 w-4" />
            Admin dashboard
          </Link>
          <div className="inline-flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-200">
            <Archive className="h-4 w-4" />
            Deleted Records
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-7xl px-6 py-8">
        <section className="mb-6 rounded-[28px] border border-gray-200 bg-white p-6 shadow-lg dark:border-white/10 dark:bg-white/[0.04]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-950 dark:text-white">Deleted Records</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600 dark:text-gray-300">
                Review records archived when accounts, rules, notifications, and other supported objects are deleted.
              </p>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700 dark:border-white/10 dark:bg-black/20 dark:text-gray-200">
              <span className="font-semibold">{meta.count}</span> archived records
            </div>
          </div>
        </section>

        <section className="mb-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-lg dark:border-white/10 dark:bg-white/[0.04]">
          <div className="grid gap-3 lg:grid-cols-[1.3fr_0.8fr_0.8fr_0.7fr_0.7fr_auto]">
            <label className="relative block">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
              <input
                value={filters.keyword}
                onChange={(event) => updateFilters({ ...filters, keyword: event.target.value })}
                className="h-11 w-full rounded-xl border border-gray-200 bg-gray-50 pl-10 pr-3 text-sm text-gray-950 outline-none focus:border-gray-500 dark:border-white/10 dark:bg-black/20 dark:text-white"
                placeholder="Search keyword, ID, name, email"
              />
            </label>
            <input
              value={filters.entityType}
              onChange={(event) => updateFilters({ ...filters, entityType: event.target.value })}
              list="deleted-record-types"
              className="h-11 rounded-xl border border-gray-200 bg-gray-50 px-3 text-sm text-gray-950 outline-none focus:border-gray-500 dark:border-white/10 dark:bg-black/20 dark:text-white"
              placeholder="Type/module"
            />
            <datalist id="deleted-record-types">
              {entityTypes.map((type) => <option key={type} value={type} />)}
            </datalist>
            <input
              value={filters.deletedBy}
              onChange={(event) => updateFilters({ ...filters, deletedBy: event.target.value })}
              className="h-11 rounded-xl border border-gray-200 bg-gray-50 px-3 text-sm text-gray-950 outline-none focus:border-gray-500 dark:border-white/10 dark:bg-black/20 dark:text-white"
              placeholder="Deleted by"
            />
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(event) => updateFilters({ ...filters, dateFrom: event.target.value })}
              className="h-11 rounded-xl border border-gray-200 bg-gray-50 px-3 text-sm text-gray-950 outline-none focus:border-gray-500 dark:border-white/10 dark:bg-black/20 dark:text-white"
            />
            <input
              type="date"
              value={filters.dateTo}
              onChange={(event) => updateFilters({ ...filters, dateTo: event.target.value })}
              className="h-11 rounded-xl border border-gray-200 bg-gray-50 px-3 text-sm text-gray-950 outline-none focus:border-gray-500 dark:border-white/10 dark:bg-black/20 dark:text-white"
            />
            <button
              type="button"
              onClick={() => updateFilters({ keyword: "", entityType: "", deletedBy: "", dateFrom: "", dateTo: "" })}
              className="h-11 rounded-xl border border-gray-200 px-4 text-sm font-semibold text-gray-600 hover:bg-gray-50 dark:border-white/10 dark:text-gray-300 dark:hover:bg-white/10"
            >
              Reset
            </button>
          </div>
        </section>

        {error && (
          <div className="mb-6 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-400/20 dark:bg-red-400/10 dark:text-red-200">
            {error}
          </div>
        )}

        <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-lg dark:border-white/10 dark:bg-white/[0.04]">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm dark:divide-white/10">
              <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500 dark:bg-black/20 dark:text-gray-400">
                <tr>
                  <th className="px-4 py-3">Deleted item</th>
                  <th className="px-4 py-3">Original ID</th>
                  <th className="px-4 py-3">Deleted by</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Snapshot</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-white/10">
                {records.map((record) => {
                  const snapshot = parseSnapshot(record.snapshot);
                  return (
                    <tr key={record.id} className="align-top hover:bg-gray-50 dark:hover:bg-white/[0.03]">
                      <td className="px-4 py-4">
                        <div className="font-semibold text-gray-950 dark:text-white">{getRecordTitle(record)}</div>
                        <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">{formatEntityLabel(record.entity_type)}</div>
                      </td>
                      <td className="px-4 py-4 font-mono text-xs text-gray-600 dark:text-gray-300">{record.entity_id || record.id}</td>
                      <td className="px-4 py-4 text-gray-600 dark:text-gray-300">
                        <div>{record.deleted_by_name || "Unknown"}</div>
                        <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">{record.deleted_by_email || record.deleted_by_user_id || "No user recorded"}</div>
                        {snapshot.role && <div className="mt-1 text-xs capitalize text-gray-500 dark:text-gray-400">Record role: {snapshot.role}</div>}
                      </td>
                      <td className="px-4 py-4 text-gray-600 dark:text-gray-300">{record.deleted_at ? formatManilaDate(record.deleted_at) : "Not recorded"}</td>
                      <td className="px-4 py-4">
                        <details className="max-w-xl rounded-xl border border-gray-200 bg-gray-50 p-3 dark:border-white/10 dark:bg-black/20">
                          <summary className="cursor-pointer font-semibold text-gray-700 dark:text-gray-200">View details</summary>
                          <pre className="mt-3 max-h-56 overflow-auto whitespace-pre-wrap break-words text-xs text-gray-700 dark:text-gray-200">
                            {JSON.stringify(snapshot, null, 2)}
                          </pre>
                        </details>
                      </td>
                    </tr>
                  );
                })}
                {!isLoading && records.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-sm text-gray-500 dark:text-gray-400">
                      No deleted records match the current filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-3 border-t border-gray-200 px-4 py-4 sm:flex-row sm:items-center sm:justify-between dark:border-white/10">
            <div className="text-sm text-gray-600 dark:text-gray-300">
              Page {meta.page} of {meta.total_pages}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => goToPage(page - 1)}
                disabled={page <= 1 || isLoading}
                className="inline-flex h-10 items-center gap-2 rounded-xl border border-gray-200 px-3 text-sm font-semibold text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:text-gray-300 dark:hover:bg-white/10"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </button>
              <button
                type="button"
                onClick={() => goToPage(page + 1)}
                disabled={page >= meta.total_pages || isLoading}
                className="inline-flex h-10 items-center gap-2 rounded-xl border border-gray-200 px-3 text-sm font-semibold text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:text-gray-300 dark:hover:bg-white/10"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
