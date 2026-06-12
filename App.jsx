import { useState, useMemo } from "react";

// ── DATOS BASE — foto actual del portafolio ──────────────────────────────────
const BASE = {
  iwda:  { cant: 400, precio: 142.21, cagr: 0.105 },  // ya incluye +100 VHYD
  eimi:  { cant: 0,   precio: 55.34,  cagr: 0.09 },
  btcn:  { cant: 6500, precio: 6.29, btcEquiv: 0.65 },
  igln:  { cant: 50,  precio: 79.10, cagr: 0.07 },
  jepq:  { cant: 500, precio: 26.95, yield: 0.109 },
  vdty:  { cant: 500, precio: 21.34, yield: 0.043 },
  jeip:  { cant: 500, precio: 20.85, yield: 0.0838 },
  vety:  { cant: 500, precio: 22.02, yield: 0.026 },
  stablesUsd: 69020,
  eurCoin: 56000,
  eurUsd: 1.13,
};

const BTC_ENTRY = 62925;

const TRAMOS = [
  { label: "T1", precio: 90000,  btc: 0.30 },
  { label: "T2", precio: 120000, btc: 0.40 },
  { label: "T3", precio: 150000, btc: 0.50 },
  { label: "T4", precio: 180000, btc: 0.30 },
];

const GHS = 0.0265;

function fmt(n, dec = 0) {
  return "$" + n.toLocaleString("en-US", { maximumFractionDigits: dec, minimumFractionDigits: dec });
}
function fmtE(n, dec = 0) {
  return "€" + n.toLocaleString("en-US", { maximumFractionDigits: dec, minimumFractionDigits: dec });
}
function fmtAcc(n) {
  return Math.round(n).toLocaleString("en-US");
}

// ── COMPONENTES ──────────────────────────────────────────────────────────────
function Slider({ label, value, onChange, color, suffix = "%" }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
        <span style={{ fontSize: 13, color: "#a89a8c", fontFamily: "'IBM Plex Mono', monospace", letterSpacing: "0.04em" }}>{label}</span>
        <span style={{ fontSize: 22, fontWeight: 700, color, fontFamily: "'IBM Plex Mono', monospace" }}>{value}{suffix}</span>
      </div>
      <input
        type="range" min={0} max={100} step={5} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{
          width: "100%", height: 6, borderRadius: 3, outline: "none",
          accentColor: color, background: "#2a2420", cursor: "pointer",
        }}
      />
    </div>
  );
}

function StatCard({ label, before, after, sub, accent }) {
  return (
    <div style={{
      background: "#1c1714", border: "1px solid #332b25", borderRadius: 4,
      padding: "16px 18px", flex: 1, minWidth: 140,
    }}>
      <div style={{ fontSize: 11, color: "#7a6f64", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8, fontFamily: "'IBM Plex Mono', monospace" }}>
        {label}
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
        <span style={{ fontSize: 14, color: "#5f564e", textDecoration: "line-through", fontFamily: "'IBM Plex Mono', monospace" }}>{before}</span>
        <span style={{ fontSize: 24, fontWeight: 700, color: accent, fontFamily: "'IBM Plex Mono', monospace" }}>{after}</span>
      </div>
      {sub && <div style={{ fontSize: 12, color: "#a89a8c", marginTop: 6 }}>{sub}</div>}
    </div>
  );
}

function Row({ label, before, after, unit, accent, isHeader }) {
  return (
    <div style={{
      display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr 1.2fr",
      padding: "10px 4px", borderBottom: "1px solid #2a2420",
      fontSize: isHeader ? 11 : 14,
      color: isHeader ? "#7a6f64" : "#e8ddd2",
      textTransform: isHeader ? "uppercase" : "none",
      letterSpacing: isHeader ? "0.08em" : "normal",
      fontFamily: isHeader ? "'IBM Plex Mono', monospace" : "'Source Serif 4', serif",
      fontWeight: isHeader ? 500 : 400,
    }}>
      <div style={{ fontWeight: isHeader ? 500 : 600 }}>{label}</div>
      <div style={{ fontFamily: "'IBM Plex Mono', monospace", color: isHeader ? "#7a6f64" : "#8a7d70" }}>{before}</div>
      <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontWeight: 700, color: isHeader ? "#7a6f64" : accent }}>{after}</div>
      <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: isHeader ? 11 : 13, color: isHeader ? "#7a6f64" : "#a89a8c" }}>{unit}</div>
    </div>
  );
}

