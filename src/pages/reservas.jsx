// Estado inicial para cada campo del formulario
import React, { useState } from "react";
export function Reservas() {
  const [formData, setFormData] = useState({
    eventDate: "",
    clientName: "",
    clientDocument: "",
    clientDocumentType: "DNI",
    clientAddress: "",
    phoneNumber: "",
    productName: "",
    barcode: "",
    size: "",
    color: "",
    price: "",
    rentedProducts: "",
    description: "",
    payment: "adelanto",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log(formData);
    alert("Formulario enviado");
  };

  return (
    <div className="max-w-5xl mx-auto p-6">
      <h2 className="text-3xl font-bold mb-6 text-center">
        Registrar Alquiler de Producto
      </h2>

      <form onSubmit={handleSubmit}>
        {/* Fecha de alquiler */}
        <div className="mb-6">
          <div className="bg-gradient-to-r from-gray-800 via-gray-600 to-gray-500 p-4 rounded shadow-md">
            <label className="block text-white mb-2 text-lg font-semibold">
              Fecha de alquiler:
            </label>
            <input
              type="date"
              name="eventDate"
              value={formData.eventDate}
              onChange={handleChange}
              className="w-full p-2 border border-gray-300 rounded text-black"
              required
            />
          </div>
        </div>

        {/* Cliente y Producto */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Información del Cliente */}
          <div className="bg-gradient-to-br from-blue-900 via-gray-700 to-black p-6 rounded shadow-md text-white">
            <h3 className="text-xl font-semibold mb-4">Datos del Cliente</h3>
            <div className="space-y-4 text-sm">
              <div>
                <label className="block text-gray-300">
                  Nombre del cliente:
                </label>
                <input
                  type="text"
                  name="clientName"
                  value={formData.clientName}
                  onChange={handleChange}
                  className="w-full p-2 border border-gray-500 rounded text-black"
                  required
                />
              </div>

              <div>
                <label className="block text-gray-300">
                  Tipo de documento:
                </label>
                <select
                  name="clientDocumentType"
                  value={formData.clientDocumentType}
                  onChange={handleChange}
                  className="w-full p-2 border border-gray-500 rounded text-black"
                >
                  <option value="DNI">DNI</option>
                  <option value="Otro">Otro</option>
                </select>
              </div>

              <div>
                <label className="block text-gray-300">
                  Documento del cliente:
                </label>
                <input
                  type="text"
                  name="clientDocument"
                  value={formData.clientDocument}
                  onChange={handleChange}
                  className="w-full p-2 border border-gray-500 rounded text-black"
                  required
                />
              </div>

              <div>
                <label className="block text-gray-300">
                  Dirección del cliente:
                </label>
                <input
                  type="text"
                  name="clientAddress"
                  value={formData.clientAddress}
                  onChange={handleChange}
                  className="w-full p-2 border border-gray-500 rounded text-black"
                  required
                />
              </div>

              <div>
                <label className="block text-gray-300">
                  Teléfono del cliente:
                </label>
                <input
                  type="tel"
                  name="phoneNumber"
                  value={formData.phoneNumber}
                  onChange={handleChange}
                  className="w-full p-2 border border-gray-500 rounded text-black"
                  required
                />
              </div>
            </div>
          </div>

          {/* Información del Producto */}
          <div className="bg-gradient-to-bl from-gray-900 via-gray-700 to-black p-6 rounded shadow-md text-white">
            <h3 className="text-xl font-semibold mb-4">Datos del Producto</h3>
            <div className="space-y-4 text-sm">
              <div>
                <label className="block text-gray-300">
                  Nombre del producto:
                </label>
                <input
                  type="text"
                  name="productName"
                  value={formData.productName}
                  onChange={handleChange}
                  className="w-full p-2 border border-gray-500 rounded text-black"
                  required
                />
              </div>

              <div>
                <label className="block text-gray-300">Código de barra:</label>
                <input
                  type="text"
                  name="barcode"
                  value={formData.barcode}
                  onChange={handleChange}
                  className="w-full p-2 border border-gray-500 rounded text-black"
                  required
                />
              </div>

              <div>
                <label className="block text-gray-300">
                  Talla del producto:
                </label>
                <input
                  type="text"
                  name="size"
                  value={formData.size}
                  onChange={handleChange}
                  className="w-full p-2 border border-gray-500 rounded text-black"
                  required
                />
              </div>

              <div>
                <label className="block text-gray-300">
                  Color del producto:
                </label>
                <input
                  type="text"
                  name="color"
                  value={formData.color}
                  onChange={handleChange}
                  className="w-full p-2 border border-gray-500 rounded text-black"
                />
              </div>

              <div>
                <label className="block text-gray-300">
                  Precio del producto:
                </label>
                <input
                  type="number"
                  name="price"
                  value={formData.price}
                  onChange={handleChange}
                  className="w-full p-2 border border-gray-500 rounded text-black"
                  required
                />
              </div>

              <div>
                <label className="block text-gray-300">
                  Productos a alquilar (si aplica):
                </label>
                <textarea
                  name="rentedProducts"
                  value={formData.rentedProducts}
                  onChange={handleChange}
                  className="w-full p-2 border border-gray-500 rounded text-black"
                />
              </div>

              <div>
                <label className="block text-gray-300">
                  Descripción adicional:
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  className="w-full p-2 border border-gray-500 rounded text-black"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Información de pago */}
        <div className="mt-6 bg-gradient-to-r from-gray-700 via-gray-800 to-gray-900 p-6 rounded shadow-md">
          <label className="block text-white">Adelanto o Pago Total:</label>
          <select
            name="payment"
            value={formData.payment}
            onChange={handleChange}
            className="w-full p-2 border border-gray-500 rounded text-black"
          >
            <option value="adelanto">Adelanto</option>
            <option value="total">Pago total</option>
          </select>
        </div>

        {/* Botón de enviar */}
        <button
          type="submit"
          className="mt-6 w-full bg-blue-800 text-white p-3 rounded hover:bg-blue-900"
        >
          Registrar Producto
        </button>
      </form>
    </div>
  );
}
