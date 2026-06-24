// ========== VARIABLES GLOBALES (ESTADO LOCAL) ==========
let perfilUsuario = null; 
let ingresos = [];        
let gastos = [];          
let mercado = [];         

// Llaves de almacenamiento local (localStorage)
const STORAGE_PERFIL = "finanzas_perfil";
const STORAGE_INGRESOS = "finanzas_ingresos";
const STORAGE_GASTOS = "finanzas_gastos";
const STORAGE_MERCADO = "finanzas_mercado";

// Cargar información guardada
function cargarDatos() {
    const perf = localStorage.getItem(STORAGE_PERFIL);
    if (perf) perfilUsuario = JSON.parse(perf);
    
    const ing = localStorage.getItem(STORAGE_INGRESOS);
    if (ing) ingresos = JSON.parse(ing);
    
    const gast = localStorage.getItem(STORAGE_GASTOS);
    if (gast) gastos = JSON.parse(gast);
    
    const merc = localStorage.getItem(STORAGE_MERCADO);
    if (merc) mercado = JSON.parse(merc);
}

// Persistir en el navegador
function guardarEnStorage() {
    localStorage.setItem(STORAGE_PERFIL, JSON.stringify(perfilUsuario));
    localStorage.setItem(STORAGE_INGRESOS, JSON.stringify(ingresos));
    localStorage.setItem(STORAGE_GASTOS, JSON.stringify(gastos));
    localStorage.setItem(STORAGE_MERCADO, JSON.stringify(mercado));
}

// ========== LOGICA Y CALCULOS ==========
function registrarIngreso(categoria, monto) {
    if (monto <= 0 || isNaN(monto)) return false;
    ingresos.push({ id: Date.now(), categoria, monto: parseFloat(monto) });
    guardarEnStorage();
    return true;
}

function registrarGasto(concepto, monto, categoria) {
    if (!concepto.trim() || monto <= 0 || isNaN(monto)) return false;
    gastos.push({ id: Date.now(), concepto: concepto.trim(), monto: parseFloat(monto), categoria });
    guardarEnStorage();
    return true;
}

function agregarItemMercado(nombre, precio) {
    if (!nombre.trim() || precio <= 0 || isNaN(precio)) return false;
    mercado.push({ id: Date.now(), nombre: nombre.trim(), precio: parseFloat(precio) });
    guardarEnStorage();
    return true;
}

