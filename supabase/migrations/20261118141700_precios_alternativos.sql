-- Los precios opcionales comparten el mismo producto y stock.
ALTER TABLE public.productos ADD COLUMN precio_mayorista numeric(12,2) CHECK (precio_mayorista IS NULL OR (precio_mayorista > 0 AND precio_mayorista <= 9999999999.99)), ADD COLUMN precio_promocional numeric(12,2) CHECK (precio_promocional IS NULL OR (precio_promocional > 0 AND precio_promocional <= 9999999999.99));

CREATE OR REPLACE FUNCTION public.registrar_venta(p_comercio_id bigint, p_caja_id bigint, p_cliente_id bigint, p_cliente_nombre text, p_medio_pago text, p_items jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
declare
  v_usuario uuid := auth.uid();
  v_email_usuario text := coalesce(auth.jwt() ->> 'email', '');
  v_caja_abierta boolean;
  v_cliente_nombre text;
  v_medio_pago text;
  v_total numeric := 0;
  v_precio numeric;
  v_venta_id bigint;
  v_item record;
  v_producto record;
  v_cantidad_items integer := 0;
begin
  if v_usuario is null then
    raise exception 'Sesión inválida.';
  end if;

  if not private.tiene_permiso_comercio(
    p_comercio_id,
    'ventas.crear'
  ) then
    raise exception
      'No tenés permiso para registrar ventas en este comercio.';
  end if;

  -- El bloqueo evita que se cierre la caja mientras se registra la venta.
  select c.abierta
  into v_caja_abierta
  from public.cajas c
  where c.id = p_caja_id
    and c.comercio_id = p_comercio_id
  for update;

  if not found or coalesce(v_caja_abierta, false) = false then
    raise exception 'La caja no existe o ya está cerrada.';
  end if;

  if p_items is null
     or jsonb_typeof(p_items) is distinct from 'array'
     or jsonb_array_length(p_items) = 0 then
    raise exception 'La venta no tiene productos válidos.';
  end if;

  if p_cliente_id is not null then
    select c.nombre
    into v_cliente_nombre
    from public.clientes c
    where c.id = p_cliente_id
      and c.comercio_id = p_comercio_id;

    if not found then
      raise exception
        'El cliente seleccionado no pertenece al comercio.';
    end if;
  else
    v_cliente_nombre :=
      coalesce(
        nullif(trim(p_cliente_nombre), ''),
        'Consumidor final'
      );
  end if;

  v_medio_pago :=
    nullif(trim(coalesce(p_medio_pago, '')), '');

  if v_medio_pago is null then
    raise exception 'El medio de pago es obligatorio.';
  end if;

  -- Valida cada línea antes de agrupar; clientes antiguos usan el precio normal.
  if exists (
    select 1 from jsonb_to_recordset(p_items) as x(producto_id bigint, cantidad integer, tipo_precio text, precio_esperado numeric)
    where x.producto_id is null or x.cantidad is null or x.cantidad <= 0
       or coalesce(x.tipo_precio, 'normal') not in ('normal', 'mayorista', 'promocional')
  ) then
    raise exception 'Hay un producto, una cantidad o un tipo de precio inválido en la venta.';
  end if;

  -- Agrupa por producto y tarifa, bloqueando por producto en orden estable.
  for v_item in
    select
      x.producto_id,
      coalesce(x.tipo_precio, 'normal') as tipo_precio,
      sum(x.cantidad)::integer as cantidad,
      sum(sum(x.cantidad)) over (partition by x.producto_id) as cantidad_total_producto,
      min(x.precio_esperado) as precio_esperado_min,
      max(x.precio_esperado) as precio_esperado_max
    from jsonb_to_recordset(p_items)
      as x(producto_id bigint, cantidad integer, tipo_precio text, precio_esperado numeric)
    group by x.producto_id, coalesce(x.tipo_precio, 'normal')
    order by x.producto_id, coalesce(x.tipo_precio, 'normal')
  loop
    if v_item.producto_id is null
       or v_item.cantidad is null
       or v_item.cantidad <= 0 then
      raise exception
        'Hay un producto o una cantidad inválida en la venta.';
    end if;

    select
      p.id,
      p.nombre,
      p.precio,
      p.precio_mayorista,
      p.precio_promocional,
      p.stock,
      p.activo
    into v_producto
    from public.productos p
    where p.id = v_item.producto_id
      and p.comercio_id = p_comercio_id
    for update;

    if not found then
      raise exception
        'El producto % no pertenece al comercio.',
        v_item.producto_id;
    end if;

    if coalesce(v_producto.activo, false) = false then
      raise exception
        'El producto % está desactivado.',
        v_producto.nombre;
    end if;

    if v_producto.stock < v_item.cantidad_total_producto then
      raise exception
        'Stock insuficiente de %. Disponible: %. Solicitado: %.',
        v_producto.nombre,
        v_producto.stock,
        v_item.cantidad_total_producto;
    end if;

    v_precio := case v_item.tipo_precio
      when 'mayorista' then v_producto.precio_mayorista
      when 'promocional' then v_producto.precio_promocional
      else v_producto.precio end;
    if v_precio is null or v_precio < 0 or (v_item.tipo_precio <> 'normal' and v_precio <= 0) then
      raise exception 'El precio seleccionado de % no está disponible.', v_producto.nombre;
    end if;
    if (v_item.precio_esperado_min is not null and v_item.precio_esperado_min <> v_precio)
       or (v_item.precio_esperado_max is not null and v_item.precio_esperado_max <> v_precio) then
      raise exception 'El precio de % cambió. Actualizá los productos antes de volver a confirmar.', v_producto.nombre;
    end if;

    v_total :=
      v_total + (v_precio * v_item.cantidad);

    v_cantidad_items := v_cantidad_items + 1;
  end loop;

  if v_cantidad_items = 0 or v_total <= 0 then
    raise exception
      'La venta no contiene productos válidos.';
  end if;

  insert into public.ventas (
    comercio_id,
    caja_id,
    cliente_id,
    cliente_nombre,
    medio_pago,
    total,
    fecha,
    created_at,
    estado,
    registrada_por,
    registrada_por_email
  )
  values (
    p_comercio_id,
    p_caja_id,
    p_cliente_id,
    v_cliente_nombre,
    v_medio_pago,
    v_total,
    now(),
    now(),
    'activa',
    v_usuario,
    v_email_usuario
  )
  returning id into v_venta_id;

  for v_item in
    select
      x.producto_id,
      coalesce(x.tipo_precio, 'normal') as tipo_precio,
      sum(x.cantidad)::integer as cantidad,
      sum(sum(x.cantidad)) over (partition by x.producto_id) as cantidad_total_producto,
      min(x.precio_esperado) as precio_esperado_min,
      max(x.precio_esperado) as precio_esperado_max
    from jsonb_to_recordset(p_items)
      as x(producto_id bigint, cantidad integer, tipo_precio text, precio_esperado numeric)
    group by x.producto_id, coalesce(x.tipo_precio, 'normal')
    order by x.producto_id, coalesce(x.tipo_precio, 'normal')
  loop
    select
      p.nombre,
      case v_item.tipo_precio when 'mayorista' then p.precio_mayorista when 'promocional' then p.precio_promocional else p.precio end as precio
    into v_producto
    from public.productos p
    where p.id = v_item.producto_id
      and p.comercio_id = p_comercio_id;

    insert into public.venta_items (
      comercio_id,
      venta_id,
      producto_id,
      nombre_producto,
      cantidad,
      precio_unitario,
      subtotal,
      created_at
    )
    values (
      p_comercio_id,
      v_venta_id,
      v_item.producto_id,
      v_producto.nombre,
      v_item.cantidad,
      v_producto.precio,
      v_producto.precio * v_item.cantidad,
      now()
    );

    update public.productos
    set stock = stock - v_item.cantidad
    where id = v_item.producto_id
      and comercio_id = p_comercio_id;
  end loop;

  insert into public.movimientos_caja (
    comercio_id,
    caja_id,
    venta_id,
    tipo,
    concepto,
    monto,
    fecha,
    created_at
  )
  values (
    p_comercio_id,
    p_caja_id,
    v_venta_id,
    'Ingreso',
    'Venta - ' || v_medio_pago,
    v_total,
    now(),
    now()
  );

  return jsonb_build_object(
    'ok', true,
    'venta_id', v_venta_id,
    'total', v_total,
    'caja_id', p_caja_id,
    'registrada_por', v_usuario,
    'registrada_por_email', v_email_usuario
  );
end;
$function$;
