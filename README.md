# FrontEnd - Balance360

Frontend en React + Vite para el sistema de gestión Balance360.

## Requisitos

- Node.js 16+
- Backend Balance360 corriendo en `http://localhost:8000`

## Instalación

1.  Instalar dependencias:
    ```bash
    npm install
    ```

2.  Iniciar servidor de desarrollo:
    ```bash
    npm run dev
    ```

## Estructura

- `src/api`: Configuración de Axios e interceptores (Refresh Token).
- `src/context`: AuthContext para manejo de sesión.
- `src/pages`:
    - **Login**: Autenticación.
    - **Dashboard**: KPIs y gráficos simples.
    - **Productos**: CRUD de inventario.
    - **Nueva Venta**: Punto de venta con buscador y carrito.
    - **Ventas**: Historial y detalle.
    - **Reportes**: Exportación a Excel y gráficos.
- `src/components`: Layout principal y rutas protegidas.

## Características

- **Autenticación JWT**: Manejo automático de tokens y expiración.
- **Rutas Protegidas**: Redirección al login si no hay sesión.
- **UI Limpia**: Diseño minimalista con CSS puro y Lucide Icons.
- **Feedback**: Notificaciones toast para acciones (éxito/error).
