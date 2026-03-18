import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  Search,
  CreditCard as Edit,
  AlertCircle,
  CheckCircle,
  Clock,
  DollarSign,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  Lock as LockIcon,
} from "lucide-react";
import { useLanguage } from "../contexts/LanguageContext";
import { useAuth } from "../contexts/AuthContext";
import { useCashRegister } from "../contexts/CashRegisterContext";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Modal } from "../components/ui/Modal";
import { Badge, InstallmentStatusBadge } from "../components/ui/Badge";
import { Pagination } from "../components/ui/Table";
import type { InstallmentEntry, Order, Currency } from "../types";
import { supabase } from "../lib/database";

const PAGE_SIZE = 20;
type CustomerLite = {
  id: string;
  full_name_en?: string;
  full_name_ku?: string;
  phone?: string;
};

type OrderLite = Partial<Order> & {
  customer?: CustomerLite;
};

type EntryWithOrder = InstallmentEntry & {
  order?: OrderLite;
};

type SortField =
  | "installment_number"
  | "order_number"
  | "customer"
  | "due_date"
  | "phone"
  | "amount_usd"
  | "paid_amount_usd"
  | "status";

type SortDir = "asc" | "desc";

function todayISO() {
  return new Date().toISOString().split("T")[0];
}

function escapeLike(value: string) {
  return value.replace(/[%_,()]/g, "");
}

function SortIcon({
  field,
  current,
  dir,
}: {
  field: SortField;
  current: SortField;
  dir: SortDir;
}) {
  if (field !== current) {
    return <ChevronsUpDown size={12} className="text-gray-300 ml-1 inline" />;
  }

  return dir === "asc" ? (
    <ChevronUp size={12} className="text-emerald-600 ml-1 inline" />
  ) : (
    <ChevronDown size={12} className="text-emerald-600 ml-1 inline" />
  );
}

const Th = React.memo(function Th({
  field,
  label,
  sortField,
  sortDir,
  onToggle,
}: {
  field: SortField;
  label: string;
  sortField: SortField;
  sortDir: SortDir;
  onToggle: (field: SortField) => void;
}) {
  return (
    <th
      className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase whitespace-nowrap cursor-pointer hover:text-gray-700 select-none"
      onClick={() => onToggle(field)}
    >
      {label}
      <SortIcon field={field} current={sortField} dir={sortDir} />
    </th>
  );
});

const InstallmentRow = React.memo(function InstallmentRow({
  entry,
  language,
  statusLabels,
  isSelected,
  activeSession,
  canModify,
  onToggleSelect,
  onPay,
  onEdit,
  t,
}: {
  entry: EntryWithOrder;
  language: string;
  statusLabels: Record<string, string>;
  isSelected: boolean;
  activeSession: unknown;
  canModify: boolean;
  onToggleSelect: (id: string, checked: boolean) => void;
  onPay: (entry: EntryWithOrder) => void;
  onEdit: (entry: EntryWithOrder) => void;
  t: (key: string) => string;
}) {
  const today = todayISO();
  const effectiveStatus =
    entry.status === "unpaid" && entry.due_date < today ? "overdue" : entry.status;
  const daysOverdue =
    effectiveStatus === "overdue"
      ? Math.floor(
        (new Date(today).getTime() - new Date(entry.due_date).getTime()) / 86400000
      )
      : 0;

  const remaining = Number(entry.amount_usd || 0) - Number(entry.paid_amount_usd || 0);

  const customer = entry.order?.customer;
  const customerName =
    language === "ku" ? customer?.full_name_ku || "" : customer?.full_name_en || "";

  const fmt = (n: number) => `$${Number(n || 0).toFixed(2)}`;
  const fmtDate = (dateStr: string) => {
    // If it's just a date string "2026-03-11", use it directly
    // If it's a full ISO string, extract the date in LOCAL time (not UTC)
    if (dateStr.includes("T")) {
      const date = new Date(dateStr);
      const day = String(date.getDate()).padStart(2, "0");
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    }
    const [year, month, day] = dateStr.split("-");
    return `${day}/${month}/${year}`;
  };
  return (
    <tr
      className={`transition-colors ${effectiveStatus === "overdue" ? "bg-red-50/30" : ""
        } ${isSelected ? "bg-emerald-50/40" : "hover:bg-gray-50/60"}`}
    >
      <td className="px-4 py-3">
        {effectiveStatus !== "paid" && (
          <input
            type="checkbox"
            checked={isSelected}
            onChange={(e) => onToggleSelect(entry.id, e.target.checked)}
            className="rounded"
          />
        )}
      </td>

      <td className="px-4 py-3 font-bold text-gray-600">#{entry.installment_number}</td>

      <td className="px-4 py-3 font-mono text-xs text-emerald-700">
        {entry.order?.order_number || ""}
      </td>

      <td className="px-4 py-3 font-medium text-gray-900">{customerName}</td>

      <td className="px-4 py-3">
        <p className={effectiveStatus === "overdue" ? "text-red-600 font-semibold" : "text-gray-700"}>
          {fmtDate(entry.due_date)}
        </p>
        {daysOverdue > 0 && (
          <p className="text-xs text-red-500">
            {daysOverdue} {t("daysOverdueLabel")}
          </p>
        )}
        {entry.is_modified && (
          <Badge variant="warning" className="text-xs mt-0.5">
            {t("modifiedBadge")}
          </Badge>
        )}
      </td>

      <td className="px-4 py-3 font-medium text-gray-900">{customer?.phone || ""}</td>

      <td className="px-4 py-3 font-semibold text-gray-900">{fmt(entry.amount_usd)}</td>

      <td className="px-4 py-3">
        <div className="text-sm font-medium text-emerald-700">{fmt(entry.paid_amount_usd)}</div>
        {remaining > 0.01 && effectiveStatus !== "unpaid" && (
          <div className="text-xs text-amber-600">
            {t("remainingShort")}: {fmt(remaining)}
          </div>
        )}
        {entry.paid_amount_usd > 0 && entry.amount_usd > 0 && (
          <div className="w-20 h-1 bg-gray-100 rounded-full mt-1">
            <div
              className="h-1 bg-emerald-500 rounded-full"
              style={{
                width: `${Math.min(
                  100,
                  (Number(entry.paid_amount_usd) / Number(entry.amount_usd)) * 100
                )}%`,
              }}
            />
          </div>
        )}
      </td>

      <td className="px-4 py-3">
        <InstallmentStatusBadge
          status={effectiveStatus}
          label={statusLabels[effectiveStatus] || effectiveStatus}
        />
      </td>

      <td className="px-4 py-3">
        <div className="flex items-center gap-1">
          {effectiveStatus !== "paid" && (
            <button
              disabled={!activeSession}
              onClick={() => onPay(entry)}
              className="px-2.5 py-1 text-xs bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200 transition-colors font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {t("payBtn")}
            </button>
          )}

          {canModify && (
            <button
              onClick={() => onEdit(entry)}
              className="p-1.5 rounded-lg hover:bg-amber-50 text-amber-600 transition-colors"
            >
              <Edit size={14} />
            </button>
          )}
        </div>
      </td>
    </tr>
  );
});

