const fs = require("fs");
const path = require("path");

const csvPath = path.join(process.cwd(), "Borrar", "Clientes.csv");
const content = fs.readFileSync(csvPath, "utf8");

// Split by newlines, handling quotes if any
const lines = content.split("\n").filter((l) => l.trim().length > 0);
const headers = lines[0].split(";").map((h) => h.trim());

console.log("Total Headers:", headers.length);
headers.forEach((h, idx) => console.log(`${idx}: ${h}`));

console.log("\n--- PRIMERAS 5 FILAS ---");
for (let i = 1; i <= 5; i++) {
  const cols = lines[i].split(";");
  console.log({
    id: cols[0],
    fechaUltima: cols[1],
    razonSocial: cols[2],
    tipoId: cols[3],
    numeroId: cols[4],
    condicionIva: cols[5],
    email: cols[6],
    telefono: cols[8],
    pais: cols[9],
    provincia: cols[10],
    localidad: cols[11],
    codigoPostal: cols[12],
    domicilio: cols[13],
    pedidos: cols[14],
    gastoTotal: cols[15],
  });
}
