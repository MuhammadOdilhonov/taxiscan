"use client";

import { useEffect, useState } from "react";
import { apiGet, apiPost, apiDelete } from "@/lib/api/client";
import type { Card, Subscription, Transaction } from "@/lib/api/types";
import { Spinner } from "@/components/ui/Spinner";
import { formatUzs, formatDateTime } from "@/lib/format";
import {
  CreditCard,
  Crown,
  Plus,
  Trash2,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  ShieldCheck,
} from "lucide-react";

export default function BillingPage() {
  const [sub, setSub] = useState<Subscription | null>(null);
  const [cards, setCards] = useState<Card[]>([]);
  const [txns, setTxns] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddCard, setShowAddCard] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const [s, c, t] = await Promise.all([
      apiGet<Subscription>("/billing/subscription/"),
      apiGet<{ results: Card[] }>("/billing/cards/"),
      apiGet<{ results: Transaction[] }>("/billing/transactions/"),
    ]);
    setSub(s);
    setCards(c.results || []);
    setTxns(t.results || []);
  };

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, []);

  const subscribe = async () => {
    if (cards.length === 0) {
      setShowAddCard(true);
      return;
    }
    setBusy(true);
    try {
      await apiPost("/billing/subscribe/", {});
      await load();
      alert("Obuna 30 kunga uzaytirildi!");
    } catch (err: any) {
      alert(err?.data?.detail || "Xatolik");
    } finally {
      setBusy(false);
    }
  };

  const cancel = async () => {
    if (!confirm("Obunani bekor qilmoqchimisiz? Avtomatik to'lov o'chiriladi.")) return;
    setBusy(true);
    try {
      await apiPost("/billing/cancel/", {});
      await load();
    } finally {
      setBusy(false);
    }
  };

  const removeCard = async (id: number) => {
    if (!confirm("Kartani o'chirasizmi?")) return;
    await apiDelete(`/billing/cards/${id}/`);
    await load();
  };

  if (loading) {
    return <div className="card p-12 flex justify-center"><Spinner size={28} /></div>;
  }

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <div className="space-y-4">
        <div className="card p-6 bg-gradient-to-br from-ink to-ink-soft text-white">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 text-brand">
                <Crown size={18} /> <span className="text-xs uppercase font-bold tracking-wider">Premium obuna</span>
              </div>
              <div className="text-4xl font-extrabold mt-2">$1<span className="text-lg font-medium opacity-70">/oy</span></div>
              <p className="text-sm opacity-80 mt-1">~12,500 so'm. Istalgan vaqt bekor qilish.</p>
            </div>
            <div className="flex items-end gap-0.5">
              <Sparkles size={16} className="text-brand animate-star-pulse" style={{ animationDelay: "0ms" }} />
              <Sparkles size={26} className="text-brand animate-star-pulse" style={{ animationDelay: "250ms" }} />
              <Sparkles size={18} className="text-brand animate-star-pulse" style={{ animationDelay: "500ms" }} />
            </div>
          </div>

          {sub && (
            <div className="mt-5 p-3 rounded-xl bg-white/10 backdrop-blur">
              <div className="flex items-center justify-between text-sm">
                <span className="opacity-80">Holat</span>
                <span className="font-bold">{sub.status_display}</span>
              </div>
              <div className="flex items-center justify-between text-sm mt-1.5">
                <span className="opacity-80">Qoldi</span>
                <span className="font-bold">{sub.days_left} kun</span>
              </div>
              <div className="flex items-center justify-between text-sm mt-1.5">
                <span className="opacity-80">Tugaydi</span>
                <span className="font-bold">{formatDateTime(sub.expires_at)}</span>
              </div>
            </div>
          )}

          <div className="mt-4 flex gap-2">
            {/* "30 kunga uzaytirish" — faqat obuna faol emas yoki 3 kundan kam qolganda */}
            {(!sub || !sub.is_active || sub.days_left <= 3) ? (
              <button onClick={subscribe} disabled={busy} className="btn-primary flex-1">
                {busy ? <Spinner /> : "30 kunga uzaytirish ($1)"}
              </button>
            ) : (
              <div className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-white/10 py-2.5 text-sm font-semibold">
                <CheckCircle2 size={16} className="text-brand" /> Obuna faol — {sub.days_left} kun qoldi
              </div>
            )}
            {sub?.auto_renew && (
              <button onClick={cancel} disabled={busy} className="btn-outline !text-white !border-white/30 hover:!bg-white/10">
                Bekor qilish
              </button>
            )}
          </div>
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-ink flex items-center gap-2">
              <CreditCard size={18} /> Kartalarim ({cards.length})
            </h3>
            <button
              onClick={() => setShowAddCard((v) => !v)}
              className="text-sm text-brand-700 font-semibold hover:underline flex items-center gap-1"
            >
              <Plus size={14} /> Qo'shish
            </button>
          </div>

          {showAddCard && <AddCardForm onDone={() => { setShowAddCard(false); load(); }} />}

          <div className="space-y-2 mt-3">
            {cards.length === 0 && !showAddCard && (
              <div className="text-center py-6 text-ink-muted text-sm">
                Hozircha karta yo'q. "Qo'shish" tugmasini bosing.
              </div>
            )}
            {cards.map((c) => (
              <div key={c.id} className="flex items-center justify-between p-3 rounded-xl bg-ink-bg">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-8 rounded-md bg-ink text-brand text-[10px] font-bold flex items-center justify-center uppercase">
                    {c.card_type}
                  </div>
                  <div>
                    <div className="font-semibold text-ink text-sm">•••• •••• •••• {c.card_last4}</div>
                    <div className="text-xs text-ink-muted">
                      {c.holder_name} • {String(c.expiry_month).padStart(2, "0")}/{c.expiry_year}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {c.is_default && <span className="badge bg-brand text-ink">Asosiy</span>}
                  <button
                    onClick={() => removeCard(c.id)}
                    className="text-red-500 hover:bg-red-50 p-1.5 rounded-md"
                    aria-label="O'chirish"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 flex items-center gap-2 text-xs text-ink-muted">
            <ShieldCheck size={14} className="text-green-600" />
            Karta ma'lumotlari shifrlangan holda saqlanadi
          </div>
        </div>
      </div>

      <div className="card p-5">
        <h3 className="font-bold text-ink mb-4">Tranzaksiyalar tarixi</h3>
        {txns.length === 0 ? (
          <p className="text-sm text-ink-muted text-center py-6">Hech qanday tranzaksiya yo'q</p>
        ) : (
          <div className="space-y-2 max-h-[600px] overflow-auto no-scrollbar">
            {txns.map((t) => {
              const Icon = t.status === "success" ? CheckCircle2 : t.status === "failed" ? XCircle : Clock;
              const color = t.status === "success" ? "text-green-600" : t.status === "failed" ? "text-red-600" : "text-orange-500";
              return (
                <div key={t.id} className="flex items-center justify-between py-2.5 border-b border-ink-line last:border-0">
                  <div className="flex items-center gap-3 min-w-0">
                    <Icon size={20} className={`${color} shrink-0`} />
                    <div className="min-w-0">
                      <div className="font-semibold text-ink text-sm truncate">{t.description}</div>
                      <div className="text-xs text-ink-muted">
                        {formatDateTime(t.created_at)} • •••• {t.card_last4}
                      </div>
                      {t.error_message && (
                        <div className="text-xs text-red-600 mt-0.5">{t.error_message}</div>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0 ml-2">
                    <div className="font-bold text-ink">${t.amount_usd}</div>
                    <div className="text-xs text-ink-muted">{formatUzs(t.amount_uzs)}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function AddCardForm({ onDone }: { onDone: () => void }) {
  const [number, setNumber] = useState("");
  const [holder, setHolder] = useState("");
  const [exp, setExp] = useState("");
  const [cvv, setCvv] = useState("");
  const [cardType, setCardType] = useState<"uzcard" | "humo" | "visa" | "mastercard">("uzcard");
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const needsCvv = cardType === "visa" || cardType === "mastercard";

  const validate = (): Record<string, string> => {
    const e: Record<string, string> = {};
    const digits = number.replace(/\D/g, "");
    if (digits.length < 16) e.number = "16 raqam to'liq kiriting";
    else if (digits.length > 19) e.number = "Karta raqami juda uzun";

    if (!holder.trim()) e.holder = "Karta egasi ism-familiyasi kerak";
    else if (holder.trim().length < 3) e.holder = "To'liq ism-familiya";

    const m = exp.match(/^(\d{2})\/(\d{2})$/);
    if (!m) e.exp = "MM/YY formatida kiriting";
    else {
      const mm = parseInt(m[1], 10);
      const yy = 2000 + parseInt(m[2], 10);
      if (mm < 1 || mm > 12) e.exp = "Oy 01-12 oraligida";
      else {
        const now = new Date();
        const expDate = new Date(yy, mm, 0, 23, 59, 59);
        if (expDate < now) e.exp = "Karta muddati o'tgan";
      }
    }

    if (needsCvv) {
      if (!/^\d{3,4}$/.test(cvv)) e.cvv = "CVV 3-4 raqam";
    }

    return e;
  };

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    const v = validate();
    setErrors(v);
    if (Object.keys(v).length > 0) return;

    setBusy(true);
    try {
      const [mm, yy] = exp.split("/");
      await apiPost("/billing/cards/add/", {
        card_number: number.replace(/\s/g, ""),
        holder_name: holder.trim(),
        expiry_month: parseInt(mm, 10),
        expiry_year: 2000 + parseInt(yy, 10),
        ...(needsCvv ? { cvv } : {}),
        card_type: cardType,
      });
      onDone();
    } catch (e: any) {
      const data = e?.data;
      if (data && typeof data === "object") {
        const apiErrors: Record<string, string> = {};
        for (const [k, val] of Object.entries(data)) {
          const msg = Array.isArray(val) ? val[0] : String(val);
          // Map backend field -> form field
          const fieldMap: Record<string, string> = {
            card_number: "number",
            holder_name: "holder",
            expiry_month: "exp",
            expiry_year: "exp",
            cvv: "cvv",
            detail: "_form",
          };
          apiErrors[fieldMap[k] || k] = String(msg);
        }
        setErrors(apiErrors);
      } else {
        setErrors({ _form: "Xatolik" });
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="bg-ink-bg p-4 rounded-xl space-y-3 mt-2">
      <div className="grid grid-cols-3 gap-2">
        {(["uzcard", "humo", "visa", "mastercard"] as const).map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => { setCardType(c); if (c === "uzcard" || c === "humo") setCvv(""); }}
            className={`text-xs font-semibold uppercase py-2 rounded-lg ${
              cardType === c ? "bg-ink text-white" : "bg-white border border-ink-line"
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      <div>
        <input
          className={`input ${errors.number ? "border-red-400 ring-red-100" : ""}`}
          placeholder="8600 1234 5678 9012"
          maxLength={23}
          inputMode="numeric"
          value={number}
          onChange={(e) => {
            setNumber(e.target.value.replace(/\s/g, "").replace(/(\d{4})(?=\d)/g, "$1 "));
            if (errors.number) setErrors({ ...errors, number: "" });
          }}
        />
        {errors.number && <p className="text-[11px] text-red-600 mt-1">{errors.number}</p>}
      </div>
      <div>
        <input
          className={`input ${errors.holder ? "border-red-400 ring-red-100" : ""}`}
          placeholder="ALI VALIYEV"
          value={holder}
          onChange={(e) => {
            setHolder(e.target.value.toUpperCase());
            if (errors.holder) setErrors({ ...errors, holder: "" });
          }}
        />
        {errors.holder && <p className="text-[11px] text-red-600 mt-1">{errors.holder}</p>}
      </div>
      <div className={needsCvv ? "grid grid-cols-2 gap-2" : ""}>
        <div>
          <input
            className={`input ${errors.exp ? "border-red-400 ring-red-100" : ""}`}
            placeholder="MM/YY"
            maxLength={5}
            inputMode="numeric"
            value={exp}
            onChange={(e) => {
              let v = e.target.value.replace(/\D/g, "");
              if (v.length >= 2) v = v.slice(0, 2) + "/" + v.slice(2, 4);
              setExp(v);
              if (errors.exp) setErrors({ ...errors, exp: "" });
            }}
          />
          {errors.exp && <p className="text-[11px] text-red-600 mt-1">{errors.exp}</p>}
        </div>
        {needsCvv && (
          <div>
            <input
              type="password"
              className={`input ${errors.cvv ? "border-red-400 ring-red-100" : ""}`}
              placeholder="CVV"
              maxLength={4}
              inputMode="numeric"
              value={cvv}
              onChange={(e) => {
                setCvv(e.target.value.replace(/\D/g, ""));
                if (errors.cvv) setErrors({ ...errors, cvv: "" });
              }}
            />
            {errors.cvv && <p className="text-[11px] text-red-600 mt-1">{errors.cvv}</p>}
          </div>
        )}
      </div>

      {errors._form && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 text-xs">
          {errors._form}
        </div>
      )}

      <div className="flex gap-2">
        <button type="submit" className="btn-primary flex-1" disabled={busy}>
          {busy ? <Spinner /> : "Karta qo'shish"}
        </button>
      </div>
      <p className="text-xs text-ink-muted">
        ℹ️ Karta tasdig'i uchun 1$ ushlab qaytariladi (yechilmaydi)
      </p>
    </form>
  );
}
