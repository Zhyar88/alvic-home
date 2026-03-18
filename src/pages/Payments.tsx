import React, { useEffect, useState, useCallback } from "react";
import {
  Plus,
  Search,
  RotateCcw,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  Lock as LockIcon,
  Printer,
} from "lucide-react";
import { PaymentReceipt } from "../components/payments/PaymentReceipt";
import { useLanguage } from "../contexts/LanguageContext";
import { useAuth } from "../contexts/AuthContext";
import { useCashRegister } from "../contexts/CashRegisterContext";
import { Button } from "../components/ui/Button";
import { Input, Select } from "../components/ui/Input";
import { Modal } from "../components/ui/Modal";
import { Badge } from "../components/ui/Badge";
import { Pagination } from "../components/ui/Table";
import type { Payment, Order, Customer, Currency } from "../types";
import { supabase } from "../lib/database";

const PAGE_SIZE = 20;

type SortField =
  | "payment_number"
  | "order_number"
  | "customer"
  | "payment_type"
  | "amount_usd"
  | "currency"
  | "exchange_rate_used"
  | "payment_date"
  | "created_by";
type SortDir = "asc" | "desc";

function SortIcon({
  field,
  current,
  dir,
}: {
  field: SortField;
  current: SortField;
  dir: SortDir;
}) {
  if (field !== current)
    return <ChevronsUpDown size={12} className="text-gray-300 ml-1 inline" />;
  return dir === "asc" ? (
    <ChevronUp size={12} className="text-emerald-600 ml-1 inline" />
  ) : (
    <ChevronDown size={12} className="text-emerald-600 ml-1 inline" />
  );
}

