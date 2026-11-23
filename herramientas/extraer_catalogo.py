#!/usr/bin/env python3
"""
extraer_catalogo.py
-------------------
Convierte el catálogo en PDF (hecho en Canva) en los datos de la tienda:

  <salida>/data/productos.json            -> lista de productos
  <salida>/assets/img/productos/*.webp    -> foto de cada producto

Uso:
    pip install pymupdf pillow
    python extraer_catalogo.py catalogo.pdf tienda/

IMPORTANTE: el resultado es un BORRADOR automático. El catálogo tiene un
diseño distinto en cada página, así que hay que revisar el JSON (nombres,
categorías y fotos) antes de publicar.
"""
import json
import re
import sys
from collections import Counter, defaultdict
from io import BytesIO
from pathlib import Path

try:
    import pymupdf as fitz          # versiones nuevas de PyMuPDF
except ImportError:                  # versiones antiguas
    import fitz
from PIL import Image

# ----------------------------------------------------------------------
# Configuración
# ----------------------------------------------------------------------
MAX_LADO_IMAGEN = 640        # px: tamaño máximo de cada foto (ligera para web)
MAX_PAGINAS_DECORACION = 6   # una imagen que aparece en más páginas es decoración
MAX_AREA_IMAGEN = 0.30       # fracción de la página: más grande = fondo, no producto
SEPARACION_NOMBRE = 45       # pt: distancia máxima entre líneas del mismo nombre

RE_PRECIO = re.compile(r"\$\s*(\d{1,3}(?:\.\d{3})+|\d+)")
RE_ESCALA = re.compile(r"^\+?\s*DE\s*(\d+)\s*\$\s*(\d{1,3}(?:\.\d{3})+|\d+)", re.I)
RE_SOLO_PRECIO = re.compile(r"^\$\s*(\d{1,3}(?:\.\d{3})+|\d+)$")

# Reglas para sugerir la categoría (se evalúan en orden). Edita a tu gusto.
REGLAS_CATEGORIA = [
    ("Pestañas", r"PESTA[ÑN]AS|NAGARAKU|MASSCAKU|FIBRAS|COMIC|PESTANAS|EXTENSION|MANGA|VOLUMEN"),
    ("Adhesivos y removedores", r"ADHESIVO|PEGANTE|BONDER|SELLANTE|BOOSTER|REMOVEDOR|PRIMER|CLEANSER|LIMPIADOR|TOALLITA|PAPEL ACTIVADOR"),
    ("Pinzas y herramientas", r"PINZA|TIJERA|PEINILLA|CEPILLO|MICROBRUSH|DISPENSADOR|TABLA|VIDRIO|ANILLO|APLICADOR"),
    ("Equipos y accesorios", r"VENTILADOR|NANOMISTER|BOMBA DE AIRE|LENTE|GAFA|LUPA|OPTIVISOR|HIGROMETRO|ESTIRILIZADOR|ESTERILIZADOR|LAMPARA|TANQUE|MALETA|ORGANIZADOR|SOPORTE|MANIQU|BANDEJA|MORTERO|POMOS|ESPATULA"),
    ("Cejas y depilación", r"CEJA|HILO|CERA|HENNA|BROW|DEPILA|RASURADOR|NAVAJA"),
    ("Lifting y laminado", r"LIFTING|LIFTIG|LAMINADO|NEICHA|KIT"),
    ("Micropigmentación", r"PIGMENTO|MICROPIGMENT|DERMOGRAF|DEMOGRAF|DERMAPEN|LIPBOOST|AGUJA|CARTUCHO|ANESTES|VITAMINA|COBAN"),
    ("Cuidado y labios", r"SHAMPOO|TRATAMIENTO|COTEL|AGUA DE ROSAS|HIDRA|LIPS|LABIOS|SERUM|CREMA|GEL|ACEITE"),
    ("Desechables", r"GORRO|COFIA|GUANTE|TAPABOCA|TAPA BOCAS|CAMPOS DE MESA|MASCARILLA|DELANTAL|PROTECTOR|CAMILLA|SABANA|DESECHABLE|MICROPORE|PARCHE|ALGODON"),
]
SIGLAS = {"IB", "DW", "DWW", "YY", "AG", "UV", "LED", "3DW", "4DW", "5DW", "6DW",
          "7DW", "8DW", "3D", "PH", "SPA", "HD", "TM"}
