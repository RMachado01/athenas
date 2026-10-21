import { notFound } from "next/navigation";
import { LaboratorioPixel } from "@/features/pixel/components/laboratorio-pixel";

export const metadata = { title: "Arte pixel (laboratório)" };

/** Laboratório: todos os sprites e quadros numa página, para revisar o desenho. Só em dev. */
export default function PaginaLaboratorioPixel() {
  if (process.env.NODE_ENV === "production") notFound();
  return <LaboratorioPixel />;
}
