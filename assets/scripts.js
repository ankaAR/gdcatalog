// Almacén de datos
const datos = {
    libros: [],
    cursos: [],
    sitios: [],
    podcasts: [],
    videochannels: []
};

// Función para mostrar mensajes de estado
// Ocultar después de 5 segundos si es un éxito
function mostrarEstado(mensaje, tipo) {
    const statusDiv = document.getElementById('status');
    statusDiv.textContent = mensaje;
    statusDiv.className = `status ${tipo}`;
    
    if (tipo === 'success') {
        setTimeout(() => {
            statusDiv.textContent = '';
            statusDiv.className = '';
        }, 5000);
    }
}

// Función para cargar un archivo YAML
async function cargarYAML(categoria, ruta) {
    const contenedor = document.querySelector(`#${categoria} .items-container`);
    contenedor.innerHTML = '<div class="loading">Cargando datos...</div>';
    
    try {
        const respuesta = await fetch(ruta);
        
        if (!respuesta.ok) {
            throw new Error(`Error al cargar ${ruta}: ${respuesta.status}`);
        }
        
        const texto = await respuesta.text();
        const datosYAML = jsyaml.load(texto);
        
        // Guardar datos
        datos[categoria] = Array.isArray(datosYAML) ? datosYAML : [];
        
        // Mostrar elementos
        mostrarElementos(categoria, datos[categoria]);
        mostrarEstado(`Datos cargados correctamente`, 'success');
    } catch (error) {
        console.error(`Error cargando ${categoria}:`, error);
        mostrarEstado(`Error al cargar ${categoria}: ${error.message}`, 'error');
        contenedor.innerHTML = '<p>No se pudieron cargar los datos. Verifica la ruta del archivo.</p>';
        datos[categoria] = [];
    }
}

// Función para actualizar el conteo de libros
function actualizarConteoLibros(categoria, total, filtrados) {
    if (categoria === 'libros') {
        const header = document.querySelector(`#${categoria} h2`);
        if (header) {
            header.textContent = `Libros (mostrando ${filtrados} de ${total})`;
        }
    }
}

// Función para encontrar la portada dinámicamente
async function obtenerRutaDeCover(isbn) {
    const extensiones = ['jpeg', 'jpg', 'png', 'webp'];
    const basePath = 'assets/images/book_covers/';
    
    for (const ext of extensiones) {
        const ruta = `${basePath}${isbn}.${ext}`;
        try {
            const respuesta = await fetch(ruta, { method: 'HEAD' });
            if (respuesta.ok) {
                return ruta;
            }
        } catch (error) {
            console.warn(`No se encontró portada: ${ruta}`);
        }
    }
    return null; // No se encontró ninguna imagen
}

// Función para mostrar los elementos en la interfaz
async function mostrarElementos(categoria, elementos) {
    const contenedor = document.querySelector(`#${categoria} .items-container`);
    contenedor.innerHTML = '';
    
    if (elementos.length === 0) {
        contenedor.innerHTML = '<p>No hay elementos para mostrar.</p>';
        actualizarConteoLibros(categoria, datos[categoria].length, 0);
        return;
    }

    actualizarConteoLibros(categoria, datos[categoria].length, elementos.length);

    for (const elemento of elementos) {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'item';

        // Crear HTML para cada propiedad
        let contenido = '';

        // Mostrar portada solo para libros, buscar dinámicamente si cover es true
        if (categoria === 'libros') {
            if (elemento.cover === true && elemento['isbn-13']) {
                const rutaCover = await obtenerRutaDeCover(elemento['isbn-13']);
                if (rutaCover) {
                    contenido += `<div class="item-cover"><img src="${rutaCover}" alt="${elemento.titulo}" /></div>`;
                } else {
                    contenido += `<div class="item-cover no-cover">No Cover</div>`;
                }
            } else {
                contenido += `<div class="item-cover no-cover">No Cover</div>`;
            }
        }

        contenido += '<div class="item-details">';
        for (const [clave, valor] of Object.entries(elemento)) {
            if (clave === 'cover') continue; // Omitir la propiedad 'cover' en los detalles

            // Capitalizar la clave
            const claveCapitalizada = clave.charAt(0).toUpperCase() + clave.slice(1);

            if (Array.isArray(valor)) {
                if (clave === 'url') {
                    // Renderizar URLs como enlaces clickeables
                    contenido += `<div class="item-property"><span>${claveCapitalizada}:</span> ${valor.map(url => `<a href="${url}" target="_blank">${url}</a>`).join(', ')}</div>`;
                } else {
                    contenido += `<div class="item-property"><span>${claveCapitalizada}:</span> ${valor.join(', ')}</div>`;
                }
            } else if (typeof valor === 'boolean') {
                contenido += `<div class="item-property"><span>${claveCapitalizada}:</span> ${valor ? 'Sí' : 'No'}</div>`;
            } else if (clave === 'url') {
                // Renderizar una sola URL como enlace clickeable
                contenido += `<div class="item-property"><span>${claveCapitalizada}:</span> <a href="${valor}" target="_blank">${valor}</a></div>`;
            } else {
                // Mostrar "Sin datos" si el valor es null, undefined o vacío
                contenido += `<div class="item-property"><span>${claveCapitalizada}:</span> ${valor || 'Sin datos'}</div>`;
            }
        }
        contenido += '</div>';

        itemDiv.innerHTML = contenido;
        contenedor.appendChild(itemDiv);
    }
}

