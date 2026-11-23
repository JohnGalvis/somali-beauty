import { formatearPrecio, escaparHTML } from "../utils/formato.js";
import { IMAGEN_POR_DEFECTO } from "../config.js";

function crearTablaPrecios(producto) {
  const escalas = producto.preciosPorVolumen ?? [];
  if (!escalas.length) return "";
  const filas = escalas
    .map((e) => `<tr><td>${e.minimo} unidades o más</td><td>${formatearPrecio(e.precio)} c/u</td></tr>`)
    .join("");
  return `
    <table class="tabla-precios">
      <thead><tr><th>Cantidad</th><th>Precio</th></tr></thead>
      <tbody>
        <tr><td>1 unidad</td><td>${formatearPrecio(producto.precio)}</td></tr>
        ${filas}
      </tbody>
    </table>`;
}

export function abrirDetalle(modal, contenedor, producto) {
  contenedor.innerHTML = `
    <div class="detalle">
      <img class="detalle__imagen"
           src="${escaparHTML(producto.imagen || IMAGEN_POR_DEFECTO)}"
           alt="${escaparHTML(producto.nombre)}">
      <div class="detalle__info">
        <span class="tarjeta__categoria">${escaparHTML(producto.categoria || "General")}</span>
        <h2 id="detalle-titulo">${escaparHTML(producto.nombre)}</h2>
        <p>${escaparHTML(producto.descripcion || "Escríbenos si necesitas más información de este producto.")}</p>
        <p class="detalle__precio">${formatearPrecio(producto.precio)}</p>
        ${crearTablaPrecios(producto)}
        <button class="boton" data-accion="agregar" data-id="${producto.id}" ${producto.agotado ? "disabled" : ""}>
          ${producto.agotado ? "Producto agotado" : "Añadir al carrito"}
        </button>
      </div>
    </div>`;
  modal.showModal(); // método nativo de <dialog>
}

export function cerrarDetalle(modal) {
  modal.close();
}
