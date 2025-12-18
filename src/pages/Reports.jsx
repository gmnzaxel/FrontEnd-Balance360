import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { Download, BarChart2 } from 'lucide-react';

const Reports = () => {
    const [months, setMonths] = useState(6);
    const [series, setSeries] = useState([]);
    const [loading, setLoading] = useState(false);

    const fetchSeries = async () => {
        setLoading(true);
        try {
            const response = await api.get(`reports/series/?months=${months}`);
            setSeries(response.data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSeries();
    }, [months]);

    const handleExport = async () => {
        try {
            const response = await api.get(`reports/export-excel/?months=${months}`, {
                responseType: 'blob',
            });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `reporte_balance360_${months}meses.xlsx`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            console.error("Error downloading report", error);
        }
    };

    return (
        <div className="reports-page">
            <div className="report-controls">
                <div className="selector">
                    <label>Periodo:</label>
                    <select value={months} onChange={e => setMonths(e.target.value)}>
                        <option value="3">Últimos 3 Meses</option>
                        <option value="6">Últimos 6 Meses</option>
                        <option value="12">Último Año</option>
                    </select>
                </div>
                <button className="btn-primary" onClick={handleExport}>
                    <Download size={18} /> Exportar Excel
                </button>
            </div>

            <div className="chart-container">
                <h3>Evolución de Ventas</h3>
                {loading ? <p>Cargando...</p> : (
                    <div className="simple-chart">
                        {series.map((item, idx) => (
                            <div key={idx} className="bar-group">
                                <div
                                    className="bar"
                                    style={{ height: `${Math.min(item.total / 1000, 200)}px` }}
                                    title={`$${item.total}`}
                                ></div>
                                <span className="label">{item.month}</span>
                                <span className="value">${item.total}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Reports;