MINUSCULAS = {"DE", "Y", "PARA", "CON", "EN", "LA", "EL", "DEL", "LAS", "LOS", "X", "O", "POR"}
UNIDADES = {"ML": "ml", "GR": "g", "G": "g", "MM": "mm", "KG": "kg", "OZ": "oz", "CM": "cm"}


# ----------------------------------------------------------------------
# Utilidades de texto
# ----------------------------------------------------------------------
def a_numero(texto):
    """'$13.000' -> 13000"""
    return int(texto.replace(".", ""))


def embellecer(texto):
    """'LASH MIRADAS SHAMPOO 50 ML' -> 'Lash Miradas Shampoo 50 ml'"""
    texto = re.sub(r"\s+", " ", texto).strip(" -:·")
    texto = re.sub(r"(\d)([A-Za-z])", r"\1 \2", texto)  # '500ML' -> '500 ML'
    palabras = []
    for palabra in texto.split(" "):
        base = palabra.strip("()+,.")
        mayus = base.upper()
        if mayus in SIGLAS:
            nueva = palabra
        elif mayus in UNIDADES:
            nueva = palabra.replace(base, UNIDADES[mayus])
        elif mayus in MINUSCULAS:
            nueva = palabra.lower()
        elif any(c.isdigit() for c in palabra):
            nueva = palabra
        else:
            nueva = palabra.capitalize()
        palabras.append(nueva)
    resultado = " ".join(palabras)
    return resultado[:1].upper() + resultado[1:]


def sugerir_categoria(texto):
    texto = texto.upper()
    for categoria, patron in REGLAS_CATEGORIA:
        if re.search(patron, texto):
            return categoria
    return "Otros"


# ----------------------------------------------------------------------
# Lectura de una página: líneas de texto con posición
# ----------------------------------------------------------------------
def leer_lineas(pagina):
    lineas = []
    for bloque in pagina.get_text("dict")["blocks"]:
        if bloque.get("type") != 0:
            continue
        for linea in bloque["lines"]:
            texto = "".join(s["text"] for s in linea["spans"]).strip()
            if not texto:
                continue
            x0, y0, x1, y1 = linea["bbox"]
            lineas.append({
                "texto": texto, "x0": x0, "y0": y0, "x1": x1, "y1": y1,
                "tam": max(s["size"] for s in linea["spans"]),
                "tipo": clasificar(texto), "usada": False,
            })
    return lineas


def clasificar(texto):
    if "AGOTADO" in texto.upper():
        return "agotado"
    if RE_ESCALA.search(texto):
        return "escala"
    if RE_SOLO_PRECIO.match(texto):
        return "precio"
    if RE_PRECIO.search(texto):
        return "precio_en_linea"
    return "texto"


def misma_columna(a, b):
    solape = min(a["x1"], b["x1"]) - max(a["x0"], b["x0"])
    centros = abs((a["x0"] + a["x1"]) / 2 - (b["x0"] + b["x1"]) / 2)
    return solape > 0 or centros < 120


# ----------------------------------------------------------------------
# Construcción de productos de una página
# ----------------------------------------------------------------------
def nombre_sobre(ancla, lineas):
    """Sube desde el precio juntando las líneas de texto pegadas encima."""
    nombre, actual = [], ancla
    while True:
        candidatas = [
            l for l in lineas
            if l["tipo"] == "texto" and l not in nombre
            and l["y1"] <= actual["y0"] + 6
            and actual["y0"] - l["y1"] < SEPARACION_NOMBRE
            and misma_columna(l, ancla)
            and l["tam"] <= ancla["tam"] * 1.6
        ]
        if not candidatas:
            return nombre
        siguiente = max(candidatas, key=lambda l: l["y1"])
        nombre.insert(0, siguiente)
        actual = siguiente


