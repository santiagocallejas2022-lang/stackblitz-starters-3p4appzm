"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../lib/supabase";

type Seccion =
  | "inicio"
  | "miComercio"
  | "productos"
  | "ventas"
  | "pedidos"
  | "caja"
  | "clientes"
  | "gastos"
  | "reportes"
  | "capacitaciones";

type Comercio = {
  id: number;
  nombre: string;
  rubro?: string;
  direccion?: string;
  telefono?: string;
  email?: string;
  estado?: string;
};

type MiembroEquipo = {
  relacionId: number;
  userId: string;
  email: string;
  rol: string;
  estado: string;
  accesoTotal: boolean;
  permisos: Record<string, boolean>;
  fechaAsociacion: string;
  ultimoAcceso: string | null;
  updatedAt: string;
};

type InvitacionComercio = {
  id: number;
  comercioId: number;
  email: string;
  token: string;
  estado: string;
  accesoTotal: boolean;
  permisos: Record<string, boolean>;
  fechaExpiracion: string;
  aceptadaAt: string | null;
  createdAt: string;
};

type GrupoPermisos = {
  titulo: string;
  permisos: { clave: string; etiqueta: string }[];
};

const GRUPOS_PERMISOS: GrupoPermisos[] = [
  {
    titulo: "Ventas",
    permisos: [
      { clave: "ventas.ver", etiqueta: "Ver ventas" },
      { clave: "ventas.crear", etiqueta: "Registrar ventas" },
      { clave: "ventas.anular", etiqueta: "Anular ventas" },
    ],
  },
  {
    titulo: "Productos",
    permisos: [
      { clave: "productos.ver", etiqueta: "Ver productos" },
      { clave: "productos.crear", etiqueta: "Crear productos" },
      { clave: "productos.editar", etiqueta: "Editar productos y precios" },
      { clave: "productos.eliminar", etiqueta: "Eliminar productos" },
      { clave: "stock.ingresar", etiqueta: "Ingresar stock" },
      { clave: "stock.ver_historial", etiqueta: "Ver historial de stock" },
    ],
  },
  {
    titulo: "Clientes",
    permisos: [
      { clave: "clientes.ver", etiqueta: "Ver clientes" },
      { clave: "clientes.crear", etiqueta: "Crear clientes" },
      { clave: "clientes.editar", etiqueta: "Editar clientes" },
      { clave: "clientes.eliminar", etiqueta: "Eliminar clientes" },
    ],
  },
  {
    titulo: "Caja",
    permisos: [
      { clave: "caja.ver", etiqueta: "Ver caja e historial" },
      { clave: "caja.abrir", etiqueta: "Abrir caja" },
      { clave: "caja.cerrar", etiqueta: "Cerrar caja" },
      {
        clave: "caja.registrar_movimiento",
        etiqueta: "Registrar ingresos y egresos manuales",
      },
    ],
  },
  {
    titulo: "Gastos",
    permisos: [
      { clave: "gastos.ver", etiqueta: "Ver gastos" },
      { clave: "gastos.crear", etiqueta: "Registrar gastos" },
      { clave: "gastos.editar", etiqueta: "Editar gastos" },
      { clave: "gastos.eliminar", etiqueta: "Eliminar gastos" },
    ],
  },
  {
    titulo: "Pedidos",
    permisos: [
      { clave: "pedidos_online.ver", etiqueta: "Ver pedidos online" },
      { clave: "pedidos_online.crear", etiqueta: "Crear pedidos" },
      {
        clave: "pedidos_online.gestionar",
        etiqueta: "Preparar, despachar y entregar pedidos",
      },
      {
        clave: "pedidos_online.cancelar",
        etiqueta: "Cancelar pedidos y devolver stock",
      },
      {
        clave: "pedidos_online.configurar",
        etiqueta: "Configurar conexiones con tiendas",
      },
    ],
  },
  {
    titulo: "Reportes",
    permisos: [{ clave: "reportes.ver", etiqueta: "Ver reportes" }],
  },
];

type Producto = {
  id: number;
  comercioId: number;
  nombre: string;
  codigo: string;
  categoria: string;
  precio: number;
  costo: number;
  stock: number;
  minimo: number;
  activo: boolean;
};

type IngresoStock = {
  id: number;
  comercioId: number;
  productoId: number;
  productoNombre: string;
  cantidad: number;
  stockAnterior: number;
  stockResultante: number;
  observacion: string;
  usuarioId: string | null;
  emailUsuario: string;
  createdAt: string;
};

type Cliente = {
  id: number;
  comercioId: number;
  nombre: string;
  telefono: string;
};

type ItemVenta = {
  productoId: number;
  nombre: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
};

type Venta = {
  id: number;
  comercioId: number;
  fecha: string;
  clienteId: number | null;
  cliente: string;
  medioPago: string;
  total: number;
  items: ItemVenta[];
  cajaId: number;
  estado: "activa" | "anulada";
  motivoAnulacion: string;
  anuladaAt: string | null;
  anuladaPor: string | null;
  registradaPor: string | null;
  registradaPorEmail: string;
};

type PedidoOnlineItem = {
  id: number;
  pedidoId: number;
  productoId: number;
  nombreProducto: string;
  codigoProducto: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
};

type PedidoOnline = {
  id: number;
  comercioId: number;
  numero: string;
  canal: string;
  pedidoExternoId: string | null;
  clienteNombre: string;
  clienteTelefono: string;
  clienteEmail: string;
  tipoEntrega: "retiro" | "envio";
  direccionEntrega: string;
  localidadEntrega: string;
  estado:
    | "nuevo"
    | "preparacion"
    | "listo"
    | "enviado"
    | "entregado"
    | "cancelado";
  estadoPago: "pendiente" | "aprobado" | "rechazado" | "reembolsado";
  medioPago: string;
  total: number;
  costoEnvio: number;
  stockDescontado: boolean;
  fechaPedido: string;
  fechaLimite: string | null;
  observaciones: string;
  repartidor: string;
  codigoSeguimiento: string;
  createdAt: string;
  updatedAt: string;
  items: PedidoOnlineItem[];
};

type MovimientoOnline = {
  id: number;
  comercioId: number;
  pedidoId: number | null;
  tipo: "ingreso" | "egreso";
  estado: "pendiente" | "acreditado" | "revertido";
  concepto: string;
  medioPago: string;
  monto: number;
  fecha: string;
};

type MovimientoCaja = {
  id: number;
  comercioId: number;
  cajaId: number;
  ventaId?: number | null;
  fecha: string;
  tipo: "Ingreso" | "Egreso";
  concepto: string;
  monto: number;
};

type Caja = {
  id: number;
  comercioId: number;
  abierta: boolean;
  fechaApertura: string;
  fechaCierre: string | null;
  saldoInicial: number;
  saldoFinalReal: number | null;
};

type HistorialCaja = {
  id: number;
  fechaApertura: string;
  fechaCierre: string;
  saldoInicial: number;
  ingresos: number;
  egresos: number;
  saldoEsperado: number;
  saldoFinalReal: number;
  diferencia: number;
};

type Gasto = {
  id: number;
  comercioId: number;
  fecha: string;
  categoria: string;
  concepto: string;
  proveedor: string;
  monto: number;
  medioPago: string;
  observaciones: string;
};

type Capacitacion = {
  id: number;
  titulo: string;
  descripcion: string;
  modalidad: string;
  lugar: string;
  fechaInicio: string | null;
  fechaFin: string | null;
  cupos: number | null;
  destinatarios: string;
  link: string;
  estado: string;
  createdAt: string;
};

type InscripcionCapacitacion = {
  id: number;
  capacitacionId: number;
  userId: string;
  comercioId: number;
  nombreComercio: string;
  emailUsuario: string;
  nombreInscripto: string;
  telefonoInscripto: string;
  observaciones: string;
  estado: string;
  createdAt: string;
};

type NivelAlerta = "critica" | "advertencia" | "informativa";

type AlertaComercio = {
  id: string;
  titulo: string;
  detalle: string;
  nivel: NivelAlerta;
  seccion: Seccion;
};

const cajaVacia = (comercioId = 0): Caja => ({
  id: 0,
  comercioId,
  abierta: false,
  fechaApertura: "",
  fechaCierre: null,
  saldoInicial: 0,
  saldoFinalReal: null,
});

function normalizarProducto(data: any): Producto {
  return {
    id: data.id,
    comercioId: data.comercio_id,
    nombre: data.nombre,
    codigo: data.codigo,
    categoria: data.categoria,
    precio: Number(data.precio),
    costo: Number(data.costo),
    stock: Number(data.stock),
    minimo: Number(data.minimo),
    activo: Boolean(data.activo),
  };
}

function normalizarIngresoStock(data: any): IngresoStock {
  return {
    id: data.id,
    comercioId: data.comercio_id,
    productoId: data.producto_id,
    productoNombre: data.producto_nombre || "Producto",
    cantidad: Number(data.cantidad || 0),
    stockAnterior: Number(data.stock_anterior || 0),
    stockResultante: Number(data.stock_resultante || 0),
    observacion: data.observacion || "",
    usuarioId: data.usuario_id || null,
    emailUsuario: data.email_usuario || "",
    createdAt: data.created_at,
  };
}

function esFechaDeHoy(value?: string | null) {
  if (!value) return false;

  const hoy = new Date();
  const anioHoy = hoy.getFullYear();
  const mesHoy = hoy.getMonth();
  const diaHoy = hoy.getDate();

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [anio, mes, dia] = value.split("-").map(Number);
    return anio === anioHoy && mes - 1 === mesHoy && dia === diaHoy;
  }

  const fecha = new Date(value);
  if (Number.isNaN(fecha.getTime())) return false;

  return (
    fecha.getFullYear() === anioHoy &&
    fecha.getMonth() === mesHoy &&
    fecha.getDate() === diaHoy
  );
}

const TAMANO_BLOQUE_CARGA = 500;

async function cargarTodosLosRegistrosPorBloques(
  crearConsulta: (desde: number, hasta: number) => any,
) {
  const registros: any[] = [];
  let desde = 0;

  while (true) {
    const hasta = desde + TAMANO_BLOQUE_CARGA - 1;
    const { data, error } = await crearConsulta(desde, hasta);

    if (error) throw error;

    const bloque = data || [];
    registros.push(...bloque);

    if (bloque.length < TAMANO_BLOQUE_CARGA) break;

    desde += TAMANO_BLOQUE_CARGA;
  }

  return registros;
}

export default function Home() {
  const [seccion, setSeccion] = useState<Seccion>("inicio");
  const [usuario, setUsuario] = useState<any>(null);
  const [comercioActual, setComercioActual] = useState<Comercio | null>(null);
  const [rolUsuario, setRolUsuario] = useState("admin_comercio");
  const [accesoTotalUsuario, setAccesoTotalUsuario] = useState(false);
  const [permisosUsuario, setPermisosUsuario] = useState<
    Record<string, boolean>
  >({});
  const [estadoRelacionUsuario, setEstadoRelacionUsuario] = useState("activo");
  const [tokenInvitacion, setTokenInvitacion] = useState<string | null>(null);
  const [urlRevisada, setUrlRevisada] = useState(false);
  const [procesandoInvitacion, setProcesandoInvitacion] = useState(false);
  const invitacionProcesadaRef = useRef(false);
  const [modoRegistroInvitado, setModoRegistroInvitado] = useState(false);
  const [emailInvitado, setEmailInvitado] = useState("");
  const [passwordInvitado, setPasswordInvitado] = useState("");
  const [cargandoUsuario, setCargandoUsuario] = useState(true);
  const [cargandoDatos, setCargandoDatos] = useState(false);
  const [modoRegistro, setModoRegistro] = useState(false);
  const [estadoSincronizacion, setEstadoSincronizacion] = useState<
    "conectando" | "activa" | "error"
  >("conectando");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [registroEmail, setRegistroEmail] = useState("");
  const [registroPassword, setRegistroPassword] = useState("");
  const [registroNombreComercio, setRegistroNombreComercio] = useState("");
  const [registroRubro, setRegistroRubro] = useState("");
  const [registroTelefono, setRegistroTelefono] = useState("");
  const [registroDireccion, setRegistroDireccion] = useState("");

  const [productos, setProductos] = useState<Producto[]>([]);
  const [ingresosStock, setIngresosStock] = useState<IngresoStock[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [pedidosOnline, setPedidosOnline] = useState<PedidoOnline[]>([]);
  const [movimientosOnline, setMovimientosOnline] = useState<MovimientoOnline[]>([]);
  const [movimientosCaja, setMovimientosCaja] = useState<MovimientoCaja[]>([]);
  const [historialCajas, setHistorialCajas] = useState<HistorialCaja[]>([]);
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [capacitaciones, setCapacitaciones] = useState<Capacitacion[]>([]);
  const [inscripcionesCapacitaciones, setInscripcionesCapacitaciones] =
    useState<InscripcionCapacitacion[]>([]);
  const [caja, setCaja] = useState<Caja>(cajaVacia());

  useEffect(() => {
    const parametros = new URLSearchParams(window.location.search);
    const token = parametros.get("invitacion");
    setTokenInvitacion(token);
    setUrlRevisada(true);
  }, []);

  useEffect(() => {
    async function cargarUsuario() {
      try {
        const { data, error } = await supabase.auth.getUser();

        if (error) {
          console.error("Error al cargar usuario:", error.message);
        }

        setUsuario(data.user);
      } catch (error) {
        console.error("Error inesperado al cargar usuario:", error);
      } finally {
        setCargandoUsuario(false);
      }
    }

    cargarUsuario();

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUsuario(session?.user ?? null);
      },
    );

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!usuario || !urlRevisada) return;

    if (tokenInvitacion && !invitacionProcesadaRef.current) {
      aceptarInvitacionPendiente();
      return;
    }

    if (!tokenInvitacion) {
      cargarComercioYDatos();
    }
  }, [usuario, tokenInvitacion, urlRevisada]);

  useEffect(() => {
    const comercioId = comercioActual?.id;

    if (!usuario || !comercioId) {
      setEstadoSincronizacion("conectando");
      return;
    }

    setEstadoSincronizacion("conectando");

    const temporizadores = new Map<string, ReturnType<typeof setTimeout>>();

    function programarActualizacion(
      clave: string,
      actualizar: () => Promise<unknown>,
    ) {
      const temporizadorAnterior = temporizadores.get(clave);

      if (temporizadorAnterior) {
        clearTimeout(temporizadorAnterior);
      }

      const temporizador = setTimeout(() => {
        temporizadores.delete(clave);
        actualizar().catch((error) => {
          console.error(`Error de sincronización (${clave}):`, error);
        });
      }, 450);

      temporizadores.set(clave, temporizador);
    }

    const actualizarOperacion = () =>
      Promise.all([
        cargarProductos(comercioId),
        cargarVentas(comercioId),
        cargarCajasYMovimientos(comercioId),
      ]);

    const canal = supabase
      .channel(`comercio-${comercioId}-sincronizacion`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "productos",
          filter: `comercio_id=eq.${comercioId}`,
        },
        () => programarActualizacion("operacion", actualizarOperacion),
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "ventas",
          filter: `comercio_id=eq.${comercioId}`,
        },
        () => programarActualizacion("operacion", actualizarOperacion),
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "venta_items",
          filter: `comercio_id=eq.${comercioId}`,
        },
        () => programarActualizacion("operacion", actualizarOperacion),
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "cajas",
          filter: `comercio_id=eq.${comercioId}`,
        },
        () => programarActualizacion("operacion", actualizarOperacion),
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "movimientos_caja",
          filter: `comercio_id=eq.${comercioId}`,
        },
        () => programarActualizacion("operacion", actualizarOperacion),
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "clientes",
          filter: `comercio_id=eq.${comercioId}`,
        },
        () =>
          programarActualizacion("clientes", () => cargarClientes(comercioId)),
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "gastos",
          filter: `comercio_id=eq.${comercioId}`,
        },
        () => programarActualizacion("gastos", () => cargarGastos(comercioId)),
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "ingresos_stock",
          filter: `comercio_id=eq.${comercioId}`,
        },
        () =>
          programarActualizacion("stock", () =>
            Promise.all([
              cargarIngresosStock(comercioId),
              cargarProductos(comercioId),
            ]),
          ),
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "pedidos_online",
          filter: `comercio_id=eq.${comercioId}`,
        },
        () =>
          programarActualizacion("pedidos-online", () =>
            Promise.all([
              cargarPedidosOnline(comercioId),
              cargarMovimientosOnline(comercioId),
              cargarProductos(comercioId),
            ]),
          ),
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "pedido_online_items",
          filter: `comercio_id=eq.${comercioId}`,
        },
        () =>
          programarActualizacion("items-pedidos-online", () =>
            cargarPedidosOnline(comercioId),
          ),
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "movimientos_online",
          filter: `comercio_id=eq.${comercioId}`,
        },
        () =>
          programarActualizacion("movimientos-online", () =>
            cargarMovimientosOnline(comercioId),
          ),
      )
      .subscribe((estado) => {
        if (estado === "SUBSCRIBED") {
          setEstadoSincronizacion("activa");
        } else if (estado === "CHANNEL_ERROR" || estado === "TIMED_OUT") {
          setEstadoSincronizacion("error");
        }
      });

    return () => {
      temporizadores.forEach((temporizador) => clearTimeout(temporizador));
      temporizadores.clear();
      supabase.removeChannel(canal);
    };
  }, [usuario?.id, comercioActual?.id]);

  async function iniciarSesionComoInvitado() {
    if (!emailInvitado.trim() || !passwordInvitado) {
      alert("Ingresá el correo invitado y la contraseña.");
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({
      email: emailInvitado.trim().toLowerCase(),
      password: passwordInvitado,
    });

    if (error) {
      alert("Error al iniciar sesión: " + error.message);
    }
  }

  async function registrarseComoInvitado() {
    if (!emailInvitado.trim() || !passwordInvitado) {
      alert("Ingresá el correo invitado y una contraseña.");
      return;
    }

    if (passwordInvitado.length < 6) {
      alert("La contraseña debe tener al menos 6 caracteres.");
      return;
    }

    const { data, error } = await supabase.auth.signUp({
      email: emailInvitado.trim().toLowerCase(),
      password: passwordInvitado,
      options: {
        emailRedirectTo: window.location.href,
      },
    });

    if (error) {
      alert("Error al crear la cuenta: " + error.message);
      return;
    }

    if (!data.session) {
      alert(
        "Cuenta creada. Revisá tu correo para confirmarla y después abrí nuevamente este enlace de invitación.",
      );
      return;
    }

    setUsuario(data.user);
  }

  async function aceptarInvitacionPendiente() {
    if (!usuario || !tokenInvitacion || invitacionProcesadaRef.current) return;

    invitacionProcesadaRef.current = true;
    setProcesandoInvitacion(true);

    const { error } = await supabase.rpc("aceptar_invitacion_comercio", {
      p_token: tokenInvitacion,
    });

    if (error) {
      const mensaje = error.message || "No se pudo aceptar la invitación.";
      const yaAsociado = mensaje.toLowerCase().includes("ya está asociada");

      if (!yaAsociado) {
        alert("No se pudo aceptar la invitación: " + mensaje);
        invitacionProcesadaRef.current = false;
        setProcesandoInvitacion(false);
        return;
      }
    } else {
      alert("Invitación aceptada. Ya podés ingresar al comercio.");
    }

    const urlLimpia = `${window.location.pathname}${window.location.hash || ""}`;
    window.history.replaceState({}, "", urlLimpia);
    setTokenInvitacion(null);
    setProcesandoInvitacion(false);
    await cargarComercioYDatos();
  }

  async function cargarComercioYDatos() {
    if (!usuario) return;

    setCargandoDatos(true);

    const { data, error } = await supabase
      .from("usuarios_comercios")
      .select(
        `
        comercio_id,
        rol,
        estado,
        acceso_total,
        permisos,
        comercios (
          id,
          nombre,
          rubro,
          direccion,
          telefono,
          email,
          estado
        )
      `,
      )
      .eq("user_id", usuario.id)
      .limit(1)
      .maybeSingle();

    if (error) {
      alert("Error al buscar el comercio del usuario: " + error.message);
      setCargandoDatos(false);
      return;
    }

    if (!data) {
      alert("Este usuario no tiene un comercio asociado.");
      setCargandoDatos(false);
      return;
    }

    const comercioRaw: any = Array.isArray(data.comercios)
      ? data.comercios[0]
      : data.comercios;

    if (!comercioRaw) {
      alert("No se pudo cargar la información del comercio.");
      setCargandoDatos(false);
      return;
    }

    const comercio: Comercio = {
      id: comercioRaw.id,
      nombre: comercioRaw.nombre,
      rubro: comercioRaw.rubro || "",
      direccion: comercioRaw.direccion || "",
      telefono: comercioRaw.telefono || "",
      email: comercioRaw.email || "",
      estado: comercioRaw.estado || "activo",
    };

    setComercioActual(comercio);
    setRolUsuario(data.rol || "admin_comercio");
    setEstadoRelacionUsuario(data.estado || "activo");
    setAccesoTotalUsuario(Boolean(data.acceso_total));
    setPermisosUsuario(data.permisos || {});
    await cargarDatos(comercio.id, data.rol || "admin_comercio");
    setCargandoDatos(false);
  }

  async function cargarDatos(comercioId?: number, rol?: string) {
    const idComercio = comercioId || comercioActual?.id;

    if (!idComercio) return;

    await Promise.all([
      cargarProductos(idComercio),
      cargarIngresosStock(idComercio),
      cargarClientes(idComercio),
      cargarCajasYMovimientos(idComercio),
      cargarVentas(idComercio),
      cargarPedidosOnline(idComercio),
      cargarMovimientosOnline(idComercio),
      cargarGastos(idComercio),
      cargarCapacitaciones(idComercio, rol || rolUsuario),
    ]);
  }

  async function cargarProductos(comercioId: number) {
    try {
      const data = await cargarTodosLosRegistrosPorBloques((desde, hasta) =>
        supabase
          .from("productos")
          .select("*")
          .eq("comercio_id", comercioId)
          .order("id", { ascending: true })
          .range(desde, hasta),
      );

      setProductos(data.map((p: any) => normalizarProducto(p)));
    } catch (error: any) {
      alert("Error al cargar productos: " + (error?.message || error));
    }
  }
  async function cargarIngresosStock(comercioId: number) {
    try {
      const data = await cargarTodosLosRegistrosPorBloques((desde, hasta) =>
        supabase
          .from("ingresos_stock")
          .select("*")
          .eq("comercio_id", comercioId)
          .order("id", { ascending: true })
          .range(desde, hasta),
      );

      const ingresosOrdenados = data
        .map((item: any) => normalizarIngresoStock(item))
        .sort(
          (a: IngresoStock, b: IngresoStock) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        );

      setIngresosStock(ingresosOrdenados);
    } catch (error: any) {
      console.error(
        "Error al cargar historial de stock:",
        error?.message || error,
      );
      setIngresosStock([]);
    }
  }
  async function cargarClientes(comercioId: number) {
    try {
      const data = await cargarTodosLosRegistrosPorBloques((desde, hasta) =>
        supabase
          .from("clientes")
          .select("*")
          .eq("comercio_id", comercioId)
          .order("id", { ascending: true })
          .range(desde, hasta),
      );

      setClientes(
        data.map((c: any) => ({
          id: c.id,
          comercioId: c.comercio_id,
          nombre: c.nombre,
          telefono: c.telefono || "",
        })),
      );
    } catch (error: any) {
      alert("Error al cargar clientes: " + (error?.message || error));
    }
  }
  async function cargarVentas(comercioId: number) {
    try {
      const [ventasData, itemsData] = await Promise.all([
        cargarTodosLosRegistrosPorBloques((desde, hasta) =>
          supabase
            .from("ventas")
            .select("*")
            .eq("comercio_id", comercioId)
            .order("id", { ascending: true })
            .range(desde, hasta),
        ),
        cargarTodosLosRegistrosPorBloques((desde, hasta) =>
          supabase
            .from("venta_items")
            .select("*")
            .eq("comercio_id", comercioId)
            .order("id", { ascending: true })
            .range(desde, hasta),
        ),
      ]);

      const itemsPorVenta = new Map<number, ItemVenta[]>();

      itemsData.forEach((item: any) => {
        const itemNormalizado: ItemVenta = {
          productoId: item.producto_id,
          nombre: item.nombre_producto,
          cantidad: Number(item.cantidad),
          precioUnitario: Number(item.precio_unitario),
          subtotal: Number(item.subtotal),
        };

        const itemsExistentes = itemsPorVenta.get(item.venta_id) || [];
        itemsExistentes.push(itemNormalizado);
        itemsPorVenta.set(item.venta_id, itemsExistentes);
      });

      const ventasNormalizadas: Venta[] = ventasData.map((v: any) => ({
        id: v.id,
        comercioId: v.comercio_id,
        fecha: v.fecha,
        clienteId: v.cliente_id || null,
        cliente: v.cliente_nombre,
        medioPago: v.medio_pago,
        total: Number(v.total),
        cajaId: v.caja_id,
        estado: v.estado === "anulada" ? "anulada" : "activa",
        motivoAnulacion: v.motivo_anulacion || "",
        anuladaAt: v.anulada_at || null,
        anuladaPor: v.anulada_por || null,
        registradaPor: v.registrada_por || null,
        registradaPorEmail: v.registrada_por_email || "",
        items: itemsPorVenta.get(v.id) || [],
      }));

      setVentas(ventasNormalizadas);
    } catch (error: any) {
      alert("Error al cargar ventas: " + (error?.message || error));
    }
  }
  async function cargarPedidosOnline(comercioId: number) {
    try {
      const [pedidosData, itemsData] = await Promise.all([
        cargarTodosLosRegistrosPorBloques((desde, hasta) =>
          supabase
            .from("pedidos_online")
            .select("*")
            .eq("comercio_id", comercioId)
            .order("fecha_pedido", { ascending: false })
            .range(desde, hasta),
        ),
        cargarTodosLosRegistrosPorBloques((desde, hasta) =>
          supabase
            .from("pedido_online_items")
            .select("*")
            .eq("comercio_id", comercioId)
            .order("id", { ascending: true })
            .range(desde, hasta),
        ),
      ]);

      const itemsPorPedido = new Map<number, PedidoOnlineItem[]>();

      itemsData.forEach((item: any) => {
        const itemNormalizado: PedidoOnlineItem = {
          id: Number(item.id),
          pedidoId: Number(item.pedido_id),
          productoId: Number(item.producto_id),
          nombreProducto: item.nombre_producto || "Producto",
          codigoProducto: item.codigo_producto || "",
          cantidad: Number(item.cantidad || 0),
          precioUnitario: Number(item.precio_unitario || 0),
          subtotal: Number(item.subtotal || 0),
        };

        const existentes = itemsPorPedido.get(itemNormalizado.pedidoId) || [];
        existentes.push(itemNormalizado);
        itemsPorPedido.set(itemNormalizado.pedidoId, existentes);
      });

      setPedidosOnline(
        pedidosData.map((pedido: any) => ({
          id: Number(pedido.id),
          comercioId: Number(pedido.comercio_id),
          numero: pedido.numero,
          canal: pedido.canal || "Carga manual",
          pedidoExternoId: pedido.pedido_externo_id || null,
          clienteNombre: pedido.cliente_nombre || "Cliente",
          clienteTelefono: pedido.cliente_telefono || "",
          clienteEmail: pedido.cliente_email || "",
          tipoEntrega: pedido.tipo_entrega === "envio" ? "envio" : "retiro",
          direccionEntrega: pedido.direccion_entrega || "",
          localidadEntrega: pedido.localidad_entrega || "",
          estado: pedido.estado,
          estadoPago: pedido.estado_pago,
          medioPago: pedido.medio_pago || "",
          total: Number(pedido.total || 0),
          costoEnvio: Number(pedido.costo_envio || 0),
          stockDescontado: Boolean(pedido.stock_descontado),
          fechaPedido: pedido.fecha_pedido,
          fechaLimite: pedido.fecha_limite || null,
          observaciones: pedido.observaciones || "",
          repartidor: pedido.repartidor || "",
          codigoSeguimiento: pedido.codigo_seguimiento || "",
          createdAt: pedido.created_at,
          updatedAt: pedido.updated_at,
          items: itemsPorPedido.get(Number(pedido.id)) || [],
        })),
      );
    } catch (error: any) {
      console.error("Error al cargar pedidos online:", error?.message || error);
      setPedidosOnline([]);
    }
  }

  async function cargarMovimientosOnline(comercioId: number) {
    try {
      const data = await cargarTodosLosRegistrosPorBloques((desde, hasta) =>
        supabase
          .from("movimientos_online")
          .select("*")
          .eq("comercio_id", comercioId)
          .order("fecha", { ascending: false })
          .range(desde, hasta),
      );

      setMovimientosOnline(
        data.map((movimiento: any) => ({
          id: Number(movimiento.id),
          comercioId: Number(movimiento.comercio_id),
          pedidoId:
            movimiento.pedido_id === null
              ? null
              : Number(movimiento.pedido_id),
          tipo: movimiento.tipo === "egreso" ? "egreso" : "ingreso",
          estado:
            movimiento.estado === "acreditado"
              ? "acreditado"
              : movimiento.estado === "revertido"
                ? "revertido"
                : "pendiente",
          concepto: movimiento.concepto || "Movimiento online",
          medioPago: movimiento.medio_pago || "",
          monto: Number(movimiento.monto || 0),
          fecha: movimiento.fecha,
        })),
      );
    } catch (error: any) {
      console.error(
        "Error al cargar movimientos online:",
        error?.message || error,
      );
      setMovimientosOnline([]);
    }
  }

  async function cargarCajasYMovimientos(comercioId: number) {
    try {
      const [cajasData, movimientosData] = await Promise.all([
        cargarTodosLosRegistrosPorBloques((desde, hasta) =>
          supabase
            .from("cajas")
            .select("*")
            .eq("comercio_id", comercioId)
            .order("id", { ascending: true })
            .range(desde, hasta),
        ),
        cargarTodosLosRegistrosPorBloques((desde, hasta) =>
          supabase
            .from("movimientos_caja")
            .select("*")
            .eq("comercio_id", comercioId)
            .order("id", { ascending: true })
            .range(desde, hasta),
        ),
      ]);

      const movimientosNormalizados: MovimientoCaja[] = movimientosData.map(
        (m: any) => ({
          id: m.id,
          comercioId: m.comercio_id,
          cajaId: m.caja_id,
          ventaId: m.venta_id,
          fecha: m.fecha,
          tipo: m.tipo,
          concepto: m.concepto,
          monto: Number(m.monto),
        }),
      );

      setMovimientosCaja(movimientosNormalizados);

      const cajasNormalizadas: Caja[] = cajasData.map((c: any) => ({
        id: c.id,
        comercioId: c.comercio_id,
        abierta: Boolean(c.abierta),
        fechaApertura: c.fecha_apertura,
        fechaCierre: c.fecha_cierre,
        saldoInicial: Number(c.saldo_inicial),
        saldoFinalReal:
          c.saldo_final_real === null ? null : Number(c.saldo_final_real),
      }));

      const cajaAbierta = cajasNormalizadas.find((c) => c.abierta);
      setCaja(cajaAbierta || cajaVacia(comercioId));

      const movimientosPorCaja = new Map<number, MovimientoCaja[]>();

      movimientosNormalizados.forEach((movimiento) => {
        const movimientosExistentes =
          movimientosPorCaja.get(movimiento.cajaId) || [];
        movimientosExistentes.push(movimiento);
        movimientosPorCaja.set(movimiento.cajaId, movimientosExistentes);
      });

      const historial = cajasNormalizadas
        .filter((c) => !c.abierta && c.fechaCierre && c.saldoFinalReal !== null)
        .map((c) => {
          const movimientosDeCaja = movimientosPorCaja.get(c.id) || [];

          const ingresos = movimientosDeCaja
            .filter((m) => m.tipo === "Ingreso")
            .reduce((acc, m) => acc + m.monto, 0);

          const egresos = movimientosDeCaja
            .filter((m) => m.tipo === "Egreso")
            .reduce((acc, m) => acc + m.monto, 0);

          const saldoEsperado = c.saldoInicial + ingresos - egresos;
          const saldoFinalReal = c.saldoFinalReal || 0;

          return {
            id: c.id,
            fechaApertura: c.fechaApertura,
            fechaCierre: c.fechaCierre || "",
            saldoInicial: c.saldoInicial,
            ingresos,
            egresos,
            saldoEsperado,
            saldoFinalReal,
            diferencia: saldoFinalReal - saldoEsperado,
          };
        });

      setHistorialCajas(historial);
    } catch (error: any) {
      alert(
        "Error al cargar cajas y movimientos: " +
          (error?.message || error),
      );
    }
  }
  async function cargarGastos(comercioId: number) {
    try {
      const data = await cargarTodosLosRegistrosPorBloques((desde, hasta) =>
        supabase
          .from("gastos")
          .select("*")
          .eq("comercio_id", comercioId)
          .order("id", { ascending: true })
          .range(desde, hasta),
      );

      const gastosNormalizados = data
        .map((g: any) => ({
          id: g.id,
          comercioId: g.comercio_id,
          fecha: g.fecha,
          categoria: g.categoria || "",
          concepto: g.concepto || "",
          proveedor: g.proveedor || "",
          monto: Number(g.monto || 0),
          medioPago: g.medio_pago || "",
          observaciones: g.observaciones || "",
        }))
        .sort(
          (a: Gasto, b: Gasto) =>
            new Date(b.fecha).getTime() - new Date(a.fecha).getTime(),
        );

      setGastos(gastosNormalizados);
    } catch (error: any) {
      alert("Error al cargar gastos: " + (error?.message || error));
    }
  }
  async function cargarCapacitaciones(comercioId: number, rol?: string) {
    const { data: capacitacionesData, error: capacitacionesError } =
      await supabase
        .from("capacitaciones")
        .select("*")
        .order("fecha_inicio", { ascending: true, nullsFirst: false });

    if (capacitacionesError) {
      alert("Error al cargar capacitaciones: " + capacitacionesError.message);
      return;
    }

    let inscripcionesQuery = supabase
      .from("capacitaciones_inscripciones")
      .select("*")
      .order("created_at", { ascending: false });

    if ((rol || rolUsuario) !== "admin_secretaria") {
      inscripcionesQuery = inscripcionesQuery.eq("comercio_id", comercioId);
    }

    const { data: inscripcionesData, error: inscripcionesError } =
      await inscripcionesQuery;

    if (inscripcionesError) {
      alert("Error al cargar inscripciones: " + inscripcionesError.message);
      return;
    }

    setCapacitaciones(
      (capacitacionesData || []).map((c: any) => ({
        id: c.id,
        titulo: c.titulo,
        descripcion: c.descripcion || "",
        modalidad: c.modalidad || "",
        lugar: c.lugar || "",
        fechaInicio: c.fecha_inicio,
        fechaFin: c.fecha_fin,
        cupos: c.cupos === null ? null : Number(c.cupos),
        destinatarios: c.destinatarios || "",
        link: c.link || "",
        estado: c.estado || "activa",
        createdAt: c.created_at,
      })),
    );

    setInscripcionesCapacitaciones(
      (inscripcionesData || []).map((i: any) => ({
        id: i.id,
        capacitacionId: i.capacitacion_id,
        userId: i.user_id,
        comercioId: i.comercio_id,
        nombreComercio: i.nombre_comercio || "",
        emailUsuario: i.email_usuario || "",
        nombreInscripto: i.nombre_inscripto || "",
        telefonoInscripto: i.telefono_inscripto || "",
        observaciones: i.observaciones || "",
        estado: i.estado || "inscripto",
        createdAt: i.created_at,
      })),
    );
  }

  async function iniciarSesion() {
    if (!email || !password) {
      alert("Ingresá email y contraseña.");
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      alert("Error al iniciar sesión: " + error.message);
    }
  }

  async function registrarse() {
    if (!registroEmail || !registroPassword || !registroNombreComercio) {
      alert("Completá email, contraseña y nombre del comercio.");
      return;
    }

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: registroEmail,
      password: registroPassword,
    });

    if (authError) {
      alert("Error al registrar usuario: " + authError.message);
      return;
    }

    const user = authData.user;

    if (!user) {
      alert("No se pudo crear el usuario.");
      return;
    }

    const { data: comercioData, error: comercioError } = await supabase
      .from("comercios")
      .insert({
        nombre: registroNombreComercio,
        rubro: registroRubro,
        telefono: registroTelefono,
        direccion: registroDireccion,
        email: registroEmail,
        estado: "activo",
        owner_id: user.id,
      })
      .select()
      .single();

    if (comercioError) {
      alert(
        "El usuario se creó, pero falló la creación del comercio: " +
          comercioError.message,
      );
      return;
    }

    const { error: relacionError } = await supabase
      .from("usuarios_comercios")
      .insert({
        user_id: user.id,
        comercio_id: comercioData.id,
        rol: "admin_comercio",
      });

    if (relacionError) {
      alert(
        "El comercio se creó, pero falló la vinculación del usuario: " +
          relacionError.message,
      );
      return;
    }

    setUsuario(user);
    setComercioActual({
      id: comercioData.id,
      nombre: comercioData.nombre,
      rubro: comercioData.rubro || "",
      direccion: comercioData.direccion || "",
      telefono: comercioData.telefono || "",
      email: comercioData.email || "",
      estado: comercioData.estado || "activo",
    });

    setRegistroEmail("");
    setRegistroPassword("");
    setRegistroNombreComercio("");
    setRegistroRubro("");
    setRegistroTelefono("");
    setRegistroDireccion("");
    setRolUsuario("admin_comercio");
    setModoRegistro(false);

    alert("Cuenta y comercio creados correctamente.");
  }

  async function cerrarSesion() {
    await supabase.auth.signOut();

    setUsuario(null);
    setComercioActual(null);
    setProductos([]);
    setIngresosStock([]);
    setClientes([]);
    setVentas([]);
    setPedidosOnline([]);
    setMovimientosOnline([]);
    setMovimientosCaja([]);
    setHistorialCajas([]);
    setGastos([]);
    setCapacitaciones([]);
    setInscripcionesCapacitaciones([]);
    setRolUsuario("admin_comercio");
    setEstadoRelacionUsuario("activo");
    setAccesoTotalUsuario(false);
    setPermisosUsuario({});
    setCaja(cajaVacia());
  }

  const movimientosCajaActual = movimientosCaja.filter(
    (mov) => mov.cajaId === caja.id,
  );
  const ventasActivas = ventas.filter((venta) => venta.estado !== "anulada");
  const ventasCajaActual = ventasActivas.filter(
    (venta) => venta.cajaId === caja.id,
  );
  const ventasDelDia = ventasActivas.reduce(
    (acc, venta) => acc + venta.total,
    0,
  );
  const productosStockBajo = productos.filter(
    (producto) => producto.activo && producto.stock < producto.minimo,
  );
  const productosSinStock = productos.filter(
    (producto) => producto.activo && producto.stock <= 0,
  );
  const productosConStockBajo = productosStockBajo.filter(
    (producto) => producto.stock > 0,
  );
  const ventasHoy = ventasActivas
    .filter((venta) => esFechaDeHoy(venta.fecha))
    .reduce((acc, venta) => acc + venta.total, 0);
  const gastosHoy = gastos
    .filter((gasto) => esFechaDeHoy(gasto.fecha))
    .reduce((acc, gasto) => acc + gasto.monto, 0);
  const resultadoHoy = ventasHoy - gastosHoy;

  const ingresosCaja = movimientosCajaActual
    .filter((mov) => mov.tipo === "Ingreso")
    .reduce((acc, mov) => acc + mov.monto, 0);

  const egresosCaja = movimientosCajaActual
    .filter((mov) => mov.tipo === "Egreso")
    .reduce((acc, mov) => acc + mov.monto, 0);

  const saldoCajaEstimado = caja.abierta
    ? caja.saldoInicial + ingresosCaja - egresosCaja
    : 0;

  const esSecretaria = rolUsuario === "admin_secretaria";
  const alertasComercio: AlertaComercio[] = [];

  if (!esSecretaria) {
    if (productosSinStock.length > 0) {
      alertasComercio.push({
        id: "productos-sin-stock",
        titulo: "Productos sin stock",
        detalle: `${productosSinStock.length} ${productosSinStock.length === 1 ? "producto quedó" : "productos quedaron"} sin unidades disponibles.`,
        nivel: "critica",
        seccion: "productos",
      });
    }

    if (productosConStockBajo.length > 0) {
      alertasComercio.push({
        id: "productos-stock-bajo",
        titulo: "Stock por debajo del mínimo",
        detalle: `${productosConStockBajo.length} ${productosConStockBajo.length === 1 ? "producto necesita" : "productos necesitan"} reposición.`,
        nivel: "advertencia",
        seccion: "productos",
      });
    }

    if (caja.abierta) {
      const abiertaDesdeOtroDia = !esFechaDeHoy(caja.fechaApertura);

      alertasComercio.push({
        id: "caja-abierta",
        titulo: abiertaDesdeOtroDia
          ? "Caja abierta desde un día anterior"
          : "Caja actualmente abierta",
        detalle: caja.fechaApertura
          ? `La caja fue abierta el ${formatDate(caja.fechaApertura)}. Recordá cerrarla al finalizar la jornada.`
          : "Hay una caja abierta. Recordá cerrarla al finalizar la jornada.",
        nivel: abiertaDesdeOtroDia ? "critica" : "informativa",
        seccion: "caja",
      });
    }

    if (gastosHoy > ventasHoy && gastosHoy > 0) {
      alertasComercio.push({
        id: "resultado-diario-negativo",
        titulo: "Los gastos de hoy superan las ventas",
        detalle: `Ventas de hoy: ${money(ventasHoy)} · Gastos de hoy: ${money(gastosHoy)} · Diferencia: ${money(resultadoHoy)}.`,
        nivel: "advertencia",
        seccion: "gastos",
      });
    }

    const inicioDeHoy = new Date();
    inicioDeHoy.setHours(0, 0, 0, 0);

    const capacitacionesDisponibles = capacitaciones
      .filter((capacitacion) => capacitacion.estado !== "finalizada")
      .filter((capacitacion) => {
        if (!capacitacion.fechaFin) return true;

        const fechaFin = new Date(capacitacion.fechaFin);
        return (
          Number.isNaN(fechaFin.getTime()) ||
          fechaFin.getTime() >= inicioDeHoy.getTime()
        );
      })
      .filter(
        (capacitacion) =>
          !inscripcionesCapacitaciones.some(
            (inscripcion) =>
              inscripcion.capacitacionId === capacitacion.id &&
              inscripcion.comercioId === comercioActual?.id,
          ),
      )
      .sort((a, b) => {
        const fechaA = a.fechaInicio
          ? new Date(a.fechaInicio).getTime()
          : Number.POSITIVE_INFINITY;
        const fechaB = b.fechaInicio
          ? new Date(b.fechaInicio).getTime()
          : Number.POSITIVE_INFINITY;

        return fechaA - fechaB;
      })
      .slice(0, 5);

    capacitacionesDisponibles.forEach((capacitacion) => {
      const detalle = [
        capacitacion.modalidad || "Modalidad a confirmar",
        capacitacion.fechaInicio
          ? `Inicio: ${formatDate(capacitacion.fechaInicio)}`
          : "Fecha a confirmar",
        capacitacion.lugar ? `Lugar: ${capacitacion.lugar}` : "",
      ]
        .filter(Boolean)
        .join(" · ");

      alertasComercio.push({
        id: `capacitacion-${capacitacion.id}`,
        titulo: `Capacitación disponible: ${capacitacion.titulo}`,
        detalle,
        nivel: "informativa",
        seccion: "capacitaciones",
      });
    });
  }

  if (cargandoUsuario) {
    return (
      <main className="app-main" style={styles.main}>
        <ResponsiveStyles />
        <div style={{ padding: 40 }}>
          <p>Cargando sistema...</p>
        </div>
      </main>
    );
  }

  if (!usuario) {
    if (tokenInvitacion) {
      return (
        <main className="app-login-main" style={styles.loginMain}>
          <ResponsiveStyles />
          <section className="app-login-box" style={styles.loginBox}>
            <h1 style={styles.loginTitle}>Invitación a un comercio</h1>
            <p style={styles.loginText}>
              Ingresá o creá una cuenta usando exactamente el correo que recibió
              la invitación. No se creará un comercio nuevo.
            </p>

            <input
              style={styles.input}
              placeholder="Correo invitado"
              value={emailInvitado}
              onChange={(e) => setEmailInvitado(e.target.value)}
            />

            <input
              style={{ ...styles.input, marginTop: 12 }}
              placeholder="Contraseña"
              type="password"
              value={passwordInvitado}
              onChange={(e) => setPasswordInvitado(e.target.value)}
            />

            <div style={{ marginTop: 18 }}>
              <button
                style={styles.button}
                onClick={
                  modoRegistroInvitado
                    ? registrarseComoInvitado
                    : iniciarSesionComoInvitado
                }
              >
                {modoRegistroInvitado
                  ? "Crear cuenta de empleado"
                  : "Ingresar y aceptar invitación"}
              </button>
            </div>

            <button
              style={{ ...styles.secondaryButton, marginTop: 12 }}
              onClick={() => setModoRegistroInvitado((valor) => !valor)}
            >
              {modoRegistroInvitado
                ? "Ya tengo una cuenta"
                : "Todavía no tengo una cuenta"}
            </button>
          </section>
        </main>
      );
    }

    return (
      <main className="app-login-main" style={styles.loginMain}>
        <ResponsiveStyles />
        <section className="app-login-box" style={styles.loginBox}>
          <h1 style={styles.loginTitle}>Sistema de Gestión para Comercios</h1>

          {!modoRegistro ? (
            <>
              <p style={styles.loginText}>Ingresá con tu usuario.</p>

              <input
                style={styles.input}
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />

              <input
                style={{ ...styles.input, marginTop: 12 }}
                placeholder="Contraseña"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />

              <div style={{ marginTop: 18 }}>
                <button style={styles.button} onClick={iniciarSesion}>
                  Iniciar sesión
                </button>
              </div>

              <p
                style={{ ...styles.loginText, marginTop: 20, marginBottom: 0 }}
              >
                ¿No tenés cuenta?
              </p>

              <button
                style={{ ...styles.secondaryButton, marginTop: 10 }}
                onClick={() => setModoRegistro(true)}
              >
                Crear cuenta para mi comercio
              </button>
            </>
          ) : (
            <>
              <p style={styles.loginText}>
                Creá tu usuario y el espacio de gestión para tu comercio.
              </p>

              <input
                style={styles.input}
                placeholder="Email"
                value={registroEmail}
                onChange={(e) => setRegistroEmail(e.target.value)}
              />

              <input
                style={{ ...styles.input, marginTop: 12 }}
                placeholder="Contraseña"
                type="password"
                value={registroPassword}
                onChange={(e) => setRegistroPassword(e.target.value)}
              />

              <input
                style={{ ...styles.input, marginTop: 12 }}
                placeholder="Nombre del comercio"
                value={registroNombreComercio}
                onChange={(e) => setRegistroNombreComercio(e.target.value)}
              />

              <input
                style={{ ...styles.input, marginTop: 12 }}
                placeholder="Rubro"
                value={registroRubro}
                onChange={(e) => setRegistroRubro(e.target.value)}
              />

              <input
                style={{ ...styles.input, marginTop: 12 }}
                placeholder="Teléfono"
                value={registroTelefono}
                onChange={(e) => setRegistroTelefono(e.target.value)}
              />

              <input
                style={{ ...styles.input, marginTop: 12 }}
                placeholder="Dirección opcional"
                value={registroDireccion}
                onChange={(e) => setRegistroDireccion(e.target.value)}
              />

              <div style={{ marginTop: 18 }}>
                <button style={styles.button} onClick={registrarse}>
                  Crear cuenta
                </button>
              </div>

              <button
                style={{ ...styles.secondaryButton, marginTop: 12 }}
                onClick={() => setModoRegistro(false)}
              >
                Volver al inicio de sesión
              </button>
            </>
          )}
        </section>
      </main>
    );
  }

  if (estadoRelacionUsuario === "suspendido") {
    return (
      <main className="app-login-main" style={styles.loginMain}>
        <ResponsiveStyles />
        <section className="app-login-box" style={styles.loginBox}>
          <h1 style={styles.loginTitle}>Acceso suspendido</h1>
          <p style={styles.loginText}>
            El administrador del comercio suspendió temporalmente esta cuenta.
          </p>
          <button style={styles.button} onClick={cerrarSesion}>
            Cerrar sesión
          </button>
        </section>
      </main>
    );
  }

  if (procesandoInvitacion) {
    return (
      <main className="app-main" style={styles.main}>
        <ResponsiveStyles />
        <div style={{ padding: 40 }}>
          <p>Aceptando invitación y vinculando la cuenta...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="app-main" style={styles.main}>
        <ResponsiveStyles />
      <div className="app-layout" style={styles.layout}>
        <Sidebar
          seccion={seccion}
          setSeccion={setSeccion}
          emailUsuario={usuario.email}
          comercioActual={comercioActual}
          rolUsuario={rolUsuario}
          accesoTotalUsuario={accesoTotalUsuario}
          permisosUsuario={permisosUsuario}
          cerrarSesion={cerrarSesion}
        />

        <section className="app-content" style={styles.content}>
          {cargandoDatos && (
            <Panel title="Cargando datos">
              <Empty text="Leyendo información desde Supabase..." />
            </Panel>
          )}

          {seccion === "inicio" && (
            <Inicio
              comercioActual={comercioActual}
              ventasDelDia={ventasDelDia}
              caja={caja}
              productos={productos}
              productosStockBajo={productosStockBajo}
              ventas={ventasActivas}
              saldoCajaEstimado={saldoCajaEstimado}
              ventasCajaActual={ventasCajaActual}
              alertas={alertasComercio}
              mostrarCentroAlertas={!esSecretaria}
              estadoSincronizacion={estadoSincronizacion}
              setSeccion={setSeccion}
            />
          )}

          {seccion === "miComercio" && (
            <MiComercio
              comercioActual={comercioActual}
              setComercioActual={setComercioActual}
              rolUsuario={rolUsuario}
            />
          )}

          {seccion === "productos" && (
            <Productos
              productos={productos}
              setProductos={setProductos}
              ingresosStock={ingresosStock}
              comercioActual={comercioActual}
              recargarDatos={cargarDatos}
            />
          )}

          {seccion === "ventas" && (
            <Ventas
              productos={productos}
              ventas={ventas}
              setVentas={setVentas}
              clientes={clientes}
              caja={caja}
              setMovimientosCaja={setMovimientosCaja}
              recargarDatos={cargarDatos}
              comercioActual={comercioActual}
              rolUsuario={rolUsuario}
            />
          )}

          {seccion === "pedidos" && (
            <PedidosOnline
              pedidos={pedidosOnline}
              movimientosOnline={movimientosOnline}
              productos={productos}
              comercioActual={comercioActual}
              recargarDatos={cargarDatos}
              rolUsuario={rolUsuario}
              accesoTotalUsuario={accesoTotalUsuario}
              permisosUsuario={permisosUsuario}
            />
          )}

          {seccion === "caja" && (
            <Caja
              caja={caja}
              setCaja={setCaja}
              movimientosCajaActual={movimientosCajaActual}
              setMovimientosCaja={setMovimientosCaja}
              saldoCajaEstimado={saldoCajaEstimado}
              ingresosCaja={ingresosCaja}
              egresosCaja={egresosCaja}
              historialCajas={historialCajas}
              recargarDatos={cargarDatos}
              comercioActual={comercioActual}
            />
          )}

          {seccion === "clientes" && (
            <Clientes
              clientes={clientes}
              setClientes={setClientes}
              comercioActual={comercioActual}
              ventas={ventasActivas}
            />
          )}

          {seccion === "gastos" && (
            <Gastos
              gastos={gastos}
              setGastos={setGastos}
              comercioActual={comercioActual}
              recargarDatos={cargarDatos}
            />
          )}

          {seccion === "capacitaciones" && (
            <Capacitaciones
              capacitaciones={capacitaciones}
              setCapacitaciones={setCapacitaciones}
              inscripciones={inscripcionesCapacitaciones}
              setInscripciones={setInscripcionesCapacitaciones}
              comercioActual={comercioActual}
              usuario={usuario}
              rolUsuario={rolUsuario}
              recargarDatos={cargarDatos}
            />
          )}

          {seccion === "reportes" && (
            <Reportes
              ventas={ventasActivas}
              productos={productos}
              ventasDelDia={ventasDelDia}
              productosStockBajo={productosStockBajo}
              ingresosCaja={ingresosCaja}
              egresosCaja={egresosCaja}
              saldoCajaEstimado={saldoCajaEstimado}
              historialCajas={historialCajas}
              gastos={gastos}
              clientes={clientes}
            />
          )}
        </section>
      </div>
    </main>
  );
}

