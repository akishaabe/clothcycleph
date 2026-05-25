import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import {
  Recycle,
  Users,
  Shield,
  Building2,
  Activity,
  Bell,
  User,
  Crown,
  ChevronRight,
  Search,
  Settings,
  LogOut,
  MessageSquare,
  Plus,
  Pencil,
  Trash2,
  X,
  Save,
  Download,
  CheckCircle,
  XCircle,
  HelpCircle,
} from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { dssService, messageService, notificationService, adminService } from "../../services/api";
import { formatManilaDate, getTimestamp } from "../../utils/dateTime";
import { useAuth } from "../../context/AuthContext";

const initialAccounts = [];

const getTrendClass = (value) => {
  if (value.startsWith("-")) {
    return "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300";
  }

  if (value.startsWith("+")) {
    return "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-300";
  }

  return "bg-gray-100 text-gray-700 dark:bg-white/10 dark:text-gray-200";
};

const roleConfig = {
  User: {
    icon: Users,
    title: "Manage Users",
    label: "Users",
    description: "Review regular accounts, then suspend or remove access when needed.",
    color: "#111827",
  },
  Admin: {
    icon: Shield,
    title: "Manage Admins",
    label: "Admins",
    description: "Control administrator access and operational privileges.",
    color: "#374151",
  },
  Partner: {
    icon: Building2,
    title: "Manage Partners",
    label: "Partners",
    description: "Review partner access, then suspend or remove organizations when needed.",
    color: "#4b5563",
  },
};

const emptyForm = {
  name: "",
  email: "",
  phone: "",
  organization: "",
  status: "active",
  password: "",
};

const dssRuleCategoryOptions = [
  { value: "", label: "Select category" },
  { value: "eligibility", label: "Eligibility / restrictions" },
  { value: "burn_test", label: "Burn test" },
  { value: "item_details", label: "Item details" },
  { value: "condition", label: "Condition and damage" },
  { value: "cleanliness", label: "Cleanliness / contamination" },
  { value: "fabric", label: "Fabric signal" },
  { value: "recovery", label: "Recovery pathway fit" },
  { value: "partner_handoff", label: "Partner handoff" },
  { value: "audit", label: "Audit / explanation" },
];

const dssRuleQuestionOptions = [
  { value: "", label: "Select DSS field" },
  { value: "restricted_category", label: "Restricted category" },
  { value: "uniform_branding", label: "Uniform branding" },
  { value: "item_types", label: "Item types" },
  { value: "condition", label: "Condition" },
  { value: "cleanliness", label: "Cleanliness" },
  { value: "knows_fabric_type", label: "Knows fabric type" },
  { value: "fabric_types", label: "Fabric types" },
  { value: "custom_fabric_text", label: "User-defined fabric text" },
  { value: "fabric_identification", label: "Fabric identification signals" },
  { value: "fiber_composition", label: "Fiber composition" },
  { value: "wearability", label: "Wearability" },
  { value: "repairability", label: "Repairability" },
  { value: "contamination_level", label: "Contamination level" },
  { value: "damage_classification", label: "Damage classification" },
  { value: "repurposing_potential", label: "Repurposing potential" },
  { value: "trim_removal", label: "Trim/accessory removal" },
  { value: "buyback_interest", label: "Buyback interest" },
  { value: "burn_test.moment", label: "Burn test: flame touched textile" },
  { value: "burn_test.flames", label: "Burn test: flame behavior" },
  { value: "burn_test.no_flame", label: "Burn test: no-flame behavior" },
  { value: "burn_test.smell", label: "Burn test: smell" },
  { value: "burn_test.ashes", label: "Burn test: ashes" },
];

const dssRulePathwayOptions = [
  { value: "", label: "General / all pathways" },
  { value: "recycle", label: "Recycle" },
  { value: "donate", label: "Donate" },
  { value: "upcycle", label: "Upcycle" },
  { value: "buyback", label: "Buyback" },
  { value: "rejected", label: "Rejected" },
];

const buildDssRuleKey = ({ pathway, category, question_key }) =>
  [pathway || "general", category || "rule", question_key || "field"]
    .join("_")
    .replace(/[^a-zA-Z0-9_]+/g, "_")
    .toLowerCase();

const getStatusClass = (status) => {
  if (status === "active") {
    return "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-300";
  }

  if (status === "suspended") {
    return "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-200";
  }

  return "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300";
};

const formatStatusLabel = (status) =>
  String(status || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

const pathwayLabels = {
  recycle: "Recycle",
  donate: "Donate",
  upcycle: "Upcycle",
  buyback: "Buyback",
  rejected: "Rejected",
};

const toConfidencePercent = (value) => {
  const numericValue = Number(value || 0);
  return numericValue > 1 ? numericValue : numericValue * 100;
};

const formatActivityTime = (value) => {
  if (!value) {
    return "Recent";
  }

  const timestamp = getTimestamp(value);
  if (!Number.isFinite(timestamp)) {
    return "Recent";
  }

  const diffMs = Date.now() - timestamp;
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diffMs >= 0 && diffMs < minute) {
    return "Just now";
  }

  if (diffMs >= 0 && diffMs < hour) {
    const minutes = Math.max(1, Math.floor(diffMs / minute));
    return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  }

  if (diffMs >= 0 && diffMs < day) {
    const hours = Math.max(1, Math.floor(diffMs / hour));
    return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  }

  if (diffMs >= 0 && diffMs < 7 * day) {
    const days = Math.max(1, Math.floor(diffMs / day));
    return `${days} day${days === 1 ? "" : "s"} ago`;
  }

  return formatManilaDate(value, {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "Asia/Manila",
  });
};

const formatActivityExactTime = (value) =>
  value
    ? formatManilaDate(value, {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        timeZone: "Asia/Manila",
      })
    : "";

const canCreateRole = (role) => role === "Admin" || role === "Partner";
const canSuspendRole = (role) => role === "User" || role === "Partner";

const mapUserToAccount = (user) => ({
  id: user.id,
  name: user.name,
  role: user.role.charAt(0).toUpperCase() + user.role.slice(1),
  email: user.email,
  status: user.status || 'active',
  joined: user.created_at ? user.created_at.split('T')[0] : '',
  phone: user.phone || '',
  organization:
    user.role === 'partner'
      ? user.partner_name || 'Partner'
      : user.role === 'admin'
      ? 'ClothCycle PH'
      : 'Individual',
});