export function Installments() {
  const { t, language } = useLanguage();
  const { profile, hasPermission } = useAuth();
  const { activeSession, logTransaction } = useCashRegister();

  const canModify = hasPermission("installments", "update");

  const [entries, setEntries] = useState<EntryWithOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterDate, setFilterDate] = useState("");
  const [sortField, setSortField] = useState<SortField>("due_date");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const [showPayModal, setShowPayModal] = useState(false);
  const [showMultiPayModal, setShowMultiPayModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  const [selectedEntry, setSelectedEntry] = useState<EntryWithOrder | null>(null);
  const [selectedEntries, setSelectedEntries] = useState<Set<string>>(new Set());

  const [payAmount, setPayAmount] = useState("");
  const [payCurrency, setPayCurrency] = useState<Currency>("USD");
  const [payDate, setPayDate] = useState(todayISO());
  const [payNotes, setPayNotes] = useState("");
  const [payDiscountPercent, setPayDiscountPercent] = useState("0");
  const [payDiscountScope, setPayDiscountScope] = useState<"selected" | "all">("selected");

  const [multiPayDate, setMultiPayDate] = useState(todayISO());
  const [multiPayCurrency, setMultiPayCurrency] = useState<Currency>("USD");
  const [multiPayNotes, setMultiPayNotes] = useState("");
  const [multiPayDiscountPercent, setMultiPayDiscountPercent] = useState("0");
  const [multiPayDiscountScope, setMultiPayDiscountScope] = useState<"selected" | "all">(
    "selected"
  );

  const [editAmount, setEditAmount] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editReason, setEditReason] = useState("");

  const [saving, setSaving] = useState(false);
  const [currentRate, setCurrentRate] = useState(1470);
  const [allOrderEntries, setAllOrderEntries] = useState<EntryWithOrder[]>([]);
  const [payAccountantName, setPayAccountantName] = useState("");
  const [multiPayAccountantName, setMultiPayAccountantName] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 300);

    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    supabase
      .from("exchange_rates")
      .select("rate_installment")
      .order("effective_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.rate_installment != null) {
          setCurrentRate(Number(data.rate_installment));
        }
      });
  }, []);

  useEffect(() => {
    setPage(1);
  }, [filterStatus, filterDate, debouncedSearch, sortField, sortDir]);

  const toggleSort = useCallback((field: SortField) => {
    if (field === sortField) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
      return;
    }
    setSortField(field);
    setSortDir("asc");
  }, [sortField]);

  const getAmountUSD = useCallback(
    (amtInCurrency: number, currency: Currency) => {
      if (currency === "USD") return amtInCurrency;
      return amtInCurrency / currentRate;
    },
    [currentRate]
  );

  const hydrateCustomers = useCallback(async (rawEntries: EntryWithOrder[]) => {
    const customerIds = [
      ...new Set(
        rawEntries
          .map((e) => e.order?.customer_id)
          .filter((id): id is string => Boolean(id))
      ),
    ];

    if (customerIds.length === 0) return rawEntries;

    const { data: customers } = await supabase
      .from("customers")
      .select("id, full_name_en, full_name_ku, phone")
      .in("id", customerIds);

    const customerMap = new Map(
      (customers || []).map((c: CustomerLite) => [c.id, c])
    );

    return rawEntries.map((e) => ({
      ...e,
      order: e.order
        ? {
          ...e.order,
          customer: e.order.customer_id
            ? customerMap.get(e.order.customer_id)
            : undefined,
        }
        : undefined,
    }));
  }, []);

  const fetchEntries = useCallback(async () => {
    setLoading(true);

    try {
      let customerMatchedOrderIds = new Set<string>();
      let textMatchedOrderIds = new Set<string>();

      if (debouncedSearch) {
        const q = escapeLike(debouncedSearch);

        const [{ data: customers }, { data: ordersByCustomer }, { data: ordersByNumber }] =
          await Promise.all([
            supabase
              .from("customers")
              .select("id")
              .or(
                `full_name_en.ilike.%${q}%,full_name_ku.ilike.%${q}%,phone.ilike.%${q}%`
              )
              .limit(200),
            supabase
              .from("orders")
              .select("id, customer_id")
              .limit(1),
            supabase
              .from("orders")
              .select("id")
              .ilike("order_number", `%${q}%`)
              .limit(200),
          ]);

        const customerIds = (customers || []).map((c: { id: string }) => c.id);

        if (customerIds.length > 0) {
          const { data: orderIdsFromCustomers } = await supabase
            .from("orders")
            .select("id")
            .in("customer_id", customerIds)
            .limit(500);

          customerMatchedOrderIds = new Set(
            (orderIdsFromCustomers || []).map((o: { id: string }) => o.id)
          );
        }

        textMatchedOrderIds = new Set(
          (ordersByNumber || []).map((o: { id: string }) => o.id)
        );

        void ordersByCustomer;
      }

      let query = supabase
        .from("installment_entries", { count: "exact" })
        .select("*, order:orders(id, order_number, sale_type, customer_id)");

      if (filterStatus !== "all") {
        query = query.eq("status", filterStatus);
      }

      if (filterDate) {
        const d = new Date(filterDate);
        const from = new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split("T")[0];
        const to = new Date(d.getFullYear(), d.getMonth() + 1, 0)
          .toISOString()
          .split("T")[0];
        query = query.gte("due_date", from).lte("due_date", to);
      }

      const searchableOrderIds = [
        ...new Set([...customerMatchedOrderIds, ...textMatchedOrderIds]),
      ];

      if (debouncedSearch) {
        const q = escapeLike(debouncedSearch);
        const orParts: string[] = [
          `due_date.ilike.%${q}%`,
          `status.ilike.%${q}%`,
        ];

        if (/^\d+$/.test(q)) {
          orParts.push(`installment_number.eq.${Number(q)}`);
        }

        if (searchableOrderIds.length > 0) {
          orParts.push(`order_id.in.(${searchableOrderIds.join(",")})`);
        }

        query = query.or(orParts.join(","));
      }

      const serverSortable: Partial<Record<SortField, string>> = {
        installment_number: "installment_number",
        due_date: "due_date",
        amount_usd: "amount_usd",
        paid_amount_usd: "paid_amount_usd",
        status: "status",
      };

      const dbField = serverSortable[sortField];
      query = query.order(dbField || "due_date", { ascending: sortDir === "asc" });

      const fromIdx = (page - 1) * PAGE_SIZE;
      const { data, count, error } = await query.range(fromIdx, fromIdx + PAGE_SIZE - 1);

      if (error) throw error;

      let rows = ((data || []) as EntryWithOrder[]).map((entry) => {
        const effectiveStatus =
          entry.status === "unpaid" && entry.due_date < todayISO()
            ? ("overdue" as const)
            : entry.status;
        return { ...entry, status: effectiveStatus };
      });

      rows = await hydrateCustomers(rows);

      if (sortField === "order_number") {
        rows.sort((a, b) => {
          const aVal = String(a.order?.order_number || "");
          const bVal = String(b.order?.order_number || "");
          return sortDir === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
        });
      } else if (sortField === "customer") {
        rows.sort((a, b) => {
          const aVal =
            language === "ku"
              ? String(a.order?.customer?.full_name_ku || "")
              : String(a.order?.customer?.full_name_en || "");
          const bVal =
            language === "ku"
              ? String(b.order?.customer?.full_name_ku || "")
              : String(b.order?.customer?.full_name_en || "");
          return sortDir === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
        });
      } else if (sortField === "phone") {
        rows.sort((a, b) => {
          const aVal = String(a.order?.customer?.phone || "");
          const bVal = String(b.order?.customer?.phone || "");
          return sortDir === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
        });
      }

      setEntries(rows);
      setTotal(count || 0);
    } catch (error) {
      console.error("Failed to fetch installments:", error);
      setEntries([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, filterDate, filterStatus, hydrateCustomers, language, page, sortDir, sortField]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  const openPayModal = useCallback(async (entry: EntryWithOrder) => {
    const remaining = Number(entry.amount_usd || 0) - Number(entry.paid_amount_usd || 0);

    setSelectedEntry(entry);
    setPayCurrency("USD");
    setPayDate(todayISO());
    setPayNotes("");
    setPayAccountantName("");
    setPayDiscountPercent("0");
    setPayDiscountScope("selected");
    setPayAmount(String(Math.max(0, remaining).toFixed(2)));

    const { data: oe } = await supabase
      .from("installment_entries")
      .select("*")
      .eq("order_id", entry.order_id)
      .order("installment_number");

    setAllOrderEntries((oe || []) as EntryWithOrder[]);
    setShowPayModal(true);
  }, []);

  const openEditModal = useCallback((entry: EntryWithOrder) => {
    setSelectedEntry(entry);
    setEditAmount(String(entry.amount_usd));
    setEditDate(entry.due_date);
    setEditReason("");
    setShowEditModal(true);
  }, []);

  const toggleEntrySelection = useCallback((id: string, checked: boolean) => {
    setSelectedEntries((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  const fmt = useCallback((n: number) => `$${Number(n || 0).toFixed(2)}`, []);
  const fmtIQD = useCallback(
    (n: number) =>
      `${Number(n || 0).toLocaleString("en-US", { maximumFractionDigits: 0 })} IQD`,
    []
  );

  const statusLabels = useMemo<Record<string, string>>(
    () => ({
      unpaid: t("unpaid"),
      partial: t("partial"),
      paid: t("paid"),
      overdue: t("overdue"),
    }),
    [t]
  );

  const allVisibleUnpaid = useMemo(
    () => entries.filter((e) => e.status !== "paid"),
    [entries]
  );

  const allSelectedAreUnpaid = useMemo(
    () =>
      selectedEntries.size > 0 &&
      [...selectedEntries].every((id) => {
        const e = entries.find((x) => x.id === id);
        return Boolean(e && e.status !== "paid");
      }),
    [entries, selectedEntries]
  );

  const sameOrder = useMemo(() => {
    if (selectedEntries.size === 0) return false;
    const ids = [...selectedEntries];
    const first = entries.find((x) => x.id === ids[0]);
    if (!first) return false;
    return ids.every((id) => entries.find((x) => x.id === id)?.order_id === first.order_id);
  }, [entries, selectedEntries]);

  const totalStats = useMemo(
    () => ({
      total: entries.reduce((s, e) => s + Number(e.amount_usd || 0), 0),
      paid: entries.reduce((s, e) => s + Number(e.paid_amount_usd || 0), 0),
      overdue: entries.filter((e) => e.status === "overdue").length,
    }),
    [entries]
  );

  const selectedEntriesData = useMemo(
    () => entries.filter((e) => selectedEntries.has(e.id) && e.status !== "paid"),
    [entries, selectedEntries]
  );

  const multiPayTotalUSD = useMemo(
    () =>
      selectedEntriesData.reduce(
        (s, e) => s + (Number(e.amount_usd || 0) - Number(e.paid_amount_usd || 0)),
        0
      ),
    [selectedEntriesData]
  );

  const multiPayTotalIQD = useMemo(
    () => multiPayTotalUSD * currentRate,
    [currentRate, multiPayTotalUSD]
  );

  const computeDiscountOnEntries = useCallback(
    (
      discountPct: number,
      scope: "selected" | "all",
      currentEntry: EntryWithOrder,
      allEntries: EntryWithOrder[],
      scopedEntries?: EntryWithOrder[]
    ) => {
      if (discountPct <= 0) {
        return {
          scopeEntries: [] as {
            id: string;
            installment_number: number;
            amount_usd: number;
            remaining: number;
            newAmountUSD: number;
            discountForEntry: number;
          }[],
          otherEntries: [] as EntryWithOrder[],
          totalDiscountUSD: 0,
          discountAmountUSD: 0,
        };
      }

      const unpaidAll = allEntries
        .filter((e) => e.order_id === currentEntry.order_id && e.status !== "paid")
        .sort((a, b) => a.installment_number - b.installment_number);

      const inScope =
        scope === "all"
          ? unpaidAll
          : (scopedEntries || [{ ...currentEntry }]).filter((e) => e.status !== "paid");

      const outOfScope =
        scope === "all"
          ? []
          : unpaidAll.filter((e) => !inScope.find((s) => s.id === e.id));

      const totalScopeRemaining = inScope.reduce(
        (s, e) => s + (Number(e.amount_usd) - Number(e.paid_amount_usd)),
        0
      );

      const discountAmountUSD =
        Math.round(totalScopeRemaining * (discountPct / 100) * 100) / 100;

      const scopeEntriesWithDiscount = inScope.map((e) => {
        const remaining = Number(e.amount_usd) - Number(e.paid_amount_usd);
        const share = totalScopeRemaining > 0 ? remaining / totalScopeRemaining : 0;
        const discountForEntry = Math.round(discountAmountUSD * share * 100) / 100;

        return {
          id: e.id,
          installment_number: e.installment_number,
          amount_usd: Number(e.amount_usd),
          remaining,
          newAmountUSD: Math.round((Number(e.amount_usd) - discountForEntry) * 100) / 100,
          discountForEntry,
        };
      });

      return {
        scopeEntries: scopeEntriesWithDiscount,
        otherEntries: outOfScope,
        totalDiscountUSD: discountAmountUSD,
        discountAmountUSD,
      };
    },
    []
  );

  const computeCascadePreview = useCallback(
    (
      amtUSD: number,
      entry: EntryWithOrder,
      allEntries: EntryWithOrder[],
      discountPct = 0,
      discountScope: "selected" | "all" = "selected",
      scopedEntries?: EntryWithOrder[]
    ) => {
      const { scopeEntries } = computeDiscountOnEntries(
        discountPct,
        discountScope,
        entry,
        allEntries,
        scopedEntries
      );

      const discountMap = new Map(scopeEntries.map((e) => [e.id, e.discountForEntry]));

      const sameOrderUnpaid = allEntries
        .filter(
          (e) =>
            e.order_id === entry.order_id &&
            e.status !== "paid" &&
            e.installment_number >= entry.installment_number
        )
        .sort((a, b) => a.installment_number - b.installment_number);

      const allocations: {
        id: string;
        installment_number: number;
        allocated: number;
        newPaid: number;
        newStatus: string;
        amount_usd: number;
        newAmountUSD: number;
        isReduced: boolean;
      }[] = [];

      let budget = amtUSD;

      for (const e of sameOrderUnpaid) {
        if (budget <= 0.001) break;

        const remaining = Number(e.amount_usd) - Number(e.paid_amount_usd);
        const discountForEntry = discountMap.get(e.id) ?? 0;
        const effectiveDue = Math.max(0, remaining - discountForEntry);

        if (budget >= effectiveDue) {
          budget = Math.round((budget - effectiveDue) * 1000) / 1000;
          allocations.push({
            id: e.id,
            installment_number: e.installment_number,
            allocated: effectiveDue,
            newPaid: Math.round((Number(e.amount_usd) - discountForEntry) * 100) / 100,
            newStatus: "paid",
            amount_usd: Number(e.amount_usd),
            newAmountUSD: Math.round((Number(e.amount_usd) - discountForEntry) * 100) / 100,
            isReduced: discountForEntry > 0,
          });
        } else {
          allocations.push({
            id: e.id,
            installment_number: e.installment_number,
            allocated: budget,
            newPaid: Math.round((Number(e.paid_amount_usd) + budget) * 100) / 100,
            newStatus: "partial",
            amount_usd: Number(e.amount_usd),
            newAmountUSD: Math.round((Number(e.amount_usd) - discountForEntry) * 100) / 100,
            isReduced: discountForEntry > 0,
          });
          budget = 0;
        }
      }

      return { allocations, leftover: budget };
    },
    [computeDiscountOnEntries]
  );

  const payAmountUSD = useMemo(
    () => (payCurrency === "USD" ? Number(payAmount || 0) : Number(payAmount || 0) / currentRate),
    [currentRate, payAmount, payCurrency]
  );

  const payDiscountPct = useMemo(
    () => Math.min(Math.max(Number(payDiscountPercent || 0), 0), 100),
    [payDiscountPercent]
  );

  const baseEntries = useMemo(
    () => (allOrderEntries.length > 0 ? allOrderEntries : entries),
    [allOrderEntries, entries]
  );

  const singleEntryAsList = useMemo(
    () => (selectedEntry ? [selectedEntry] : []),
    [selectedEntry]
  );

  const discountPreview = useMemo(() => {
    if (!selectedEntry || payDiscountPct <= 0) return null;
    return computeDiscountOnEntries(
      payDiscountPct,
      payDiscountScope,
      selectedEntry,
      baseEntries,
      singleEntryAsList
    );
  }, [
    baseEntries,
    computeDiscountOnEntries,
    payDiscountPct,
    payDiscountScope,
    selectedEntry,
    singleEntryAsList,
  ]);

  const cascadePreview = useMemo(() => {
    if (!selectedEntry || payAmountUSD <= 0) return null;
    return computeCascadePreview(
      payAmountUSD,
      selectedEntry,
      baseEntries,
      payDiscountPct,
      payDiscountScope,
      singleEntryAsList
    );
  }, [
    baseEntries,
    computeCascadePreview,
    payAmountUSD,
    payDiscountPct,
    payDiscountScope,
    selectedEntry,
    singleEntryAsList,
  ]);

  const multiDiscountPct = useMemo(
    () => Math.min(Math.max(Number(multiPayDiscountPercent || 0), 0), 100),
    [multiPayDiscountPercent]
  );

  const multiDiscountPreview = useMemo(() => {
    if (selectedEntriesData.length === 0 || multiDiscountPct <= 0) return null;
    return computeDiscountOnEntries(
      multiDiscountPct,
      multiPayDiscountScope,
      selectedEntriesData[0],
      entries,
      selectedEntriesData
    );
  }, [
    computeDiscountOnEntries,
    entries,
    multiDiscountPct,
    multiPayDiscountScope,
    selectedEntriesData,
  ]);

  const multiDiscountUSD = useMemo(
    () => multiDiscountPreview?.totalDiscountUSD ?? 0,
    [multiDiscountPreview]
  );

  const multiPayEffectiveUSD = useMemo(
    () => multiPayTotalUSD - multiDiscountUSD,
    [multiDiscountUSD, multiPayTotalUSD]
  );

  const multiPayEffectiveIQD = useMemo(
    () => multiPayEffectiveUSD * currentRate,
    [currentRate, multiPayEffectiveUSD]
  );

  const handlePayInstallment = useCallback(async () => {
    if (!selectedEntry || !payAmount || !activeSession) return;

    setSaving(true);

    try {
      const amtUSD = getAmountUSD(Number(payAmount), payCurrency);
      const discountPct = Math.min(Math.max(Number(payDiscountPercent || 0), 0), 100);

      const { data: allOrderEntriesRaw } = await supabase
        .from("installment_entries")
        .select("*")
        .eq("order_id", selectedEntry.order_id)
        .order("installment_number");

      const freshEntries = (allOrderEntriesRaw || []) as EntryWithOrder[];
      const freshSelected = [
        freshEntries.find((e) => e.id === selectedEntry.id)!,
      ].filter(Boolean);

      const { scopeEntries, totalDiscountUSD } = computeDiscountOnEntries(
        discountPct,
        payDiscountScope,
        selectedEntry,
        freshEntries,
        freshSelected
      );

      const { allocations } = computeCascadePreview(
        amtUSD,
        selectedEntry,
        freshEntries,
        discountPct,
        payDiscountScope,
        freshSelected
      );

      if (allocations.length === 0) return;

      const totalAllocated = allocations.reduce((s, a) => s + a.allocated, 0);
      const paymentNumber = `PAY-${Date.now()}`;

      const scopeLabel =
        payDiscountScope === "all" ? "all installments" : "this installment";
      const discountNote =
        discountPct > 0 ? ` (${discountPct}% discount on ${scopeLabel})` : "";
      const discountNoteKu = discountPct > 0 ? ` (${discountPct}% داشکاندن)` : "";

      const { data: payRows } = await supabase
        .from("payments")
        .insert([
          {
            order_id: selectedEntry.order_id,
            payment_number: paymentNumber,
            payment_type: "installment",
            currency: payCurrency,
            amount_in_currency: Number(payAmount),
            exchange_rate_used: payCurrency === "IQD" ? currentRate : 1,
            amount_usd: totalAllocated,
            discount_percent: discountPct,
            discount_amount_usd: totalDiscountUSD,
            payment_date: payDate,
            accountant_name: payAccountantName,
            installment_entry_id: selectedEntry.id,
            is_reversed: false,
            notes_en:
              payNotes ||
              `Installment #${selectedEntry.installment_number}${allocations.length > 1 ? ` (+${allocations.length - 1} more)` : ""
              }${discountNote}`,
            notes_ku:
              payNotes ||
              `قیست #${selectedEntry.installment_number}${allocations.length > 1 ? ` (+${allocations.length - 1})` : ""
              }${discountNoteKu}`,
            created_by: profile?.id,
            created_at: new Date().toISOString(),
          },
        ])
        .select()
        .single();

      if (payRows?.id) {
        await supabase.from("payment_installment_links").insert(
          allocations.map((a) => ({
            payment_id: payRows.id,
            installment_entry_id: a.id,
            allocated_amount_usd: a.allocated,
          }))
        );
      }

      for (const a of allocations) {
        await supabase
          .from("installment_entries")
          .update({
            paid_amount_usd: a.newPaid,
            status: a.newStatus,
            ...(a.isReduced
              ? {
                amount_usd: a.newAmountUSD,
                is_modified: true,
                original_amount_usd: a.amount_usd,
                modification_reason_en: `${discountPct}% discount applied`,
                modification_reason_ku: `${discountPct}% داشکاندن`,
                modified_by: profile?.id,
                modified_at: new Date().toISOString(),
              }
              : {}),
            updated_at: new Date().toISOString(),
          })
          .eq("id", a.id);
      }

      if (discountPct > 0) {
        const allocationIds = new Set(allocations.map((a) => a.id));
        for (const e of scopeEntries) {
          if (allocationIds.has(e.id) || e.discountForEntry <= 0) continue;

          await supabase
            .from("installment_entries")
            .update({
              amount_usd: e.newAmountUSD,
              is_modified: true,
              original_amount_usd:
                freshEntries.find((f) => f.id === e.id)?.original_amount_usd ?? e.amount_usd,
              modification_reason_en: `${discountPct}% discount applied`,
              modification_reason_ku: `${discountPct}% داشکاندن`,
              modified_by: profile?.id,
              modified_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq("id", e.id);
        }
      }

      const { data: order } = await supabase
        .from("orders")
        .select("total_paid_usd, final_total_usd, installment_discount_amount_usd")
        .eq("id", selectedEntry.order_id)
        .single();

      if (order) {
        const newTotalPaid = Number(order.total_paid_usd || 0) + totalAllocated;
        const newDiscountTotal =
          Number(order.installment_discount_amount_usd || 0) + totalDiscountUSD;
        const newFinalTotal = Math.max(0, Number(order.final_total_usd || 0) - totalDiscountUSD);
        const newBalance = Math.max(0, newFinalTotal - newTotalPaid);

        await supabase
          .from("orders")
          .update({
            total_paid_usd: newTotalPaid,
            balance_due_usd: newBalance,
            final_total_usd: newFinalTotal,
            installment_discount_percent: discountPct,
            installment_discount_amount_usd: newDiscountTotal,
            updated_at: new Date().toISOString(),
          })
          .eq("id", selectedEntry.order_id);
      }

      if (activeSession && payRows?.id) {
        const orderNum = String(selectedEntry.order?.order_number || "");
        await logTransaction({
          session_id: activeSession.id,
          transaction_type: "income",
          reference_type: "installment",
          reference_id: payRows.id,
          reference_number: paymentNumber,
          description_en: `Installment #${selectedEntry.installment_number} - ${orderNum}${discountNote}`,
          description_ku: `قیست #${selectedEntry.installment_number} - ${orderNum}${discountNoteKu}`,
          amount_usd: totalAllocated,
          currency: payCurrency,
          amount_in_currency: Number(payAmount),
          exchange_rate_used: payCurrency === "IQD" ? currentRate : 1,
          created_by: profile?.id,
        });
      }

      setShowPayModal(false);
      setPayAmount("");
      setPayNotes("");
      setPayCurrency("USD");
      setPayDiscountPercent("0");
      setPayDiscountScope("selected");
      setAllOrderEntries([]);

      await fetchEntries();
    } catch (error) {
      console.error("Failed to record installment payment:", error);
    } finally {
      setSaving(false);
    }
  }, [
    activeSession,
    computeCascadePreview,
    computeDiscountOnEntries,
    currentRate,
    fetchEntries,
    getAmountUSD,
    logTransaction,
    payAmount,
    payAccountantName,
    payCurrency,
    payDate,
    payDiscountPercent,
    payDiscountScope,
    payNotes,
    profile?.id,
    selectedEntry,
  ]);

  const handleMultiPay = useCallback(async () => {
    if (selectedEntries.size === 0 || !activeSession) return;

    setSaving(true);

    try {
      const entriesSelected = entries.filter(
        (e) => selectedEntries.has(e.id) && e.status !== "paid"
      );

      if (entriesSelected.length === 0) return;

      const discountPct = Math.min(
        Math.max(Number(multiPayDiscountPercent || 0), 0),
        100
      );

      const firstEntry = entriesSelected[0];
      if (!firstEntry?.order_id) return;

      const orderId = firstEntry.order_id;

      const { data: allOrderEntriesRaw } = await supabase
        .from("installment_entries")
        .select("*")
        .eq("order_id", orderId)
        .order("installment_number");

      const freshAllEntries = (allOrderEntriesRaw || []) as EntryWithOrder[];
      const freshSelected = freshAllEntries.filter(
        (e) => selectedEntries.has(e.id) && e.status !== "paid"
      );

      const { scopeEntries, totalDiscountUSD } = computeDiscountOnEntries(
        discountPct,
        multiPayDiscountScope,
        firstEntry,
        freshAllEntries,
        freshSelected
      );

      const discountMap = new Map(scopeEntries.map((e) => [e.id, e]));

      const entriesWithDiscount = freshSelected.map((e) => {
        const discountData = discountMap.get(e.id);
        const remaining = Number(e.amount_usd) - Number(e.paid_amount_usd);
        const discountForEntry = discountData?.discountForEntry ?? 0;
        const effectiveDue = Math.max(0, remaining - discountForEntry);
        const newAmountUSD = discountData?.newAmountUSD ?? Number(e.amount_usd);

        return { ...e, discountForEntry, effectiveDue, newAmountUSD };
      });

      const totalUSD = entriesWithDiscount.reduce((s, e) => s + e.effectiveDue, 0);
      const totalInCurrency = multiPayCurrency === "USD" ? totalUSD : totalUSD * currentRate;

      const paymentNumber = `PAY-${Date.now()}`;

      const scopeLabel =
        multiPayDiscountScope === "all"
          ? "all installments"
          : "selected installments";
      const discountNote =
        discountPct > 0 ? ` (${discountPct}% discount on ${scopeLabel})` : "";
      const discountNoteKu = discountPct > 0 ? ` (${discountPct}% داشکاندن)` : "";

      const { data: payData } = await supabase
        .from("payments")
        .insert([
          {
            order_id: orderId,
            payment_number: paymentNumber,
            payment_type: "installment",
            currency: multiPayCurrency,
            amount_in_currency: totalInCurrency,
            exchange_rate_used: multiPayCurrency === "IQD" ? currentRate : 1,
            amount_usd: totalUSD,
            discount_percent: discountPct,
            discount_amount_usd: totalDiscountUSD,
            payment_date: multiPayDate,
            installment_entry_id: firstEntry.id,
            is_reversed: false,
            accountant_name: multiPayAccountantName,
            notes_en:
              multiPayNotes ||
              `Multi-installment (${entriesWithDiscount
                .map((e) => `#${e.installment_number}`)
                .join(", ")})${discountNote}`,
            notes_ku:
              multiPayNotes ||
              `چەند قیست (${entriesWithDiscount
                .map((e) => `#${e.installment_number}`)
                .join(", ")})${discountNoteKu}`,
            created_by: profile?.id,
            created_at: new Date().toISOString(),
          },
        ])
        .select()
        .single();

      if (payData?.id) {
        await supabase.from("payment_installment_links").insert(
          entriesWithDiscount.map((e) => ({
            payment_id: payData.id,
            installment_entry_id: e.id,
            allocated_amount_usd: e.effectiveDue,
          }))
        );
      }

      for (const entry of entriesWithDiscount) {
        await supabase
          .from("installment_entries")
          .update({
            paid_amount_usd: entry.newAmountUSD,
            status: "paid",
            ...(entry.discountForEntry > 0
              ? {
                amount_usd: entry.newAmountUSD,
                is_modified: true,
                original_amount_usd: entry.original_amount_usd ?? entry.amount_usd,
                modification_reason_en: `${discountPct}% discount applied`,
                modification_reason_ku: `${discountPct}% داشکاندن`,
                modified_by: profile?.id,
                modified_at: new Date().toISOString(),
              }
              : {}),
            updated_at: new Date().toISOString(),
          })
          .eq("id", entry.id);
      }

      if (discountPct > 0 && multiPayDiscountScope === "all") {
        const selectedIds = new Set(entriesWithDiscount.map((e) => e.id));
        for (const e of scopeEntries) {
          if (selectedIds.has(e.id) || e.discountForEntry <= 0) continue;

          await supabase
            .from("installment_entries")
            .update({
              amount_usd: e.newAmountUSD,
              is_modified: true,
              original_amount_usd:
                freshAllEntries.find((f) => f.id === e.id)?.original_amount_usd ?? e.amount_usd,
              modification_reason_en: `${discountPct}% discount applied`,
              modification_reason_ku: `${discountPct}% داشکاندن`,
              modified_by: profile?.id,
              modified_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq("id", e.id);
        }
      }

      const { data: order } = await supabase
        .from("orders")
        .select("total_paid_usd, final_total_usd, installment_discount_amount_usd")
        .eq("id", orderId)
        .single();

      if (order) {
        const newTotalPaid = Number(order.total_paid_usd || 0) + totalUSD;
        const newDiscountTotal =
          Number(order.installment_discount_amount_usd || 0) + totalDiscountUSD;
        const newFinalTotal = Math.max(0, Number(order.final_total_usd || 0) - totalDiscountUSD);
        const newBalance = Math.max(0, newFinalTotal - newTotalPaid);

        await supabase
          .from("orders")
          .update({
            total_paid_usd: newTotalPaid,
            balance_due_usd: newBalance,
            final_total_usd: newFinalTotal,
            installment_discount_percent: discountPct,
            installment_discount_amount_usd: newDiscountTotal,
            updated_at: new Date().toISOString(),
          })
          .eq("id", orderId);
      }

      if (activeSession && payData?.id) {
        const orderNum = String(firstEntry.order?.order_number || "");
        await logTransaction({
          session_id: activeSession.id,
          transaction_type: "income",
          reference_type: "installment",
          reference_id: payData.id,
          reference_number: paymentNumber,
          description_en: `Multi-installment (${entriesSelected
            .map((e) => `#${e.installment_number}`)
            .join(", ")}) - ${orderNum}${discountNote}`,
          description_ku: `چەند قیست (${entriesSelected
            .map((e) => `#${e.installment_number}`)
            .join(", ")}) - ${orderNum}${discountNoteKu}`,
          amount_usd: totalUSD,
          currency: multiPayCurrency,
          amount_in_currency: totalInCurrency,
          exchange_rate_used: multiPayCurrency === "IQD" ? currentRate : 1,
          created_by: profile?.id,
        });
      }

      setShowMultiPayModal(false);
      setSelectedEntries(new Set());
      setMultiPayNotes("");
      setMultiPayAccountantName("");
      setMultiPayCurrency("USD");
      setMultiPayDiscountPercent("0");
      setMultiPayDiscountScope("selected");

      await fetchEntries();
    } catch (error) {
      console.error("Failed to record multi payment:", error);
    } finally {
      setSaving(false);
    }
  }, [
    activeSession,
    computeDiscountOnEntries,
    currentRate,
    entries,
    fetchEntries,
    logTransaction,
    multiPayAccountantName,
    multiPayCurrency,
    multiPayDate,
    multiPayDiscountPercent,
    multiPayDiscountScope,
    multiPayNotes,
    profile?.id,
    selectedEntries,
  ]);

  const handleEditEntry = useCallback(async () => {
    if (!selectedEntry || !canModify || !editReason.trim()) return;

    setSaving(true);

    try {
      const updates: Partial<InstallmentEntry> = {
        is_modified: true,
        modified_by: profile?.id,
        modified_at: new Date().toISOString(),
        modification_reason_en: editReason,
        modification_reason_ku: editReason,
        original_amount_usd: selectedEntry.original_amount_usd ?? selectedEntry.amount_usd,
        original_due_date: selectedEntry.original_due_date ?? selectedEntry.due_date,
        updated_at: new Date().toISOString(),
      };

      if (editAmount) updates.amount_usd = Number(editAmount);
      if (editDate) updates.due_date = editDate;

      await supabase.from("installment_entries").update(updates).eq("id", selectedEntry.id);

      await supabase.from("audit_logs").insert([
        {
          user_id: profile?.id,
          user_name_en: profile?.full_name_en || "",
          user_name_ku: profile?.full_name_ku || "",
          action: "MODIFY_INSTALLMENT",
          module: "installments",
          record_id: selectedEntry.id,
          old_values: {
            amount_usd: selectedEntry.amount_usd,
            due_date: selectedEntry.due_date,
          },
          new_values: {
            amount_usd: editAmount || selectedEntry.amount_usd,
            due_date: editDate || selectedEntry.due_date,
            reason: editReason,
          },
          details: {},
          created_at: new Date().toISOString(),
        },
      ]);

      setShowEditModal(false);
      await fetchEntries();
    } catch (error) {
      console.error("Failed to edit installment:", error);
    } finally {
      setSaving(false);
    }
  }, [canModify, editAmount, editDate, editReason, fetchEntries, profile, selectedEntry]);

  return (
    <div className="p-4 lg:p-6 space-y-5">
      {!activeSession && (
        <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm">
          <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
            <LockIcon size={16} className="text-amber-600" />
          </div>
          <div>
            <p className="font-semibold text-amber-800">Cash Register is closed</p>
            <p className="text-amber-700 text-xs">
              Open the cash register session in the Cash Register module to record
              installment payments.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-4 mb-2">
        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <DollarSign size={20} className="text-emerald-600" />
            <div>
              <p className="text-xs text-gray-500">{t("totalDue")}</p>
              <p className="font-bold text-emerald-800">{fmt(totalStats.total)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <CheckCircle size={20} className="text-blue-600" />
            <div>
              <p className="text-xs text-gray-500">{t("totalPaidStat")}</p>
              <p className="font-bold text-blue-700">{fmt(totalStats.paid)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <AlertCircle size={20} className="text-red-500" />
            <div>
              <p className="text-xs text-gray-500">{t("overdue")}</p>
              <p className="font-bold text-red-600">
                {totalStats.overdue} {t("overdueInstallmentsCount")}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("searchInstallments")}
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
          />
        </div>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none"
        >
          <option value="all">{t("allStatuses")}</option>
          <option value="unpaid">{t("unpaid")}</option>
          <option value="partial">{t("partial")}</option>
          <option value="paid">{t("paid")}</option>
          <option value="overdue">{t("overdue")}</option>
        </select>

        <input
          type="month"
          value={filterDate ? filterDate.substring(0, 7) : ""}
          onChange={(e) => setFilterDate(e.target.value ? `${e.target.value}-01` : "")}
          className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none"
        />

        {selectedEntries.size >= 1 && allSelectedAreUnpaid && sameOrder && (
          <Button
            onClick={() => setShowMultiPayModal(true)}
            icon={<Clock size={16} />}
            disabled={!activeSession}
          >
            {t("payInstallmentsBtn")} ({selectedEntries.size})
          </Button>
        )}
      </div>

      {selectedEntries.size > 0 && (
        <div className="flex items-center gap-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-sm">
          <div className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0">
            <CheckCircle size={14} className="text-emerald-600" />
          </div>

          <span className="font-semibold text-emerald-800">
            {selectedEntries.size} {t("selectedCount")}
          </span>

          {allSelectedAreUnpaid && sameOrder && (
            <span className="text-emerald-700">
              {t("total")}: <strong>{fmt(multiPayTotalUSD)}</strong> (
              {fmtIQD(multiPayTotalIQD)})
            </span>
          )}

          {!sameOrder && (
            <span className="text-amber-600 font-medium">{t("multiPaySameOrderNote")}</span>
          )}

          {allSelectedAreUnpaid && sameOrder && (
            <button
              disabled={!activeSession}
              onClick={() => setShowMultiPayModal(true)}
              className="ml-auto px-3 py-1.5 text-xs font-semibold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Pay {selectedEntries.size} installment{selectedEntries.size > 1 ? "s" : ""}
            </button>
          )}

          <button
            onClick={() => setSelectedEntries(new Set())}
            className={`text-xs text-gray-500 hover:text-gray-700 ${allSelectedAreUnpaid && sameOrder ? "" : "ml-auto"
              }`}
          >
            {t("clearSelection")}
          </button>
        </div>
      )}

      <p className="text-sm text-gray-500">
        {total} {t("installments").toLowerCase()}
      </p>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="px-4 py-3 w-8">
                <input
                  type="checkbox"
                  checked={
                    allVisibleUnpaid.length > 0 &&
                    allVisibleUnpaid.every((e) => selectedEntries.has(e.id))
                  }
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedEntries(new Set(allVisibleUnpaid.map((x) => x.id)));
                    } else {
                      setSelectedEntries(new Set());
                    }
                  }}
                  className="rounded"
                />
              </th>

              <Th
                field="installment_number"
                label="#"
                sortField={sortField}
                sortDir={sortDir}
                onToggle={toggleSort}
              />
              <Th
                field="order_number"
                label={t("orders")}
                sortField={sortField}
                sortDir={sortDir}
                onToggle={toggleSort}
              />
              <Th
                field="customer"
                label={t("customer")}
                sortField={sortField}
                sortDir={sortDir}
                onToggle={toggleSort}
              />
              <Th
                field="due_date"
                label={t("dueDate")}
                sortField={sortField}
                sortDir={sortDir}
                onToggle={toggleSort}
              />
              <Th
                field="phone"
                label={t("phone")}
                sortField={sortField}
                sortDir={sortDir}
                onToggle={toggleSort}
              />
              <Th
                field="amount_usd"
                label={t("amount")}
                sortField={sortField}
                sortDir={sortDir}
                onToggle={toggleSort}
              />
              <Th
                field="paid_amount_usd"
                label={t("paidColumn")}
                sortField={sortField}
                sortDir={sortDir}
                onToggle={toggleSort}
              />
              <Th
                field="status"
                label={t("status")}
                sortField={sortField}
                sortDir={sortDir}
                onToggle={toggleSort}
              />

              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">
                {t("actions")}
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-50">
            {loading ? (
              <tr>
                <td colSpan={10} className="px-4 py-12 text-center text-gray-400">
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                    {t("loading")}
                  </div>
                </td>
              </tr>
            ) : entries.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-4 py-12 text-center text-gray-400">
                  {t("noData")}
                </td>
              </tr>
            ) : (
              entries.map((entry) => (
                <InstallmentRow
                  key={entry.id}
                  entry={entry}
                  language={language}
                  statusLabels={statusLabels}
                  isSelected={selectedEntries.has(entry.id)}
                  activeSession={activeSession}
                  canModify={canModify}
                  onToggleSelect={toggleEntrySelection}
                  onPay={openPayModal}
                  onEdit={openEditModal}
                  t={t}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      <Pagination
        page={page}
        totalPages={Math.ceil(total / PAGE_SIZE)}
        onPageChange={setPage}
      />

      <Modal
        isOpen={showPayModal}
        onClose={() => {
          setPayAccountantName("");
          setShowPayModal(false);
          setPayDiscountPercent("0");
          setAllOrderEntries([]);
        }}
        title={t("recordInstallmentPayment")}
        size="sm"
        footer={
          <div className="flex justify-end gap-3">
            <Button
              variant="secondary"
              onClick={() => {
                setShowPayModal(false);
                setPayDiscountPercent("0");
                setAllOrderEntries([]);
              }}
            >
              {t("cancel")}
            </Button>
            <Button onClick={handlePayInstallment} loading={saving}>
              {t("save")}
            </Button>
          </div>
        }
      >
        {selectedEntry && (
          <div className="space-y-4">
            <div className="p-3 bg-gray-50 rounded-xl text-sm space-y-1.5">
              <div className="flex justify-between">
                <span className="text-gray-500">{t("orderLabel")}:</span>
                <span className="font-bold">{selectedEntry.order?.order_number || ""}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">{t("installmentLabel")}:</span>
                <span className="font-semibold">#{selectedEntry.installment_number}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">{t("dueDateLabel")}:</span>
                <span className="font-semibold">{selectedEntry.due_date}</span>
              </div>
              <div className="flex justify-between border-t border-gray-200 pt-1.5 mt-1.5">
                <span className="text-gray-500">{t("remainingDue")}:</span>
                <span className="font-bold text-emerald-700">
                  {fmt(Number(selectedEntry.amount_usd) - Number(selectedEntry.paid_amount_usd))}
                </span>
              </div>
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold text-amber-800">Discount</label>
                {payDiscountPct > 0 && discountPreview && (
                  <span className="text-xs font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                    -{fmt(discountPreview.totalDiscountUSD)} saved
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setPayDiscountScope("selected")}
                  className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-colors text-left ${payDiscountScope === "selected"
                      ? "bg-amber-500 text-white border-amber-500"
                      : "bg-white text-amber-700 border-amber-200 hover:bg-amber-50"
                    }`}
                >
                  <div className="font-bold">This installment only</div>
                  <div
                    className={`text-xs mt-0.5 ${payDiscountScope === "selected" ? "text-amber-100" : "text-amber-500"
                      }`}
                  >
                    Discount on #{selectedEntry.installment_number}
                  </div>
                </button>

                <button
                  onClick={() => setPayDiscountScope("all")}
                  className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-colors text-left ${payDiscountScope === "all"
                      ? "bg-amber-500 text-white border-amber-500"
                      : "bg-white text-amber-700 border-amber-200 hover:bg-amber-50"
                    }`}
                >
                  <div className="font-bold">All unpaid installments</div>
                  <div
                    className={`text-xs mt-0.5 ${payDiscountScope === "all" ? "text-amber-100" : "text-amber-500"
                      }`}
                  >
                    Discount across all remaining
                  </div>
                </button>
              </div>

              <div className="flex items-center gap-2">
                {[0, 1, 2, 3, 4, 5].map((pct) => (
                  <button
                    key={pct}
                    onClick={() => setPayDiscountPercent(String(pct))}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-colors ${payDiscountPct === pct
                        ? "bg-amber-500 text-white"
                        : "bg-white border border-amber-200 text-amber-700 hover:bg-amber-50"
                      }`}
                  >
                    {pct === 0 ? "None" : `${pct}%`}
                  </button>
                ))}
              </div>

              <input
                type="number"
                min={0}
                max={100}
                step={0.1}
                value={payDiscountPercent}
                onChange={(e) => setPayDiscountPercent(e.target.value)}
                placeholder="Custom %"
                className="w-full px-3 py-2 border border-amber-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-300 bg-white"
              />

              {payDiscountPct > 0 &&
                discountPreview &&
                discountPreview.scopeEntries.length > 0 && (
                  <div className="rounded-lg border border-amber-200 overflow-hidden">
                    <div className="bg-amber-100 px-2.5 py-1.5 text-xs font-semibold text-amber-800 flex justify-between">
                      <span>
                        {payDiscountScope === "all"
                          ? "Discount on all unpaid installments"
                          : "Discount on this installment"}
                      </span>
                      <span className="text-red-600">
                        -{fmt(discountPreview.totalDiscountUSD)} total
                      </span>
                    </div>

                    <div className="divide-y divide-amber-50 max-h-28 overflow-y-auto">
                      {discountPreview.scopeEntries.map((e) => (
                        <div
                          key={e.id}
                          className="flex items-center justify-between px-2.5 py-1.5 text-xs bg-white"
                        >
                          <span className="text-gray-600 font-medium">#{e.installment_number}</span>
                          <div className="flex items-center gap-1.5">
                            <span className="text-gray-400 line-through">{fmt(e.remaining)}</span>
                            <span className="text-emerald-700 font-semibold">
                              {fmt(e.remaining - e.discountForEntry)}
                            </span>
                            <span className="text-red-400">-{fmt(e.discountForEntry)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("currencyLabel")}
                </label>
                <select
                  value={payCurrency}
                  onChange={(e) => {
                    const c = e.target.value as Currency;
                    setPayCurrency(c);

                    const rem =
                      Number(selectedEntry.amount_usd) - Number(selectedEntry.paid_amount_usd);

                    const discountForSelected =
                      payDiscountScope === "selected"
                        ? Math.round(rem * (payDiscountPct / 100) * 100) / 100
                        : discountPreview?.scopeEntries.find((x) => x.id === selectedEntry.id)
                          ?.discountForEntry || 0;

                    const effectiveRem = rem - discountForSelected;

                    setPayAmount(
                      c === "USD"
                        ? String(effectiveRem.toFixed(2))
                        : String((effectiveRem * currentRate).toFixed(0))
                    );
                  }}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none bg-white"
                >
                  <option value="USD">USD</option>
                  <option value="IQD">IQD</option>
                </select>
              </div>

              <Input
                label={`${t("amount")} (${payCurrency})`}
                type="number"
                min={0}
                step={payCurrency === "USD" ? 0.01 : 1}
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
                required
              />
            </div>

            {payCurrency === "IQD" && Number(payAmount) > 0 && (
              <div className="p-2.5 bg-emerald-50 rounded-lg text-xs text-emerald-800">
                {t("rateDisplay")}: {currentRate.toLocaleString()} IQD ={" "}
                <strong>${payAmountUSD.toFixed(2)}</strong>
              </div>
            )}

            {cascadePreview && cascadePreview.allocations.length > 0 && (
              <div className="border border-blue-100 rounded-xl overflow-hidden">
                <div className="bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 flex items-center justify-between">
                  <span>{t("paymentAllocation") || "Payment Allocation"}</span>
                  {payDiscountPct > 0 && (
                    <span className="text-amber-600">{payDiscountPct}% discount included</span>
                  )}
                </div>

                <div className="divide-y divide-gray-50">
                  {cascadePreview.allocations.map((a) => (
                    <div
                      key={a.id}
                      className="flex items-center justify-between px-3 py-2 text-xs"
                    >
                      <span className="text-gray-600 font-medium">#{a.installment_number}</span>
                      <div className="flex items-center gap-2">
                        <span
                          className={
                            a.newStatus === "paid"
                              ? "text-emerald-600 font-semibold"
                              : "text-amber-600 font-semibold"
                          }
                        >
                          {fmt(a.allocated)}
                        </span>

                        {a.isReduced && (
                          <span className="px-1.5 py-0.5 rounded-full font-medium bg-amber-50 text-amber-600 border border-amber-200">
                            -{fmt(a.amount_usd - a.newAmountUSD)} disc.
                          </span>
                        )}

                        {a.newStatus === "paid" ? (
                          <span className="px-1.5 py-0.5 rounded-full font-medium bg-emerald-100 text-emerald-700">
                            {t("paid") || "Paid"}
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded-full font-medium bg-amber-100 text-amber-700">
                            {fmt(a.newPaid)} / {fmt(a.newAmountUSD)} —{" "}
                            {fmt(a.newAmountUSD - a.newPaid)} {t("remaining") || "remaining"}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {cascadePreview.leftover > 0.01 && (
                  <div className="bg-amber-50 px-3 py-2 text-xs text-amber-700 border-t border-amber-100">
                    {t("overpaymentNote") || "Overpayment"}:{" "}
                    <strong>{fmt(cascadePreview.leftover)}</strong> —{" "}
                    {t("noMoreInstallments") || "no remaining installments to apply to"}
                  </div>
                )}
              </div>
            )}

            <Input
              label={t("date")}
              type="date"
              value={payDate}
              onChange={(e) => setPayDate(e.target.value)}
              required
            />
            
            <div>
  <label className="block text-sm font-medium text-gray-700 mb-1">
    {t("accountantName")} <span className="text-red-500">*</span>
  </label>
  <input
    value={payAccountantName}
    onChange={(e) => setPayAccountantName(e.target.value)}
    placeholder={t("enterAccountantName")}
    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
  />
</div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t("notesOptional")}
              </label>
              <input
                value={payNotes}
                onChange={(e) => setPayNotes(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none"
              />
            </div>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={showMultiPayModal}
        onClose={() => {
          setShowMultiPayModal(false);
          setMultiPayDiscountPercent("0");
        }}
        title={`${t("payTogether")} (${selectedEntries.size})`}
        size="md"
        footer={
          <div className="flex justify-end gap-3">
            <Button
              variant="secondary"
              onClick={() => {
                setShowMultiPayModal(false);
                setMultiPayDiscountPercent("0");
              }}
            >
              {t("cancel")}
            </Button>
            <Button onClick={handleMultiPay} loading={saving}>
              {t("confirmPayment")}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="rounded-xl border border-gray-100 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500">#</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500">
                    {t("dueDateColumn")}
                  </th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500">
                    Original
                  </th>
                  {multiDiscountPct > 0 && (
                    <th className="px-3 py-2 text-right text-xs font-semibold text-amber-600">
                      After Discount
                    </th>
                  )}
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-50">
                {selectedEntriesData.map((e) => {
                  const rem = Number(e.amount_usd) - Number(e.paid_amount_usd);
                  const discData = multiDiscountPreview?.scopeEntries.find((s) => s.id === e.id);
                  const disc = discData?.discountForEntry ?? 0;
                  const effective = rem - disc;

                  return (
                    <tr key={e.id}>
                      <td className="px-3 py-2 font-bold text-gray-600">#{e.installment_number}</td>
                      <td className="px-3 py-2 text-gray-700">{e.due_date}</td>
                      <td
                        className={`px-3 py-2 text-right font-semibold ${multiDiscountPct > 0
                            ? "text-gray-400 line-through"
                            : "text-emerald-700"
                          }`}
                      >
                        {fmt(rem)}
                      </td>
                      {multiDiscountPct > 0 && (
                        <td className="px-3 py-2 text-right font-semibold text-emerald-700">
                          {fmt(effective)}
                          {disc > 0 && (
                            <span className="text-xs text-red-400 ml-1">-{fmt(disc)}</span>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>

              <tfoot>
                <tr className="bg-emerald-50 border-t border-emerald-100">
                  <td colSpan={2} className="px-3 py-2 font-bold text-gray-700">
                    {t("totalRow")}
                  </td>
                  <td
                    className={`px-3 py-2 text-right font-bold ${multiDiscountPct > 0
                        ? "text-gray-400 line-through"
                        : "text-emerald-800"
                      }`}
                  >
                    {fmt(multiPayTotalUSD)}
                  </td>
                  {multiDiscountPct > 0 && (
                    <td className="px-3 py-2 text-right font-bold text-emerald-800">
                      {fmt(multiPayEffectiveUSD)}
                      <span className="text-xs text-red-400 ml-1">
                        -{fmt(multiDiscountUSD)}
                      </span>
                    </td>
                  )}
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-amber-800">Discount</label>
              {multiDiscountPct > 0 && (
                <span className="text-xs font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                  -{fmt(multiDiscountUSD)} saved
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setMultiPayDiscountScope("selected")}
                className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-colors text-left ${multiPayDiscountScope === "selected"
                    ? "bg-amber-500 text-white border-amber-500"
                    : "bg-white text-amber-700 border-amber-200 hover:bg-amber-50"
                  }`}
              >
                <div className="font-bold">Selected installments only</div>
                <div
                  className={`text-xs mt-0.5 ${multiPayDiscountScope === "selected"
                      ? "text-amber-100"
                      : "text-amber-500"
                    }`}
                >
                  Discount on {selectedEntriesData.length} selected
                </div>
              </button>

              <button
                onClick={() => setMultiPayDiscountScope("all")}
                className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-colors text-left ${multiPayDiscountScope === "all"
                    ? "bg-amber-500 text-white border-amber-500"
                    : "bg-white text-amber-700 border-amber-200 hover:bg-amber-50"
                  }`}
              >
                <div className="font-bold">All unpaid installments</div>
                <div
                  className={`text-xs mt-0.5 ${multiPayDiscountScope === "all" ? "text-amber-100" : "text-amber-500"
                    }`}
                >
                  Discount across all remaining
                </div>
              </button>
            </div>

            <div className="flex items-center gap-2">
              {[0, 1, 2, 3, 4, 5].map((pct) => (
                <button
                  key={pct}
                  onClick={() => setMultiPayDiscountPercent(String(pct))}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-colors ${multiDiscountPct === pct
                      ? "bg-amber-500 text-white"
                      : "bg-white border border-amber-200 text-amber-700 hover:bg-amber-50"
                    }`}
                >
                  {pct === 0 ? "None" : `${pct}%`}
                </button>
              ))}
            </div>

            <input
              type="number"
              min={0}
              max={100}
              step={0.1}
              value={multiPayDiscountPercent}
              onChange={(e) => setMultiPayDiscountPercent(e.target.value)}
              placeholder="Custom %"
              className="w-full px-3 py-2 border border-amber-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-300 bg-white"
            />

            {multiDiscountPct > 0 &&
              multiDiscountPreview &&
              multiDiscountPreview.scopeEntries.length > 0 && (
                <div className="rounded-lg border border-amber-200 overflow-hidden">
                  <div className="bg-amber-100 px-2.5 py-1.5 text-xs font-semibold text-amber-800 flex justify-between">
                    <span>
                      {multiPayDiscountScope === "all"
                        ? "Discount on all unpaid"
                        : "Discount on selected"}
                    </span>
                    <span className="text-red-600">-{fmt(multiDiscountUSD)} total</span>
                  </div>

                  <div className="divide-y divide-amber-50 max-h-28 overflow-y-auto">
                    {multiDiscountPreview.scopeEntries.map((e) => (
                      <div
                        key={e.id}
                        className="flex items-center justify-between px-2.5 py-1.5 text-xs bg-white"
                      >
                        <span className="text-gray-600 font-medium">#{e.installment_number}</span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-gray-400 line-through">{fmt(e.remaining)}</span>
                          <span className="text-emerald-700 font-semibold">
                            {fmt(e.remaining - e.discountForEntry)}
                          </span>
                          <span className="text-red-400">-{fmt(e.discountForEntry)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
          </div>

          <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl text-sm space-y-1">
            {multiDiscountPct > 0 && (
              <div className="flex justify-between text-xs text-gray-500 pb-1 border-b border-blue-100">
                <span>Original total:</span>
                <span className="line-through">{fmt(multiPayTotalUSD)}</span>
              </div>
            )}
            {multiDiscountPct > 0 && (
              <div className="flex justify-between text-xs text-red-500">
                <span>Discount ({multiDiscountPct}%):</span>
                <span>-{fmt(multiDiscountUSD)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-600">{t("totalInUSD")}:</span>
              <span className="font-bold text-blue-800">{fmt(multiPayEffectiveUSD)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">{t("totalInIQD")}:</span>
              <span className="font-bold text-blue-800">{fmtIQD(multiPayEffectiveIQD)}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t("paymentCurrency")}
              </label>
              <select
                value={multiPayCurrency}
                onChange={(e) => setMultiPayCurrency(e.target.value as Currency)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none bg-white"
              >
                <option value="USD">USD</option>
                <option value="IQD">IQD</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t("amountToRecord")}
              </label>
              <div className="px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-emerald-700">
                {multiPayCurrency === "USD"
                  ? fmt(multiPayEffectiveUSD)
                  : fmtIQD(multiPayEffectiveIQD)}
              </div>
            </div>
          </div>

          <Input
            label={t("date")}
            type="date"
            value={multiPayDate}
            onChange={(e) => setMultiPayDate(e.target.value)}
            required
          />

          <div>
  <label className="block text-sm font-medium text-gray-700 mb-1">
    {t("accountantName")} <span className="text-red-500">*</span>
  </label>
  <input
    value={payAccountantName}
    onChange={(e) => setPayAccountantName(e.target.value)}
    placeholder={t("enterAccountantName")}
    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
  />
</div>
<div>
  <label className="block text-sm font-medium text-gray-700 mb-1">
    {t("notesOptional")}
  </label>
  <input
    value={multiPayNotes}
    onChange={(e) => setMultiPayNotes(e.target.value)}
    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none"
  />
</div>
        </div>
      </Modal>

      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title={`${t("modify")} ${t("installmentLabel")}`}
        size="sm"
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setShowEditModal(false)}>
              {t("cancel")}
            </Button>
            <Button variant="gold" onClick={handleEditEntry} loading={saving}>
              {t("save")}
            </Button>
          </div>
        }
      >
        {selectedEntry && (
          <div className="space-y-4">
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700">
              {t("modifyingInstallment")} #{selectedEntry.installment_number}. {t("original")}:{" "}
              {fmt(selectedEntry.amount_usd)}
            </div>

            <Input
              label={t("newAmountUSD")}
              type="number"
              min={0}
              step={0.01}
              value={editAmount}
              onChange={(e) => setEditAmount(e.target.value)}
            />

            <Input
              label={t("newDueDate")}
              type="date"
              value={editDate}
              onChange={(e) => setEditDate(e.target.value)}
            />

            <Input
              label={`${t("reason")} *`}
              value={editReason}
              onChange={(e) => setEditReason(e.target.value)}
              required
              placeholder={t("modificationReasonPlaceholder")}
            />
          </div>
        )}
      </Modal>
    </div>
  );
}