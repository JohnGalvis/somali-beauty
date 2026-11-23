import { RUTA_PRODUCTOS } from "../config.js";
import { normalizar } from "../utils/formato.js";

let catalogo = []; // se llena una sola vez al iniciar la aplicación

export async function cargarProductos() {
  const respuesta = await fetch(RUTA_PRODUCTOS);
  if (!respuesta.ok) {
    throw new Error(`No se pudo cargar ${RUTA_PRODUCTOS} (código ${respuesta.status})`);
  }
  catalogo = await respuesta.json();
  return catalogo;
}

export function obtenerProductoPorId(id) {
  return catalogo.find((producto) => producto.id === String(id));
}

export function obtenerCategorias() {
  const categorias = catalogo.map((p) => p.categoria).filter(Boolean);
  return [...new Set(categorias)].sort((a, b) => a.localeCompare(b, "es"));
}

// Devuelve los productos que cumplen los filtros, ya ordenados.
export function filtrarProductos({ texto = "", categoria = "", orden = "relevancia" } = {}) {
  const busqueda = normalizar(texto.trim());

  const resultado = catalogo.filter((p) => {
    const coincideTexto = !busqueda || normalizar(`${p.nombre} ${p.categoria} ${p.linea}`).includes(busqueda);
    const coincideCategoria = !categoria || p.categoria === categoria;
    return coincideTexto && coincideCategoria;
  });

  const comparadores = {
    "precio-asc": (a, b) => a.precio - b.precio,
    "precio-desc": (a, b) => b.precio - a.precio,
    nombre: (a, b) => a.nombre.localeCompare(b.nombre, "es"),
    // Por defecto: el orden del catálogo, pero los agotados al final.
    relevancia: (a, b) => Number(a.agotado) - Number(b.agotado),
  };
  return resultado.sort(comparadores[orden] ?? comparadores.relevancia);
}