export function AdminDashboard() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [searchParams] = useSearchParams();
  const highlightedRuleRequestId = searchParams.get("highlight") || searchParams.get("request");
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [accounts, setAccounts] = useState(initialAccounts);
  const [activeRole, setActiveRole] = useState("User");
  const [searchQuery, setSearchQuery] = useState("");
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(false);
  const [adminError, setAdminError] = useState("");
  const [suspendTarget, setSuspendTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [formData, setFormData] = useState(emptyForm);
  const [dssAuditRuns, setDssAuditRuns] = useState([]);
  const [dssAuditError, setDssAuditError] = useState("");
  const [ruleChangeRequests, setRuleChangeRequests] = useState([]);
  const [adminSubmissions, setAdminSubmissions] = useState([]);
  const [dssRules, setDssRules] = useState([]);
  const [deletedRecords, setDeletedRecords] = useState([]);
  const [dssRuleForm, setDssRuleForm] = useState({
    rule_key: "",
    pathway: "",
    category: "",
    question_key: "",
    expected_values_text: "",
    weight: 0,
    description: "",
  });
  const [ruleRequestSort, setRuleRequestSort] = useState("newest");
  const [ruleRequestFilter, setRuleRequestFilter] = useState("all");
  const [ruleRequestSearch, setRuleRequestSearch] = useState("");
  const [showAllRuleRequests, setShowAllRuleRequests] = useState(false);
  const [ruleRequestNotes, setRuleRequestNotes] = useState({});
  const [ruleReplyDrafts, setRuleReplyDrafts] = useState({});
  const [ruleReplyStatus, setRuleReplyStatus] = useState({});
  const [showAllDssAudit, setShowAllDssAudit] = useState(false);
  const [dssAuditSort, setDssAuditSort] = useState("newest");
  const [isActivityExpanded, setIsActivityExpanded] = useState(false);
  const [systemHealth, setSystemHealth] = useState({
    value: "Checking",
    trend: "Loading",
  });
  const [badgeCounts, setBadgeCounts] = useState({ messages: 0, notifications: 0 });

  useEffect(() => {
    let isMounted = true;

    async function loadDssAudit() {
      try {
        const [
          response,
          ruleRequestsResponse,
          messagesResponse,
          notificationsResponse,
          submissionsResponse,
          rulesResponse,
          deletedRecordsResponse,
        ] = await Promise.all([
          dssService.getAuditRuns(),
          dssService.getRuleChangeRequests(),
          messageService.getUnreadCount(),
          notificationService.getUnreadCount(),
          adminService.getSubmissions(),
          adminService.getDssRules(),
          adminService.getDeletedRecords(),
        ]);
        if (isMounted) {
          setDssAuditRuns(response.data);
          setRuleChangeRequests(ruleRequestsResponse.data);
          setAdminSubmissions(submissionsResponse.data);
          setDssRules(rulesResponse.data);
          setDeletedRecords(deletedRecordsResponse.data || []);
          setBadgeCounts({
            messages: Number(messagesResponse.unread_count || 0),
            notifications: Number(notificationsResponse.unread_count || 0),
          });
        }
      } catch (error) {
        if (isMounted) {
          setDssAuditError(error.message || "Unable to load DSS audit runs.");
        }
      }
    }

    loadDssAudit();

    async function loadHealth() {
      try {
        const apiBase = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
        const response = await fetch(`${apiBase}/health`);
        const data = await response.json();

        if (isMounted) {
          const services = [data.database, data.redis, data.queues].filter(Boolean);
          const healthyCount = services.filter((service) =>
            ["connected", "initialized", "disabled", "bound"].includes(service)
          ).length;
          const percentage = services.length
            ? Math.round((healthyCount / services.length) * 100)
            : response.ok ? 100 : 0;

          setSystemHealth({
            value: `${percentage}%`,
            trend: data.status === "ok" ? "Online" : "Degraded",
          });
        }
      } catch {
        if (isMounted) {
          setSystemHealth({ value: "0%", trend: "Offline" });
        }
      }
    }

    async function loadAccounts() {
      setIsLoadingAccounts(true);
      setAdminError("");
      try {
        const response = await adminService.getUsers();
        if (isMounted) {
          setAccounts(response.data.map(mapUserToAccount));
        }
      } catch (loadError) {
        if (isMounted) {
          setAdminError(loadError.message || "Unable to load user accounts.");
        }
      } finally {
        if (isMounted) {
          setIsLoadingAccounts(false);
        }
      }
    }

    loadAccounts();
    loadHealth();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (searchParams.get("panel") !== "rule-requests") {
      return;
    }

    setShowAllRuleRequests(true);

    window.setTimeout(() => {
      document
        .getElementById("rule-requests")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 120);
  }, [searchParams, ruleChangeRequests.length]);

  const activeConfig = roleConfig[activeRole];
  const roleAccounts = useMemo(
    () => accounts.filter((account) => account.role === activeRole),
    [accounts, activeRole]
  );
  const filteredAccounts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    if (!query) {
      return roleAccounts;
    }

    return roleAccounts.filter((account) =>
      [account.name, account.email, account.phone, account.organization, account.status]
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [roleAccounts, searchQuery]);

  const roleCounts = useMemo(
    () =>
      Object.keys(roleConfig).reduce((counts, role) => {
        counts[role] = accounts.filter((account) => account.role === role).length;
        return counts;
      }, {}),
    [accounts]
  );

  const roleTrends = useMemo(() => {
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;

    return Object.keys(roleConfig).reduce((trends, role) => {
      const recentCount = accounts.filter((account) => {
        if (account.role !== role || !account.joined) {
          return false;
        }

        const joinedAt = new Date(account.joined).getTime();
        return Number.isFinite(joinedAt) && joinedAt >= thirtyDaysAgo;
      }).length;

      trends[role] = recentCount > 0 ? `+${recentCount}` : "0";
      return trends;
    }, {});
  }, [accounts]);

  const systemGrowthData = useMemo(() => {
    const today = new Date();
    const label = formatManilaDate(today, { day: "2-digit", month: "short" });

    return [
      {
        date: label,
        users: roleCounts.User || 0,
        admins: roleCounts.Admin || 0,
        partners: roleCounts.Partner || 0,
      },
    ];
  }, [roleCounts]);

  const sortedDssAuditRuns = useMemo(() => {
    return [...dssAuditRuns].sort((a, b) => {
      if (dssAuditSort === "confidence") {
        return Number(b.confidence || 0) - Number(a.confidence || 0);
      }

      if (dssAuditSort === "score") {
        return Number(b.score || 0) - Number(a.score || 0);
      }

      return getTimestamp(b.created_at) - getTimestamp(a.created_at);
    });
  }, [dssAuditRuns, dssAuditSort]);

  const averageDssConfidenceByPathway = useMemo(() => {
    const groupedRuns = dssAuditRuns.reduce((groups, run) => {
      const pathway = String(run.recommended_pathway || "unknown").toLowerCase();
      const confidence = toConfidencePercent(run.confidence);

      if (!groups[pathway]) {
        groups[pathway] = {
          pathway,
          totalConfidence: 0,
          count: 0,
        };
      }

      groups[pathway].totalConfidence += confidence;
      groups[pathway].count += 1;

      return groups;
    }, {});

    return Object.values(groupedRuns)
      .map((group) => ({
        pathway: group.pathway,
        label: pathwayLabels[group.pathway] || formatStatusLabel(group.pathway),
        average: group.count ? Math.round(group.totalConfidence / group.count) : 0,
        count: group.count,
      }))
      .sort((a, b) => b.average - a.average);
  }, [dssAuditRuns]);

  const sortedRuleChangeRequests = useMemo(() => {
    const query = ruleRequestSearch.trim().toLowerCase();
    const filtered = ruleChangeRequests.filter((request) => {
      const status = String(request.status || "pending");
      const statusMatch = ruleRequestFilter === "all" || status === ruleRequestFilter;
      const queryMatch =
        !query ||
        [
          request.rule_area,
          request.partner_name,
          request.requested_by_name,
          request.requested_by_email,
          request.requested_change,
          request.reason,
          request.admin_notes,
          status,
        ]
          .join(" ")
          .toLowerCase()
          .includes(query);

      return statusMatch && queryMatch;
    });

    return filtered.sort((a, b) => {
      if (ruleRequestSort === "partner") {
        return String(a.partner_name || "").localeCompare(String(b.partner_name || ""));
      }

      if (ruleRequestSort === "status") {
        return String(a.status || "").localeCompare(String(b.status || ""));
      }

      return getTimestamp(b.created_at) - getTimestamp(a.created_at);
    });
  }, [ruleChangeRequests, ruleRequestFilter, ruleRequestSearch, ruleRequestSort]);

  const systemActivity = useMemo(() => {
    const accountEvents = accounts.slice(0, 4).map((account) => ({
      timestamp: account.joined,
      action: `${account.role} account ${account.status}`,
      user: account.name,
    }));
    const dssEvents = dssAuditRuns.slice(0, 4).map((run) => ({
      timestamp: run.created_at,
      action: `DSS ${run.recommended_pathway} recommendation`,
      user: run.submission_name || run.item_type || "Submission",
    }));
    const ruleEvents = ruleChangeRequests.slice(0, 4).map((request) => ({
      timestamp: request.updated_at || request.reviewed_at || request.created_at,
      action: `Partner rule request ${request.status || "pending"}`,
      user: request.partner_name || request.requested_by_name || "Partner",
    }));

    return [...ruleEvents, ...dssEvents, ...accountEvents]
      .sort((a, b) => getTimestamp(b.timestamp) - getTimestamp(a.timestamp))
      .slice(0, isActivityExpanded ? 12 : 4);
  }, [accounts, dssAuditRuns, isActivityExpanded, ruleChangeRequests]);

  const openCreateModal = (role = activeRole) => {
    setActiveRole(role);
    setEditingAccount(null);
    setFormData({
      ...emptyForm,
      organization: role === "User" ? "Individual" : role === "Admin" ? "ClothCycle PH" : "",
    });
    setIsAccountModalOpen(true);
  };

  const openEditModal = (account) => {
    setEditingAccount(account);
    setFormData({
      name: account.name,
      email: account.email,
      phone: account.phone,
      organization: account.organization,
      status: account.status,
      password: "",
    });
    setIsAccountModalOpen(true);
  };

  const closeAccountModal = () => {
    setIsAccountModalOpen(false);
    setEditingAccount(null);
    setFormData(emptyForm);
  };

  const handleFormChange = (field, value) => {
    setFormData((current) => ({ ...current, [field]: value }));
  };

  const handleSaveAccount = async (event) => {
    event.preventDefault();
    setAdminError("");

    try {
      if (editingAccount) {
        const response = await adminService.updateUser(editingAccount.id, {
          name: formData.name,
          email: formData.email,
          role: activeRole.toLowerCase(),
          status: formData.status,
          phone: formData.phone,
          address: '',
          partner_id: null,
        });

        setAccounts((current) =>
          current.map((account) =>
            account.id === editingAccount.id
              ? mapUserToAccount(response.data)
              : account
          )
        );
      } else {
        const response = await adminService.createUser({
          name: formData.name,
          email: formData.email,
          role: activeRole.toLowerCase(),
          status: formData.status,
          phone: formData.phone,
          address: '',
          partner_id: null,
          password: formData.password || undefined,
        });

        setAccounts((current) => [mapUserToAccount(response.data), ...current]);
      }

      closeAccountModal();
    } catch (saveError) {
      setAdminError(saveError.message || "Unable to save account.");
    }
  };

  const confirmDeleteAccount = async () => {
    if (!deleteTarget) {
      return;
    }

    try {
      await adminService.deleteUser(deleteTarget.id);
      setAccounts((current) =>
        current.filter((account) => account.id !== deleteTarget.id)
      );
    } catch (deleteError) {
      setAdminError(deleteError.message || "Unable to delete account.");
    } finally {
      setDeleteTarget(null);
    }
  };

  const confirmSuspendAccount = async () => {
    if (!suspendTarget) {
      return;
    }

    const nextStatus = suspendTarget.status === "suspended" ? "active" : "suspended";

    try {
      const response = await adminService.updateUser(suspendTarget.id, {
        name: suspendTarget.name,
        email: suspendTarget.email,
        role: suspendTarget.role.toLowerCase(),
        status: nextStatus,
        phone: suspendTarget.phone,
        address: '',
        partner_id: null,
      });

      setAccounts((current) =>
        current.map((account) =>
          account.id === suspendTarget.id ? mapUserToAccount(response.data) : account
        )
      );

      if (editingAccount?.id === suspendTarget.id) {
        setEditingAccount((current) =>
          current ? { ...current, status: nextStatus } : current
        );
        setFormData((current) => ({ ...current, status: nextStatus }));
      }
    } catch (updateError) {
      setAdminError(updateError.message || "Unable to update account status.");
    } finally {
      setSuspendTarget(null);
    }
  };

  const handleExportSystemReport = () => {
    const rows = [
      ["metric", "value"],
      ["users", roleCounts.User || 0],
      ["admins", roleCounts.Admin || 0],
      ["partners", roleCounts.Partner || 0],
      ["dss_audit_runs", dssAuditRuns.length],
      ["partner_rule_requests", ruleChangeRequests.length],
      ["pending_rule_requests", ruleChangeRequests.filter((request) => request.status === "pending").length],
      ["submissions", adminSubmissions.length],
      ["dss_rules", dssRules.length],
      ["deleted_records", deletedRecords.length],
      ["system_health", systemHealth.value],
    ];
    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "clothcycle-system-report.csv";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const handleExportAudit = async () => {
    try {
      const blob = await dssService.exportAuditReport();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "clothcycle-dss-audit.csv";
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      setDssAuditError(error.message || "Unable to export DSS audit report.");
    }
  };

  const updateRuleRequestStatus = async (request, status) => {
    setDssAuditError("");

    try {
      const response = await dssService.updateRuleChangeRequestStatus(request.id, {
        status,
        admin_note: ruleRequestNotes[request.id] || undefined,
      });
      setRuleChangeRequests((current) =>
        current.map((item) =>
          item.id === request.id ? { ...item, ...response.data } : item,
        ),
      );
      setRuleRequestNotes((current) => ({ ...current, [request.id]: "" }));
    } catch (error) {
      setDssAuditError(error.message || "Unable to update partner rule request.");
    }
  };

  const submitRuleRequestReply = async (request) => {
    const message = String(ruleReplyDrafts[request.id] || "").trim();

    if (!message) {
      setRuleReplyStatus((current) => ({ ...current, [request.id]: { type: "error", message: "Add a reply before sending." } }));
      return;
    }

    setRuleReplyStatus((current) => ({ ...current, [request.id]: { type: "loading", message: "Sending reply..." } }));

    try {
      await dssService.replyToRuleChangeRequest(request.id, { message });
      const response = await dssService.getRuleChangeRequests();
      setRuleChangeRequests(response.data);
      setRuleReplyDrafts((current) => ({ ...current, [request.id]: "" }));
      setRuleReplyStatus((current) => ({ ...current, [request.id]: { type: "success", message: "Reply sent to partner." } }));
    } catch (error) {
      setRuleReplyStatus((current) => ({
        ...current,
        [request.id]: { type: "error", message: error.message || "Unable to send reply." },
      }));
    }
  };

  const createDssRule = async (event) => {
    event.preventDefault();
    setDssAuditError("");
    try {
      const response = await adminService.createDssRule({
        ...dssRuleForm,
        rule_key: dssRuleForm.rule_key || buildDssRuleKey(dssRuleForm),
        pathway: dssRuleForm.pathway || null,
        expected_values: dssRuleForm.expected_values_text
          .split(/[\n,]/)
          .map((value) => value.trim())
          .filter(Boolean),
        active: true,
      });
      setDssRules((current) => [response.data, ...current]);
      setDssRuleForm({
        rule_key: "",
        pathway: "",
        category: "",
        question_key: "",
        expected_values_text: "",
        weight: 0,
        description: "",
      });
    } catch (error) {
      setDssAuditError(error.message || "Unable to create DSS rule.");
    }
  };

  const toggleDssRule = async (rule) => {
    const response = await adminService.updateDssRule(rule.id, {
      ...rule,
      active: !rule.active,
      expected_values: rule.expected_values || [],
    });
    setDssRules((current) => current.map((item) => (item.id === rule.id ? response.data : item)));
  };

  const deleteDssRule = async (rule) => {
    await adminService.deleteDssRule(rule.id);
    setDssRules((current) => current.filter((item) => item.id !== rule.id));
  };

  return (
    <div className="admin-dashboard app-darkable-page min-h-screen bg-[radial-gradient(circle_at_top_left,_#e5e7eb,_transparent_28%),linear-gradient(135deg,#f7f7f7,#ffffff,#eeeeee)]">
      {/* Top Navigation */}
      <nav className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Recycle className="w-6 h-6 text-gray-950" />
              <span className="text-xl text-gray-950 font-gloock">ClothCycle PH</span>
            </div>
            <span className="admin-crown-badge px-3 py-1 bg-[#fff3c4] text-[#4a3300] text-sm rounded-full flex items-center gap-1">
              <Crown className="w-3 h-3 text-[#9a7a2f]" />
              Admin
            </span>
          </div>

          <div className="flex items-center gap-4">
            <Link to="/messages?theme=admin" className="relative w-10 h-10 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center hover:bg-gray-200 transition-colors" aria-label="Open messages" title="Messages">
              <MessageSquare className="w-5 h-5 text-gray-700" />
              {badgeCounts.messages > 0 && <span className="absolute right-1 top-1 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white" />}
            </Link>
            <Link to="/notifications?theme=admin" className="relative w-10 h-10 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center hover:bg-gray-200 transition-colors">
              <Bell className="w-5 h-5 text-gray-700" />
              {badgeCounts.notifications > 0 && <span className="absolute right-1 top-1 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white" />}
            </Link>
            <div className="relative">
              <button
                onClick={() => setIsProfileMenuOpen((isOpen) => !isOpen)}
                className="w-10 h-10 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center hover:bg-gray-200 transition-colors"
                aria-label="Open profile menu"
                title="Profile"
              >
                <User className="w-5 h-5 text-gray-700" />
              </button>

              {isProfileMenuOpen && (
                <div className="absolute right-0 top-12 z-30 w-44 rounded-2xl border border-gray-200 bg-white p-2 shadow-[0_16px_40px_rgba(0,0,0,0.14)]">
                  <Link
                    to="/settings?theme=admin"
                    onClick={() => setIsProfileMenuOpen(false)}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm text-gray-950 hover:bg-gray-100"
                  >
                    <Settings className="h-4 w-4 text-gray-600" />
                    Settings
                  </Link>
                  <button
                    onClick={() => {
                      setIsProfileMenuOpen(false);
                      setShowLogoutConfirm(true);
                    }}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                  >
                    <LogOut className="h-4 w-4" />
                    Log Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      <div className="p-6 max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-4xl mb-2 text-gray-950 flex items-center gap-3">
            <Crown className="w-10 h-10 text-[#9a7a2f]" />
            Admin Dashboard
          </h1>
          <p className="text-lg text-gray-600">Full system control and management</p>
        </motion.div>

        {/* System Metrics */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          {[
            { icon: Users, label: "Users", value: roleCounts.User, trend: roleTrends.User, color: "#111827" },
            { icon: Shield, label: "Admins", value: roleCounts.Admin, trend: roleTrends.Admin, color: "#374151" },
            { icon: Building2, label: "Partners", value: roleCounts.Partner, trend: roleTrends.Partner, color: "#4b5563" },
            { icon: Activity, label: "System Health", value: systemHealth.value, trend: systemHealth.trend, color: "#6b7280" }
          ].map((metric, index) => (
            <motion.div
              key={metric.label}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white p-6 rounded-2xl shadow-lg border border-gray-200 hover:border-gray-950 transition-all"
            >
              <div className="flex items-center justify-between mb-4">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: `${metric.color}` }}
                >
                  <metric.icon className="w-6 h-6 text-white" />
                </div>
                <span className={`text-sm px-2 py-1 rounded-lg ${getTrendClass(metric.trend)}`}>{metric.trend}</span>
              </div>
              <div className="text-3xl mb-1 text-gray-950">{metric.value}</div>
              <div className="text-sm text-gray-600">{metric.label}</div>
            </motion.div>
          ))}
        </div>

        {/* System Growth Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white p-6 rounded-2xl shadow-lg mb-8"
        >
          <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="text-xl text-gray-950">System Growth Analytics</h3>
              <p className="mt-1 text-sm text-gray-600">
                Account growth overview with downloadable operational metrics.
              </p>
            </div>
            <button
              type="button"
              onClick={handleExportSystemReport}
              className="inline-flex w-fit items-center gap-2 rounded-xl bg-gray-950 px-4 py-2 text-sm font-semibold text-white hover:bg-black"
            >
              <Download className="h-4 w-4" />
              Download report
            </button>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={systemGrowthData}>
              <defs>
                <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563eb" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorAdmins" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#16a34a" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorPartners" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#d97706" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#d97706" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="date" stroke="#4b5563" />
              <YAxis stroke="#4b5563" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "white",
                  border: "2px solid #e5e7eb",
                  borderRadius: "12px"
                }}
              />
              <Area type="monotone" dataKey="users" stroke="#2563eb" fillOpacity={1} fill="url(#colorUsers)" strokeWidth={2} />
              <Area type="monotone" dataKey="admins" stroke="#16a34a" fillOpacity={1} fill="url(#colorAdmins)" strokeWidth={2} />
              <Area type="monotone" dataKey="partners" stroke="#d97706" fillOpacity={1} fill="url(#colorPartners)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="mb-8 rounded-2xl border border-gray-200 bg-white p-6 shadow-lg"
        >
          <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <h3 className="text-xl text-gray-950">DSS Explanation Audit</h3>
              <p className="mt-1 text-sm text-gray-600">
                Recent recommendation runs with engine version, rule matches,
                and partner handoff context.
              </p>
            </div>
            <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto lg:justify-end">
              <select
                value={dssAuditSort}
                onChange={(event) => setDssAuditSort(event.target.value)}
                className="min-w-[160px] flex-1 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 sm:flex-none"
              >
                <option value="newest">Newest</option>
                <option value="confidence">Highest confidence</option>
                <option value="score">Highest score</option>
              </select>
              <button
                onClick={() => setShowAllDssAudit((current) => !current)}
                className="flex-1 rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100 sm:flex-none"
              >
                {showAllDssAudit ? "Show less" : "View all"}
              </button>
              <button
                onClick={handleExportAudit}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-gray-950 px-4 py-2 text-sm font-semibold text-white hover:bg-black sm:flex-none"
              >
                <Download className="h-4 w-4" />
                Export CSV
              </button>
            </div>
          </div>

          {dssAuditError && (
            <div className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
              {dssAuditError}
            </div>
          )}

          <div className="mb-5 rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-white/10 dark:bg-white/[0.04]">
            <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h4 className="font-semibold text-gray-950 dark:text-white">
                  Average DSS confidence per pathway
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Mean confidence from saved DSS audit runs.
                </p>
              </div>
              <span className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                {dssAuditRuns.length} total runs
              </span>
            </div>

            {averageDssConfidenceByPathway.length > 0 ? (
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {averageDssConfidenceByPathway.map((item) => (
                  <div
                    key={item.pathway}
                    className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-black/20"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-semibold text-gray-950 dark:text-white">
                          {item.label}
                        </div>
                        <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                          {item.count} {item.count === 1 ? "run" : "runs"}
                        </div>
                      </div>
                      <span className="rounded-full bg-gray-950 px-3 py-1 text-sm font-semibold text-white dark:bg-white dark:text-gray-950">
                        {item.average}%
                      </span>
                    </div>
                    <div className="mt-4 h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-white/10">
                      <div
                        className="h-full rounded-full bg-emerald-600 dark:bg-emerald-400"
                        style={{ width: `${Math.min(item.average, 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-gray-300 bg-white px-4 py-4 text-sm text-gray-600 dark:border-white/10 dark:bg-black/20 dark:text-gray-300">
                No confidence data available yet.
              </div>
            )}
          </div>

          <div className="grid gap-3">
            {dssAuditRuns.length === 0 && (
              <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-4 text-sm text-gray-600">
                No DSS audit runs yet. They appear after users send DSS briefs to partners.
              </div>
            )}

            {sortedDssAuditRuns.slice(0, showAllDssAudit ? 20 : 3).map((run) => (
              <details
                key={run.result_id}
                className="rounded-2xl border border-gray-200 bg-gray-50 p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.04]"
              >
                <summary className="flex cursor-pointer list-none flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="font-semibold text-gray-950">
                      {run.submission_name || run.item_type || "Submission"} · {run.recommended_pathway}
                    </div>
                    <div className="mt-1 text-sm text-gray-600">
                      {run.engine_version} · {Math.round(Number(run.confidence || 0) * 100)}% confidence · {run.partner_name || "No partner"}
                    </div>
                  </div>
                  <span className="rounded-full bg-white px-3 py-1 text-sm text-gray-700">
                    Score {Number(run.score || 0).toFixed(0)}
                  </span>
                </summary>
                <p className="mt-3 text-sm leading-6 text-gray-700">
                  {run.explanation}
                </p>
                {run.output_payload?.rule_checks?.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {run.output_payload.rule_checks.map((check) => (
                      <span
                        key={`${run.result_id}-${check.question}`}
                        className={`rounded-full px-3 py-1 text-xs ${
                          check.matched
                            ? "bg-green-100 text-green-700"
                            : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {check.question}: {check.matched ? "matched" : "missed"}
                      </span>
                    ))}
                  </div>
                )}
              </details>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.36 }}
          className="mb-8 grid gap-6"
        >
          <section className="order-2 rounded-2xl border border-gray-200 bg-white p-6 shadow-lg dark:border-white/10 dark:bg-white/[0.04]">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-xl text-gray-950 dark:text-white">Submission Oversight</h3>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                  Latest submitted textile items and current review status.
                </p>
              </div>
              <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700 dark:bg-white/10 dark:text-gray-200">
                {adminSubmissions.length}
              </span>
            </div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {adminSubmissions.slice(0, 6).map((submission) => (
                <div
                  key={submission.id}
                  className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-white/10 dark:bg-black/20"
                >
                  <div className="flex h-full flex-col gap-4 sm:flex-row sm:items-center sm:justify-between md:flex-col md:items-stretch xl:flex-row xl:items-center">
                    <div className="min-w-0">
                      <div className="truncate font-semibold text-gray-950 dark:text-white">
                        {submission.submission_name || submission.item_type}
                      </div>
                      <div className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                        {submission.user_name || submission.user_email || "Unknown user"} · {submission.service_type || "not sure"}
                      </div>
                    </div>
                    <select
                      value={submission.status || "pending"}
                      onChange={async (event) => {
                        const status = event.target.value;
                        await adminService.updateSubmissionStatus(submission.id, { status });
                        setAdminSubmissions((current) =>
                          current.map((item) => (item.id === submission.id ? { ...item, status } : item)),
                        );
                      }}
                      className="h-10 rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-700 dark:border-white/10 dark:bg-black/20 dark:text-white"
                    >
                      <option value="pending">Pending</option>
                      <option value="verified">Verified</option>
                      <option value="processed">Processed</option>
                      <option value="rejected">Rejected</option>
                    </select>
                  </div>
                </div>
              ))}
              {adminSubmissions.length === 0 && (
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600 dark:border-white/10 dark:bg-black/20 dark:text-gray-300 md:col-span-2 xl:col-span-3">
                  No submissions yet.
                </div>
              )}
            </div>
          </section>

          <section className="order-1 rounded-2xl border border-gray-200 bg-white p-6 shadow-lg dark:border-white/10 dark:bg-white/[0.04]">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-xl text-gray-950 dark:text-white">Deleted Records</h3>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                  Open the admin-only archive for removed records and delete actions.
                </p>
              </div>
              <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700 dark:bg-white/10 dark:text-gray-200">
                {deletedRecords.length}
              </span>
            </div>
            <Link
              to="/admin/deleted-records"
              className="mb-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gray-950 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-black dark:bg-white dark:text-gray-950 dark:hover:bg-gray-200"
            >
              View Deleted Records
              <ChevronRight className="h-4 w-4" />
            </Link>
            <div className="space-y-3">
              {deletedRecords.slice(0, 5).map((record) => (
                <details
                  key={record.id}
                  className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-white/10 dark:bg-black/20"
                >
                  <summary className="cursor-pointer text-sm font-semibold text-gray-950 dark:text-white">
                    {record.entity_type} · {record.snapshot?.name || record.snapshot?.email || record.entity_id}
                  </summary>
                  <div className="mt-2 text-xs text-gray-600 dark:text-gray-300">
                    Deleted {record.deleted_at ? formatManilaDate(record.deleted_at) : "recently"}
                  </div>
                  <pre className="mt-3 max-h-44 overflow-auto rounded-lg bg-white p-3 text-xs text-gray-700 dark:bg-black/30 dark:text-gray-200">
                    {JSON.stringify(record.snapshot || {}, null, 2)}
                  </pre>
                </details>
              ))}
              {deletedRecords.length === 0 && (
                <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-4 text-sm text-gray-600 dark:border-white/10 dark:bg-black/20 dark:text-gray-300">
                  No deleted records have been archived yet.
                </div>
              )}
            </div>
          </section>

          <section className="order-3 rounded-2xl border border-gray-200 bg-white p-6 shadow-lg dark:border-white/10 dark:bg-white/[0.04]">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-xl text-gray-950 dark:text-white">Editable DSS Rules</h3>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                  Save admin DSS rule records for audit and future rule publishing.
                </p>
              </div>
              <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700 dark:bg-white/10 dark:text-gray-200">
                {dssRules.length}
              </span>
            </div>
            <div className="space-y-3">
              <form onSubmit={createDssRule} className="grid gap-3 rounded-xl border border-dashed border-gray-300 bg-gray-50 p-4 dark:border-white/10 dark:bg-black/20">
                <div className="grid gap-2 lg:grid-cols-2">
                  <label className="grid gap-1 text-sm font-semibold text-gray-700 dark:text-gray-200">
                    Rule name / ID
                    <input
                      value={dssRuleForm.rule_key}
                      onChange={(event) => setDssRuleForm((current) => ({ ...current, rule_key: event.target.value }))}
                      className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-normal dark:border-white/10 dark:bg-black/20 dark:text-white"
                      placeholder={buildDssRuleKey(dssRuleForm)}
                    />
                    <span className="text-xs font-normal text-gray-500 dark:text-gray-400">
                      Optional. Auto-generated if blank.
                    </span>
                  </label>
                  <label className="grid gap-1 text-sm font-semibold text-gray-700 dark:text-gray-200">
                    Recommendation affected
                    <select
                      value={dssRuleForm.pathway}
                      onChange={(event) => setDssRuleForm((current) => ({ ...current, pathway: event.target.value }))}
                      className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-normal dark:border-white/10 dark:bg-black/20 dark:text-white"
                    >
                      {dssRulePathwayOptions.map((option) => (
                        <option key={option.value || "general"} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <span className="text-xs font-normal text-gray-500 dark:text-gray-400">
                      Which score this affects.
                    </span>
                  </label>
                </div>
                <div className="grid gap-2 lg:grid-cols-2">
                  <label className="grid gap-1 text-sm font-semibold text-gray-700 dark:text-gray-200">
                    Rule group
                    <select
                      value={dssRuleForm.category}
                      onChange={(event) => setDssRuleForm((current) => ({ ...current, category: event.target.value }))}
                      className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-normal dark:border-white/10 dark:bg-black/20 dark:text-white"
                    >
                      {dssRuleCategoryOptions.map((option) => (
                        <option key={option.value || "empty"} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <span className="text-xs font-normal text-gray-500 dark:text-gray-400">
                      Rule section.
                    </span>
                  </label>
                  <label className="grid gap-1 text-sm font-semibold text-gray-700 dark:text-gray-200">
                    Form answer checked
                    <select
                      value={dssRuleForm.question_key}
                      onChange={(event) => setDssRuleForm((current) => ({ ...current, question_key: event.target.value }))}
                      className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-normal dark:border-white/10 dark:bg-black/20 dark:text-white"
                    >
                      {dssRuleQuestionOptions.map((option) => (
                        <option key={option.value || "empty"} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <span className="text-xs font-normal text-gray-500 dark:text-gray-400">
                      Field to check.
                    </span>
                  </label>
                </div>
                <div className="grid min-w-0 gap-2 xl:grid-cols-[minmax(0,1fr)_7rem]">
                  <label className="grid min-w-0 gap-1 text-sm font-semibold text-gray-700 dark:text-gray-200">
                    Answer values that match this rule
                    <input
                      value={dssRuleForm.expected_values_text}
                      onChange={(event) => setDssRuleForm((current) => ({ ...current, expected_values_text: event.target.value }))}
                      className="box-border w-full min-w-0 max-w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-normal dark:border-white/10 dark:bg-black/20 dark:text-white"
                      placeholder="Clean, Washed, Ready to wear"
                    />
                    <span className="text-xs font-normal text-gray-500 dark:text-gray-400">
                      Comma-separated.
                    </span>
                  </label>
                  <label className="grid min-w-0 max-w-full gap-1 text-sm font-semibold text-gray-700 dark:text-gray-200">
                    Points
                    <input
                      type="number"
                      step="0.1"
                      inputMode="decimal"
                      value={dssRuleForm.weight}
                      onChange={(event) => setDssRuleForm((current) => ({ ...current, weight: Number(event.target.value) }))}
                      className="box-border w-full min-w-0 max-w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-normal dark:border-white/10 dark:bg-black/20 dark:text-white"
                      placeholder="2"
                    />
                    <span className="break-words text-xs font-normal text-gray-500 dark:text-gray-400">
                      Score weight.
                    </span>
                  </label>
                </div>
                <label className="grid gap-1 text-sm font-semibold text-gray-700 dark:text-gray-200">
                  Admin note / rule explanation
                  <textarea
                    value={dssRuleForm.description}
                    onChange={(event) => setDssRuleForm((current) => ({ ...current, description: event.target.value }))}
                    rows={2}
                    className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-normal dark:border-white/10 dark:bg-black/20 dark:text-white"
                    placeholder="Why should this answer affect the recommendation?"
                  />
                </label>
                <button type="submit" className="rounded-xl bg-gray-950 px-4 py-2 text-sm font-semibold text-white dark:bg-white dark:text-gray-950">
                  Add DSS rule record
                </button>
              </form>

              {dssRules.slice(0, 5).map((rule) => (
                <details
                  key={rule.id}
                  className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-white/10 dark:bg-black/20"
                >
                  <summary className="cursor-pointer list-none font-semibold text-gray-950 dark:text-white">
                    {rule.rule_key} · {rule.pathway || "general"}
                  </summary>
                  <div className="mt-3 text-sm leading-6 text-gray-600 dark:text-gray-300">
                    <div>Category: {rule.category || "Not set"}</div>
                    <div>Question: {rule.question_key || "Not set"}</div>
                    <div>Weight: {rule.weight || 0}</div>
                    <div>Status: {rule.active ? "Active" : "Inactive"}</div>
                    {rule.description && <p className="mt-2">{rule.description}</p>}
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => toggleDssRule(rule)}
                        className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100 dark:border-white/10 dark:bg-white/10 dark:text-white"
                      >
                        {rule.active ? "Deactivate" : "Activate"}
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteDssRule(rule)}
                        className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-100 dark:border-red-400/20 dark:bg-red-400/10 dark:text-red-200"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </details>
              ))}
              {dssRules.length === 0 && (
                <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-4 text-sm text-gray-600 dark:border-white/10 dark:bg-black/20 dark:text-gray-300">
                  No editable DSS rule records yet. Use the admin API to seed rule records from the current matrix.
                </div>
              )}
            </div>
          </section>
        </motion.div>

        <motion.div
          id="rule-requests"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.38 }}
          className={`mb-8 rounded-2xl border bg-white p-6 shadow-lg ${
            searchParams.get("panel") === "rule-requests" ? "border-gray-950 ring-2 ring-gray-950/10" : "border-gray-200"
          }`}
        >
          <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="text-xl text-gray-950">Partner Rule Requests</h3>
              <p className="mt-1 text-sm text-gray-600">
                Requests sent by partners for DSS criteria, preference, capacity, or pickup-area updates.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <label className="relative block">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                <input
                  value={ruleRequestSearch}
                  onChange={(event) => setRuleRequestSearch(event.target.value)}
                  className="w-64 rounded-xl border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm text-gray-700 outline-none focus:border-gray-500 dark:border-white/10 dark:bg-black/20 dark:text-white"
                  placeholder="Search requests"
                />
              </label>
              <select
                value={ruleRequestFilter}
                onChange={(event) => setRuleRequestFilter(event.target.value)}
                className="w-fit rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 dark:border-white/10 dark:bg-black/20 dark:text-white"
              >
                <option value="all">All statuses</option>
                <option value="pending">Pending</option>
                <option value="accepted">Accepted</option>
                <option value="declined">Declined</option>
                <option value="needs_more_information">Needs more information</option>
              </select>
              <select
                value={ruleRequestSort}
                onChange={(event) => setRuleRequestSort(event.target.value)}
                className="w-fit rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 dark:border-white/10 dark:bg-black/20 dark:text-white"
              >
                <option value="newest">Newest</option>
                <option value="partner">Partner</option>
                <option value="status">Status</option>
              </select>
              <button
                type="button"
                onClick={() => setShowAllRuleRequests((current) => !current)}
                className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100"
              >
                {showAllRuleRequests ? "Show less" : "View all"}
              </button>
            </div>
          </div>

          <div className="grid gap-3">
            {sortedRuleChangeRequests.length === 0 && (
              <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-4 text-sm text-gray-600">
                No partner rule requests yet.
              </div>
            )}

            {sortedRuleChangeRequests.slice(0, showAllRuleRequests ? 30 : 3).map((request, index) => {
              const isHighlighted = highlightedRuleRequestId === request.id;
              const replies = request.replies || [];
              const replyState = ruleReplyStatus[request.id];

              return (
              <motion.details
                key={request.id}
                initial={{ opacity: 0, y: 12 }}
                animate={isHighlighted ? { opacity: 1, y: 0, scale: [1, 1.015, 1] } : { opacity: 1, y: 0 }}
                transition={{ delay: index * 0.04, duration: isHighlighted ? 0.75 : 0.25 }}
                whileHover={{ y: -2 }}
                defaultOpen={isHighlighted}
                className={`overflow-hidden rounded-2xl border bg-white shadow-sm transition-all hover:border-gray-400 hover:shadow-xl dark:bg-white/[0.04] dark:hover:border-white/25 ${
                  isHighlighted
                    ? "border-gray-950 ring-2 ring-gray-950/15 dark:border-white/40 dark:ring-white/20"
                    : "border-gray-200 dark:border-white/10"
                }`}
              >
                <summary className="flex cursor-pointer list-none flex-col gap-3 bg-gradient-to-r from-gray-50 to-white px-5 py-4 md:flex-row md:items-center md:justify-between dark:from-white/[0.06] dark:to-transparent">
                  <div>
                    <div className="font-semibold text-gray-950 dark:text-white">
                      {request.rule_area} · {request.partner_name || request.requested_by_name || "Partner"}
                    </div>
                    <div className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                      Requested by {request.requested_by_name || request.requested_by_email || "Unknown"} · {formatStatusLabel(request.status || "pending")}
                    </div>
                  </div>
                  <span className={`w-fit rounded-full px-3 py-1 text-xs font-semibold capitalize ${getStatusClass(request.status || "pending")}`}>
                    {(request.status || "pending").replace(/_/g, " ")}
                  </span>
                </summary>
                <div className="grid gap-4 border-t border-gray-200 p-5 dark:border-white/10 lg:grid-cols-[1fr_380px]">
                  <div className="space-y-3 text-sm leading-6 text-gray-700 dark:text-gray-300">
                    <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-white/10 dark:bg-black/20">
                      <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Requested change</div>
                      <p className="mt-2 text-base text-gray-950 dark:text-white">{request.requested_change}</p>
                    </div>
                    {request.reason && (
                      <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-white/10 dark:bg-black/20">
                        <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Partner reason</div>
                        <p className="mt-2">{request.reason}</p>
                      </div>
                    )}
                    {request.admin_notes && (
                      <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-white/10 dark:bg-black/20">
                        <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Last admin note</div>
                        <p className="mt-2">{request.admin_notes}</p>
                      </div>
                    )}
                    <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-white/10 dark:bg-black/20">
                      <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Reply thread</div>
                      <div className="mt-3 space-y-2">
                        {replies.length === 0 && (
                          <p className="text-sm text-gray-600 dark:text-gray-300">No replies yet.</p>
                        )}
                        {replies.map((reply) => (
                          <div key={reply.id} className="rounded-xl border border-gray-200 bg-white px-3 py-2 dark:border-white/10 dark:bg-white/[0.05]">
                            <div className="mb-1 flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                              <span className="font-semibold capitalize">{reply.author_role}</span>
                              <span>{reply.author_name || reply.author_email || "Unknown"}</span>
                              <span>
                                {reply.created_at
                                  ? formatManilaDate(reply.created_at, {
                                      month: "short",
                                      day: "numeric",
                                      year: "numeric",
                                      hour: "numeric",
                                      minute: "2-digit",
                                      timeZone: "Asia/Manila",
                                    })
                                  : "Recent"}
                              </span>
                            </div>
                            <p>{reply.message}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-gray-200 bg-white p-4 text-gray-950 shadow-lg dark:border-white/10 dark:bg-white/[0.05] dark:text-white lg:sticky lg:top-4 lg:self-start">
                    <div className="mb-4">
                      <div className="font-semibold text-gray-950 dark:text-white">Admin decision</div>
                      <p className="mt-1 text-sm leading-6 text-gray-600 dark:text-gray-300">
                        This note and status will be sent to the partner.
                      </p>
                    </div>
                  <textarea
                    value={ruleRequestNotes[request.id] || ""}
                    onChange={(event) =>
                      setRuleRequestNotes((current) => ({
                        ...current,
                        [request.id]: event.target.value,
                      }))
                    }
                    rows={4}
                    className="w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-950 outline-none placeholder:text-gray-500 focus:border-gray-500 dark:border-white/10 dark:bg-black/20 dark:text-white dark:placeholder:text-gray-400 dark:focus:border-white/40"
                    placeholder="Optional message to partner before updating status"
                  />
                  <div className="mt-3 grid gap-2 sm:grid-cols-3 lg:grid-cols-1">
                    {[
                      ["accepted", "Accept", CheckCircle, "bg-emerald-600 hover:bg-emerald-500"],
                      ["needs_more_information", "Need more info", HelpCircle, "bg-amber-500 hover:bg-amber-400"],
                      ["declined", "Decline", XCircle, "bg-red-600 hover:bg-red-500"],
                    ].map(([status, label, Icon, className]) => (
                      <motion.button
                        key={status}
                        type="button"
                        whileTap={{ scale: 0.98 }}
                        onClick={() => updateRuleRequestStatus(request, status)}
                        className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-white transition-all ${className}`}
                      >
                        <Icon className="h-4 w-4" />
                        {label}
                      </motion.button>
                    ))}
                  </div>
                  <div className="mt-5 border-t border-gray-200 pt-4 dark:border-white/10">
                    <div className="mb-2 text-sm font-semibold text-gray-950 dark:text-white">Reply to partner</div>
                    <textarea
                      value={ruleReplyDrafts[request.id] || ""}
                      onChange={(event) =>
                        setRuleReplyDrafts((current) => ({ ...current, [request.id]: event.target.value }))
                      }
                      rows={3}
                      disabled={replyState?.type === "loading"}
                      className="w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-950 outline-none placeholder:text-gray-500 focus:border-gray-500 disabled:opacity-60 dark:border-white/10 dark:bg-black/20 dark:text-white"
                      placeholder="Add a clarification or next step for this partner..."
                    />
                    <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      {replyState?.message ? (
                        <span className={`text-xs ${replyState.type === "error" ? "text-red-600 dark:text-red-300" : "text-gray-600 dark:text-gray-300"}`}>
                          {replyState.message}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-500 dark:text-gray-400">Replies are visible to the related partner.</span>
                      )}
                      <button
                        type="button"
                        onClick={() => submitRuleRequestReply(request)}
                        disabled={replyState?.type === "loading"}
                        className="rounded-xl bg-gray-950 px-4 py-2 text-sm font-semibold text-white hover:bg-black disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-gray-950 dark:hover:bg-gray-200"
                      >
                        {replyState?.type === "loading" ? "Sending..." : "Send reply"}
                      </button>
                    </div>
                  </div>
                  </div>
                </div>
              </motion.details>
              );
            })}
          </div>
        </motion.div>

        {/* Role Management Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          {Object.entries(roleConfig).map(([role, card], index) => (
            <motion.button
              key={role}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 + index * 0.1 }}
              whileHover={{ scale: 1.02 }}
              onClick={() => {
                setActiveRole(role);
                setSearchQuery("");
              }}
              className={`bg-white p-6 rounded-2xl shadow-lg hover:shadow-2xl transition-all text-left border ${
                activeRole === role ? "border-gray-950" : "border-gray-200"
              }`}
            >
              <div
                className="w-14 h-14 rounded-xl flex items-center justify-center mb-4"
                style={{ backgroundColor: card.color }}
              >
                <card.icon className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl mb-2 text-gray-950">{card.title}</h3>
              <p className="mb-4 min-h-10 text-sm text-gray-600">{card.description}</p>
              <div className="flex items-center justify-between">
                <span className="text-2xl text-gray-600">
                  {roleCounts[role]} {card.label.toLowerCase()}
                </span>
                <ChevronRight className="w-5 h-5 text-gray-600" />
              </div>
            </motion.button>
          ))}
        </div>

        {/* Account Management Table */}
        <motion.div
          key={activeRole}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mb-8 overflow-hidden rounded-2xl bg-white shadow-lg"
        >
          <details open>
            <summary className="flex cursor-pointer list-none flex-col gap-4 border-b border-gray-200 p-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <div
                  className="flex h-11 w-11 items-center justify-center rounded-xl"
                  style={{ backgroundColor: activeConfig.color }}
                >
                  <activeConfig.icon className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="text-xl text-gray-950">{activeConfig.title}</h3>
                  <p className="text-sm text-gray-600">{activeConfig.description}</p>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative min-w-[260px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder={`Search ${activeConfig.label.toLowerCase()}...`}
                  className="pl-10 pr-4 py-2 border-2 border-gray-200 rounded-lg focus:border-gray-950 focus:outline-none bg-white text-gray-950"
                />
              </div>
              {canCreateRole(activeRole) && (
                <button
                  onClick={() => openCreateModal(activeRole)}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-gray-950 px-4 py-2 text-white transition-colors hover:bg-black"
                >
                  <Plus className="h-4 w-4" />
                  Add {activeRole}
                </button>
              )}
            </div>
          </summary>

          <div className="overflow-x-auto p-6 pt-5">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-sm text-gray-600">Name</th>
                  <th className="text-left py-3 px-4 text-sm text-gray-600">Role</th>
                  <th className="text-left py-3 px-4 text-sm text-gray-600">Email</th>
                  <th className="text-left py-3 px-4 text-sm text-gray-600">Phone</th>
                  <th className="text-left py-3 px-4 text-sm text-gray-600">Organization</th>
                  <th className="text-left py-3 px-4 text-sm text-gray-600">Status</th>
                  <th className="text-left py-3 px-4 text-sm text-gray-600">Joined</th>
                  <th className="text-left py-3 px-4 text-sm text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredAccounts.map((item) => (
                  <tr key={item.id} className="border-b border-gray-200 hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-4 text-sm text-gray-950">{item.name}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-3 py-1 rounded-full text-xs ${
                          item.role === "Admin"
                            ? "bg-gray-950 text-white"
                            : item.role === "Partner"
                            ? "bg-gray-200 text-gray-950"
                            : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {item.role}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">{item.email}</td>
                    <td className="py-3 px-4 text-sm text-gray-600">{item.phone}</td>
                    <td className="py-3 px-4 text-sm text-gray-600">{item.organization}</td>
                    <td className="py-3 px-4">
                      <span className={`px-3 py-1 rounded-full text-xs ${getStatusClass(item.status)}`}>
                        {formatStatusLabel(item.status)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">{item.joined}</td>
                    <td className="py-3 px-4">
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => openEditModal(item)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100 transition-colors hover:bg-gray-200"
                          aria-label={`Edit ${item.name}`}
                          title="Edit"
                        >
                          <Pencil className="h-4 w-4 text-gray-700" />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(item)}
                          className="rounded-lg bg-red-100 px-3 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-200"
                          aria-label={`Remove ${item.name}`}
                          title="Remove"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredAccounts.length === 0 && (
              <div className="py-12 text-center text-gray-600">
                No {activeConfig.label.toLowerCase()} match your search.
              </div>
            )}
          </div>
          </details>
        </motion.div>

        {/* System Logs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="bg-white p-6 rounded-2xl shadow-lg"
        >
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-xl text-gray-950">Recent System Activity</h3>
              <p className="mt-1 text-sm text-gray-600">Operational activity preview for admin review.</p>
            </div>
            <button
              onClick={() => setIsActivityExpanded((current) => !current)}
              className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100"
            >
              {isActivityExpanded ? "Collapse" : "View all"}
            </button>
          </div>
          <div className="space-y-3">
            {systemActivity.map((log, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-gray-950"></div>
                  <div>
                    <div className="text-sm text-gray-950">{log.action}</div>
                    <div className="text-xs text-gray-600">{log.user}</div>
                  </div>
                </div>
                <span className="text-right text-sm text-gray-600">
                  <span className="block">{formatActivityTime(log.timestamp)}</span>
                  {log.timestamp && (
                    <span className="block text-xs text-gray-500">
                      {formatActivityExactTime(log.timestamp)}
                    </span>
                  )}
                </span>
              </div>
            ))}
            {systemActivity.length === 0 && (
              <div className="rounded-lg bg-gray-50 p-3 text-sm text-gray-600">
                No live activity yet.
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-6 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-6 shadow-[0_24px_70px_rgba(0,0,0,0.24)]">
            <h2 className="font-sans text-xl font-bold text-gray-950">
              Log out?
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Are you sure you want to log out of your account?
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="rounded-xl border border-gray-200 px-4 py-2 text-gray-600 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  logout();
                  setShowLogoutConfirm(false);
                  navigate("/", { replace: true });
                }}
                className="rounded-xl bg-gray-950 px-4 py-2 text-white hover:bg-black"
              >
                Log Out
              </button>
            </div>
          </div>
        </div>
      )}

      {isAccountModalOpen && (
        <AccountModal
          role={activeRole}
          formData={formData}
          editingAccount={editingAccount}
          adminError={adminError}
          onChange={handleFormChange}
          onClose={closeAccountModal}
          onRequestSuspend={() => setSuspendTarget(editingAccount)}
          onSubmit={handleSaveAccount}
        />
      )}

      {suspendTarget && (
        <ConfirmationDialog
          title={
            suspendTarget.status === "suspended"
              ? `Reactivate ${suspendTarget.role.toLowerCase()}?`
              : `Suspend ${suspendTarget.role.toLowerCase()}?`
          }
          message={
            suspendTarget.status === "suspended"
              ? `${suspendTarget.name} will regain access to their ClothCycle PH account.`
              : `${suspendTarget.name} will lose access until an admin reactivates the account.`
          }
          confirmLabel={
            suspendTarget.status === "suspended" ? "Reactivate" : "Suspend"
          }
          confirmClass={
            suspendTarget.status === "suspended"
              ? "bg-green-700 hover:bg-green-800"
              : "bg-amber-600 hover:bg-amber-700"
          }
          onCancel={() => setSuspendTarget(null)}
          onConfirm={confirmSuspendAccount}
        />
      )}

      {deleteTarget && (
        <ConfirmationDialog
          title={`Remove ${deleteTarget.role.toLowerCase()}?`}
          message={`This will permanently remove ${deleteTarget.name} from the ${deleteTarget.role.toLowerCase()} management list.`}
          confirmLabel="Remove"
          confirmClass="bg-red-600 hover:bg-red-700"
          onCancel={() => setDeleteTarget(null)}
          onConfirm={confirmDeleteAccount}
        />
      )}
    </div>
  );
}

function ConfirmationDialog({
  title,
  message,
  confirmLabel,
  confirmClass,
  onCancel,
  onConfirm,
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-6 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-6 shadow-[0_24px_70px_rgba(0,0,0,0.24)]">
        <h2 className="font-sans text-xl font-bold text-gray-950">
          {title}
        </h2>
        <p className="mt-2 text-sm text-gray-600">{message}</p>
        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="rounded-xl border border-gray-200 px-4 py-2 text-gray-600 hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`rounded-xl px-4 py-2 text-white ${confirmClass}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function AccountModal({
  role,
  formData,
  editingAccount,
  adminError,
  onChange,
  onClose,
  onRequestSuspend,
  onSubmit,
}) {

  const title = editingAccount ? `Edit ${role}` : `Add ${role}`;
  const config = roleConfig[role];
  const showSuspendAction = editingAccount && canSuspendRole(role);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-6 backdrop-blur-sm">
      <motion.form
        initial={{ opacity: 0, y: 18, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        onSubmit={onSubmit}
        className="w-full max-w-xl rounded-2xl border border-gray-200 bg-white p-6 shadow-[0_24px_70px_rgba(0,0,0,0.24)]"
      >
        <div className="mb-6 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              className="flex h-11 w-11 items-center justify-center rounded-xl"
              style={{ backgroundColor: config.color }}
            >
              <config.icon className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="font-sans text-2xl font-bold text-gray-950">
                {title}
              </h2>
              <p className="text-sm text-gray-600">
                {editingAccount ? "Update account details." : "Create a new managed account."}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-950"
            aria-label="Close modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {adminError ? (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {adminError}
          </div>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="mb-2 block text-sm text-gray-600">Full Name</span>
            <input
              value={formData.name}
              onChange={(event) => onChange("name", event.target.value)}
              className="w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-3 text-gray-950 outline-none focus:border-gray-950"
              required
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm text-gray-600">Email</span>
            <input
              type="email"
              value={formData.email}
              onChange={(event) => onChange("email", event.target.value)}
              className="w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-3 text-gray-950 outline-none focus:border-gray-950"
              required
            />
          </label>

          {!editingAccount && (
            <label className="block">
              <span className="mb-2 block text-sm text-gray-600">Password (optional)</span>
              <input
                type="password"
                value={formData.password}
                onChange={(event) => onChange("password", event.target.value)}
                className="w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-3 text-gray-950 outline-none focus:border-gray-950"
                placeholder="Leave blank to generate a temporary password"
              />
            </label>
          )}

          <label className="block">
            <span className="mb-2 block text-sm text-gray-600">Phone</span>
            <input
              value={formData.phone}
              onChange={(event) => onChange("phone", event.target.value)}
              className="w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-3 text-gray-950 outline-none focus:border-gray-950"
              required
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm text-gray-600">
              {role === "Partner" ? "Partner Organization" : "Organization"}
            </span>
            <input
              value={formData.organization}
              onChange={(event) => onChange("organization", event.target.value)}
              className="w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-3 text-gray-950 outline-none focus:border-gray-950"
              required
            />
          </label>

          {canSuspendRole(role) ? (
            <div className="md:col-span-2 rounded-xl border border-gray-200 bg-gray-50 p-4">
              <span className="mb-2 block text-sm text-gray-600">Status</span>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <span className={`w-fit rounded-full px-3 py-1 text-xs ${getStatusClass(formData.status)}`}>
                  {formatStatusLabel(formData.status)}
                </span>
                {showSuspendAction && (
                  <button
                    type="button"
                    onClick={onRequestSuspend}
                    className={`rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
                      formData.status === "suspended"
                        ? "bg-green-100 text-green-700 hover:bg-green-200"
                        : "bg-amber-100 text-amber-700 hover:bg-amber-200"
                    }`}
                  >
                    {formData.status === "suspended"
                      ? "Reactivate Account"
                      : "Suspend Account"}
                  </button>
                )}
              </div>
            </div>
          ) : (
            <label className="block md:col-span-2">
              <span className="mb-2 block text-sm text-gray-600">Status</span>
              <select
                value={formData.status}
                onChange={(event) => onChange("status", event.target.value)}
                className="w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-3 text-gray-950 outline-none focus:border-gray-950"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </label>
          )}
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-gray-200 px-4 py-2 text-gray-600 hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-xl bg-gray-950 px-4 py-2 text-white hover:bg-black"
          >
            <Save className="h-4 w-4" />
            Save
          </button>
        </div>
      </motion.form>
    </div>
  );
}