def productos_de_pagina(pagina, numero):
    lineas = leer_lineas(pagina)
    anclas = [l for l in lineas if l["tipo"] in ("precio", "precio_en_linea")]
    anclas.sort(key=lambda l: (round(l["y0"] / 30), l["x0"]))

    productos = []
    for ancla in anclas:
        m = RE_PRECIO.search(ancla["texto"])
        antes = ancla["texto"][:m.start()].strip(" -:")
        despues = ancla["texto"][m.end():].strip(" -:")
        lineas_nombre = nombre_sobre(ancla, lineas)
        partes = [l["texto"] for l in lineas_nombre] + [p for p in (antes, despues) if p]
        for l in lineas_nombre:
            l["usada"] = True
        ancla["usada"] = True
        productos.append({
            "ancla": ancla, "lineas_nombre": lineas_nombre, "partes": partes,
            "precio": a_numero(m.group(1)), "escalas": [], "agotado": False,
            "descripcion": [],
        })

    # Si un precio no tiene nombre propio (varios precios bajo un mismo título),
    # hereda el nombre del precio de arriba.
    for p in productos:
        if not [l for l in p["lineas_nombre"]]:
            arriba = [q for q in productos if q is not p
                      and q["ancla"]["y1"] <= p["ancla"]["y0"] + 6
                      and p["ancla"]["y0"] - q["ancla"]["y1"] < 60
                      and misma_columna(q["ancla"], p["ancla"]) and q["lineas_nombre"]]
            if arriba:
                base = max(arriba, key=lambda q: q["ancla"]["y1"])
                p["partes"] = [l["texto"] for l in base["lineas_nombre"]] + p["partes"]
                p["lineas_nombre"] = list(base["lineas_nombre"])

    def ancla_mas_cercana_arriba(linea, maximo):
        candidatos = [p for p in productos
                      if p["ancla"]["y1"] <= linea["y0"] + 6
                      and linea["y0"] - p["ancla"]["y1"] < maximo
                      and misma_columna(p["ancla"], linea)]
        return max(candidatos, key=lambda p: p["ancla"]["y1"], default=None)

    for l in lineas:
        if l["tipo"] == "escala":
            p = ancla_mas_cercana_arriba(l, 120)
            if p:
                m = RE_ESCALA.search(l["texto"])
                p["escalas"].append({"minimo": int(m.group(1)), "precio": a_numero(m.group(2))})
                p["ancla"]["y1"] = max(p["ancla"]["y1"], l["y1"])
                l["usada"] = True
        elif l["tipo"] == "agotado":
            p = ancla_mas_cercana_arriba(l, 160)
            if p:
                p["agotado"] = True
                l["usada"] = True

    # Texto libre pegado al lado de un producto = descripción; el resto = título de la página
    sobrantes = [l for l in lineas if l["tipo"] == "texto" and not l["usada"]]
    referencia = sorted(a["tam"] for a in anclas)[len(anclas) // 2] if anclas else 20
    titulo = []
    for l in sobrantes:
        destino = None
        if l["tam"] <= referencia * 1.3:
            for p in productos:
                nombres = p["lineas_nombre"] or [p["ancla"]]
                x1 = max(n["x1"] for n in nombres + [p["ancla"]])
                y0 = min(n["y0"] for n in nombres) - 30
                y1 = p["ancla"]["y1"] + 30
                if l["x0"] >= x1 - 10 and y0 <= (l["y0"] + l["y1"]) / 2 <= y1:
                    destino = p
                    break
        if destino:
            destino["descripcion"].append(l)
        else:
            titulo.append(l)
    titulo.sort(key=lambda l: (l["y0"], l["x0"]))
    titulo_pagina = " ".join(l["texto"] for l in titulo)

    for p in productos:
        p["descripcion"].sort(key=lambda l: (l["y0"], l["x0"]))
        p["descripcion"] = " ".join(l["texto"] for l in p["descripcion"])
        p["titulo_pagina"] = titulo_pagina
    return productos


# ----------------------------------------------------------------------
# Imágenes
# ----------------------------------------------------------------------
def imagenes_candidatas(pagina, paginas_por_xref):
    area_pagina = pagina.rect.width * pagina.rect.height
    resultado = []
    for info in pagina.get_image_info(xrefs=True):
        xref = info["xref"]
        if not xref or paginas_por_xref[xref] > MAX_PAGINAS_DECORACION:
            continue
        visible = fitz.Rect(info["bbox"]) & pagina.rect
        if visible.is_empty or visible.width * visible.height > MAX_AREA_IMAGEN * area_pagina:
            continue
        resultado.append((xref, visible))
    return resultado


def centro_producto(p):
    cajas = [p["ancla"]] + p["lineas_nombre"]
    x = sum((c["x0"] + c["x1"]) / 2 for c in cajas) / len(cajas)
    y = sum((c["y0"] + c["y1"]) / 2 for c in cajas) / len(cajas)
    return x, y


def asignar_imagenes(productos, imagenes):
    """Empareja cada producto con la foto más cercana (sin repetir mientras sea posible)."""
    if not imagenes:
        return
    pares = []
    for i, p in enumerate(productos):
        px, py = centro_producto(p)
        for xref, r in imagenes:
            d = ((px - (r.x0 + r.x1) / 2) ** 2 + (py - (r.y0 + r.y1) / 2) ** 2) ** 0.5
            pares.append((d, i, xref))
    pares.sort()
    usadas, asignado = set(), {}
    for d, i, xref in pares:
        if i not in asignado and xref not in usadas:
            asignado[i] = xref
            usadas.add(xref)
    for d, i, xref in pares:          # los que quedaron sin foto reutilizan la más cercana
        asignado.setdefault(i, xref)
    for i, xref in asignado.items():
        productos[i]["xref"] = xref


def guardar_imagen(doc, xref, destino):
    datos = doc.extract_image(xref)
    imagen = Image.open(BytesIO(datos["image"])).convert("RGBA")
    if datos.get("smask"):
        mascara = Image.open(BytesIO(doc.extract_image(datos["smask"])["image"])).convert("L")
        imagen.putalpha(mascara.resize(imagen.size))
    caja = imagen.getchannel("A").getbbox()      # recorta los márgenes transparentes
    if caja:
        imagen = imagen.crop(caja)
    imagen.thumbnail((MAX_LADO_IMAGEN, MAX_LADO_IMAGEN))
    imagen.save(destino, "WEBP", quality=80, method=4)



# ----------------------------------------------------------------------
# Correcciones manuales (datos que el catálogo trae con errores)
# ----------------------------------------------------------------------
# Se aplican al final, para que si repites la extracción no pierdas el trabajo.
CORRECCIONES_TEXTO = {          # errores de ortografía del catálogo
    "Profecional": "Profesional", "Espojas": "Esponjas", "Demògrafo": "Dermógrafo",
    "Divisón": "División", "Estirilizador": "Esterilizador", "Fexible": "Flexible",
    "Cansta": "Canasta", "Liftig": "Lifting",
}
AJUSTES_POR_ID = {              # id del producto -> campos a sobrescribir
    # El catálogo escribe "$1'100.000" y se leía como $1
    "p163-01": {"nombre": "Camilla Profesional del Color que Deseas (por encargo)", "precio": 1100000},
    # El catálogo muestra un precio "por volumen" MÁS CARO que el normal (error de digitación):
    # se quita la escala hasta confirmar el precio correcto con el proveedor.
    "p047-01": {"preciosPorVolumen": []},
    "p068-01": {"preciosPorVolumen": []},
    "p072-04": {"preciosPorVolumen": []},
    "p172-02": {"preciosPorVolumen": []},
}


def aplicar_correcciones(catalogo):
    for p in catalogo:
        for malo, bueno in CORRECCIONES_TEXTO.items():
            p["nombre"] = p["nombre"].replace(malo, bueno)
        if p["nombre"].count("(") > p["nombre"].count(")"):
            p["nombre"] += ")"                       # paréntesis sin cerrar
        p.update(AJUSTES_POR_ID.get(p["id"], {}))
    return catalogo

# ----------------------------------------------------------------------
# Programa principal
# ----------------------------------------------------------------------
def main(ruta_pdf, carpeta_salida):
    salida = Path(carpeta_salida)
    carpeta_img = salida / "assets" / "img" / "productos"
    carpeta_img.mkdir(parents=True, exist_ok=True)
    (salida / "data").mkdir(parents=True, exist_ok=True)

    doc = fitz.open(ruta_pdf)
    paginas_por_xref = Counter()
    for pagina in doc:
        for xref in {img[0] for img in pagina.get_images()}:
            paginas_por_xref[xref] += 1

    catalogo, guardadas = [], set()
    for indice, pagina in enumerate(doc):
        numero = indice + 1
        productos = productos_de_pagina(pagina, numero)
        if not productos:
            continue
        asignar_imagenes(productos, imagenes_candidatas(pagina, paginas_por_xref))

        for orden, p in enumerate(productos, start=1):
            nombre = embellecer(" ".join(p["partes"])) or f"Producto página {numero}"
            imagen = None
            if p.get("xref"):
                archivo = f"{p['xref']}.webp"
                if p["xref"] not in guardadas and (carpeta_img / archivo).exists() and (carpeta_img / archivo).stat().st_size > 0:
                    guardadas.add(p["xref"])          # ya generada en una corrida anterior
                if p["xref"] not in guardadas:
                    try:
                        guardar_imagen(doc, p["xref"], carpeta_img / archivo)
                        guardadas.add(p["xref"])
                    except Exception as error:                 # imagen rara: se omite
                        print(f"  aviso: imagen {p['xref']} (pág. {numero}): {error}")
                if p["xref"] in guardadas:
                    imagen = f"assets/img/productos/{archivo}"
            catalogo.append({
                "id": f"p{numero:03d}-{orden:02d}",
                "nombre": nombre,
                "descripcion": embellecer(p["descripcion"]) if p["descripcion"] else "",
                "categoria": sugerir_categoria(f"{p['titulo_pagina']} {nombre}"),
                "precio": p["precio"],
                "preciosPorVolumen": sorted(p["escalas"], key=lambda e: e["minimo"]),
                "agotado": p["agotado"],
                "imagen": imagen,
                "pagina": numero,
                "linea": embellecer(p["titulo_pagina"]) if p["titulo_pagina"] else "",
            })
        if len(catalogo) // 25 != (len(catalogo) - len(productos)) // 25:
            print(f"  página {numero}: {len(catalogo)} productos hasta ahora…", flush=True)

    aplicar_correcciones(catalogo)
    ruta_json = salida / "data" / "productos.json"
    ruta_json.write_text(json.dumps(catalogo, ensure_ascii=False, indent=2), encoding="utf-8")

    sin_imagen = sum(1 for p in catalogo if not p["imagen"])
    print(f"\nListo: {len(catalogo)} productos, {len(guardadas)} fotos, {sin_imagen} sin foto.")
    print("Por categoría:", dict(Counter(p["categoria"] for p in catalogo).most_common()))
    print(f"Archivo: {ruta_json}")


if __name__ == "__main__":
    if len(sys.argv) != 3:
        sys.exit("Uso: python extraer_catalogo.py catalogo.pdf carpeta_salida/")
    main(sys.argv[1], sys.argv[2])
