// Formatea un número como moneda colombiana: 45000 -> "$ 45.000"
const formateadorMoneda = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

export function formatearPrecio(valor) {
  return formateadorMoneda.format(valor);
}

// Evita que texto con caracteres especiales (<, >, ", &) rompa el HTML.
export function escaparHTML(texto) {
  return String(texto)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Quita tildes y pasa a minúsculas para buscar: "Pestañas" -> "pestanas"
export function normalizar(texto) {
  return String(texto).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}
