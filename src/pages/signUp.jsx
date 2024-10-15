import { useForm } from "react-hook-form"; // este hook e spara usar validadcione sne los formularios
import { useState } from "react";
import { SiPanasonic } from "react-icons/si";
import {} from "../assets/fondo.webp";
import { BsWatch } from "react-icons/bs";
export function SignUp() {
  const estiloinput = "rounded-lg border-2 w-full  text-slate-500";
  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm();
  const [nombreImagen, setNombreImagen] = useState(""); // Estado para el nombre de la imagen
  const [previewImage, setPreviewImage] = useState(""); // Estado para la URL de la imagen
  const [showPassword, setShowPassword] = useState(false);
  const [showPassword1, setShowPassword1] = useState(false);

  const handleFileChange = (e) => {
    const archivo = e.target.files[0];
    if (archivo) {
      setNombreImagen(archivo.name); // Guarda el nombre del archivo
      setPreviewImage(URL.createObjectURL(archivo)); // Genera una URL temporal para la imagen
    }
  };

  const onSubmit = handleSubmit((data) => {
    console.log(data);
  });

  return (
    <div
      className="grid grid-cols-3  bg-blue-200  h-screen overflow-auto"
      style={{
        backgroundImage: "url(src/assets/image.png)",
        //backgroundSize: "cover",
        // backgroundPosition: "center",
        backgroundSize: "contain", // Ajusta la imagen para que quepa dentro sin recortarse
        // backgroundPosition: "center", // Centra la imagen
        //backgroundRepeat: "no-repeat", // Evita que la imagen se repita
      }}
    >
      <form
        //className=" relative col-start-2 bg-slate-400 rounded-xl mt-10 mb-64 shadow-2xl border-4 border-slate-500"
        className=" relative col-start-2 mt-10 mb-64"
        action=""
        onSubmit={onSubmit}
        style={{
          background: "linear-gradient(135deg, #2c3e50, #4ca1af, #bdc3c7)", // Gradiente elegante y sobrio
          borderRadius: "30px", // Bordes redondeados
          boxShadow: "0px 6px 20px rgba(0, 0, 0, 0.2)", // Sombra suave y definida
          border: "1px solid #34495e", // Borde oscuro para mayor elegancia
          padding: "20px", // Espacio interior
          maxWidth: "400px", // Tamaño similar a un celular
          margin: "auto", // Centrado en la pantalla
        }}
      >
        <div className=" inset-x-0 absolute bg-sky-900 rounded-lg h-12 top-[-1rem] mr-2 ml-2  font-bold text-center text-white  ">
          REGISTRO
        </div>
        <ul className="mt-8 ">
          <li className="mr-2 ml-2 block">
            <label className="" htmlFor="nombre">
              Nombre{" "}
            </label>
            <input
              className={estiloinput}
              type="text"
              placeholder="Juan"
              {...register("nombre", {
                required: {
                  value: true,
                  message: "nombre es requerido (debes ingresar tu nombre)",
                },
                minLength: {
                  value: 2,
                  message: "El nombre debe tener al menos dos caracteres",
                },
              })}
            />
            {errors.nombre && (
              <span className="block text-red-500 font-extrabold text-[0.625rem]">
                ⬆️ 👆{errors.nombre.message}👆 ⬆️
              </span>
            )}
          </li>
          <li className="mr-2 ml-2 block">
            <label className="" htmlFor="apellidos">
              Apellidos{" "}
            </label>
            <input
              className={estiloinput}
              type="text"
              placeholder="Perez Rojas"
              {...register("apellidos")}
            />
          </li>
          <li className=" mr-2 ml-2 ">
            <label className=" " htmlFor="correo">
              Correo
            </label>
            <input
              type="email"
              placeholder="usuario@123.com"
              className={estiloinput}
              {...register("correo", {
                required: {
                  value: true,
                  message: "El correo es requerido",
                },
                pattern: {
                  value: /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/,
                  message: "el correo no es valido",
                },
              })}
            />
            {errors.correo && (
              <span className="block text-red-500 font-extrabold text-[0.625rem]">
                ⬆️ 👆{errors.correo.message}👆 ⬆️
              </span>
            )}
          </li>
          <li className=" mr-2 ml-2 ">
            <label className=" " htmlFor="fechanacimineto">
              Fecha de nacimiento
            </label>
            <input
              type="date"
              placeholder=""
              className={estiloinput}
              {...register("fecha")}
            />
          </li>
          <li className="mr-2 ml-2 relative">
            <label htmlFor="password">contraseña</label>
            <input
              type={showPassword ? "text" : "password"} // Cambiar entre "text" y "password"
              className={estiloinput}
              {...register("contraseña", {
                required: {
                  value: true,
                  message: "la contraseña es requerida",
                },
                pattern: {
                  value:
                    /^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
                  message:
                    "La contraseña debe tener al menos 8 caracteres, incluyendo una mayúscula, un número y un carácter especial",
                },
              })}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute pb-2  rounded-lg bg-ye"
            >
              {showPassword ? "🐵" : "🙈"}
            </button>
            {errors.contraseña && (
              <span className="block text-red-500 font-extrabold text-[0.625rem]">
                ⬆️ 👆{errors.contraseña.message}👆 ⬆️
              </span>
            )}
          </li>
          <li className="mr-2 ml-2">
            <label htmlFor="ConfirmPassword">confirmar contraseña</label>
            <input
              type={showPassword1 ? "text" : "password"} // Cambiar entre "text" y "password"
              className={estiloinput}
              {...register("confirmarContraseña", {
                validate: (value) =>
                  value === watch("contraseña") ||
                  "las contraseñas no coinciden",
              })}
            />
            <button
              type="button"
              onClick={() => setShowPassword1(!showPassword1)}
              className="absolute pb-2  rounded-lg bg-ye"
            >
              {showPassword1 ? "🐵" : "🙈"}
            </button>
            {errors.confirmarContraseña && (
              <span className="block text-red-500 font-extrabold text-[0.625rem]">
                ⬆️ 👆{errors.confirmarContraseña.message}👆 ⬆️
              </span>
            )}
          </li>

          <li className="mr-2 ml-2">
            <label htmlFor="image">Añadir archivo</label>
            <input
              type="file"
              className={estiloinput}
              {...register("foto")}
              accept="image/*" // Asegura que solo se suban imágenes
              onChange={handleFileChange} // Añade el evento onChange para manejar la selección de archivo
            />
            {/*nombreImagen && (
              <p className="mt-2">Archivo seleccionado: {nombreImagen}</p>
            )*/}
          </li>
          {/* Vista previa de la imagen seleccionada */}
          <li className="mr-2 ml-2">
            {previewImage && (
              <img
                src={previewImage}
                alt="Imagen seleccionada"
                className="mt-4  h-32 w-full object-cover border-2 rounded-xl"
              />
            )}
          </li>
        </ul>
        <button className=" bg-green-900 rounded-lg mt-4 mx-auto block font-extrabold pr-4 pl-4 hover:bg-green-300  hover:text-gray-700">
          GUARDAR
        </button>
      </form>
    </div>
  );
}