function SectionTitle({ children, accent }) {
  return (
    <div style={{
      fontFamily: "'Source Serif 4', serif", fontSize: 22, fontWeight: 600,
      color: "#f0e6d8", marginBottom: 4, display: "flex", alignItems: "center", gap: 10,
    }}>
      <span style={{ width: 8, height: 8, background: accent, borderRadius: "50%", flexShrink: 0 }} />
      {children}
    </div>
  );
}

// ── COMPONENTE PRINCIPAL ──────────────────────────────────────────────────────
export default function BTCCycleSimulator() {
  const [pCrec, setPCrec] = useState(50);
  const [pCash, setPCash] = useState(25);
  const [pFlujo, setPFlujo] = useState(25);

  // Sub-distribuciones (fijas, basadas en proporciones actuales)
  const subCrec = { iwda: 0.70, eimi: 0.22, igln: 0.08 };
  const subCash = { usd: 0.55, eur: 0.45 };
  const subFlujo = { usd: 0.60, eur: 0.40 };
  const subFlujoUsd = { jepq: 0.70, vdty: 0.30 };
  const subFlujoEur = { jeip: 0.70, vety: 0.30 };

  const totalPct = pCrec + pCash + pFlujo;
  const normalized = totalPct > 0 ? totalPct : 1;

  const calc = useMemo(() => {
    // 1. Calcular venta de 1.5 BTC en tramos
    let totalNeto = 0;
    let totalGanancia = 0;
    let totalGhs = 0;
    const tramos = TRAMOS.map(t => {
      const bruto = t.btc * t.precio;
      const costoBase = t.btc * BTC_ENTRY;
      const ganancia = bruto - costoBase;
      const ghs = ganancia * GHS;
      const neto = bruto - ghs;
      totalNeto += neto;
      totalGanancia += ganancia;
      totalGhs += ghs;
      return { ...t, bruto, ganancia, ghs, neto };
    });

    // 2. Normalizar porcentajes y distribuir
    const fCrec = (pCrec / 100) * (totalNeto);
    const fCash = (pCash / 100) * (totalNeto);
    const fFlujo = (pFlujo / 100) * (totalNeto);

    // 3. Crecimiento
    const capIwda = fCrec * subCrec.iwda;
    const capEimi = fCrec * subCrec.eimi;
    const capIgln = fCrec * subCrec.igln;
    const newIwdaAcc = capIwda / BASE.iwda.precio;
    const newEimiAcc = capEimi / BASE.eimi.precio;
    const newIglnAcc = capIgln / BASE.igln.precio;

    // 4. Cash
    const capStablesUsd = fCash * subCash.usd;
    const capEurCoinUsd = fCash * subCash.eur;
    const capEurCoinEur = capEurCoinUsd / BASE.eurUsd;

    // 5. Flujo
    const fFlujoUsd = fFlujo * subFlujo.usd;
    const fFlujoEurUsd = fFlujo * subFlujo.eur;
    const fFlujoEur = fFlujoEurUsd / BASE.eurUsd;

    const capJepq = fFlujoUsd * subFlujoUsd.jepq;
    const capVdty = fFlujoUsd * subFlujoUsd.vdty;
    const capJeip = fFlujoEur * subFlujoEur.jeip;
    const capVety = fFlujoEur * subFlujoEur.vety;

    const newJepqAcc = capJepq / BASE.jepq.precio;
    const newVdtyAcc = capVdty / BASE.vdty.precio;
    const newJeipAcc = capJeip / BASE.jeip.precio;
    const newVetyAcc = capVety / BASE.vety.precio;

    // ── TOTALES DESPUÉS ──
    const iwdaAccAfter = BASE.iwda.cant + newIwdaAcc;
    const eimiAccAfter = BASE.eimi.cant + newEimiAcc;
    const iglnAccAfter = BASE.igln.cant + newIglnAcc;
    const jepqAccAfter = BASE.jepq.cant + newJepqAcc;
    const vdtyAccAfter = BASE.vdty.cant + newVdtyAcc;
    const jeipAccAfter = BASE.jeip.cant + newJeipAcc;
    const vetyAccAfter = BASE.vety.cant + newVetyAcc;

    const iwdaCapAfter = iwdaAccAfter * BASE.iwda.precio;
    const eimiCapAfter = eimiAccAfter * BASE.eimi.precio;
    const iglnCapAfter = iglnAccAfter * BASE.igln.precio;
    const btcnCapAfter = BASE.btcn.cant * BASE.btcn.precio;

    const jepqCapAfter = jepqAccAfter * BASE.jepq.precio;
    const vdtyCapAfter = vdtyAccAfter * BASE.vdty.precio;
    const jeipCapAfter = jeipAccAfter * BASE.jeip.precio;
    const vetyCapAfter = vetyAccAfter * BASE.vety.precio;

    const jepqIncAfter = jepqCapAfter * BASE.jepq.yield / 12;
    const vdtyIncAfter = vdtyCapAfter * BASE.vdty.yield / 12;
    const jeipIncAfter = jeipCapAfter * BASE.jeip.yield / 12;
    const vetyIncAfter = vetyCapAfter * BASE.vety.yield / 12;

    const stablesUsdAfter = BASE.stablesUsd + capStablesUsd;
    const eurCoinAfter = BASE.eurCoin + capEurCoinEur;

    const totalCrecAfter = iwdaCapAfter + eimiCapAfter + iglnCapAfter + btcnCapAfter;

    const flujoUsdIncAfter = jepqIncAfter + vdtyIncAfter;
    const flujoEurIncAfter = jeipIncAfter + vetyIncAfter;

    // Valor 15Y
    const val15Iwda = iwdaCapAfter * Math.pow(1 + BASE.iwda.cagr, 15);
    const val15Eimi = eimiCapAfter * Math.pow(1 + BASE.eimi.cagr, 15);
    const val15Igln = iglnCapAfter * Math.pow(1 + BASE.igln.cagr, 15);
    const val15Total = val15Iwda + val15Eimi + val15Igln;

    const iwdaProgress = Math.min(100, (iwdaAccAfter / 1000) * 100);
    const iwdaFalta = Math.max(0, 1000 - iwdaAccAfter);

    return {
      tramos, totalNeto, totalGanancia, totalGhs,
      fCrec, fCash, fFlujo,
      capIwda, capEimi, capIgln,
      newIwdaAcc, newEimiAcc, newIglnAcc,
      iwdaAccAfter, eimiAccAfter, iglnAccAfter,
      iwdaCapAfter, eimiCapAfter, iglnCapAfter, btcnCapAfter, totalCrecAfter,
      capStablesUsd, capEurCoinUsd, capEurCoinEur,
      stablesUsdAfter, eurCoinAfter,
      jepqAccAfter, vdtyAccAfter, jeipAccAfter, vetyAccAfter,
      jepqCapAfter, vdtyCapAfter, jeipCapAfter, vetyCapAfter,
      jepqIncAfter, vdtyIncAfter, jeipIncAfter, vetyIncAfter,
      flujoUsdIncAfter, flujoEurIncAfter,
      val15Iwda, val15Eimi, val15Igln, val15Total,
      iwdaProgress, iwdaFalta,
    };
  }, [pCrec, pCash, pFlujo]);

  return (
    <div style={{
      background: "#0e0c0a",
      minHeight: "100vh",
      fontFamily: "'Source Serif 4', Georgia, serif",
      padding: "32px 20px 60px",
      color: "#e8ddd2",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Source+Serif+4:opsz,wght@8..60,400;8..60,600;8..60,700&family=IBM+Plex+Mono:wght@400;500;700&display=swap');
        input[type="range"]::-webkit-slider-thumb {
          width: 16px; height: 16px; border-radius: 50%;
          background: currentColor; cursor: pointer; border: none;
          appearance: none;
        }
        input[type="range"] { color: inherit; }
        @media (max-width: 720px) {
          .grid-2 { grid-template-columns: 1fr !important; }
          .stat-row { flex-direction: column; }
        }
      `}</style>

      <div style={{ maxWidth: 980, margin: "0 auto" }}>

        {/* HEADER */}
        <div style={{ marginBottom: 36 }}>
          <div style={{ fontSize: 12, color: "#c9a468", letterSpacing: "0.16em", textTransform: "uppercase", fontFamily: "'IBM Plex Mono', monospace", marginBottom: 10 }}>
            Simulador · Ciclo BTC 1.5 → $180K
          </div>
          <h1 style={{ fontSize: 36, fontWeight: 700, margin: 0, lineHeight: 1.15, color: "#f5ead9" }}>
            ¿Adónde va cada dólar<br />del último tramo?
          </h1>
          <p style={{ color: "#a89a8c", fontSize: 15, marginTop: 10, maxWidth: 560 }}>
            Movés los tres reguladores y la planilla entera se redistribuye en tiempo real — crecimiento, reserva y flujo.
          </p>
        </div>

        {/* RESUMEN DEL CICLO */}
        <div style={{ background: "#1c1714", border: "1px solid #332b25", borderRadius: 4, padding: "20px 22px", marginBottom: 28 }}>
          <SectionTitle accent="#c9a468">Resultado del ciclo — 1.5 BTC, entrada {fmt(BTC_ENTRY)}</SectionTitle>
          <div style={{ display: "flex", gap: 24, flexWrap: "wrap", marginTop: 14 }} className="stat-row">
            <div>
              <div style={{ fontSize: 11, color: "#7a6f64", textTransform: "uppercase", letterSpacing: "0.08em", fontFamily: "'IBM Plex Mono', monospace" }}>Ganancia bruta</div>
              <div style={{ fontSize: 26, fontWeight: 700, color: "#9fc97a", fontFamily: "'IBM Plex Mono', monospace" }}>{fmt(calc.totalGanancia)}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: "#7a6f64", textTransform: "uppercase", letterSpacing: "0.08em", fontFamily: "'IBM Plex Mono', monospace" }}>GHS 2.65%</div>
              <div style={{ fontSize: 26, fontWeight: 700, color: "#c97a6e", fontFamily: "'IBM Plex Mono', monospace" }}>-{fmt(calc.totalGhs)}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: "#7a6f64", textTransform: "uppercase", letterSpacing: "0.08em", fontFamily: "'IBM Plex Mono', monospace" }}>Neto a distribuir</div>
              <div style={{ fontSize: 26, fontWeight: 700, color: "#f0e6d8", fontFamily: "'IBM Plex Mono', monospace" }}>{fmt(calc.totalNeto)}</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 16, flexWrap: "wrap" }}>
            {calc.tramos.map(t => (
              <div key={t.label} style={{
                flex: "1 1 100px", background: "#15110d", border: "1px solid #2a2420", borderRadius: 4,
                padding: "8px 10px", fontFamily: "'IBM Plex Mono', monospace", fontSize: 12,
              }}>
                <div style={{ color: "#c9a468", fontWeight: 700 }}>{t.label} · {fmt(t.precio)}</div>
                <div style={{ color: "#7a6f64", marginTop: 2 }}>{t.btc} BTC → {fmt(t.neto)}</div>
              </div>
            ))}
          </div>
        </div>

        {/* SLIDERS */}
        <div style={{ background: "#1c1714", border: "1px solid #332b25", borderRadius: 4, padding: "22px 24px", marginBottom: 28 }}>
          <SectionTitle accent="#c9a468">Distribución del neto</SectionTitle>
          <div style={{ marginTop: 18, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24 }} className="grid-2">
            <Slider label="Crecimiento" value={pCrec} onChange={setPCrec} color="#7fb3d5" />
            <Slider label="Cash / Reserva" value={pCash} onChange={setPCash} color="#c9a468" />
            <Slider label="Flujo" value={pFlujo} onChange={setPFlujo} color="#9fc97a" />
          </div>
          <div style={{
            marginTop: 4, fontSize: 12, fontFamily: "'IBM Plex Mono', monospace",
            color: totalPct === 100 ? "#9fc97a" : "#c97a6e",
            display: "flex", alignItems: "center", gap: 8,
          }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: totalPct === 100 ? "#9fc97a" : "#c97a6e" }} />
            Suma actual: {totalPct}% {totalPct !== 100 && "— los montos se normalizan automáticamente sobre 100%"}
          </div>
        </div>

        {/* GRID 2 COLUMNAS: CRECIMIENTO / FLUJO */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 24 }} className="grid-2">

          {/* CRECIMIENTO */}
          <div style={{ background: "#1c1714", border: "1px solid #332b25", borderRadius: 4, padding: "20px 22px" }}>
            <SectionTitle accent="#7fb3d5">Crecimiento</SectionTitle>
            <div style={{ fontSize: 12, color: "#7a6f64", margin: "4px 0 14px", fontFamily: "'IBM Plex Mono', monospace" }}>
              Recibe {fmt(calc.fCrec)} · IWDA 70% · EIMI 22% · IGLN 8%
            </div>
            <Row label="" before="Antes" after="Después" unit="" isHeader />
            <Row label="IWDA" before={`${BASE.iwda.cant} acc`} after={`${fmtAcc(calc.iwdaAccAfter)} acc`} unit={fmt(calc.iwdaCapAfter)} accent="#7fb3d5" />
            <Row label="EIMI" before={`${BASE.eimi.cant} acc`} after={`${fmtAcc(calc.eimiAccAfter)} acc`} unit={fmt(calc.eimiCapAfter)} accent="#7fb3d5" />
            <Row label="IGLN" before={`${BASE.igln.cant} acc`} after={`${fmtAcc(calc.iglnAccAfter)} acc`} unit={fmt(calc.iglnCapAfter)} accent="#c9a468" />
            <Row label="BTCN core" before="0.65 BTC" after="0.65 BTC" unit={fmt(calc.btcnCapAfter)} accent="#7a6f64" />

            <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid #2a2420" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <span style={{ fontSize: 13, color: "#a89a8c" }}>Total crecimiento</span>
                <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 20, fontWeight: 700, color: "#7fb3d5" }}>{fmt(calc.totalCrecAfter)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginTop: 6 }}>
                <span style={{ fontSize: 13, color: "#a89a8c" }}>Valor a 15 años</span>
                <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 16, color: "#9fc97a" }}>{fmt(calc.val15Total)}</span>
              </div>
            </div>

            {/* IWDA progress bar */}
            <div style={{ marginTop: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#7a6f64", marginBottom: 6, fontFamily: "'IBM Plex Mono', monospace", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                <span>IWDA → 1,000 acc</span>
                <span>{fmtAcc(calc.iwdaAccAfter)} / 1,000</span>
              </div>
              <div style={{ height: 8, background: "#15110d", borderRadius: 4, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${calc.iwdaProgress}%`, background: "linear-gradient(90deg, #7fb3d5, #9fc97a)", borderRadius: 4, transition: "width 0.3s" }} />
              </div>
              <div style={{ fontSize: 12, color: "#a89a8c", marginTop: 6 }}>
                {calc.iwdaFalta > 0
                  ? <>Faltan <strong style={{ color: "#c9a468" }}>{fmtAcc(calc.iwdaFalta)} acc</strong> — {Math.ceil(calc.iwdaFalta * BASE.iwda.precio / 8439)} mes(es) de DCA</>
                  : <strong style={{ color: "#9fc97a" }}>Objetivo cumplido</strong>}
              </div>
            </div>
          </div>

          {/* FLUJO */}
          <div style={{ background: "#1c1714", border: "1px solid #332b25", borderRadius: 4, padding: "20px 22px" }}>
            <SectionTitle accent="#9fc97a">Flujo</SectionTitle>
            <div style={{ fontSize: 12, color: "#7a6f64", margin: "4px 0 14px", fontFamily: "'IBM Plex Mono', monospace" }}>
              Recibe {fmt(calc.fFlujo)} · USD 60% · EUR 40%
            </div>
            <Row label="" before="Antes" after="Después" unit="Income/mes" isHeader />
            <Row label="JEPQ" before={`${BASE.jepq.cant} acc`} after={`${fmtAcc(calc.jepqAccAfter)} acc`} unit={fmt(calc.jepqIncAfter, 0)} accent="#9fc97a" />
            <Row label="VDTY" before={`${BASE.vdty.cant} acc`} after={`${fmtAcc(calc.vdtyAccAfter)} acc`} unit={fmt(calc.vdtyIncAfter, 0)} accent="#7fb3d5" />
            <Row label="JEIP" before={`${BASE.jeip.cant} acc`} after={`${fmtAcc(calc.jeipAccAfter)} acc`} unit={fmtE(calc.jeipIncAfter, 0)} accent="#caa8e0" />
            <Row label="VETY" before={`${BASE.vety.cant} acc`} after={`${fmtAcc(calc.vetyAccAfter)} acc`} unit={fmtE(calc.vetyIncAfter, 0)} accent="#caa8e0" />

            <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid #2a2420" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <span style={{ fontSize: 13, color: "#a89a8c" }}>Income flujo USD</span>
                <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 20, fontWeight: 700, color: "#9fc97a" }}>{fmt(calc.flujoUsdIncAfter, 0)}/mes</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginTop: 6 }}>
                <span style={{ fontSize: 13, color: "#a89a8c" }}>Income flujo EUR</span>
                <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 20, fontWeight: 700, color: "#caa8e0" }}>{fmtE(calc.flujoEurIncAfter, 0)}/mes</span>
              </div>
            </div>
          </div>
        </div>

        {/* CASH / RESERVA — fila completa */}
        <div style={{ background: "#1c1714", border: "1px solid #332b25", borderRadius: 4, padding: "20px 22px", marginBottom: 24 }}>
          <SectionTitle accent="#c9a468">Cash / Reserva</SectionTitle>
          <div style={{ fontSize: 12, color: "#7a6f64", margin: "4px 0 14px", fontFamily: "'IBM Plex Mono', monospace" }}>
            Recibe {fmt(calc.fCash)} · Stables USD 55% · EUR Coin 45%
          </div>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }} className="stat-row">
            <StatCard label="Stables USD" before={fmt(BASE.stablesUsd)} after={fmt(calc.stablesUsdAfter)} sub={`+${fmt(calc.capStablesUsd)} nuevos`} accent="#c9a468" />
            <StatCard label="EUR Coin" before={fmtE(BASE.eurCoin)} after={fmtE(calc.eurCoinAfter)} sub={`+${fmtE(calc.capEurCoinEur)} nuevos`} accent="#c9a468" />
          </div>
        </div>

        {/* RESUMEN FINAL */}
        <div style={{ background: "linear-gradient(135deg, #1c1714 0%, #221a14 100%)", border: "1px solid #3d3025", borderRadius: 4, padding: "24px 26px" }}>
          <SectionTitle accent="#f0e6d8">Resumen — antes vs. después del ciclo</SectionTitle>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginTop: 16 }} className="stat-row">
            <StatCard label="Total crecimiento" before={fmt(87503)} after={fmt(calc.totalCrecAfter)} accent="#7fb3d5" />
            <StatCard label="Income flujo USD" before="$161" after={fmt(calc.flujoUsdIncAfter, 0) + "/mes"} accent="#9fc97a" />
            <StatCard label="Income flujo EUR" before="€97" after={fmtE(calc.flujoEurIncAfter, 0) + "/mes"} accent="#caa8e0" />
            <StatCard label="Stables + EUR Coin" before={fmt(69020 + 56000 * BASE.eurUsd)} after={fmt(calc.stablesUsdAfter + calc.eurCoinAfter * BASE.eurUsd)} accent="#c9a468" />
          </div>
        </div>

        <div style={{ marginTop: 28, fontSize: 12, color: "#5f564e", textAlign: "center", fontFamily: "'IBM Plex Mono', monospace", letterSpacing: "0.04em" }}>
          Sub-distribuciones fijas según proporciones actuales del portafolio · GHS 2.65% sobre ganancia · Entrada BTC {fmt(BTC_ENTRY)}
        </div>

      </div>
    </div>
  );
}
