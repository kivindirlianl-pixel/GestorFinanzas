// ==========================================================================
// 📊 GESTOR DE FINANZAS - CORE DE JAVASCRIPT CON FORMATEO EN TIEMPO REAL
// ==========================================================================

// ---------- MODELO DE DATOS Y PERSISTENCIA ----------
let movimientos = []; 
let listaCompras = []; 
let listaHormigas = []; 

let filterActual = 'all';
let filterShopActual = 'all'; 

const KEY_MOVIMIENTOS = 'confiar_movimientos';
const KEY_COMPRAS = 'confiar_compras_v3';
const KEY_HORMIGAS = 'confiar_hormigas';

// --- Registro Automático del Service Worker ---
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(reg => console.log('Service Worker cargado.', reg.scope))
            .catch(err => console.error('Error Service Worker:', err));
    });
}

// --- Soporte de Instalación Nativa Móvil (PWA) ---
let deferredPrompt;
const installBanner = document.getElementById('installBanner');
const btnInstall = document.getElementById('btnInstall');

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    if (installBanner) installBanner.classList.remove('hidden');
});

if (btnInstall) {
    btnInstall.addEventListener('click', async () => {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') console.log('App instalada por el usuario.');
        deferredPrompt = null;
        if (installBanner) installBanner.classList.add('hidden');
    });
}

// --- Formateador de Moneda en Tiempo Real (Pesos Colombianos) ---
function configurarFormatoMonedaEnInput(inputId) {
    const input = document.getElementById(inputId);
    if (!input) return;

    // Pasamos a tipo 'text' para poder insertar los puntos de miles visuales
    input.type = 'text'; 
    input.inputMode = 'numeric'; // Despliega el teclado numérico en teléfonos móviles

    input.addEventListener('input', (e) => {
        // 1. Remover cualquier caracter que no sea un dígito numérico
        let valor = e.target.value.replace(/\D/g, '');
        
        // 2. Si queda vacío por borrar todo, limpiar el input
        if (!valor) {
            e.target.value = '';
            return;
        }

        // 3. Formatear aplicando la configuración regional de Colombia (puntos en miles)
        let valorFormateado = Number(valor).toLocaleString('es-CO');

        // 4. Inyectar el formato en el valor visual de la caja de texto
        e.target.value = valorFormateado;
    });
}

// --- CRUD Presupuesto Mensual ---
function addMovimiento(nombre, monto, tipo) {
    if (!nombre.trim() || isNaN(monto) || monto <= 0) return false;
    movimientos.push({
        id: Date.now() + Math.random(),
        nombre: nombre.trim(),
        monto: parseFloat(monto),
        tipo: tipo,
        fecha: new Date().toISOString()
    });
    saveData();
    return true;
}

function deleteMovimiento(id) {
    movimientos = movimientos.filter(m => m.id != id);
    saveData();
}

// --- CRUD Lista de Compras ---
function addCompra(nombre, sugerido, real) {
    if (!nombre.trim() || isNaN(sugerido) || sugerido <= 0) return false;
    let precioRealInicial = isNaN(real) || real <= 0 ? 0 : parseFloat(real);
    
    listaCompras.push({
        id: Date.now() + Math.random(),
        nombre: nombre.trim(),
        sugerido: parseFloat(sugerido),
        real: precioRealInicial,
        comprado: precioRealInicial > 0 ? true : false
    });
    saveData();
    return true;
}

function toggleComprado(id, status) {
    const compra = listaCompras.find(c => c.id === id);
    if (compra) {
        compra.comprado = status;
        if (!status) {
            compra.real = 0;
        } else if (compra.real === 0) {
            compra.real = compra.sugerido; 
        }
        saveData();
        updateAllUI();
    }
}

// --- CRUD Gastos Hormiga ---
function addHormiga(tag, monto) {
    if (isNaN(monto) || monto <= 0) return false;
    listaHormigas.push({ id: Date.now() + Math.random(), tag: tag, monto: parseFloat(monto) });
    saveData();
    return true;
}

function deleteHormiga(id) {
    listaHormigas = listaHormigas.filter(h => h.id != id);
    saveData();
}

function updatePreciosCompra(id, campo, valor) {
    const compra = listaCompras.find(c => c.id === id);
    if (compra) {
        compra[campo] = isNaN(valor) || valor < 0 ? 0 : parseFloat(valor);
        if (campo === 'real' && compra.real > 0) {
            compra.comprado = true;
        }
        saveData();
        updateTotals(); 
    }
}