// ========== ACTUALIZACIÓN COMPLETA DE LA INTERFAZ ==========
function renderizarUI() {
    const modal = document.getElementById("modalOnboarding");
    if (!perfilUsuario) {
        modal.classList.remove("hidden");
        return;
    } else {
        modal.classList.add("hidden");
        document.getElementById("saludoUsuario").innerText = `📊 Finanzas de ${perfilUsuario.nombre}`;
        document.getElementById("badgePeriodo").innerText = `Periodo: ${perfilUsuario.periodo.toUpperCase()}`;
        document.querySelectorAll(".txt-periodo").forEach(el => el.innerText = perfilUsuario.periodo === 'mensual' ? 'Mensual' : 'Quincenal');
    }

    // 1. Automatización: Suma directa de la Lista de Mercado
    const totalMercado = mercado.reduce((sum, item) => sum + item.precio, 0);
    document.getElementById("val-Alimentacion").innerText = `$${totalMercado.toFixed(2)}`;

    // 2. Operar totales de Ingresos y Egresos
    const totalIngresos = ingresos.reduce((sum, i) => sum + i.monto, 0);
    
    const categoriasFijas = ["Arriendo", "Servicios públicos", "Transporte", "Educación", "Pago de deudas", "Cuota ahorro", "Mascota", "Otros Fijos"];
    const categoriasNoFrecuentes = ["Visitas médicas", "Impuestos", "Salidas familiares", "Deporte", "Otros No Frecuentes"];

    let totalFijos = totalMercado; 
    let totalNoFrecuentes = 0;

    categoriasFijas.forEach(cat => {
        const totalCat = gastos.filter(g => g.categoria === cat).reduce((sum, g) => sum + g.monto, 0);
        totalFijos += totalCat;
        const idVisual = cat.replace(" públicos", "").replace(" de deudas", "").replace(" ahorro", "").replace("Otros Fijos", "OtrosFijos");
        const el = document.getElementById(`val-${idVisual}`);
        if (el) el.innerText = `$${totalCat.toFixed(2)}`;
    });

    categoriasNoFrecuentes.forEach(cat => {
        const totalCat = gastos.filter(g => g.categoria === cat).reduce((sum, g) => sum + g.monto, 0);
        totalNoFrecuentes += totalCat;
        const idVisual = cat.replace("Visitas médicas", "Medicas").replace("Otros No Frecuentes", "OtrosNoFrecuentes");
        const el = document.getElementById(`val-${idVisual}`);
        if (el) el.innerText = `$${totalCat.toFixed(2)}`;
    });

    // Pintar bloques informativos del balance
    document.getElementById("txtTotalIngresos").innerText = `$${totalIngresos.toFixed(2)}`;
    document.getElementById("txtTotalFijos").innerText = `$${totalFijos.toFixed(2)}`;
    document.getElementById("txtTotalNoFrecuentes").innerText = `$${totalNoFrecuentes.toFixed(2)}`;
    
    const balanceNeto = totalIngresos - (totalFijos + totalNoFrecuentes);
    const elBalance = document.getElementById("txtBalanceNeto");
    elBalance.innerText = `$${balanceNeto.toFixed(2)}`;
    elBalance.style.color = balanceNeto >= 0 ? "#27ae60" : "#e74c3c";

    // Desglose dinámico de ingresos individuales
    const contenedorIngresos = document.getElementById("listaIngresosDetalle");
    contenedorIngresos.innerHTML = ingresos.length === 0 ? "<p class='table-row-item' style='color:#aaa;'>Sin ingresos anotados</p>" : "";
    ingresos.forEach(ing => {
        const div = document.createElement("div");
        div.className = "table-row-item";
        div.innerHTML = `<span>• ${ing.categoria}</span> <span>$${ing.monto.toFixed(2)} <button onclick="eliminarIngreso(${ing.id})" style="background:none; color:#e74c3c; border:none; cursor:pointer;">❌</button></span>`;
        contenedorIngresos.appendChild(div);
    });

    renderizarMercado();
    renderizarHistorialGastos();
}

function renderizarMercado() {
    const container = document.getElementById("listaMercadoContainer");
    container.innerHTML = mercado.length === 0 ? "<p style='grid-column: 1/-1; text-align:center; color:#aaa; padding:20px;'>La lista está vacía.</p>" : "";
    mercado.forEach(item => {
        const div = document.createElement("div");
        div.className = "producto-card";
        div.innerHTML = `
            <div class="producto-nombre">${escapeHtml(item.nombre)}</div>
            <div class="producto-precio">$${item.precio.toFixed(2)}</div>
            <div class="acciones-rapidas">
                <button onclick="eliminarItemMercado(${item.id})" style="background:#e74c3c; width:100%">🗑️ Eliminar</button>
            </div>
        `;
        container.appendChild(div);
    });
}

function renderizarHistorialGastos() {
    const container = document.getElementById("listaGastosContainer");
    container.innerHTML = gastos.length === 0 ? "<p style='text-align:center; color:#aaa; padding:10px;'>No hay egresos adicionales registrados</p>" : "";
    gastos.slice().reverse().forEach(g => {
        const div = document.createElement("div");
        div.className = "gasto-item";
        div.innerHTML = `
            <div><strong>${escapeHtml(g.concepto)}</strong> - $${g.monto.toFixed(2)} (<small>${g.categoria}</small>)</div>
            <button onclick="eliminarGasto(${g.id})" style="background:#e74c3c; padding:3px 7px; border-radius:4px;">✖️</button>
        `;
        container.appendChild(div);
    });
}

// ========== ACCIONES DE ELIMINACIÓN ==========
window.eliminarIngreso = function(id) { ingresos = ingresos.filter(i => i.id !== id); guardarEnStorage(); renderizarUI(); };
window.eliminarGasto = function(id) { gastos = gastos.filter(g => g.id !== id); guardarEnStorage(); renderizarUI(); };
window.eliminarItemMercado = function(id) { mercado = mercado.filter(m => m.id !== id); guardarEnStorage(); renderizarUI(); };
function escapeHtml(str) { return String(str).replace(/[&<>]/g, m => ({'&': '&amp;', '<': '&lt;', '>': '&gt;'}[m] || m)); }

