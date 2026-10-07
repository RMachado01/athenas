/**
 * Pacotes de trilhas do onboarding. Cada pessoa estuda uma coisa diferente (dados, ENEM,
 * concursos, idiomas…), então o app NÃO cria trilhas por padrão: a pessoa escolhe um pacote
 * (ou começa em branco). As trilhas criadas são dela e podem ser renomeadas/arquivadas depois.
 *
 * Monograma = 1 a 3 letras que aparecem no círculo da trilha (em Cormorant).
 */

export interface TrilhaDePacote {
  nome: string;
  monograma: string;
}

export interface PacoteDeTrilhas {
  id: string;
  nome: string;
  descricao: string;
  trilhas: TrilhaDePacote[];
}

export const PACOTES_DE_TRILHAS: PacoteDeTrilhas[] = [
  {
    id: "dados",
    nome: "Dados e BI",
    descricao: "SQL, Power BI, Python, Git + dbt, Azure e Inglês.",
    trilhas: [
      { nome: "SQL", monograma: "S" },
      { nome: "Power BI", monograma: "P" },
      { nome: "Python", monograma: "Py" },
      { nome: "Git + dbt", monograma: "G" },
      { nome: "Azure", monograma: "A" },
      { nome: "Inglês", monograma: "I" },
    ],
  },
  {
    id: "enem",
    nome: "ENEM",
    descricao: "As quatro áreas do conhecimento e a Redação.",
    trilhas: [
      { nome: "Matemática", monograma: "M" },
      { nome: "Linguagens", monograma: "L" },
      { nome: "Ciências da Natureza", monograma: "CN" },
      { nome: "Ciências Humanas", monograma: "CH" },
      { nome: "Redação", monograma: "R" },
    ],
  },
  {
    id: "concursos",
    nome: "Concursos",
    descricao: "Português, Raciocínio Lógico, Direito e Informática.",
    trilhas: [
      { nome: "Português", monograma: "P" },
      { nome: "Raciocínio Lógico", monograma: "RL" },
      { nome: "Direito Constitucional", monograma: "DC" },
      { nome: "Direito Administrativo", monograma: "DA" },
      { nome: "Informática", monograma: "I" },
    ],
  },
  {
    id: "idiomas",
    nome: "Idiomas",
    descricao: "Inglês, Espanhol, gramática, vocabulário e conversação.",
    trilhas: [
      { nome: "Inglês", monograma: "En" },
      { nome: "Espanhol", monograma: "Es" },
      { nome: "Gramática", monograma: "G" },
      { nome: "Vocabulário", monograma: "V" },
      { nome: "Conversação", monograma: "C" },
    ],
  },
  {
    id: "em-branco",
    nome: "Em branco",
    descricao: "Comece sem trilhas e crie as suas.",
    trilhas: [],
  },
];

/** Remove acento e caixa: base para comparar o "#trilha" digitado com o nome da trilha. */
export function dobrarTexto(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

/**
 * Acha a trilha que a pessoa quis dizer com "#sql" / "#power-bi": primeiro igualdade exata
 * (sem acento/caixa), depois "começa com". Devolve undefined se não houver (a tela avisa).
 */
export function acharTrilhaPorNome<T extends { name: string }>(
  trilhas: readonly T[],
  consulta: string,
): T | undefined {
  const alvo = dobrarTexto(consulta);
  if (!alvo) return undefined;
  const exata = trilhas.find((t) => dobrarTexto(t.name) === alvo);
  if (exata) return exata;
  const comecaCom = trilhas.filter((t) => dobrarTexto(t.name).startsWith(alvo));
  // Só aceita se for inequívoco (evita "#p" cair em "Power BI" quando também existe "Python").
  return comecaCom.length === 1 ? comecaCom[0] : undefined;
}
