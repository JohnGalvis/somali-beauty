import { formatearPrecio, escaparHTML } from "../utils/formato.js";
import { IMAGEN_POR_DEFECTO } from "../config.js";

function crearTarjeta(producto) {
  const escala = producto.preciosPorVolumen?.[0]; // la primera escala, para mostrar la oferta
  return `
    <article class="tarjeta ${producto.agotado ? "tarjeta--agotada" : ""}">
      <div class="tarjeta__media">
        ${producto.agotado ? '<span class="etiqueta etiqueta--agotado">Agotado</span>' : ""}
        <img class="tarjeta__imagen"
             src="${escaparHTML(producto.imagen || IMAGEN_POR_DEFECTO)}"
             alt="${escaparHTML(producto.nombre)}" loading="lazy">
      </div>
      <div class="tarjeta__cuerpo">
        <span class="tarjeta__categoria">${escaparHTML(producto.categoria || "General")}</span>
        <h3 class="tarjeta__titulo">${escaparHTML(producto.nombre)}</h3>
        <p class="tarjeta__precio">${formatearPrecio(producto.precio)}</p>
        ${escala ? `<p class="tarjeta__escala">Desde ${escala.minimo} u.: ${formatearPrecio(escala.precio)} c/u</p>` : ""}
        <div class="tarjeta__acciones">
          <button class="boton boton--secundario" data-accion="ver-detalle" data-id="${producto.id}">
            Ver detalle
          </button>
          <button class="boton" data-accion="agregar" data-id="${producto.id}" ${producto.agotado ? "disabled" : ""}>
            ${producto.agotado ? "Agotado" : "Añadir al carrito"}
          </button>
        </div>
      </div>
    </article>`;
}

// Dibuja solo los primeros "cantidad" productos y un botón "Ver más" si faltan.
export function renderizarCatalogo(contenedor, contenedorVerMas, productos, cantidad) {
  const visibles = productos.slice(0, cantidad);
  contenedor.innerHTML = visibles.map(crearTarjeta).join("");

  const faltan = productos.length - visibles.length;
  contenedorVerMas.innerHTML = faltan > 0
    ? `<p class="mensaje-estado">Mostrando ${visibles.length} de ${productos.length} productos</p>
       <button class="boton boton--secundario" data-accion="ver-mas">Ver más productos</button>`
    : "";
}

export function renderizarCategorias(selector, categorias) {
  const opciones = categorias
    .map((c) => `<option value="${escaparHTML(c)}">${escaparHTML(c)}</option>`)
    .join("");
  selector.insertAdjacentHTML("beforeend", opciones);
}
