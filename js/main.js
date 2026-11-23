import { cargarProductos, obtenerProductoPorId, obtenerCategorias, filtrarProductos } from "./servicios/productos.js";
import * as carrito from "./modelos/carrito.js";
import { renderizarCatalogo, renderizarCategorias } from "./ui/catalogo.js";
import { abrirDetalle, cerrarDetalle } from "./ui/detalle.js";
import { renderizarCarrito, abrirCarrito, cerrarCarrito } from "./ui/carrito-ui.js";
import { mostrarAviso } from "./ui/aviso.js";
import { IMAGEN_POR_DEFECTO, PRODUCTOS_POR_PAGINA } from "./config.js";

// ---------- Referencias al DOM ----------
const listado = document.getElementById("listado-productos");
const contenedorVerMas = document.getElementById("contenedor-ver-mas");
const buscador = document.getElementById("buscador");
const filtroCategoria = document.getElementById("filtro-categoria");
const selectorOrden = document.getElementById("orden");
const mensajeEstado = document.getElementById("mensaje-estado");
const modalDetalle = document.getElementById("modal-detalle");
const contenidoDetalle = document.getElementById("contenido-detalle");

// ---------- Estado de la vista ----------
let resultados = [];                      // productos que cumplen los filtros actuales
let visibles = PRODUCTOS_POR_PAGINA;      // cuántos se están mostrando

function pintarCatalogo() {
  renderizarCatalogo(listado, contenedorVerMas, resultados, visibles);
}

// Se llama cuando cambia un filtro: vuelve a filtrar y reinicia la paginación.
function actualizarCatalogo() {
  resultados = filtrarProductos({
    texto: buscador.value,
    categoria: filtroCategoria.value,
    orden: selectorOrden.value,
  });
  visibles = PRODUCTOS_POR_PAGINA;
  mensajeEstado.textContent = resultados.length
    ? `${resultados.length} producto(s) encontrados`
    : "No se encontraron productos con ese criterio.";
  pintarCatalogo();
}

// ---------- Acciones por delegación de eventos ----------
// En vez de un listener por botón, escuchamos en el documento y leemos data-accion.
// Así funciona también con los botones que se crean dinámicamente.
function manejarClics(evento) {
  const boton = evento.target.closest("[data-accion]");
  if (!boton) return;

  const { accion, id } = boton.dataset;
  const linea = carrito.obtenerResumen().lineas.find((l) => l.producto.id === id);

  switch (accion) {
    case "agregar":
      if (carrito.agregarProducto(id)) {
        mostrarAviso(`✦ Añadido: ${obtenerProductoPorId(id).nombre}`);
      }
      break;
    case "ver-detalle":
      abrirDetalle(modalDetalle, contenidoDetalle, obtenerProductoPorId(id));
      break;
    case "ver-mas":
      visibles += PRODUCTOS_POR_PAGINA;
      pintarCatalogo();
      break;
    case "aumentar":
      if (linea) carrito.actualizarCantidad(id, linea.cantidad + 1);
      break;
    case "disminuir":
      if (linea) carrito.actualizarCantidad(id, linea.cantidad - 1);
      break;
    case "eliminar":
      carrito.eliminarProducto(id);
      break;
  }
}

function configurarEventos() {
  document.addEventListener("click", manejarClics);

  buscador.addEventListener("input", actualizarCatalogo);
  filtroCategoria.addEventListener("change", actualizarCatalogo);
  selectorOrden.addEventListener("change", actualizarCatalogo);

  document.getElementById("btn-abrir-carrito").addEventListener("click", abrirCarrito);
  document.getElementById("btn-cerrar-carrito").addEventListener("click", cerrarCarrito);
  document.getElementById("fondo-oscuro").addEventListener("click", cerrarCarrito);
  document.getElementById("btn-cerrar-detalle").addEventListener("click", () => cerrarDetalle(modalDetalle));

  // Cerrar el detalle al hacer clic fuera de la ventana
  modalDetalle.addEventListener("click", (e) => { if (e.target === modalDetalle) cerrarDetalle(modalDetalle); });

  document.getElementById("btn-vaciar-carrito").addEventListener("click", () => {
    if (confirm("¿Seguro que deseas vaciar el carrito?")) carrito.vaciarCarrito();
  });

  // Imagen de respaldo si alguna ruta falla (el evento "error" no burbujea: usamos captura).
  document.addEventListener("error", (e) => {
    if (e.target.tagName === "IMG" && !e.target.src.endsWith(IMAGEN_POR_DEFECTO)) {
      e.target.src = IMAGEN_POR_DEFECTO;
    }
  }, true);
}

// ---------- Arranque de la aplicación ----------
async function iniciar() {
  try {
    mensajeEstado.textContent = "Cargando productos…";
    await cargarProductos();

    renderizarCategorias(filtroCategoria, obtenerCategorias());
    actualizarCatalogo();

    carrito.suscribir(renderizarCarrito);          // la UI reacciona a los cambios
    renderizarCarrito(carrito.obtenerResumen());   // pinta el carrito guardado en localStorage

    configurarEventos();
  } catch (error) {
    console.error(error);
    mensajeEstado.textContent = "Ocurrió un error al cargar los productos. Intenta de nuevo más tarde.";
  }
}

iniciar();
