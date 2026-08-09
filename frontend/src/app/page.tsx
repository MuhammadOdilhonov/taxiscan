import Link from "next/link";
import { Logo } from "@/components/ui/Logo";
import { ArrowRight, Check, MapPin, TrendingUp, Wallet, Sparkles } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-ink-bg">
      {/* Header */}
      <header className="border-b border-ink-line bg-white">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Logo />
          <div className="flex items-center gap-2">
            <Link href="/login" className="btn-ghost text-sm">Kirish</Link>
            <Link href="/register" className="btn-primary text-sm py-2 px-4">Boshlash</Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-4 py-16 md:py-24">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 bg-brand/10 border border-brand/20 rounded-full px-3 py-1 text-xs font-semibold text-brand-700 mb-5">
              <Sparkles size={12} /> Toshkent uchun #1 taksi narx aggregatori
            </div>
            <h1 className="text-4xl md:text-6xl font-extrabold text-ink leading-[1.05] tracking-tight">
              5 ta taksining narxini
              <br />
              <span className="text-brand-600">bir joyda</span> ko'ring
            </h1>
            <p className="mt-5 text-lg text-ink-muted max-w-lg">
              Yandex Go, Uklon, Fasten, WB Taxi va MyTaxi narxlarini bir soniyada
              taqqoslang — eng arzon variantni tanlab, har safar pul tejang.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/register?role=passenger" className="btn-primary">
                Yo'lovchi sifatida boshlash <ArrowRight size={18} />
              </Link>
              <Link href="/register?role=driver" className="btn-dark">
                Haydovchi sifatida kirish <ArrowRight size={18} />
              </Link>
            </div>

            <div className="mt-6 flex items-center gap-6 text-sm text-ink-muted">
              <span className="flex items-center gap-1.5"><Check size={16} className="text-brand-600" /> 7 kun bepul</span>
              <span className="flex items-center gap-1.5"><Check size={16} className="text-brand-600" /> Oyiga 9 999 so'mdan</span>
              <span className="flex items-center gap-1.5"><Check size={16} className="text-brand-600" /> Istalgan vaqt bekor</span>
            </div>
          </div>

          <div className="relative">
            <div className="card p-6 shadow-xl">
              <div className="text-xs uppercase font-bold text-ink-muted tracking-wider mb-3">Bugungi narxlar — Mirobod → Yunusobod</div>
              {[
                { name: "Uklon",     color: "#00C853", price: 27500, cheapest: true },
                { name: "WB Taxi",   color: "#7B2CBF", price: 29000 },
                { name: "Fasten",    color: "#FF6B00", price: 30500 },
                { name: "MyTaxi",    color: "#0066CC", price: 32000 },
                { name: "Yandex Go", color: "#FFCC00", price: 33500 },
              ].map((s) => (
                <div key={s.name} className={`flex items-center justify-between py-2.5 border-b border-ink-line last:border-0 ${s.cheapest ? "bg-brand/10 -mx-6 px-6 rounded-md" : ""}`}>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center text-white font-bold text-sm" style={{ backgroundColor: s.color }}>
                      {s.name[0]}
                    </div>
                    <div>
                      <div className="font-semibold text-ink text-sm">{s.name}</div>
                      {s.cheapest && (
                        <div className="text-[10px] uppercase text-brand-700 font-bold">Eng arzon</div>
                      )}
                    </div>
                  </div>
                  <div className="font-extrabold text-ink">{s.price.toLocaleString("uz-UZ")} so'm</div>
                </div>
              ))}
              <div className="mt-4 text-center text-xs text-ink-muted">Tejagan summa: <span className="font-bold text-brand-700">6,000 so'm</span></div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-4 py-16">
        <h2 className="text-3xl md:text-4xl font-extrabold text-center text-ink">
          Nima uchun TaxiNarx?
        </h2>
        <div className="mt-12 grid md:grid-cols-3 gap-6">
          {[
            { icon: <MapPin />, title: "Real vaqtda narxlar", text: "Manzillaringizni kiriting va barcha taksi xizmatlaridan narxlarni bir soniyada oling." },
            { icon: <TrendingUp />, title: "Statistika va trendlar", text: "Qaysi tumanda qaysi xizmat ko'p arzon ekanini ko'ring. Haydovchilar uchun maxsus." },
            { icon: <Wallet />, title: "Har safar tejash", text: "Eng arzon xizmatni tanlab, oyiga 100,000+ so'm tejang. Obuna esa atigi 1$." },
          ].map((f, i) => (
            <div key={i} className="card p-6">
              <div className="w-12 h-12 rounded-xl bg-brand/15 flex items-center justify-center text-brand-700 mb-4">
                {f.icon}
              </div>
              <h3 className="font-bold text-lg text-ink">{f.title}</h3>
              <p className="text-ink-muted mt-2 text-sm leading-relaxed">{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-6xl mx-auto px-4 py-16">
        <div className="rounded-3xl bg-ink text-white p-10 md:p-14 text-center">
          <h2 className="text-3xl md:text-4xl font-extrabold">Bugun boshlang — 7 kun bepul</h2>
          <p className="mt-3 text-ink-line max-w-xl mx-auto">
            Karta ulang, 1$ test tranzaksiyani ko'ring va sinab boshlang. Yoqmasa, istalgan vaqt bekor qiling.
          </p>
          <div className="mt-6">
            <Link href="/register" className="btn-primary text-base px-6 py-3.5">
              Hozir ro'yhatdan o'tish <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-ink-line py-6 text-center text-sm text-ink-muted">
        © {new Date().getFullYear()} TaxiNarx. Toshkent.
      </footer>
    </div>
  );
}