function deleteCompra(id) {
    listaCompras = listaCompras.filter(c => c.id != id);
    saveData();
}

// --- Persistencia Local Storage ---
function saveData() {
    localStorage.setItem(KEY_MOVIMIENTOS, JSON.stringify(movimientos));
    localStorage.setItem(KEY_COMPRAS, JSON.stringify(listaCompras));
    localStorage.setItem(KEY_HORMIGAS, JSON.stringify(listaHormigas));
}

function loadData() {
    movimientos = JSON.parse(localStorage.getItem(KEY_MOVIMIENTOS)) || [];
    listaCompras = JSON.parse(localStorage.getItem(KEY_COMPRAS)) || [];
    listaHormigas = JSON.parse(localStorage.getItem(KEY_HORMIGAS)) || [];
}

// --- Renderizadores de Interfaz ---
function renderMovimientos() {
    const container = document.getElementById('listaMovimientosContainer');
    if (!container) return;

    const filtrados = movimientos.filter(m => {
        if (filterActual === 'all') return true;
        if (filterActual === 'ingresos') return m.tipo === 'ingreso';
        if (filterActual === 'fijos') return m.tipo === 'fijo';
        if (filterActual === 'no_frecuentes') return m.tipo === 'no_frecuente';
    });

    if (filtrados.length === 0) {
        container.innerHTML = '<div style="text-align:center; padding:15px; color:var(--text-muted);">Sin registros.</div>';
        return;
    }

    container.innerHTML = '';
    filtrados.forEach(m => {
        const div = document.createElement('div');
        div.className = 'expense-item';
        let badge = m.tipo === 'ingreso' ? '🟢 Ingreso' : (m.tipo === 'fijo' ? '🔴 Fijo' : '🟡 No Frec.');
        div.innerHTML = `
            <div class="item-info">
                <span class="item-name">${escapeHtml(m.nombre)}</span>
                <span class="item-price">$${m.monto.toLocaleString('es-CO')} • <small>${badge}</small></span>
            </div>
            <button class="delete-btn" onclick="eliminarMovimiento(${m.id})">🗑️</button>
        `;
        container.appendChild(div);
    });
}

function renderCompras() {
    const container = document.getElementById('listaComprasContainer');
    if (!container) return;

    const filtrados = listaCompras.filter(c => {
        if (filterShopActual === 'all') return true;
        if (filterShopActual === 'pendientes') return !c.comprado;
        if (filterShopActual === 'comprados') return c.comprado;
    });

    if (filtrados.length === 0) {
        container.innerHTML = `<div style="text-align:center; padding:15px; color:var(--text-muted);">Ningún elemento en este filtro.</div>`;
        return;
    }

    container.innerHTML = '';
    filtrados.forEach(c => {
        const div = document.createElement('div');
        div.className = 'expense-item';
        div.style.borderColor = c.comprado ? 'var(--accent-green)' : 'var(--accent-blue)';
        
        div.innerHTML = `
            <div class="item-left">
                <input type="checkbox" class="check-box-custom" ${c.comprado ? 'checked' : ''} onchange="alternarChulo(${c.id}, this.checked)">
                <div class="item-info" style="flex: 1;">
                    <span class="item-name ${c.comprado ? 'comprado-tached' : ''}">${escapeHtml(c.nombre)}</span>
                    <div style="margin-top:4px; font-size:0.8rem; display:flex; gap:10px; align-items:center;">
                        <span>Sug: $<input type="text" class="input-table" value="${c.sugerido.toLocaleString('es-CO')}" onchange="cambiarPrecio(${c.id}, 'sugerido', this.value)"></span>
                        <span>Real: $<input type="text" class="input-table" value="${c.real ? c.real.toLocaleString('es-CO') : ''}" placeholder="0" onchange="cambiarPrecio(${c.id}, 'real', this.value)"></span>
                    </div>
                </div>
            </div>
            <button class="delete-btn" onclick="eliminarCompra(${c.id})">❌</button>
        `;
        container.appendChild(div);
    });
}

