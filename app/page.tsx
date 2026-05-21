"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";

type Seccion = "inicio" | "productos" | "ventas" | "caja" | "clientes" | "reportes";

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
    await cargarDatos(comercio.id);
    setCargandoDatos(false);
  }

  async function cargarDatos(comercioId?: number) {
    const idComercio = comercioId || comercioActual?.id;

    if (!idComercio) return;

    await Promise.all([
      cargarProductos(idComercio),
      cargarClientes(idComercio),
      cargarCajasYMovimientos(idComercio),
      cargarVentas(idComercio),
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
            />
          )}
        </section>
      </div>
    </main>
  );
}

function Sidebar({
  seccion,
  setSeccion,
  emailUsuario,
  comercioActual,
  cerrarSesion,
}: {
  seccion: Seccion;
  setSeccion: (seccion: Seccion) => void;
  emailUsuario: string;
  comercioActual: Comercio | null;
  cerrarSesion: () => void;
}) {
  const items: { id: Seccion; label: string }[] = [
    { id: "inicio", label: "Inicio" },
    { id: "ventas", label: "Ventas" },
    { id: "productos", label: "Productos" },
    { id: "caja", label: "Caja" },
    { id: "clientes", label: "Clientes" },
    { id: "reportes", label: "Reportes" },
  ];

  return (
    <aside style={styles.sidebar}>
      <h1 style={styles.logo}>{comercioActual?.nombre || "Mi Comercio"}</h1>
      <p style={styles.logoSub}>Sistema de gestión</p>
      <p style={{ color: "#94a3b8", fontSize: 12, marginTop: 8 }}>{emailUsuario}</p>

      <nav style={{ marginTop: 32 }}>
        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => setSeccion(item.id)}
            style={{
              ...styles.navItem,
              background: seccion === item.id ? "#2563eb" : "transparent",
              color: seccion === item.id ? "white" : "#cbd5e1",
            }}
          >
            {item.label}
          </button>
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
        <Card title="Caja actual" value={caja.abierta ? `#${caja.id}` : "Sin caja"} />
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
                  left={`Venta #${venta.id} - Caja #${venta.cajaId} - ${venta.medioPago}`}
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
}: {
  clientes: Cliente[];
  setClientes: (clientes: Cliente[]) => void;
  comercioActual: Comercio | null;
}) {
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");

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

    setNombre("");
    setTelefono("");
  }

  return (
    <>
      <Header title="Clientes" subtitle="Base simple de clientes." />

      <Panel title="Nuevo cliente">
        <div style={styles.formGridSmall}>
          <Input placeholder="Nombre" value={nombre} onChange={setNombre} />
          <Input placeholder="Teléfono" value={telefono} onChange={setTelefono} />
          <Button onClick={agregarCliente}>Guardar cliente</Button>
        </div>
      </Panel>

      <Panel title="Clientes registrados">
        {clientes.length === 0 ? (
          <Empty text="Todavía no hay clientes registrados." />
        ) : (
          clientes.map((cliente) => (
            <Row key={cliente.id} left={cliente.nombre} right={cliente.telefono || "Sin teléfono"} />
          ))
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
        <Card title="Caja actual" value={caja.abierta ? `#${caja.id}` : "Sin caja"} />
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
                  <Th>#</Th>
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
                      <Td>{historial.id}</Td>
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
        concepto: `Venta #${ventaData.id} - ${medioPago}`,
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
              Caja actual: <strong>#{caja.id}</strong>
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
                <Row key={index} left={`${item.nombre} x ${item.cantidad}`} right={money(item.subtotal)} />
              ))}
              <hr style={styles.hr} />
              <Row left="Total" right={money(total)} bold />
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
                left={`#${venta.id} - Caja #${venta.cajaId} - ${formatDate(venta.fecha)} - ${venta.cliente} - ${venta.medioPago}`}
                right={money(venta.total)}
              />
            ))
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
}: {
  ventas: Venta[];
  productos: Producto[];
  ventasDelDia: number;
  productosStockBajo: Producto[];
  ingresosCaja: number;
  egresosCaja: number;
  saldoCajaEstimado: number;
  historialCajas: HistorialCaja[];
}) {
  const productosVendidos = useMemo(() => {
    const mapa: Record<string, number> = {};

    ventas.forEach((venta) => {
      venta.items.forEach((item) => {
        mapa[item.nombre] = (mapa[item.nombre] || 0) + item.cantidad;
      });
    });

    return Object.entries(mapa)
      .map(([nombre, cantidad]) => ({ nombre, cantidad }))
      .sort((a, b) => b.cantidad - a.cantidad);
  }, [ventas]);

  const margenEstimado = ventas.reduce((acc, venta) => {
    const margenVenta = venta.items.reduce((total, item) => {
      const producto = productos.find((p) => p.id === item.productoId);
      if (!producto) return total;
      return total + (item.precioUnitario - producto.costo) * item.cantidad;
    }, 0);

    return acc + margenVenta;
  }, 0);

  return (
    <>
      <Header title="Reportes" subtitle="Indicadores básicos del comercio." />

      <div style={styles.cardsGrid}>
        <Card title="Ventas totales" value={money(ventasDelDia)} />
        <Card title="Cantidad de ventas" value={String(ventas.length)} />
        <Card title="Margen estimado" value={money(margenEstimado)} />
        <Card title="Cajas cerradas" value={String(historialCajas.length)} />
      </div>

      <div style={styles.cardsGrid}>
        <Card title="Stock bajo" value={String(productosStockBajo.length)} />
        <Card title="Ingresos caja actual" value={money(ingresosCaja)} />
        <Card title="Egresos caja actual" value={money(egresosCaja)} />
        <Card title="Saldo caja actual" value={money(saldoCajaEstimado)} />
      </div>

      <div style={styles.twoColumns}>
        <Panel title="Productos más vendidos">
          {productosVendidos.length === 0 ? (
            <Empty text="Todavía no hay productos vendidos." />
          ) : (
            productosVendidos.map((p) => (
              <Row key={p.nombre} left={p.nombre} right={`${p.cantidad} unidades`} />
            ))
          )}
        </Panel>

        <Panel title="Productos con stock bajo">
          {productosStockBajo.length === 0 ? (
            <Empty text="No hay productos con stock bajo." />
          ) : (
            productosStockBajo.map((p) => (
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

function Empty({ text }: { text: string }) {
  return <p style={styles.empty}>{text}</p>;
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
    background: "linear-gradient(135deg, #eef2ff 0%, #f8fafc 45%, #ecfeff 100%)",
    fontFamily: "Inter, Arial, sans-serif",
  },
  loginMain: {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #0f172a 0%, #1e3a8a 55%, #0f766e 100%)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "Inter, Arial, sans-serif",
    padding: 24,
  },
  loginBox: {
    width: 440,
    background: "rgba(255,255,255,0.96)",
    padding: 36,
    borderRadius: 24,
    boxShadow: "0 24px 60px rgba(15, 23, 42, 0.35)",
    border: "1px solid rgba(255,255,255,0.6)",
  },
  loginTitle: {
    fontSize: 28,
    lineHeight: 1.15,
    color: "#0f172a",
    margin: 0,
    fontWeight: 800,
    letterSpacing: "-0.03em",
  },
  loginText: {
    color: "#64748b",
    marginTop: 10,
    marginBottom: 26,
    lineHeight: 1.5,
  },
  layout: {
    display: "flex",
    minHeight: "100vh",
  },
  sidebar: {
    width: 260,
    background: "linear-gradient(180deg, #0f172a 0%, #111827 55%, #020617 100%)",
    color: "white",
    padding: 24,
    flexShrink: 0,
    boxShadow: "8px 0 24px rgba(15, 23, 42, 0.12)",
  },
  logo: {
    fontSize: 24,
    margin: 0,
    fontWeight: 800,
    letterSpacing: "-0.03em",
  },
  logoSub: {
    color: "#94a3b8",
    fontSize: 14,
    marginTop: 6,
  },
  navItem: {
    display: "block",
    width: "100%",
    border: "none",
    textAlign: "left",
    padding: "13px 14px",
    borderRadius: 12,
    marginBottom: 8,
    cursor: "pointer",
    fontSize: 15,
    fontWeight: 600,
    transition: "all 0.2s ease",
  },
  logoutButton: {
    marginTop: 24,
    width: "100%",
    background: "#334155",
    color: "white",
    border: "none",
    padding: "11px",
    borderRadius: 12,
    cursor: "pointer",
    fontWeight: 700,
  },
  content: {
    flex: 1,
    padding: 34,
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
    fontSize: 34,
    color: "#0f172a",
    margin: 0,
    fontWeight: 800,
    letterSpacing: "-0.04em",
  },
  subtitle: {
    color: "#64748b",
    marginTop: 8,
    fontSize: 15,
  },
  cardsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: 18,
    marginBottom: 24,
  },
  card: {
    background: "rgba(255,255,255,0.92)",
    padding: 22,
    borderRadius: 22,
    boxShadow: "0 12px 30px rgba(15, 23, 42, 0.08)",
    border: "1px solid rgba(226, 232, 240, 0.9)",
    minHeight: 92,
  },
  cardTitle: {
    color: "#64748b",
    fontSize: 13,
    margin: 0,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.04em",
  },
  cardValue: {
    color: "#0f172a",
    fontSize: 25,
    fontWeight: 800,
    margin: "10px 0 0",
    wordBreak: "break-word",
    letterSpacing: "-0.03em",
  },
  twoColumns: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 18,
    marginBottom: 24,
  },
  panel: {
    background: "rgba(255,255,255,0.94)",
    padding: 26,
    borderRadius: 22,
    boxShadow: "0 12px 30px rgba(15, 23, 42, 0.08)",
    border: "1px solid rgba(226, 232, 240, 0.9)",
    marginBottom: 24,
  },
  panelTitle: {
    color: "#0f172a",
    margin: 0,
    fontSize: 20,
    fontWeight: 800,
    letterSpacing: "-0.02em",
  },
  text: {
    color: "#475569",
    lineHeight: 1.55,
    fontSize: 15,
  },
  empty: {
    color: "#64748b",
    margin: 0,
    fontSize: 15,
  },
  row: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 16,
    padding: "13px 0",
    borderBottom: "1px solid #e2e8f0",
    color: "#0f172a",
    fontSize: 14,
  },
  formGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: 14,
  },
  formGridSmall: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: 14,
    alignItems: "center",
  },
  input: {
    border: "1px solid #cbd5e1",
    borderRadius: 12,
    padding: "12px 14px",
    fontSize: 14,
    width: "100%",
    boxSizing: "border-box",
    background: "white",
    color: "#0f172a",
    outline: "none",
    boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)",
  },
  actions: {
    display: "flex",
    gap: 12,
    marginTop: 20,
  },
  button: {
    background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
    color: "white",
    border: "none",
    padding: "12px 18px",
    borderRadius: 12,
    fontWeight: 800,
    cursor: "pointer",
    boxShadow: "0 8px 18px rgba(37, 99, 235, 0.25)",
  },
  secondaryButton: {
    background: "#e2e8f0",
    color: "#0f172a",
    border: "none",
    padding: "12px 18px",
    borderRadius: 12,
    fontWeight: 800,
    cursor: "pointer",
  },
  smallButton: {
    border: "none",
    borderRadius: 10,
    padding: "8px 10px",
    fontSize: 12,
    fontWeight: 800,
    cursor: "pointer",
    background: "#e0f2fe",
    color: "#075985",
  },
  tableWrapper: {
    background: "rgba(255,255,255,0.96)",
    borderRadius: 22,
    boxShadow: "0 12px 30px rgba(15, 23, 42, 0.08)",
    border: "1px solid rgba(226, 232, 240, 0.9)",
    overflow: "hidden",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
  },
  thead: {
    background: "#f8fafc",
  },
  tr: {
    borderTop: "1px solid #e2e8f0",
  },
  th: {
    textAlign: "left",
    padding: "15px 18px",
    fontSize: 12,
    color: "#475569",
    textTransform: "uppercase",
    whiteSpace: "nowrap",
    letterSpacing: "0.05em",
    fontWeight: 800,
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
    fontWeight: 800,
  },
  hr: {
    border: "none",
    borderTop: "1px solid #e2e8f0",
    margin: "14px 0",
  },
};