export function Payments() {
  const { t, language } = useLanguage();
  const { profile, hasPermission } = useAuth();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterDate, setFilterDate] = useState("");
  const [sortField, setSortField] = useState<SortField>("payment_date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const [showAddModal, setShowAddModal] = useState(false);
  const [showReverseModal, setShowReverseModal] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [receiptPayment, setReceiptPayment] = useState<Payment | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [currentRate, setCurrentRate] = useState({
    rate_cash: 1330,
    rate_installment: 1580,
  });
  const [formData, setFormData] = useState({
    order_id: "",
    payment_type: "deposit" as Payment["payment_type"],
    currency: "USD" as Currency,
    amount_in_currency: "",
    payment_date: new Date().toISOString().split("T")[0],
    notes_en: "",
    notes_ku: "",
    accountant_name: "",   // ← add this
  });
  const [reverseReason, setReverseReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [orderSearch, setOrderSearch] = useState('');
  const [orderOpen, setOrderOpen] = useState(false);
  const { activeSession, logTransaction } = useCashRegister();
  const canCreate = hasPermission("payments", "create");
  const canReverse = hasPermission("payments", "reverse");

  useEffect(() => {
    supabase
      .from("orders")
      .select(
        "id,order_number,customer:customers(full_name_en,full_name_ku,phone),final_total_usd,balance_due_usd,deposit_required_usd,deposit_paid_usd,sale_type"
      )
      .order("created_at", { ascending: false })
      .then(({ data }) => setOrders((data || []) as Order[]));
    supabase
      .from("exchange_rates")
      .select("rate_cash,rate_installment")
      .order("effective_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (data)
          setCurrentRate({
            rate_cash: Number(data.rate_cash),
            rate_installment: Number(data.rate_installment),
          });
      });
  }, []);

  const fetchPayments = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from("payments", { count: "exact" })
      .select("*, order:orders(order_number, balance_due_usd, customer_id)");


    if (filterType !== "all") query = query.eq("payment_type", filterType);
    if (filterDate) query = query.eq("payment_date", filterDate);

    const serverSortMap: Partial<Record<SortField, string>> = {
      payment_number: "payment_number",
      payment_type: "payment_type",
      amount_usd: "amount_usd",
      currency: "currency",
      exchange_rate_used: "exchange_rate_used",
      payment_date: "payment_date",
    };
    const dbField = serverSortMap[sortField] || "payment_date";
    query = query.order(dbField, { ascending: sortDir === "asc" });

    const from = (page - 1) * PAGE_SIZE;
    const { data, count } = search
      ? await query
      : await query.range(from, from + PAGE_SIZE - 1);

    let result = (data || []) as Payment[];



    if (sortField === "order_number") {
      result.sort((a, b) => {
        const aV = String(
          (a.order as Record<string, unknown>)?.order_number || ""
        );
        const bV = String(
          (b.order as Record<string, unknown>)?.order_number || ""
        );
        return sortDir === "asc" ? aV.localeCompare(bV) : bV.localeCompare(aV);
      });
    } else if (sortField === "customer") {
      result.sort((a, b) => {
        const key = language === "ku" ? "full_name_ku" : "full_name_en";
        const aV = String(
          (
            (a.order as Record<string, unknown>)?.customer as Record<
              string,
              string
            >
          )?.[key] || ""
        );
        const bV = String(
          (
            (b.order as Record<string, unknown>)?.customer as Record<
              string,
              string
            >
          )?.[key] || ""
        );
        return sortDir === "asc" ? aV.localeCompare(bV) : bV.localeCompare(aV);
      });
    } else if (sortField === "created_by") {
      result.sort((a, b) => {
        const aV = String(
          (a.created_by_profile as Record<string, string>)?.full_name_en || ""
        );
        const bV = String(
          (b.created_by_profile as Record<string, string>)?.full_name_en || ""
        );
        return sortDir === "asc" ? aV.localeCompare(bV) : bV.localeCompare(aV);
      });
    }

    // Fetch order customer data and created_by profiles separately
    const orderIds = [
      ...new Set(result.map((p: any) => p.order_id).filter(Boolean)),
    ];
    const createdByIds = [
      ...new Set(result.map((p: any) => p.created_by).filter(Boolean)),
    ];

    let ordersMap: Record<string, any> = {};
    let profilesMap: Record<string, any> = {};

    if (orderIds.length > 0) {
      const { data: ordersData } = await supabase
        .from("orders")
        .select(
          "id,order_number,balance_due_usd,customer:customers(full_name_en,full_name_ku,phone)"
        )
        .in("id", orderIds);
      (ordersData || []).forEach((o: any) => {
        ordersMap[o.id] = o;
      });
    }

    if (createdByIds.length > 0) {
      const { data: profilesData } = await supabase
        .from("user_profiles")
        .select("id,full_name_en,full_name_ku")
        .in("id", createdByIds);
      (profilesData || []).forEach((p: any) => {
        profilesMap[p.id] = p;
      });
    }

    result = result.map((pay: any) => ({
      ...pay,
      order: ordersMap[pay.order_id] || pay.order,
      created_by_profile: profilesMap[pay.created_by] || null,
    }));

    if (search) {
      const q = search.toLowerCase();
      result = result.filter((pay) => {
        const ord = pay.order as Record<string, unknown> | undefined;
        const cust = ord?.customer as Record<string, string> | undefined;
        return (
          (pay.payment_number || "").toLowerCase().includes(q) ||
          String(ord?.order_number || "").toLowerCase().includes(q) ||
          (cust?.full_name_en || "").toLowerCase().includes(q) ||
          (cust?.full_name_ku || "").toLowerCase().includes(q) ||
          (cust?.phone || "").includes(q) ||
          pay.payment_type.toLowerCase().includes(q) ||
          (pay.payment_date || "").includes(q)
        );
      });
    }

    setPayments(result);
    setTotal(search ? result.length : count || 0);
    setLoading(false);
  }, [search, filterType, filterDate, page, sortField, sortDir, language]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);
  useEffect(() => {
    setPage(1);
  }, [search, filterType, filterDate, sortField, sortDir]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const getExchangeRate = () =>
    formData.payment_type === "installment"
      ? currentRate.rate_installment
      : currentRate.rate_cash;

  const getAmountUSD = () => {
    const amt = Number(formData.amount_in_currency || 0);
    if (formData.currency === "USD") return amt;
    return amt / getExchangeRate();
  };

  const handleAddPayment = async () => {
    if (!formData.order_id || !formData.amount_in_currency) return;
    if (!activeSession) return;
    setSaving(true);

    const rate = getExchangeRate();
    const amountUSD = getAmountUSD();

    const paymentNumber = `PAY-${Date.now()}`;

    const { data: payInsert } = await supabase.from("payments").insert([
      {
        order_id: formData.order_id,
        payment_number: paymentNumber,
        payment_type: formData.payment_type,
        currency: formData.currency,
        amount_in_currency: Number(formData.amount_in_currency),
        exchange_rate_used: rate,
        amount_usd: amountUSD,
        payment_date: formData.payment_date,
        is_reversed: false,
        accountant_name: formData.accountant_name,
        notes_en: formData.notes_en,
        notes_ku: formData.notes_ku,
        created_by: profile?.id,
        created_at: new Date().toISOString(),
      },
    ]);
    const payData = Array.isArray(payInsert) ? payInsert[0] : payInsert;

    if (formData.payment_type === "installment" && payData?.id) {
      const { data: pendingEntries } = await supabase
        .from("installment_entries")
        .select("*")
        .eq("order_id", formData.order_id)
        .in("status", ["unpaid", "partial", "overdue"])
        .order("due_date");

      if (pendingEntries && pendingEntries.length > 0) {
        let budget = amountUSD;
        const links: {
          payment_id: string;
          installment_entry_id: string;
          allocated_amount_usd: number;
        }[] = [];
        let firstEntryId: string | null = null;

        for (const entry of pendingEntries) {
          if (budget <= 0.001) break;
          const alreadyPaid = Math.round((entry.paid_amount_usd || 0) * 100) / 100;
          const entryTotal = Math.round(entry.amount_usd * 100) / 100;
          const due = Math.round((entryTotal - alreadyPaid) * 100) / 100;
          if (due <= 0.001) continue;

          if (!firstEntryId) firstEntryId = entry.id;

          if (budget >= due - 0.001) {
            // Budget covers this entry fully
            const allocated = due;
            budget = Math.round((budget - due) * 100) / 100;
            await supabase
              .from("installment_entries")
              .update({
                paid_amount_usd: entryTotal,
                status: "paid",
                updated_at: new Date().toISOString(),
              })
              .eq("id", entry.id);
            links.push({
              payment_id: payData.id,
              installment_entry_id: entry.id,
              allocated_amount_usd: allocated,
            });
          } else {
            // Budget partially covers this entry
            const allocated = Math.round(budget * 100) / 100;
            const newPaid = Math.round((alreadyPaid + budget) * 100) / 100;
            await supabase
              .from("installment_entries")
              .update({
                paid_amount_usd: newPaid,
                status: "partial",
                updated_at: new Date().toISOString(),
              })
              .eq("id", entry.id);
            links.push({
              payment_id: payData.id,
              installment_entry_id: entry.id,
              allocated_amount_usd: allocated,
            });
            budget = 0;
          }
        }

        if (firstEntryId) {
          await supabase
            .from("payments")
            .update({ installment_entry_id: firstEntryId })
            .eq("id", payData.id);
        }
        if (links.length > 0) {
          await supabase.from("payment_installment_links").insert(links);
        }
      }
    }

    const { data: orderRows } = await supabase
      .from("orders")
      .select(
        "total_paid_usd, deposit_paid_usd, final_total_usd, sale_type, installment_months"
      )
      .eq("id", formData.order_id);
    const order = Array.isArray(orderRows) ? orderRows[0] : orderRows;
    if (order) {
      const newTotalPaid = Number(order.total_paid_usd || 0) + amountUSD;
      const newDepositPaid =
        formData.payment_type === "deposit"
          ? Number(order.deposit_paid_usd || 0) + amountUSD
          : Number(order.deposit_paid_usd || 0);
      const newBalance = Math.max(
        0,
        Number(order.final_total_usd || 0) - newTotalPaid
      );
      await supabase
        .from("orders")
        .update({
          total_paid_usd: newTotalPaid,
          deposit_paid_usd: newDepositPaid,
          balance_due_usd: newBalance,
          updated_at: new Date().toISOString(),
        })
        .eq("id", formData.order_id);

      if (
        formData.payment_type === "deposit" &&
        order.sale_type === "installment"
      ) {
        const totalDepositPaid = newDepositPaid || 0;
        const finalTotal = order.final_total_usd || 0;
        const remaining = Math.max(0, finalTotal - totalDepositPaid);
        const months = Number(order.installment_months || 5);

        const { data: existingSched } = await supabase
          .from("installment_schedules")
          .select("id")
          .eq("order_id", formData.order_id)
          .maybeSingle();

        if (existingSched?.id) {
          // ✅ Only update the schedule header — do NOT touch entry amounts.
          // Entry amounts were correctly set at order creation time.
          await supabase
            .from("installment_schedules")
            .update({
              deposit_usd: totalDepositPaid,
              remaining_usd: remaining,
              monthly_amount_usd: months > 0 ? Math.round((remaining / months) * 100) / 100 : 0,
            })
            .eq("id", existingSched.id);
        }

      }
    }

    if (activeSession && payData?.id) {
      const orderForLog = orders.find((o) => o.id === formData.order_id);
      const orderNum =
        ((orderForLog as Record<string, unknown>)?.order_number as string) ||
        "";
      await logTransaction({
        session_id: activeSession.id,
        transaction_type: "income",
        reference_type: "payment",
        reference_id: payData.id,
        reference_number: paymentNumber,
        description_en: `Payment ${paymentNumber} - ${formData.payment_type} (${orderNum})`,
        description_ku: `پارەدان ${paymentNumber} - ${formData.payment_type} (${orderNum})`,
        amount_usd: amountUSD,
        currency: formData.currency,
        amount_in_currency: Number(formData.amount_in_currency),
        exchange_rate_used: rate,
        created_by: profile?.id,
      });
    }

    setSaving(false);
    setShowAddModal(false);

    // Show receipt automatically
    const { data: updatedOrderRows } = await supabase
      .from("orders")
      .select(
        "order_number, balance_due_usd, customer:customers(full_name_en,full_name_ku)"
      )
      .eq("id", formData.order_id);
    const updatedOrder = Array.isArray(updatedOrderRows)
      ? updatedOrderRows[0]
      : updatedOrderRows;
    setReceiptPayment({
      ...payData,
      order: updatedOrder,
    } as Payment);

    setFormData({
      order_id: "",
      payment_type: "deposit",
      currency: "USD",
      amount_in_currency: "",
      payment_date: new Date().toISOString().split("T")[0],
      notes_en: "",
      notes_ku: "",
      accountant_name: "",   // ← add this
    });
    // Refresh orders to get updated balance
    supabase
      .from("orders")
      .select(
        "id,order_number,customer:customers(full_name_en,full_name_ku),final_total_usd,balance_due_usd,deposit_required_usd,deposit_paid_usd,sale_type"
      )
      .order("created_at", { ascending: false })
      .then(({ data }) => setOrders((data || []) as Order[]));
    fetchPayments();
  };

  const handleReverse = async () => {
    if (!selectedPayment || !canReverse) return;
    setSaving(true);

    const reversalNumber = `PAY-REV-${Date.now()}`;

    await supabase.from("payments").insert([
      {
        order_id: selectedPayment.order_id,
        payment_number: reversalNumber,
        payment_type: "reversal",
        currency: selectedPayment.currency,
        amount_in_currency: -selectedPayment.amount_in_currency,
        exchange_rate_used: selectedPayment.exchange_rate_used,
        amount_usd: -selectedPayment.amount_usd,
        payment_date: new Date().toISOString().split("T")[0],
        is_reversed: false,
        reversal_reference_id: selectedPayment.id,
        notes_en: reverseReason,
        notes_ku: reverseReason,
        created_by: profile?.id,
        created_at: new Date().toISOString(),
      },
    ]);

    await supabase
      .from("payments")
      .update({ is_reversed: true, reversed_by: profile?.id })
      .eq("id", selectedPayment.id);

    if (selectedPayment.installment_entry_id) {
      const { data: entry } = await supabase
        .from("installment_entries")
        .select("*")
        .eq("id", selectedPayment.installment_entry_id)
        .maybeSingle();
      if (entry) {
        const newPaid = Math.max(
          0,
          (entry.paid_amount_usd || 0) - selectedPayment.amount_usd
        );
        let newStatus: string = "unpaid";
        if (newPaid > 0 && newPaid < entry.amount_usd) newStatus = "partial";
        else if (newPaid >= entry.amount_usd) newStatus = "paid";
        const today = new Date().toISOString().split("T")[0];
        if (newStatus === "unpaid" && entry.due_date < today)
          newStatus = "overdue";
        await supabase
          .from("installment_entries")
          .update({
            paid_amount_usd: newPaid,
            status: newStatus,
            updated_at: new Date().toISOString(),
          })
          .eq("id", selectedPayment.installment_entry_id);
      }
    }

    const { data: orderRows2 } = await supabase
      .from("orders")
      .select("total_paid_usd, final_total_usd")
      .eq("id", selectedPayment.order_id);
    const order = Array.isArray(orderRows2) ? orderRows2[0] : orderRows2;
    if (order) {
      const newTotalPaid = Math.max(
        0,
        Number(order.total_paid_usd || 0) - selectedPayment.amount_usd
      );
      const newBalance = Math.max(
        0,
        Number(order.final_total_usd || 0) - newTotalPaid
      );
      await supabase
        .from("orders")
        .update({
          total_paid_usd: newTotalPaid,
          balance_due_usd: newBalance,
          updated_at: new Date().toISOString(),
        })
        .eq("id", selectedPayment.order_id);
    }

    await supabase.from("audit_logs").insert([
      {
        user_id: profile?.id,
        user_name_en: profile?.full_name_en || "",
        user_name_ku: profile?.full_name_ku || "",
        action: "REVERSE_PAYMENT",
        module: "payments",
        record_id: selectedPayment.id,
        old_values: { amount_usd: selectedPayment.amount_usd },
        new_values: { reason: reverseReason },
        details: { payment_number: selectedPayment.payment_number },
        created_at: new Date().toISOString(),
      },
    ]);

    setSaving(false);
    setShowReverseModal(false);
    setReverseReason("");
    fetchPayments();
  };

  const fmt = (n: number) =>
    `$${Number(n).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  const fmtIQD = (n: number) =>
    `${Number(n).toLocaleString("en-US", { maximumFractionDigits: 0 })} IQD`;

  const paymentTypeColors: Record<string, string> = {
    deposit: "info",
    installment: "warning",
    final: "success",
    partial: "neutral",
    reversal: "error",
  };

  const Th = ({ field, label }: { field: SortField; label: string }) => (
    <th
      className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase whitespace-nowrap cursor-pointer hover:text-gray-700 select-none"
      onClick={() => toggleSort(field)}
    >
      {label}
      <SortIcon field={field} current={sortField} dir={sortDir} />
    </th>
  );
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
  const selectedOrder = orders.find((o) => o.id === formData.order_id);

  return (
    <div className="p-4 lg:p-6 space-y-5">
      {!activeSession && (
        <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm">
          <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
            <LockIcon size={16} className="text-amber-600" />
          </div>
          <div>
            <p className="font-semibold text-amber-800">
              {t("cashRegisterClosed")}
            </p>
            <p className="text-amber-700 text-xs">
              {t("openCashRegisterToRecord")}
            </p>
          </div>
        </div>
      )}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("searchPayments2")}
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
          />
        </div>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none"
        >
          <option value="all">{t("allTypes")}</option>
          {["deposit", "installment", "final", "partial", "reversal"].map(
            (pt) => (
              <option key={pt} value={pt}>
                {t(pt as Parameters<typeof t>[0])}
              </option>
            )
          )}
        </select>
        <input
          type="date"
          value={filterDate}
          onChange={(e) => setFilterDate(e.target.value)}
          className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none"
        />
        {canCreate && (
          <Button
            onClick={() => setShowAddModal(true)}
            icon={<Plus size={16} />}
            disabled={!activeSession}
          >
            {t("addPayment")}
          </Button>
        )}
      </div>

      <p className="text-sm text-gray-500">
        {total} {t("payments").toLowerCase()}
      </p>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <Th field="payment_number" label={t("receiptNumber")} />
              <Th field="order_number" label={t("orders")} />
              <Th field="customer" label={t("customer")} />
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">{t("phone")}</th>
              <Th field="payment_type" label={t("paymentType")} />
              <Th field="amount_usd" label={t("usdAmount")} />
              <Th field="currency" label={t("currency")} />
              <Th field="exchange_rate_used" label={t("exchangeRate")} />
              <Th field="payment_date" label={t("date")} />
              <Th field="created_by" label={t("createdBy")} />
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">
                Accountant
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">
                {t("actions")}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              <tr>
                <td
                  colSpan={10}
                  className="px-4 py-12 text-center text-gray-400"
                >
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                    {t("loading")}
                  </div>
                </td>
              </tr>
            ) : payments.length === 0 ? (
              <tr>
                <td
                  colSpan={10}
                  className="px-4 py-12 text-center text-gray-400"
                >
                  {t("noData")}
                </td>
              </tr>
            ) : (
              payments.map((pay) => (
                <tr
                  key={pay.id}
                  className={`hover:bg-emerald-50/20 transition-colors ${pay.is_reversed ? "opacity-50" : ""
                    }`}
                >
                  <td className="px-4 py-3 font-mono text-xs font-bold text-emerald-700">
                    {pay.payment_number}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-emerald-700">
                    {
                      (pay.order as Record<string, unknown>)
                        ?.order_number as string
                    }
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {language === "ku"
                      ? (
                        (pay.order as Record<string, unknown>)
                          ?.customer as Record<string, string>
                      )?.full_name_ku
                      : (
                        (pay.order as Record<string, unknown>)
                          ?.customer as Record<string, string>
                      )?.full_name_en}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600">
                    {((pay.order as Record<string, unknown>)?.customer as Record<string, string>)?.phone || "—"}
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      variant={
                        paymentTypeColors[pay.payment_type] as
                        | "info"
                        | "warning"
                        | "success"
                        | "neutral"
                        | "error"
                      }
                    >
                      {t(pay.payment_type as Parameters<typeof t>[0])}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 font-semibold text-gray-900">
                    {fmt(pay.amount_usd)}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-700">
                    <div>
                      {pay.currency === "IQD"
                        ? fmtIQD(pay.amount_in_currency)
                        : fmt(pay.amount_in_currency)}
                    </div>
                    <div className="text-gray-400">{pay.currency}</div>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {Number(pay.exchange_rate_used).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {fmtDate(pay.payment_date)}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600">
                    {(pay.created_by_profile as Record<string, string>)
                      ?.full_name_en || "—"}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600">
                    {pay.accountant_name || "—"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setReceiptPayment(pay)}
                        className="p-1.5 rounded-lg hover:bg-emerald-50 text-emerald-600 transition-colors"
                        title={t("print")}
                      >
                        <Printer size={14} />
                      </button>
                      {canReverse &&
                        !pay.is_reversed &&
                        pay.payment_type !== "reversal" && (
                          <button
                            onClick={() => {
                              setSelectedPayment(pay);
                              setReverseReason("");
                              setShowReverseModal(true);
                            }}
                            className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 transition-colors"
                            title={t("reverse")}
                          >
                            <RotateCcw size={14} />
                          </button>
                        )}
                      {pay.is_reversed && (
                        <Badge variant="error">{t("reversedBadge")}</Badge>
                      )}
                    </div>
                  </td>
                </tr>
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
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title={t("addPayment")}
        size="lg"
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setShowAddModal(false)}>
              {t("cancel")}
            </Button>
            <Button
              onClick={handleAddPayment}
              loading={saving}
              disabled={!formData.order_id || !formData.amount_in_currency}
            >
              {t("save")}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t("orders")} <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <div
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white cursor-pointer flex items-center justify-between gap-2 hover:border-emerald-400 transition-colors"
                onClick={() => setOrderOpen((o) => !o)}
              >
                <span className={formData.order_id ? "text-gray-900" : "text-gray-400"}>
                  {(() => {
                    const o = orders.find((o) => o.id === formData.order_id);
                    if (!o) return t("selectOption");
                    const cust = (o as Record<string, unknown>).customer as Record<string, string>;
                    const name = language === "ku" ? cust?.full_name_ku : cust?.full_name_en;
                    return `${(o as Record<string, unknown>).order_number} — ${name || ""}${cust?.phone ? ` · ${cust.phone}` : ""}`;
                  })()}
                </span>
                <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>

              {orderOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => { setOrderOpen(false); setOrderSearch(""); }} />
                  <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
                    <div className="p-2 border-b border-gray-100">
                      <input
                        autoFocus
                        type="text"
                        value={orderSearch}
                        onChange={(e) => setOrderSearch(e.target.value)}
                        placeholder="Search by order number, customer name or phone..."
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                    <div className="max-h-60 overflow-y-auto">
                      <div
                        className="px-3 py-2 text-sm text-gray-400 hover:bg-gray-50 cursor-pointer"
                        onClick={() => { setFormData((p) => ({ ...p, order_id: "" })); setOrderOpen(false); setOrderSearch(""); }}
                      >
                        {t("selectOption")}
                      </div>
                      {(() => {
                        const filtered = orderSearch.trim()
                          ? orders.filter((o) => {
                            const q = orderSearch.toLowerCase();
                            const cust = (o as Record<string, unknown>).customer as Record<string, string>;
                            return (
                              String((o as Record<string, unknown>).order_number || "").toLowerCase().includes(q) ||
                              (cust?.full_name_en || "").toLowerCase().includes(q) ||
                              (cust?.full_name_ku || "").toLowerCase().includes(q) ||
                              (cust?.phone || "").includes(q)
                            );
                          })
                          : orders;

                        return filtered.length === 0 ? (
                          <div className="px-3 py-4 text-sm text-center text-gray-400">No orders found</div>
                        ) : (
                          filtered.map((o) => {
                            const cust = (o as Record<string, unknown>).customer as Record<string, string>;
                            const name = language === "ku" ? cust?.full_name_ku : cust?.full_name_en;
                            return (
                              <div
                                key={o.id}
                                className={`px-3 py-2.5 text-sm cursor-pointer hover:bg-emerald-50 ${formData.order_id === o.id ? "bg-emerald-50 text-emerald-700 font-medium" : "text-gray-900"}`}
                                onClick={() => { setFormData((p) => ({ ...p, order_id: o.id })); setOrderOpen(false); setOrderSearch(""); }}
                              >
                                <div className="flex items-center justify-between gap-3">
                                  <span className="font-mono text-xs text-emerald-700 font-bold flex-shrink-0">
                                    {(o as Record<string, unknown>).order_number as string}
                                  </span>
                                  <span className="flex-1 truncate">{name}</span>
                                  {cust?.phone && (
                                    <span className="text-xs text-gray-400 flex-shrink-0">{cust.phone}</span>
                                  )}
                                </div>
                              </div>
                            );
                          })
                        );
                      })()}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {selectedOrder && (
            <div className="p-3 bg-gray-50 rounded-xl text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-gray-500">{t("orderTotal")}:</span>
                <span className="font-semibold">
                  {fmt(selectedOrder.final_total_usd)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">{t("depositRequired")}:</span>
                <span className="font-semibold text-blue-700">
                  {fmt(
                    selectedOrder.deposit_required_usd ||
                    selectedOrder.final_total_usd * 0.5
                  )}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">{t("depositPaid")}:</span>
                <span className="font-semibold text-emerald-700">
                  {fmt(selectedOrder.deposit_paid_usd || 0)}
                </span>
              </div>
              <div className="flex justify-between border-t border-gray-200 pt-1 mt-1">
                <span className="text-gray-500">{t("balanceDueLabel")}:</span>
                <span
                  className={`font-bold ${Number(selectedOrder.balance_due_usd) > 0
                    ? "text-red-600"
                    : "text-emerald-600"
                    }`}
                >
                  {fmt(selectedOrder.balance_due_usd)}
                </span>
              </div>
              {(selectedOrder as Record<string, unknown>).sale_type ===
                "installment" &&
                formData.payment_type === "deposit" && (
                  <div className="mt-1.5 p-2 bg-blue-50 border border-blue-100 rounded-lg text-blue-700">
                    {t("recordingDepositNote")}
                  </div>
                )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Select
              label={t("paymentType")}
              value={formData.payment_type}
              onChange={(e) =>
                setFormData((p) => ({
                  ...p,
                  payment_type: e.target.value as Payment["payment_type"],
                }))
              }
              options={["deposit", "installment", "final", "partial"].map(
                (pt) => ({ value: pt, label: t(pt as Parameters<typeof t>[0]) })
              )}
            />
            <Select
              label={t("currency")}
              value={formData.currency}
              onChange={(e) =>
                setFormData((p) => ({
                  ...p,
                  currency: e.target.value as Currency,
                }))
              }
              options={[
                { value: "USD", label: "USD" },
                { value: "IQD", label: "IQD" },
              ]}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label={`${t("amount")} (${formData.currency})`}
              type="number"
              min={0}
              step={formData.currency === "USD" ? 0.01 : 1}
              value={formData.amount_in_currency}
              onChange={(e) =>
                setFormData((p) => ({
                  ...p,
                  amount_in_currency: e.target.value,
                }))
              }
              required
            />
            <Input
              label={t("date")}
              type="date"
              value={formData.payment_date}
              onChange={(e) =>
                setFormData((p) => ({ ...p, payment_date: e.target.value }))
              }
              required
            />
          </div>

          {formData.amount_in_currency && (
            <div className="p-3 bg-emerald-50 rounded-xl text-sm">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">{t("exchangeRate")}:</span>
                <span className="font-bold text-emerald-700">
                  {getExchangeRate().toLocaleString()} IQD / $1
                </span>
              </div>
              <div className="flex justify-between items-center mt-1">
                <span className="text-gray-600">{t("amountInUSD")}:</span>
                <span className="font-bold text-emerald-800 text-base">
                  {fmt(getAmountUSD())}
                </span>
              </div>
              {formData.payment_type === "installment" && (
                <p className="text-xs text-amber-600 mt-1">
                  {t("installmentRateNote")}
                </p>
              )}
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t("accountantName")} <span className="text-red-500">*</span>
            </label>
            <input
              value={formData.accountant_name}
              onChange={(e) => setFormData((p) => ({ ...p, accountant_name: e.target.value }))}
              placeholder={t("enterAccountantName")}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t("notesEn")}
            </label>
            <input
              value={formData.notes_en}
              onChange={(e) =>
                setFormData((p) => ({ ...p, notes_en: e.target.value }))
              }
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none"
            />
          </div>
          
          <div dir="rtl">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t("notesKu")}
            </label>
            <input
              value={formData.notes_ku}
              onChange={(e) =>
                setFormData((p) => ({ ...p, notes_ku: e.target.value }))
              }
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none text-right"
            />
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={showReverseModal}
        onClose={() => setShowReverseModal(false)}
        title={t("reverse")}
        size="sm"
        footer={
          <div className="flex justify-end gap-3">
            <Button
              variant="secondary"
              onClick={() => setShowReverseModal(false)}
            >
              {t("cancel")}
            </Button>
            <Button
              variant="danger"
              onClick={handleReverse}
              loading={saving}
              disabled={!reverseReason.trim()}
            >
              {t("reverse")}
            </Button>
          </div>
        }
      >
        {selectedPayment && (
          <div className="space-y-4">
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm space-y-1 text-red-700">
              <p>
                {t("reversingPayment")}{" "}
                <strong>{selectedPayment.payment_number}</strong>
              </p>
              <p>
                {t("amount")}:{" "}
                <strong>{fmt(selectedPayment.amount_usd)}</strong>
              </p>
              {selectedPayment.installment_entry_id && (
                <p className="text-amber-700 bg-amber-50 px-2 py-1 rounded-lg border border-amber-200">
                  {t("installmentEntryUpdateNote")}
                </p>
              )}
            </div>
            <Input
              label={`${t("reverseReason")} *`}
              value={reverseReason}
              onChange={(e) => setReverseReason(e.target.value)}
              required
              placeholder={t("enterReversalReason")}
            />
          </div>
        )}
      </Modal>

      {receiptPayment &&
        (() => {
          const ord = receiptPayment.order as
            | (Order & { customer?: Customer })
            | undefined;
          const balance = ord?.balance_due_usd ?? 0;
          return (
            <PaymentReceipt
              payment={receiptPayment}
              balanceDue={balance}
              onClose={() => setReceiptPayment(null)}
            />
          );
        })()}
    </div>
  );
}
