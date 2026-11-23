import { formatearPrecio, escaparHTML } from "../utils/formato.js";
import { IMAGEN_POR_DEFECTO } from "../config.js";

const panel = document.getElementById("carrito");
const fondo = document.getElementById("fondo-oscuro");
const contenedorItems = document.getElementById("items-carrito");
const etiquetaTotal = document.getElementById("total-carrito");
const etiquetaAhorro = document.getElementById("ahorro-carrito");
const contador = document.getElementById("contador-carrito");

export function abrirCarrito() {
  panel.classList.add("carrito--abierto");
  fondo.classList.add("fondo-oscuro--visible");
  panel.setAttribute("aria-hidden", "false");
}

export function cerrarCarrito() {
  panel.classList.remove("carrito--abierto");
  fondo.classList.remove("fondo-oscuro--visible");
  panel.setAttribute("aria-hidden", "true");
}

// Mensaje que anima al cliente a llevar más para llegar al precio por volumen.
function crearPista(linea) {
  if (linea.ahorro > 0 && !linea.siguienteEscala) return "✦ Precio por volumen aplicado";
  if (!linea.siguienteEscala) return "";
  const faltan = linea.siguienteEscala.minimo - linea.cantidad;
  return `Lleva ${faltan} más y paga ${formatearPrecio(linea.siguienteEscala.precio)} c/u`;
}

function crearLinea(linea) {
  const { producto, cantidad, precioUnitario, subtotal } = linea;
  const pista = crearPista(linea);
  return `
    <div class="item-carrito">
      <img class="item-carrito__imagen"
           src="${escaparHTML(producto.imagen || IMAGEN_POR_DEFECTO)}"
           alt="${escaparHTML(producto.nombre)}">
      <div>
        <p class="item-carrito__nombre">${escaparHTML(producto.nombre)}</p>
        <p class="item-carrito__precio">${formatearPrecio(precioUnitario)} c/u</p>
        ${pista ? `<p class="item-carrito__pista">${pista}</p>` : ""}
        <div class="item-carrito__controles">
          <button class="boton-cantidad" data-accion="disminuir" data-id="${producto.id}"
                  aria-label="Disminuir cantidad">−</button>
          <span class="item-carrito__cantidad">${cantidad}</span>
          <button class="boton-cantidad" data-accion="aumentar" data-id="${producto.id}"
                  aria-label="Aumentar cantidad">+</button>
          <span class="item-carrito__subtotal">${formatearPrecio(subtotal)}</span>
        </div>
        <button class="boton-eliminar" data-accion="eliminar" data-id="${producto.id}">Eliminar</button>
      </div>
    </div>`;
}

// Recibe el resumen calculado por el modelo y solo se encarga de dibujarlo.
export function renderizarCarrito(resumen) {
  contador.textContent = resumen.totalUnidades;
  etiquetaTotal.textContent = formatearPrecio(resumen.total);

  etiquetaAhorro.hidden = resumen.ahorroTotal <= 0;
  etiquetaAhorro.textContent = `Ahorras ${formatearPrecio(resumen.ahorroTotal)} por volumen`;

  contenedorItems.innerHTML = resumen.lineas.length
    ? resumen.lineas.map(crearLinea).join("")
    : `<p class="carrito__vacio">Tu carrito está vacío 🛒</p>`;
}