function MiComercio({
  comercioActual,
  setComercioActual,
  rolUsuario,
}: {
  comercioActual: Comercio | null;
  setComercioActual: React.Dispatch<React.SetStateAction<Comercio | null>>;
  rolUsuario: string;
}) {
  const puedeGestionarEquipo =
    rolUsuario === "admin_comercio" || rolUsuario === "admin_secretaria";

  const [pestana, setPestana] = useState<"datos" | "equipo">("datos");
  const [nombre, setNombre] = useState(comercioActual?.nombre || "");
  const [rubro, setRubro] = useState(comercioActual?.rubro || "");
  const [direccion, setDireccion] = useState(comercioActual?.direccion || "");
  const [telefono, setTelefono] = useState(comercioActual?.telefono || "");
  const [email, setEmail] = useState(comercioActual?.email || "");

  const [equipo, setEquipo] = useState<MiembroEquipo[]>([]);
  const [invitaciones, setInvitaciones] = useState<InvitacionComercio[]>([]);
  const [cargandoEquipo, setCargandoEquipo] = useState(false);
  const [errorEquipo, setErrorEquipo] = useState("");

  const [mostrarInvitacion, setMostrarInvitacion] = useState(false);
  const [emailInvitacion, setEmailInvitacion] = useState("");
  const [accesoTotalInvitacion, setAccesoTotalInvitacion] = useState(false);
  const [permisosInvitacion, setPermisosInvitacion] = useState<
    Record<string, boolean>
  >({});
  const [creandoInvitacion, setCreandoInvitacion] = useState(false);

  const [miembroEditando, setMiembroEditando] =
    useState<MiembroEquipo | null>(null);
  const [estadoEditando, setEstadoEditando] = useState("activo");
  const [accesoTotalEditando, setAccesoTotalEditando] = useState(false);
  const [permisosEditando, setPermisosEditando] = useState<
    Record<string, boolean>
  >({});
  const [guardandoPermisos, setGuardandoPermisos] = useState(false);

  useEffect(() => {
    setNombre(comercioActual?.nombre || "");
    setRubro(comercioActual?.rubro || "");
    setDireccion(comercioActual?.direccion || "");
    setTelefono(comercioActual?.telefono || "");
    setEmail(comercioActual?.email || "");
  }, [comercioActual]);

  useEffect(() => {
    if (!puedeGestionarEquipo && pestana === "equipo") {
      setPestana("datos");
    }
  }, [puedeGestionarEquipo, pestana]);

  useEffect(() => {
    if (
      pestana === "equipo" &&
      puedeGestionarEquipo &&
      comercioActual?.id
    ) {
      cargarEquipoCompleto();
    }
  }, [pestana, puedeGestionarEquipo, comercioActual?.id]);

  async function guardarDatosComercio() {
    if (!comercioActual) {
      alert("No hay comercio asociado.");
      return;
    }

    if (!nombre.trim()) {
      alert("El nombre del comercio es obligatorio.");
      return;
    }

    const { data, error } = await supabase
      .from("comercios")
      .update({
        nombre: nombre.trim(),
        rubro: rubro.trim(),
        direccion: direccion.trim(),
        telefono: telefono.trim(),
        email: email.trim(),
      })
      .eq("id", comercioActual.id)
      .select()
      .single();

    if (error) {
      alert("Error al actualizar el comercio: " + error.message);
      return;
    }

    setComercioActual({
      id: data.id,
      nombre: data.nombre,
      rubro: data.rubro || "",
      direccion: data.direccion || "",
      telefono: data.telefono || "",
      email: data.email || "",
      estado: data.estado || "activo",
    });

    alert("Datos del comercio actualizados.");
  }

  function normalizarMiembro(item: any): MiembroEquipo {
    return {
      relacionId: Number(item.relacion_id),
      userId: item.user_id,
      email: item.email || "Sin correo",
      rol: item.rol,
      estado: item.estado || "activo",
      accesoTotal: Boolean(item.acceso_total),
      permisos: item.permisos || {},
      fechaAsociacion: item.fecha_asociacion,
      ultimoAcceso: item.ultimo_acceso || null,
      updatedAt: item.updated_at,
    };
  }

  function normalizarInvitacion(item: any): InvitacionComercio {
    return {
      id: Number(item.id),
      comercioId: Number(item.comercio_id),
      email: item.email || "",
      token: item.token,
      estado: item.estado || "pendiente",
      accesoTotal: Boolean(item.acceso_total),
      permisos: item.permisos || {},
      fechaExpiracion: item.fecha_expiracion,
      aceptadaAt: item.aceptada_at || null,
      createdAt: item.created_at,
    };
  }

  async function cargarEquipoCompleto() {
    if (!comercioActual) return;

    setCargandoEquipo(true);
    setErrorEquipo("");

    const [equipoRespuesta, invitacionesRespuesta] = await Promise.all([
      supabase.rpc("listar_equipo_comercio", {
        p_comercio_id: comercioActual.id,
      }),
      supabase
        .from("invitaciones_comercios")
        .select("*")
        .eq("comercio_id", comercioActual.id)
        .order("created_at", { ascending: false }),
    ]);

    if (equipoRespuesta.error) {
      console.error("Error al cargar equipo:", equipoRespuesta.error);
      setErrorEquipo(equipoRespuesta.error.message);
      setEquipo([]);
      setCargandoEquipo(false);
      return;
    }

    if (invitacionesRespuesta.error) {
      console.error(
        "Error al cargar invitaciones:",
        invitacionesRespuesta.error,
      );
      setErrorEquipo(invitacionesRespuesta.error.message);
      setInvitaciones([]);
      setCargandoEquipo(false);
      return;
    }

    setEquipo((equipoRespuesta.data || []).map(normalizarMiembro));
    setInvitaciones(
      (invitacionesRespuesta.data || []).map(normalizarInvitacion),
    );
    setCargandoEquipo(false);
  }

  function alternarPermiso(
    clave: string,
    permisos: Record<string, boolean>,
    actualizar: React.Dispatch<
      React.SetStateAction<Record<string, boolean>>
    >,
  ) {
    actualizar({
      ...permisos,
      [clave]: !permisos[clave],
    });
  }

  function limpiarFormularioInvitacion() {
    setEmailInvitacion("");
    setAccesoTotalInvitacion(false);
    setPermisosInvitacion({});
    setMostrarInvitacion(false);
  }

  async function enviarInvitacionDirecta(invitacionId: number) {
    const { data, error } = await supabase.functions.invoke(
      "enviar-invitacion-comercio",
      {
        body: {
          invitacion_id: invitacionId,
        },
      },
    );

    if (error) {
      throw error;
    }

    if (!data?.ok) {
      throw new Error(data?.error || "No se pudo enviar el correo.");
    }

    return data;
  }

  async function crearInvitacion() {
    if (!comercioActual) return;

    const emailNormalizado = emailInvitacion.trim().toLowerCase();

    if (!emailNormalizado || !emailNormalizado.includes("@")) {
      alert("Ingresá un correo electrónico válido.");
      return;
    }

    setCreandoInvitacion(true);

    const { data, error } = await supabase.rpc(
      "crear_invitacion_comercio",
      {
        p_comercio_id: comercioActual.id,
        p_email: emailNormalizado,
        p_acceso_total: accesoTotalInvitacion,
        p_permisos: accesoTotalInvitacion ? {} : permisosInvitacion,
      },
    );

    if (error) {
      setCreandoInvitacion(false);
      alert("No se pudo crear la invitación: " + error.message);
      return;
    }

    const invitacionCreada = Array.isArray(data) ? data[0] : data;
    const invitacionId = Number(invitacionCreada?.id);

    if (!Number.isInteger(invitacionId) || invitacionId <= 0) {
      setCreandoInvitacion(false);
      await cargarEquipoCompleto();
      alert(
        "La invitación se creó, pero no se pudo identificar para enviar el correo.",
      );
      return;
    }

    try {
      await enviarInvitacionDirecta(invitacionId);
      limpiarFormularioInvitacion();
      await cargarEquipoCompleto();
      alert("Invitación creada y enviada por correo correctamente.");
    } catch (error: any) {
      limpiarFormularioInvitacion();
      await cargarEquipoCompleto();
      alert(
        "La invitación se creó, pero el correo no pudo enviarse: " +
          (error?.message || error),
      );
    } finally {
      setCreandoInvitacion(false);
    }
  }

  function obtenerEnlaceInvitacion(invitacion: InvitacionComercio) {
    if (typeof window === "undefined") return "";

    const url = new URL(window.location.href);
    url.search = "";
    url.hash = "";
    url.searchParams.set("invitacion", invitacion.token);
    return url.toString();
  }

  async function copiarEnlaceInvitacion(invitacion: InvitacionComercio) {
    const enlace = obtenerEnlaceInvitacion(invitacion);

    try {
      await navigator.clipboard.writeText(enlace);
      alert("Enlace de invitación copiado.");
    } catch {
      window.prompt("Copiá este enlace:", enlace);
    }
  }

  async function enviarInvitacionPorCorreo(
    invitacion: InvitacionComercio,
  ) {
    try {
      await enviarInvitacionDirecta(invitacion.id);
      alert(`Invitación enviada a ${invitacion.email}.`);
    } catch (error: any) {
      alert(
        "No se pudo enviar la invitación: " +
          (error?.message || error),
      );
    }
  }

  async function cancelarInvitacion(invitacion: InvitacionComercio) {
    if (!confirm(`¿Cancelar la invitación enviada a ${invitacion.email}?`)) {
      return;
    }

    const { error } = await supabase.rpc("cancelar_invitacion_comercio", {
      p_invitacion_id: invitacion.id,
    });

    if (error) {
      alert("No se pudo cancelar la invitación: " + error.message);
      return;
    }

    await cargarEquipoCompleto();
  }

  function abrirEdicionMiembro(miembro: MiembroEquipo) {
    setMiembroEditando(miembro);
    setEstadoEditando(miembro.estado);
    setAccesoTotalEditando(miembro.accesoTotal);
    setPermisosEditando({ ...miembro.permisos });
  }

  function cerrarEdicionMiembro() {
    if (guardandoPermisos) return;
    setMiembroEditando(null);
    setEstadoEditando("activo");
    setAccesoTotalEditando(false);
    setPermisosEditando({});
  }

  async function guardarPermisosMiembro() {
    if (!miembroEditando) return;

    setGuardandoPermisos(true);

    const { error } = await supabase.rpc("actualizar_permisos_empleado", {
      p_relacion_id: miembroEditando.relacionId,
      p_estado: estadoEditando,
      p_acceso_total: accesoTotalEditando,
      p_permisos: accesoTotalEditando ? {} : permisosEditando,
    });

    setGuardandoPermisos(false);

    if (error) {
      alert("No se pudieron actualizar los permisos: " + error.message);
      return;
    }

    cerrarEdicionMiembro();
    await cargarEquipoCompleto();
    alert("Permisos actualizados.");
  }

  async function alternarSuspension(miembro: MiembroEquipo) {
    const nuevoEstado = miembro.estado === "activo" ? "suspendido" : "activo";
    const accion = nuevoEstado === "suspendido" ? "suspender" : "reactivar";

    if (!confirm(`¿Querés ${accion} el acceso de ${miembro.email}?`)) return;

    const { error } = await supabase.rpc("actualizar_permisos_empleado", {
      p_relacion_id: miembro.relacionId,
      p_estado: nuevoEstado,
      p_acceso_total: miembro.accesoTotal,
      p_permisos: miembro.permisos,
    });

    if (error) {
      alert(`No se pudo ${accion} la cuenta: ` + error.message);
      return;
    }

    await cargarEquipoCompleto();
  }

  async function desvincularMiembro(miembro: MiembroEquipo) {
    if (
      !confirm(
        `¿Desvincular a ${miembro.email}? Su cuenta seguirá existiendo, pero perderá el acceso a este comercio.`,
      )
    ) {
      return;
    }

    const { error } = await supabase.rpc("desvincular_empleado_comercio", {
      p_relacion_id: miembro.relacionId,
    });

    if (error) {
      alert("No se pudo desvincular al empleado: " + error.message);
      return;
    }

    await cargarEquipoCompleto();
  }

  function SelectorPermisos({
    accesoTotal,
    setAccesoTotal,
    permisos,
    setPermisos,
  }: {
    accesoTotal: boolean;
    setAccesoTotal: (valor: boolean) => void;
    permisos: Record<string, boolean>;
    setPermisos: React.Dispatch<
      React.SetStateAction<Record<string, boolean>>
    >;
  }) {
    return (
      <div style={{ display: "grid", gap: 16 }}>
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: 14,
            border: "1px solid #bfdbfe",
            borderRadius: 12,
            background: accesoTotal ? "#eff6ff" : "#ffffff",
            cursor: "pointer",
          }}
        >
          <input
            type="checkbox"
            checked={accesoTotal}
            onChange={(e) => setAccesoTotal(e.target.checked)}
          />
          <div>
            <strong style={{ display: "block", color: "#1e3a8a" }}>
              Acceso total
            </strong>
            <span style={{ fontSize: 13, color: "#64748b" }}>
              Podrá usar todas las funciones actuales y futuras del comercio.
            </span>
          </div>
        </label>

        {!accesoTotal && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
              gap: 12,
            }}
          >
            {GRUPOS_PERMISOS.map((grupo) => (
              <div
                key={grupo.titulo}
                style={{
                  border: "1px solid #e2e8f0",
                  borderRadius: 12,
                  padding: 14,
                  background: "#ffffff",
                }}
              >
                <strong
                  style={{ display: "block", color: "#0f172a", marginBottom: 10 }}
                >
                  {grupo.titulo}
                </strong>

                <div style={{ display: "grid", gap: 9 }}>
                  {grupo.permisos.map((permiso) => (
                    <label
                      key={permiso.clave}
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 8,
                        cursor: "pointer",
                        fontSize: 14,
                        color: "#334155",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={Boolean(permisos[permiso.clave])}
                        onChange={() =>
                          alternarPermiso(
                            permiso.clave,
                            permisos,
                            setPermisos,
                          )
                        }
                      />
                      <span>{permiso.etiqueta}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  const invitacionesPendientes = invitaciones.filter(
    (invitacion) => invitacion.estado === "pendiente",
  );

  return (
    <>
      <Header
        title="Mi comercio"
        subtitle="Configuración, información principal y personas asociadas al comercio."
      />

      <div
        style={{
          display: "flex",
          gap: 10,
          flexWrap: "wrap",
          marginBottom: 20,
        }}
      >
        <button
          type="button"
          onClick={() => setPestana("datos")}
          style={{
            padding: "11px 18px",
            borderRadius: 10,
            cursor: "pointer",
            fontWeight: 700,
            border:
              pestana === "datos"
                ? "1px solid #dc2626"
                : "1px solid #cbd5e1",
            background:
              pestana === "datos"
                ? "linear-gradient(135deg, #ef4444, #b91c1c)"
                : "#ffffff",
            color: pestana === "datos" ? "#ffffff" : "#334155",
          }}
        >
          Datos del comercio
        </button>

        {puedeGestionarEquipo && (
          <button
            type="button"
            onClick={() => setPestana("equipo")}
            style={{
              padding: "11px 18px",
              borderRadius: 10,
              cursor: "pointer",
              fontWeight: 700,
              border:
                pestana === "equipo"
                  ? "1px solid #dc2626"
                  : "1px solid #cbd5e1",
              background:
                pestana === "equipo"
                  ? "linear-gradient(135deg, #ef4444, #b91c1c)"
                  : "#ffffff",
              color: pestana === "equipo" ? "#ffffff" : "#334155",
            }}
          >
            Equipo y permisos
          </button>
        )}
      </div>

      {pestana === "datos" && (
        <>
          <Panel title="Datos del comercio">
            <div className="app-form-grid-small" style={styles.formGridSmall}>
              <Input
                placeholder="Nombre del comercio"
                value={nombre}
                onChange={setNombre}
              />
              <Input placeholder="Rubro" value={rubro} onChange={setRubro} />
              <Input
                placeholder="Teléfono / WhatsApp"
                value={telefono}
                onChange={setTelefono}
              />
              <Input
                placeholder="Dirección"
                value={direccion}
                onChange={setDireccion}
              />
              <Input
                placeholder="Email de contacto"
                value={email}
                onChange={setEmail}
              />
              <Button onClick={guardarDatosComercio}>Guardar datos</Button>
            </div>
          </Panel>

          <Panel title="Resumen de cuenta">
            <Row
              left="Comercio"
              right={comercioActual?.nombre || "Sin nombre"}
            />
            <Row left="Rubro" right={comercioActual?.rubro || "Sin rubro"} />
            <Row
              left="Teléfono"
              right={comercioActual?.telefono || "Sin teléfono"}
            />
            <Row left="Estado" right={comercioActual?.estado || "activo"} />
          </Panel>
        </>
      )}

      {pestana === "equipo" && puedeGestionarEquipo && (
        <>
          <Panel title="Invitar empleado">
            {!mostrarInvitacion ? (
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 14,
                  flexWrap: "wrap",
                }}
              >
                <div>
                  <strong style={{ display: "block", color: "#0f172a" }}>
                    Agregá personas con su propia cuenta
                  </strong>
                  <p style={{ margin: "6px 0 0", color: "#64748b" }}>
                    Elegí acceso total o permisos específicos antes de enviar la
                    invitación.
                  </p>
                </div>

                <Button onClick={() => setMostrarInvitacion(true)}>
                  + Invitar empleado
                </Button>
              </div>
            ) : (
              <div style={{ display: "grid", gap: 18 }}>
                <Input
                  placeholder="Correo electrónico del empleado"
                  value={emailInvitacion}
                  onChange={setEmailInvitacion}
                />

                <SelectorPermisos
                  accesoTotal={accesoTotalInvitacion}
                  setAccesoTotal={setAccesoTotalInvitacion}
                  permisos={permisosInvitacion}
                  setPermisos={setPermisosInvitacion}
                />

                <div style={styles.actions}>
                  <Button onClick={crearInvitacion}>
                    {creandoInvitacion
                      ? "Creando invitación..."
                      : "Crear invitación"}
                  </Button>
                  <SecondaryButton onClick={limpiarFormularioInvitacion}>
                    Cancelar
                  </SecondaryButton>
                </div>
              </div>
            )}
          </Panel>

          {invitacionesPendientes.length > 0 && (
            <Panel title="Invitaciones pendientes">
              <div style={{ display: "grid", gap: 12 }}>
                {invitacionesPendientes.map((invitacion) => (
                  <div
                    key={invitacion.id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: 14,
                      flexWrap: "wrap",
                      padding: 14,
                      border: "1px solid #fde68a",
                      borderRadius: 12,
                      background: "#fffbeb",
                    }}
                  >
                    <div>
                      <strong style={{ display: "block", color: "#92400e" }}>
                        {invitacion.email}
                      </strong>
                      <span style={{ fontSize: 13, color: "#78716c" }}>
                        Vence: {formatDate(invitacion.fechaExpiracion)} · {" "}
                        {invitacion.accesoTotal
                          ? "Acceso total"
                          : `${Object.values(invitacion.permisos).filter(Boolean).length} permisos`}
                      </span>
                    </div>

                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <button
                        type="button"
                        style={styles.smallButtonAlt}
                        onClick={() => copiarEnlaceInvitacion(invitacion)}
                      >
                        Copiar enlace
                      </button>
                      <button
                        type="button"
                        style={styles.smallButton}
                        onClick={() => enviarInvitacionPorCorreo(invitacion)}
                      >
                        Enviar por correo
                      </button>
                      <button
                        type="button"
                        style={{
                          ...styles.smallButton,
                          background: "#fee2e2",
                          color: "#991b1b",
                        }}
                        onClick={() => cancelarInvitacion(invitacion)}
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </Panel>
          )}

          <Panel title="Equipo del comercio">
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 12,
                flexWrap: "wrap",
                marginBottom: 18,
              }}
            >
              <p style={{ margin: 0, color: "#64748b" }}>
                Personas que tienen acceso a este comercio.
              </p>

              <button
                type="button"
                style={styles.smallButton}
                onClick={cargarEquipoCompleto}
                disabled={cargandoEquipo}
              >
                {cargandoEquipo ? "Actualizando..." : "Actualizar"}
              </button>
            </div>

            {cargandoEquipo && equipo.length === 0 ? (
              <Empty text="Cargando equipo..." />
            ) : errorEquipo ? (
              <div
                style={{
                  padding: 14,
                  borderRadius: 10,
                  background: "#fee2e2",
                  color: "#991b1b",
                }}
              >
                Error al cargar el equipo: {errorEquipo}
              </div>
            ) : equipo.length === 0 ? (
              <Empty text="Todavía no hay usuarios asociados al comercio." />
            ) : (
              <div style={{ display: "grid", gap: 12 }}>
                {equipo.map((miembro) => {
                  const cantidadPermisos = Object.values(
                    miembro.permisos || {},
                  ).filter(Boolean).length;
                  const esEmpleado = miembro.rol === "empleado";

                  const etiquetaRol =
                    miembro.rol === "admin_secretaria"
                      ? "Secretaría"
                      : miembro.rol === "admin_comercio"
                        ? "Administrador"
                        : "Empleado";

                  return (
                    <div
                      key={miembro.relacionId}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: 16,
                        flexWrap: "wrap",
                        padding: 16,
                        border: "1px solid #e2e8f0",
                        borderRadius: 12,
                        background: "#ffffff",
                      }}
                    >
                      <div>
                        <strong
                          style={{
                            display: "block",
                            color: "#0f172a",
                            marginBottom: 5,
                          }}
                        >
                          {miembro.email}
                        </strong>
                        <span style={{ fontSize: 13, color: "#64748b" }}>
                          {etiquetaRol}
                        </span>
                      </div>

                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          flexWrap: "wrap",
                        }}
                      >
                        <span
                          style={{
                            padding: "6px 10px",
                            borderRadius: 999,
                            fontSize: 12,
                            fontWeight: 700,
                            background:
                              miembro.estado === "activo"
                                ? "#dcfce7"
                                : "#fee2e2",
                            color:
                              miembro.estado === "activo"
                                ? "#166534"
                                : "#991b1b",
                          }}
                        >
                          {miembro.estado === "activo"
                            ? "Activo"
                            : "Suspendido"}
                        </span>

                        <span
                          style={{
                            padding: "6px 10px",
                            borderRadius: 999,
                            fontSize: 12,
                            fontWeight: 700,
                            background: miembro.accesoTotal
                              ? "#dbeafe"
                              : "#f1f5f9",
                            color: miembro.accesoTotal
                              ? "#1d4ed8"
                              : "#475569",
                          }}
                        >
                          {miembro.accesoTotal
                            ? "Acceso total"
                            : `${cantidadPermisos} permisos`}
                        </span>

                        {esEmpleado && (
                          <>
                            <button
                              type="button"
                              style={styles.smallButton}
                              onClick={() => abrirEdicionMiembro(miembro)}
                            >
                              Editar permisos
                            </button>
                            <button
                              type="button"
                              style={styles.smallButtonAlt}
                              onClick={() => alternarSuspension(miembro)}
                            >
                              {miembro.estado === "activo"
                                ? "Suspender"
                                : "Reactivar"}
                            </button>
                            <button
                              type="button"
                              style={{
                                ...styles.smallButton,
                                background: "#fee2e2",
                                color: "#991b1b",
                              }}
                              onClick={() => desvincularMiembro(miembro)}
                            >
                              Desvincular
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Panel>

          {miembroEditando && (
            <Panel title={`Permisos de ${miembroEditando.email}`}>
              <div style={{ display: "grid", gap: 18 }}>
                <label style={{ display: "grid", gap: 7 }}>
                  <span style={{ fontWeight: 700, color: "#334155" }}>
                    Estado de la cuenta
                  </span>
                  <select
                    value={estadoEditando}
                    onChange={(e) => setEstadoEditando(e.target.value)}
                    style={styles.input}
                  >
                    <option value="activo">Activo</option>
                    <option value="suspendido">Suspendido</option>
                  </select>
                </label>

                <SelectorPermisos
                  accesoTotal={accesoTotalEditando}
                  setAccesoTotal={setAccesoTotalEditando}
                  permisos={permisosEditando}
                  setPermisos={setPermisosEditando}
                />

                <div style={styles.actions}>
                  <Button onClick={guardarPermisosMiembro}>
                    {guardandoPermisos
                      ? "Guardando..."
                      : "Guardar permisos"}
                  </Button>
                  <SecondaryButton onClick={cerrarEdicionMiembro}>
                    Cancelar
                  </SecondaryButton>
                </div>
              </div>
            </Panel>
          )}
        </>
      )}
    </>
  );
}

function Sidebar({
  seccion,
  setSeccion,
  emailUsuario,
  comercioActual,
  rolUsuario,
  accesoTotalUsuario,
  permisosUsuario,
  cerrarSesion,
}: {
  seccion: Seccion;
  setSeccion: (seccion: Seccion) => void;
  emailUsuario: string;
  comercioActual: Comercio | null;
  rolUsuario: string;
  accesoTotalUsuario: boolean;
  permisosUsuario: Record<string, boolean>;
  cerrarSesion: () => void;
}) {
  const [menuAbierto, setMenuAbierto] = useState(false);
  const items: { id: Seccion; label: string; icono: string }[] = [
    { id: "inicio", label: "Inicio", icono: "⌂" },
    { id: "miComercio", label: "Mi comercio", icono: "◇" },
    { id: "productos", label: "Productos", icono: "⬡" },
    { id: "clientes", label: "Clientes", icono: "◎" },
    { id: "ventas", label: "Ventas", icono: "↗" },
    { id: "pedidos", label: "Pedidos", icono: "▦" },
    { id: "caja", label: "Caja", icono: "▤" },
    { id: "gastos", label: "Gastos", icono: "−" },
    { id: "reportes", label: "Reportes", icono: "▣" },
    { id: "capacitaciones", label: "Capacitaciones", icono: "✦" },
  ];

  const esAdministrador =
    rolUsuario === "admin_secretaria" || rolUsuario === "admin_comercio";

  function tienePermiso(clave: string) {
    return (
      esAdministrador ||
      accesoTotalUsuario ||
      Boolean(permisosUsuario[clave])
    );
  }

  function puedeVerSeccion(id: Seccion) {
    if (id === "inicio" || id === "capacitaciones") return true;
    if (id === "miComercio") return esAdministrador;

    if (id === "productos") {
      return [
        "productos.ver",
        "productos.crear",
        "productos.editar",
        "productos.eliminar",
        "stock.ingresar",
        "stock.ver_historial",
        "ventas.crear",
      ].some(tienePermiso);
    }

    if (id === "clientes") {
      return [
        "clientes.ver",
        "clientes.crear",
        "clientes.editar",
        "clientes.eliminar",
        "ventas.crear",
      ].some(tienePermiso);
    }

    if (id === "ventas") {
      return ["ventas.ver", "ventas.crear", "ventas.anular"].some(
        tienePermiso,
      );
    }

    if (id === "pedidos") {
      return [
        "pedidos_online.ver",
        "pedidos_online.crear",
        "pedidos_online.gestionar",
        "pedidos_online.cancelar",
        "pedidos_online.configurar",
      ].some(tienePermiso);
    }

    if (id === "caja") {
      return [
        "caja.ver",
        "caja.abrir",
        "caja.cerrar",
        "caja.registrar_movimiento",
        "ventas.crear",
        "ventas.anular",
      ].some(tienePermiso);
    }

    if (id === "gastos") {
      return [
        "gastos.ver",
        "gastos.crear",
        "gastos.editar",
        "gastos.eliminar",
        "reportes.ver",
      ].some(tienePermiso);
    }

    if (id === "reportes") return tienePermiso("reportes.ver");

    return false;
  }

  const itemsVisibles = items.filter((item) => puedeVerSeccion(item.id));

  const etiquetaRol =
    rolUsuario === "admin_secretaria"
      ? "Secretaría"
      : rolUsuario === "admin_comercio"
        ? "Administrador"
        : "Empleado";

  return (
    <aside className="app-sidebar" style={styles.sidebar}>
      <div style={styles.sidebarGridOverlay} />
      <div style={styles.sidebarGlow} />
      <div style={styles.sidebarNeonRail} />

      <div className="app-sidebar-header" style={styles.sidebarHeaderBox}>
        <div style={styles.sidebarEmblem} aria-hidden="true">
          <span style={styles.sidebarEmblemCore}>⬡</span>
        </div>
        <p style={styles.logoKicker}>Centro de gestión</p>
        <h1 style={styles.logo}>{comercioActual?.nombre || "Mi Comercio"}</h1>
        <div style={styles.sidebarSystemTag}>SISTEMA CONECTADO</div>
      </div>

      <button
        type="button"
        className="app-mobile-menu-button"
        onClick={() => setMenuAbierto((valor) => !valor)}
        aria-expanded={menuAbierto}
        aria-controls="menu-principal-comercio"
      >
        <span aria-hidden="true">☰</span>
        <span>{menuAbierto ? "Cerrar menú" : "Abrir menú"}</span>
      </button>

      <div
        id="menu-principal-comercio"
        className={`app-sidebar-body ${menuAbierto ? "open" : ""}`}
      >
        <p className="app-nav-group-title" style={styles.navGroupTitle}>
          Navegación
        </p>

        <nav className="app-sidebar-nav" style={{ marginTop: 10 }}>
          {itemsVisibles.map((item) => {
            const activo = seccion === item.id;

            return (
              <button
                key={item.id}
                className={`app-nav-item ${activo ? "active" : ""}`}
                aria-current={activo ? "page" : undefined}
                onClick={() => {
                  setSeccion(item.id);
                  setMenuAbierto(false);
                }}
                style={{
                  ...styles.navItem,
                  background: activo
                    ? "linear-gradient(90deg, rgba(239,68,68,0.28), rgba(127,29,29,0.10))"
                    : "rgba(8, 15, 29, 0.58)",
                  color: activo ? "#ffffff" : "#cbd5e1",
                  borderColor: activo
                    ? "rgba(248, 113, 113, 0.72)"
                    : "rgba(148, 163, 184, 0.10)",
                  boxShadow: activo
                    ? "inset 4px 0 0 #ef4444, 0 0 24px rgba(239,68,68,0.20)"
                    : "inset 1px 0 0 rgba(255,255,255,0.02)",
                }}
              >
                <span style={styles.navIcon}>{item.icono}</span>
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div style={styles.sidebarIdentity}>
          <span style={styles.rolePill}>{etiquetaRol}</span>
          <p className="app-sidebar-email" style={styles.sidebarEmail}>
            {emailUsuario}
          </p>
        </div>

        <button onClick={cerrarSesion} style={styles.logoutButton}>
          <span aria-hidden="true">⇥</span> Cerrar sesión
        </button>
      </div>
    </aside>
  );
}

function Inicio({
  comercioActual,
  ventasDelDia,
  caja,
  productos,
  productosStockBajo,
  ventas,
  saldoCajaEstimado,
  ventasCajaActual,
  alertas,
  mostrarCentroAlertas,
  estadoSincronizacion,
  setSeccion,
}: {
  comercioActual: Comercio | null;
  ventasDelDia: number;
  caja: Caja;
  productos: Producto[];
  productosStockBajo: Producto[];
  ventas: Venta[];
  saldoCajaEstimado: number;
  ventasCajaActual: Venta[];
  alertas: AlertaComercio[];
  mostrarCentroAlertas: boolean;
  estadoSincronizacion: "conectando" | "activa" | "error";
  setSeccion: (seccion: Seccion) => void;
}) {
  const [mostrarAlertas, setMostrarAlertas] = useState(false);
  const [alertasRevisadas, setAlertasRevisadas] = useState(false);

  const hayCriticas = alertas.some((alerta) => alerta.nivel === "critica");
  const hayAdvertencias = alertas.some(
    (alerta) => alerta.nivel === "advertencia",
  );
  const firmaAlertas = alertas
    .map((alerta) => `${alerta.id}:${alerta.nivel}`)
    .sort()
    .join("|");

  useEffect(() => {
    setAlertasRevisadas(false);
  }, [firmaAlertas]);

  const aparienciaBotonAlertas = hayCriticas
    ? {
        background: "linear-gradient(135deg, #ef4444, #7f1d1d)",
        color: "#ffffff",
        borderColor: "rgba(254, 202, 202, 0.88)",
        boxShadow: "0 0 0 1px rgba(239,68,68,0.25), 0 12px 30px rgba(185,28,28,0.32)",
      }
    : hayAdvertencias
      ? {
          background: "linear-gradient(135deg, #fb923c, #c2410c)",
          color: "#ffffff",
          borderColor: "#fed7aa",
          boxShadow: "0 12px 26px rgba(194,65,12,0.22)",
        }
      : alertas.length > 0
        ? {
            background: "linear-gradient(135deg, #2563eb, #1e40af)",
            color: "#ffffff",
            borderColor: "#bfdbfe",
            boxShadow: "0 12px 26px rgba(37,99,235,0.20)",
          }
        : {
            background: "rgba(255,255,255,0.96)",
            color: "#475569",
            borderColor: "#dbe3ee",
            boxShadow: "0 10px 24px rgba(15,23,42,0.08)",
          };

  return (
    <>
      <Header
        title="Panel principal"
        subtitle={
          comercioActual
            ? `Resumen operativo de ${comercioActual.nombre}.`
            : "Resumen operativo del comercio."
        }
        action={
          <div
            style={{
              display: "flex",
              gap: 10,
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <span
              className="app-sync-badge"
              style={{
                ...styles.syncBadge,
                background:
                  estadoSincronizacion === "activa"
                    ? "rgba(16,185,129,0.10)"
                    : estadoSincronizacion === "error"
                      ? "rgba(239,68,68,0.10)"
                      : "rgba(245,158,11,0.12)",
                color:
                  estadoSincronizacion === "activa"
                    ? "#047857"
                    : estadoSincronizacion === "error"
                      ? "#b91c1c"
                      : "#92400e",
                borderColor:
                  estadoSincronizacion === "activa"
                    ? "rgba(16,185,129,0.28)"
                    : estadoSincronizacion === "error"
                      ? "rgba(239,68,68,0.28)"
                      : "rgba(245,158,11,0.30)",
              }}
            >
              <span style={styles.syncDot} aria-hidden="true" />
              {estadoSincronizacion === "activa"
                ? "Sincronización activa"
                : estadoSincronizacion === "error"
                  ? "Sin conexión en tiempo real"
                  : "Conectando equipos"}
            </span>

            {mostrarCentroAlertas && (
              <button
                type="button"
                className={`app-alert-button ${
                  hayCriticas
                    ? "is-critical"
                    : hayAdvertencias
                      ? "is-warning"
                      : alertas.length > 0
                        ? "is-info"
                        : "is-clear"
                } ${alertasRevisadas ? "is-reviewed" : ""}`}
                style={{
                  ...styles.alertBellButton,
                  ...aparienciaBotonAlertas,
                }}
                onClick={() => {
                  setAlertasRevisadas(true);
                  setMostrarAlertas((valor) => !valor);
                }}
                aria-label="Mostrar u ocultar alertas y novedades"
                aria-expanded={mostrarAlertas}
              >
                <span aria-hidden="true">🔔</span>
                <span>Alertas</span>
                <span style={styles.alertBellCount}>{alertas.length}</span>
              </button>
            )}
          </div>
        }
      />

      {mostrarCentroAlertas && mostrarAlertas && (
        <div className="app-alerts-panel" style={styles.alertsPanel}>
          <div className="app-alerts-header" style={styles.alertsHeader}>
            <div>
              <h3 style={styles.alertsTitle}>Alertas y novedades</h3>
              <p style={styles.alertsSubtitle}>
                Avisos operativos y capacitaciones disponibles para el comercio.
              </p>
            </div>

            <span
              style={{
                ...styles.badge,
                background: alertas.length === 0 ? "#dcfce7" : "#ffedd5",
                color: alertas.length === 0 ? "#166534" : "#9a3412",
              }}
            >
              {alertas.length === 0
                ? "Todo en orden"
                : `${alertas.length} ${alertas.length === 1 ? "aviso" : "avisos"}`}
            </span>
          </div>

          {alertas.length === 0 ? (
            <Empty text="No hay alertas ni novedades activas en este momento." />
          ) : (
            <div style={styles.alertList}>
              {alertas.map((alerta) => {
                const apariencia =
                  alerta.nivel === "critica"
                    ? {
                        etiqueta: "CRÍTICA",
                        icono: "!",
                        fondo: "#fff1f2",
                        borde: "#fecdd3",
                        color: "#be123c",
                      }
                    : alerta.nivel === "advertencia"
                      ? {
                          etiqueta: "ADVERTENCIA",
                          icono: "▲",
                          fondo: "#fff7ed",
                          borde: "#fed7aa",
                          color: "#c2410c",
                        }
                      : {
                          etiqueta: "INFORMACIÓN",
                          icono: "i",
                          fondo: "#eff6ff",
                          borde: "#bfdbfe",
                          color: "#1d4ed8",
                        };

                return (
                  <div
                    key={alerta.id}
                    className="app-alert-item"
                    style={{
                      ...styles.alertItem,
                      background: apariencia.fondo,
                      borderColor: apariencia.borde,
                    }}
                  >
                    <span
                      style={{
                        ...styles.alertIcon,
                        background: apariencia.color,
                      }}
                      aria-hidden="true"
                    >
                      {apariencia.icono}
                    </span>

                    <div style={styles.alertContent}>
                      <span
                        style={{
                          ...styles.alertSeverityLabel,
                          color: apariencia.color,
                        }}
                      >
                        {apariencia.etiqueta}
                      </span>
                      <strong
                        style={{
                          ...styles.alertTitle,
                          color: apariencia.color,
                        }}
                      >
                        {alerta.titulo}
                      </strong>
                      <p style={styles.alertDetail}>{alerta.detalle}</p>
                    </div>

                    <button
                      type="button"
                      style={styles.smallButton}
                      onClick={() => setSeccion(alerta.seccion)}
                    >
                      Ver detalle
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      <div className="app-cards-grid" style={styles.cardsGrid}>
        <Card
          title="Ventas totales"
          value={money(ventasDelDia)}
          description="Importe acumulado de ventas activas."
          tone="blue"
        />
        <Card
          title="Caja abierta"
          value={caja.abierta ? "Sí" : "No"}
          description="Estado actual de la caja compartida."
          tone={caja.abierta ? "green" : "neutral"}
        />
        <Card
          title="Saldo actual caja"
          value={money(saldoCajaEstimado)}
          description="Saldo inicial más ingresos menos egresos."
          tone="purple"
        />
        <Card
          title="Stock bajo"
          value={String(productosStockBajo.length)}
          description="Productos que necesitan reposición."
          tone={productosStockBajo.length > 0 ? "red" : "green"}
        />
      </div>

      <div
        className="app-cards-grid app-cards-grid-three"
        style={styles.cardsGridThree}
      >
        <Card
          title="Productos"
          value={String(productos.length)}
          description="Productos cargados en el comercio."
          tone="cyan"
        />
        <Card
          title="Ventas caja actual"
          value={String(ventasCajaActual.length)}
          description="Operaciones registradas desde la apertura."
          tone="orange"
        />
        <Card
          title="Apertura"
          value={
            caja.fechaApertura ? formatDate(caja.fechaApertura) : "Sin apertura"
          }
          description="Fecha y hora de inicio de la caja actual."
          tone="neutral"
        />
      </div>

      <div className="app-two-columns" style={styles.twoColumns}>
        <Panel title="Últimas ventas">
          {ventas.length === 0 ? (
            <Empty text="Todavía no hay ventas registradas." />
          ) : (
            ventas
              .slice()
              .reverse()
              .slice(0, 5)
              .map((venta) => (
                <Row
                  key={venta.id}
                  left={`Venta - ${venta.medioPago}`}
                  right={money(venta.total)}
                />
              ))
          )}
        </Panel>

        <Panel title="Productos con stock bajo">
          {productosStockBajo.length === 0 ? (
            <Empty text="No hay productos con stock bajo." />
          ) : (
            productosStockBajo.map((producto) => (
              <Row
                key={producto.id}
                left={producto.nombre}
                right={`Stock: ${producto.stock}`}
              />
            ))
          )}
        </Panel>
      </div>
    </>
  );
}

function Productos({
  productos,
  setProductos,
  ingresosStock,
  comercioActual,
  recargarDatos,
}: {
  productos: Producto[];
  setProductos: (productos: Producto[]) => void;
  ingresosStock: IngresoStock[];
  comercioActual: Comercio | null;
  recargarDatos: () => Promise<void>;
}) {
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [productoEditando, setProductoEditando] = useState<Producto | null>(
    null,
  );
  const [productoParaStock, setProductoParaStock] = useState<Producto | null>(
    null,
  );
  const [cantidadIngresoStock, setCantidadIngresoStock] = useState("");
  const [observacionIngresoStock, setObservacionIngresoStock] = useState("");
  const [guardandoIngresoStock, setGuardandoIngresoStock] = useState(false);

  const [form, setForm] = useState({
    nombre: "",
    codigo: "",
    categoria: "",
    precio: "",
    costo: "",
    stock: "",
    minimo: "",
  });

  function limpiarFormulario() {
    setForm({
      nombre: "",
      codigo: "",
      categoria: "",
      precio: "",
      costo: "",
      stock: "",
      minimo: "",
    });

    setProductoEditando(null);
    setMostrarFormulario(false);
  }

  function iniciarEdicion(producto: Producto) {
    setProductoEditando(producto);
    setMostrarFormulario(true);

    setForm({
      nombre: producto.nombre,
      codigo: producto.codigo,
      categoria: producto.categoria,
      precio: String(producto.precio),
      costo: String(producto.costo),
      stock: String(producto.stock),
      minimo: String(producto.minimo),
    });
  }

  function validarFormularioProducto() {
    return (
      form.nombre &&
      form.codigo &&
      form.categoria &&
      form.precio &&
      form.costo &&
      form.stock &&
      form.minimo
    );
  }

  function codigoProductoYaExiste(codigoBuscado: string, ignorarId?: number) {
    const codigoNormalizado = codigoBuscado.trim().toLowerCase();

    return productos.some(
      (producto) =>
        producto.id !== ignorarId &&
        producto.codigo.trim().toLowerCase() === codigoNormalizado,
    );
  }

  async function agregarProducto() {
    if (!comercioActual) {
      alert("No hay comercio asociado.");
      return;
    }

    if (!validarFormularioProducto()) {
      alert("Completá todos los campos.");
      return;
    }

    if (codigoProductoYaExiste(form.codigo)) {
      alert("Ya existe otro producto con ese código de barras.");
      return;
    }

    const { data, error } = await supabase
      .from("productos")
      .insert({
        comercio_id: comercioActual.id,
        nombre: form.nombre,
        codigo: form.codigo.trim(),
        categoria: form.categoria,
        precio: Number(form.precio),
        costo: Number(form.costo),
        stock: Number(form.stock),
        minimo: Number(form.minimo),
        activo: true,
      })
      .select()
      .single();

    if (error) {
      alert("Error al guardar producto: " + error.message);
      return;
    }

    setProductos([...productos, normalizarProducto(data)]);
    limpiarFormulario();
  }

  async function guardarCambiosProducto() {
    if (!comercioActual) {
      alert("No hay comercio asociado.");
      return;
    }

    if (!productoEditando) {
      alert("No hay producto seleccionado para editar.");
      return;
    }

    if (!validarFormularioProducto()) {
      alert("Completá todos los campos.");
      return;
    }

    if (codigoProductoYaExiste(form.codigo, productoEditando.id)) {
      alert("Ya existe otro producto con ese código de barras.");
      return;
    }

    const { data, error } = await supabase
      .from("productos")
      .update({
        nombre: form.nombre,
        codigo: form.codigo.trim(),
        categoria: form.categoria,
        precio: Number(form.precio),
        costo: Number(form.costo),
        stock: Number(form.stock),
        minimo: Number(form.minimo),
      })
      .eq("id", productoEditando.id)
      .eq("comercio_id", comercioActual.id)
      .select()
      .single();

    if (error) {
      alert("Error al editar producto: " + error.message);
      return;
    }

    const productoActualizado = normalizarProducto(data);

    setProductos(
      productos.map((producto) =>
        producto.id === productoActualizado.id ? productoActualizado : producto,
      ),
    );

    limpiarFormulario();
  }

  function iniciarIngresoStock(producto: Producto) {
    setProductoParaStock(producto);
    setCantidadIngresoStock("");
    setObservacionIngresoStock("");
  }

  function cancelarIngresoStock() {
    if (guardandoIngresoStock) return;
    setProductoParaStock(null);
    setCantidadIngresoStock("");
    setObservacionIngresoStock("");
  }

  async function confirmarIngresoStock() {
    if (!comercioActual || !productoParaStock) {
      alert("No hay producto seleccionado.");
      return;
    }

    const cantidad = Number(cantidadIngresoStock);

    if (!Number.isInteger(cantidad) || cantidad <= 0) {
      alert("Ingresá una cantidad entera mayor a cero.");
      return;
    }

    setGuardandoIngresoStock(true);

    const { error } = await supabase.rpc("registrar_ingreso_stock", {
      p_producto_id: productoParaStock.id,
      p_cantidad: cantidad,
      p_observacion: observacionIngresoStock.trim() || null,
    });

    setGuardandoIngresoStock(false);

    if (error) {
      alert("Error al agregar stock: " + error.message);
      return;
    }

    setProductoParaStock(null);
    setCantidadIngresoStock("");
    setObservacionIngresoStock("");
    await recargarDatos();
    alert("Stock agregado y movimiento registrado correctamente.");
  }

  async function cambiarEstadoProducto(producto: Producto) {
    if (!comercioActual) {
      alert("No hay comercio asociado.");
      return;
    }

    const nuevoEstado = !producto.activo;

    const mensaje = nuevoEstado
      ? "¿Querés volver a activar este producto?"
      : "¿Querés desactivar este producto? No se borra, solo deja de aparecer como disponible.";

    if (!confirm(mensaje)) return;

    const { data, error } = await supabase
      .from("productos")
      .update({ activo: nuevoEstado })
      .eq("id", producto.id)
      .eq("comercio_id", comercioActual.id)
      .select()
      .single();

    if (error) {
      alert("Error al cambiar estado del producto: " + error.message);
      return;
    }

    const productoActualizado = normalizarProducto(data);

    setProductos(
      productos.map((p) =>
        p.id === productoActualizado.id ? productoActualizado : p,
      ),
    );
  }

  return (
    <>
      <Header
        title="Productos"
        subtitle="Alta, edición, control de stock y estado del producto."
        action={
          <Button
            onClick={() => {
              if (mostrarFormulario) {
                limpiarFormulario();
              } else {
                setMostrarFormulario(true);
                setProductoEditando(null);
                setForm({
                  nombre: "",
                  codigo: "",
                  categoria: "",
                  precio: "",
                  costo: "",
                  stock: "",
                  minimo: "",
                });
              }
            }}
          >
            + Nuevo producto
          </Button>
        }
      />

      {mostrarFormulario && (
        <Panel title={productoEditando ? "Editar producto" : "Nuevo producto"}>
          <div className="app-form-grid" style={styles.formGrid}>
            <Input
              placeholder="Nombre"
              value={form.nombre}
              onChange={(v) => setForm({ ...form, nombre: v })}
            />

            <Input
              placeholder="Código de barras o código interno"
              value={form.codigo}
              onChange={(v) => setForm({ ...form, codigo: v })}
            />

            <Input
              placeholder="Categoría"
              value={form.categoria}
              onChange={(v) => setForm({ ...form, categoria: v })}
            />

            <Input
              placeholder="Precio"
              type="number"
              value={form.precio}
              onChange={(v) => setForm({ ...form, precio: v })}
            />

            <Input
              placeholder="Costo"
              type="number"
              value={form.costo}
              onChange={(v) => setForm({ ...form, costo: v })}
            />

            <Input
              placeholder="Stock"
              type="number"
              value={form.stock}
              onChange={(v) => setForm({ ...form, stock: v })}
            />

            <Input
              placeholder="Stock mínimo"
              type="number"
              value={form.minimo}
              onChange={(v) => setForm({ ...form, minimo: v })}
            />
          </div>

          <div className="app-actions" style={styles.actions}>
            {productoEditando ? (
              <Button onClick={guardarCambiosProducto}>Guardar cambios</Button>
            ) : (
              <Button onClick={agregarProducto}>Guardar producto</Button>
            )}

            <SecondaryButton onClick={limpiarFormulario}>
              Cancelar
            </SecondaryButton>
          </div>
        </Panel>
      )}

      <Table>
        <thead style={styles.thead}>
          <tr>
            <Th>Producto</Th>
            <Th>Código</Th>
            <Th>Categoría</Th>
            <Th>Precio</Th>
            <Th>Costo</Th>
            <Th>Stock</Th>
            <Th>Estado</Th>
            <Th>Acciones</Th>
          </tr>
        </thead>

        <tbody>
          {productos.map((producto) => {
            const stockBajo = producto.stock < producto.minimo;

            return (
              <tr key={producto.id} style={styles.tr}>
                <Td>{producto.nombre}</Td>
                <Td>{producto.codigo}</Td>
                <Td>{producto.categoria}</Td>
                <Td>{money(producto.precio)}</Td>
                <Td>{money(producto.costo)}</Td>
                <Td>{producto.stock}</Td>
                <Td>
                  {!producto.activo ? (
                    <Badge danger>Inactivo</Badge>
                  ) : (
                    <Badge danger={stockBajo}>
                      {stockBajo ? "Stock bajo" : "Disponible"}
                    </Badge>
                  )}
                </Td>
                <Td>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button
                      style={styles.smallButtonAlt}
                      onClick={() => iniciarIngresoStock(producto)}
                    >
                      + Stock
                    </button>

                    <button
                      style={styles.smallButton}
                      onClick={() => iniciarEdicion(producto)}
                    >
                      Editar
                    </button>

                    <button
                      style={{
                        ...styles.smallButton,
                        background: producto.activo ? "#fee2e2" : "#dcfce7",
                        color: producto.activo ? "#991b1b" : "#166534",
                      }}
                      onClick={() => cambiarEstadoProducto(producto)}
                    >
                      {producto.activo ? "Desactivar" : "Activar"}
                    </button>
                  </div>
                </Td>
              </tr>
            );
          })}
        </tbody>
      </Table>

      <Panel title="Historial de ingresos de stock">
        {ingresosStock.length === 0 ? (
          <Empty text="Todavía no hay ingresos de mercadería registrados." />
        ) : (
          ingresosStock.map((ingreso) => (
            <div key={ingreso.id} className="app-stock-history-item" style={styles.stockHistoryItem}>
              <div>
                <strong style={styles.stockHistoryTitle}>
                  {ingreso.productoNombre}
                </strong>
                <p style={styles.stockHistoryMeta}>
                  {formatDate(ingreso.createdAt)}
                  {ingreso.emailUsuario ? ` · ${ingreso.emailUsuario}` : ""}
                  {ingreso.observacion ? ` · ${ingreso.observacion}` : ""}
                </p>
              </div>
              <div style={styles.stockHistoryNumbers}>
                <strong>+{ingreso.cantidad}</strong>
                <span>
                  {ingreso.stockAnterior} → {ingreso.stockResultante}
                </span>
              </div>
            </div>
          ))
        )}
      </Panel>

      {productoParaStock && (
        <div className="app-modal-backdrop" style={styles.modalBackdrop}>
          <div className="app-modal-box" style={styles.modalBox}>
            <h3 style={styles.panelTitle}>Agregar stock</h3>
            <p style={styles.text}>
              Producto: <strong>{productoParaStock.nombre}</strong>
            </p>
            <p style={styles.text}>
              Stock actual: <strong>{productoParaStock.stock}</strong>
            </p>

            <Input
              placeholder="Cantidad recibida"
              type="number"
              value={cantidadIngresoStock}
              onChange={setCantidadIngresoStock}
            />

            <div style={{ marginTop: 12 }}>
              <Input
                placeholder="Observación opcional (ej.: compra a proveedor)"
                value={observacionIngresoStock}
                onChange={setObservacionIngresoStock}
              />
            </div>

            {Number(cantidadIngresoStock) > 0 && (
              <p style={styles.stockPreview}>
                Nuevo stock: {productoParaStock.stock} + {Number(cantidadIngresoStock)} ={" "}
                <strong>
                  {productoParaStock.stock + Number(cantidadIngresoStock)}
                </strong>
              </p>
            )}

            <div className="app-actions" style={styles.actions}>
              <Button onClick={confirmarIngresoStock}>
                {guardandoIngresoStock ? "Guardando..." : "Confirmar ingreso"}
              </Button>
              <SecondaryButton onClick={cancelarIngresoStock}>
                Cancelar
              </SecondaryButton>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Clientes({
  clientes,
  setClientes,
  comercioActual,
  ventas,
}: {
  clientes: Cliente[];
  setClientes: (clientes: Cliente[]) => void;
  comercioActual: Comercio | null;
  ventas: Venta[];
}) {
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [clienteEditando, setClienteEditando] = useState<Cliente | null>(null);
  const [clienteHistorialId, setClienteHistorialId] = useState<number | null>(
    null,
  );

  function ventasDelCliente(cliente: Cliente) {
    return ventas.filter((venta) => {
      if (venta.clienteId) return venta.clienteId === cliente.id;
      return venta.cliente === cliente.nombre;
    });
  }

  function estadisticasCliente(cliente: Cliente) {
    const historial = ventasDelCliente(cliente);
    const totalGastado = historial.reduce((acc, venta) => acc + venta.total, 0);
    const ticketPromedio =
      historial.length > 0 ? totalGastado / historial.length : 0;
    const ultimaCompra = historial
      .slice()
      .sort(
        (a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime(),
      )[0];

    return {
      historial,
      totalGastado,
      ticketPromedio,
      ultimaCompra,
    };
  }

  function limpiarFormulario() {
    setNombre("");
    setTelefono("");
    setClienteEditando(null);
  }

  function iniciarEdicion(cliente: Cliente) {
    setClienteEditando(cliente);
    setNombre(cliente.nombre);
    setTelefono(cliente.telefono || "");
  }

  function normalizarTelefonoWhatsApp(telefonoCliente: string) {
    let digitos = telefonoCliente.replace(/\D/g, "");

    if (!digitos) return null;

    // Acepta números ya guardados como +54 9... o 54 9...
    if (digitos.startsWith("549")) {
      const numeroNacional = digitos.slice(3);
      return numeroNacional.length === 10 ? digitos : null;
    }

    // Si está guardado con +54 pero sin el 9 móvil, lo agrega.
    if (digitos.startsWith("54")) {
      const numeroNacional = digitos.slice(2).replace(/^0+/, "");
      return numeroNacional.length === 10 ? `549${numeroNacional}` : null;
    }

    // Elimina el 0 usado en llamadas nacionales: 011..., 0221..., etc.
    digitos = digitos.replace(/^0+/, "");

    // Elimina el 15 local cuando fue escrito después del código de área.
    // Ejemplos: 11 15 1234-5678 o 221 15 123-4567.
    for (let largoArea = 2; largoArea <= 4; largoArea += 1) {
      const tieneQuince = digitos.slice(largoArea, largoArea + 2) === "15";
      const resto = digitos.slice(largoArea + 2);

      if (tieneQuince && largoArea + resto.length === 10) {
        digitos = digitos.slice(0, largoArea) + resto;
        break;
      }
    }

    if (digitos.length !== 10) return null;

    return `549${digitos}`;
  }

  function abrirWhatsApp(cliente: Cliente) {
    if (!cliente.telefono.trim()) {
      alert("Este cliente no tiene un teléfono cargado. Editalo antes de abrir WhatsApp.");
      return;
    }

    const telefonoWhatsApp = normalizarTelefonoWhatsApp(cliente.telefono);

    if (!telefonoWhatsApp) {
      alert(
        "No se pudo reconocer el teléfono. Cargalo con código de área, por ejemplo: 11 2345-6789.",
      );
      return;
    }

    window.open(
      `https://wa.me/${telefonoWhatsApp}`,
      "_blank",
      "noopener,noreferrer",
    );
  }

  async function agregarCliente() {
    if (!comercioActual) {
      alert("No hay comercio asociado.");
      return;
    }

    if (!nombre) {
      alert("Ingresá el nombre del cliente.");
      return;
    }

    const { data, error } = await supabase
      .from("clientes")
      .insert({
        comercio_id: comercioActual.id,
        nombre,
        telefono,
      })
      .select()
      .single();

    if (error) {
      alert("Error al guardar cliente: " + error.message);
      return;
    }

    setClientes([
      ...clientes,
      {
        id: data.id,
        comercioId: data.comercio_id,
        nombre: data.nombre,
        telefono: data.telefono || "",
      },
    ]);

    limpiarFormulario();
  }

  async function guardarCambiosCliente() {
    if (!comercioActual || !clienteEditando) {
      alert("No hay cliente seleccionado.");
      return;
    }

    if (!nombre) {
      alert("Ingresá el nombre del cliente.");
      return;
    }

    const { data, error } = await supabase
      .from("clientes")
      .update({ nombre, telefono })
      .eq("id", clienteEditando.id)
      .eq("comercio_id", comercioActual.id)
      .select()
      .single();

    if (error) {
      alert("Error al editar cliente: " + error.message);
      return;
    }

    const clienteActualizado: Cliente = {
      id: data.id,
      comercioId: data.comercio_id,
      nombre: data.nombre,
      telefono: data.telefono || "",
    };

    setClientes(
      clientes.map((cliente) =>
        cliente.id === clienteActualizado.id ? clienteActualizado : cliente,
      ),
    );
    limpiarFormulario();
  }

  return (
    <>
      <Header
        title="Clientes"
        subtitle="Clientes frecuentes, edición de datos e historial de compras."
      />

      <Panel title={clienteEditando ? "Editar cliente" : "Nuevo cliente"}>
        <div className="app-form-grid-small" style={styles.formGridSmall}>
          <Input placeholder="Nombre" value={nombre} onChange={setNombre} />
          <Input
            placeholder="Teléfono"
            value={telefono}
            onChange={setTelefono}
          />
          {clienteEditando ? (
            <Button onClick={guardarCambiosCliente}>Guardar cambios</Button>
          ) : (
            <Button onClick={agregarCliente}>Guardar cliente</Button>
          )}
        </div>

        {clienteEditando && (
          <div className="app-actions" style={styles.actions}>
            <SecondaryButton onClick={limpiarFormulario}>
              Cancelar edición
            </SecondaryButton>
          </div>
        )}
      </Panel>

      <Panel title="Clientes registrados">
        {clientes.length === 0 ? (
          <Empty text="Todavía no hay clientes registrados." />
        ) : (
          clientes.map((cliente) => {
            const stats = estadisticasCliente(cliente);
            const mostrarHistorial = clienteHistorialId === cliente.id;

            return (
              <div key={cliente.id} style={styles.clientCard}>
                <div className="app-client-header" style={styles.clientHeader}>
                  <div>
                    <h4 style={styles.clientName}>{cliente.nombre}</h4>
                    <p style={styles.clientMeta}>
                      {cliente.telefono || "Sin teléfono"}
                    </p>
                  </div>
                  <div style={styles.clientActions}>
                    <button
                      style={styles.smallButton}
                      onClick={() => iniciarEdicion(cliente)}
                    >
                      Editar
                    </button>
                    <button
                      style={styles.smallButtonAlt}
                      onClick={() =>
                        setClienteHistorialId(
                          mostrarHistorial ? null : cliente.id,
                        )
                      }
                    >
                      {mostrarHistorial ? "Ocultar historial" : "Ver historial"}
                    </button>
                    <button
                      type="button"
                      style={{
                        ...styles.smallButton,
                        background: "#dcfce7",
                        color: "#166534",
                      }}
                      onClick={() => abrirWhatsApp(cliente)}
                    >
                      WhatsApp
                    </button>
                  </div>
                </div>

                <div className="app-client-stats-grid" style={styles.clientStatsGrid}>
                  <Card
                    title="Compras"
                    value={String(stats.historial.length)}
                  />
                  <Card
                    title="Total gastado"
                    value={money(stats.totalGastado)}
                  />
                  <Card
                    title="Ticket promedio"
                    value={money(stats.ticketPromedio)}
                  />
                  <Card
                    title="Última compra"
                    value={
                      stats.ultimaCompra
                        ? formatDate(stats.ultimaCompra.fecha)
                        : "Sin compras"
                    }
                  />
                </div>

                {mostrarHistorial && (
                  <div style={{ marginTop: 14 }}>
                    {stats.historial.length === 0 ? (
                      <Empty text="Este cliente todavía no tiene compras registradas." />
                    ) : (
                      stats.historial
                        .slice()
                        .sort(
                          (a, b) =>
                            new Date(b.fecha).getTime() -
                            new Date(a.fecha).getTime(),
                        )
                        .map((venta) => (
                          <div key={venta.id} style={styles.historyBox}>
                            <Row
                              left={`${formatDate(venta.fecha)} - ${venta.medioPago}`}
                              right={money(venta.total)}
                              bold
                            />
                            {venta.items.map((item, index) => (
                              <Row
                                key={index}
                                left={`${item.nombre} x ${item.cantidad}`}
                                right={money(item.subtotal)}
                              />
                            ))}
                          </div>
                        ))
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </Panel>
    </>
  );
}

function PedidosOnline({
  pedidos,
  movimientosOnline,
  productos,
  comercioActual,
  recargarDatos,
  rolUsuario,
  accesoTotalUsuario,
  permisosUsuario,
}: {
  pedidos: PedidoOnline[];
  movimientosOnline: MovimientoOnline[];
  productos: Producto[];
  comercioActual: Comercio | null;
  recargarDatos: () => Promise<void>;
  rolUsuario: string;
  accesoTotalUsuario: boolean;
  permisosUsuario: Record<string, boolean>;
}) {
  type FiltroPedido =
    | "trabajo"
    | "nuevo"
    | "preparacion"
    | "listo"
    | "enviado"
    | "entregado"
    | "problemas"
    | "cancelado";

  type ItemFormularioPedido = {
    productoId: number;
    cantidad: number;
  };

  const esAdministrador =
    rolUsuario === "admin_secretaria" || rolUsuario === "admin_comercio";

  function tienePermiso(clave: string) {
    return (
      esAdministrador ||
      accesoTotalUsuario ||
      Boolean(permisosUsuario[clave])
    );
  }

  const puedeCrear = tienePermiso("pedidos_online.crear");
  const puedeGestionar = tienePermiso("pedidos_online.gestionar");
  const puedeCancelar = tienePermiso("pedidos_online.cancelar");
  const puedeConfigurar = tienePermiso("pedidos_online.configurar");

  const [filtro, setFiltro] = useState<FiltroPedido>("trabajo");
  const [conectandoTiendanube, setConectandoTiendanube] = useState(false);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [productoSeleccionado, setProductoSeleccionado] = useState("");
  const [cantidadSeleccionada, setCantidadSeleccionada] = useState("1");
  const [itemsFormulario, setItemsFormulario] = useState<
    ItemFormularioPedido[]
  >([]);
  const [form, setForm] = useState({
    canal: "Carga manual",
    clienteNombre: "",
    clienteTelefono: "",
    clienteEmail: "",
    tipoEntrega: "retiro" as "retiro" | "envio",
    direccionEntrega: "",
    localidadEntrega: "",
    estadoPago: "pendiente" as "pendiente" | "aprobado",
    medioPago: "",
    costoEnvio: "0",
    observaciones: "",
  });

  const productosActivos = productos.filter((producto) => producto.activo);

  async function conectarTiendanube() {
    if (!comercioActual) {
      alert("No hay comercio asociado.");
      return;
    }

    setConectandoTiendanube(true);

    try {
      const { data, error } = await supabase.functions.invoke(
        "clever-function",
        {
          body: {
            comercio_id: comercioActual.id,
          },
        },
      );

      if (error) {
        console.error("Error al iniciar Tiendanube:", error);
        alert(
          "No se pudo iniciar la conexión con Tiendanube: " +
            error.message,
        );
        return;
      }

      if (!data?.url) {
        alert(
          data?.error ||
            "La función no devolvió la dirección de conexión.",
        );
        return;
      }

      window.location.assign(data.url);
    } catch (error) {
      console.error("Error inesperado al conectar Tiendanube:", error);

      alert(
        error instanceof Error
          ? error.message
          : "Ocurrió un error al conectar Tiendanube.",
      );
    } finally {
      setConectandoTiendanube(false);
    }
  }

  function tieneProblema(pedido: PedidoOnline) {
    return (
      pedido.estadoPago !== "aprobado" ||
      (pedido.estadoPago === "aprobado" && !pedido.stockDescontado) ||
      (pedido.tipoEntrega === "envio" && !pedido.direccionEntrega.trim())
    );
  }

  const pedidosActivos = pedidos.filter(
    (pedido) => pedido.estado !== "entregado" && pedido.estado !== "cancelado",
  );

  const pedidosProblema = pedidos.filter(tieneProblema);
  const pedidosParaPreparar = pedidos.filter(
    (pedido) =>
      pedido.estado === "nuevo" &&
      pedido.estadoPago === "aprobado" &&
      pedido.stockDescontado,
  );

  const ingresosOnline = movimientosOnline
    .filter((movimiento) => movimiento.tipo === "ingreso")
    .reduce((total, movimiento) => total + movimiento.monto, 0);
  const egresosOnline = movimientosOnline
    .filter((movimiento) => movimiento.tipo === "egreso")
    .reduce((total, movimiento) => total + movimiento.monto, 0);
  const saldoOnline = ingresosOnline - egresosOnline;

  const prioridadEstado: Record<PedidoOnline["estado"], number> = {
    nuevo: 1,
    preparacion: 2,
    listo: 3,
    enviado: 4,
    entregado: 5,
    cancelado: 6,
  };

  const proximaTarea = pedidosActivos
    .slice()
    .sort((a, b) => {
      const problemaA = tieneProblema(a) ? 1 : 0;
      const problemaB = tieneProblema(b) ? 1 : 0;

      if (problemaA !== problemaB) return problemaB - problemaA;

      const prioridadA = prioridadEstado[a.estado];
      const prioridadB = prioridadEstado[b.estado];
      if (prioridadA !== prioridadB) return prioridadA - prioridadB;

      return (
        new Date(a.fechaPedido).getTime() -
        new Date(b.fechaPedido).getTime()
      );
    })[0];

  function descripcionSiguienteAccion(pedido: PedidoOnline) {
    if (pedido.estadoPago !== "aprobado") return "Confirmar el pago";
    if (pedido.estado === "nuevo") return "Empezar preparación";
    if (pedido.estado === "preparacion") return "Marcar como listo";
    if (pedido.estado === "listo" && pedido.tipoEntrega === "envio") {
      return "Registrar el envío";
    }
    if (pedido.estado === "listo") return "Entregar al cliente";
    if (pedido.estado === "enviado") return "Confirmar entrega";
    return "Revisar pedido";
  }

  const pedidosFiltrados = pedidos.filter((pedido) => {
    if (filtro === "trabajo") {
      return pedido.estado !== "entregado" && pedido.estado !== "cancelado";
    }
    if (filtro === "problemas") return tieneProblema(pedido);
    return pedido.estado === filtro;
  });

  function limpiarFormulario() {
    setForm({
      canal: "Carga manual",
      clienteNombre: "",
      clienteTelefono: "",
      clienteEmail: "",
      tipoEntrega: "retiro",
      direccionEntrega: "",
      localidadEntrega: "",
      estadoPago: "pendiente",
      medioPago: "",
      costoEnvio: "0",
      observaciones: "",
    });
    setItemsFormulario([]);
    setProductoSeleccionado("");
    setCantidadSeleccionada("1");
    setMostrarFormulario(false);
  }

  function agregarItem() {
    const productoId = Number(productoSeleccionado);
    const cantidad = Number(cantidadSeleccionada);
    const producto = productos.find((item) => item.id === productoId);

    if (!producto) {
      alert("Seleccioná un producto.");
      return;
    }

    if (!Number.isInteger(cantidad) || cantidad <= 0) {
      alert("Ingresá una cantidad entera mayor a cero.");
      return;
    }

    setItemsFormulario((actuales) => {
      const existente = actuales.find(
        (item) => item.productoId === productoId,
      );

      if (existente) {
        return actuales.map((item) =>
          item.productoId === productoId
            ? { ...item, cantidad: item.cantidad + cantidad }
            : item,
        );
      }

      return [...actuales, { productoId, cantidad }];
    });

    setProductoSeleccionado("");
    setCantidadSeleccionada("1");
  }

  function quitarItem(productoId: number) {
    setItemsFormulario((actuales) =>
      actuales.filter((item) => item.productoId !== productoId),
    );
  }

  const totalProductosFormulario = itemsFormulario.reduce((total, item) => {
    const producto = productos.find(
      (productoActual) => productoActual.id === item.productoId,
    );
    return total + (producto?.precio || 0) * item.cantidad;
  }, 0);
  const costoEnvioFormulario = Number(form.costoEnvio || 0);
  const totalFormulario =
    totalProductosFormulario +
    (Number.isFinite(costoEnvioFormulario) ? costoEnvioFormulario : 0);

  async function crearPedido() {
    if (!comercioActual) {
      alert("No hay comercio asociado.");
      return;
    }

    if (!form.clienteNombre.trim()) {
      alert("Ingresá el nombre del cliente.");
      return;
    }

    if (form.tipoEntrega === "envio" && !form.direccionEntrega.trim()) {
      alert("Ingresá la dirección de entrega.");
      return;
    }

    if (itemsFormulario.length === 0) {
      alert("Agregá al menos un producto.");
      return;
    }

    setGuardando(true);

    const { data, error } = await supabase.rpc(
      "crear_pedido_online_manual",
      {
        p_comercio_id: comercioActual.id,
        p_canal: form.canal,
        p_cliente_nombre: form.clienteNombre.trim(),
        p_cliente_telefono: form.clienteTelefono.trim() || null,
        p_cliente_email: form.clienteEmail.trim() || null,
        p_tipo_entrega: form.tipoEntrega,
        p_direccion_entrega:
          form.tipoEntrega === "envio"
            ? form.direccionEntrega.trim()
            : null,
        p_localidad_entrega:
          form.tipoEntrega === "envio"
            ? form.localidadEntrega.trim() || null
            : null,
        p_estado_pago: form.estadoPago,
        p_medio_pago: form.medioPago.trim() || null,
        p_costo_envio:
          form.tipoEntrega === "envio" ? Number(form.costoEnvio || 0) : 0,
        p_observaciones: form.observaciones.trim() || null,
        p_items: itemsFormulario.map((item) => ({
          producto_id: item.productoId,
          cantidad: item.cantidad,
        })),
      },
    );

    setGuardando(false);

    if (error) {
      alert("No se pudo crear el pedido: " + error.message);
      return;
    }

    limpiarFormulario();
    await recargarDatos();

    const numero = data?.numero ? ` ${data.numero}` : "";
    alert(`Pedido${numero} creado correctamente.`);
  }

  async function aprobarPago(pedido: PedidoOnline) {
    if (!puedeGestionar) return;

    const medioPago =
      pedido.medioPago ||
      prompt("Medio de pago", "Mercado Pago")?.trim() ||
      "Venta online";

    const { error } = await supabase.rpc(
      "actualizar_pago_pedido_online",
      {
        p_pedido_id: pedido.id,
        p_estado_pago: "aprobado",
        p_medio_pago: medioPago,
      },
    );

    if (error) {
      alert("No se pudo aprobar el pago: " + error.message);
      return;
    }

    await recargarDatos();
  }

  async function avanzarPedido(pedido: PedidoOnline) {
    if (!puedeGestionar) return;

    let nuevoEstado: PedidoOnline["estado"] | null = null;
    let repartidor: string | null = null;
    let codigoSeguimiento: string | null = null;

    if (pedido.estado === "nuevo") nuevoEstado = "preparacion";
    if (pedido.estado === "preparacion") nuevoEstado = "listo";

    if (pedido.estado === "listo" && pedido.tipoEntrega === "envio") {
      nuevoEstado = "enviado";
      repartidor = prompt(
        "Repartidor o empresa de entrega",
        pedido.repartidor || "",
      );

      if (repartidor === null) return;

      codigoSeguimiento = prompt(
        "Código de seguimiento opcional",
        pedido.codigoSeguimiento || "",
      );

      if (codigoSeguimiento === null) return;
    }

    if (pedido.estado === "listo" && pedido.tipoEntrega === "retiro") {
      if (!confirm("¿Confirmás que el cliente retiró el pedido?")) return;
      nuevoEstado = "entregado";
    }

    if (pedido.estado === "enviado") {
      if (!confirm("¿Confirmás que el pedido fue entregado?")) return;
      nuevoEstado = "entregado";
    }

    if (!nuevoEstado) return;

    const { error } = await supabase.rpc(
      "avanzar_estado_pedido_online",
      {
        p_pedido_id: pedido.id,
        p_nuevo_estado: nuevoEstado,
        p_repartidor: repartidor?.trim() || null,
        p_codigo_seguimiento: codigoSeguimiento?.trim() || null,
      },
    );

    if (error) {
      alert("No se pudo actualizar el pedido: " + error.message);
      return;
    }

    await recargarDatos();
  }

  async function cancelarPedido(pedido: PedidoOnline) {
    if (!puedeCancelar) return;

    const motivo = prompt("Motivo de la cancelación");
    if (motivo === null) return;

    if (motivo.trim().length < 3) {
      alert("Ingresá un motivo válido.");
      return;
    }

    if (
      !confirm(
        "Se cancelará el pedido y, si correspondía, se devolverá el stock. ¿Continuar?",
      )
    ) {
      return;
    }

    const { error } = await supabase.rpc("cancelar_pedido_online", {
      p_pedido_id: pedido.id,
      p_motivo: motivo.trim(),
    });

    if (error) {
      alert("No se pudo cancelar el pedido: " + error.message);
      return;
    }

    await recargarDatos();
  }

  const aparienciaEstado: Record<
    PedidoOnline["estado"],
    { etiqueta: string; fondo: string; color: string }
  > = {
    nuevo: { etiqueta: "Nuevo", fondo: "#dbeafe", color: "#1d4ed8" },
    preparacion: {
      etiqueta: "En preparación",
      fondo: "#fef3c7",
      color: "#92400e",
    },
    listo: { etiqueta: "Listo", fondo: "#dcfce7", color: "#166534" },
    enviado: { etiqueta: "En camino", fondo: "#ede9fe", color: "#6d28d9" },
    entregado: {
      etiqueta: "Entregado",
      fondo: "#d1fae5",
      color: "#065f46",
    },
    cancelado: {
      etiqueta: "Cancelado",
      fondo: "#fee2e2",
      color: "#991b1b",
    },
  };

  const filtros: { id: FiltroPedido; etiqueta: string; cantidad: number }[] = [
    { id: "trabajo", etiqueta: "Para trabajar", cantidad: pedidosActivos.length },
    {
      id: "nuevo",
      etiqueta: "Nuevos",
      cantidad: pedidos.filter((pedido) => pedido.estado === "nuevo").length,
    },
    {
      id: "preparacion",
      etiqueta: "En preparación",
      cantidad: pedidos.filter((pedido) => pedido.estado === "preparacion").length,
    },
    {
      id: "listo",
      etiqueta: "Listos",
      cantidad: pedidos.filter((pedido) => pedido.estado === "listo").length,
    },
    {
      id: "enviado",
      etiqueta: "En camino",
      cantidad: pedidos.filter((pedido) => pedido.estado === "enviado").length,
    },
    {
      id: "problemas",
      etiqueta: "Problemas",
      cantidad: pedidosProblema.length,
    },
    {
      id: "entregado",
      etiqueta: "Entregados",
      cantidad: pedidos.filter((pedido) => pedido.estado === "entregado").length,
    },
    {
      id: "cancelado",
      etiqueta: "Cancelados",
      cantidad: pedidos.filter((pedido) => pedido.estado === "cancelado").length,
    },
  ];

  return (
    <>
      <Header
        title="Pedidos"
        subtitle="Centro de pedidos, preparación, envíos y control de stock online."
        action={
          puedeCrear ? (
            <Button onClick={() => setMostrarFormulario((valor) => !valor)}>
              {mostrarFormulario ? "Cerrar formulario" : "+ Nuevo pedido"}
            </Button>
          ) : undefined
        }
      />

      <div className="app-cards-grid" style={styles.cardsGrid}>
        <Card
          title="Para preparar"
          value={String(pedidosParaPreparar.length)}
          description="Pedidos pagados que esperan preparación."
          tone={pedidosParaPreparar.length > 0 ? "orange" : "green"}
        />
        <Card
          title="Listos"
          value={String(
            pedidos.filter((pedido) => pedido.estado === "listo").length,
          )}
          description="Esperan retiro o despacho."
          tone="green"
        />
        <Card
          title="Con problemas"
          value={String(pedidosProblema.length)}
          description="Pago, stock o datos pendientes."
          tone={pedidosProblema.length > 0 ? "red" : "green"}
        />
        <Card
          title="Saldo online"
          value={money(saldoOnline)}
          description="Ingresos online menos cancelaciones y reembolsos."
          tone="purple"
        />
      </div>

      {proximaTarea && (
        <Panel title="Próxima tarea recomendada">
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 16,
              flexWrap: "wrap",
            }}
          >
            <div>
              <strong style={{ display: "block", marginBottom: 6 }}>
                {descripcionSiguienteAccion(proximaTarea)} · {proximaTarea.numero}
              </strong>
              <span style={{ color: "#64748b" }}>
                {proximaTarea.clienteNombre} · {formatDate(proximaTarea.fechaPedido)}
              </span>
            </div>

            {proximaTarea.estadoPago !== "aprobado" && puedeGestionar ? (
              <Button onClick={() => aprobarPago(proximaTarea)}>
                Confirmar pago
              </Button>
            ) : puedeGestionar ? (
              <Button onClick={() => avanzarPedido(proximaTarea)}>
                {descripcionSiguienteAccion(proximaTarea)}
              </Button>
            ) : null}
          </div>
        </Panel>
      )}

      {mostrarFormulario && puedeCrear && (
        <Panel title="Cargar pedido">
          <div className="app-form-grid" style={styles.formGrid}>
            <select
              style={styles.input}
              value={form.canal}
              onChange={(event) =>
                setForm({ ...form, canal: event.target.value })
              }
            >
              <option>Carga manual</option>
              <option>WhatsApp</option>
              <option>Instagram</option>
              <option>Tiendanube</option>
              <option>Mercado Libre</option>
              <option>WooCommerce</option>
              <option>Otra plataforma</option>
            </select>

            <Input
              placeholder="Nombre del cliente"
              value={form.clienteNombre}
              onChange={(valor) => setForm({ ...form, clienteNombre: valor })}
            />
            <Input
              placeholder="Teléfono"
              value={form.clienteTelefono}
              onChange={(valor) => setForm({ ...form, clienteTelefono: valor })}
            />
            <Input
              placeholder="Correo opcional"
              value={form.clienteEmail}
              onChange={(valor) => setForm({ ...form, clienteEmail: valor })}
            />

            <select
              style={styles.input}
              value={form.tipoEntrega}
              onChange={(event) =>
                setForm({
                  ...form,
                  tipoEntrega:
                    event.target.value === "envio" ? "envio" : "retiro",
                })
              }
            >
              <option value="retiro">Retiro en el local</option>
              <option value="envio">Envío a domicilio</option>
            </select>

            {form.tipoEntrega === "envio" && (
              <>
                <Input
                  placeholder="Dirección de entrega"
                  value={form.direccionEntrega}
                  onChange={(valor) =>
                    setForm({ ...form, direccionEntrega: valor })
                  }
                />
                <Input
                  placeholder="Localidad"
                  value={form.localidadEntrega}
                  onChange={(valor) =>
                    setForm({ ...form, localidadEntrega: valor })
                  }
                />
                <Input
                  placeholder="Costo de envío"
                  type="number"
                  value={form.costoEnvio}
                  onChange={(valor) => setForm({ ...form, costoEnvio: valor })}
                />
              </>
            )}

            <select
              style={styles.input}
              value={form.estadoPago}
              onChange={(event) =>
                setForm({
                  ...form,
                  estadoPago:
                    event.target.value === "aprobado"
                      ? "aprobado"
                      : "pendiente",
                })
              }
            >
              <option value="pendiente">Pago pendiente</option>
              <option value="aprobado">Pago aprobado</option>
            </select>

            <Input
              placeholder="Medio de pago"
              value={form.medioPago}
              onChange={(valor) => setForm({ ...form, medioPago: valor })}
            />
            <Input
              placeholder="Observaciones"
              value={form.observaciones}
              onChange={(valor) => setForm({ ...form, observaciones: valor })}
            />
          </div>

          <div
            style={{
              marginTop: 18,
              padding: 16,
              borderRadius: 12,
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
            }}
          >
            <strong style={{ display: "block", marginBottom: 12 }}>
              Productos del pedido
            </strong>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "minmax(220px, 1fr) 120px auto",
                gap: 10,
                alignItems: "center",
              }}
            >
              <select
                style={styles.input}
                value={productoSeleccionado}
                onChange={(event) =>
                  setProductoSeleccionado(event.target.value)
                }
              >
                <option value="">Seleccionar producto</option>
                {productosActivos.map((producto) => (
                  <option key={producto.id} value={producto.id}>
                    {producto.nombre} · Stock {producto.stock} · {money(producto.precio)}
                  </option>
                ))}
              </select>

              <input
                style={styles.input}
                type="number"
                min="1"
                value={cantidadSeleccionada}
                onChange={(event) =>
                  setCantidadSeleccionada(event.target.value)
                }
              />

              <button
                type="button"
                style={styles.smallButtonAlt}
                onClick={agregarItem}
              >
                Agregar
              </button>
            </div>

            <div style={{ display: "grid", gap: 8, marginTop: 14 }}>
              {itemsFormulario.length === 0 ? (
                <Empty text="Todavía no agregaste productos." />
              ) : (
                itemsFormulario.map((item) => {
                  const producto = productos.find(
                    (productoActual) => productoActual.id === item.productoId,
                  );

                  return (
                    <div
                      key={item.productoId}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: 12,
                        padding: "10px 12px",
                        borderRadius: 10,
                        background: "#ffffff",
                        border: "1px solid #e2e8f0",
                      }}
                    >
                      <span>
                        {item.cantidad} × {producto?.nombre || "Producto"}
                      </span>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <strong>
                          {money((producto?.precio || 0) * item.cantidad)}
                        </strong>
                        <button
                          type="button"
                          style={styles.smallButton}
                          onClick={() => quitarItem(item.productoId)}
                        >
                          Quitar
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                marginTop: 14,
                fontSize: 18,
              }}
            >
              <strong>Total: {money(totalFormulario)}</strong>
            </div>
          </div>

          <div className="app-actions" style={styles.actions}>
            <Button onClick={crearPedido}>
              {guardando ? "Guardando..." : "Crear pedido"}
            </Button>
            <SecondaryButton onClick={limpiarFormulario}>
              Cancelar
            </SecondaryButton>
          </div>
        </Panel>
      )}

      <div
        style={{
          display: "flex",
          gap: 8,
          flexWrap: "wrap",
          marginBottom: 18,
        }}
      >
        {filtros.map((item) => {
          const activo = filtro === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setFiltro(item.id)}
              style={{
                padding: "9px 13px",
                borderRadius: 999,
                border: activo ? "1px solid #dc2626" : "1px solid #cbd5e1",
                background: activo ? "#fee2e2" : "#ffffff",
                color: activo ? "#991b1b" : "#475569",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              {item.etiqueta} ({item.cantidad})
            </button>
          );
        })}
      </div>

      {pedidosFiltrados.length === 0 ? (
        <Panel title="Pedidos">
          <Empty text="No hay pedidos en esta etapa." />
        </Panel>
      ) : (
        <div style={{ display: "grid", gap: 14 }}>
          {pedidosFiltrados.map((pedido) => {
            const estado = aparienciaEstado[pedido.estado];
            const problema = tieneProblema(pedido);

            return (
              <div
                key={pedido.id}
                style={{
                  padding: 18,
                  background: "#ffffff",
                  borderRadius: 14,
                  border: problema
                    ? "1px solid #fca5a5"
                    : "1px solid #e2e8f0",
                  boxShadow: "0 10px 26px rgba(15,23,42,0.06)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    gap: 14,
                    flexWrap: "wrap",
                  }}
                >
                  <div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        flexWrap: "wrap",
                      }}
                    >
                      <strong style={{ fontSize: 17 }}>{pedido.numero}</strong>
                      <span
                        style={{
                          padding: "5px 9px",
                          borderRadius: 999,
                          background: estado.fondo,
                          color: estado.color,
                          fontSize: 12,
                          fontWeight: 800,
                        }}
                      >
                        {estado.etiqueta}
                      </span>
                      <span
                        style={{
                          padding: "5px 9px",
                          borderRadius: 999,
                          background:
                            pedido.estadoPago === "aprobado"
                              ? "#dcfce7"
                              : "#fff7ed",
                          color:
                            pedido.estadoPago === "aprobado"
                              ? "#166534"
                              : "#9a3412",
                          fontSize: 12,
                          fontWeight: 800,
                        }}
                      >
                        Pago {pedido.estadoPago}
                      </span>
                      {problema && (
                        <span
                          style={{
                            padding: "5px 9px",
                            borderRadius: 999,
                            background: "#fee2e2",
                            color: "#991b1b",
                            fontSize: 12,
                            fontWeight: 800,
                          }}
                        >
                          Requiere atención
                        </span>
                      )}
                    </div>
                    <p style={{ margin: "8px 0 0", color: "#475569" }}>
                      {pedido.clienteNombre} · {pedido.canal} · {formatDate(pedido.fechaPedido)}
                    </p>
                    <p style={{ margin: "5px 0 0", color: "#64748b" }}>
                      {pedido.tipoEntrega === "envio"
                        ? `Envío a ${pedido.direccionEntrega || "dirección pendiente"}${
                            pedido.localidadEntrega
                              ? `, ${pedido.localidadEntrega}`
                              : ""
                          }`
                        : "Retiro en el local"}
                    </p>
                  </div>

                  <div style={{ textAlign: "right" }}>
                    <strong style={{ display: "block", fontSize: 20 }}>
                      {money(pedido.total)}
                    </strong>
                    <span style={{ color: "#64748b", fontSize: 13 }}>
                      Stock {pedido.stockDescontado ? "descontado" : "pendiente"}
                    </span>
                  </div>
                </div>

                <div
                  style={{
                    display: "grid",
                    gap: 7,
                    marginTop: 16,
                    padding: 13,
                    borderRadius: 10,
                    background: "#f8fafc",
                  }}
                >
                  {pedido.items.map((item) => (
                    <div
                      key={item.id}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 12,
                      }}
                    >
                      <span>
                        {item.cantidad} × {item.nombreProducto}
                      </span>
                      <strong>{money(item.subtotal)}</strong>
                    </div>
                  ))}
                </div>

                {(pedido.repartidor || pedido.codigoSeguimiento) && (
                  <p style={{ margin: "12px 0 0", color: "#475569" }}>
                    Entrega: {pedido.repartidor || "Sin repartidor"}
                    {pedido.codigoSeguimiento
                      ? ` · Seguimiento ${pedido.codigoSeguimiento}`
                      : ""}
                  </p>
                )}

                {pedido.observaciones && (
                  <p style={{ margin: "10px 0 0", color: "#64748b" }}>
                    Observaciones: {pedido.observaciones}
                  </p>
                )}

                <div
                  style={{
                    display: "flex",
                    gap: 9,
                    flexWrap: "wrap",
                    marginTop: 16,
                  }}
                >
                  {pedido.estadoPago === "pendiente" && puedeGestionar && (
                    <button
                      type="button"
                      style={styles.smallButtonAlt}
                      onClick={() => aprobarPago(pedido)}
                    >
                      Confirmar pago y descontar stock
                    </button>
                  )}

                  {pedido.estadoPago === "aprobado" &&
                    pedido.estado !== "entregado" &&
                    pedido.estado !== "cancelado" &&
                    puedeGestionar && (
                      <button
                        type="button"
                        style={styles.smallButtonAlt}
                        onClick={() => avanzarPedido(pedido)}
                      >
                        {descripcionSiguienteAccion(pedido)}
                      </button>
                    )}

                  {pedido.estado !== "entregado" &&
                    pedido.estado !== "cancelado" &&
                    puedeCancelar && (
                      <button
                        type="button"
                        style={{
                          ...styles.smallButton,
                          background: "#fee2e2",
                          color: "#991b1b",
                        }}
                        onClick={() => cancelarPedido(pedido)}
                      >
                        Cancelar pedido
                      </button>
                    )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div style={{ marginTop: 20 }}>
        <Panel title="Sincronización con tiendas online">
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 16,
              flexWrap: "wrap",
            }}
          >
            <div>
              <strong style={{ display: "block", marginBottom: 6 }}>
                Tiendanube
              </strong>

              <p
                style={{
                  margin: 0,
                  color: "#64748b",
                  lineHeight: 1.6,
                  maxWidth: 650,
                }}
              >
                Conectá la tienda para recibir automáticamente sus pedidos y
                preparar la sincronización del stock.
              </p>
            </div>

            {puedeConfigurar ? (
              <button
                type="button"
                style={styles.smallButtonAlt}
                onClick={conectarTiendanube}
                disabled={conectandoTiendanube || !comercioActual}
              >
                {conectandoTiendanube
                  ? "Conectando..."
                  : "Conectar Tiendanube"}
              </button>
            ) : (
              <span style={{ color: "#64748b", fontSize: 14 }}>
                No tenés permiso para configurar integraciones.
              </span>
            )}
          </div>
        </Panel>
      </div>
    </>
  );
}

function Caja({
  caja,
  setCaja,
  movimientosCajaActual,
  setMovimientosCaja,
  saldoCajaEstimado,
  ingresosCaja,
  egresosCaja,
  historialCajas,
  recargarDatos,
  comercioActual,
}: {
  caja: Caja;
  setCaja: (caja: Caja) => void;
  movimientosCajaActual: MovimientoCaja[];
  setMovimientosCaja: React.Dispatch<React.SetStateAction<MovimientoCaja[]>>;
  saldoCajaEstimado: number;
  ingresosCaja: number;
  egresosCaja: number;
  historialCajas: HistorialCaja[];
  recargarDatos: () => Promise<void>;
  comercioActual: Comercio | null;
}) {
  const [saldoInicial, setSaldoInicial] = useState("");
  const [concepto, setConcepto] = useState("");
  const [monto, setMonto] = useState("");
  const [tipo, setTipo] = useState<"Ingreso" | "Egreso">("Egreso");
  const [saldoFinalReal, setSaldoFinalReal] = useState("");

  async function abrirCaja() {
    if (!comercioActual) {
      alert("No hay comercio asociado.");
      return;
    }

    if (caja.abierta) {
      alert("Ya hay una caja abierta.");
      return;
    }

    const saldo = Number(saldoInicial.replace(",", "."));

    if (!saldoInicial.trim() || !Number.isFinite(saldo) || saldo < 0) {
      alert("Ingresá un saldo inicial válido.");
      return;
    }

    const { error } = await supabase.rpc("abrir_caja_segura", {
      p_comercio_id: comercioActual.id,
      p_saldo_inicial: saldo,
    });

    if (error) {
      alert("Error al abrir caja: " + error.message);
      await recargarDatos();
      return;
    }

    setSaldoInicial("");
    await recargarDatos();
    alert("Caja abierta correctamente.");
  }

  async function agregarMovimiento() {
    if (!comercioActual) {
      alert("No hay comercio asociado.");
      return;
    }

    if (!caja.abierta) {
      alert("La caja no está abierta.");
      return;
    }

    const montoNumero = Number(monto.replace(",", "."));

    if (!concepto.trim() || !monto.trim()) {
      alert("Completá concepto y monto.");
      return;
    }

    if (!Number.isFinite(montoNumero) || montoNumero <= 0) {
      alert("Ingresá un monto válido mayor a cero.");
      return;
    }

    const { error } = await supabase.rpc("registrar_movimiento_caja", {
      p_caja_id: caja.id,
      p_tipo: tipo,
      p_concepto: concepto.trim(),
      p_monto: montoNumero,
    });

    if (error) {
      alert("Error al guardar movimiento: " + error.message);
      await recargarDatos();
      return;
    }

    setConcepto("");
    setMonto("");
    await recargarDatos();
  }

  async function cerrarCaja() {
    if (!caja.abierta) {
      alert("La caja ya está cerrada.");
      return;
    }

    const saldoFinal = Number(saldoFinalReal.replace(",", "."));

    if (!saldoFinalReal.trim() || !Number.isFinite(saldoFinal) || saldoFinal < 0) {
      alert("Ingresá un saldo final real válido.");
      return;
    }

    const { error } = await supabase.rpc("cerrar_caja_segura", {
      p_caja_id: caja.id,
      p_saldo_final_real: saldoFinal,
    });

    if (error) {
      alert("Error al cerrar caja: " + error.message);
      await recargarDatos();
      return;
    }

    setSaldoFinalReal("");
    await recargarDatos();
    alert("Caja cerrada correctamente.");
  }

  return (
    <>
      <Header
        title="Caja diaria"
        subtitle="Apertura, saldo actual, movimientos, cierre e historial."
      />

      <div className="app-cards-grid" style={styles.cardsGrid}>
        <Card title="Estado" value={caja.abierta ? "Abierta" : "Cerrada"} />
        <Card
          title="Caja actual"
          value={caja.abierta ? "Abierta" : "Sin caja"}
        />
        <Card title="Saldo inicial" value={money(caja.saldoInicial)} />
        <Card title="Saldo actual estimado" value={money(saldoCajaEstimado)} />
      </div>

      <div className="app-cards-grid" style={styles.cardsGrid}>
        <Card title="Ingresos" value={money(ingresosCaja)} />
        <Card title="Egresos" value={money(egresosCaja)} />
        <Card
          title="Apertura"
          value={
            caja.fechaApertura ? formatDate(caja.fechaApertura) : "Sin apertura"
          }
        />
        <Card
          title="Cierre"
          value={caja.fechaCierre ? formatDate(caja.fechaCierre) : "Sin cierre"}
        />
      </div>

      <div className="app-two-columns" style={styles.twoColumns}>
        <Panel title="Abrir caja">
          <Input
            placeholder="Saldo inicial"
            type="number"
            value={saldoInicial}
            onChange={setSaldoInicial}
          />

          <div className="app-actions" style={styles.actions}>
            <Button onClick={abrirCaja}>Abrir caja</Button>
          </div>
        </Panel>

        <Panel title="Cerrar caja">
          <Input
            placeholder="Saldo final real contado"
            type="number"
            value={saldoFinalReal}
            onChange={setSaldoFinalReal}
          />

          <div className="app-actions" style={styles.actions}>
            <Button onClick={cerrarCaja}>Cerrar caja</Button>
          </div>

          {caja.abierta && (
            <p style={styles.text}>
              Saldo esperado actual: <strong>{money(saldoCajaEstimado)}</strong>
            </p>
          )}
        </Panel>
      </div>

      <Panel title="Movimiento manual de caja">
        <div className="app-form-grid-small" style={styles.formGridSmall}>
          <select
            value={tipo}
            onChange={(e) => setTipo(e.target.value as "Ingreso" | "Egreso")}
            style={styles.input}
          >
            <option>Ingreso</option>
            <option>Egreso</option>
          </select>

          <Input
            placeholder="Concepto"
            value={concepto}
            onChange={setConcepto}
          />
          <Input
            placeholder="Monto"
            type="number"
            value={monto}
            onChange={setMonto}
          />

          <Button onClick={agregarMovimiento}>Agregar movimiento</Button>
        </div>
      </Panel>

      <Panel title="Movimientos de la caja actual">
        {movimientosCajaActual.length === 0 ? (
          <Empty text="Todavía no hay movimientos en la caja actual." />
        ) : (
          movimientosCajaActual
            .slice()
            .reverse()
            .map((mov) => (
              <Row
                key={mov.id}
                left={`${formatDate(mov.fecha)} - ${mov.tipo} - ${mov.concepto}`}
                right={money(mov.monto)}
              />
            ))
        )}
      </Panel>

      <Panel title="Historial de aperturas y cierres">
        {historialCajas.length === 0 ? (
          <Empty text="Todavía no hay cajas cerradas." />
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="app-table" style={styles.table}>
              <thead style={styles.thead}>
                <tr>
                  <Th>Apertura</Th>
                  <Th>Cierre</Th>
                  <Th>Saldo inicial</Th>
                  <Th>Ingresos</Th>
                  <Th>Egresos</Th>
                  <Th>Esperado</Th>
                  <Th>Real</Th>
                  <Th>Diferencia</Th>
                </tr>
              </thead>

              <tbody>
                {historialCajas
                  .slice()
                  .reverse()
                  .map((historial) => (
                    <tr key={historial.id} style={styles.tr}>
                      <Td>{formatDate(historial.fechaApertura)}</Td>
                      <Td>{formatDate(historial.fechaCierre)}</Td>
                      <Td>{money(historial.saldoInicial)}</Td>
                      <Td>{money(historial.ingresos)}</Td>
                      <Td>{money(historial.egresos)}</Td>
                      <Td>{money(historial.saldoEsperado)}</Td>
                      <Td>{money(historial.saldoFinalReal)}</Td>
                      <Td>{money(historial.diferencia)}</Td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </>
  );
}

function Ventas({
  productos,
  ventas,
  setVentas,
  clientes,
  caja,
  setMovimientosCaja,
  recargarDatos,
  comercioActual,
  rolUsuario,
}: {
  productos: Producto[];
  ventas: Venta[];
  setVentas: (ventas: Venta[]) => void;
  clientes: Cliente[];
  caja: Caja;
  setMovimientosCaja: React.Dispatch<React.SetStateAction<MovimientoCaja[]>>;
  recargarDatos: () => Promise<void>;
  comercioActual: Comercio | null;
  rolUsuario: string;
}) {
  const [productoId, setProductoId] = useState("");
  const [cantidad, setCantidad] = useState("1");
  const [carrito, setCarrito] = useState<ItemVenta[]>([]);
  const [cliente, setCliente] = useState("Consumidor final");
  const [medioPago, setMedioPago] = useState("Efectivo");
  const [montoRecibido, setMontoRecibido] = useState("");
  const busquedaRapidaRef = useRef<HTMLInputElement | null>(null);
  const lectorBufferRef = useRef("");
  const lectorUltimaTeclaRef = useRef(0);
  const lectorReinicioRef = useRef<number | null>(null);
  const procesarBusquedaRapidaRef = useRef<(valor: string) => void>(() => {});
  const lectorDeshabilitadoRef = useRef(false);
  const [ventaAnulando, setVentaAnulando] = useState<Venta | null>(null);
  const [motivoAnulacion, setMotivoAnulacion] = useState("");
  const [anulandoVenta, setAnulandoVenta] = useState(false);
  const [busquedaRapida, setBusquedaRapida] = useState("");
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState("Todos");
  const [mostrarCargaManual, setMostrarCargaManual] = useState(false);
  const [filtroPeriodoVentas, setFiltroPeriodoVentas] = useState("todas");
  const [filtroFechaDesde, setFiltroFechaDesde] = useState("");
  const [filtroFechaHasta, setFiltroFechaHasta] = useState("");
  const [filtroMedioPago, setFiltroMedioPago] = useState("Todos");
  const [filtroEstadoVenta, setFiltroEstadoVenta] = useState("Todas");
  const [filtroClienteVenta, setFiltroClienteVenta] = useState("Todos");
  const [filtroProductoVenta, setFiltroProductoVenta] = useState("Todos");
  const [filtroImporteMinimo, setFiltroImporteMinimo] = useState("");
  const [filtroImporteMaximo, setFiltroImporteMaximo] = useState("");
  const [filtroNumeroVenta, setFiltroNumeroVenta] = useState("");
  const [mostrarRegistroRapido, setMostrarRegistroRapido] = useState(false);
  const [guardandoProductoRapido, setGuardandoProductoRapido] = useState(false);
  const [registrandoVenta, setRegistrandoVenta] = useState(false);
  const procesandoVentaRef = useRef(false);
  const [nuevoProductoRapido, setNuevoProductoRapido] = useState({
    nombre: "",
    codigo: "",
    categoria: "",
    precio: "",
    costo: "",
    stock: "",
    minimo: "",
  });

  lectorDeshabilitadoRef.current =
    mostrarRegistroRapido || Boolean(ventaAnulando);

  const total = carrito.reduce((acc, item) => acc + item.subtotal, 0);
  const montoRecibidoNumero = Number(montoRecibido.replace(",", ".")) || 0;
  const diferenciaEfectivo = montoRecibidoNumero - total;
  const puedeAnularVentas = rolUsuario === "admin_comercio";

  useEffect(() => {
    if (medioPago !== "Efectivo") {
      setMontoRecibido("");
    }
  }, [medioPago]);
  const productosActivos = productos.filter((producto) => producto.activo);
  const categorias = [
    "Todos",
    ...Array.from(
      new Set(
        productosActivos
          .map((producto) => producto.categoria?.trim())
          .filter((categoria): categoria is string => Boolean(categoria)),
      ),
    ).sort((a, b) => a.localeCompare(b)),
  ];

  const terminoBusqueda = busquedaRapida.trim().toLowerCase();
  const productosFiltrados = productosActivos.filter((producto) => {
    const coincideCategoria =
      categoriaSeleccionada === "Todos" ||
      producto.categoria === categoriaSeleccionada;
    const coincideBusqueda =
      !terminoBusqueda ||
      producto.nombre.toLowerCase().includes(terminoBusqueda) ||
      producto.categoria.toLowerCase().includes(terminoBusqueda) ||
      producto.codigo.toLowerCase().includes(terminoBusqueda);

    return coincideCategoria && coincideBusqueda;
  });

  const cantidadesVendidas = new Map<number, number>();
  ventas
    .filter((venta) => venta.estado !== "anulada")
    .forEach((venta) => {
      venta.items.forEach((item) => {
        cantidadesVendidas.set(
          item.productoId,
          (cantidadesVendidas.get(item.productoId) || 0) + item.cantidad,
        );
      });
    });

  const productosMasVendidos = productosActivos
    .filter((producto) => (cantidadesVendidas.get(producto.id) || 0) > 0)
    .sort(
      (a, b) =>
        (cantidadesVendidas.get(b.id) || 0) -
        (cantidadesVendidas.get(a.id) || 0),
    )
    .slice(0, 6);

  const accesosRapidos =
    productosMasVendidos.length > 0
      ? productosMasVendidos
      : productosActivos.filter((producto) => producto.stock > 0).slice(0, 6);

  const clientesEnVentas = Array.from(
    new Set(ventas.map((venta) => venta.cliente).filter(Boolean)),
  ).sort((a, b) => a.localeCompare(b));

  const mediosPagoEnVentas = Array.from(
    new Set(ventas.map((venta) => venta.medioPago).filter(Boolean)),
  ).sort((a, b) => a.localeCompare(b));

  const productosEnVentas = Array.from(
    new Map(
      ventas.flatMap((venta) =>
        venta.items.map((item) => [String(item.productoId), item.nombre] as const),
      ),
    ).entries(),
  ).sort((a, b) => a[1].localeCompare(b[1]));

  function fechaSinHora(value: string) {
    const fecha = new Date(value);

    if (Number.isNaN(fecha.getTime())) return null;

    return new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());
  }

  function fechaDesdeInput(value: string) {
    if (!value) return null;

    const [anio, mes, dia] = value.split("-").map(Number);

    if (!anio || !mes || !dia) return null;

    return new Date(anio, mes - 1, dia);
  }

  const hoyVentas = new Date();
  const inicioHoyVentas = new Date(
    hoyVentas.getFullYear(),
    hoyVentas.getMonth(),
    hoyVentas.getDate(),
  );
  const inicioUltimosSieteDias = new Date(inicioHoyVentas);
  inicioUltimosSieteDias.setDate(inicioUltimosSieteDias.getDate() - 6);
  const inicioMesActual = new Date(
    hoyVentas.getFullYear(),
    hoyVentas.getMonth(),
    1,
  );
  const fechaDesdePersonalizada = fechaDesdeInput(filtroFechaDesde);
  const fechaHastaPersonalizada = fechaDesdeInput(filtroFechaHasta);
  const importeMinimo = filtroImporteMinimo
    ? Number(filtroImporteMinimo.replace(",", "."))
    : null;
  const importeMaximo = filtroImporteMaximo
    ? Number(filtroImporteMaximo.replace(",", "."))
    : null;
  const numeroVentaBuscado = filtroNumeroVenta.trim();

  const ventasFiltradas = ventas.filter((venta) => {
    const fechaVenta = fechaSinHora(venta.fecha);

    if (filtroPeriodoVentas === "hoy") {
      if (!fechaVenta || fechaVenta.getTime() !== inicioHoyVentas.getTime()) {
        return false;
      }
    }

    if (filtroPeriodoVentas === "ultimos7") {
      if (
        !fechaVenta ||
        fechaVenta.getTime() < inicioUltimosSieteDias.getTime() ||
        fechaVenta.getTime() > inicioHoyVentas.getTime()
      ) {
        return false;
      }
    }

    if (filtroPeriodoVentas === "mes") {
      if (!fechaVenta || fechaVenta.getTime() < inicioMesActual.getTime()) {
        return false;
      }
    }

    if (filtroPeriodoVentas === "personalizado") {
      if (
        fechaDesdePersonalizada &&
        (!fechaVenta ||
          fechaVenta.getTime() < fechaDesdePersonalizada.getTime())
      ) {
        return false;
      }

      if (
        fechaHastaPersonalizada &&
        (!fechaVenta ||
          fechaVenta.getTime() > fechaHastaPersonalizada.getTime())
      ) {
        return false;
      }
    }

    if (
      filtroMedioPago !== "Todos" &&
      venta.medioPago !== filtroMedioPago
    ) {
      return false;
    }

    if (
      filtroEstadoVenta === "Activas" &&
      venta.estado === "anulada"
    ) {
      return false;
    }

    if (
      filtroEstadoVenta === "Anuladas" &&
      venta.estado !== "anulada"
    ) {
      return false;
    }

    if (
      filtroClienteVenta !== "Todos" &&
      venta.cliente !== filtroClienteVenta
    ) {
      return false;
    }

    if (
      filtroProductoVenta !== "Todos" &&
      !venta.items.some(
        (item) => String(item.productoId) === filtroProductoVenta,
      )
    ) {
      return false;
    }

    if (
      importeMinimo !== null &&
      Number.isFinite(importeMinimo) &&
      venta.total < importeMinimo
    ) {
      return false;
    }

    if (
      importeMaximo !== null &&
      Number.isFinite(importeMaximo) &&
      venta.total > importeMaximo
    ) {
      return false;
    }

    if (
      numeroVentaBuscado &&
      !String(venta.id).includes(numeroVentaBuscado)
    ) {
      return false;
    }

    return true;
  });

  const ventasFiltradasOrdenadas = ventasFiltradas
    .slice()
    .sort((a, b) => {
      const fechaA = new Date(a.fecha).getTime();
      const fechaB = new Date(b.fecha).getTime();

      if (Number.isNaN(fechaA) || Number.isNaN(fechaB)) {
        return b.id - a.id;
      }

      return fechaB - fechaA || b.id - a.id;
    });

  const ventasActivasFiltradas = ventasFiltradas.filter(
    (venta) => venta.estado !== "anulada",
  );
  const totalVentasFiltradas = ventasActivasFiltradas.reduce(
    (acc, venta) => acc + venta.total,
    0,
  );
  const ticketPromedioFiltrado =
    ventasActivasFiltradas.length > 0
      ? totalVentasFiltradas / ventasActivasFiltradas.length
      : 0;
  const ventasAnuladasFiltradas = ventasFiltradas.filter(
    (venta) => venta.estado === "anulada",
  ).length;

  function limpiarFiltrosVentas() {
    setFiltroPeriodoVentas("todas");
    setFiltroFechaDesde("");
    setFiltroFechaHasta("");
    setFiltroMedioPago("Todos");
    setFiltroEstadoVenta("Todas");
    setFiltroClienteVenta("Todos");
    setFiltroProductoVenta("Todos");
    setFiltroImporteMinimo("");
    setFiltroImporteMaximo("");
    setFiltroNumeroVenta("");
  }

  function cantidadEnCarrito(productoIdBuscado: number) {
    return carrito
      .filter((item) => item.productoId === productoIdBuscado)
      .reduce((acc, item) => acc + item.cantidad, 0);
  }

  function agregarProductoRapido(producto: Producto, cantidadAgregar = 1) {
    if (!producto.activo) {
      alert("El producto está inactivo.");
      return false;
    }

    if (producto.stock <= 0) {
      alert(`${producto.nombre} no tiene stock disponible.`);
      return false;
    }

    if (!cantidadAgregar || cantidadAgregar <= 0) {
      alert("La cantidad debe ser mayor a cero.");
      return false;
    }

    const cantidadActual = cantidadEnCarrito(producto.id);

    if (cantidadActual + cantidadAgregar > producto.stock) {
      alert(
        `No hay stock suficiente de ${producto.nombre}. Disponibles: ${producto.stock}.`,
      );
      return false;
    }

    const itemExistente = carrito.find(
      (item) => item.productoId === producto.id,
    );

    if (itemExistente) {
      setCarrito(
        carrito.map((item) =>
          item.productoId === producto.id
            ? {
                ...item,
                cantidad: item.cantidad + cantidadAgregar,
                subtotal:
                  item.precioUnitario * (item.cantidad + cantidadAgregar),
              }
            : item,
        ),
      );
    } else {
      setCarrito([
        ...carrito,
        {
          productoId: producto.id,
          nombre: producto.nombre,
          cantidad: cantidadAgregar,
          precioUnitario: producto.precio,
          subtotal: producto.precio * cantidadAgregar,
        },
      ]);
    }

    return true;
  }

  function cambiarCantidadCarrito(index: number, valor: string) {
    const nuevaCantidad = Number(valor);

    if (!nuevaCantidad || nuevaCantidad <= 0) {
      quitarItemCarrito(index);
      return;
    }

    const itemActual = carrito[index];
    const producto = productos.find((p) => p.id === itemActual.productoId);

    if (!producto) return;

    const cantidadOtrosItems = carrito
      .filter(
        (item, i) => item.productoId === itemActual.productoId && i !== index,
      )
      .reduce((acc, item) => acc + item.cantidad, 0);

    if (cantidadOtrosItems + nuevaCantidad > producto.stock) {
      alert("No hay stock suficiente para esa cantidad.");
      return;
    }

    setCarrito(
      carrito.map((item, i) =>
        i === index
          ? {
              ...item,
              cantidad: nuevaCantidad,
              subtotal: item.precioUnitario * nuevaCantidad,
            }
          : item,
      ),
    );
  }

  function quitarItemCarrito(index: number) {
    setCarrito(carrito.filter((_item, i) => i !== index));
  }

  function vaciarCarrito() {
    if (carrito.length === 0) return;
    if (!confirm("¿Querés vaciar el carrito?")) return;
    setCarrito([]);
  }

  function agregarAlCarrito() {
    const producto = productos.find((p) => p.id === Number(productoId));
    const cant = Number(cantidad);

    if (!producto) {
      alert("Seleccioná un producto.");
      return;
    }

    const agregado = agregarProductoRapido(producto, cant);

    if (agregado) {
      setProductoId("");
      setCantidad("1");
    }
  }

  function enfocarBusquedaRapida() {
    requestAnimationFrame(() => {
      busquedaRapidaRef.current?.focus();
    });
  }

  function limpiarBusquedaDespuesDeAgregar() {
    setBusquedaRapida("");
    setCategoriaSeleccionada("Todos");
    enfocarBusquedaRapida();
  }

  function abrirRegistroRapidoProducto(codigo: string) {
    setNuevoProductoRapido({
      nombre: "",
      codigo: codigo.trim(),
      categoria: "",
      precio: "",
      costo: "",
      stock: "",
      minimo: "",
    });
    setMostrarRegistroRapido(true);
  }

  function cancelarRegistroRapidoProducto() {
    if (guardandoProductoRapido) return;

    setMostrarRegistroRapido(false);
    setNuevoProductoRapido({
      nombre: "",
      codigo: "",
      categoria: "",
      precio: "",
      costo: "",
      stock: "",
      minimo: "",
    });
    setBusquedaRapida("");
    enfocarBusquedaRapida();
  }

  async function registrarProductoDesdeVenta() {
    if (!comercioActual) {
      alert("No hay comercio asociado.");
      return;
    }

    const nombre = nuevoProductoRapido.nombre.trim();
    const codigo = nuevoProductoRapido.codigo.trim();
    const categoria = nuevoProductoRapido.categoria.trim();
    const precio = Number(nuevoProductoRapido.precio.replace(",", "."));
    const costo = Number(nuevoProductoRapido.costo.replace(",", "."));
    const stock = Number(nuevoProductoRapido.stock);
    const minimo = Number(nuevoProductoRapido.minimo);

    if (
      !nombre ||
      !codigo ||
      !categoria ||
      nuevoProductoRapido.precio.trim() === "" ||
      nuevoProductoRapido.costo.trim() === "" ||
      nuevoProductoRapido.stock.trim() === "" ||
      nuevoProductoRapido.minimo.trim() === ""
    ) {
      alert("Completá todos los datos del producto.");
      return;
    }

    if (!Number.isFinite(precio) || precio < 0) {
      alert("Ingresá un precio válido.");
      return;
    }

    if (!Number.isFinite(costo) || costo < 0) {
      alert("Ingresá un costo válido.");
      return;
    }

    if (!Number.isInteger(stock) || stock < 0) {
      alert("El stock debe ser un número entero igual o mayor a cero.");
      return;
    }

    if (!Number.isInteger(minimo) || minimo < 0) {
      alert("El stock mínimo debe ser un número entero igual o mayor a cero.");
      return;
    }

    const codigoRepetido = productos.some(
      (producto) =>
        producto.codigo.trim().toLowerCase() === codigo.toLowerCase(),
    );

    if (codigoRepetido) {
      alert("Ya existe un producto con ese código de barras.");
      return;
    }

    setGuardandoProductoRapido(true);

    const { data, error } = await supabase
      .from("productos")
      .insert({
        comercio_id: comercioActual.id,
        nombre,
        codigo,
        categoria,
        precio,
        costo,
        stock,
        minimo,
        activo: true,
      })
      .select()
      .single();

    setGuardandoProductoRapido(false);

    if (error) {
      alert("Error al registrar el producto: " + error.message);
      return;
    }

    const productoCreado = normalizarProducto(data);

    setMostrarRegistroRapido(false);
    setNuevoProductoRapido({
      nombre: "",
      codigo: "",
      categoria: "",
      precio: "",
      costo: "",
      stock: "",
      minimo: "",
    });
    setBusquedaRapida("");
    setCategoriaSeleccionada("Todos");

    if (productoCreado.stock > 0) {
      agregarProductoRapido(productoCreado);
      alert("Producto registrado y agregado al carrito.");
    } else {
      alert("Producto registrado. No se agregó al carrito porque no tiene stock.");
    }

    await recargarDatos();
    enfocarBusquedaRapida();
  }

  function procesarBusquedaRapida(valorOriginal: string) {
    const termino = valorOriginal.trim().toLowerCase();

    if (!termino) {
      enfocarBusquedaRapida();
      return;
    }

    const productosCoincidentes = productosActivos.filter((producto) => {
      const coincideCategoria =
        categoriaSeleccionada === "Todos" ||
        producto.categoria === categoriaSeleccionada;
      const coincideBusqueda =
        producto.nombre.toLowerCase().includes(termino) ||
        producto.categoria.toLowerCase().includes(termino) ||
        producto.codigo.toLowerCase().includes(termino);

      return coincideCategoria && coincideBusqueda;
    });

    const productoPorCodigo = productosActivos.find(
      (producto) => producto.codigo.trim().toLowerCase() === termino,
    );

    if (productoPorCodigo) {
      const agregado = agregarProductoRapido(productoPorCodigo);

      if (agregado) {
        limpiarBusquedaDespuesDeAgregar();
      } else {
        enfocarBusquedaRapida();
      }

      return;
    }

    const productoExacto = productosCoincidentes.find(
      (producto) => producto.nombre.toLowerCase() === termino,
    );

    if (productoExacto) {
      const agregado = agregarProductoRapido(productoExacto);

      if (agregado) {
        limpiarBusquedaDespuesDeAgregar();
      } else {
        enfocarBusquedaRapida();
      }

      return;
    }

    if (productosCoincidentes.length === 1) {
      const agregado = agregarProductoRapido(productosCoincidentes[0]);

      if (agregado) {
        limpiarBusquedaDespuesDeAgregar();
      } else {
        enfocarBusquedaRapida();
      }

      return;
    }

    if (productosCoincidentes.length === 0) {
      const productoInactivo = productos.find(
        (producto) =>
          producto.codigo.trim().toLowerCase() === termino && !producto.activo,
      );

      if (productoInactivo) {
        alert(
          `${productoInactivo.nombre} está inactivo. Reactivalo desde Productos para poder venderlo.`,
        );
        setBusquedaRapida("");
        enfocarBusquedaRapida();
        return;
      }

      abrirRegistroRapidoProducto(valorOriginal);
      return;
    }

    alert("Hay varios resultados. Tocá el producto que querés agregar.");
    enfocarBusquedaRapida();
  }

  procesarBusquedaRapidaRef.current = procesarBusquedaRapida;

  function manejarBusquedaRapida(
    event: React.KeyboardEvent<HTMLInputElement>,
  ) {
    if (event.key !== "Enter") return;

    event.preventDefault();
    procesarBusquedaRapida(busquedaRapida);
  }

  useEffect(() => {
    const focoInicial = window.setTimeout(() => {
      busquedaRapidaRef.current?.focus();
    }, 100);

    function limpiarBufferLector() {
      lectorBufferRef.current = "";
      lectorUltimaTeclaRef.current = 0;

      if (lectorReinicioRef.current) {
        window.clearTimeout(lectorReinicioRef.current);
        lectorReinicioRef.current = null;
      }
    }

    function manejarLectorGlobal(event: KeyboardEvent) {
      const objetivo = event.target as HTMLElement | null;
      const esCampoEditable =
        objetivo instanceof HTMLInputElement ||
        objetivo instanceof HTMLTextAreaElement ||
        objetivo instanceof HTMLSelectElement ||
        Boolean(objetivo?.isContentEditable);

      if (objetivo === busquedaRapidaRef.current) {
        limpiarBufferLector();
        return;
      }

      if (
        lectorDeshabilitadoRef.current ||
        esCampoEditable ||
        event.ctrlKey ||
        event.metaKey ||
        event.altKey
      ) {
        limpiarBufferLector();
        return;
      }

      if (event.key === "Enter") {
        const codigo = lectorBufferRef.current.trim();
        limpiarBufferLector();

        if (codigo.length < 6) return;

        event.preventDefault();
        setBusquedaRapida(codigo);
        procesarBusquedaRapidaRef.current(codigo);
        return;
      }

      if (event.key.length !== 1) return;

      const ahora = Date.now();

      if (
        lectorUltimaTeclaRef.current > 0 &&
        ahora - lectorUltimaTeclaRef.current > 120
      ) {
        lectorBufferRef.current = "";
      }

      lectorBufferRef.current += event.key;
      lectorUltimaTeclaRef.current = ahora;

      if (lectorReinicioRef.current) {
        window.clearTimeout(lectorReinicioRef.current);
      }

      lectorReinicioRef.current = window.setTimeout(
        limpiarBufferLector,
        300,
      );
    }

    window.addEventListener("keydown", manejarLectorGlobal, true);

    return () => {
      window.clearTimeout(focoInicial);
      limpiarBufferLector();
      window.removeEventListener("keydown", manejarLectorGlobal, true);
    };
  }, []);

  async function confirmarVenta() {
    if (procesandoVentaRef.current || registrandoVenta) return;

    if (!comercioActual) {
      alert("No hay comercio asociado.");
      return;
    }

    if (!caja.abierta) {
      alert("Primero tenés que abrir caja.");
      return;
    }

    if (carrito.length === 0) {
      alert("Agregá al menos un producto.");
      return;
    }

    if (medioPago === "Efectivo") {
      const montoEntregado = Number(montoRecibido.replace(",", "."));

      if (!montoRecibido.trim() || !Number.isFinite(montoEntregado)) {
        alert("Ingresá con cuánto paga el cliente.");
        return;
      }

      if (montoEntregado < total) {
        alert(
          `El importe entregado no alcanza. Faltan ${money(
            total - montoEntregado,
          )}.`,
        );
        return;
      }
    }

    const clienteEncontrado = clientes.find((c) => c.nombre === cliente);
    const itemsParaRegistrar = carrito.map((item) => ({
      producto_id: item.productoId,
      cantidad: item.cantidad,
    }));

    procesandoVentaRef.current = true;
    setRegistrandoVenta(true);

    try {
      const { data: resultadoVenta, error: ventaError } = await supabase.rpc(
        "registrar_venta",
        {
          p_comercio_id: comercioActual.id,
          p_caja_id: caja.id,
          p_cliente_id: clienteEncontrado?.id || null,
          p_cliente_nombre: cliente,
          p_medio_pago: medioPago,
          p_items: itemsParaRegistrar,
        },
      );

      if (ventaError) {
        alert("No se pudo registrar la venta: " + ventaError.message);
        return;
      }

      const totalRegistrado = Number(
        (resultadoVenta as { total?: number } | null)?.total ?? total,
      );
      const vueltoRegistrado =
        medioPago === "Efectivo"
          ? Math.max(0, montoRecibidoNumero - totalRegistrado)
          : 0;

      const mensajeFinal =
        medioPago === "Efectivo"
          ? `Venta registrada correctamente. Vuelto: ${money(
              vueltoRegistrado,
            )}.`
          : "Venta registrada correctamente.";

      setCarrito([]);
      setBusquedaRapida("");
      setMontoRecibido("");
      setCategoriaSeleccionada("Todos");
      await recargarDatos();
      alert(mensajeFinal);
      enfocarBusquedaRapida();
    } catch (error) {
      const mensaje =
        error instanceof Error ? error.message : "Error inesperado.";
      alert("No se pudo registrar la venta: " + mensaje);
    } finally {
      procesandoVentaRef.current = false;
      setRegistrandoVenta(false);
    }
  }

  function iniciarAnulacion(venta: Venta) {
    if (!puedeAnularVentas) {
      alert("Solo un administrador del comercio puede anular ventas.");
      return;
    }

    if (venta.estado === "anulada") {
      alert("La venta ya está anulada.");
      return;
    }

    if (!caja.abierta || venta.cajaId !== caja.id) {
      alert(
        "Solo se pueden anular ventas de la caja que está abierta actualmente.",
      );
      return;
    }

    setVentaAnulando(venta);
    setMotivoAnulacion("");
  }

  function cancelarAnulacion() {
    if (anulandoVenta) return;
    setVentaAnulando(null);
    setMotivoAnulacion("");
  }

  async function confirmarAnulacion() {
    if (!ventaAnulando) return;

    const motivo = motivoAnulacion.trim();

    if (!motivo) {
      alert("Ingresá el motivo de la anulación.");
      return;
    }

    if (!caja.abierta || ventaAnulando.cajaId !== caja.id) {
      alert("La caja de esta venta ya no está abierta.");
      cancelarAnulacion();
      return;
    }

    if (!confirm(`¿Confirmás la anulación de la venta #${ventaAnulando.id}?`)) {
      return;
    }

    setAnulandoVenta(true);

    const { error } = await supabase.rpc("anular_venta", {
      p_venta_id: ventaAnulando.id,
      p_motivo: motivo,
    });

    setAnulandoVenta(false);

    if (error) {
      alert("Error al anular la venta: " + error.message);
      return;
    }

    setVentaAnulando(null);
    setMotivoAnulacion("");
    await recargarDatos();
    alert("Venta anulada. El stock y la caja fueron actualizados.");
  }

  return (
    <>
      <Header
        title="Ventas"
        subtitle="Venta rápida, carrito y descuento automático de stock."
      />

      <div className="app-two-columns" style={styles.twoColumns}>
        <Panel title="Nueva venta">
          {!caja.abierta && (
            <p style={{ ...styles.text, color: "#991b1b", fontWeight: "bold" }}>
              Para vender, primero tenés que abrir caja.
            </p>
          )}

          {caja.abierta && (
            <p style={styles.text}>
              Caja actual: <strong>Abierta</strong>
            </p>
          )}

          <div className="app-quick-sale-header" style={styles.quickSaleHeader}>
            <div>
              <h3 style={styles.quickSaleTitle}>Venta rápida</h3>
              <p style={styles.quickSaleHelp}>
                Escaneá el código, buscá por nombre o tocá un producto. Cada lectura suma una unidad al carrito.
              </p>
            </div>
            <Badge>{productosFiltrados.length} productos</Badge>
          </div>

          <input
            ref={busquedaRapidaRef}
            autoFocus
            value={busquedaRapida}
            onChange={(event) => setBusquedaRapida(event.target.value)}
            onKeyDown={manejarBusquedaRapida}
            placeholder="Escaneá el código o buscá por nombre/categoría..."
            className="app-quick-search"
            style={styles.quickSearchInput}
            autoComplete="off"
          />

          <div style={styles.categoryTabs}>
            {categorias.map((categoria) => {
              const activa = categoriaSeleccionada === categoria;

              return (
                <button
                  key={categoria}
                  type="button"
                  onClick={() => {
                        setCategoriaSeleccionada(categoria);
                        enfocarBusquedaRapida();
                      }}
                  style={{
                    ...styles.categoryTab,
                    ...(activa ? styles.categoryTabActive : {}),
                  }}
                >
                  {categoria}
                </button>
              );
            })}
          </div>

          {!terminoBusqueda && categoriaSeleccionada === "Todos" && (
            <div style={styles.quickAccessBox}>
              <p style={styles.quickAccessTitle}>
                {productosMasVendidos.length > 0
                  ? "Más vendidos"
                  : "Accesos rápidos"}
              </p>
              <div style={styles.quickAccessButtons}>
                {accesosRapidos.map((producto) => (
                  <button
                    key={`acceso-${producto.id}`}
                    type="button"
                    onClick={() => {
                      agregarProductoRapido(producto);
                      enfocarBusquedaRapida();
                    }}
                    disabled={producto.stock <= 0}
                    style={{
                      ...styles.quickAccessButton,
                      ...(producto.stock <= 0 ? styles.disabledButton : {}),
                    }}
                  >
                    {producto.nombre}
                  </button>
                ))}
              </div>
            </div>
          )}

          {productosFiltrados.length === 0 ? (
            <Empty text="No hay productos que coincidan con la búsqueda." />
          ) : (
            <div className="app-quick-product-grid" style={styles.quickProductGrid}>
              {productosFiltrados.map((producto) => {
                const sinStock = producto.stock <= 0;
                const unidadesEnCarrito = cantidadEnCarrito(producto.id);

                return (
                  <button
                    key={producto.id}
                    type="button"
                    className="app-quick-product-card"
                    onClick={() => {
                      agregarProductoRapido(producto);
                      enfocarBusquedaRapida();
                    }}
                    disabled={sinStock}
                    style={{
                      ...styles.quickProductCard,
                      ...(sinStock ? styles.quickProductCardDisabled : {}),
                    }}
                  >
                    <span style={styles.quickProductName}>{producto.nombre}</span>
                    <span style={styles.quickProductCategory}>
                      {producto.categoria || "Sin categoría"}
                    </span>
                    <span style={styles.quickProductPrice}>
                      {money(producto.precio)}
                    </span>
                    <span
                      style={{
                        ...styles.quickProductStock,
                        ...(sinStock ? styles.quickProductStockEmpty : {}),
                      }}
                    >
                      {sinStock ? "Sin stock" : `Stock: ${producto.stock}`}
                    </span>
                    {unidadesEnCarrito > 0 && (
                      <span style={styles.quickProductCartCount}>
                        En carrito: {unidadesEnCarrito}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          <div style={styles.manualLoadToggle}>
            <SecondaryButton
              onClick={() => setMostrarCargaManual(!mostrarCargaManual)}
            >
              {mostrarCargaManual
                ? "Ocultar carga por cantidad"
                : "Agregar varias unidades de un producto"}
            </SecondaryButton>
          </div>

          {mostrarCargaManual && (
            <div style={styles.manualLoadBox}>
              <p style={styles.quickAccessTitle}>Carga por cantidad</p>
              <div className="app-form-grid-small" style={styles.formGridSmall}>
                <select
                  value={productoId}
                  onChange={(e) => setProductoId(e.target.value)}
                  style={styles.input}
                >
                  <option value="">Seleccionar producto</option>
                  {productosActivos.map((producto) => (
                    <option key={producto.id} value={producto.id}>
                      {producto.nombre} - Stock: {producto.stock}
                    </option>
                  ))}
                </select>

                <Input
                  placeholder="Cantidad"
                  type="number"
                  value={cantidad}
                  onChange={setCantidad}
                />

                <Button onClick={agregarAlCarrito}>Agregar</Button>
              </div>
            </div>
          )}

          <div style={{ marginTop: 20 }}>
            <select
              value={cliente}
              onChange={(e) => setCliente(e.target.value)}
              style={styles.input}
            >
              <option>Consumidor final</option>
              {clientes.map((c) => (
                <option key={c.id} value={c.nombre}>
                  {c.nombre}
                </option>
              ))}
            </select>

            <select
              value={medioPago}
              onChange={(e) => setMedioPago(e.target.value)}
              style={{ ...styles.input, marginTop: 12 }}
            >
              <option>Efectivo</option>
              <option>Transferencia</option>
              <option>Tarjeta</option>
              <option>Mercado Pago</option>
            </select>

            {medioPago === "Efectivo" && (
              <div
                style={{
                  marginTop: 12,
                  padding: 14,
                  border: "1px solid #dbeafe",
                  borderRadius: 14,
                  background: "#f8fafc",
                }}
              >
                <label
                  htmlFor="monto-recibido"
                  style={{
                    display: "block",
                    marginBottom: 7,
                    fontWeight: 800,
                    color: "#0f172a",
                  }}
                >
                  Paga con
                </label>

                <input
                  id="monto-recibido"
                  type="number"
                  min="0"
                  step="0.01"
                  inputMode="decimal"
                  value={montoRecibido}
                  onChange={(event) => setMontoRecibido(event.target.value)}
                  placeholder="Importe entregado por el cliente"
                  style={styles.input}
                />

                {montoRecibido.trim() !== "" && (
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 12,
                      marginTop: 12,
                      padding: 12,
                      borderRadius: 12,
                      background:
                        diferenciaEfectivo >= 0 ? "#dcfce7" : "#fee2e2",
                      color:
                        diferenciaEfectivo >= 0 ? "#166534" : "#991b1b",
                      fontWeight: 900,
                    }}
                  >
                    <span>
                      {diferenciaEfectivo >= 0 ? "Vuelto" : "Falta"}
                    </span>
                    <span>{money(Math.abs(diferenciaEfectivo))}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="app-actions" style={styles.actions}>
            <Button onClick={confirmarVenta} disabled={registrandoVenta}>
              {registrandoVenta ? "Registrando..." : "Confirmar venta"}
            </Button>
          </div>
        </Panel>

        <Panel title="Carrito">
          {carrito.length === 0 ? (
            <Empty text="Todavía no agregaste productos." />
          ) : (
            <>
              {carrito.map((item, index) => (
                <div key={item.productoId} className="app-cart-item" style={styles.cartItem}>
                  <div>
                    <strong>{item.nombre}</strong>
                    <p style={styles.cartMeta}>
                      {money(item.precioUnitario)} por unidad
                    </p>
                  </div>

                  <div className="app-qty-stepper" style={styles.qtyStepper}>
                    <button
                      type="button"
                      style={styles.qtyStepperButton}
                      onClick={() =>
                        cambiarCantidadCarrito(
                          index,
                          String(item.cantidad - 1),
                        )
                      }
                      aria-label={`Restar una unidad de ${item.nombre}`}
                    >
                      −
                    </button>
                    <strong style={styles.qtyStepperValue}>{item.cantidad}</strong>
                    <button
                      type="button"
                      style={styles.qtyStepperButton}
                      onClick={() =>
                        cambiarCantidadCarrito(
                          index,
                          String(item.cantidad + 1),
                        )
                      }
                      aria-label={`Sumar una unidad de ${item.nombre}`}
                    >
                      +
                    </button>
                  </div>

                  <strong>{money(item.subtotal)}</strong>

                  <button
                    style={styles.smallButtonDanger}
                    onClick={() => quitarItemCarrito(index)}
                  >
                    Quitar
                  </button>
                </div>
              ))}
              <hr style={styles.hr} />
              <Row left="Total" right={money(total)} bold />
              <div className="app-actions" style={styles.actions}>
                <SecondaryButton onClick={vaciarCarrito}>
                  Vaciar carrito
                </SecondaryButton>
              </div>
            </>
          )}
        </Panel>
      </div>

      <Panel title="Ventas registradas">
        {ventas.length === 0 ? (
          <Empty text="Todavía no hay ventas registradas." />
        ) : (
          <>
            <div
              style={{
                padding: 16,
                marginBottom: 18,
                border: "1px solid #dbeafe",
                borderRadius: 16,
                background: "#f8fafc",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 12,
                  flexWrap: "wrap",
                  marginBottom: 14,
                }}
              >
                <div>
                  <strong style={{ color: "#0f172a" }}>Filtrar ventas</strong>
                  <p style={{ ...styles.text, margin: "4px 0 0" }}>
                    Combiná uno o varios criterios para encontrar operaciones.
                  </p>
                </div>

                <SecondaryButton onClick={limpiarFiltrosVentas}>
                  Limpiar filtros
                </SecondaryButton>
              </div>

              <div className="app-form-grid" style={styles.formGrid}>
                <select
                  value={filtroPeriodoVentas}
                  onChange={(event) =>
                    setFiltroPeriodoVentas(event.target.value)
                  }
                  style={styles.input}
                  aria-label="Filtrar por período"
                >
                  <option value="todas">Todas las fechas</option>
                  <option value="hoy">Hoy</option>
                  <option value="ultimos7">Últimos 7 días</option>
                  <option value="mes">Este mes</option>
                  <option value="personalizado">Rango personalizado</option>
                </select>

                <select
                  value={filtroMedioPago}
                  onChange={(event) =>
                    setFiltroMedioPago(event.target.value)
                  }
                  style={styles.input}
                  aria-label="Filtrar por medio de pago"
                >
                  <option value="Todos">Todos los medios de pago</option>
                  {mediosPagoEnVentas.map((medio) => (
                    <option key={medio} value={medio}>
                      {medio}
                    </option>
                  ))}
                </select>

                <select
                  value={filtroEstadoVenta}
                  onChange={(event) =>
                    setFiltroEstadoVenta(event.target.value)
                  }
                  style={styles.input}
                  aria-label="Filtrar por estado"
                >
                  <option value="Todas">Todos los estados</option>
                  <option value="Activas">Activas</option>
                  <option value="Anuladas">Anuladas</option>
                </select>

                <select
                  value={filtroClienteVenta}
                  onChange={(event) =>
                    setFiltroClienteVenta(event.target.value)
                  }
                  style={styles.input}
                  aria-label="Filtrar por cliente"
                >
                  <option value="Todos">Todos los clientes</option>
                  {clientesEnVentas.map((nombreCliente) => (
                    <option key={nombreCliente} value={nombreCliente}>
                      {nombreCliente}
                    </option>
                  ))}
                </select>

                <select
                  value={filtroProductoVenta}
                  onChange={(event) =>
                    setFiltroProductoVenta(event.target.value)
                  }
                  style={styles.input}
                  aria-label="Filtrar por producto"
                >
                  <option value="Todos">Todos los productos</option>
                  {productosEnVentas.map(([productoIdFiltro, nombre]) => (
                    <option
                      key={productoIdFiltro}
                      value={productoIdFiltro}
                    >
                      {nombre}
                    </option>
                  ))}
                </select>

                <Input
                  placeholder="Número de venta"
                  type="number"
                  value={filtroNumeroVenta}
                  onChange={setFiltroNumeroVenta}
                />

                <Input
                  placeholder="Importe mínimo"
                  type="number"
                  value={filtroImporteMinimo}
                  onChange={setFiltroImporteMinimo}
                />

                <Input
                  placeholder="Importe máximo"
                  type="number"
                  value={filtroImporteMaximo}
                  onChange={setFiltroImporteMaximo}
                />
              </div>

              {filtroPeriodoVentas === "personalizado" && (
                <div
                  className="app-form-grid-small"
                  style={{ ...styles.formGridSmall, marginTop: 12 }}
                >
                  <label style={{ fontWeight: 700, color: "#334155" }}>
                    Desde
                    <input
                      type="date"
                      value={filtroFechaDesde}
                      onChange={(event) =>
                        setFiltroFechaDesde(event.target.value)
                      }
                      style={{ ...styles.input, marginTop: 6 }}
                    />
                  </label>

                  <label style={{ fontWeight: 700, color: "#334155" }}>
                    Hasta
                    <input
                      type="date"
                      value={filtroFechaHasta}
                      onChange={(event) =>
                        setFiltroFechaHasta(event.target.value)
                      }
                      style={{ ...styles.input, marginTop: 6 }}
                    />
                  </label>
                </div>
              )}
            </div>

            <div className="app-cards-grid" style={styles.cardsGrid}>
              <Card
                title="Resultados"
                value={String(ventasFiltradas.length)}
              />
              <Card
                title="Ventas activas"
                value={String(ventasActivasFiltradas.length)}
              />
              <Card
                title="Total activo"
                value={money(totalVentasFiltradas)}
              />
              <Card
                title="Ticket promedio"
                value={money(ticketPromedioFiltrado)}
              />
            </div>

            {ventasAnuladasFiltradas > 0 && (
              <p style={{ ...styles.text, marginTop: 0 }}>
                El resultado incluye {ventasAnuladasFiltradas}{" "}
                {ventasAnuladasFiltradas === 1
                  ? "venta anulada"
                  : "ventas anuladas"}. Los totales consideran solamente ventas
                activas.
              </p>
            )}

            {ventasFiltradasOrdenadas.length === 0 ? (
              <Empty text="No hay ventas que coincidan con los filtros seleccionados." />
            ) : (
              ventasFiltradasOrdenadas.map((venta) => {
                const anulada = venta.estado === "anulada";
                const puedeAnularEstaVenta =
                  puedeAnularVentas &&
                  !anulada &&
                  caja.abierta &&
                  venta.cajaId === caja.id;

                return (
                  <div key={venta.id} style={styles.saleCard}>
                    <div className="app-sale-header" style={styles.saleHeader}>
                      <div>
                        <div style={styles.saleTitleRow}>
                          <strong>Venta #{venta.id}</strong>
                          <Badge danger={anulada}>
                            {anulada ? "Anulada" : "Activa"}
                          </Badge>
                        </div>
                        <p style={styles.saleMeta}>
                          {formatDate(venta.fecha)} - {venta.cliente} -{" "}
                          {venta.medioPago}
                          {venta.registradaPorEmail
                            ? ` · Vendió: ${venta.registradaPorEmail}`
                            : ""}
                        </p>
                      </div>

                      <strong
                        style={anulada ? styles.cancelledAmount : undefined}
                      >
                        {money(venta.total)}
                      </strong>
                    </div>

                    {venta.items.length > 0 && (
                      <div style={styles.saleItems}>
                        {venta.items.map((item, index) => (
                          <Row
                            key={`${venta.id}-${item.productoId}-${index}`}
                            left={`${item.nombre} x ${item.cantidad}`}
                            right={money(item.subtotal)}
                          />
                        ))}
                      </div>
                    )}

                    {anulada && (
                      <div style={styles.cancellationNotice}>
                        <strong>Motivo:</strong>{" "}
                        {venta.motivoAnulacion || "Sin motivo informado"}
                        {venta.anuladaAt && (
                          <span> · Anulada el {formatDate(venta.anuladaAt)}</span>
                        )}
                      </div>
                    )}

                    {puedeAnularEstaVenta && (
                      <div className="app-actions" style={styles.actions}>
                        <button
                          style={styles.smallButtonDanger}
                          onClick={() => iniciarAnulacion(venta)}
                        >
                          Anular venta
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </>
        )}
      </Panel>

      {mostrarRegistroRapido && (
        <div className="app-modal-backdrop" style={styles.modalBackdrop}>
          <div className="app-modal-box" style={styles.modalBox}>
            <h3 style={styles.panelTitle}>Producto no encontrado</h3>
            <p style={styles.text}>
              El código <strong>{nuevoProductoRapido.codigo}</strong> no está
              registrado. Completá los datos para crearlo sin salir de Ventas.
            </p>

            <div className="app-form-grid-small" style={styles.formGridSmall}>
              <Input
                placeholder="Nombre del producto"
                value={nuevoProductoRapido.nombre}
                onChange={(valor) =>
                  setNuevoProductoRapido({
                    ...nuevoProductoRapido,
                    nombre: valor,
                  })
                }
              />

              <Input
                placeholder="Código de barras o código interno"
                value={nuevoProductoRapido.codigo}
                onChange={(valor) =>
                  setNuevoProductoRapido({
                    ...nuevoProductoRapido,
                    codigo: valor,
                  })
                }
              />

              <Input
                placeholder="Categoría"
                value={nuevoProductoRapido.categoria}
                onChange={(valor) =>
                  setNuevoProductoRapido({
                    ...nuevoProductoRapido,
                    categoria: valor,
                  })
                }
              />

              <Input
                placeholder="Precio de venta"
                type="number"
                value={nuevoProductoRapido.precio}
                onChange={(valor) =>
                  setNuevoProductoRapido({
                    ...nuevoProductoRapido,
                    precio: valor,
                  })
                }
              />

              <Input
                placeholder="Costo"
                type="number"
                value={nuevoProductoRapido.costo}
                onChange={(valor) =>
                  setNuevoProductoRapido({
                    ...nuevoProductoRapido,
                    costo: valor,
                  })
                }
              />

              <Input
                placeholder="Stock inicial"
                type="number"
                value={nuevoProductoRapido.stock}
                onChange={(valor) =>
                  setNuevoProductoRapido({
                    ...nuevoProductoRapido,
                    stock: valor,
                  })
                }
              />

              <Input
                placeholder="Stock mínimo"
                type="number"
                value={nuevoProductoRapido.minimo}
                onChange={(valor) =>
                  setNuevoProductoRapido({
                    ...nuevoProductoRapido,
                    minimo: valor,
                  })
                }
              />
            </div>

            <div className="app-actions" style={styles.actions}>
              <Button onClick={registrarProductoDesdeVenta}>
                {guardandoProductoRapido
                  ? "Registrando..."
                  : "Registrar y agregar al carrito"}
              </Button>
              <SecondaryButton onClick={cancelarRegistroRapidoProducto}>
                Cancelar
              </SecondaryButton>
            </div>
          </div>
        </div>
      )}

      {ventaAnulando && (
        <div className="app-modal-backdrop" style={styles.modalBackdrop}>
          <div className="app-modal-box" style={styles.modalBox}>
            <h3 style={styles.panelTitle}>Anular venta #{ventaAnulando.id}</h3>
            <p style={styles.text}>
              Esta operación devolverá el stock y registrará un egreso
              compensatorio en la caja actual.
            </p>

            <textarea
              value={motivoAnulacion}
              onChange={(e) => setMotivoAnulacion(e.target.value)}
              placeholder="Motivo obligatorio"
              className="app-textarea" style={styles.textarea}
              rows={4}
              maxLength={300}
            />

            <div className="app-actions" style={styles.actions}>
              <Button onClick={confirmarAnulacion}>
                {anulandoVenta ? "Anulando..." : "Confirmar anulación"}
              </Button>
              <SecondaryButton onClick={cancelarAnulacion}>
                Cancelar
              </SecondaryButton>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Gastos({
  gastos,
  setGastos,
  comercioActual,
  recargarDatos,
}: {
  gastos: Gasto[];
  setGastos: (gastos: Gasto[]) => void;
  comercioActual: Comercio | null;
  recargarDatos: () => Promise<void>;
}) {
  const [form, setForm] = useState({
    categoria: "",
    concepto: "",
    proveedor: "",
    monto: "",
    medioPago: "Efectivo",
    observaciones: "",
  });

  const totalGastos = gastos.reduce((acc, gasto) => acc + gasto.monto, 0);

  async function agregarGasto() {
    if (!comercioActual) {
      alert("No hay comercio asociado.");
      return;
    }

    if (!form.categoria || !form.concepto || !form.monto) {
      alert("Completá categoría, concepto y monto.");
      return;
    }

    const { data, error } = await supabase
      .from("gastos")
      .insert({
        comercio_id: comercioActual.id,
        categoria: form.categoria,
        concepto: form.concepto,
        proveedor: form.proveedor,
        monto: Number(form.monto),
        medio_pago: form.medioPago,
        observaciones: form.observaciones,
      })
      .select()
      .single();

    if (error) {
      alert("Error al guardar gasto: " + error.message);
      return;
    }

    setGastos([
      {
        id: data.id,
        comercioId: data.comercio_id,
        fecha: data.fecha,
        categoria: data.categoria || "",
        concepto: data.concepto || "",
        proveedor: data.proveedor || "",
        monto: Number(data.monto || 0),
        medioPago: data.medio_pago || "",
        observaciones: data.observaciones || "",
      },
      ...gastos,
    ]);

    setForm({
      categoria: "",
      concepto: "",
      proveedor: "",
      monto: "",
      medioPago: "Efectivo",
      observaciones: "",
    });

    await recargarDatos();
  }

  return (
    <>
      <Header
        title="Gastos"
        subtitle="Carga de gastos para mejorar reportes financieros y flujo de caja."
      />

      <div className="app-cards-grid" style={styles.cardsGrid}>
        <Card title="Gastos cargados" value={String(gastos.length)} />
        <Card title="Total de gastos" value={money(totalGastos)} />
        <Card
          title="Último gasto"
          value={gastos[0] ? money(gastos[0].monto) : "$ 0"}
        />
        <Card
          title="Categorías"
          value={String(new Set(gastos.map((g) => g.categoria)).size)}
        />
      </div>

      <Panel title="Nuevo gasto">
        <div className="app-form-grid" style={styles.formGrid}>
          <Input
            placeholder="Categoría"
            value={form.categoria}
            onChange={(v) => setForm({ ...form, categoria: v })}
          />
          <Input
            placeholder="Concepto"
            value={form.concepto}
            onChange={(v) => setForm({ ...form, concepto: v })}
          />
          <Input
            placeholder="Proveedor"
            value={form.proveedor}
            onChange={(v) => setForm({ ...form, proveedor: v })}
          />
          <Input
            placeholder="Monto"
            type="number"
            value={form.monto}
            onChange={(v) => setForm({ ...form, monto: v })}
          />
          <select
            value={form.medioPago}
            onChange={(e) => setForm({ ...form, medioPago: e.target.value })}
            style={styles.input}
          >
            <option>Efectivo</option>
            <option>Transferencia</option>
            <option>Tarjeta</option>
            <option>Mercado Pago</option>
            <option>Otro</option>
          </select>
          <Input
            placeholder="Observaciones"
            value={form.observaciones}
            onChange={(v) => setForm({ ...form, observaciones: v })}
          />
        </div>

        <div className="app-actions" style={styles.actions}>
          <Button onClick={agregarGasto}>Guardar gasto</Button>
        </div>
      </Panel>

      <Panel title="Gastos registrados">
        {gastos.length === 0 ? (
          <Empty text="Todavía no hay gastos cargados." />
        ) : (
          gastos.map((gasto) => (
            <Row
              key={gasto.id}
              left={`${formatDate(gasto.fecha)} - ${gasto.categoria} - ${gasto.concepto}${gasto.proveedor ? ` - ${gasto.proveedor}` : ""}`}
              right={money(gasto.monto)}
            />
          ))
        )}
      </Panel>
    </>
  );
}

function Capacitaciones({
  capacitaciones,
  setCapacitaciones,
  inscripciones,
  setInscripciones,
  comercioActual,
  usuario,
  rolUsuario,
  recargarDatos,
}: {
  capacitaciones: Capacitacion[];
  setCapacitaciones: (capacitaciones: Capacitacion[]) => void;
  inscripciones: InscripcionCapacitacion[];
  setInscripciones: (inscripciones: InscripcionCapacitacion[]) => void;
  comercioActual: Comercio | null;
  usuario: any;
  rolUsuario: string;
  recargarDatos: () => Promise<void>;
}) {
  const esSecretaria = rolUsuario === "admin_secretaria";

  const [form, setForm] = useState({
    titulo: "",
    descripcion: "",
    modalidad: "Presencial",
    lugar: "",
    fechaInicio: "",
    fechaFin: "",
    cupos: "",
    destinatarios: "",
    link: "",
    estado: "activa",
  });

  const [inscripcionActiva, setInscripcionActiva] = useState<number | null>(
    null,
  );
  const [formInscripcion, setFormInscripcion] = useState({
    nombre: "",
    telefono: "",
    observaciones: "",
  });

  async function crearCapacitacion() {
    if (!esSecretaria) return;

    if (!form.titulo) {
      alert("Ingresá el título de la capacitación.");
      return;
    }

    const { data, error } = await supabase
      .from("capacitaciones")
      .insert({
        titulo: form.titulo,
        descripcion: form.descripcion,
        modalidad: form.modalidad,
        lugar: form.lugar,
        fecha_inicio: form.fechaInicio || null,
        fecha_fin: form.fechaFin || null,
        cupos: form.cupos ? Number(form.cupos) : null,
        destinatarios: form.destinatarios,
        link: form.link,
        estado: form.estado,
      })
      .select()
      .single();

    if (error) {
      alert("Error al crear capacitación: " + error.message);
      return;
    }

    setCapacitaciones([
      ...capacitaciones,
      {
        id: data.id,
        titulo: data.titulo,
        descripcion: data.descripcion || "",
        modalidad: data.modalidad || "",
        lugar: data.lugar || "",
        fechaInicio: data.fecha_inicio,
        fechaFin: data.fecha_fin,
        cupos: data.cupos === null ? null : Number(data.cupos),
        destinatarios: data.destinatarios || "",
        link: data.link || "",
        estado: data.estado || "activa",
        createdAt: data.created_at,
      },
    ]);

    setForm({
      titulo: "",
      descripcion: "",
      modalidad: "Presencial",
      lugar: "",
      fechaInicio: "",
      fechaFin: "",
      cupos: "",
      destinatarios: "",
      link: "",
      estado: "activa",
    });

    await recargarDatos();
  }

  async function cambiarEstadoCapacitacion(
    capacitacion: Capacitacion,
    estado: string,
  ) {
    if (!esSecretaria) return;

    const { data, error } = await supabase
      .from("capacitaciones")
      .update({ estado })
      .eq("id", capacitacion.id)
      .select()
      .single();

    if (error) {
      alert("Error al cambiar estado: " + error.message);
      return;
    }

    setCapacitaciones(
      capacitaciones.map((c) =>
        c.id === capacitacion.id
          ? {
              ...c,
              estado: data.estado || estado,
            }
          : c,
      ),
    );
  }

  async function inscribirse(capacitacion: Capacitacion) {
    if (!usuario || !comercioActual) {
      alert("No hay usuario o comercio asociado.");
      return;
    }

    if (!formInscripcion.nombre || !formInscripcion.telefono) {
      alert("Completá nombre y teléfono de la persona inscripta.");
      return;
    }

    const yaInscripto = inscripciones.some(
      (i) =>
        i.capacitacionId === capacitacion.id &&
        i.comercioId === comercioActual.id,
    );

    if (yaInscripto) {
      alert("Este comercio ya está inscripto en esta capacitación.");
      return;
    }

    const { data, error } = await supabase
      .from("capacitaciones_inscripciones")
      .insert({
        capacitacion_id: capacitacion.id,
        user_id: usuario.id,
        comercio_id: comercioActual.id,
        nombre_comercio: comercioActual.nombre,
        email_usuario: usuario.email,
        nombre_inscripto: formInscripcion.nombre,
        telefono_inscripto: formInscripcion.telefono,
        observaciones: formInscripcion.observaciones,
        estado: "inscripto",
      })
      .select()
      .single();

    if (error) {
      alert("Error al inscribirse: " + error.message);
      return;
    }

    setInscripciones([
      {
        id: data.id,
        capacitacionId: data.capacitacion_id,
        userId: data.user_id,
        comercioId: data.comercio_id,
        nombreComercio: data.nombre_comercio || "",
        emailUsuario: data.email_usuario || "",
        nombreInscripto: data.nombre_inscripto || "",
        telefonoInscripto: data.telefono_inscripto || "",
        observaciones: data.observaciones || "",
        estado: data.estado || "inscripto",
        createdAt: data.created_at,
      },
      ...inscripciones,
    ]);

    setInscripcionActiva(null);
    setFormInscripcion({ nombre: "", telefono: "", observaciones: "" });
    alert("Inscripción registrada correctamente.");
    await recargarDatos();
  }

  const capacitacionesActivas = capacitaciones.filter(
    (c) => c.estado !== "finalizada",
  );

  return (
    <>
      <Header
        title="Capacitaciones"
        subtitle={
          esSecretaria
            ? "Carga de capacitaciones e inscriptos de comercios."
            : "Capacitaciones disponibles para comercios del distrito."
        }
      />

      <div className="app-cards-grid" style={styles.cardsGrid}>
        <Card title="Capacitaciones" value={String(capacitaciones.length)} />
        <Card title="Activas" value={String(capacitacionesActivas.length)} />
        <Card title="Inscripciones" value={String(inscripciones.length)} />
        <Card title="Rol" value={esSecretaria ? "Secretaría" : "Comercio"} />
      </div>

      {esSecretaria && (
        <Panel title="Nueva capacitación">
          <div className="app-form-grid" style={styles.formGrid}>
            <Input
              placeholder="Título"
              value={form.titulo}
              onChange={(v) => setForm({ ...form, titulo: v })}
            />
            <Input
              placeholder="Descripción"
              value={form.descripcion}
              onChange={(v) => setForm({ ...form, descripcion: v })}
            />
            <select
              value={form.modalidad}
              onChange={(e) => setForm({ ...form, modalidad: e.target.value })}
              style={styles.input}
            >
              <option>Presencial</option>
              <option>Virtual</option>
              <option>Mixta</option>
            </select>
            <Input
              placeholder="Lugar"
              value={form.lugar}
              onChange={(v) => setForm({ ...form, lugar: v })}
            />
            <Input
              placeholder="Fecha de inicio"
              type="datetime-local"
              value={form.fechaInicio}
              onChange={(v) => setForm({ ...form, fechaInicio: v })}
            />
            <Input
              placeholder="Fecha de fin"
              type="datetime-local"
              value={form.fechaFin}
              onChange={(v) => setForm({ ...form, fechaFin: v })}
            />
            <Input
              placeholder="Cupos"
              type="number"
              value={form.cupos}
              onChange={(v) => setForm({ ...form, cupos: v })}
            />
            <Input
              placeholder="Destinatarios"
              value={form.destinatarios}
              onChange={(v) => setForm({ ...form, destinatarios: v })}
            />
            <Input
              placeholder="Link"
              value={form.link}
              onChange={(v) => setForm({ ...form, link: v })}
            />
            <select
              value={form.estado}
              onChange={(e) => setForm({ ...form, estado: e.target.value })}
              style={styles.input}
            >
              <option value="activa">Activa</option>
              <option value="proxima">Próxima</option>
              <option value="finalizada">Finalizada</option>
            </select>
          </div>

          <div className="app-actions" style={styles.actions}>
            <Button onClick={crearCapacitacion}>Publicar capacitación</Button>
          </div>
        </Panel>
      )}

      <Panel title="Capacitaciones disponibles">
        {capacitaciones.length === 0 ? (
          <Empty text="Todavía no hay capacitaciones cargadas." />
        ) : (
          capacitaciones.map((capacitacion) => {
            const inscriptos = inscripciones.filter(
              (i) => i.capacitacionId === capacitacion.id,
            );
            const yaInscripto = comercioActual
              ? inscriptos.some((i) => i.comercioId === comercioActual.id)
              : false;

            return (
              <div key={capacitacion.id} style={styles.capacitacionCard}>
                <div className="app-capacitacion-header" style={styles.capacitacionHeader}>
                  <div>
                    <h3 style={styles.capacitacionTitle}>
                      {capacitacion.titulo}
                    </h3>
                    <p style={styles.text}>
                      {capacitacion.descripcion || "Sin descripción."}
                    </p>
                  </div>
                  <Badge danger={capacitacion.estado === "finalizada"}>
                    {capacitacion.estado}
                  </Badge>
                </div>

                <div className="app-capacitacion-meta-grid" style={styles.capacitacionMetaGrid}>
                  <span>
                    Modalidad:{" "}
                    <strong>{capacitacion.modalidad || "Sin dato"}</strong>
                  </span>
                  <span>
                    Lugar: <strong>{capacitacion.lugar || "Sin dato"}</strong>
                  </span>
                  <span>
                    Inicio:{" "}
                    <strong>
                      {capacitacion.fechaInicio
                        ? formatDate(capacitacion.fechaInicio)
                        : "Sin fecha"}
                    </strong>
                  </span>
                  <span>
                    Cupos: <strong>{capacitacion.cupos ?? "Sin límite"}</strong>
                  </span>
                  <span>
                    Inscriptos: <strong>{inscriptos.length}</strong>
                  </span>
                  <span>
                    Destinatarios:{" "}
                    <strong>{capacitacion.destinatarios || "Comercios"}</strong>
                  </span>
                </div>

                {capacitacion.link && (
                  <p style={styles.text}>Link: {capacitacion.link}</p>
                )}

                {!esSecretaria && capacitacion.estado !== "finalizada" && (
                  <div className="app-actions" style={styles.actions}>
                    {yaInscripto ? (
                      <Badge>Ya inscripto</Badge>
                    ) : (
                      <Button
                        onClick={() =>
                          setInscripcionActiva(
                            inscripcionActiva === capacitacion.id
                              ? null
                              : capacitacion.id,
                          )
                        }
                      >
                        Inscribirme
                      </Button>
                    )}
                  </div>
                )}

                {inscripcionActiva === capacitacion.id && !yaInscripto && (
                  <div style={styles.inscriptionBox}>
                    <div className="app-form-grid-small" style={styles.formGridSmall}>
                      <Input
                        placeholder="Nombre de la persona"
                        value={formInscripcion.nombre}
                        onChange={(v) =>
                          setFormInscripcion({ ...formInscripcion, nombre: v })
                        }
                      />
                      <Input
                        placeholder="Teléfono"
                        value={formInscripcion.telefono}
                        onChange={(v) =>
                          setFormInscripcion({
                            ...formInscripcion,
                            telefono: v,
                          })
                        }
                      />
                      <Input
                        placeholder="Observaciones"
                        value={formInscripcion.observaciones}
                        onChange={(v) =>
                          setFormInscripcion({
                            ...formInscripcion,
                            observaciones: v,
                          })
                        }
                      />
                    </div>
                    <div className="app-actions" style={styles.actions}>
                      <Button onClick={() => inscribirse(capacitacion)}>
                        Confirmar inscripción
                      </Button>
                      <SecondaryButton
                        onClick={() => setInscripcionActiva(null)}
                      >
                        Cancelar
                      </SecondaryButton>
                    </div>
                  </div>
                )}

                {esSecretaria && (
                  <div className="app-actions" style={styles.actions}>
                    <SecondaryButton
                      onClick={() =>
                        cambiarEstadoCapacitacion(
                          capacitacion,
                          capacitacion.estado === "finalizada"
                            ? "activa"
                            : "finalizada",
                        )
                      }
                    >
                      {capacitacion.estado === "finalizada"
                        ? "Reactivar"
                        : "Finalizar"}
                    </SecondaryButton>
                  </div>
                )}

                {esSecretaria && inscriptos.length > 0 && (
                  <div style={{ marginTop: 16 }}>
                    <h4 style={styles.miniTitle}>Inscriptos</h4>
                    {inscriptos.map((inscripto) => (
                      <Row
                        key={inscripto.id}
                        left={`${inscripto.nombreComercio} - ${inscripto.nombreInscripto} - ${inscripto.telefonoInscripto}`}
                        right={formatDate(inscripto.createdAt)}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </Panel>
    </>
  );
}

function Reportes({
  ventas,
  productos,
  ventasDelDia,
  productosStockBajo,
  ingresosCaja,
  egresosCaja,
  saldoCajaEstimado,
  historialCajas,
  gastos,
  clientes,
}: {
  ventas: Venta[];
  productos: Producto[];
  ventasDelDia: number;
  productosStockBajo: Producto[];
  ingresosCaja: number;
  egresosCaja: number;
  saldoCajaEstimado: number;
  historialCajas: HistorialCaja[];
  gastos: Gasto[];
  clientes: Cliente[];
}) {
  const ventasPorDia = useMemo(() => {
    const mapa: Record<string, { total: number; cantidad: number }> = {};

    ventas.forEach((venta) => {
      const fecha = new Date(venta.fecha);
      const clave = fecha.toLocaleDateString("es-AR");

      if (!mapa[clave]) mapa[clave] = { total: 0, cantidad: 0 };

      mapa[clave].total += venta.total;
      mapa[clave].cantidad += 1;
    });

    return Object.entries(mapa)
      .map(([fecha, datos]) => ({
        fecha,
        total: datos.total,
        cantidad: datos.cantidad,
      }))
      .sort(
        (a, b) =>
          parseFechaAR(a.fecha).getTime() - parseFechaAR(b.fecha).getTime(),
      );
  }, [ventas]);

  const ventasPorMes = useMemo(() => {
    const mapa: Record<string, number> = {};

    ventas.forEach((venta) => {
      const fecha = new Date(venta.fecha);
      const clave = `${fecha.getMonth() + 1}/${fecha.getFullYear()}`;
      mapa[clave] = (mapa[clave] || 0) + venta.total;
    });

    return Object.entries(mapa)
      .map(([mes, total]) => ({ mes, total }))
      .sort((a, b) => {
        const [mesA, anioA] = a.mes.split("/").map(Number);
        const [mesB, anioB] = b.mes.split("/").map(Number);
        return (
          new Date(anioA, mesA - 1, 1).getTime() -
          new Date(anioB, mesB - 1, 1).getTime()
        );
      });
  }, [ventas]);

  const productosVendidos = useMemo(() => {
    const mapa: Record<string, { cantidad: number; total: number }> = {};

    ventas.forEach((venta) => {
      venta.items.forEach((item) => {
        if (!mapa[item.nombre]) mapa[item.nombre] = { cantidad: 0, total: 0 };
        mapa[item.nombre].cantidad += item.cantidad;
        mapa[item.nombre].total += item.subtotal;
      });
    });

    return Object.entries(mapa)
      .map(([nombre, datos]) => ({
        nombre,
        cantidad: datos.cantidad,
        total: datos.total,
      }))
      .sort((a, b) => b.cantidad - a.cantidad);
  }, [ventas]);

  const ventasPorMedioPago = useMemo(() => {
    const mapa: Record<string, number> = {};
    ventas.forEach((venta) => {
      mapa[venta.medioPago] = (mapa[venta.medioPago] || 0) + venta.total;
    });
    return Object.entries(mapa)
      .map(([medio, total]) => ({ medio, total }))
      .sort((a, b) => b.total - a.total);
  }, [ventas]);

  const ventasPorDiaSemana = useMemo(() => {
    const mapa: Record<string, number> = {};
    ventas.forEach((venta) => {
      const dia = new Date(venta.fecha).toLocaleDateString("es-AR", {
        weekday: "long",
      });
      mapa[dia] = (mapa[dia] || 0) + venta.total;
    });
    return Object.entries(mapa)
      .map(([dia, total]) => ({ dia, total }))
      .sort((a, b) => b.total - a.total);
  }, [ventas]);

  const clientesRanking = useMemo(() => {
    return clientes
      .map((cliente) => {
        const historial = ventas.filter((venta) => {
          if (venta.clienteId) return venta.clienteId === cliente.id;
          return venta.cliente === cliente.nombre;
        });
        const total = historial.reduce((acc, venta) => acc + venta.total, 0);
        const ticket = historial.length > 0 ? total / historial.length : 0;
        return {
          nombre: cliente.nombre,
          cantidad: historial.length,
          total,
          ticket,
        };
      })
      .filter((cliente) => cliente.cantidad > 0)
      .sort((a, b) => b.total - a.total);
  }, [clientes, ventas]);

  const ventasIdentificadas = ventas.filter(
    (venta) => venta.cliente !== "Consumidor final",
  ).length;
  const ventasConsumidorFinal = ventas.length - ventasIdentificadas;

  const costoMercaderiaVendida = ventas.reduce((acc, venta) => {
    return (
      acc +
      venta.items.reduce((total, item) => {
        const producto = productos.find((p) => p.id === item.productoId);
        if (!producto) return total;
        return total + producto.costo * item.cantidad;
      }, 0)
    );
  }, 0);

  const margenBruto = ventasDelDia - costoMercaderiaVendida;
  const totalGastos = gastos.reduce((acc, gasto) => acc + gasto.monto, 0);
  const resultadoEstimado = margenBruto - totalGastos;
  const ticketPromedio = ventas.length > 0 ? ventasDelDia / ventas.length : 0;
  const totalUltimos7Dias = ventasPorDia
    .slice(-7)
    .reduce((acc, dia) => acc + dia.total, 0);
  const promedioDiario =
    ventasPorDia.length > 0 ? ventasDelDia / ventasPorDia.length : 0;
  const mejorDia = ventasPorDia.reduce(
    (mejor, dia) => (dia.total > mejor.total ? dia : mejor),
    { fecha: "Sin datos", total: 0, cantidad: 0 },
  );

  const idsVendidos = new Set(
    ventas.flatMap((venta) => venta.items.map((item) => item.productoId)),
  );
  const productosSinVentas = productos.filter(
    (producto) => producto.activo && !idsVendidos.has(producto.id),
  );
  const productosFaltantes = productos.filter(
    (producto) => producto.activo && producto.stock <= 0,
  );

  const rotacion = productos
    .map((producto) => {
      const vendido = ventas.reduce((acc, venta) => {
        return (
          acc +
          venta.items
            .filter((item) => item.productoId === producto.id)
            .reduce((t, item) => t + item.cantidad, 0)
        );
      }, 0);
      return { nombre: producto.nombre, vendido, stock: producto.stock };
    })
    .filter((producto) => producto.vendido > 0)
    .sort((a, b) => b.vendido - a.vendido);

  const maxVentaDiaria = Math.max(...ventasPorDia.map((dia) => dia.total), 0);
  const maxMes = Math.max(...ventasPorMes.map((mes) => mes.total), 0);
  const maxMedioPago = Math.max(...ventasPorMedioPago.map((m) => m.total), 0);
  const maxDiaSemana = Math.max(...ventasPorDiaSemana.map((d) => d.total), 0);
  const maxCliente = Math.max(...clientesRanking.map((c) => c.total), 0);

  return (
    <>
      <Header
        title="Reportes"
        subtitle="Ventas, stock, margen, gastos y flujo de caja."
      />

      <ReportMetricGroup
        title="Ventas"
        subtitle="Los indicadores principales para entender el nivel de actividad comercial."
      >
        <div className="app-report-metrics" style={styles.reportMetricsGrid}>
          <Card
            title="Ventas totales"
            value={money(ventasDelDia)}
            description="Suma de todas las ventas activas registradas."
            tone="blue"
            featured
          />
          <Card
            title="Ticket promedio"
            value={money(ticketPromedio)}
            description="Importe promedio gastado en cada operación."
            tone="purple"
            featured
          />
          <Card
            title="Ventas últimos 7 días"
            value={money(totalUltimos7Dias)}
            description="Total de los últimos siete días registrados con ventas."
            tone="cyan"
            featured
          />
        </div>
      </ReportMetricGroup>

      <ReportMetricGroup
        title="Rentabilidad"
        subtitle="Estimaciones para observar costos, gastos y resultado del negocio."
      >
        <div className="app-report-metrics" style={styles.reportMetricsGrid}>
          <Card
            title="Margen bruto"
            value={money(margenBruto)}
            description="Ventas menos el costo estimado de la mercadería vendida."
            tone="orange"
          />
          <Card
            title="Resultado estimado"
            value={money(resultadoEstimado)}
            description="Margen bruto menos los gastos registrados."
            tone={resultadoEstimado >= 0 ? "green" : "red"}
          />
          <Card
            title="Gastos cargados"
            value={money(totalGastos)}
            description="Suma de los gastos ingresados en el sistema."
            tone="red"
          />
        </div>
      </ReportMetricGroup>

      <ReportMetricGroup
        title="Actividad"
        subtitle="Datos para reconocer los momentos y tipos de venta más frecuentes."
      >
        <div className="app-report-metrics" style={styles.reportMetricsGrid}>
          <Card
            title="Promedio diario"
            value={money(promedioDiario)}
            description="Promedio vendido por cada día con actividad."
            tone="blue"
          />
          <Card
            title="Mejor día"
            value={mejorDia.fecha}
            description="Fecha con la mayor facturación registrada."
            tone="green"
          />
          <Card
            title="Consumidor final"
            value={String(ventasConsumidorFinal)}
            description="Ventas realizadas sin asociar un cliente registrado."
            tone="neutral"
          />
        </div>
      </ReportMetricGroup>

      <ReportMetricGroup
        title="Clientes"
        subtitle="Información para conocer cuánto se identifica y fideliza a los compradores."
      >
        <div className="app-report-metrics" style={styles.reportMetricsGrid}>
          <Card
            title="Clientes con compras"
            value={String(clientesRanking.length)}
            description="Clientes registrados que tienen al menos una compra."
            tone="purple"
          />
          <Card
            title="Ventas identificadas"
            value={String(ventasIdentificadas)}
            description="Operaciones asociadas a un cliente del comercio."
            tone="cyan"
          />
          <Card
            title="Clientes registrados"
            value={String(clientes.length)}
            description="Cantidad total de clientes guardados."
            tone="orange"
          />
        </div>
      </ReportMetricGroup>

      <div className="app-two-columns" style={styles.twoColumns}>
        <Panel title="Ventas diarias">
          {ventasPorDia.length === 0 ? (
            <Empty text="Todavía no hay ventas para graficar." />
          ) : (
            ventasPorDia.map((dia) => {
              const ancho =
                maxVentaDiaria > 0
                  ? Math.max((dia.total / maxVentaDiaria) * 100, 4)
                  : 0;
              return (
                <ChartRow
                  key={dia.fecha}
                  label={dia.fecha}
                  value={money(dia.total)}
                  width={ancho}
                />
              );
            })
          )}
        </Panel>

        <Panel title="Comparación entre meses">
          {ventasPorMes.length === 0 ? (
            <Empty text="Todavía no hay meses para comparar." />
          ) : (
            ventasPorMes.map((mes) => {
              const ancho =
                maxMes > 0 ? Math.max((mes.total / maxMes) * 100, 4) : 0;
              return (
                <ChartRow
                  key={mes.mes}
                  label={mes.mes}
                  value={money(mes.total)}
                  width={ancho}
                />
              );
            })
          )}
        </Panel>
      </div>

      <div className="app-two-columns" style={styles.twoColumns}>
        <Panel title="Clientes que más gastan">
          {clientesRanking.length === 0 ? (
            <Empty text="Todavía no hay clientes con compras." />
          ) : (
            clientesRanking.slice(0, 10).map((cliente) => {
              const ancho =
                maxCliente > 0
                  ? Math.max((cliente.total / maxCliente) * 100, 4)
                  : 0;
              return (
                <ChartRow
                  key={cliente.nombre}
                  label={`${cliente.nombre} (${cliente.cantidad} compras)`}
                  value={money(cliente.total)}
                  width={ancho}
                />
              );
            })
          )}
        </Panel>

        <Panel title="Clientes frecuentes">
          {clientesRanking.length === 0 ? (
            <Empty text="Todavía no hay compras asociadas a clientes." />
          ) : (
            clientesRanking
              .slice()
              .sort((a, b) => b.cantidad - a.cantidad)
              .slice(0, 10)
              .map((cliente) => (
                <Row
                  key={cliente.nombre}
                  left={cliente.nombre}
                  right={`${cliente.cantidad} compras / Ticket ${money(cliente.ticket)}`}
                />
              ))
          )}
        </Panel>
      </div>

      <div className="app-two-columns" style={styles.twoColumns}>
        <Panel title="Días con más ventas">
          {ventasPorDiaSemana.length === 0 ? (
            <Empty text="Todavía no hay ventas registradas." />
          ) : (
            ventasPorDiaSemana.map((dia) => {
              const ancho =
                maxDiaSemana > 0
                  ? Math.max((dia.total / maxDiaSemana) * 100, 4)
                  : 0;
              return (
                <ChartRow
                  key={dia.dia}
                  label={dia.dia}
                  value={money(dia.total)}
                  width={ancho}
                />
              );
            })
          )}
        </Panel>

        <Panel title="Ventas por medio de pago">
          {ventasPorMedioPago.length === 0 ? (
            <Empty text="Todavía no hay medios de pago registrados." />
          ) : (
            ventasPorMedioPago.map((medio) => {
              const ancho =
                maxMedioPago > 0
                  ? Math.max((medio.total / maxMedioPago) * 100, 4)
                  : 0;
              return (
                <ChartRow
                  key={medio.medio}
                  label={medio.medio}
                  value={money(medio.total)}
                  width={ancho}
                />
              );
            })
          )}
        </Panel>
      </div>

      <div className="app-two-columns" style={styles.twoColumns}>
        <Panel title="Productos más vendidos">
          {productosVendidos.length === 0 ? (
            <Empty text="Todavía no hay productos vendidos." />
          ) : (
            productosVendidos
              .slice(0, 10)
              .map((p) => (
                <Row
                  key={p.nombre}
                  left={p.nombre}
                  right={`${p.cantidad} unidades / ${money(p.total)}`}
                />
              ))
          )}
        </Panel>

        <Panel title="Rotación de mercadería">
          {rotacion.length === 0 ? (
            <Empty text="Todavía no hay rotación calculable." />
          ) : (
            rotacion
              .slice(0, 10)
              .map((p) => (
                <Row
                  key={p.nombre}
                  left={p.nombre}
                  right={`Vendidas: ${p.vendido} / Stock: ${p.stock}`}
                />
              ))
          )}
        </Panel>
      </div>

      <div className="app-two-columns" style={styles.twoColumns}>
        <Panel title="Productos y stock">
          <Row
            left="Stock disponible total"
            right={`${productos.reduce((acc, p) => acc + p.stock, 0)} unidades`}
          />
          <Row
            left="Productos con poco stock"
            right={String(productosStockBajo.length)}
          />
          <Row
            left="Productos faltantes"
            right={String(productosFaltantes.length)}
          />
          <Row
            left="Productos sin ventas"
            right={String(productosSinVentas.length)}
          />
        </Panel>

        <Panel title="Finanzas y flujo de caja">
          <Row left="Ingresos por ventas" right={money(ventasDelDia)} />
          <Row
            left="Costos estimados de mercadería"
            right={money(costoMercaderiaVendida)}
          />
          <Row left="Gastos del negocio" right={money(totalGastos)} />
          <Row
            left="Flujo de caja actual"
            right={money(saldoCajaEstimado)}
            bold
          />
        </Panel>
      </div>

      <div className="app-two-columns" style={styles.twoColumns}>
        <Panel title="Productos con stock bajo">
          {productosStockBajo.length === 0 ? (
            <Empty text="No hay productos con stock bajo." />
          ) : (
            productosStockBajo.map((p) => (
              <Row key={p.id} left={p.nombre} right={`Stock: ${p.stock}`} />
            ))
          )}
        </Panel>

        <Panel title="Productos sin ventas">
          {productosSinVentas.length === 0 ? (
            <Empty text="No hay productos sin ventas." />
          ) : (
            productosSinVentas
              .slice(0, 10)
              .map((p) => (
                <Row key={p.id} left={p.nombre} right={`Stock: ${p.stock}`} />
              ))
          )}
        </Panel>
      </div>
    </>
  );
}

function Header({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle: string;
  action?: React.ReactNode;
}) {
  return (
    <header className="app-header" style={styles.header}>
      <div>
        <h2 className="app-title" style={styles.title}>{title}</h2>
        <p style={styles.subtitle}>{subtitle}</p>
      </div>
      {action ? <div className="app-header-action">{action}</div> : null}
    </header>
  );
}

function Card({
  title,
  value,
  description,
  tone = "neutral",
  featured = false,
}: {
  title: string;
  value: string;
  description?: string;
  tone?: "neutral" | "red" | "blue" | "green" | "orange" | "purple" | "cyan";
  featured?: boolean;
}) {
  const tonos = {
    neutral: {
      background: "linear-gradient(145deg, #ffffff, #f8fafc)",
      border: "#dbe3ee",
      accent: "#475569",
      glow: "rgba(71,85,105,0.08)",
    },
    red: {
      background: "linear-gradient(145deg, #ffffff, #fff1f2)",
      border: "#fecdd3",
      accent: "#dc2626",
      glow: "rgba(220,38,38,0.12)",
    },
    blue: {
      background: "linear-gradient(145deg, #ffffff, #eff6ff)",
      border: "#bfdbfe",
      accent: "#2563eb",
      glow: "rgba(37,99,235,0.12)",
    },
    green: {
      background: "linear-gradient(145deg, #ffffff, #ecfdf5)",
      border: "#a7f3d0",
      accent: "#059669",
      glow: "rgba(5,150,105,0.12)",
    },
    orange: {
      background: "linear-gradient(145deg, #ffffff, #fff7ed)",
      border: "#fed7aa",
      accent: "#ea580c",
      glow: "rgba(234,88,12,0.12)",
    },
    purple: {
      background: "linear-gradient(145deg, #ffffff, #f5f3ff)",
      border: "#ddd6fe",
      accent: "#7c3aed",
      glow: "rgba(124,58,237,0.12)",
    },
    cyan: {
      background: "linear-gradient(145deg, #ffffff, #ecfeff)",
      border: "#a5f3fc",
      accent: "#0891b2",
      glow: "rgba(8,145,178,0.12)",
    },
  } as const;

  const apariencia = tonos[tone];

  return (
    <div
      className={`app-metric-card ${featured ? "featured" : ""}`}
      style={{
        ...styles.card,
        minHeight: featured ? 162 : description ? 142 : 108,
        background: apariencia.background,
        borderColor: apariencia.border,
        boxShadow: featured
          ? `0 18px 44px ${apariencia.glow}`
          : `0 12px 30px ${apariencia.glow}`,
      }}
    >
      <span
        style={{
          ...styles.cardHex,
          color: apariencia.accent,
          borderColor: apariencia.border,
        }}
        aria-hidden="true"
      >
        ⬡
      </span>
      <p style={{ ...styles.cardTitle, color: apariencia.accent }}>{title}</p>
      <p style={styles.cardValue}>{value}</p>
      {description ? (
        <p style={styles.cardDescription}>{description}</p>
      ) : null}
    </div>
  );
}

function ReportMetricGroup({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <section style={styles.reportGroup}>
      <div style={styles.reportGroupHeader}>
        <span style={styles.reportGroupMarker} aria-hidden="true">
          ⬡
        </span>
        <div>
          <h3 style={styles.reportGroupTitle}>{title}</h3>
          <p style={styles.reportGroupSubtitle}>{subtitle}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

function Panel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="app-panel" style={styles.panel}>
      <h3 style={styles.panelTitle}>{title}</h3>
      <div style={{ marginTop: 14 }}>{children}</div>
    </div>
  );
}

function Table({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-table-wrapper" style={styles.tableWrapper}>
      <table className="app-table" style={styles.table}>{children}</table>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th style={styles.th}>{children}</th>;
}

function Td({ children }: { children: React.ReactNode }) {
  return <td style={styles.td}>{children}</td>;
}

function Input({
  placeholder,
  value,
  onChange,
  type = "text",
}: {
  placeholder: string;
  value: string;
  onChange: (valor: string) => void;
  type?: string;
}) {
  return (
    <input
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="app-input" style={styles.input}
    />
  );
}

function Button({
  children,
  onClick,
  disabled = false,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      className="app-primary-button"
      onClick={onClick}
      disabled={disabled}
      aria-disabled={disabled}
      style={{
        ...styles.button,
        opacity: disabled ? 0.65 : 1,
        cursor: disabled ? "not-allowed" : "pointer",
      }}
    >
      {children}
    </button>
  );
}

function SecondaryButton({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button className="app-secondary-button" onClick={onClick} style={styles.secondaryButton}>
      {children}
    </button>
  );
}

function Badge({
  children,
  danger,
}: {
  children: React.ReactNode;
  danger?: boolean;
}) {
  return (
    <span
      style={{
        ...styles.badge,
        background: danger ? "#fee2e2" : "#dcfce7",
        color: danger ? "#991b1b" : "#166534",
      }}
    >
      {children}
    </span>
  );
}

function Row({
  left,
  right,
  bold = false,
}: {
  left: string;
  right: string;
  bold?: boolean;
}) {
  return (
    <div className="app-row" style={styles.row}>
      <span style={{ fontWeight: bold ? "bold" : "normal" }}>{left}</span>
      <span style={{ fontWeight: "bold" }}>{right}</span>
    </div>
  );
}

function ChartRow({
  label,
  value,
  width,
}: {
  label: string;
  value: string;
  width: number;
}) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={styles.chartLabel}>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
      <div style={styles.chartTrack}>
        <div style={{ ...styles.chartBar, width: `${width}%` }} />
      </div>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <p style={styles.empty}>{text}</p>;
}


function ResponsiveStyles() {
  return (
    <style
      dangerouslySetInnerHTML={{
        __html: `
      html,
      body {
        margin: 0;
        width: 100%;
        max-width: 100%;
        overflow-x: hidden;
      }

      *,
      *::before,
      *::after {
        box-sizing: border-box;
      }

      .app-mobile-menu-button {
        display: none;
      }

      .app-sidebar-body {
        display: block;
      }

      .app-table-wrapper {
        -webkit-overflow-scrolling: touch;
      }

      @keyframes alertCriticalPulse {
        0%, 100% {
          transform: translateZ(0) scale(1);
          box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.46), 0 12px 30px rgba(185, 28, 28, 0.30);
        }
        50% {
          transform: translateZ(0) scale(1.035);
          box-shadow: 0 0 0 11px rgba(239, 68, 68, 0), 0 16px 38px rgba(185, 28, 28, 0.42);
        }
      }

      @keyframes alertWarningPulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.025); }
      }

      @keyframes syncGlow {
        0%, 100% { opacity: 0.72; }
        50% { opacity: 1; }
      }

      .app-alert-button.is-critical:not(.is-reviewed) {
        animation: alertCriticalPulse 1.55s ease-in-out infinite;
      }

      .app-alert-button.is-warning:not(.is-reviewed) {
        animation: alertWarningPulse 2.1s ease-in-out infinite;
      }

      .app-sync-badge > span {
        animation: syncGlow 1.7s ease-in-out infinite;
      }

      .app-sidebar::before {
        content: "";
        position: absolute;
        inset: 0;
        pointer-events: none;
        background-image:
          linear-gradient(rgba(248, 113, 113, 0.035) 1px, transparent 1px),
          linear-gradient(90deg, rgba(248, 113, 113, 0.035) 1px, transparent 1px);
        background-size: 28px 28px;
        mask-image: linear-gradient(to bottom, rgba(0,0,0,0.82), transparent 88%);
      }

      .app-nav-item {
        position: relative;
      }

      .app-nav-item:hover {
        transform: translateX(3px);
        border-color: rgba(248, 113, 113, 0.34) !important;
        background: rgba(127, 29, 29, 0.16) !important;
      }

      .app-nav-item.active:hover {
        background: linear-gradient(90deg, rgba(239,68,68,0.30), rgba(127,29,29,0.12)) !important;
      }

      .app-metric-card {
        transition: transform 0.2s ease, box-shadow 0.2s ease;
      }

      .app-metric-card:hover {
        transform: translateY(-3px);
      }

      @media (prefers-reduced-motion: reduce) {
        .app-alert-button,
        .app-sync-badge > span,
        .app-metric-card {
          animation: none !important;
          transition: none !important;
        }
      }

      @media (max-width: 1100px) {
        .app-content {
          padding: 26px !important;
        }

        .app-cards-grid,
        .app-report-metrics {
          grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
        }

        .app-form-grid {
          grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
        }

        .app-capacitacion-meta-grid,
        .app-client-stats-grid {
          grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
        }
      }

      @media (max-width: 760px) {
        .app-layout {
          display: block !important;
          min-height: 100vh !important;
        }

        .app-sidebar {
          width: 100% !important;
          min-height: 0 !important;
          height: auto !important;
          padding: 12px !important;
          position: sticky !important;
          top: 0 !important;
          z-index: 100 !important;
          overflow: visible !important;
          border-right: none !important;
          border-bottom: 1px solid rgba(248, 113, 113, 0.28) !important;
          box-shadow: 0 10px 28px rgba(15, 23, 42, 0.28) !important;
        }

        .app-sidebar-header {
          padding: 12px 14px !important;
          border-radius: 17px !important;
        }

        .app-sidebar-header h1 {
          font-size: 19px !important;
          margin-top: 5px !important;
        }

        .app-sidebar-header p {
          font-size: 9px !important;
        }

        .app-sidebar-header {
          display: grid !important;
          grid-template-columns: 48px minmax(0, 1fr) !important;
          column-gap: 10px !important;
          align-items: center !important;
        }

        .app-sidebar-header > div:first-child {
          grid-column: 1 !important;
          grid-row: 1 / span 3 !important;
          margin-bottom: 0 !important;
        }

        .app-sidebar-header h1,
        .app-sidebar-header p,
        .app-sidebar-header > div:last-child {
          grid-column: 2 !important;
        }

        .app-mobile-menu-button {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 9px;
          margin-top: 8px;
          min-height: 44px;
          border: 1px solid rgba(248, 113, 113, 0.36);
          border-radius: 14px;
          background: rgba(127, 29, 29, 0.65);
          color: white;
          font-weight: 900;
          cursor: pointer;
        }

        .app-sidebar-body {
          display: none;
        }

        .app-sidebar-body.open {
          display: block;
          max-height: calc(100vh - 155px);
          overflow-y: auto;
          padding: 4px 2px 8px;
          scrollbar-width: thin;
        }

        .app-sidebar-email {
          margin: 9px 4px !important;
          font-size: 11px !important;
        }

        .app-sidebar-nav {
          margin-top: 10px !important;
        }

        .app-nav-group {
          margin-bottom: 8px !important;
        }

        .app-nav-group-title {
          display: none !important;
        }

        .app-nav-item {
          min-height: 44px;
          padding: 11px 12px !important;
          margin-bottom: 6px !important;
          font-size: 14px !important;
        }

        .app-content {
          width: 100% !important;
          min-width: 0 !important;
          padding: 18px 12px 30px !important;
          overflow: visible !important;
        }

        .app-header {
          flex-direction: column !important;
          align-items: stretch !important;
          gap: 12px !important;
          margin-bottom: 20px !important;
        }

        .app-title {
          font-size: 29px !important;
          line-height: 1.08 !important;
          overflow-wrap: anywhere;
        }

        .app-header-action,
        .app-header-action > * {
          width: 100%;
        }

        .app-header-action > button {
          justify-content: center !important;
        }

        .app-cards-grid,
        .app-cards-grid-three,
        .app-report-metrics,
        .app-two-columns,
        .app-form-grid,
        .app-form-grid-small,
        .app-capacitacion-meta-grid,
        .app-client-stats-grid {
          grid-template-columns: minmax(0, 1fr) !important;
          gap: 12px !important;
        }

        .app-panel,
        .app-alerts-panel {
          padding: 17px !important;
          border-radius: 20px !important;
          margin-bottom: 16px !important;
        }

        .app-alerts-header,
        .app-capacitacion-header,
        .app-client-header,
        .app-sale-header,
        .app-stock-history-item,
        .app-quick-sale-header {
          flex-direction: column !important;
          align-items: stretch !important;
          gap: 10px !important;
        }

        .app-alert-item {
          display: grid !important;
          grid-template-columns: 34px minmax(0, 1fr) !important;
          align-items: start !important;
          gap: 10px !important;
          padding: 13px !important;
        }

        .app-alert-item > button {
          grid-column: 1 / -1;
          width: 100%;
          min-height: 42px;
        }

        .app-cart-item {
          grid-template-columns: minmax(0, 1fr) !important;
          align-items: stretch !important;
          gap: 10px !important;
          padding: 14px 0 !important;
        }

        .app-cart-item > strong,
        .app-cart-item > button {
          width: 100%;
        }

        .app-qty-stepper {
          width: min(190px, 100%);
        }

        .app-quick-product-grid {
          grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          max-height: none !important;
          overflow: visible !important;
          padding-right: 0 !important;
        }

        .app-quick-product-card {
          min-width: 0;
          min-height: 118px !important;
          padding: 12px !important;
        }

        .app-table-wrapper {
          width: 100%;
          max-width: 100%;
          overflow-x: auto !important;
          border-radius: 18px !important;
        }

        .app-table {
          min-width: 720px;
        }

        .app-row {
          align-items: flex-start !important;
          flex-wrap: wrap !important;
          gap: 7px !important;
        }

        .app-row > span:last-child {
          margin-left: auto;
          text-align: right;
        }

        .app-actions {
          display: grid !important;
          grid-template-columns: minmax(0, 1fr) !important;
          gap: 10px !important;
        }

        .app-actions > button,
        .app-actions > a {
          width: 100%;
          min-height: 44px;
        }

        .app-login-main {
          padding: 14px !important;
        }

        .app-login-box {
          width: 100% !important;
          max-width: 470px !important;
          padding: 24px 18px !important;
          border-radius: 22px !important;
        }

        .app-modal-backdrop {
          padding: 10px !important;
          align-items: flex-end !important;
        }

        .app-modal-box {
          width: 100% !important;
          max-height: 90vh !important;
          overflow-y: auto !important;
          padding: 20px 16px !important;
          border-radius: 22px 22px 0 0 !important;
        }

        .app-input,
        .app-textarea,
        .app-quick-search,
        .app-qty-input,
        input,
        select,
        textarea {
          min-height: 44px;
          font-size: 16px !important;
        }

        button {
          touch-action: manipulation;
        }
      }

      @media (max-width: 390px) {
        .app-content {
          padding-left: 9px !important;
          padding-right: 9px !important;
        }

        .app-quick-product-grid {
          grid-template-columns: minmax(0, 1fr) !important;
        }

        .app-title {
          font-size: 26px !important;
        }
      }
        `,
      }}
    />
  );
}

function parseFechaAR(fecha: string) {
  const [dia, mes, anio] = fecha.split("/").map(Number);
  return new Date(anio, mes - 1, dia);
}

function money(value: number) {
  return value.toLocaleString("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  });
}

function formatDate(value: string) {
  if (!value) return "";
  return new Date(value).toLocaleString("es-AR");
}

const styles: Record<string, React.CSSProperties> = {
  main: {
    minHeight: "100vh",
    background:
      "radial-gradient(circle at 88% 8%, rgba(239,68,68,0.10), transparent 24%), radial-gradient(circle at 18% 84%, rgba(59,130,246,0.08), transparent 26%), linear-gradient(135deg, #f7f9fc 0%, #eef3f9 52%, #f8fafc 100%)",
    fontFamily:
      'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
  loginMain: {
    minHeight: "100vh",
    background:
      "radial-gradient(circle at 20% 20%, rgba(220,38,38,0.58), transparent 28%), radial-gradient(circle at 80% 70%, rgba(127,29,29,0.64), transparent 32%), linear-gradient(135deg, #020617 0%, #111827 45%, #3f0505 100%)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily:
      'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    padding: 24,
  },
  loginBox: {
    width: 470,
    background: "rgba(15, 23, 42, 0.78)",
    padding: 40,
    borderRadius: 30,
    boxShadow: "0 30px 90px rgba(0, 0, 0, 0.48)",
    border: "1px solid rgba(248, 113, 113, 0.32)",
    backdropFilter: "blur(16px)",
  },
  loginTitle: {
    fontSize: 31,
    lineHeight: 1.1,
    color: "#fff1f2",
    margin: 0,
    fontWeight: 950,
    letterSpacing: "-0.05em",
  },
  loginText: {
    color: "#fecaca",
    marginTop: 12,
    marginBottom: 26,
    lineHeight: 1.55,
    fontSize: 15,
  },
  layout: {
    display: "flex",
    minHeight: "100vh",
  },
  sidebar: {
    width: 286,
    minHeight: "100vh",
    height: "100vh",
    position: "sticky",
    top: 0,
    background:
      "linear-gradient(180deg, #050914 0%, #08101f 48%, #030711 100%)",
    color: "white",
    padding: 20,
    flexShrink: 0,
    boxShadow: "18px 0 46px rgba(2, 6, 23, 0.24)",
    borderRight: "1px solid rgba(248, 113, 113, 0.24)",
    overflow: "hidden auto",
  },
  sidebarGlow: {
    position: "absolute",
    width: 220,
    height: 220,
    right: -105,
    top: -82,
    background:
      "radial-gradient(circle, rgba(239,68,68,0.48), transparent 66%)",
    pointerEvents: "none",
  },
  sidebarGridOverlay: {
    position: "absolute",
    inset: 0,
    pointerEvents: "none",
    background:
      "linear-gradient(180deg, rgba(239,68,68,0.05), transparent 26%, transparent 76%, rgba(239,68,68,0.05))",
  },
  sidebarNeonRail: {
    position: "absolute",
    top: 110,
    bottom: 90,
    left: 0,
    width: 3,
    background: "linear-gradient(180deg, transparent, #ef4444 20%, #991b1b 80%, transparent)",
    boxShadow: "0 0 18px rgba(239,68,68,0.75)",
    opacity: 0.9,
  },
  sidebarEmblem: {
    width: 66,
    height: 66,
    borderRadius: 20,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 13,
    background: "radial-gradient(circle, rgba(239,68,68,0.22), rgba(127,29,29,0.08))",
    border: "1px solid rgba(248,113,113,0.48)",
    boxShadow: "0 0 28px rgba(239,68,68,0.28), inset 0 0 18px rgba(239,68,68,0.12)",
    transform: "rotate(45deg)",
  },
  sidebarEmblemCore: {
    color: "#ff4d5f",
    fontSize: 37,
    lineHeight: 1,
    textShadow: "0 0 16px rgba(239,68,68,0.88)",
    transform: "rotate(-45deg)",
  },
  sidebarSystemTag: {
    marginTop: 10,
    color: "#ef4444",
    fontSize: 10,
    fontWeight: 950,
    letterSpacing: "0.14em",
  },
  sidebarHeaderBox: {
    position: "relative",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    textAlign: "center",
    background:
      "linear-gradient(145deg, rgba(15,23,42,0.96), rgba(3,7,18,0.90))",
    border: "1px solid rgba(248, 113, 113, 0.34)",
    borderRadius: 22,
    padding: "22px 18px 18px",
    boxShadow:
      "inset 0 0 28px rgba(239,68,68,0.05), 0 18px 42px rgba(0,0,0,0.32)",
    clipPath:
      "polygon(9% 0, 91% 0, 100% 10%, 100% 90%, 91% 100%, 9% 100%, 0 90%, 0 10%)",
  },
  logoKicker: {
    color: "#94a3b8",
    textTransform: "uppercase",
    letterSpacing: "0.12em",
    fontSize: 11,
    fontWeight: 900,
    margin: 0,
  },
  logo: {
    fontSize: 24,
    margin: "8px 0 0",
    fontWeight: 950,
    letterSpacing: "-0.05em",
    lineHeight: 1.12,
  },
  logoSub: {
    color: "#fca5a5",
    fontSize: 13,
    marginTop: 8,
    fontWeight: 700,
  },
  rolePill: {
    display: "inline-block",
    marginTop: 0,
    background: "rgba(239, 68, 68, 0.18)",
    color: "#fecaca",
    border: "1px solid rgba(248, 113, 113, 0.34)",
    padding: "6px 10px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 900,
  },
  sidebarEmail: {
    position: "relative",
    color: "#94a3b8",
    fontSize: 11,
    margin: "9px 0 0",
    wordBreak: "break-word",
  },
  sidebarIdentity: {
    marginTop: 20,
    padding: 13,
    borderRadius: 15,
    background: "rgba(15,23,42,0.64)",
    border: "1px solid rgba(148,163,184,0.12)",
  },
  navGroupTitle: {
    color: "#64748b",
    fontSize: 11,
    fontWeight: 950,
    textTransform: "uppercase",
    letterSpacing: "0.13em",
    margin: "0 0 8px 4px",
  },
  navIcon: {
    width: 28,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
    fontWeight: 950,
  },
  navItem: {
    display: "flex",
    alignItems: "center",
    width: "100%",
    border: "1px solid transparent",
    textAlign: "left",
    padding: "12px 14px",
    borderRadius: 14,
    marginBottom: 7,
    cursor: "pointer",
    fontSize: 15,
    fontWeight: 850,
    transition: "all 0.18s ease",
  },
  logoutButton: {
    marginTop: 14,
    width: "100%",
    background: "linear-gradient(135deg, rgba(127,29,29,0.62), rgba(69,10,10,0.72))",
    color: "white",
    border: "1px solid rgba(248, 113, 113, 0.24)",
    padding: "12px",
    borderRadius: 16,
    cursor: "pointer",
    fontWeight: 900,
  },
  content: {
    flex: 1,
    padding: "34px 38px 48px",
    overflow: "auto",
  },
  header: {
    marginBottom: 30,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 16,
  },
  title: {
    fontSize: 37,
    color: "#111827",
    margin: 0,
    fontWeight: 950,
    letterSpacing: "-0.055em",
    lineHeight: 1.06,
  },
  subtitle: {
    color: "#64748b",
    marginTop: 9,
    fontSize: 15,
    lineHeight: 1.5,
  },
  cardsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
    gap: 16,
    marginBottom: 20,
  },
  cardsGridThree: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: 16,
    marginBottom: 24,
  },
  card: {
    background: "#ffffff",
    padding: 20,
    borderRadius: 20,
    boxShadow: "0 12px 30px rgba(15, 23, 42, 0.07)",
    border: "1px solid #dbe3ee",
    minHeight: 108,
    position: "relative",
    overflow: "hidden",
  },
  cardTitle: {
    color: "#475569",
    fontSize: 12,
    margin: 0,
    fontWeight: 950,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
  },
  cardValue: {
    color: "#0f172a",
    fontSize: 27,
    fontWeight: 950,
    margin: "12px 0 0",
    wordBreak: "break-word",
    letterSpacing: "-0.045em",
    lineHeight: 1.15,
  },
  cardDescription: {
    margin: "10px 34px 0 0",
    color: "#64748b",
    fontSize: 12,
    lineHeight: 1.45,
  },
  cardHex: {
    position: "absolute",
    top: 14,
    right: 14,
    width: 31,
    height: 31,
    border: "1px solid",
    borderRadius: 10,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 17,
    background: "rgba(255,255,255,0.72)",
  },
  reportGroup: {
    marginBottom: 24,
    padding: 18,
    borderRadius: 22,
    background: "rgba(255,255,255,0.68)",
    border: "1px solid rgba(203,213,225,0.82)",
    boxShadow: "0 10px 30px rgba(15,23,42,0.045)",
  },
  reportGroupHeader: {
    display: "flex",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 15,
  },
  reportGroupMarker: {
    width: 36,
    height: 36,
    flexShrink: 0,
    borderRadius: 11,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#ef4444",
    background: "#fff1f2",
    border: "1px solid #fecdd3",
    boxShadow: "0 7px 18px rgba(220,38,38,0.10)",
  },
  reportGroupTitle: {
    margin: 0,
    color: "#0f172a",
    fontSize: 18,
    fontWeight: 950,
    letterSpacing: "-0.03em",
  },
  reportGroupSubtitle: {
    margin: "5px 0 0",
    color: "#64748b",
    fontSize: 13,
    lineHeight: 1.45,
  },
  reportMetricsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: 14,
  },
  twoColumns: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
    gap: 18,
    marginBottom: 24,
  },
  syncBadge: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    padding: "9px 12px",
    border: "1px solid",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 900,
    whiteSpace: "nowrap",
  },
  syncDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    background: "currentColor",
    boxShadow: "0 0 10px currentColor",
  },
  alertBellButton: {
    display: "inline-flex",
    alignItems: "center",
    gap: 9,
    border: "1px solid #fecaca",
    borderRadius: 999,
    padding: "10px 14px",
    background: "rgba(255,255,255,0.96)",
    color: "#475569",
    fontWeight: 950,
    cursor: "pointer",
    boxShadow: "0 10px 24px rgba(127, 29, 29, 0.12)",
  },
  alertBellCount: {
    minWidth: 25,
    height: 25,
    borderRadius: 999,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#dc2626",
    color: "white",
    fontSize: 12,
    fontWeight: 950,
  },
  alertsPanel: {
    background: "rgba(255,255,255,0.98)",
    padding: 22,
    borderRadius: 22,
    boxShadow: "0 16px 42px rgba(15, 23, 42, 0.08)",
    border: "1px solid #dbe3ee",
    marginBottom: 24,
  },
  alertsHeader: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 16,
    marginBottom: 16,
  },
  alertsTitle: {
    color: "#111827",
    margin: 0,
    fontSize: 20,
    fontWeight: 950,
    letterSpacing: "-0.03em",
  },
  alertsSubtitle: {
    color: "#64748b",
    margin: "7px 0 0",
    fontSize: 14,
    lineHeight: 1.5,
  },
  alertList: {
    display: "grid",
    gap: 12,
  },
  alertItem: {
    display: "flex",
    alignItems: "center",
    gap: 14,
    border: "1px solid",
    borderRadius: 18,
    padding: 15,
  },
  alertIcon: {
    width: 34,
    height: 34,
    borderRadius: 999,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    color: "white",
    fontWeight: 950,
  },
  alertContent: {
    flex: 1,
    minWidth: 0,
  },
  alertSeverityLabel: {
    display: "block",
    marginBottom: 4,
    fontSize: 10,
    fontWeight: 950,
    letterSpacing: "0.10em",
  },
  alertTitle: {
    display: "block",
    fontSize: 15,
    fontWeight: 950,
  },
  alertDetail: {
    color: "#475569",
    margin: "5px 0 0",
    fontSize: 13,
    lineHeight: 1.5,
  },
  panel: {
    background: "rgba(255,255,255,0.98)",
    padding: 24,
    borderRadius: 22,
    boxShadow: "0 14px 36px rgba(15, 23, 42, 0.07)",
    border: "1px solid #dbe3ee",
    marginBottom: 24,
  },
  panelTitle: {
    color: "#111827",
    margin: 0,
    fontSize: 20,
    fontWeight: 950,
    letterSpacing: "-0.03em",
  },
  miniTitle: {
    color: "#7f1d1d",
    margin: "0 0 8px",
    fontSize: 14,
    fontWeight: 950,
    textTransform: "uppercase",
    letterSpacing: "0.06em",
  },
  text: {
    color: "#475569",
    lineHeight: 1.6,
    fontSize: 15,
  },
  empty: {
    color: "#64748b",
    margin: 0,
    fontSize: 15,
    background: "#f8fafc",
    border: "1px dashed #cbd5e1",
    borderRadius: 16,
    padding: "14px 16px",
  },
  row: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 16,
    padding: "13px 0",
    borderBottom: "1px solid #e8edf4",
    color: "#0f172a",
    fontSize: 14,
  },
  formGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
    gap: 14,
  },
  formGridSmall: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: 14,
    alignItems: "center",
  },
  input: {
    border: "1px solid #cbd5e1",
    borderRadius: 15,
    padding: "12px 14px",
    fontSize: 14,
    width: "100%",
    boxSizing: "border-box",
    background: "#ffffff",
    color: "#0f172a",
    outline: "none",
    boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)",
  },
  actions: {
    display: "flex",
    gap: 12,
    marginTop: 20,
    flexWrap: "wrap",
  },
  button: {
    background: "linear-gradient(135deg, #ef4444 0%, #991b1b 100%)",
    color: "white",
    border: "none",
    padding: "12px 18px",
    borderRadius: 15,
    fontWeight: 950,
    cursor: "pointer",
    boxShadow: "0 12px 26px rgba(153, 27, 27, 0.28)",
  },
  secondaryButton: {
    background: "#fee2e2",
    color: "#7f1d1d",
    border: "1px solid #fecaca",
    padding: "12px 18px",
    borderRadius: 15,
    fontWeight: 950,
    cursor: "pointer",
  },
  smallButton: {
    border: "none",
    borderRadius: 12,
    padding: "8px 11px",
    fontSize: 12,
    fontWeight: 950,
    cursor: "pointer",
    background: "#fee2e2",
    color: "#7f1d1d",
  },
  tableWrapper: {
    background: "rgba(255,255,255,0.99)",
    borderRadius: 22,
    boxShadow: "0 14px 36px rgba(15, 23, 42, 0.07)",
    border: "1px solid #dbe3ee",
    overflow: "auto",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
  },
  thead: {
    background: "#f8fafc",
  },
  tr: {
    borderTop: "1px solid #e8edf4",
  },
  th: {
    textAlign: "left",
    padding: "15px 18px",
    fontSize: 12,
    color: "#7f1d1d",
    textTransform: "uppercase",
    whiteSpace: "nowrap",
    letterSpacing: "0.075em",
    fontWeight: 950,
  },
  td: {
    padding: "17px 18px",
    color: "#0f172a",
    whiteSpace: "nowrap",
    fontSize: 14,
  },
  badge: {
    padding: "7px 11px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 950,
  },
  chartLabel: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 7,
    color: "#0f172a",
    fontSize: 14,
  },
  chartTrack: {
    width: "100%",
    height: 13,
    background: "#fee2e2",
    borderRadius: 999,
    overflow: "hidden",
  },
  chartBar: {
    height: "100%",
    background: "linear-gradient(135deg, #ef4444 0%, #7f1d1d 100%)",
    borderRadius: 999,
    boxShadow: "0 6px 16px rgba(153, 27, 27, 0.20)",
  },
  capacitacionCard: {
    border: "1px solid #fecaca",
    borderRadius: 22,
    padding: 18,
    marginBottom: 18,
    background: "linear-gradient(135deg, #ffffff 0%, #fff7f7 100%)",
    boxShadow: "0 12px 28px rgba(127,29,29,0.07)",
  },
  capacitacionHeader: {
    display: "flex",
    justifyContent: "space-between",
    gap: 16,
    alignItems: "flex-start",
  },
  capacitacionTitle: {
    margin: 0,
    color: "#111827",
    fontSize: 21,
    fontWeight: 950,
    letterSpacing: "-0.035em",
  },
  capacitacionMetaGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: 10,
    marginTop: 14,
    color: "#475569",
    fontSize: 14,
  },
  inscriptionBox: {
    marginTop: 16,
    padding: 16,
    borderRadius: 18,
    background: "#fff7f7",
    border: "1px solid #fecaca",
  },
  smallButtonAlt: {
    border: "none",
    borderRadius: 12,
    padding: "8px 11px",
    fontSize: 12,
    fontWeight: 900,
    cursor: "pointer",
    background: "rgba(220, 38, 38, 0.12)",
    color: "#991b1b",
  },
  smallButtonDanger: {
    border: "none",
    borderRadius: 12,
    padding: "8px 11px",
    fontSize: 12,
    fontWeight: 900,
    cursor: "pointer",
    background: "#fee2e2",
    color: "#991b1b",
  },
  cartItem: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) 132px 120px auto",
    gap: 12,
    alignItems: "center",
    padding: "12px 0",
    borderBottom: "1px solid #e2e8f0",
  },
  cartMeta: {
    color: "#64748b",
    fontSize: 12,
    margin: "4px 0 0",
  },
  qtyInput: {
    border: "1px solid #cbd5e1",
    borderRadius: 12,
    padding: "9px 10px",
    fontSize: 14,
    width: "100%",
    boxSizing: "border-box",
    background: "white",
    color: "#0f172a",
    outline: "none",
  },
  quickSaleHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 16,
    marginTop: 18,
    marginBottom: 12,
  },
  quickSaleTitle: {
    margin: 0,
    color: "#111827",
    fontSize: 18,
    fontWeight: 950,
    letterSpacing: "-0.03em",
  },
  quickSaleHelp: {
    margin: "5px 0 0",
    color: "#64748b",
    fontSize: 13,
    lineHeight: 1.5,
  },
  quickSearchInput: {
    border: "2px solid #fecaca",
    borderRadius: 17,
    padding: "14px 16px",
    fontSize: 16,
    width: "100%",
    boxSizing: "border-box",
    background: "#ffffff",
    color: "#0f172a",
    outline: "none",
    boxShadow: "0 8px 22px rgba(127, 29, 29, 0.08)",
  },
  categoryTabs: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
    margin: "14px 0",
  },
  categoryTab: {
    border: "1px solid #fecaca",
    borderRadius: 999,
    padding: "8px 12px",
    background: "#fff7f7",
    color: "#7f1d1d",
    fontSize: 12,
    fontWeight: 900,
    cursor: "pointer",
  },
  categoryTabActive: {
    background: "#991b1b",
    color: "#ffffff",
    borderColor: "#991b1b",
    boxShadow: "0 7px 18px rgba(153, 27, 27, 0.22)",
  },
  quickAccessBox: {
    background: "#fff7f7",
    border: "1px solid #fecaca",
    borderRadius: 17,
    padding: 13,
    marginBottom: 14,
  },
  quickAccessTitle: {
    margin: "0 0 10px",
    color: "#7f1d1d",
    fontSize: 12,
    fontWeight: 950,
    textTransform: "uppercase",
    letterSpacing: "0.06em",
  },
  quickAccessButtons: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
  },
  quickAccessButton: {
    border: "1px solid #fecaca",
    borderRadius: 12,
    padding: "9px 12px",
    background: "#ffffff",
    color: "#7f1d1d",
    fontSize: 12,
    fontWeight: 900,
    cursor: "pointer",
  },
  disabledButton: {
    opacity: 0.5,
    cursor: "not-allowed",
  },
  quickProductGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(145px, 1fr))",
    gap: 10,
    maxHeight: 430,
    overflowY: "auto",
    paddingRight: 4,
  },
  quickProductCard: {
    position: "relative",
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    gap: 5,
    minHeight: 130,
    padding: 14,
    border: "1px solid #fecaca",
    borderRadius: 17,
    background: "linear-gradient(135deg, #ffffff 0%, #fff7f7 100%)",
    color: "#0f172a",
    textAlign: "left",
    cursor: "pointer",
    boxShadow: "0 8px 20px rgba(127, 29, 29, 0.07)",
  },
  quickProductCardDisabled: {
    opacity: 0.6,
    cursor: "not-allowed",
    filter: "grayscale(0.25)",
  },
  quickProductName: {
    fontSize: 14,
    fontWeight: 950,
    lineHeight: 1.25,
  },
  quickProductCategory: {
    color: "#64748b",
    fontSize: 11,
    lineHeight: 1.3,
  },
  quickProductPrice: {
    marginTop: "auto",
    color: "#7f1d1d",
    fontSize: 16,
    fontWeight: 950,
  },
  quickProductStock: {
    color: "#166534",
    fontSize: 11,
    fontWeight: 800,
  },
  quickProductStockEmpty: {
    color: "#991b1b",
  },
  quickProductCartCount: {
    position: "absolute",
    top: 8,
    right: 8,
    borderRadius: 999,
    padding: "4px 7px",
    background: "#991b1b",
    color: "#ffffff",
    fontSize: 10,
    fontWeight: 950,
  },
  manualLoadToggle: {
    marginTop: 16,
  },
  manualLoadBox: {
    marginTop: 12,
    padding: 14,
    borderRadius: 17,
    background: "#fff7f7",
    border: "1px solid #fecaca",
  },
  qtyStepper: {
    display: "grid",
    gridTemplateColumns: "36px 1fr 36px",
    alignItems: "center",
    border: "1px solid #fecaca",
    borderRadius: 13,
    overflow: "hidden",
    background: "#ffffff",
  },
  qtyStepperButton: {
    border: "none",
    background: "#fee2e2",
    color: "#7f1d1d",
    height: 36,
    fontSize: 20,
    fontWeight: 950,
    cursor: "pointer",
  },
  qtyStepperValue: {
    textAlign: "center",
    color: "#0f172a",
    fontSize: 14,
  },
  clientCard: {
    background: "rgba(255,255,255,0.86)",
    border: "1px solid rgba(226, 232, 240, 0.95)",
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
    boxShadow: "0 10px 28px rgba(15, 23, 42, 0.06)",
  },
  clientHeader: {
    display: "flex",
    justifyContent: "space-between",
    gap: 16,
    alignItems: "flex-start",
    marginBottom: 14,
  },
  clientName: {
    margin: 0,
    color: "#0f172a",
    fontSize: 18,
    fontWeight: 950,
    letterSpacing: "-0.03em",
  },
  clientMeta: {
    margin: "6px 0 0",
    color: "#64748b",
    fontSize: 13,
  },
  clientActions: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
    justifyContent: "flex-end",
  },
  clientStatsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
    gap: 12,
  },
  historyBox: {
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: 16,
    padding: "6px 14px",
    marginBottom: 10,
  },
  saleCard: {
    background: "#ffffff",
    border: "1px solid #fecaca",
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
  },
  saleHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 16,
  },
  saleTitleRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
    color: "#0f172a",
  },
  saleMeta: {
    margin: "7px 0 0",
    color: "#64748b",
    fontSize: 13,
  },
  saleItems: {
    marginTop: 12,
    paddingTop: 4,
    borderTop: "1px solid #fee2e2",
  },
  cancelledAmount: {
    color: "#991b1b",
    textDecoration: "line-through",
  },
  cancellationNotice: {
    marginTop: 12,
    padding: "11px 13px",
    borderRadius: 14,
    background: "#fff1f2",
    border: "1px solid #fecdd3",
    color: "#9f1239",
    fontSize: 13,
    lineHeight: 1.5,
  },
  modalBackdrop: {
    position: "fixed",
    inset: 0,
    background: "rgba(2, 6, 23, 0.72)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    zIndex: 1000,
  },
  modalBox: {
    width: "min(520px, 100%)",
    background: "white",
    borderRadius: 24,
    padding: 26,
    boxShadow: "0 30px 90px rgba(0,0,0,0.38)",
    border: "1px solid #fecaca",
  },
  textarea: {
    border: "1px solid #fecaca",
    borderRadius: 15,
    padding: "12px 14px",
    fontSize: 14,
    width: "100%",
    boxSizing: "border-box",
    background: "#ffffff",
    color: "#0f172a",
    outline: "none",
    resize: "vertical",
    fontFamily: "inherit",
  },
  stockHistoryItem: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 16,
    padding: "14px 0",
    borderBottom: "1px solid #fee2e2",
  },
  stockHistoryTitle: {
    color: "#0f172a",
    fontSize: 15,
  },
  stockHistoryMeta: {
    margin: "5px 0 0",
    color: "#64748b",
    fontSize: 12,
    lineHeight: 1.45,
  },
  stockHistoryNumbers: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-end",
    gap: 4,
    color: "#166534",
    whiteSpace: "nowrap",
  },
  stockPreview: {
    marginTop: 14,
    padding: "12px 14px",
    borderRadius: 14,
    background: "#f0fdf4",
    border: "1px solid #bbf7d0",
    color: "#166534",
    fontSize: 14,
  },
  hr: {
    border: "none",
    borderTop: "1px solid #fee2e2",
    margin: "14px 0",
  },
};
