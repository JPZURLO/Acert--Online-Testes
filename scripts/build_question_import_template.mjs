import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = process.env.PROJECT_ROOT || path.resolve(scriptDirectory, "..");
const outputPath = path.join(projectRoot, "front-end", "assets", "templates", "modelo-importacao-questoes.xlsx");
const previewPath = path.join(projectRoot, "outputs", "question-import-template-preview.png");

const workbook = Workbook.create();
const questions = workbook.worksheets.add("Questões");
const instructions = workbook.worksheets.add("Instruções");
const examples = workbook.worksheets.add("Exemplos");

const headers = [
  "Tipo", "Enunciado", "Pontos", "Obrigatória", "Alternativa A", "Alternativa B",
  "Alternativa C", "Alternativa D", "Alternativa E", "Alternativa F", "Alternativa G",
  "Alternativa H", "Alternativa I", "Alternativa J", "Resposta correta",
];

questions.showGridLines = false;
questions.getRange("A1:O1").merge();
questions.getRange("A1").values = [["MODELO DE IMPORTAÇÃO DE QUESTÕES"]];
questions.getRange("A1:O1").format = {
  fill: "#0F6F73",
  font: { bold: true, color: "#FFFFFF", size: 16 },
  horizontalAlignment: "center",
  verticalAlignment: "center",
};
questions.getRange("A1:O1").format.rowHeight = 34;
questions.getRange("A2:O2").merge();
questions.getRange("A2").values = [["Preencha uma linha por questão. Não altere os nomes das colunas. Consulte as abas Instruções e Exemplos."]];
questions.getRange("A2:O2").format = {
  fill: "#E8F3F3",
  font: { color: "#46515B", italic: true },
  horizontalAlignment: "left",
  verticalAlignment: "center",
};
questions.getRange("A2:O2").format.rowHeight = 27;
questions.getRange("A4:O4").values = [headers];
questions.getRange("A4:O4").format = {
  fill: "#46515B",
  font: { bold: true, color: "#FFFFFF" },
  horizontalAlignment: "center",
  verticalAlignment: "center",
  wrapText: true,
  borders: { preset: "outside", style: "thin", color: "#33404B" },
};
questions.getRange("A4:O4").format.rowHeight = 32;
questions.getRange("A5:O204").format = {
  font: { color: "#26323C" },
  verticalAlignment: "top",
  wrapText: true,
  borders: { preset: "inside", style: "thin", color: "#E0E6EA" },
};
questions.getRange("A5:A204").dataValidation = {
  rule: { type: "list", values: ["Múltipla escolha", "Verdadeiro ou falso", "Dissertativa"] },
};
questions.getRange("D5:D204").dataValidation = {
  rule: { type: "list", values: ["Sim", "Não"] },
};
questions.getRange("C5:C204").dataValidation = {
  rule: { type: "whole", operator: "between", formula1: 0, formula2: 1000 },
};
questions.getRange("A5:A204").format.fill = "#F5FAFA";
questions.getRange("C5:D204").format.fill = "#F8FAFC";
questions.getRange("O5:O204").format.fill = "#FFF8E8";
questions.getRange("C5:C204").format.numberFormat = "0";
questions.getRange("A:A").format.columnWidth = 22;
questions.getRange("B:B").format.columnWidth = 48;
questions.getRange("C:C").format.columnWidth = 10;
questions.getRange("D:D").format.columnWidth = 13;
questions.getRange("E:N").format.columnWidth = 24;
questions.getRange("O:O").format.columnWidth = 26;
questions.freezePanes.freezeRows(4);
questions.getRange("A4:O204").format.autofitRows();

