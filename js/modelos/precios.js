// Reglas de precio por volumen. Son funciones "puras": reciben datos y
// devuelven un resultado, sin tocar el DOM ni localStorage. Por eso son
// fáciles de probar en la consola del navegador.
//
// Un producto con precio por volumen se ve así en productos.json:
//   "precio": 13000,
//   "preciosPorVolumen": [{ "minimo": 12, "precio": 10000 }]
// y significa: 1 a 11 unidades a $13.000 c/u; desde 12 unidades a $10.000 c/u.

// Precio de UNA unidad según la cantidad que se lleva.
export function precioUnitario(producto, cantidad) {
  let precio = producto.precio;
  for (const escala of producto.preciosPorVolumen ?? []) {
    if (cantidad >= escala.minimo) precio = escala.precio; // las escalas vienen de menor a mayor
  }
  return precio;
}

// Siguiente escala que todavía no se alcanza (o null si ya está en la mejor).
export function siguienteEscala(producto, cantidad) {
  return (producto.preciosPorVolumen ?? []).find((escala) => cantidad < escala.minimo) ?? null;
}
