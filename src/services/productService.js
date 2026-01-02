import api from '../api/axios';

const ENDPOINT = 'inventory/products/';

export const productService = {
    getAll: async (params = {}) => {
        const response = await api.get(ENDPOINT, { params });
        return response.data;
    },

    getById: async (id) => {
        const response = await api.get(`${ENDPOINT}${id}/`);
        return response.data;
    },

    create: async (data) => {
        const response = await api.post(ENDPOINT, data);
        return response.data;
    },

    update: async (id, data) => {
        const response = await api.put(`${ENDPOINT}${id}/`, data);
        return response.data;
    },

    delete: async (id) => {
        await api.delete(`${ENDPOINT}${id}/`);
    },

    restore: async (id) => {
        const response = await api.post(`${ENDPOINT}${id}/restore/`);
        return response.data;
    },

    hardDelete: async (id) => {
        await api.post(`${ENDPOINT}${id}/hard-delete/`);
    },

    importCSV: async (file) => {
        const formData = new FormData();
        formData.append('file', file);
        const response = await api.post(`${ENDPOINT}import/`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        return response.data;
    },

    // Extras
    getSuppliers: async () => {
        const response = await api.get('inventory/suppliers/');
        return response.data.results || response.data;
    },

    createSupplier: async (data) => {
        const response = await api.post('inventory/suppliers/', data);
        return response.data;
    },

    deleteSupplier: async (id) => {
        await api.delete(`inventory/suppliers/${id}/`);
    },

    getLowStock: async () => {
        const response = await api.get('inventory/low-stock/');
        return response.data;
    }
};
