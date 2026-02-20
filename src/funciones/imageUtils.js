import { API_BASE_URL } from "../config";

/**
 * Construye la URL de visualización para una imagen.
 * - Si el path ya es una URL completa (Cloudinary), la retorna tal cual.
 * - Si es un path local antiguo (uploads/...), le antepone API_BASE_URL.
 */
export function buildImageUrl(imgPath) {
  if (!imgPath) return null;
  const cleaned = String(imgPath).replace(/\\/g, "/").replace(/^\/+/, "");
  if (cleaned.startsWith("http://") || cleaned.startsWith("https://")) {
    return cleaned;
  }
  return `${API_BASE_URL}/${cleaned}`;
}
