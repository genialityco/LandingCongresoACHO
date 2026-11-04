import type { ReactNode, SVGProps } from "react";
import {
  ArrowRight, ArrowUpRight, Award, BarChart3, BookOpen, Briefcase, Calendar, Check, CheckCircle2, ChevronDown,
  Clock, Cloud, Code, CreditCard, Download, Gift, Globe, GraduationCap, Heart, Layers,
  Lightbulb, Lock, Mail, MapPin, Megaphone, MessageCircle, Mic, Phone, Play, Rocket, Search, Settings,
  Shield, ShoppingCart, Sparkles, Star, Target, ThumbsUp, Ticket, TrendingUp, Trophy, Users, Video, Zap,
  type LucideIcon,
} from "lucide-react";

type BrandProps = SVGProps<SVGSVGElement> & { size?: number | string };
function brand(paths: ReactNode) {
  const C = ({ size = 24, strokeWidth: _s, ...rest }: BrandProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" {...rest}>
      {paths}
    </svg>
  );
  return C as unknown as LucideIcon;
}
const Facebook = brand(<path d="M15 3h-2.5A3.5 3.5 0 0 0 9 6.5V9H6.5v3.5H9V21h3.5v-8.5H15l.5-3.5h-3V7a1 1 0 0 1 1-1H15z" />);
const Instagram = brand(<><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r=".6" fill="currentColor" /></>);
const Linkedin = brand(<><rect x="3" y="3" width="18" height="18" rx="3" /><path d="M8 10.5V16M8 7.5v.01M12 16v-5.5M12 13a2.5 2.5 0 0 1 5 0v3" /></>);
const Youtube = brand(<><rect x="2.5" y="5.5" width="19" height="13" rx="4" /><path d="m10 9.5 4.5 2.5-4.5 2.5z" fill="currentColor" /></>);
const XBrand = brand(<path d="M4 4l16 16M20 4 4 20" />);

/** Catálogo curado de iconos (evita empaquetar toda la librería). */
export const ICONS: Record<string, LucideIcon> = {
  "arrow-right": ArrowRight, "arrow-up-right": ArrowUpRight, award: Award, chart: BarChart3, book: BookOpen,
  briefcase: Briefcase, calendar: Calendar, check: Check, "check-circle": CheckCircle2, "chevron-down": ChevronDown,
  clock: Clock, cloud: Cloud, code: Code, card: CreditCard, download: Download, facebook: Facebook, gift: Gift,
  globe: Globe, graduation: GraduationCap, heart: Heart, instagram: Instagram, layers: Layers, lightbulb: Lightbulb,
  linkedin: Linkedin, lock: Lock, mail: Mail, "map-pin": MapPin, megaphone: Megaphone, message: MessageCircle,
  mic: Mic, phone: Phone, play: Play, rocket: Rocket, search: Search, settings: Settings, shield: Shield,
  cart: ShoppingCart, sparkles: Sparkles, star: Star, target: Target, "thumbs-up": ThumbsUp, ticket: Ticket,
  trending: TrendingUp, trophy: Trophy, users: Users, video: Video, youtube: Youtube, x: XBrand, zap: Zap,
};

export const ICON_OPTIONS = [{ label: "Sin icono", value: "" }, ...Object.keys(ICONS).map((k) => ({ label: k, value: k }))];

export function Icon({ name, size = 20, className, strokeWidth }: { name?: string; size?: number; className?: string; strokeWidth?: number }) {
  const C = name ? ICONS[name] : undefined;
  if (!C) return null;
  return <C size={size} className={className} strokeWidth={strokeWidth} aria-hidden />;
}
