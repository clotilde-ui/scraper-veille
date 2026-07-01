// Boolean query parser & evaluator
// Supports: AND, OR, NOT, parentheses, quoted phrases
// Example: travaux AND (mairie OR commune) NOT archive

// Normalise les variantes typographiques d'apostrophes vers l'apostrophe droite,
// pour que "château d'eau" (requête) matche "château d'eau" (page web) et
// inversement. Remplacement 1 pour 1 : les positions de caractères sont
// préservées (indispensable pour retrouver le contexte au bon endroit).
export function normalizeApostrophes(s: string): string {
  return s.replace(/[‘’ʼ′`´]/g, "'");
}

type Token =
  | { type: 'WORD'; value: string }
  | { type: 'AND' }
  | { type: 'OR' }
  | { type: 'NOT' }
  | { type: 'LPAREN' }
  | { type: 'RPAREN' }
  | { type: 'EOF' };

function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < input.length) {
    if (/\s/.test(input[i])) { i++; continue; }
    if (input[i] === '(') { tokens.push({ type: 'LPAREN' }); i++; continue; }
    if (input[i] === ')') { tokens.push({ type: 'RPAREN' }); i++; continue; }
    if (input[i] === '"') {
      let word = '';
      i++;
      while (i < input.length && input[i] !== '"') word += input[i++];
      i++;
      tokens.push({ type: 'WORD', value: word });
      continue;
    }
    let word = '';
    while (i < input.length && !/[\s()]/.test(input[i])) word += input[i++];
    const upper = word.toUpperCase();
    if (upper === 'AND') tokens.push({ type: 'AND' });
    else if (upper === 'OR') tokens.push({ type: 'OR' });
    else if (upper === 'NOT') tokens.push({ type: 'NOT' });
    else tokens.push({ type: 'WORD', value: word });
  }
  tokens.push({ type: 'EOF' });
  return tokens;
}

// Grammar:
//   expr   := term (OR term)*
//   term   := factor (AND? factor)*   -- implicit AND between adjacent words
//   factor := NOT factor | '(' expr ')' | WORD

class Parser {
  private tokens: Token[];
  private pos = 0;

  constructor(tokens: Token[]) { this.tokens = tokens; }

  private peek(): Token { return this.tokens[this.pos]; }
  private consume(): Token { return this.tokens[this.pos++]; }

  parse(): (text: string) => boolean {
    const fn = this.parseExpr();
    return fn;
  }

  private parseExpr(): (text: string) => boolean {
    let left = this.parseTerm();
    while (this.peek().type === 'OR') {
      this.consume();
      const right = this.parseTerm();
      const l = left, r = right;
      left = (text) => l(text) || r(text);
    }
    return left;
  }

  private parseTerm(): (text: string) => boolean {
    let left = this.parseFactor();
    while (
      this.peek().type === 'AND' ||
      this.peek().type === 'WORD' ||
      this.peek().type === 'NOT' ||
      this.peek().type === 'LPAREN'
    ) {
      if (this.peek().type === 'AND') this.consume();
      const right = this.parseFactor();
      const l = left, r = right;
      left = (text) => l(text) && r(text);
    }
    return left;
  }

  private parseFactor(): (text: string) => boolean {
    const token = this.peek();
    if (token.type === 'NOT') {
      this.consume();
      const operand = this.parseFactor();
      return (text) => !operand(text);
    }
    if (token.type === 'LPAREN') {
      this.consume();
      const fn = this.parseExpr();
      if (this.peek().type === 'RPAREN') this.consume();
      return fn;
    }
    if (token.type === 'WORD') {
      this.consume();
      const word = normalizeApostrophes(token.value.toLowerCase());
      return (text) => normalizeApostrophes(text.toLowerCase()).includes(word);
    }
    return () => false;
  }
}

export function compileBooleanQuery(query: string): (text: string) => boolean {
  try {
    const tokens = tokenize(query.trim());
    const parser = new Parser(tokens);
    return parser.parse();
  } catch {
    // Fallback: simple substring match
    const q = normalizeApostrophes(query.toLowerCase());
    return (text) => normalizeApostrophes(text.toLowerCase()).includes(q);
  }
}

export function isBooleanQuery(query: string): boolean {
  return /\b(AND|OR|NOT)\b|\(|\)/.test(query);
}

// Extract all literal terms from a boolean expression (for context highlighting)
export function extractTerms(query: string): string[] {
  const tokens = tokenize(query.trim());
  return tokens
    .filter((t): t is { type: 'WORD'; value: string } => t.type === 'WORD')
    .map(t => t.value);
}