// ========== CONTROLADORES DE EVENTOS Y PESTAÑAS ==========
function cambiarPestana(tabId) {
    document.querySelectorAll('.tab-content').forEach(t => t.style.display = 'none');
    document.getElementById(`tab-${tabId}`).style.display = 'block';
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tabId));
}

document.addEventListener("DOMContentLoaded", () => {
    cargarDatos();

    // Evento Guardar Perfil
    document.getElementById("btnGuardarPerfil").addEventListener("click", () => {
        const nombre = document.getElementById("userNombre").value;
        const telefono = document.getElementById("userTelefono").value;
        const periodo = document.getElementById("userPeriodo").value;
        if (!nombre.trim() || !telefono.trim()) { alert("Por favor rellene los campos."); return; }
        perfilUsuario = { nombre: nombre.trim(), telefono: telefono.trim(), periodo };
        guardarEnStorage();
        renderizarUI();
    });

    // Evento Registrar Ingreso
    document.getElementById("btnRegistrarIngreso").addEventListener("click", () => {
        const cat = document.getElementById("ingresoCategoria").value;
        const input = document.getElementById("ingresoMonto");
        if (registrarIngreso(cat, input.value)) { input.value = ""; renderizarUI(); }
    });

    // Evento Añadir Mercado
    document.getElementById("btnAgregarMercado").addEventListener("click", () => {
        const nom = document.getElementById("itemMercadoNombre");
        const pre = document.getElementById("itemMercadoPrecio");
        if (agregarItemMercado(nom.value, pre.value)) { nom.value = ""; pre.value = ""; renderizarUI(); }
    });

    // Evento Registrar Gasto Manual
    document.getElementById("btnAgregarGasto").addEventListener("click", () => {
        const con = document.getElementById("gastoConcepto");
        const mon = document.getElementById("gastoMonto");
        const cat = document.getElementById("gastoCategoria").value;
        if (registrarGasto(con.value, mon.value, cat)) { con.value = ""; mon.value = ""; renderizarUI(); }
    });

    // Configurar Botones de Pestañas
    document.querySelectorAll(".tab-btn").forEach(btn => {
        btn.addEventListener("click", () => cambiarPestana(btn.dataset.tab));
    });

    // Exportación básica a CSV
    document.getElementById("btnExportarDatos").addEventListener("click", () => {
        let csv = "Tipo,Concepto/Categoria,Monto\n";
        ingresos.forEach(i => csv += `Ingreso,${i.categoria},${i.monto}\n`);
        mercado.forEach(m => csv += `Mercado,${m.nombre},${m.precio}\n`);
        gastos.forEach(g => csv += `Gasto,${g.concepto} (${g.categoria}),${g.monto}\n`);
        
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.setAttribute("download", `Balance_Finanzas_${perfilUsuario ? perfilUsuario.nombre : 'Usuario'}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });

    // Botón de Reinicio Absoluto
    document.getElementById("btnResetDemo").addEventListener("click", () => {
        if (confirm("🚨 ¿Deseas borrar de forma permanente tu perfil y todos tus registros económicos financieros?")) {
            localStorage.clear(); location.reload();
        }
    });

    renderizarUI();
});

// ========== CONTROLADOR ALERTA DE INSTALACIÓN PWA ==========
let eventoInstalacionPWA;
const bannerInstalacion = document.getElementById('alertaInstalacion');
const btnInstalar = document.getElementById('btnInstalarApp');
const btnCerrarBanner = document.getElementById('btnCerrarAlertaPWA');

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    eventoInstalacionPWA = e;
    if (bannerInstalacion) bannerInstalacion.classList.remove('hidden');
});

if (btnInstalar) {
    btnInstalar.addEventListener('click', async () => {
        if (!eventoInstalacionPWA) return;
        eventoInstalacionPWA.prompt();
        const { outcome } = await eventoInstalacionPWA.userChoice;
        console.log(`Elección de instalación: ${outcome}`);
        eventoInstalacionPWA = null;
        bannerInstalacion.classList.add('hidden');
    });
}

if (btnCerrarBanner) {
    btnCerrarBanner.addEventListener('click', () => {
        bannerInstalacion.classList.add('hidden');
    });
}

// Registro automático del Service Worker apuntando a la raíz
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(reg => console.log('Service Worker cargado con éxito', reg))
            .catch(err => console.log('Error de Service Worker', err));
    });
}