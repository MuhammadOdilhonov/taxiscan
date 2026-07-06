"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/store/auth";
import { apiGet } from "@/lib/api/client";
import type { Subscription, Transaction, Card } from "@/lib/api/types";
import { Spinner } from "@/components/ui/Spinner";
import { ChangePasswordCard } from "@/components/ChangePasswordCard";
import { AvatarUpload } from "@/components/AvatarUpload";
import { formatUzs, formatDateTime } from "@/lib/format";
import { CreditCard, Crown, Phone, ArrowRight, CheckCircle2, XCircle, Clock, Car } from "lucide-react";
import { LogoutButton } from "@/components/LogoutButton";
import { PromoRedeemCard } from "@/components/PromoRedeemCard";

export default function DriverProfile() {
  const { user } = useAuth();
  const [sub, setSub] = useState<Subscription | null>(null);
  const [cards, setCards] = useState<Card[]>([]);
  const [txns, setTxns] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apiGet<Subscription>("/billing/subscription/"),
      apiGet<{ results: Card[] }>("/billing/cards/"),
      apiGet<{ results: Transaction[] }>("/billing/transactions/"),
    ])
      .then(([s, c, t]) => {
        setSub(s);
        setCards(c.results || []);
        setTxns(t.results || []);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="card p-12 flex justify-center"><Spinner size={28} /></div>;

  return (
    <div className="grid md:grid-cols-3 gap-6">
      <div className="md:col-span-1 space-y-4">
        <div className="card p-6 text-center">
          <AvatarUpload size={80} fallbackClass="bg-ink text-brand" />
          <h2 className="mt-4 text-xl font-extrabold text-ink">
            {user?.first_name} {user?.last_name}
          </h2>
          <p className="text-sm text-ink-muted flex items-center justify-center gap-1.5 mt-1">
            <Phone size={14} /> {user?.phone}
          </p>
          <span className="badge bg-ink text-brand mt-3"><Car size={12} /> Haydovchi</span>
          <div className="mt-4">
            <LogoutButton />
          </div>
        </div>

        <PromoRedeemCard />

        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-ink flex items-center gap-2">
              <Crown size={18} className="text-brand-600" /> Obuna
            </h3>
            <span className={`badge ${sub?.is_active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
              {sub?.status_display}
            </span>
          </div>
          {sub && (
            <>
              <div className="text-3xl font-extrabold text-ink">
                {sub.days_left} <span className="text-base font-medium text-ink-muted">kun qoldi</span>
              </div>
              <p className="text-xs text-ink-muted mt-1">Tugaydi: {formatDateTime(sub.expires_at)}</p>
              <Link href="/billing" className="btn-primary w-full mt-4">
                Obuna boshqarish <ArrowRight size={16} />
              </Link>
            </>
          )}
        </div>

        <ChangePasswordCard />
      </div>

      <div className="md:col-span-2 space-y-4">
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-ink flex items-center gap-2">
              <CreditCard size={18} /> Kartalarim
            </h3>
            <Link href="/billing" className="text-sm text-brand-700 font-semibold hover:underline">
              Boshqarish
            </Link>
          </div>
          {cards.length === 0 ? (
            <div className="text-center py-8 text-ink-muted text-sm">
              <p>Hozircha karta ulanmagan</p>
              <Link href="/billing" className="btn-outline mt-3 text-sm">Karta qo'shish</Link>
            </div>
          ) : (
            <div className="space-y-2">
              {cards.map((c) => (
                <div key={c.id} className="flex items-center justify-between p-3 rounded-xl bg-ink-bg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-ink text-white font-bold text-xs flex items-center justify-center uppercase">
                      {c.card_type}
                    </div>
                    <div>
                      <div className="font-semibold text-ink text-sm">•••• {c.card_last4}</div>
                      <div className="text-xs text-ink-muted">{c.holder_name}</div>
                    </div>
                  </div>
                  {c.is_default && <span className="badge bg-brand text-ink">Asosiy</span>}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card p-5">
          <h3 className="font-bold text-ink mb-4">Tranzaksiyalar tarixi</h3>
          {txns.length === 0 ? (
            <p className="text-sm text-ink-muted text-center py-6">Hech qanday tranzaksiya yo'q</p>
          ) : (
            <div className="space-y-2">
              {txns.map((t) => {
                const Icon = t.status === "success" ? CheckCircle2 : t.status === "failed" ? XCircle : Clock;
                const color = t.status === "success" ? "text-green-600" : t.status === "failed" ? "text-red-600" : "text-orange-500";
                return (
                  <div key={t.id} className="flex items-center justify-between py-2.5 border-b border-ink-line last:border-0">
                    <div className="flex items-center gap-3">
                      <Icon size={20} className={color} />
                      <div>
                        <div className="font-semibold text-ink text-sm">{t.description}</div>
                        <div className="text-xs text-ink-muted">
                          {formatDateTime(t.created_at)} • •••• {t.card_last4}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
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
    </div>
  );
}
