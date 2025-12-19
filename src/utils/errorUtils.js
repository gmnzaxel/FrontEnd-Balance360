export const getErrorMessage = (error) => {
    if (!error.response) {
        if (error.message === 'Network Error') {
            return 'Error de conexión. Verifique su internet o el estado del servidor.';
        }
        return error.message || 'Ocurrió un error inesperado.';
    }

    const { status, data } = error.response;

    // 403 Forbidden
    if (status === 403) {
        const detail = data?.detail || data?.message;
        if (detail && detail !== 'You do not have permission to perform this action.') return detail;
        return 'No tienes permisos para realizar esta acción.';
    }

    // 401 Unauthorized
    if (status === 401) {
        return 'Sesión expirada o credenciales inválidas.';
    }

    // 404 Not Found
    if (status === 404) {
        return 'El recurso solicitado no existe.';
    }

    // 500+ Server Errors
    if (status >= 500) {
        return 'Error interno del servidor. Intente más tarde.';
    }

    // 400 Bad Request (Validation Errors)
    if (status === 400) {
        if (typeof data === 'string') return data;

        // DRF returns object with list of errors per field
        if (typeof data === 'object') {
            // Check for 'detail' or 'error' key first
            if (data.detail) return data.detail;
            if (data.error) return data.error;

            // Extract first validation error found
            const firstKey = Object.keys(data)[0];
            if (firstKey) {
                const firstError = data[firstKey];
                const errorMsg = Array.isArray(firstError) ? firstError[0] : firstError;
                // Format: "username: This field is required." -> "Username: This field is required."
                const label = firstKey.charAt(0).toUpperCase() + firstKey.slice(1);
                return `${label}: ${errorMsg}`;
            }
        }
        return 'Datos inválidos. Verifique el formulario.';
    }

    return 'Ocurrió un error al procesar la solicitud.';
};
