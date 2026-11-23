// Único archivo que conoce localStorage. Si algún día cambias a otra
// forma de guardar datos, solo modificas este módulo.

export function leerDatos(clave, valorPorDefecto) {
  try {
    const texto = localStorage.getItem(clave);
    return texto ? JSON.parse(texto) : valorPorDefecto;
  } catch (error) {
    console.error(`No se pudo leer "${clave}" del almacenamiento:`, error);
    return valorPorDefecto;
  }
}

export function guardarDatos(clave, valor) {
  try {
    localStorage.setItem(clave, JSON.stringify(valor));
  } catch (error) {
    console.error(`No se pudo guardar "${clave}":`, error);
  }
}
