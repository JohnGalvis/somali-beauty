// Mensaje emergente breve ("Producto añadido al carrito").
const elemento = document.getElementById("aviso");
let temporizador;

export function mostrarAviso(texto) {
  elemento.textContent = texto;
  elemento.classList.add("aviso--visible");
  clearTimeout(temporizador);
  temporizador = setTimeout(() => elemento.classList.remove("aviso--visible"), 2000);
}