// Función para generar la nube de etiquetas
function generarNubeDeEtiquetas() {
    const tagsContainer = document.getElementById('tags-container');
    tagsContainer.innerHTML = '';

    // Obtener la categoría activa
    const categoriaActiva = document.querySelector('.tab.active').getAttribute('data-target');
    const elementos = datos[categoriaActiva] || [];

    // Extraer etiquetas o temas según la categoría activa
    const todasLasEtiquetas = elementos.flatMap(item => {
        if (categoriaActiva === 'cursos') {
            return item.temas || []; // Usar 'temas' como etiquetas para cursos
        } else if (categoriaActiva === 'podcasts' || categoriaActiva === 'videochannels') {
            return item.tags || []; // Usar 'tags' para podcasts y videochannels
        }
        return item.tags || []; // Usar 'tags' para otras categorías
    }).filter(etiqueta => etiqueta); // Ignorar etiquetas nulas o vacías

    const conteoEtiquetas = todasLasEtiquetas.reduce((conteo, etiqueta) => {
        conteo[etiqueta] = (conteo[etiqueta] || 0) + 1;
        return conteo;
    }, {});

    if (Object.keys(conteoEtiquetas).length === 0) {
        tagsContainer.innerHTML = '<p>No hay etiquetas disponibles.</p>';
        return;
    }

    Object.entries(conteoEtiquetas).forEach(([etiqueta, conteo]) => {
        const tagElement = document.createElement('span');
        tagElement.className = 'tag';
        tagElement.textContent = `${etiqueta} (${conteo})`;
        tagElement.addEventListener('click', () => {
            document.querySelector('.search').value = etiqueta;
            document.querySelector('.search').dispatchEvent(new Event('input'));
        });
        tagsContainer.appendChild(tagElement);
    });
}

// Asegurarse de cargar los datos al inicio
window.addEventListener('DOMContentLoaded', () => {
    const rutas = {
        libros: "data/libros.yml",
        cursos: "data/cursos.yml",
        sitios: "data/sitios.yml",
        podcasts: "data/podcasts.yml", // vamos a ver si esto funciona
        videochannels: "data/videochannels.yml" // al menos tengo el lugar donde ponerlo
    };

    Object.keys(rutas).forEach(categoria => {
        cargarYAML(categoria, rutas[categoria]);
    });

    // Generar la nube de etiquetas después de cargar los datos
    setTimeout(generarNubeDeEtiquetas, 1000); // un tiempo para la carga de datos
});

// Manejar cambios de pestaña
document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
        // Cambiar pestaña activa
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        
        // Mostrar contenido correspondiente
        const target = tab.getAttribute('data-target');
        document.querySelectorAll('.content').forEach(c => c.classList.remove('active'));
        document.getElementById(target).classList.add('active');

        // Regenerar la nube de etiquetas para la nueva categoría activa
        generarNubeDeEtiquetas();
    });
});

// Función de búsqueda
document.querySelector('.search').addEventListener('input', function(e) {
    const termino = e.target.value.toLowerCase();
    const categoriaActiva = document.querySelector('.tab.active').getAttribute('data-target');
    
    const elementos = datos[categoriaActiva];
    const contenedor = document.querySelector(`#${categoriaActiva} .items-container`);
    
    let visibleCount = 0; // Recuento de elementos visibles

    elementos.forEach((elemento, index) => {
        const itemDiv = contenedor.children[index];
        const coincide = Object.entries(elemento).some(([clave, valor]) => {
            if (typeof valor === 'string') {
                return valor.toLowerCase().includes(termino);
            } else if (Array.isArray(valor)) {
                return valor.some(v => String(v).toLowerCase().includes(termino));
            } else if (valor && typeof valor === 'object') {
                return Object.values(valor).some(v => String(v).toLowerCase().includes(termino));
            }
            return String(valor).toLowerCase().includes(termino);
        });
        if (coincide) {
            itemDiv.classList.remove('hidden');
            itemDiv.style.display = 'flex'; // Asegurarse de que se muestre correctamente
            visibleCount++;
        } else {
            itemDiv.classList.add('hidden');
            itemDiv.style.display = 'none'; // Ocultar el elemento que no coincide
        }
    });

    // Actualizar el conteo de libros después de filtrar
    actualizarConteoLibros(categoriaActiva, elementos.length, visibleCount);
});

// Función para alternar el modo oscuro/claro
document.getElementById('dark-mode-toggle').addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
    const toggleButton = document.getElementById('dark-mode-toggle');
    toggleButton.textContent = document.body.classList.contains('dark-mode') ? 'Modo Claro' : 'Modo Oscuro';
});