import React from "react";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import PreviewModal from "./PreviewModal";
import "../styles/global.css"

export default function FilePreviewer({ onConfirm }) {
  const [preview, setPreview] = React.useState([]);
  const [file, setFile] = React.useState(null);
  const [showModal, setShowModal] = React.useState(false);

  function handleFileChange(e) {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    setFile(selectedFile);

    const reader = new FileReader();
    reader.onload = (event) => {
      if (selectedFile.name.endsWith(".csv")) {
        const parsed = Papa.parse(event.target.result, { header: true, preview: 10 });
        setPreview(parsed.data);
      } else if (selectedFile.name.endsWith(".xlsx")) {
        const workbook = XLSX.read(new Uint8Array(event.target.result), { type: "array" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet, { defval: "", header: 1 });
        setPreview(rows.slice(0, 10));
      }
      setShowModal(true);
    };

    if (selectedFile.name.endsWith(".csv")) {
      reader.readAsText(selectedFile);
    } else {
      reader.readAsArrayBuffer(selectedFile);
    }
  }

  async function handleConfirm() {
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    await fetch("http://localhost:3001/api/upload", {
      method: "POST",
      body: formData,
    });

    if (onConfirm) onConfirm();
    setShowModal(false);
  }

  return (
    <div class="inline-flex items-center gap-2 bg-white border rounded-lg px-3 py-2 shadow-sm cursor-pointer">
      <input type="file" onChange={handleFileChange} accept=".csv,.xlsx" />
      {showModal && (
        <PreviewModal
          preview={preview}
          onClose={() => setShowModal(false)}
          onConfirm={handleConfirm}
        />
      )}
    </div>
  );
}
