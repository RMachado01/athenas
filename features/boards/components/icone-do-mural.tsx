import {
  BookOpen,
  Brain,
  Calendar,
  Code,
  FlaskConical,
  GraduationCap,
  Languages,
  LayoutDashboard,
  Lightbulb,
  Target,
  type LucideIcon,
} from "lucide-react";
import type { IconeDoMural } from "../cores";

/** Ícones do mural (import estático: só estes 10 entram no pacote). */
export const COMPONENTE_DO_ICONE: Record<IconeDoMural, LucideIcon> = {
  "layout-dashboard": LayoutDashboard,
  brain: Brain,
  "book-open": BookOpen,
  lightbulb: Lightbulb,
  target: Target,
  calendar: Calendar,
  "flask-conical": FlaskConical,
  code: Code,
  languages: Languages,
  "graduation-cap": GraduationCap,
};

export function IconeDoMural({ icone, className }: { icone: IconeDoMural; className?: string }) {
  const Icone = COMPONENTE_DO_ICONE[icone];
  return <Icone className={className} aria-hidden />;
}
