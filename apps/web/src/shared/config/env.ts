export const env = {
  // Vite HANYA bisa membaca variabel yang diawali dengan VITE_
  API_URL: import.meta.env.VITE_API_URL || 'http://localhost:3000',
};