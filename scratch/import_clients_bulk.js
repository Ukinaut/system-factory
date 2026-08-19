const { PrismaClient } = require("@prisma/client");
const fs = require("fs");
const path = require("path");

const prisma = new PrismaClient();

async function main() {
  console.log("Iniciando importación y reestructuración de clientes desde Clientes.csv...");

  const csvPath = path.join(process.cwd(), "Borrar", "Clientes.csv");
  if (!fs.existsSync(csvPath)) {
    console.error("El archivo Clientes.csv no existe en la carpeta Borrar.");
    process.exit(1);
  }

  const content = fs.readFileSync(csvPath, "latin1");
  const lines = content.split(/\r?\n/).filter((l) => l.trim().length > 0);

  if (lines.length <= 1) {
    console.log("El archivo CSV está vacío.");
    return;
  }

  // Descartar la fila de encabezado
  const dataLines = lines.slice(1);
  console.log(`Registros a procesar: ${dataLines.length}`);

  let createdCount = 0;
  let updatedCount = 0;

  for (let i = 0; i < dataLines.length; i++) {
    const cols = dataLines[i].split(";").map((c) => c.trim());
    if (!cols || cols.length < 3) continue;

    const csvId = cols[0];
    const razonSocial = cols[2] || "Cliente sin nombre";
    const tipoIdentificacion = cols[3] || null;
    let numeroId = cols[4] || null;
    const condicionIva = cols[5] || null;
    const correo = cols[6] ? cols[6].toLowerCase() : null;
    const emailsAdicionales = cols[7] || null;
    const telefono = cols[8] || null;
    const pais = cols[9] || "Argentina";
    const provincia = cols[10] || null;
    const localidad = cols[11] || null;
    const codigoPostal = cols[12] || null;
    const direccion = cols[13] || null;
    const pedidosCount = parseInt(cols[14] || "0", 10) || 0;

    // Parsear gasto total ($ 241,998.79 -> 241998.79)
    let gastoTotal = 0;
    if (cols[15]) {
      const cleanGasto = cols[15].replace("$", "").replace(/\./g, "").replace(",", ".").trim();
      gastoTotal = parseFloat(cleanGasto) || 0;
    }

    const clienteActivoStr = (cols[18] || "Si").toLowerCase();
    const activo = clienteActivoStr === "si" || clienteActivoStr === "true";
    const codigoCliente = cols[20] || csvId || null;
    const cuentaContable = cols[21] || null;
    const origen = cols[28] || "CSV";

    // Si no tiene número de ID/CUIT, asignar un CUIT ficticio o basado en ID para mantener unicidad si aplica
    const cuitFinal = numeroId || (correo ? `MAIL-${correo}` : `CLI-${csvId}`);

    // Intentar buscar cliente existente por CUIT, Correo o Código Cliente
    let existingClient = null;
    if (numeroId) {
      existingClient = await prisma.client.findFirst({ where: { cuit: numeroId } });
    }
    if (!existingClient && correo) {
      existingClient = await prisma.client.findFirst({ where: { correo } });
    }

    const clientData = {
      cuit: cuitFinal,
      razonSocial,
      tipoIdentificacion,
      condicionIva,
      telefono,
      correo,
      emailsAdicionales,
      pais,
      provincia,
      localidad,
      codigoPostal,
      direccion,
      codigoCliente,
      cuentaContable,
      origen,
      gastoTotal,
      pedidosCount,
      activo,
    };

    if (existingClient) {
      await prisma.client.update({
        where: { id: existingClient.id },
        data: clientData,
      });
      updatedCount++;
    } else {
      await prisma.client.create({
        data: clientData,
      });
      createdCount++;
    }

    if ((i + 1) % 500 === 0 || i === dataLines.length - 1) {
      console.log(`Procesados ${i + 1} / ${dataLines.length} clientes... (Creados: ${createdCount}, Actualizados: ${updatedCount})`);
    }
  }

  console.log(`\n✅ Proceso finalizado con éxito!`);
  console.log(`Clientes Nuevos Creados: ${createdCount}`);
  console.log(`Clientes Actualizados: ${updatedCount}`);
  console.log(`Total Clientes en Base de Datos: ${await prisma.client.count()}`);
}

main()
  .catch((e) => {
    console.error("Error importando clientes:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
