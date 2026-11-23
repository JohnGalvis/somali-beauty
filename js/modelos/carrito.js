import { CLAVE_CARRITO } from "../config.js";
import { leerDatos, guardarDatos } from "../servicios/almacenamiento.js";
import { obtenerProductoPorId } from "../servicios/productos.js";
import { precioUnitario, siguienteEscala } from "./precios.js";

// Estado: solo guardamos { id, cantidad }. Nombre y precio se consultan al
// catálogo cada vez, así el carrito nunca queda con precios desactualizados.
let items = leerDatos(CLAVE_CARRITO, []);

// Patrón "observador": la interfaz se suscribe y el carrito la avisa cuando cambia.
const oyentes = new Set();

export function suscribir(funcion) {
  oyentes.add(funcion);
}

function notificarCambios() {
  guardarDatos(CLAVE_CARRITO, items); // persistencia automática en cada cambio
  const resumen = obtenerResumen();
  oyentes.forEach((funcion) => funcion(resumen));
}

// Devuelve true si se pudo agregar, false si el producto no existe o está agotado.
export function agregarProducto(id, cantidad = 1) {
  const producto = obtenerProductoPorId(id);
  if (!producto || producto.agotado) return false;

  const existente = items.find((item) => item.id === String(id));
  if (existente) {
    existente.cantidad += cantidad;
  } else {
    items.push({ id: String(id), cantidad });
  }
  notificarCambios();
  return true;
}

export function eliminarProducto(id) {
  items = items.filter((item) => item.id !== String(id));
  notificarCambios();
}

export function actualizarCantidad(id, nuevaCantidad) {
  if (nuevaCantidad <= 0) {
    eliminarProducto(id); // llegar a 0 equivale a quitarlo
    return;
  }
  const item = items.find((i) => i.id === String(id));
  if (item) {
    item.cantidad = nuevaCantidad;
    notificarCambios();
  }
}

export function vaciarCarrito() {
  items = [];
  notificarCambios();
}

// Devuelve todo lo que la interfaz necesita ya calculado.
export function obtenerResumen() {
  const lineas = items
    .map((item) => {
      const producto = obtenerProductoPorId(item.id);
      if (!producto || producto.agotado) return null; // ya no existe o se agotó
      const unitario = precioUnitario(producto, item.cantidad);
      return {
        producto,
        cantidad: item.cantidad,
        precioUnitario: unitario,
        subtotal: unitario * item.cantidad,
        ahorro: (producto.precio - unitario) * item.cantidad, // lo que ahorra por volumen
        siguienteEscala: siguienteEscala(producto, item.cantidad),
      };
    })
    .filter(Boolean);

  return {
    lineas,
    totalUnidades: lineas.reduce((suma, l) => suma + l.cantidad, 0),
    total: lineas.reduce((suma, l) => suma + l.subtotal, 0),
    ahorroTotal: lineas.reduce((suma, l) => suma + l.ahorro, 0),
  };
}
