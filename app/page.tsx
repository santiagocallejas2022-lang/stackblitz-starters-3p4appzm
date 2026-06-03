"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";

type Seccion =
  | "inicio"
  | "miComercio"
  | "productos"
  | "ventas"
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

export default function Home() {
  const [seccion, setSeccion] = useState<Seccion>("inicio");
  const [usuario, setUsuario] = useState<any>(null);
  const [comercioActual, setComercioActual] = useState<Comercio | null>(null);
  const [rolUsuario, setRolUsuario] = useState("admin_comercio");
  const [cargandoUsuario, setCargandoUsuario] = useState(true);
  const [cargandoDatos, setCargandoDatos] = useState(false);
  const [modoRegistro, setModoRegistro] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [registroEmail, setRegistroEmail] = useState("");
  const [registroPassword, setRegistroPassword] = useState("");
  const [registroNombreComercio, setRegistroNombreComercio] = useState("");
  const [registroRubro, setRegistroRubro] = useState("");
  const [registroTelefono, setRegistroTelefono] = useState("");
  const [registroDireccion, setRegistroDireccion] = useState("");

  const [productos, setProductos] = useState<Producto[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [movimientosCaja, setMovimientosCaja] = useState<MovimientoCaja[]>([]);
  const [historialCajas, setHistorialCajas] = useState<HistorialCaja[]>([]);
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [capacitaciones, setCapacitaciones] = useState<Capacitacion[]>([]);
  const [inscripcionesCapacitaciones, setInscripcionesCapacitaciones] = useState<InscripcionCapacitacion[]>([]);
  const [caja, setCaja] = useState<Caja>(cajaVacia());

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

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUsuario(session?.user ?? null);
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (usuario) {
      cargarComercioYDatos();
    }
  }, [usuario]);

  async function cargarComercioYDatos() {
    if (!usuario) return;

    setCargandoDatos(true);

    const { data, error } = await supabase
      .from("usuarios_comercios")
      .select(`
        comercio_id,
        rol,
        comercios (
          id,
          nombre,
          rubro,
          direccion,
          telefono,
          email,
          estado
        )
      `)
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
    await cargarDatos(comercio.id, data.rol || "admin_comercio");
    setCargandoDatos(false);
  }

  async function cargarDatos(comercioId?: number, rol?: string) {
    const idComercio = comercioId || comercioActual?.id;

    if (!idComercio) return;

    await Promise.all([
      cargarProductos(idComercio),
      cargarClientes(idComercio),
      cargarCajasYMovimientos(idComercio),
      cargarVentas(idComercio),
      cargarGastos(idComercio),
      cargarCapacitaciones(idComercio, rol || rolUsuario),
    ]);
  }

  async function cargarProductos(comercioId: number) {
    const { data, error } = await supabase
      .from("productos")
      .select("*")
      .eq("comercio_id", comercioId)
      .order("id", { ascending: true });

    if (error) {
      alert("Error al cargar productos: " + error.message);
      return;
    }

    setProductos((data || []).map((p: any) => normalizarProducto(p)));
  }

  async function cargarClientes(comercioId: number) {
    const { data, error } = await supabase
      .from("clientes")
      .select("*")
      .eq("comercio_id", comercioId)
      .order("id", { ascending: true });

    if (error) {
      alert("Error al cargar clientes: " + error.message);
      return;
    }

    setClientes(
      (data || []).map((c: any) => ({
        id: c.id,
        comercioId: c.comercio_id,
        nombre: c.nombre,
        telefono: c.telefono || "",
      }))
    );
  }

  async function cargarVentas(comercioId: number) {
    const { data: ventasData, error: ventasError } = await supabase
      .from("ventas")
      .select("*")
      .eq("comercio_id", comercioId)
      .order("id", { ascending: true });

    if (ventasError) {
      alert("Error al cargar ventas: " + ventasError.message);
      return;
    }

    const { data: itemsData, error: itemsError } = await supabase
      .from("venta_items")
      .select("*")
      .eq("comercio_id", comercioId)
      .order("id", { ascending: true });

    if (itemsError) {
      alert("Error al cargar items de venta: " + itemsError.message);
      return;
    }

    const ventasNormalizadas: Venta[] = (ventasData || []).map((v: any) => {
      const items = (itemsData || [])
        .filter((item: any) => item.venta_id === v.id)
        .map((item: any) => ({
          productoId: item.producto_id,
          nombre: item.nombre_producto,
          cantidad: Number(item.cantidad),
          precioUnitario: Number(item.precio_unitario),
          subtotal: Number(item.subtotal),
        }));

      return {
        id: v.id,
        comercioId: v.comercio_id,
        fecha: v.fecha,
        clienteId: v.cliente_id || null,
        cliente: v.cliente_nombre,
        medioPago: v.medio_pago,
        total: Number(v.total),
        cajaId: v.caja_id,
        items,
      };
    });

    setVentas(ventasNormalizadas);
  }

  async function cargarCajasYMovimientos(comercioId: number) {
    const { data: cajasData, error: cajasError } = await supabase
      .from("cajas")
      .select("*")
      .eq("comercio_id", comercioId)
      .order("id", { ascending: true });

    if (cajasError) {
      alert("Error al cargar cajas: " + cajasError.message);
      return;
    }

    const { data: movimientosData, error: movimientosError } = await supabase
      .from("movimientos_caja")
      .select("*")
      .eq("comercio_id", comercioId)
      .order("id", { ascending: true });

    if (movimientosError) {
      alert("Error al cargar movimientos de caja: " + movimientosError.message);
      return;
    }

    const movimientosNormalizados: MovimientoCaja[] = (movimientosData || []).map((m: any) => ({
      id: m.id,
      comercioId: m.comercio_id,
      cajaId: m.caja_id,
      ventaId: m.venta_id,
      fecha: m.fecha,
      tipo: m.tipo,
      concepto: m.concepto,
      monto: Number(m.monto),
    }));

    setMovimientosCaja(movimientosNormalizados);

    const cajasNormalizadas: Caja[] = (cajasData || []).map((c: any) => ({
      id: c.id,
      comercioId: c.comercio_id,
      abierta: Boolean(c.abierta),
      fechaApertura: c.fecha_apertura,
      fechaCierre: c.fecha_cierre,
      saldoInicial: Number(c.saldo_inicial),
      saldoFinalReal: c.saldo_final_real === null ? null : Number(c.saldo_final_real),
    }));

    const cajaAbierta = cajasNormalizadas.find((c) => c.abierta);
    setCaja(cajaAbierta || cajaVacia(comercioId));

    const historial = cajasNormalizadas
      .filter((c) => !c.abierta && c.fechaCierre && c.saldoFinalReal !== null)
      .map((c) => {
        const movimientosDeCaja = movimientosNormalizados.filter((m) => m.cajaId === c.id);

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
  }

  async function cargarGastos(comercioId: number) {
    const { data, error } = await supabase
      .from("gastos")
      .select("*")
      .eq("comercio_id", comercioId)
      .order("fecha", { ascending: false });

    if (error) {
      alert("Error al cargar gastos: " + error.message);
      return;
    }

    setGastos(
      (data || []).map((g: any) => ({
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
    );
  }

  async function cargarCapacitaciones(comercioId: number, rol?: string) {
    const { data: capacitacionesData, error: capacitacionesError } = await supabase
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

    const { data: inscripcionesData, error: inscripcionesError } = await inscripcionesQuery;

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
      }))
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
      }))
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
      alert("El usuario se creó, pero falló la creación del comercio: " + comercioError.message);
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
      alert("El comercio se creó, pero falló la vinculación del usuario: " + relacionError.message);
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
    setClientes([]);
    setVentas([]);
    setMovimientosCaja([]);
    setHistorialCajas([]);
    setGastos([]);
    setCapacitaciones([]);
    setInscripcionesCapacitaciones([]);
    setRolUsuario("admin_comercio");
    setCaja(cajaVacia());
  }

  const movimientosCajaActual = movimientosCaja.filter((mov) => mov.cajaId === caja.id);
  const ventasCajaActual = ventas.filter((venta) => venta.cajaId === caja.id);
  const ventasDelDia = ventas.reduce((acc, venta) => acc + venta.total, 0);
  const productosStockBajo = productos.filter((producto) => producto.activo && producto.stock < producto.minimo);

  const ingresosCaja = movimientosCajaActual
    .filter((mov) => mov.tipo === "Ingreso")
    .reduce((acc, mov) => acc + mov.monto, 0);

  const egresosCaja = movimientosCajaActual
    .filter((mov) => mov.tipo === "Egreso")
    .reduce((acc, mov) => acc + mov.monto, 0);

  const saldoCajaEstimado = caja.abierta
    ? caja.saldoInicial + ingresosCaja - egresosCaja
    : 0;

  if (cargandoUsuario) {
    return (
      <main style={styles.main}>
        <div style={{ padding: 40 }}>
          <p>Cargando sistema...</p>
        </div>
      </main>
    );
  }

  if (!usuario) {
    return (
      <main style={styles.loginMain}>
        <section style={styles.loginBox}>
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

              <p style={{ ...styles.loginText, marginTop: 20, marginBottom: 0 }}>
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

  return (
    <main style={styles.main}>
      <div style={styles.layout}>
        <Sidebar
          seccion={seccion}
          setSeccion={setSeccion}
          emailUsuario={usuario.email}
          comercioActual={comercioActual}
          rolUsuario={rolUsuario}
          cerrarSesion={cerrarSesion}
        />

        <section style={styles.content}>
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
              ventas={ventas}
              saldoCajaEstimado={saldoCajaEstimado}
              ventasCajaActual={ventasCajaActual}
            />
          )}

          {seccion === "miComercio" && (
            <MiComercio
              comercioActual={comercioActual}
              setComercioActual={setComercioActual}
            />
          )}

          {seccion === "productos" && (
            <Productos
              productos={productos}
              setProductos={setProductos}
              comercioActual={comercioActual}
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
              ventas={ventas}
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
              ventas={ventas}
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
}: {
  comercioActual: Comercio | null;
  setComercioActual: React.Dispatch<React.SetStateAction<Comercio | null>>;
}) {
  const [nombre, setNombre] = useState(comercioActual?.nombre || "");
  const [rubro, setRubro] = useState(comercioActual?.rubro || "");
  const [direccion, setDireccion] = useState(comercioActual?.direccion || "");
  const [telefono, setTelefono] = useState(comercioActual?.telefono || "");
  const [email, setEmail] = useState(comercioActual?.email || "");

  useEffect(() => {
    setNombre(comercioActual?.nombre || "");
    setRubro(comercioActual?.rubro || "");
    setDireccion(comercioActual?.direccion || "");
    setTelefono(comercioActual?.telefono || "");
    setEmail(comercioActual?.email || "");
  }, [comercioActual]);

  async function guardarDatosComercio() {
    if (!comercioActual) {
      alert("No hay comercio asociado.");
      return;
    }

    if (!nombre) {
      alert("El nombre del comercio es obligatorio.");
      return;
    }

    const { data, error } = await supabase
      .from("comercios")
      .update({
        nombre,
        rubro,
        direccion,
        telefono,
        email,
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

  return (
    <>
      <Header
        title="Mi comercio"
        subtitle="Datos principales del comercio. Estos datos ayudan a identificar la cuenta y mejorar la gestión."
      />

      <Panel title="Datos del comercio">
        <div style={styles.formGridSmall}>
          <Input placeholder="Nombre del comercio" value={nombre} onChange={setNombre} />
          <Input placeholder="Rubro" value={rubro} onChange={setRubro} />
          <Input placeholder="Teléfono / WhatsApp" value={telefono} onChange={setTelefono} />
          <Input placeholder="Dirección" value={direccion} onChange={setDireccion} />
          <Input placeholder="Email de contacto" value={email} onChange={setEmail} />
          <Button onClick={guardarDatosComercio}>Guardar datos</Button>
        </div>
      </Panel>

      <Panel title="Resumen de cuenta">
        <Row left="Comercio" right={comercioActual?.nombre || "Sin nombre"} />
        <Row left="Rubro" right={comercioActual?.rubro || "Sin rubro"} />
        <Row left="Teléfono" right={comercioActual?.telefono || "Sin teléfono"} />
        <Row left="Estado" right={comercioActual?.estado || "activo"} />
      </Panel>
    </>
  );
}

function Sidebar({
  seccion,
  setSeccion,
  emailUsuario,
  comercioActual,
  rolUsuario,
  cerrarSesion,
}: {
  seccion: Seccion;
  setSeccion: (seccion: Seccion) => void;
  emailUsuario: string;
  comercioActual: Comercio | null;
  rolUsuario: string;
  cerrarSesion: () => void;
}) {
  const grupos: { titulo: string; items: { id: Seccion; label: string; icono: string }[] }[] = [
    {
      titulo: "Gestión",
      items: [
        { id: "inicio", label: "Inicio", icono: "◆" },
        { id: "miComercio", label: "Mi comercio", icono: "◎" },
        { id: "productos", label: "Productos", icono: "▦" },
        { id: "clientes", label: "Clientes", icono: "◉" },
      ],
    },
    {
      titulo: "Operación",
      items: [
        { id: "ventas", label: "Ventas", icono: "↗" },
        { id: "caja", label: "Caja", icono: "$" },
        { id: "gastos", label: "Gastos", icono: "−" },
      ],
    },
    {
      titulo: "Análisis",
      items: [{ id: "reportes", label: "Reportes", icono: "▣" }],
    },
    {
      titulo: "Secretaría",
      items: [{ id: "capacitaciones", label: "Capacitaciones", icono: "✦" }],
    },
  ];

  const etiquetaRol = rolUsuario === "admin_secretaria" ? "Secretaría" : "Comercio";

  return (
    <aside style={styles.sidebar}>
      <div style={styles.sidebarGlow} />

      <div style={styles.sidebarHeaderBox}>
        <p style={styles.logoKicker}>Sistema de Gestión</p>
        <h1 style={styles.logo}>{comercioActual?.nombre || "Mi Comercio"}</h1>
        <div style={styles.rolePill}>{etiquetaRol}</div>
      </div>

      <p style={styles.sidebarEmail}>{emailUsuario}</p>

      <nav style={{ marginTop: 26 }}>
        {grupos.map((grupo) => (
          <div key={grupo.titulo} style={{ marginBottom: 18 }}>
            <p style={styles.navGroupTitle}>{grupo.titulo}</p>
            {grupo.items.map((item) => {
              const activo = seccion === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => setSeccion(item.id)}
                  style={{
                    ...styles.navItem,
                    background: activo
                      ? "linear-gradient(135deg, rgba(220,38,38,0.98), rgba(127,29,29,0.94))"
                      : "rgba(15, 23, 42, 0.24)",
                    color: activo ? "white" : "#cbd5e1",
                    borderColor: activo ? "rgba(248, 113, 113, 0.75)" : "rgba(148, 163, 184, 0.12)",
                    boxShadow: activo ? "0 12px 24px rgba(127, 29, 29, 0.35)" : "none",
                  }}
                >
                  <span style={styles.navIcon}>{item.icono}</span>
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      <button onClick={cerrarSesion} style={styles.logoutButton}>
        Cerrar sesión
      </button>
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
}: {
  comercioActual: Comercio | null;
  ventasDelDia: number;
  caja: Caja;
  productos: Producto[];
  productosStockBajo: Producto[];
  ventas: Venta[];
  saldoCajaEstimado: number;
  ventasCajaActual: Venta[];
}) {
  return (
    <>
      <Header
        title="Panel principal"
        subtitle={
          comercioActual
            ? `Resumen operativo de ${comercioActual.nombre}.`
            : "Resumen operativo del comercio."
        }
      />

      <div style={styles.cardsGrid}>
        <Card title="Ventas totales" value={money(ventasDelDia)} />
        <Card title="Caja abierta" value={caja.abierta ? "Sí" : "No"} />
        <Card title="Saldo actual caja" value={money(saldoCajaEstimado)} />
        <Card title="Stock bajo" value={String(productosStockBajo.length)} />
      </div>

      <div style={styles.cardsGrid}>
        <Card title="Productos" value={String(productos.length)} />
        <Card title="Ventas caja actual" value={String(ventasCajaActual.length)} />
        <Card title="Caja actual" value={caja.abierta ? "Abierta" : "Sin caja"} />
        <Card title="Apertura" value={caja.fechaApertura ? formatDate(caja.fechaApertura) : "Sin apertura"} />
      </div>

      <div style={styles.twoColumns}>
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
  comercioActual,
}: {
  productos: Producto[];
  setProductos: (productos: Producto[]) => void;
  comercioActual: Comercio | null;
}) {
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [productoEditando, setProductoEditando] = useState<Producto | null>(null);

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

  async function agregarProducto() {
    if (!comercioActual) {
      alert("No hay comercio asociado.");
      return;
    }

    if (!validarFormularioProducto()) {
      alert("Completá todos los campos.");
      return;
    }

    const { data, error } = await supabase
      .from("productos")
      .insert({
        comercio_id: comercioActual.id,
        nombre: form.nombre,
        codigo: form.codigo,
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

    const { data, error } = await supabase
      .from("productos")
      .update({
        nombre: form.nombre,
        codigo: form.codigo,
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
        producto.id === productoActualizado.id ? productoActualizado : producto
      )
    );

    limpiarFormulario();
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
        p.id === productoActualizado.id ? productoActualizado : p
      )
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
          <div style={styles.formGrid}>
            <Input
              placeholder="Nombre"
              value={form.nombre}
              onChange={(v) => setForm({ ...form, nombre: v })}
            />

            <Input
              placeholder="Código"
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

          <div style={styles.actions}>
            {productoEditando ? (
              <Button onClick={guardarCambiosProducto}>
                Guardar cambios
              </Button>
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
                  <div style={{ display: "flex", gap: 8 }}>
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
  const [clienteHistorialId, setClienteHistorialId] = useState<number | null>(null);

  function ventasDelCliente(cliente: Cliente) {
    return ventas.filter((venta) => {
      if (venta.clienteId) return venta.clienteId === cliente.id;
      return venta.cliente === cliente.nombre;
    });
  }

  function estadisticasCliente(cliente: Cliente) {
    const historial = ventasDelCliente(cliente);
    const totalGastado = historial.reduce((acc, venta) => acc + venta.total, 0);
    const ticketPromedio = historial.length > 0 ? totalGastado / historial.length : 0;
    const ultimaCompra = historial
      .slice()
      .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())[0];

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

    setClientes(clientes.map((cliente) => cliente.id === clienteActualizado.id ? clienteActualizado : cliente));
    limpiarFormulario();
  }

  return (
    <>
      <Header
        title="Clientes"
        subtitle="Clientes frecuentes, edición de datos e historial de compras."
      />

      <Panel title={clienteEditando ? "Editar cliente" : "Nuevo cliente"}>
        <div style={styles.formGridSmall}>
          <Input placeholder="Nombre" value={nombre} onChange={setNombre} />
          <Input placeholder="Teléfono" value={telefono} onChange={setTelefono} />
          {clienteEditando ? (
            <Button onClick={guardarCambiosCliente}>Guardar cambios</Button>
          ) : (
            <Button onClick={agregarCliente}>Guardar cliente</Button>
          )}
        </div>

        {clienteEditando && (
          <div style={styles.actions}>
            <SecondaryButton onClick={limpiarFormulario}>Cancelar edición</SecondaryButton>
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
                <div style={styles.clientHeader}>
                  <div>
                    <h4 style={styles.clientName}>{cliente.nombre}</h4>
                    <p style={styles.clientMeta}>{cliente.telefono || "Sin teléfono"}</p>
                  </div>
                  <div style={styles.clientActions}>
                    <button style={styles.smallButton} onClick={() => iniciarEdicion(cliente)}>
                      Editar
                    </button>
                    <button
                      style={styles.smallButtonAlt}
                      onClick={() => setClienteHistorialId(mostrarHistorial ? null : cliente.id)}
                    >
                      {mostrarHistorial ? "Ocultar historial" : "Ver historial"}
                    </button>
                  </div>
                </div>

                <div style={styles.clientStatsGrid}>
                  <Card title="Compras" value={String(stats.historial.length)} />
                  <Card title="Total gastado" value={money(stats.totalGastado)} />
                  <Card title="Ticket promedio" value={money(stats.ticketPromedio)} />
                  <Card title="Última compra" value={stats.ultimaCompra ? formatDate(stats.ultimaCompra.fecha) : "Sin compras"} />
                </div>

                {mostrarHistorial && (
                  <div style={{ marginTop: 14 }}>
                    {stats.historial.length === 0 ? (
                      <Empty text="Este cliente todavía no tiene compras registradas." />
                    ) : (
                      stats.historial
                        .slice()
                        .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
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

    if (!saldoInicial) {
      alert("Ingresá un saldo inicial.");
      return;
    }

    const { data, error } = await supabase
      .from("cajas")
      .insert({
        comercio_id: comercioActual.id,
        abierta: true,
        saldo_inicial: Number(saldoInicial),
      })
      .select()
      .single();

    if (error) {
      alert("Error al abrir caja: " + error.message);
      return;
    }

    setCaja({
      id: data.id,
      comercioId: data.comercio_id,
      abierta: Boolean(data.abierta),
      fechaApertura: data.fecha_apertura,
      fechaCierre: data.fecha_cierre,
      saldoInicial: Number(data.saldo_inicial),
      saldoFinalReal: data.saldo_final_real === null ? null : Number(data.saldo_final_real),
    });

    setSaldoInicial("");
    await recargarDatos();
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

    if (!concepto || !monto) {
      alert("Completá concepto y monto.");
      return;
    }

    const { data, error } = await supabase
      .from("movimientos_caja")
      .insert({
        comercio_id: comercioActual.id,
        caja_id: caja.id,
        tipo,
        concepto,
        monto: Number(monto),
      })
      .select()
      .single();

    if (error) {
      alert("Error al guardar movimiento: " + error.message);
      return;
    }

    setMovimientosCaja((prev) => [
      ...prev,
      {
        id: data.id,
        comercioId: data.comercio_id,
        cajaId: data.caja_id,
        ventaId: data.venta_id,
        fecha: data.fecha,
        tipo: data.tipo,
        concepto: data.concepto,
        monto: Number(data.monto),
      },
    ]);

    setConcepto("");
    setMonto("");
    await recargarDatos();
  }

  async function cerrarCaja() {
    if (!caja.abierta) {
      alert("La caja ya está cerrada.");
      return;
    }

    if (!saldoFinalReal) {
      alert("Ingresá el saldo final real.");
      return;
    }

    const { error } = await supabase
      .from("cajas")
      .update({
        abierta: false,
        fecha_cierre: new Date().toISOString(),
        saldo_final_real: Number(saldoFinalReal),
      })
      .eq("id", caja.id)
      .eq("comercio_id", caja.comercioId);

    if (error) {
      alert("Error al cerrar caja: " + error.message);
      return;
    }

    setSaldoFinalReal("");
    await recargarDatos();
    alert("Caja cerrada correctamente.");
  }

  return (
    <>
      <Header title="Caja diaria" subtitle="Apertura, saldo actual, movimientos, cierre e historial." />

      <div style={styles.cardsGrid}>
        <Card title="Estado" value={caja.abierta ? "Abierta" : "Cerrada"} />
        <Card title="Caja actual" value={caja.abierta ? "Abierta" : "Sin caja"} />
        <Card title="Saldo inicial" value={money(caja.saldoInicial)} />
        <Card title="Saldo actual estimado" value={money(saldoCajaEstimado)} />
      </div>

      <div style={styles.cardsGrid}>
        <Card title="Ingresos" value={money(ingresosCaja)} />
        <Card title="Egresos" value={money(egresosCaja)} />
        <Card title="Apertura" value={caja.fechaApertura ? formatDate(caja.fechaApertura) : "Sin apertura"} />
        <Card title="Cierre" value={caja.fechaCierre ? formatDate(caja.fechaCierre) : "Sin cierre"} />
      </div>

      <div style={styles.twoColumns}>
        <Panel title="Abrir caja">
          <Input placeholder="Saldo inicial" type="number" value={saldoInicial} onChange={setSaldoInicial} />

          <div style={styles.actions}>
            <Button onClick={abrirCaja}>Abrir caja</Button>
          </div>
        </Panel>

        <Panel title="Cerrar caja">
          <Input placeholder="Saldo final real contado" type="number" value={saldoFinalReal} onChange={setSaldoFinalReal} />

          <div style={styles.actions}>
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
        <div style={styles.formGridSmall}>
          <select value={tipo} onChange={(e) => setTipo(e.target.value as "Ingreso" | "Egreso")} style={styles.input}>
            <option>Ingreso</option>
            <option>Egreso</option>
          </select>

          <Input placeholder="Concepto" value={concepto} onChange={setConcepto} />
          <Input placeholder="Monto" type="number" value={monto} onChange={setMonto} />

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
              <Row key={mov.id} left={`${formatDate(mov.fecha)} - ${mov.tipo} - ${mov.concepto}`} right={money(mov.monto)} />
            ))
        )}
      </Panel>

      <Panel title="Historial de aperturas y cierres">
        {historialCajas.length === 0 ? (
          <Empty text="Todavía no hay cajas cerradas." />
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={styles.table}>
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
}: {
  productos: Producto[];
  ventas: Venta[];
  setVentas: (ventas: Venta[]) => void;
  clientes: Cliente[];
  caja: Caja;
  setMovimientosCaja: React.Dispatch<React.SetStateAction<MovimientoCaja[]>>;
  recargarDatos: () => Promise<void>;
  comercioActual: Comercio | null;
}) {
  const [productoId, setProductoId] = useState("");
  const [cantidad, setCantidad] = useState("1");
  const [carrito, setCarrito] = useState<ItemVenta[]>([]);
  const [cliente, setCliente] = useState("Consumidor final");
  const [medioPago, setMedioPago] = useState("Efectivo");

  const total = carrito.reduce((acc, item) => acc + item.subtotal, 0);

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
      .filter((item, i) => item.productoId === itemActual.productoId && i !== index)
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
          : item
      )
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

    if (!producto.activo) {
      alert("El producto está inactivo.");
      return;
    }

    if (!cant || cant <= 0) {
      alert("La cantidad debe ser mayor a cero.");
      return;
    }

    const cantidadYaEnCarrito = carrito
      .filter((item) => item.productoId === producto.id)
      .reduce((acc, item) => acc + item.cantidad, 0);

    if (cant + cantidadYaEnCarrito > producto.stock) {
      alert("No hay stock suficiente.");
      return;
    }

    setCarrito([
      ...carrito,
      {
        productoId: producto.id,
        nombre: producto.nombre,
        cantidad: cant,
        precioUnitario: producto.precio,
        subtotal: producto.precio * cant,
      },
    ]);

    setProductoId("");
    setCantidad("1");
  }

  async function confirmarVenta() {
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

    const clienteEncontrado = clientes.find((c) => c.nombre === cliente);

    const { data: ventaData, error: ventaError } = await supabase
      .from("ventas")
      .insert({
        comercio_id: comercioActual.id,
        caja_id: caja.id,
        cliente_id: clienteEncontrado?.id || null,
        cliente_nombre: cliente,
        medio_pago: medioPago,
        total,
      })
      .select()
      .single();

    if (ventaError) {
      alert("Error al guardar venta: " + ventaError.message);
      return;
    }

    const itemsParaInsertar = carrito.map((item) => ({
      comercio_id: comercioActual.id,
      venta_id: ventaData.id,
      producto_id: item.productoId,
      nombre_producto: item.nombre,
      cantidad: item.cantidad,
      precio_unitario: item.precioUnitario,
      subtotal: item.subtotal,
    }));

    const { error: itemsError } = await supabase
      .from("venta_items")
      .insert(itemsParaInsertar);

    if (itemsError) {
      alert("La venta se creó, pero falló el detalle: " + itemsError.message);
      return;
    }

    for (const item of carrito) {
      const productoActual = productos.find((p) => p.id === item.productoId);

      if (!productoActual) continue;

      const nuevoStock = productoActual.stock - item.cantidad;

      const { error: stockError } = await supabase
        .from("productos")
        .update({ stock: nuevoStock })
        .eq("id", item.productoId)
        .eq("comercio_id", comercioActual.id);

      if (stockError) {
        alert("La venta se creó, pero falló la actualización de stock: " + stockError.message);
        return;
      }
    }

    const { data: movimientoData, error: movimientoError } = await supabase
      .from("movimientos_caja")
      .insert({
        comercio_id: comercioActual.id,
        caja_id: caja.id,
        venta_id: ventaData.id,
        tipo: "Ingreso",
        concepto: `Venta - ${medioPago}`,
        monto: total,
      })
      .select()
      .single();

    if (movimientoError) {
      alert("La venta se creó, pero falló el movimiento de caja: " + movimientoError.message);
      return;
    }

    setVentas([
      ...ventas,
      {
        id: ventaData.id,
        comercioId: ventaData.comercio_id,
        fecha: ventaData.fecha,
        clienteId: ventaData.cliente_id || null,
        cliente: ventaData.cliente_nombre,
        medioPago: ventaData.medio_pago,
        total: Number(ventaData.total),
        cajaId: ventaData.caja_id,
        items: carrito,
      },
    ]);

    setMovimientosCaja((prev) => [
      ...prev,
      {
        id: movimientoData.id,
        comercioId: movimientoData.comercio_id,
        cajaId: movimientoData.caja_id,
        ventaId: movimientoData.venta_id,
        fecha: movimientoData.fecha,
        tipo: movimientoData.tipo,
        concepto: movimientoData.concepto,
        monto: Number(movimientoData.monto),
      },
    ]);

    setCarrito([]);
    await recargarDatos();
    alert("Venta registrada correctamente.");
  }

  return (
    <>
      <Header title="Ventas" subtitle="Registro de ventas y descuento automático de stock." />

      <div style={styles.twoColumns}>
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

          <div style={styles.formGridSmall}>
            <select value={productoId} onChange={(e) => setProductoId(e.target.value)} style={styles.input}>
              <option value="">Seleccionar producto</option>
              {productos
                .filter((producto) => producto.activo)
                .map((producto) => (
                  <option key={producto.id} value={producto.id}>
                    {producto.nombre} - Stock: {producto.stock}
                  </option>
                ))}
            </select>

            <Input placeholder="Cantidad" type="number" value={cantidad} onChange={setCantidad} />

            <Button onClick={agregarAlCarrito}>Agregar</Button>
          </div>

          <div style={{ marginTop: 20 }}>
            <select value={cliente} onChange={(e) => setCliente(e.target.value)} style={styles.input}>
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
          </div>

          <div style={styles.actions}>
            <Button onClick={confirmarVenta}>Confirmar venta</Button>
          </div>
        </Panel>

        <Panel title="Carrito">
          {carrito.length === 0 ? (
            <Empty text="Todavía no agregaste productos." />
          ) : (
            <>
              {carrito.map((item, index) => (
                <div key={index} style={styles.cartItem}>
                  <div>
                    <strong>{item.nombre}</strong>
                    <p style={styles.cartMeta}>{money(item.precioUnitario)} por unidad</p>
                  </div>

                  <input
                    style={styles.qtyInput}
                    type="number"
                    min="1"
                    value={item.cantidad}
                    onChange={(e) => cambiarCantidadCarrito(index, e.target.value)}
                  />

                  <strong>{money(item.subtotal)}</strong>

                  <button style={styles.smallButtonDanger} onClick={() => quitarItemCarrito(index)}>
                    Quitar
                  </button>
                </div>
              ))}
              <hr style={styles.hr} />
              <Row left="Total" right={money(total)} bold />
              <div style={styles.actions}>
                <SecondaryButton onClick={vaciarCarrito}>Vaciar carrito</SecondaryButton>
              </div>
            </>
          )}
        </Panel>
      </div>

      <Panel title="Ventas registradas">
        {ventas.length === 0 ? (
          <Empty text="Todavía no hay ventas registradas." />
        ) : (
          ventas
            .slice()
            .reverse()
            .map((venta) => (
              <Row
                key={venta.id}
                left={`${formatDate(venta.fecha)} - ${venta.cliente} - ${venta.medioPago}`}
                right={money(venta.total)}
              />
            ))
        )}
      </Panel>
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
      <Header title="Gastos" subtitle="Carga de gastos para mejorar reportes financieros y flujo de caja." />

      <div style={styles.cardsGrid}>
        <Card title="Gastos cargados" value={String(gastos.length)} />
        <Card title="Total de gastos" value={money(totalGastos)} />
        <Card title="Último gasto" value={gastos[0] ? money(gastos[0].monto) : "$ 0"} />
        <Card title="Categorías" value={String(new Set(gastos.map((g) => g.categoria)).size)} />
      </div>

      <Panel title="Nuevo gasto">
        <div style={styles.formGrid}>
          <Input placeholder="Categoría" value={form.categoria} onChange={(v) => setForm({ ...form, categoria: v })} />
          <Input placeholder="Concepto" value={form.concepto} onChange={(v) => setForm({ ...form, concepto: v })} />
          <Input placeholder="Proveedor" value={form.proveedor} onChange={(v) => setForm({ ...form, proveedor: v })} />
          <Input placeholder="Monto" type="number" value={form.monto} onChange={(v) => setForm({ ...form, monto: v })} />
          <select value={form.medioPago} onChange={(e) => setForm({ ...form, medioPago: e.target.value })} style={styles.input}>
            <option>Efectivo</option>
            <option>Transferencia</option>
            <option>Tarjeta</option>
            <option>Mercado Pago</option>
            <option>Otro</option>
          </select>
          <Input placeholder="Observaciones" value={form.observaciones} onChange={(v) => setForm({ ...form, observaciones: v })} />
        </div>

        <div style={styles.actions}>
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

  const [inscripcionActiva, setInscripcionActiva] = useState<number | null>(null);
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

  async function cambiarEstadoCapacitacion(capacitacion: Capacitacion, estado: string) {
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
          : c
      )
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

    const yaInscripto = inscripciones.some((i) => i.capacitacionId === capacitacion.id && i.comercioId === comercioActual.id);

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

  const capacitacionesActivas = capacitaciones.filter((c) => c.estado !== "finalizada");

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

      <div style={styles.cardsGrid}>
        <Card title="Capacitaciones" value={String(capacitaciones.length)} />
        <Card title="Activas" value={String(capacitacionesActivas.length)} />
        <Card title="Inscripciones" value={String(inscripciones.length)} />
        <Card title="Rol" value={esSecretaria ? "Secretaría" : "Comercio"} />
      </div>

      {esSecretaria && (
        <Panel title="Nueva capacitación">
          <div style={styles.formGrid}>
            <Input placeholder="Título" value={form.titulo} onChange={(v) => setForm({ ...form, titulo: v })} />
            <Input placeholder="Descripción" value={form.descripcion} onChange={(v) => setForm({ ...form, descripcion: v })} />
            <select value={form.modalidad} onChange={(e) => setForm({ ...form, modalidad: e.target.value })} style={styles.input}>
              <option>Presencial</option>
              <option>Virtual</option>
              <option>Mixta</option>
            </select>
            <Input placeholder="Lugar" value={form.lugar} onChange={(v) => setForm({ ...form, lugar: v })} />
            <Input placeholder="Fecha de inicio" type="datetime-local" value={form.fechaInicio} onChange={(v) => setForm({ ...form, fechaInicio: v })} />
            <Input placeholder="Fecha de fin" type="datetime-local" value={form.fechaFin} onChange={(v) => setForm({ ...form, fechaFin: v })} />
            <Input placeholder="Cupos" type="number" value={form.cupos} onChange={(v) => setForm({ ...form, cupos: v })} />
            <Input placeholder="Destinatarios" value={form.destinatarios} onChange={(v) => setForm({ ...form, destinatarios: v })} />
            <Input placeholder="Link" value={form.link} onChange={(v) => setForm({ ...form, link: v })} />
            <select value={form.estado} onChange={(e) => setForm({ ...form, estado: e.target.value })} style={styles.input}>
              <option value="activa">Activa</option>
              <option value="proxima">Próxima</option>
              <option value="finalizada">Finalizada</option>
            </select>
          </div>

          <div style={styles.actions}>
            <Button onClick={crearCapacitacion}>Publicar capacitación</Button>
          </div>
        </Panel>
      )}

      <Panel title="Capacitaciones disponibles">
        {capacitaciones.length === 0 ? (
          <Empty text="Todavía no hay capacitaciones cargadas." />
        ) : (
          capacitaciones.map((capacitacion) => {
            const inscriptos = inscripciones.filter((i) => i.capacitacionId === capacitacion.id);
            const yaInscripto = comercioActual
              ? inscriptos.some((i) => i.comercioId === comercioActual.id)
              : false;

            return (
              <div key={capacitacion.id} style={styles.capacitacionCard}>
                <div style={styles.capacitacionHeader}>
                  <div>
                    <h3 style={styles.capacitacionTitle}>{capacitacion.titulo}</h3>
                    <p style={styles.text}>{capacitacion.descripcion || "Sin descripción."}</p>
                  </div>
                  <Badge danger={capacitacion.estado === "finalizada"}>{capacitacion.estado}</Badge>
                </div>

                <div style={styles.capacitacionMetaGrid}>
                  <span>Modalidad: <strong>{capacitacion.modalidad || "Sin dato"}</strong></span>
                  <span>Lugar: <strong>{capacitacion.lugar || "Sin dato"}</strong></span>
                  <span>Inicio: <strong>{capacitacion.fechaInicio ? formatDate(capacitacion.fechaInicio) : "Sin fecha"}</strong></span>
                  <span>Cupos: <strong>{capacitacion.cupos ?? "Sin límite"}</strong></span>
                  <span>Inscriptos: <strong>{inscriptos.length}</strong></span>
                  <span>Destinatarios: <strong>{capacitacion.destinatarios || "Comercios"}</strong></span>
                </div>

                {capacitacion.link && (
                  <p style={styles.text}>Link: {capacitacion.link}</p>
                )}

                {!esSecretaria && capacitacion.estado !== "finalizada" && (
                  <div style={styles.actions}>
                    {yaInscripto ? (
                      <Badge>Ya inscripto</Badge>
                    ) : (
                      <Button onClick={() => setInscripcionActiva(inscripcionActiva === capacitacion.id ? null : capacitacion.id)}>
                        Inscribirme
                      </Button>
                    )}
                  </div>
                )}

                {inscripcionActiva === capacitacion.id && !yaInscripto && (
                  <div style={styles.inscriptionBox}>
                    <div style={styles.formGridSmall}>
                      <Input placeholder="Nombre de la persona" value={formInscripcion.nombre} onChange={(v) => setFormInscripcion({ ...formInscripcion, nombre: v })} />
                      <Input placeholder="Teléfono" value={formInscripcion.telefono} onChange={(v) => setFormInscripcion({ ...formInscripcion, telefono: v })} />
                      <Input placeholder="Observaciones" value={formInscripcion.observaciones} onChange={(v) => setFormInscripcion({ ...formInscripcion, observaciones: v })} />
                    </div>
                    <div style={styles.actions}>
                      <Button onClick={() => inscribirse(capacitacion)}>Confirmar inscripción</Button>
                      <SecondaryButton onClick={() => setInscripcionActiva(null)}>Cancelar</SecondaryButton>
                    </div>
                  </div>
                )}

                {esSecretaria && (
                  <div style={styles.actions}>
                    <SecondaryButton onClick={() => cambiarEstadoCapacitacion(capacitacion, capacitacion.estado === "finalizada" ? "activa" : "finalizada")}>
                      {capacitacion.estado === "finalizada" ? "Reactivar" : "Finalizar"}
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
      .map(([fecha, datos]) => ({ fecha, total: datos.total, cantidad: datos.cantidad }))
      .sort((a, b) => parseFechaAR(a.fecha).getTime() - parseFechaAR(b.fecha).getTime());
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
        return new Date(anioA, mesA - 1, 1).getTime() - new Date(anioB, mesB - 1, 1).getTime();
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
      .map(([nombre, datos]) => ({ nombre, cantidad: datos.cantidad, total: datos.total }))
      .sort((a, b) => b.cantidad - a.cantidad);
  }, [ventas]);

  const ventasPorMedioPago = useMemo(() => {
    const mapa: Record<string, number> = {};
    ventas.forEach((venta) => {
      mapa[venta.medioPago] = (mapa[venta.medioPago] || 0) + venta.total;
    });
    return Object.entries(mapa).map(([medio, total]) => ({ medio, total })).sort((a, b) => b.total - a.total);
  }, [ventas]);

  const ventasPorDiaSemana = useMemo(() => {
    const mapa: Record<string, number> = {};
    ventas.forEach((venta) => {
      const dia = new Date(venta.fecha).toLocaleDateString("es-AR", { weekday: "long" });
      mapa[dia] = (mapa[dia] || 0) + venta.total;
    });
    return Object.entries(mapa).map(([dia, total]) => ({ dia, total })).sort((a, b) => b.total - a.total);
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
        return { nombre: cliente.nombre, cantidad: historial.length, total, ticket };
      })
      .filter((cliente) => cliente.cantidad > 0)
      .sort((a, b) => b.total - a.total);
  }, [clientes, ventas]);

  const ventasIdentificadas = ventas.filter((venta) => venta.cliente !== "Consumidor final").length;
  const ventasConsumidorFinal = ventas.length - ventasIdentificadas;

  const costoMercaderiaVendida = ventas.reduce((acc, venta) => {
    return acc + venta.items.reduce((total, item) => {
      const producto = productos.find((p) => p.id === item.productoId);
      if (!producto) return total;
      return total + producto.costo * item.cantidad;
    }, 0);
  }, 0);

  const margenBruto = ventasDelDia - costoMercaderiaVendida;
  const totalGastos = gastos.reduce((acc, gasto) => acc + gasto.monto, 0);
  const resultadoEstimado = margenBruto - totalGastos;
  const ticketPromedio = ventas.length > 0 ? ventasDelDia / ventas.length : 0;
  const totalUltimos7Dias = ventasPorDia.slice(-7).reduce((acc, dia) => acc + dia.total, 0);
  const promedioDiario = ventasPorDia.length > 0 ? ventasDelDia / ventasPorDia.length : 0;
  const mejorDia = ventasPorDia.reduce((mejor, dia) => (dia.total > mejor.total ? dia : mejor), { fecha: "Sin datos", total: 0, cantidad: 0 });

  const idsVendidos = new Set(ventas.flatMap((venta) => venta.items.map((item) => item.productoId)));
  const productosSinVentas = productos.filter((producto) => producto.activo && !idsVendidos.has(producto.id));
  const productosFaltantes = productos.filter((producto) => producto.activo && producto.stock <= 0);

  const rotacion = productos
    .map((producto) => {
      const vendido = ventas.reduce((acc, venta) => {
        return acc + venta.items.filter((item) => item.productoId === producto.id).reduce((t, item) => t + item.cantidad, 0);
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
      <Header title="Reportes" subtitle="Ventas, stock, margen, gastos y flujo de caja." />

      <div style={styles.cardsGrid}>
        <Card title="Ventas totales" value={money(ventasDelDia)} />
        <Card title="Ticket promedio" value={money(ticketPromedio)} />
        <Card title="Margen bruto" value={money(margenBruto)} />
        <Card title="Resultado estimado" value={money(resultadoEstimado)} />
      </div>

      <div style={styles.cardsGrid}>
        <Card title="Ventas últimos 7 días" value={money(totalUltimos7Dias)} />
        <Card title="Promedio diario" value={money(promedioDiario)} />
        <Card title="Gastos cargados" value={money(totalGastos)} />
        <Card title="Mejor día" value={mejorDia.fecha} />
      </div>

      <div style={styles.cardsGrid}>
        <Card title="Clientes con compras" value={String(clientesRanking.length)} />
        <Card title="Ventas identificadas" value={String(ventasIdentificadas)} />
        <Card title="Consumidor final" value={String(ventasConsumidorFinal)} />
        <Card title="Clientes registrados" value={String(clientes.length)} />
      </div>

      <div style={styles.twoColumns}>
        <Panel title="Ventas diarias">
          {ventasPorDia.length === 0 ? <Empty text="Todavía no hay ventas para graficar." /> : ventasPorDia.map((dia) => {
            const ancho = maxVentaDiaria > 0 ? Math.max((dia.total / maxVentaDiaria) * 100, 4) : 0;
            return <ChartRow key={dia.fecha} label={dia.fecha} value={money(dia.total)} width={ancho} />;
          })}
        </Panel>

        <Panel title="Comparación entre meses">
          {ventasPorMes.length === 0 ? <Empty text="Todavía no hay meses para comparar." /> : ventasPorMes.map((mes) => {
            const ancho = maxMes > 0 ? Math.max((mes.total / maxMes) * 100, 4) : 0;
            return <ChartRow key={mes.mes} label={mes.mes} value={money(mes.total)} width={ancho} />;
          })}
        </Panel>
      </div>

      <div style={styles.twoColumns}>
        <Panel title="Clientes que más gastan">
          {clientesRanking.length === 0 ? <Empty text="Todavía no hay clientes con compras." /> : clientesRanking.slice(0, 10).map((cliente) => {
            const ancho = maxCliente > 0 ? Math.max((cliente.total / maxCliente) * 100, 4) : 0;
            return <ChartRow key={cliente.nombre} label={`${cliente.nombre} (${cliente.cantidad} compras)`} value={money(cliente.total)} width={ancho} />;
          })}
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

      <div style={styles.twoColumns}>
        <Panel title="Días con más ventas">
          {ventasPorDiaSemana.length === 0 ? <Empty text="Todavía no hay ventas registradas." /> : ventasPorDiaSemana.map((dia) => {
            const ancho = maxDiaSemana > 0 ? Math.max((dia.total / maxDiaSemana) * 100, 4) : 0;
            return <ChartRow key={dia.dia} label={dia.dia} value={money(dia.total)} width={ancho} />;
          })}
        </Panel>

        <Panel title="Ventas por medio de pago">
          {ventasPorMedioPago.length === 0 ? <Empty text="Todavía no hay medios de pago registrados." /> : ventasPorMedioPago.map((medio) => {
            const ancho = maxMedioPago > 0 ? Math.max((medio.total / maxMedioPago) * 100, 4) : 0;
            return <ChartRow key={medio.medio} label={medio.medio} value={money(medio.total)} width={ancho} />;
          })}
        </Panel>
      </div>

      <div style={styles.twoColumns}>
        <Panel title="Productos más vendidos">
          {productosVendidos.length === 0 ? (
            <Empty text="Todavía no hay productos vendidos." />
          ) : (
            productosVendidos.slice(0, 10).map((p) => (
              <Row key={p.nombre} left={p.nombre} right={`${p.cantidad} unidades / ${money(p.total)}`} />
            ))
          )}
        </Panel>

        <Panel title="Rotación de mercadería">
          {rotacion.length === 0 ? (
            <Empty text="Todavía no hay rotación calculable." />
          ) : (
            rotacion.slice(0, 10).map((p) => (
              <Row key={p.nombre} left={p.nombre} right={`Vendidas: ${p.vendido} / Stock: ${p.stock}`} />
            ))
          )}
        </Panel>
      </div>

      <div style={styles.twoColumns}>
        <Panel title="Productos y stock">
          <Row left="Stock disponible total" right={`${productos.reduce((acc, p) => acc + p.stock, 0)} unidades`} />
          <Row left="Productos con poco stock" right={String(productosStockBajo.length)} />
          <Row left="Productos faltantes" right={String(productosFaltantes.length)} />
          <Row left="Productos sin ventas" right={String(productosSinVentas.length)} />
        </Panel>

        <Panel title="Finanzas y flujo de caja">
          <Row left="Ingresos por ventas" right={money(ventasDelDia)} />
          <Row left="Costos estimados de mercadería" right={money(costoMercaderiaVendida)} />
          <Row left="Gastos del negocio" right={money(totalGastos)} />
          <Row left="Flujo de caja actual" right={money(saldoCajaEstimado)} bold />
        </Panel>
      </div>

      <div style={styles.twoColumns}>
        <Panel title="Productos con stock bajo">
          {productosStockBajo.length === 0 ? <Empty text="No hay productos con stock bajo." /> : productosStockBajo.map((p) => <Row key={p.id} left={p.nombre} right={`Stock: ${p.stock}`} />)}
        </Panel>

        <Panel title="Productos sin ventas">
          {productosSinVentas.length === 0 ? <Empty text="No hay productos sin ventas." /> : productosSinVentas.slice(0, 10).map((p) => <Row key={p.id} left={p.nombre} right={`Stock: ${p.stock}`} />)}
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
    <header style={styles.header}>
      <div>
        <h2 style={styles.title}>{title}</h2>
        <p style={styles.subtitle}>{subtitle}</p>
      </div>
      {action}
    </header>
  );
}

function Card({ title, value }: { title: string; value: string }) {
  return (
    <div style={styles.card}>
      <p style={styles.cardTitle}>{title}</p>
      <p style={styles.cardValue}>{value}</p>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={styles.panel}>
      <h3 style={styles.panelTitle}>{title}</h3>
      <div style={{ marginTop: 14 }}>{children}</div>
    </div>
  );
}

function Table({ children }: { children: React.ReactNode }) {
  return (
    <div style={styles.tableWrapper}>
      <table style={styles.table}>{children}</table>
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
      style={styles.input}
    />
  );
}

function Button({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button onClick={onClick} style={styles.button}>
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
    <button onClick={onClick} style={styles.secondaryButton}>
      {children}
    </button>
  );
}

function Badge({ children, danger }: { children: React.ReactNode; danger?: boolean }) {
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
    <div style={styles.row}>
      <span style={{ fontWeight: bold ? "bold" : "normal" }}>{left}</span>
      <span style={{ fontWeight: "bold" }}>{right}</span>
    </div>
  );
}

function ChartRow({ label, value, width }: { label: string; value: string; width: number }) {
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
      "radial-gradient(circle at top left, rgba(220,38,38,0.30), transparent 30%), radial-gradient(circle at bottom right, rgba(127,29,29,0.34), transparent 32%), linear-gradient(135deg, #fff7f7 0%, #f8fafc 52%, #fee2e2 100%)",
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
    width: 292,
    background:
      "linear-gradient(180deg, #020617 0%, #111827 42%, #3f0505 100%)",
    color: "white",
    padding: 24,
    flexShrink: 0,
    boxShadow: "14px 0 42px rgba(15, 23, 42, 0.22)",
    borderRight: "1px solid rgba(248, 113, 113, 0.18)",
    position: "relative",
    overflow: "hidden",
  },
  sidebarGlow: {
    position: "absolute",
    width: 180,
    height: 180,
    right: -70,
    top: -40,
    background: "radial-gradient(circle, rgba(220,38,38,0.58), transparent 64%)",
    pointerEvents: "none",
  },
  sidebarHeaderBox: {
    position: "relative",
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(248, 113, 113, 0.22)",
    borderRadius: 22,
    padding: 18,
    boxShadow: "0 18px 42px rgba(0,0,0,0.24)",
  },
  logoKicker: {
    color: "#fca5a5",
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
    marginTop: 12,
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
    color: "#cbd5e1",
    fontSize: 12,
    marginTop: 14,
    wordBreak: "break-word",
  },
  navGroupTitle: {
    color: "#fca5a5",
    fontSize: 11,
    fontWeight: 950,
    textTransform: "uppercase",
    letterSpacing: "0.13em",
    margin: "0 0 8px 4px",
  },
  navIcon: {
    width: 25,
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
    padding: "13px 14px",
    borderRadius: 16,
    marginBottom: 8,
    cursor: "pointer",
    fontSize: 15,
    fontWeight: 850,
    transition: "all 0.18s ease",
  },
  logoutButton: {
    marginTop: 22,
    width: "100%",
    background: "rgba(127, 29, 29, 0.56)",
    color: "white",
    border: "1px solid rgba(248, 113, 113, 0.24)",
    padding: "12px",
    borderRadius: 16,
    cursor: "pointer",
    fontWeight: 900,
  },
  content: {
    flex: 1,
    padding: 36,
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
    gap: 18,
    marginBottom: 24,
  },
  card: {
    background: "rgba(255,255,255,0.96)",
    padding: 22,
    borderRadius: 26,
    boxShadow: "0 16px 42px rgba(127, 29, 29, 0.09)",
    border: "1px solid rgba(254, 202, 202, 0.96)",
    minHeight: 98,
    position: "relative",
    overflow: "hidden",
  },
  cardTitle: {
    color: "#7f1d1d",
    fontSize: 12,
    margin: 0,
    fontWeight: 950,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
  },
  cardValue: {
    color: "#0f172a",
    fontSize: 26,
    fontWeight: 950,
    margin: "12px 0 0",
    wordBreak: "break-word",
    letterSpacing: "-0.045em",
    lineHeight: 1.15,
  },
  twoColumns: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
    gap: 18,
    marginBottom: 24,
  },
  panel: {
    background: "rgba(255,255,255,0.97)",
    padding: 26,
    borderRadius: 26,
    boxShadow: "0 16px 42px rgba(127, 29, 29, 0.09)",
    border: "1px solid rgba(254, 202, 202, 0.96)",
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
    background: "#fff7f7",
    border: "1px dashed #fca5a5",
    borderRadius: 16,
    padding: "14px 16px",
  },
  row: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 16,
    padding: "13px 0",
    borderBottom: "1px solid #fee2e2",
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
    border: "1px solid #fecaca",
    borderRadius: 15,
    padding: "12px 14px",
    fontSize: 14,
    width: "100%",
    boxSizing: "border-box",
    background: "#ffffff",
    color: "#0f172a",
    outline: "none",
    boxShadow: "0 1px 2px rgba(127, 29, 29, 0.05)",
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
    background: "rgba(255,255,255,0.98)",
    borderRadius: 26,
    boxShadow: "0 16px 42px rgba(127, 29, 29, 0.09)",
    border: "1px solid rgba(254, 202, 202, 0.96)",
    overflow: "auto",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
  },
  thead: {
    background: "#fff7f7",
  },
  tr: {
    borderTop: "1px solid #fee2e2",
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
    gridTemplateColumns: "minmax(0, 1fr) 90px 120px auto",
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
  hr: {
    border: "none",
    borderTop: "1px solid #fee2e2",
    margin: "14px 0",
  },
};