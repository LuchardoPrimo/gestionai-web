// Helpers de formateo y números para Argentina.

export const fmt = (n) => {
  if (n === undefined || n === null || isNaN(n)) return "$0";
  const a = Math.abs(n);
  if (a >= 1e6) return (n < 0 ? "-" : "") + "$" + (a / 1e6).toFixed(1) + "M";
  if (a >= 1e3) return (n < 0 ? "-" : "") + "$" + (a / 1e3).toFixed(0) + "K";
  return "$" + Number(n).toLocaleString("es-AR");
};

export const fmtDate = (d) =>
  d ? new Date(d + "T12:00:00").toLocaleDateString("es-AR", { day: "numeric", month: "short" }) : "—";

export const pct = (a, b) => (b > 0 ? Math.round((a / b) * 100) : 0);