function renderHormigas() {
    const container = document.getElementById('listaHormigasContainer');
    if (!container) return;

    if (listaHormigas.length === 0) {
        container.innerHTML = '<div style="text-align:center; padding:15px; color:var(--text-muted);">Sin fugas de dinero activos.</div>';
        return;
    }
    container.innerHTML = '';
    listaHormigas.forEach(h => {
        const div = document.createElement('div');
        div.className = 'expense-item';
        div.innerHTML = `
            <div class="item-info">
                <span class="item-name" style="font-size:0.9rem;">${h.tag}</span>
                <span class="item-price" style="color:var(--accent-purple);">-$${h.monto.toLocaleString('es-CO')}</span>
            </div>
            <button class="delete-btn" onclick="eliminarHormiga(${h.id})">❌</button>
        `;
        container.appendChild(div);
    });
}

// --- Cálculos Matemáticos Globales ---
function updateTotals() {
    const ingresos = movimientos.filter(m => m.tipo === 'ingreso').reduce((s, m) => s + m.monto, 0);
    const fijos = movimientos.filter(m => m.tipo === 'fijo').reduce((s, m) => s + m.monto, 0);
    const noFrecuentes = movimientos.filter(m => m.tipo === 'no_frecuente').reduce((s, m) => s + m.monto, 0);
    const gastosTotales = fijos + noFrecuentes;
    const balanceGlobal = ingresos - gastosTotales;

    const totalSug = listaCompras.reduce((s, c) => s + c.sugerido, 0);
    const totalRl = listaCompras.filter(c => c.comprado).reduce((s, c) => s + c.real, 0);
    
    const estimadoDeComprados = listaCompras.filter(c => c.comprado).reduce((s, c) => s + c.sugerido, 0);
    const diffTienda = estimadoDeComprados - totalRl;

    const totalHormigas = listaHormigas.reduce((s, h) => s + h.monto, 0);

    // Renderizado seguro en el DOM con formato regional de Colombia
    if(document.getElementById('totalIngresos')) document.getElementById('totalIngresos').innerText = `$${ingresos.toLocaleString('es-CO')}`;
    if(document.getElementById('totalGastos')) document.getElementById('totalGastos').innerText = `$${gastosTotales.toLocaleString('es-CO')}`;
    
    const diffEl = document.getElementById('diferenciaTotal');
    if (diffEl) {
        diffEl.innerText = `$${balanceGlobal.toLocaleString('es-CO')}`;
        diffEl.style.color = balanceGlobal >= 0 ? 'var(--accent-green)' : 'var(--accent-danger)';
    }

    if(document.getElementById('totalSugerido')) document.getElementById('totalSugerido').innerText = `$${totalSug.toLocaleString('es-CO')}`;
    if(document.getElementById('totalReal')) document.getElementById('totalReal').innerText = `$${totalRl.toLocaleString('es-CO')}`;
    
    const diffTiendaEl = document.getElementById('diferenciaTienda');
    if (diffTiendaEl) {
        diffTiendaEl.innerText = `${diffTienda >= 0 ? 'Ahorro: ' : 'Exceso: '}$${Math.abs(diffTienda).toLocaleString('es-CO')}`;
        diffTiendaEl.style.color = diffTienda >= 0 ? 'var(--accent-green)' : '#f97316';
    }

    if(document.getElementById('totalHormiga')) document.getElementById('totalHormiga').innerText = `$${totalHormigas.toLocaleString('es-CO')}`;
}

function updateAllUI() {
    renderMovimientos();
    renderCompras();
    renderHormigas();
    updateTotals();

    document.querySelectorAll('.filter-bar button').forEach(btn => {
        btn.classList.toggle('active-filter', 
            (btn.id === 'filterAll' && filterActual === 'all') ||
            (btn.id === 'filterIngresos' && filterActual === 'ingresos') ||
            (btn.id === 'filterFijos' && filterActual === 'fijos') ||
            (btn.id === 'filterNoFrecuentes' && filterActual === 'no_frecuentes')
        );
    });

    document.querySelectorAll('.filter-bar-shop button').forEach(btn => {
        btn.classList.toggle('active-shop-filter',
            (btn.id === 'shopFilterAll' && filterShopActual === 'all') ||
            (btn.id === 'shopFilterPendientes' && filterShopActual === 'pendientes') ||
            (btn.id === 'shopFilterComprados' && filterShopActual === 'comprados')
        );
    });
}

// --- Puentes de ejecución global vinculados al DOM dinámico ---
window.eliminarMovimiento = id => { deleteMovimiento(id); updateAllUI(); };
window.eliminarCompra = id => { deleteCompra(id); updateAllUI(); };
window.eliminarHormiga = id => { deleteHormiga(id); updateAllUI(); };

