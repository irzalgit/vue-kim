interface SimulasiHeaderProps {
  jenis: string;
}

export default function SimulasiHeader({ jenis }: SimulasiHeaderProps) {
  // Mengubah kode menjadi format yang lebih rapi (misal: "matematika" -> "Matematika")
  const namaSimulasi = jenis ? jenis.charAt(0).toUpperCase() + jenis.slice(1) : 'Simulasi';

  return (
    <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-2xl p-6 mb-8 text-center shadow-lg">
      <h2 className="text-2xl font-bold">
        Simulasi {namaSimulasi} (25 Soal)
      </h2>
      <p className="opacity-90">AI Agent Gemini 2.5 Flash siap membantu!</p>
    </div>
  );
}
