/** Normalizar texto: sin acentos, minúsculas, sin espacios extra */
const norm = (str) => (str || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

/**
 * Utilidad compartida para validación de stock VIRTUAL.
 * Funciones puras sin dependencia de React.
 * Usada por: reservas.jsx, reservaGrupal.jsx, ventas.jsx
 *
 * REGLA FUNDAMENTAL:
 * - Las reservas NUNCA modifican el stock del producto (solo CONSULTAN).
 * - Solo las VENTAS disminuyen el stock.
 * - El backend NO toca el stock al crear/editar/eliminar reservas.
 *
 * Para RESERVAS (por fecha):
 *   disponible = stock - reservas_de_ESA_FECHA
 *
 * Para VENTAS:
 *   vendible = stock - TODAS_las_reservas_activas
 */

/**
 * Filtra reservas que ocupan stock (no eliminadas, no devueltas, no anuladas).
 */
export function filtrarReservasActivas(reservas) {
  return (reservas || []).filter((r) => {
    const deletedAt = r.DeletedAt || r.deleted_at;
    if (deletedAt && deletedAt !== "0001-01-01T00:00:00Z") return false;
    const estado = (r.estado || r.Estado || "").toLowerCase();
    if (estado === "devuelto" || estado === "cancelado" || estado === "anulado") {
      return false;
    }
    return estado !== "";
  });
}

/**
 * Extrae la fecha del evento de una reserva, probando todos los campos posibles.
 */
export function obtenerFechaEvento(reserva) {
  return (
    reserva.fecha_evento ||
    reserva.FechaEvento ||
    reserva.fecha_reserva ||
    reserva.FechaReserva ||
    reserva.fecha ||
    reserva.Fecha ||
    null
  );
}

/**
 * Para RESERVAS: calcula stock disponible de un producto en una fecha específica.
 *
 * El stock del producto NUNCA se modifica por reservas.
 * Solo contamos cuántas unidades están reservadas para ESA FECHA
 * y restamos del stock real.
 *
 * Ejemplo: stock=5
 *   Para fecha X con 0 reservas: disponible = 5
 *   Para fecha Y con 2 reservas: disponible = 3
 */
export function calcularStockDisponiblePorFecha(
  productoId,
  stockFisico,
  fecha,
  reservas,
  excluirReservaId = null
) {
  if (!fecha) {
    return {
      disponible: false,
      stockDisponible: 0,
      stockOriginal: stockFisico,
      unidadesReservadas: 0,
      reservasMismaFecha: [],
      reservasDiaSiguiente: [],
      sinFecha: true,
    };
  }

  const fechaEventoDate = new Date(fecha);
  fechaEventoDate.setHours(0, 0, 0, 0);

  const fechaDiaSiguiente = new Date(fechaEventoDate);
  fechaDiaSiguiente.setDate(fechaDiaSiguiente.getDate() + 1);

  // Contar reservas solo de la MISMA FECHA
  let unidadesReservadasMismaFecha = 0;
  const reservasMismaFecha = [];
  const reservasDiaSiguiente = [];

  (reservas || []).forEach((reserva) => {
    if (excluirReservaId && (reserva.ID || reserva.id) === excluirReservaId) {
      return;
    }

    const fechaReservaStr = obtenerFechaEvento(reserva);
    if (!fechaReservaStr) return;

    const fechaReserva = new Date(fechaReservaStr);
    fechaReserva.setHours(0, 0, 0, 0);

    const detalles = reserva.detalles || reserva.Detalles || [];
    detalles.forEach((detalle) => {
      // Producto individual
      const idProd = detalle.id_producto || detalle.IdProducto || detalle.producto_id;

      // Función auxiliar para registrar unidades encontradas
      const registrarUnidades = (cant) => {
        if (fechaReserva.getTime() === fechaEventoDate.getTime()) {
          unidadesReservadasMismaFecha += cant;
          reservasMismaFecha.push({
            idReserva: reserva.ID || reserva.id,
            fecha: fechaReservaStr,
            cantidad: cant,
            cliente: reserva.cliente || reserva.Cliente,
          });
        }

        if (fechaReserva.getTime() === fechaDiaSiguiente.getTime()) {
          reservasDiaSiguiente.push({
            idReserva: reserva.ID || reserva.id,
            fecha: fechaReservaStr,
            cantidad: cant,
            cliente: reserva.cliente || reserva.Cliente,
          });
        }
      };

      if (idProd === productoId) {
        registrarUnidades(detalle.cantidad || detalle.Cantidad || 1);
        return;
      }

      // Productos dentro de combos
      const productosCombo = detalle.productos_del_combo || detalle.ProductosDelCombo || [];
      productosCombo.forEach((prodCombo) => {
        const idProdCombo = prodCombo.ID || prodCombo.id;
        if (idProdCombo === productoId) {
          registrarUnidades(1);
        }
      });
    });
  });

  // disponible = stock real - reservas de ESTA fecha solamente
  const stockDisponible = Math.max(0, stockFisico - unidadesReservadasMismaFecha);

  return {
    disponible: stockDisponible >= 1,
    stockDisponible,
    stockOriginal: stockFisico,
    unidadesReservadas: unidadesReservadasMismaFecha,
    reservasMismaFecha,
    reservasDiaSiguiente,
  };
}

/**
 * Para VENTAS: calcula stock disponible para venta.
 *
 * El backend NO modifica stock por reservas.
 * Vendible = stock - TODAS las unidades reservadas activas.
 * Si stock=5 y hay 3 reservadas en total, solo se pueden vender 2.
 */
export function calcularStockDisponibleParaVenta(
  productoId,
  stockFisico,
  reservas
) {
  let unidadesReservadas = 0;
  const reservasFuturas = [];

  (reservas || []).forEach((reserva) => {
    const estado = (reserva.estado || reserva.Estado || "").toLowerCase();

    const detalles = reserva.detalles || reserva.Detalles || [];
    detalles.forEach((detalle) => {
      // Producto individual
      const idProd = detalle.id_producto || detalle.IdProducto || detalle.producto_id;
      if (idProd === productoId) {
        const cantidad = detalle.cantidad || detalle.Cantidad || 1;
        unidadesReservadas += cantidad;
        reservasFuturas.push({
          idReserva: reserva.ID || reserva.id,
          fecha: obtenerFechaEvento(reserva),
          cantidad,
          estado,
          esCombo: false,
        });
        return;
      }

      // Productos dentro de combos
      const productosCombo = detalle.productos_del_combo || detalle.ProductosDelCombo || [];
      productosCombo.forEach((prodCombo) => {
        const idProdCombo = prodCombo.ID || prodCombo.id;
        if (idProdCombo === productoId) {
          unidadesReservadas += 1;
          reservasFuturas.push({
            idReserva: reserva.ID || reserva.id,
            fecha: obtenerFechaEvento(reserva),
            cantidad: 1,
            estado,
            esCombo: true,
            comboNombre: detalle.combo?.nombre || detalle.Combo?.nombre || "Combo",
          });
        }
      });
    });
  });

  // vendible = stock real - todas las reservas activas
  const stockVendible = Math.max(0, stockFisico - unidadesReservadas);

  return {
    disponible: stockVendible >= 1,
    stockReal: stockVendible,
    unidadesReservadas,
    reservasFuturas,
  };
}

/**
 * Calcula unidades consumidas de un producto en una lista local.
 * Revisa productos individuales Y productos dentro de combos.
 */
export function calcularStockConsumidoEnListaLocal(
  nombreProducto,
  listaProductos,
  excluirItemId = null
) {
  let consumido = 0;
  for (const item of listaProductos || []) {
    if (excluirItemId && item.id === excluirItemId) continue;

    if (
      item.tipo === "individual" &&
      norm(item.nombre) === norm(nombreProducto)
    ) {
      consumido += item.cantidad || 1;
    } else if (item.tipo === "combo" && item.productos_escaneados) {
      const productoEnCombo = item.productos_escaneados.find(
        (p) => norm(p.nombre) === norm(nombreProducto)
      );
      if (productoEnCombo) {
        consumido += item.cantidad || 1;
      }
    }
  }
  return consumido;
}

/**
 * Construye mensaje detallado de reservas del día siguiente para alertas.
 * Usado en reservas individuales, grupales y ventas.
 */
export function buildMensajeDiaSiguiente(nombreProducto, reservasDiaSiguiente) {
  const totalDiaSiguiente = reservasDiaSiguiente.reduce((sum, r) => sum + r.cantidad, 0);
  const detalleReservas = reservasDiaSiguiente.map((r) => {
    const cliente = r.cliente;
    const nombreCliente = cliente
      ? `${cliente.nombre || cliente.Nombre || ""} ${cliente.apellidos || cliente.Apellidos || ""}`.trim()
      : "Cliente desconocido";
    return `  • Reserva #${r.idReserva} — ${nombreCliente} (${r.cantidad} unid.)`;
  }).join("\n");
  return `"${nombreProducto}" tiene ${totalDiaSiguiente} unidad(es) alquiladas para el día siguiente:\n${detalleReservas}\n\nAsegúrese de que el cliente devuelva a tiempo.`;
}

/**
 * Para RESERVAS GRUPALES: calcula unidades consumidas por OTROS miembros
 * del mismo grupo (antes de guardar).
 */
export function calcularStockConsumidoEnOtrosMiembros(
  nombreProducto,
  miembrosGrupo,
  excluirMiembroId = null
) {
  let consumido = 0;
  for (const miembro of miembrosGrupo || []) {
    if (excluirMiembroId && miembro.id === excluirMiembroId) continue;
    consumido += calcularStockConsumidoEnListaLocal(
      nombreProducto,
      miembro.productos
    );
  }
  return consumido;
}
