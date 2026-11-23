# Somali Beauty – Tienda online (proyecto universitario)

Tienda estática hecha con HTML, CSS y JavaScript (módulos ES). Sin pagos ni base de datos.

## Cómo abrirla
Necesita un servidor local (los módulos y `fetch` no funcionan con doble clic en `index.html`):
- VS Code → extensión **Live Server** → clic derecho en `index.html` → *Open with Live Server*
- o en la terminal: `python -m http.server 8000` y abrir http://localhost:8000

## Estructura
- `index.html`            Estructura de la página
- `css/`                  `variables.css` (paleta) · `base.css` · `componentes.css` · `responsive.css`
- `js/main.js`            Punto de entrada: conecta todo
- `js/modelos/`           Lógica de negocio: `carrito.js`, `precios.js` (precio por volumen)
- `js/servicios/`         `productos.js` (carga del catálogo), `almacenamiento.js` (localStorage)
- `js/ui/`                Dibujan el HTML: catálogo, detalle, carrito, aviso
- `js/utils/formato.js`   Moneda, escape de HTML, búsqueda sin tildes
- `data/productos.json`   Catálogo (553 productos)
- `assets/img/`           Fotos de productos y `sin-imagen.svg`
- `herramientas/`         `extraer_catalogo.py`: convierte el catálogo PDF a JSON + fotos

## Pendientes antes de publicar
1. Revisar `data/productos.json`: nombres, categorías y fotos (se generó automáticamente).
2. Cambiar el enlace de WhatsApp del pie de página.

## Regenerar los datos desde el PDF
    pip install pymupdf pillow
    python herramientas/extraer_catalogo.py catalogo.pdf .
