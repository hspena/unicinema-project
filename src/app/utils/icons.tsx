import React from 'react';
import {
  Film, Crown, Building2, User, Users,
  Flame, Waves, Rocket, Smile, Laugh, Eye, CloudFog, Mountain, Heart,
  Sparkles, Mic, Skull, Ghost, Swords, Drama, Clapperboard, Zap,
  Popcorn, CupSoda, GlassWater, Coffee, IceCream, Candy, Sandwich, Pizza,
  Gift, Droplet, Cookie, Beef, Drumstick, Salad, ShoppingBag,
  Tag, Tags, Star, Ticket, DollarSign, Calendar, Clock, MapPin, Folder,
  CheckCircle2, XCircle, CircleDot, Hourglass, AlertTriangle, CheckCircle,
  Search, X, Settings, Bell, Sun, Moon, Menu, Plus, Pencil, Trash2, Save,
  PartyPopper, ThumbsUp, Bot, Send, QrCode, ScanLine, Maximize, Undo2,
  RefreshCw, EyeOff, BarChart3, TrendingUp, TrendingDown, Armchair,
  LayoutGrid, ArrowLeft, ArrowRight, ArrowUp, Check,
  Pause, Play, Map, ToggleLeft, ToggleRight, PenLine,
  type LucideIcon,
} from 'lucide-react';

// ─── Shared icon picker library ───────────────────────────────────────────────
// Maps a stable string "key" (stored in place of an emoji glyph in Firebase) to
// a Lucide icon component. New genres/snacks/movies pick an icon from this set
// instead of typing a raw emoji.

export const ICON_LIBRARY: Record<string, LucideIcon> = {
  // Generic / movie
  film: Film, clapperboard: Clapperboard, star: Star, sparkles: Sparkles, zap: Zap,
  // Genre-flavoured
  flame: Flame, waves: Waves, rocket: Rocket, smile: Smile, laugh: Laugh,
  eye: Eye, 'cloud-fog': CloudFog, mountain: Mountain, heart: Heart,
  mic: Mic, skull: Skull, ghost: Ghost, swords: Swords, drama: Drama,
  // Snacks
  popcorn: Popcorn, 'cup-soda': CupSoda, 'glass-water': GlassWater, coffee: Coffee,
  'ice-cream': IceCream, candy: Candy, sandwich: Sandwich, pizza: Pizza,
  gift: Gift, droplet: Droplet, cookie: Cookie, beef: Beef, drumstick: Drumstick,
  salad: Salad, 'shopping-bag': ShoppingBag,
};

export const GENRE_ICON_KEYS = [
  'flame', 'waves', 'rocket', 'smile', 'laugh', 'eye', 'cloud-fog', 'mountain',
  'heart', 'sparkles', 'mic', 'skull', 'ghost', 'swords', 'drama', 'zap',
  'clapperboard', 'film', 'star',
];

export const SNACK_ICON_KEYS = [
  'popcorn', 'cup-soda', 'glass-water', 'coffee', 'ice-cream', 'candy',
  'sandwich', 'pizza', 'gift', 'droplet', 'cookie', 'beef', 'drumstick',
  'salad', 'shopping-bag',
];

const FALLBACK_ICON: LucideIcon = Film;

/** Resolve a stored icon key (or legacy emoji glyph) to a Lucide component. */
export const resolveIcon = (key?: string): LucideIcon =>
  (key && ICON_LIBRARY[key]) || FALLBACK_ICON;

/** Render an icon from a stored key, falling back gracefully for legacy emoji data. */
export const IconGlyph = ({ iconKey, size = 20, ...rest }: { iconKey?: string; size?: number } & React.SVGProps<SVGSVGElement>) => {
  const Icon = resolveIcon(iconKey);
  return <Icon size={size} {...(rest as any)} />;
};

// ─── Role icons ───────────────────────────────────────────────────────────────

export const ROLE_ICON_COMPONENTS: Record<string, LucideIcon> = {
  Admin: Crown,
  'Cinema Room': Building2,
  Staff: User,
  Moviegoer: Film,
};

// ─── Re-export common Lucide icons used throughout the app ───────────────────
export {
  Film, Crown, Building2, User, Users,
  Flame, Waves, Rocket, Smile, Laugh, Eye, CloudFog, Mountain, Heart,
  Sparkles, Mic, Skull, Ghost, Swords, Drama, Clapperboard, Zap,
  Popcorn, CupSoda, GlassWater, Coffee, IceCream, Candy, Sandwich, Pizza,
  Gift, Droplet, Cookie, Beef, Drumstick, Salad, ShoppingBag,
  Tag, Tags, Star, Ticket, DollarSign, Calendar, Clock, MapPin, Folder,
  CheckCircle2, XCircle, CircleDot, Hourglass, AlertTriangle, CheckCircle,
  Search, X, Settings, Bell, Sun, Moon, Menu, Plus, Pencil, Trash2, Save,
  PartyPopper, ThumbsUp, Bot, Send, QrCode, ScanLine, Maximize, Undo2,
  RefreshCw, EyeOff, BarChart3, TrendingUp, TrendingDown, Armchair,
  LayoutGrid, ArrowLeft, ArrowRight, ArrowUp, Check,
  Pause, Play, Map, ToggleLeft, ToggleRight, PenLine,
};
export type { LucideIcon };
