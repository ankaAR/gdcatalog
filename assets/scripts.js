// Almacén de datos
const datos = {
    libros: [],
    cursos: [],
    sitios: []
};

// Función para mostrar mensajes de estado
function mostrarEstado(mensaje, tipo) {
    const statusDiv = document.getElementById('status');
    statusDiv.textContent = mensaje;
    statusDiv.className = `status ${tipo}`;
    
    // Ocultar después de 5 segundos si es un éxito
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
        mostrarEstado(`Datos de ${categoria} cargados correctamente`, 'success');
    } catch (error) {
        console.error(`Error cargando ${categoria}:`, error);
        mostrarEstado(`Error al cargar ${categoria}: ${error.message}`, 'error');
        contenedor.innerHTML = '<p>No se pudieron cargar los datos. Verifica la ruta del archivo.</p>';
        datos[categoria] = [];
    }
}

// Función para mostrar los elementos en la interfaz
function mostrarElementos(categoria, elementos) {
    const contenedor = document.querySelector(`#${categoria} .items-container`);
    contenedor.innerHTML = '';
    
    if (elementos.length === 0) {
        contenedor.innerHTML = '<p>No hay elementos para mostrar.</p>';
        return;
    }
    
    elementos.forEach(elemento => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'item';

        // Crear HTML para cada propiedad
        let contenido = '';

        // Mostrar portada si existe
        if (elemento.cover) {
            contenido += `<div class="item-cover"><img src="${elemento.cover}" alt="${elemento.titulo}" /></div>`;
        }

        contenido += '<div class="item-details">';
        for (const [clave, valor] of Object.entries(elemento)) {
            if (clave === 'cover') continue; // Omitir la propiedad 'cover' en los detalles
            if (Array.isArray(valor)) {
                contenido += `<div class="item-property"><span>${clave}:</span> ${valor.join(', ')}</div>`;
            } else if (typeof valor === 'boolean') {
                contenido += `<div class="item-property"><span>${clave}:</span> ${valor ? 'Sí' : 'No'}</div>`;
            } else {
                contenido += `<div class="item-property"><span>${clave}:</span> ${valor}</div>`;
            }
        }
        contenido += '</div>';

        itemDiv.innerHTML = contenido;
        contenedor.appendChild(itemDiv);
    });
}

// Función para generar la nube de etiquetas
function generarNubeDeEtiquetas() {
    const tagsContainer = document.getElementById('tags-container');
    tagsContainer.innerHTML = '';

    // Obtener la categoría activa
    const categoriaActiva = document.querySelector('.tab.active').getAttribute('data-target');
    const elementos = datos[categoriaActiva] || [];

    // Extraer etiquetas de la categoría activa
    const todasLasEtiquetas = elementos.flatMap(item => item.tags || []);
    
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
        sitios: "data/sitios.yml"
    };

    Object.keys(rutas).forEach(categoria => {
        cargarYAML(categoria, rutas[categoria]);
    });

    // Generar la nube de etiquetas después de cargar los datos
    setTimeout(generarNubeDeEtiquetas, 1000); // Esperar a que los datos se carguen
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
    
    const elementosFiltrados = datos[categoriaActiva].filter(elemento => {
        return Object.values(elemento).some(valor => {
            if (typeof valor === 'string') {
                return valor.toLowerCase().includes(termino);
            } else if (Array.isArray(valor)) {
                return valor.some(v => String(v).toLowerCase().includes(termino));
            }
            return String(valor).toLowerCase().includes(termino);
        });
    });
    
    mostrarElementos(categoriaActiva, elementosFiltrados);
});