window.cambiarPrecio = (id, campo, valor) => { 
    // Limpieza al editar directo desde los inputs de la lista de compras
    const valorLimpio = parseFloat(valor.replace(/\./g, '').replace(/,/g, '')) || 0;
    updatePreciosCompra(id, campo, valorLimpio); 
};

window.alternarChulo = (id, status) => { toggleComprado(id, status); };

// --- Listeners de Formularios con Extracción Desformateada ---
const btnMov = document.getElementById('btnAgregarMovimiento');
if(btnMov) {
    btnMov.addEventListener('click', () => {
        const nom = document.getElementById('movimientoNombre');
        const mon = document.getElementById('movimientoMonto');
        const tip = document.getElementById('movimientoTipo');
        
        // Removemos los puntos visuales antes de convertir a número para el cálculo matemático
        const montoLimpio = mon ? parseFloat(mon.value.replace(/\./g, '')) : 0;

        if (nom && mon && tip && addMovimiento(nom.value, montoLimpio, tip.value)) {
            nom.value = '';
            mon.value = '';
            updateAllUI();
        }
    });
}

const btnComp = document.getElementById('btnAgregarCompra');
if(btnComp) {
    btnComp.addEventListener('click', () => {
        const nom = document.getElementById('compraNombre');
        const sug = document.getElementById('compraSugerido');
        const rea = document.getElementById('compraReal');
        
        // Removemos los puntos visuales antes de convertir a número
        const sugLimpio = sug ? parseFloat(sug.value.replace(/\./g, '')) : 0;
        const reaLimpio = rea ? parseFloat(rea.value.replace(/\./g, '')) : 0;

        if (nom && sug && rea && addCompra(nom.value, sugLimpio, reaLimpio)) {
            nom.value = '';
            sug.value = '';
            rea.value = '';
            updateAllUI();
        }
    });
}

const btnHorm = document.getElementById('btnAgregarHormiga');
if(btnHorm) {
    btnHorm.addEventListener('click', () => {
        const tip = document.getElementById('hormigaTipo');
        const mon = document.getElementById('hormigaMonto');
        
        // Removemos los puntos visuales antes de convertir a número
        const montoLimpio = mon ? parseFloat(mon.value.replace(/\./g, '')) : 0;

        if (tip && mon && addHormiga(tip.value, montoLimpio)) {
            mon.value = '';
            updateAllUI();
        }
    });
}

const btnVaciar = document.getElementById('vaciarCompras');
if(btnVaciar) {
    btnVaciar.addEventListener('click', () => {
        if (confirm("¿Deseas vaciar por completo la lista?")) {
            listaCompras = [];
            saveData();
            updateAllUI();
        }
    });
}

// Eventos de Filtros y Navegación
if(document.getElementById('filterAll')) document.getElementById('filterAll').addEventListener('click', () => { filterActual = 'all'; updateAllUI(); });
if(document.getElementById('filterIngresos')) document.getElementById('filterIngresos').addEventListener('click', () => { filterActual = 'ingresos'; updateAllUI(); });
if(document.getElementById('filterFijos')) document.getElementById('filterFijos').addEventListener('click', () => { filterActual = 'fijos'; updateAllUI(); });
if(document.getElementById('filterNoFrecuentes')) document.getElementById('filterNoFrecuentes').addEventListener('click', () => { filterActual = 'no_frecuentes'; updateAllUI(); });

if(document.getElementById('shopFilterAll')) document.getElementById('shopFilterAll').addEventListener('click', () => { filterShopActual = 'all'; updateAllUI(); });
if(document.getElementById('shopFilterPendientes')) document.getElementById('shopFilterPendientes').addEventListener('click', () => { filterShopActual = 'pendientes'; updateAllUI(); });
if(document.getElementById('shopFilterComprados')) document.getElementById('shopFilterComprados').addEventListener('click', () => { filterShopActual = 'comprados'; updateAllUI(); });

function escapeHtml(str) {
    return str.replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));
}

// ---------- INICIALIZACIÓN DE LA APP ----------
loadData();
updateAllUI();

// Inicializar el formateador automático con puntos en tiempo real para la moneda de Colombia
configurarFormatoMonedaEnInput('movimientoMonto');
configurarFormatoMonedaEnInput('compraSugerido');
configurarFormatoMonedaEnInput('compraReal');
configurarFormatoMonedaEnInput('hormigaMonto');