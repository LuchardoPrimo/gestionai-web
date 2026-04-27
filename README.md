# GestiónAI — ERP Inteligente para Constructoras

Plataforma de gestión financiera con IA diseñada para empresas de construcción en Argentina.

## Funcionalidades

- **Dashboard** — KPIs financieros, ingresos/egresos, alertas IA
- **Clientes / Proveedores** — CRM con creación, detalle, historial
- **Proyectos / Obras** — Avance, presupuesto, tareas y documentos
- **Tareas** — Kanban, Lista, Calendario con edición completa
- **Transacciones** — Ingresos, egresos, pendientes, facturas vinculadas
- **Contabilidad** — Libro Diario (con IA), Mayor, Balance de Comprobación
- **Tesorería** — Cuentas bancarias, forecast, CxC/CxP, alertas
- **Documentos** — Upload con OCR, asociación a contactos/proyectos
- **Reportes** — P&L, Balance, Flujo de Efectivo, por Proyecto, Aging

## Inicio rápido

```bash
npm install
npm run dev
# Abrir http://localhost:5173
```

## Deploy a Vercel (gratis)

```bash
# Opción CLI
npm i -g vercel && vercel

# Opción GitHub: importar repo en vercel.com → Deploy
```

## Roadmap

- [ ] OCR/IA para tickets y facturas (monto, proveedor, IVA)
- [ ] WhatsApp como canal de entrada
- [ ] Integración AFIP
- [ ] Integración bancaria
- [ ] Backend PostgreSQL
- [ ] Autenticación y roles
