import express, { Express, Request, Response } from "express";
import dotenv from "dotenv";

interface Body {
  readonly prog: string;
}

dotenv.config();

const app: Express = express();
const port = process.env.PORT;

// Regex que reconhece funcao em javascript do tipo `function func(var1, var2)`
// GRUPO 1: fname - nome da função
// GRUPO 2: params - parametros separados por , (OPCIONAL)
const func_regex =
  /^\s*(?:(?:function)\s+)(?<fname>\w+)(?:\s*\()(?<params>(?:\s*\w+,?)*)\)/;
// Regex que reconhece criacao de variavel com valor em javascript do tipo `let|var var_name = value|'string'|"string"|[array]`
// GRUPO 1: vname - nome da variável
// GRUPO 2: value - valor (OBS: arrays virão inteiras([1,2,3]))
const var_assign_regex =
  /^(?:let|var){1}\s+(?<vname>\w+)\s*=\s*(?<value>\w+|'\w+'|"\w+"|\[(?:\s*\w+\s*,?)*\])/;
// Regex que reconhece declaração de variavel javascript do tipo `let|var var_name;`
// GRUPO 1: vname - nome da variável
const var_decl = /^(?:let|var){1}\s+(?<vname>\w+);/;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.post("/prog_o", (req: Request, res: Response) => {
  const body: Body = req.body || "no data";
  const vars_map = fill_map(body.prog);
  console.log(vars_map);
  res.send("Parsed program O");
});

app.post("/prog_p", (req: Request, res: Response) => {
  const body: Body = req.body || "no data";
  const vars_map = fill_map(body.prog);
  console.log(vars_map);
  res.send("Parsed program P");
});

app.listen(port, () => {
  console.log(`⚡️[server]: Server is running at https://localhost:${port}`);
});

function fill_map(prog: string): Map<string, number> {
  const vars_map = new Map<string, number>();
  const lines = prog.split("\n");

  for (const line of lines) {
    const func_match = func_regex.exec(line);
    if (func_match) {
      const fname = func_match.groups?.fname ?? "";
      let total = 0;
      // Calcula valor do nome da funcao como a soma dos caracteres que o compoe
      for (const char of fname) {
        total += char.charCodeAt(0);
      }
      vars_map.set(fname, total);

      const params =
        func_match.groups?.params?.split(",").map((p) => p.trim()) ?? [];
      for (const param of params) {
        total = 0;
        // Calcula valor do nome dos parametros como a soma dos caracteres que os compoe
        for (const char of param) {
          total += char.charCodeAt(0);
        }
        vars_map.set(param, total);
      }
    }

    const assign_match = var_assign_regex.exec(line);
    if (assign_match) {
      const vname = assign_match.groups?.vname ?? "";

      let value = assign_match.groups?.value ?? "";
      let total = 0;
      if (value.startsWith("[")) {
        // Array
        // Remove [ e ]
        value = value.slice(1, -1);
        // Separa os valores
        const values = value.split(",").map((v) => v.trim());
        for (const v of values) {
          const type = typeof v.toLowerCase();
          // Se for string, soma os caracteres
          if (type === "string") {
            for (const char of v) {
              total += char.charCodeAt(0);
            }
            // Se for numero, soma o valor
          } else if (type === "number") {
            total += Number(v);
          }
        }
      } else if (value.startsWith("'")) {
        // String
        // Remove ' e '
        value = value.slice(1, -1);
        // Soma os caracteres
        for (const char of value) {
          total += char.charCodeAt(0);
        }
      } else if (value.startsWith('"')) {
        // String
        // Remove " e "
        value = value.slice(1, -1);
        // Soma os caracteres
        for (const char of value) {
          total += char.charCodeAt(0);
        }
      } else if (!isNaN(Number(value))) {
        // Numero
        total = Number(value);
      }
      vars_map.set(vname, total);
    }

    const decl_match = var_decl.exec(line);
    if (decl_match) {
      const vname = decl_match.groups?.vname ?? "";
      let total = 0;
      for (const char of vname) {
        total += char.charCodeAt(0);
      }
      vars_map.set(vname, total);
    }
  }
  return vars_map;
}
