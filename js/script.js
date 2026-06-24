// ========== VARIABLES GLOBALES (ESTADO LOCAL) ==========
let perfilUsuario = null; // { nombre, telefono, periodo, salarioBase }
let ingresos = [];        
let gastos = [];          
let mercado = [];         
let facturas = [];        // { id, nombre, monto, diaVencimiento, pagado }

// Llaves de almacenamiento local (localStorage)
const STORAGE_PERFIL = "finanzas_perfil_cop";
const STORAGE_INGRESOS = "finanzas_ingresos_cop";
const STORAGE_GASTOS = "finanzas_gastos_cop";
const STORAGE_MERCADO = "finanzas_mercado_cop";
const STORAGE_FACTURAS = "finanzas_facturas_cop";

// Formateador de Moneda de Colombia ($ 1.250.000)
function formatoCOP(valor) {
    if(isNaN(valor)) valor = 0;
    return "$ " + Math.round(valor).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

function cargarDatos() {
    const perf = localStorage.getItem(STORAGE_PERFIL);
    if (perf) perfilUsuario = JSON.parse(perf);
    
    const ing = localStorage.getItem(STORAGE_INGRESOS);
    if (ing) ingresos = JSON.parse(ing);
    
    const gast = localStorage.getItem(STORAGE_GASTOS);
    if (gast) gastos = JSON.parse(gast);
    
    const merc = localStorage.getItem(STORAGE_MERCADO);
    if (merc) mercado = JSON.parse(merc);

    const fact = localStorage.getItem(STORAGE_FACTURAS);
    if (fact) factures = JSON.parse(fact); // Parche de seguridad
    facturas = fact ? JSON.parse(fact) : [];
}

function guardarEnStorage() {
    localStorage.setItem(STORAGE_PERFIL, JSON.stringify(perfilUsuario));
    localStorage.setItem(STORAGE_INGRESOS, JSON.stringify(ingresos));
    localStorage.setItem(STORAGE_GASTOS, JSON.stringify(gastos));
    localStorage.setItem(STORAGE_MERCADO, JSON.stringify(mercado));
    localStorage.setItem(STORAGE_FACTURAS, JSON.stringify(facturas));
}

// ========== OPERACIONES BASE ==========
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

function agregarFacturaRecurrente(nombre, monto, dia) {
    if (!nombre.trim() || monto <= 0 || isNaN(monto) || dia < 1 || dia > 31) return false;
    facturas.push({ id: Date.now(), nombre: nombre.trim(), monto: parseFloat(monto), diaVencimiento: parseInt(dia), pagado: false });
    guardarEnStorage();
    return true;
}

// ========== ACTUALIZACIÓN DE INTERFAZ ==========
function renderizarUI() {
    const modal = document.getElementById("modalOnboarding");
    if (!perfilUsuario) {
        modal.classList.remove("hidden");
        return;
    } else {
        modal.classList.add("hidden");
        document.getElementById("saludoUsuario").innerText = `📊 Finanzas de ${perfilUsuario.nombre}`;
        document.getElementById("txtDatosContacto").innerText = `📞 Tel: ${perfilUsuario.telefono} | Ciclo: ${perfilUsuario.periodo.toUpperCase()}`;
        document.getElementById("badgePeriodo").innerText = `COP - ${perfilUsuario.periodo.toUpperCase()}`;
        document.querySelectorAll(".txt-periodo").forEach(el => el.innerText = perfilUsuario.periodo === 'mensual' ? 'Mensual' : 'Quincenal');
    }

    // 1. Salario Base e Ingresos
    const salarioBase = perfilUsuario.salarioBase || 0;
    document.getElementById("val-SalarioBase").innerText = formatoCOP(salarioBase);
    const totalExtras = ingresos.reduce((sum, i) => sum + i.monto, 0);
    const totalIngresos = salarioBase + totalExtras;
    document.getElementById("txtTotalIngresos").innerText = formatoCOP(totalIngresos);

    // 2. Mercado Autónomo
    const totalMercado = mercado.reduce((sum, item) => sum + item.precio, 0);
    document.getElementById("val-Alimentacion").innerText = formatoCOP(totalMercado);

    // 3. Facturas Concurrentes totales (Hayan sido pagadas o no se calculan en base a la proyección fija)
    const totalFacturasFijas = facturas.reduce((sum, f) => sum + f.monto, 0);
    document.getElementById("val-FacturasConcurrentes").innerText = formatoCOP(totalFacturasFijas);

    // 4. Agrupamiento de Gastos Generales
    const categoriasFijas = ["Arriendo", "Servicios públicos", "Transporte", "Educación", "Cuota ahorro", "Mascota", "Otros Fijos"];
    const categoriasNoFrecuentes = ["Visitas médicas", "Impuestos", "Salidas familiares", "Deporte", "Otros No Frecuentes"];

    let totalFijos = totalMercado + totalFacturasFijas; 
    let totalNoFrecuentes = 0;

    categoriasFijas.forEach(cat => {
        const totalCat = gastos.filter(g => g.categoria === cat).reduce((sum, g) => sum + g.monto, 0);
        totalFijos += totalCat;
        const idVisual = cat.replace(" públicos", "").replace("Otros Fijos", "OtrosFijos");
        const el = document.getElementById(`val-${idVisual}`);
        if (el) el.innerText = formatoCOP(totalCat);
    });

    categoriasNoFrecuentes.forEach(cat => {
        const totalCat = gastos.filter(g => g.categoria === cat).reduce((sum, g) => sum + g.monto, 0);
        totalNoFrecuentes += totalCat;
        const idVisual = cat.replace("Visitas médicas", "Medicas").replace("Otros No Frecuentes", "OtrosNoFrecuentes");
        const el = document.getElementById(`val-${idVisual}`);
        if (el) el.innerText = formatoCOP(totalCat);
    });

    // Totales de presupuesto generales
    document.getElementById("txtTotalFijos").innerText = formatoCOP(totalFijos);
    document.getElementById("txtTotalNoFrecuentes").innerText = formatoCOP(totalNoFrecuentes);
    
    const balanceNeto = totalIngresos - (totalFijos + totalNoFrecuentes);
    const elBalance = document.getElementById("txtBalanceNeto");
    elBalance.innerText = formatoCOP(balanceNeto);
    elBalance.style.color = balanceNeto >= 0 ? "#27ae60" : "#e74c3c";

    // Historial desglose ingresos extras
    const contenedorIngresos = document.getElementById("listaIngresosDetalle");
    contenedorIngresos.innerHTML = ingresos.length === 0 ? "" : "";
    ingresos.forEach(ing => {
        const div = document.createElement("div");
        div.className = "table-row-item";
        div.innerHTML = `<span>• ${ing.categoria}</span> <span>${formatoCOP(ing.monto)} <button onclick="eliminarIngreso(${ing.id})" style="background:none; color:#e74c3c; border:none; cursor:pointer;">❌</button></span>`;
        contenedorIngresos.appendChild(div);
    });

    renderizarFacturas();
    renderizarMercado();
    renderizarHistorialGastos();
}

function renderizarFacturas() {
    const container = document.getElementById("listaFacturasContainer");
    container.innerHTML = facturas.length === 0 ? "<p style='text-align:center; color:#aaa; padding:20px;'>No tienes obligaciones recurrentes agregadas.</p>" : "";
    
    const diaActual = new Date().getDate();

    facturas.forEach(f => {
        const div = document.createElement("div");
        const esVencido = (diaActual > f.diaVencimiento && !f.pagado);
        div.className = `item-factura-card ${f.pagado ? 'pagado' : 'pendiente'}`;
        
        div.innerHTML = `
            <div class="factura-info">
                <h4>${escapeHtml(f.nombre)}</h4>
                <strong>${formatoCOP(f.monto)}</strong><br>
                <small>⚠️ Vence el día ${f.diaVencimiento} de cada mes ${esVencido ? '<b style="color:#e74c3c;">(ATRASADO)</b>' : ''}</small>
            </div>
            <div class="factura-acciones">
                <button onclick="conmutarPagoFactura(${f.id})" class="btn-check-pago ${f.pagado ? 'uncheck' : ''}">
                    ${f.pagado ? '🔄 Debe' : '✅ Pagado'}
                </button>
                <button onclick="eliminarFactura(${f.id})" style="background:#e74c3c; padding:6px 10px; border-radius:6px;">🗑️</button>
            </div>
        `;
        container.appendChild(div);
    });
}

function renderizarMercado() {
    const container = document.getElementById("listaMercadoContainer");
    container.innerHTML = mercado.length === 0 ? "<p style='grid-column: 1/-1; text-align:center; color:#aaa; padding:20px;'>La lista está vacía.</p>" : "";
    mercado.forEach(item => {
        const div = document.createElement("div");
        div.className = "producto-card";
        div.innerHTML = `
            <div class="producto-nombre">${escapeHtml(item.nombre)}</div>
            <div class="producto-precio">${formatoCOP(item.precio)}</div>
            <div class="acciones-rapidas">
                <button onclick="eliminarItemMercado(${item.id})" style="background:#e74c3c; width:100%">🗑️ Eliminar</button>
            </div>
        `;
        container.appendChild(div);
    });
}

function renderizarHistorialGastos() {
    const container = document.getElementById("listaGastosContainer");
    container.innerHTML = gastos.length === 0 ? "<p style='text-align:center; color:#aaa; padding:10px;'>No hay egresos adicionales</p>" : "";
    gastos.slice().reverse().forEach(g => {
        const div = document.createElement("div");
        div.className = "gasto-item";
        div.innerHTML = `
            <div><strong>${escapeHtml(g.concepto)}</strong> - ${formatoCOP(g.monto)} (<small>${g.categoria}</small>)</div>
            <button onclick="eliminarGasto(${g.id})" style="background:#e74c3c; padding:3px 7px; border-radius:4px;">✖️</button>
        `;
        container.appendChild(div);
    });
}

// ========== INTERRUPTORES Y ACCIONES ELIMINAR ==========
window.conmutarPagoFactura = function(id) {
    facturas = facturas.map(f => f.id === id ? { ...f, pagado: !f.pagado } : f);
    guardarEnStorage();
    renderizarUI();
};

window.eliminarIngreso = function(id) { ingresos = ingresos.filter(i => i.id !== id); guardarEnStorage(); renderizarUI(); };
window.eliminarGasto = function(id) { gastos = gastos.filter(g => g.id !== id); guardarEnStorage(); renderizarUI(); };
window.eliminarItemMercado = function(id) { mercado = mercado.filter(m => m.id !== id); guardarEnStorage(); renderizarUI(); };
window.eliminarFactura = function(id) { facturas = facturas.filter(f => f.id !== id); guardarEnStorage(); renderizarUI(); };
function escapeHtml(str) { return String(str).replace(/[&<>]/g, m => ({'&': '&amp;', '<': '&lt;', '>': '&gt;'}[m] || m)); }

function cambiarPestana(tabId) {
    document.querySelectorAll('.tab-content').forEach(t => t.style.display = 'none');
    document.getElementById(`tab-${tabId}`).style.display = 'block';
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tabId));
}

