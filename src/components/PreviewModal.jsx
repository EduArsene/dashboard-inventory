import React from "react";
import "../styles/global.css"
export default function PreviewModal({ preview, onClose, onConfirm }) {
  if (!preview || preview.length === 0) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
      <div className="bg-white rounded-xl shadow-lg p-6 w-11/12 max-w-3xl relative">
        {/* Botón de cerrar */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-500 hover:text-gray-800"
        >
          ✖
        </button>

        <h2 className="text-lg font-semibold mb-4">Vista previa del archivo</h2>

        <div className="max-h-96 overflow-auto border rounded-lg">
          <table className="table-auto border-collapse border border-gray-300 w-full text-sm">
            <tbody>
              {preview.map((row, i) => (
                <tr key={i}>
                  {Object.values(row).map((cell, j) => (
                    <td key={j} className="border px-2 py-1">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-300 rounded-lg hover:bg-gray-400"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Confirmar y Guardar
          </button>
        </div>
      </div>
    </div>
  );
}
