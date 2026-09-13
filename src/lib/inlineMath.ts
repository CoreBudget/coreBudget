export function evaluateInlineMath(input: string): number | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  if (!/^[0-9+\-*/().\s]+$/.test(trimmed)) return null;

  let pos = 0;

  function peek(): string | undefined {
    return trimmed[pos];
  }

  function parseExpression(): number {
    let value = parseTerm();
    for (;;) {
      const op = peek();
      if (op === "+" || op === "-") {
        pos++;
        const rhs = parseTerm();
        value = op === "+" ? value + rhs : value - rhs;
      } else {
        break;
      }
    }
    return value;
  }

  function parseTerm(): number {
    let value = parseFactor();
    for (;;) {
      const op = peek();
      if (op === "*" || op === "/") {
        pos++;
        const rhs = parseFactor();
        value = op === "*" ? value * rhs : value / rhs;
      } else {
        break;
      }
    }
    return value;
  }

  function parseFactor(): number {
    while (peek() === " ") pos++;
    if (peek() === "-") {
      pos++;
      return -parseFactor();
    }
    if (peek() === "+") {
      pos++;
      return parseFactor();
    }
    if (peek() === "(") {
      pos++;
      const value = parseExpression();
      while (peek() === " ") pos++;
      if (peek() !== ")") throw new Error("Expected )");
      pos++;
      return value;
    }
    const start = pos;
    while (peek() !== undefined && /[0-9.]/.test(peek()!)) pos++;
    if (pos === start) throw new Error("Expected number");
    const num = Number(trimmed.slice(start, pos));
    if (Number.isNaN(num)) throw new Error("Invalid number");
    while (peek() === " ") pos++;
    return num;
  }

  try {
    const result = parseExpression();
    while (peek() === " ") pos++;
    if (pos !== trimmed.length) return null;
    return Number.isFinite(result) ? Math.round(result * 100) / 100 : null;
  } catch {
    return null;
  }
}
