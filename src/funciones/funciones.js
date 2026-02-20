/**
 * Retorna fecha en formato YYYY-MM-DD usando hora LOCAL (no UTC).
 * Evita el bug de toISOString() que devuelve UTC y puede mostrar
 * el día siguiente en zonas horarias como Perú (UTC-5).
 * @param {Date} [date] - Fecha a formatear. Si no se pasa, usa la fecha actual.
 */
const fechaLocalStr = (date) => {
  const d = date || new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

/**
 * Comprime una imagen antes de subirla al servidor.
 * Redimensiona a un ancho máximo y convierte a JPEG con calidad reducida.
 * Una foto de 7 MB puede bajar a ~200-500 KB.
 * @param {File} file - Archivo de imagen original
 * @param {number} [maxWidth=1920] - Ancho máximo en píxeles
 * @param {number} [quality=0.8] - Calidad JPEG (0 a 1)
 * @returns {Promise<File>} - Archivo comprimido
 */
const comprimirImagen = (file, maxWidth = 1920, quality = 0.8) => {
  return new Promise((resolve) => {
    if (!file || !file.type.startsWith("image/")) {
      resolve(file);
      return;
    }
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;
      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      canvas.getContext("2d").drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          const nombre = file.name.replace(/\.[^.]+$/, ".jpg");
          resolve(new File([blob], nombre, { type: "image/jpeg" }));
        },
        "image/jpeg",
        quality
      );
    };
    img.src = URL.createObjectURL(file);
  });
};

/**
 * Convierte una fecha ISO (YYYY-MM-DDT...) o YYYY-MM-DD a formato DD/MM/YYYY.
 * @param {string} fecha - Fecha en formato ISO o YYYY-MM-DD
 * @returns {string} Fecha formateada como DD/MM/YYYY o "N/A" si no es válida
 */
const formatFechaDDMMYYYY = (fecha) => {
  if (!fecha) return "N/A";
  const parte = fecha.split("T")[0];
  const [y, m, d] = parte.split("-");
  if (!y || !m || !d) return parte;
  return `${d}/${m}/${y}`;
};

export { fechaLocalStr, comprimirImagen, formatFechaDDMMYYYY };