// ========== EVENTOS PRINCIPALES ==========
document.addEventListener("DOMContentLoaded", () => {
    cargarDatos();

    // Guardar Perfil Inicial con Salario
    document.getElementById("btnGuardarPerfil").addEventListener("click", () => {
        const nombre = document.getElementById("userNombre").value;
        const telefono = document.getElementById("userTelefono").value;
        const periodo = document.getElementById("userPeriodo").value;
        const salario = parseFloat(document.getElementById("userSalarioBase").value);

        if (!nombre.trim() || !telefono.trim() || isNaN(salario) || salario <= 0) { 
            alert("Por favor completa los datos de registro incluyendo tu salario base."); 
            return; 
        }
        perfilUsuario = { nombre: nombre.trim(), telefono: telefono.trim(), periodo, salarioBase: salario };
        guardarEnStorage();
        renderizarUI();
    });

    document.getElementById("btnRegistrarIngreso").addEventListener("click", () => {
        const cat = document.getElementById("ingresoCategoria").value;
        const input = document.getElementById("ingresoMonto");
        if (registrarIngreso(cat, input.value)) { input.value = ""; renderizarUI(); }
    });

    document.getElementById("btnAgregarFactura").addEventListener("click", () => {
        const nom = document.getElementById("facturaNombre");
        const mon = document.getElementById("facturaMonto");
        const dia = document.getElementById("facturaDiaVencimiento");
        if(agregarFacturaRecurrente(nom.value, mon.value, dia.value)) {
            nom.value = ""; mon.value = ""; dia.value = "";
            renderizarUI();
        } else { alert("Verifica los campos de la factura. El día debe ser de 1 a 31"); }
    });

    document.getElementById("btnAgregarMercado").addEventListener("click", () => {
        const nom = document.getElementById("itemMercadoNombre");
        const pre = document.getElementById("itemMercadoPrecio");
        if (agregarItemMercado(nom.value, pre.value)) { nom.value = ""; pre.value = ""; renderizarUI(); }
    });

    document.getElementById("btnAgregarGasto").addEventListener("click", () => {
        const con = document.getElementById("gastoConcepto");
        const mon = document.getElementById("gastoMonto");
        const cat = document.getElementById("gastoCategoria").value;
        if (registrarGasto(con.value, mon.value, cat)) { con.value = ""; mon.value = ""; renderizarUI(); }
    });

    document.querySelectorAll(".tab-btn").forEach(btn => {
        btn.addEventListener("click", () => cambiarPestana(btn.dataset.tab));
    });

    document.getElementById("btnExportarDatos").addEventListener("click", () => {
        let csv = "Tipo,Concepto/Categoria,Monto COP\n";
        csv += `Ingreso Fijo,Salario Base,${perfilUsuario.salarioBase}\n`;
        ingresos.forEach(i => csv += `Ingreso Extra,${i.categoria},${i.monto}\n`);
        facturas.forEach(f => csv += `Obligacion Fija,${f.nombre} (Vence:${f.diaVencimiento}),${f.monto}\n`);
        mercado.forEach(m => csv += `Mercado,${m.nombre},${m.precio}\n`);
        gastos.forEach(g => csv += `Gasto Extra,${g.concepto} (${g.categoria}),${g.monto}\n`);
        
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.setAttribute("download", `Finanzas_COP_${perfilUsuario ? perfilUsuario.nombre : 'Usuario'}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });

    document.getElementById("btnResetDemo").addEventListener("click", () => {
        if (confirm("🚨 ¿Deseas borrar por completo tus finanzas y configuraciones?")) {
            localStorage.clear(); location.reload();
        }
    });

    renderizarUI();
});

// ========== CONTROLADOR PWA EN MÓVILES ==========
let eventoInstalacionPWA;
const bannerInstalacion = document.getElementById('alertaInstalacion');
const btnInstalar = document.getElementById('btnInstalarApp');
const btnCerrarBanner = document.getElementById('btnCerrarAlertaPWA');
const btnForzarPWA = document.getElementById('btnForzarInstalacionPWA');

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    eventoInstalacionPWA = e;
    if (bannerInstalacion) bannerInstalacion.classList.remove('hidden');
});

function invocarInstalacion() {
    if (eventoInstalacionPWA) {
        eventoInstalacionPWA.prompt();
        eventoInstalacionPWA = null;
        if(bannerInstalacion) bannerInstalacion.classList.add('hidden');
    } else {
        alert("📱 Para instalar esta App en tu celular:\n\n• Si usas Android: Abre este enlace en Google Chrome y presiona los tres puntos superiores (⋮), luego elige 'Instalar aplicación'.\n\n• Si usas iPhone/iOS: Abre el sitio desde Safari, presiona el botón 'Compartir' (⎋) en la barra inferior y selecciona 'Agregar a inicio'.");
    }
}

if (btnInstalar) btnInstalar.addEventListener('click', invocarInstalacion);
if (btnForzarPWA) btnForzarPWA.addEventListener('click', invocarInstalacion);
if (btnCerrarBanner) btnCerrarBanner.addEventListener('click', () => bannerInstalacion.classList.add('hidden'));

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(reg => console.log('SW Operativo', reg))
            .catch(err => console.log('Error SW', err));
    });
}