instructions.showGridLines = false;
instructions.getRange("A1:F1").merge();
instructions.getRange("A1").values = [["COMO PREENCHER O MODELO"]];
instructions.getRange("A1:F1").format = {
  fill: "#0F6F73", font: { bold: true, color: "#FFFFFF", size: 16 },
  horizontalAlignment: "center", verticalAlignment: "center",
};
instructions.getRange("A1:F1").format.rowHeight = 34;
instructions.getRange("A3:F9").values = [
  ["Campo", "Obrigatório", "Múltipla escolha", "Verdadeiro ou falso", "Dissertativa", "Regra"],
  ["Tipo", "Sim", "Múltipla escolha", "Verdadeiro ou falso", "Dissertativa", "Selecione uma das três opções."],
  ["Enunciado", "Sim", "Texto da pergunta", "Texto da afirmação", "Texto da pergunta", "Até 3.000 caracteres."],
  ["Pontos", "Não", "Número de 0 a 1000", "Número de 0 a 1000", "Número de 0 a 1000", "Se vazio, o sistema usa 10 pontos."],
  ["Obrigatória", "Não", "Sim ou Não", "Sim ou Não", "Sim ou Não", "Se vazio, o sistema considera Sim."],
  ["Alternativas", "Sim", "Preencha ao menos A e B", "Não preencher", "Não preencher", "São aceitas até dez alternativas."],
  ["Resposta correta", "Sim*", "Texto exato ou letra da alternativa", "Verdadeiro ou Falso", "Opcional", "*Obrigatória nas questões objetivas."],
];
instructions.getRange("A3:F3").format = {
  fill: "#46515B", font: { bold: true, color: "#FFFFFF" },
  horizontalAlignment: "center", verticalAlignment: "center", wrapText: true,
};
instructions.getRange("A4:F9").format = {
  wrapText: true, verticalAlignment: "top",
  borders: { preset: "inside", style: "thin", color: "#DDE4E8" },
};
instructions.getRange("A4:A9").format.font = { bold: true, color: "#0F6F73" };
instructions.getRange("A11:F11").merge();
instructions.getRange("A11").values = [["IMPORTANTE: não renomeie a aba Questões nem altere os títulos das colunas. Salve o arquivo no formato .xlsx antes de importar."]];
instructions.getRange("A11:F11").format = {
  fill: "#FFF4D6", font: { bold: true, color: "#6B5318" }, wrapText: true,
  verticalAlignment: "center",
};
instructions.getRange("A11:F11").format.rowHeight = 42;
instructions.getRange("A:A").format.columnWidth = 24;
instructions.getRange("B:B").format.columnWidth = 14;
instructions.getRange("C:E").format.columnWidth = 25;
instructions.getRange("F:F").format.columnWidth = 42;
instructions.getRange("A3:F9").format.autofitRows();
instructions.freezePanes.freezeRows(3);

examples.showGridLines = false;
examples.getRange("A1:O1").merge();
examples.getRange("A1").values = [["EXEMPLOS — NÃO SÃO IMPORTADOS"]];
examples.getRange("A1:O1").format = {
  fill: "#0F6F73", font: { bold: true, color: "#FFFFFF", size: 16 },
  horizontalAlignment: "center", verticalAlignment: "center",
};
examples.getRange("A1:O1").format.rowHeight = 34;
examples.getRange("A3:O3").values = [headers];
examples.getRange("A4:O6").values = [
  ["Múltipla escolha", "Qual alternativa representa uma comunicação clara?", 20, "Sim", "Mensagem objetiva", "Uso excessivo de termos técnicos", "Ausência de retorno", "", "", "", "", "", "", "", "A"],
  ["Verdadeiro ou falso", "O feedback deve ser específico e respeitoso.", 10, "Sim", "", "", "", "", "", "", "", "", "", "", "Verdadeiro"],
  ["Dissertativa", "Descreva como você resolveria um conflito de equipe.", 30, "Não", "", "", "", "", "", "", "", "", "", "", ""],
];
examples.getRange("A3:O3").format = {
  fill: "#46515B", font: { bold: true, color: "#FFFFFF" },
  horizontalAlignment: "center", verticalAlignment: "center", wrapText: true,
};
examples.getRange("A4:O6").format = {
  wrapText: true, verticalAlignment: "top",
  borders: { preset: "inside", style: "thin", color: "#DDE4E8" },
};
examples.getRange("A:A").format.columnWidth = 22;
examples.getRange("B:B").format.columnWidth = 48;
examples.getRange("C:C").format.columnWidth = 10;
examples.getRange("D:D").format.columnWidth = 13;
examples.getRange("E:N").format.columnWidth = 24;
examples.getRange("O:O").format.columnWidth = 26;
examples.getRange("A3:O6").format.autofitRows();
examples.freezePanes.freezeRows(3);

const inspection = await workbook.inspect({
  kind: "table",
  range: "Questões!A1:O8",
  include: "values,formulas",
  tableMaxRows: 8,
  tableMaxCols: 15,
});
console.log(inspection.ndjson);

const errors = await workbook.inspect({
  kind: "match",
  searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A",
  options: { useRegex: true, maxResults: 100 },
  summary: "final formula error scan",
});
console.log(errors.ndjson);

await fs.mkdir(path.dirname(outputPath), { recursive: true });
await fs.mkdir(path.dirname(previewPath), { recursive: true });
const preview = await workbook.render({ sheetName: "Questões", range: "A1:O12", scale: 1, format: "png" });
await fs.writeFile(previewPath, new Uint8Array(await preview.arrayBuffer()));
const output = await SpreadsheetFile.exportXlsx(workbook);
await output.save(outputPath);
console.log(outputPath);
