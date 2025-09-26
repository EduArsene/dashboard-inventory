// src/components/InventoryDashboard.jsx
import React, { useEffect, useMemo, useState } from "react";
import Papa from "papaparse"; // mantiene para fallback cliente si quieres
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  CartesianGrid,
} from "recharts";
import FilePreviewer from "./FilePreviewer";
const API_BASE = import.meta.env.DEV ? "http://localhost:3001" : "";

export default function InventoryDashboard() {
  const [rows, setRows] = useState([]);
  const [updated, setUpdated] = useState(null);
  const [tab, setTab] = useState("dashboard"); // dashboard | listado | resumen
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [fileUploading, setFileUploading] = useState(false);

  // SSE connect
  useEffect(() => {
    const es = new EventSource(`${API_BASE}/api/events`);
    es.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data);
        // en caso de update, recargar
        if (data?.type === "updated" || data?.type === "connected") {
          fetchData();
        } else if (data?.type === "deleted") {
          setRows([]);
          setUpdated(null);
        }
      } catch (e) {
        /* ignore */
      }
    };
    es.onerror = () => {
      es.close();
    };
    return () => es.close();
  }, []);

  async function fetchData() {
    try {
      const res = await fetch(`${API_BASE}/api/data`);
      const json = await res.json();
      setRows(json.rows || []);
      setUpdated(json.updated || null);
    } catch (err) {
      console.error("Error fetching data:", err);
    }
  }

  useEffect(() => {
    fetchData();
  }, []);

  // Upload handler (server-side)
  async function handleUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`${API_BASE}/api/upload`, {
        method: "POST",
        body: fd,
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "Upload error");
      // server notifica via SSE y fetchData recargará; pero podemos forzar:
      await fetchData();
    } catch (err) {
      console.error(err);
      alert("Error subiendo archivo: " + err.message);
    } finally {
      setFileUploading(false);
    }
  }
  // Función para eliminar archivo
  async function handleDelete() {
    if (!confirm("¿Seguro que deseas eliminar el archivo de inventario?"))
      return;

    const res = await fetch("http://localhost:3001/api/delete", {
      method: "DELETE",
    });
    if (res.ok) {
      alert("Archivo eliminado");
      setData([]); // limpiar la tabla en frontend
    } else {
      alert("Error al eliminar archivo");
    }
  }

  // Client-side parse fallback for quick preview (si quieres)
  async function handleClientParse(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const ext = file.name.split(".").pop().toLowerCase();
    if (ext === "csv" || ext === "txt") {
      const text = await file.text();
      const parsed = Papa.parse(text, { header: true, skipEmptyLines: true });
      setRows(parsed.data.map((r, i) => ({ __id: i + 1, ...r })));
      setUpdated(new Date().toISOString());
    } else {
      // dejamos al server manejar xlsx
      handleUpload(e);
    }
  }
  // Filtrado y paginación
  const filtered = useMemo(() => {
    if (!query) return rows;
    const q = query.toLowerCase();
    return rows.filter((r) =>
      Object.values(r).some((v) =>
        String(v || "")
          .toLowerCase()
          .includes(q)
      )
    );
  }, [rows, query]);

  const paged = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page]);

  // Gráficas: agregaciones útiles
  const aggByLocation = useMemo(() => {
    const m = {};
    for (const r of rows) {
      const loc = (r.location || r.Location || "Sin ubicación").toString();
      m[loc] = (m[loc] || 0) + 1;
    }
    return Object.entries(m)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [rows]);

  const aggByStatus = useMemo(() => {
    const m = {};
    for (const r of rows) {
      const s = (r.status || r.Status || "Desconocido").toString();
      m[s] = (m[s] || 0) + 1;
    }
    return Object.entries(m).map(([name, value]) => ({ name, value }));
  }, [rows]);

  const timeSeriesByPurchase = useMemo(() => {
    // si hay purchase_date o PurchaseDate, agrupar por año-mes
    const m = {};
    for (const r of rows) {
      const dStr =
        r.purchase_date ||
        r.purchaseDate ||
        r.PurchaseDate ||
        r["purchase date"];
      if (!dStr) continue;
      const d = new Date(dStr);
      if (isNaN(d)) continue;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
        2,
        "0"
      )}`;
      m[key] = (m[key] || 0) + 1;
    }
    return Object.entries(m)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [rows]);

  // Paleta (recharts usará defaults si no das colors, pero pondré cells para claridad)
  const COLORS = [
    "#4f46e5",
    "#06b6d4",
    "#f97316",
    "#10b981",
    "#ef4444",
    "#a78bfa",
    "#f59e0b",
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <header className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold">Dashboard Inventario</h1>
            <p className="text-sm text-gray-600">
              Sube CSV/XLSX, se guarda en servidor y se actualiza automáticamente.
            </p>
            <p className="text-xs text-gray-500">
              Última actualización del servidor: {updated || "—"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <label className="inline-flex items-center gap-2 bg-white border rounded-lg px-3 py-2 shadow-sm cursor-pointer">
              <input type="file" accept=".csv,.xlsx,.xls,.txt" onChange={handleUpload} className="hidden" />
              Subir (server)
            </label>
            <FilePreviewer onConfirm={fetchData} />

            <button onClick={fetchData} className="px-3 py-2 bg-slate-700 text-white rounded-lg">Recargar</button>
            {/* Botón nuevo */}
            <button onClick={handleDelete} className="px-3 py-2 bg-red-600 text-white rounded-lg">
              Eliminar archivo
            </button>
          </div>
        </header>

        <nav className="mb-4">
          <button
            className={`px-4 py-2 mr-2 rounded ${
              tab === "dashboard" ? "bg-slate-700 text-white" : "bg-white"
            }`}
            onClick={() => setTab("dashboard")}
          >
            Dashboard
          </button>
          <button
            className={`px-4 py-2 mr-2 rounded ${
              tab === "listado" ? "bg-slate-700 text-white" : "bg-white"
            }`}
            onClick={() => setTab("listado")}
          >
            Listado
          </button>
          <button
            className={`px-4 py-2 rounded ${
              tab === "resumen" ? "bg-slate-700 text-white" : "bg-white"
            }`}
            onClick={() => setTab("resumen")}
          >
            Resumen
          </button>
        </nav>

        {tab === "dashboard" && (
          <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white p-4 rounded-2xl shadow space-y-4">
              <h2 className="font-semibold">Principales métricas</h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 border rounded">
                  <div className="text-sm text-gray-500">Total activos</div>
                  <div className="text-2xl font-bold">{rows.length}</div>
                </div>
                <div className="p-4 border rounded">
                  <div className="text-sm text-gray-500">
                    Ubicaciones registradas
                  </div>
                  <div className="text-2xl font-bold">
                    {aggByLocation.length}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div style={{ height: 300 }} className="bg-white p-2 rounded">
                  <h4 className="font-medium mb-2">
                    Activos por ubicación (top 10)
                  </h4>
                  <ResponsiveContainer width="100%" height="85%">
                    <BarChart data={aggByLocation} margin={{ left: 20 }}>
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="value" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div style={{ height: 300 }} className="bg-white p-2 rounded">
                  <h4 className="font-medium mb-2">Estado del inventario</h4>
                  <ResponsiveContainer width="100%" height="85%">
                    <PieChart>
                      <Pie
                        data={aggByStatus}
                        dataKey="value"
                        nameKey="name"
                        outerRadius={80}
                        label
                      >
                        {aggByStatus.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={COLORS[index % COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Legend />
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div style={{ height: 260 }} className="bg-white p-2 rounded">
                <h4 className="font-medium mb-2">
                  Activos por fecha de adquisición
                </h4>
                {timeSeriesByPurchase.length ? (
                  <ResponsiveContainer width="100%" height="85%">
                    <LineChart data={timeSeriesByPurchase}>
                      <XAxis dataKey="name" />
                      <YAxis />
                      <CartesianGrid strokeDasharray="3 3" />
                      <Tooltip />
                      <Line type="monotone" dataKey="value" stroke="#4f46e5" />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="p-6 text-sm text-gray-500">
                    No hay datos de fecha de compra.
                  </div>
                )}
              </div>
            </div>

            <aside className="bg-white p-4 rounded-2xl shadow">
              <h3 className="font-semibold mb-2">
                Top usuarios / responsables
              </h3>
              <div className="text-sm text-gray-600 mb-4">
                {/* top users quick list */}
                {(() => {
                  const m = {};
                  for (const r of rows) {
                    const u = (
                      r.user ||
                      r.User ||
                      r.usuario ||
                      "Sin usuario"
                    ).toString();
                    m[u] = (m[u] || 0) + 1;
                  }
                  const arr = Object.entries(m)
                    .map(([name, value]) => ({ name, value }))
                    .sort((a, b) => b.value - a.value)
                    .slice(0, 7);
                  if (!arr.length)
                    return (
                      <div className="text-xs text-gray-500">
                        No hay usuarios.
                      </div>
                    );
                  return arr.map((x, i) => (
                    <div key={x.name} className="flex justify-between py-1">
                      <div className="truncate">
                        {i + 1}. {x.name}
                      </div>
                      <div className="font-semibold">{x.value}</div>
                    </div>
                  ));
                })()}
              </div>

              <div>
                <h4 className="font-medium">Acciones rápidas</h4>
                <ul className="text-sm text-gray-600 mt-2 space-y-2">
                  <li>• Subir archivo para actualizar inventario.</li>
                  <li>
                    • Descargar inventario actual desde servidor (endpoint
                    /api/download).
                  </li>
                  <li>• Revisar duplicados por serial y reconciliar.</li>
                </ul>
              </div>
            </aside>
          </section>
        )}

        {tab === "listado" && (
          <section className="bg-white p-4 rounded-2xl shadow">
            <div className="flex items-center justify-between mb-4">
              <input
                placeholder="Buscar hostname, usuario, serial..."
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(1);
                }}
                className="border rounded px-3 py-2 w-1/2"
              />
              <div className="text-sm text-gray-600">
                Mostrando {filtered.length} resultados
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left">#</th>
                    {/* dynamic headers */}
                    {rows[0]
                      ? Object.keys(rows[0])
                          .filter((k) => k !== "__id")
                          .map((h) => (
                            <th
                              key={h}
                              className="px-3 py-2 text-left text-sm font-medium text-gray-700"
                            >
                              {h}
                            </th>
                          ))
                      : null}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {paged.map((r) => (
                    <tr key={r.__id} className="hover:bg-gray-50">
                      <td className="px-3 py-2">{r.__id}</td>
                      {rows[0]
                        ? Object.keys(rows[0])
                            .filter((k) => k !== "__id")
                            .map((c) => (
                              <td key={c} className="px-3 py-2 text-sm">
                                {String(r[c] ?? "")}
                              </td>
                            ))
                        : null}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-gray-600">
                Página {page} /{" "}
                {Math.max(1, Math.ceil(filtered.length / pageSize))}
              </div>
              <div>
                <button
                  className="px-3 py-1 mr-2 border rounded"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Anterior
                </button>
                <button
                  className="px-3 py-1 border rounded"
                  onClick={() => setPage((p) => p + 1)}
                >
                  Siguiente
                </button>
              </div>
            </div>
          </section>
        )}

        {tab === "resumen" && (
          <section className="bg-white p-4 rounded-2xl shadow">
            <h2 className="font-semibold mb-4">Resumen</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 border rounded">
                <div className="text-sm text-gray-500">Total activos</div>
                <div className="text-2xl font-bold">{rows.length}</div>
              </div>
              <div className="p-4 border rounded">
                <div className="text-sm text-gray-500">Activos sin serial</div>
                <div className="text-2xl font-bold">
                  {rows.filter((r) => !r.serial && !r.Serial).length}
                </div>
              </div>
              <div className="p-4 border rounded">
                <div className="text-sm text-gray-500">
                  Activos sin ubicación
                </div>
                <div className="text-2xl font-bold">
                  {rows.filter((r) => !r.location && !r.Location).length}
                </div>
              </div>
            </div>

            <div className="mt-6">
              <h4 className="font-medium mb-2">Sugerencias de mantenimiento</h4>
              <ul className="text-sm text-gray-600">
                <li>• Corregir filas sin serial o sin ubicación.</li>
                <li>• Revisar estados `En reparación` y priorizar.</li>
                <li>• Crear reporte mensual por ubicación.</li>
              </ul>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
