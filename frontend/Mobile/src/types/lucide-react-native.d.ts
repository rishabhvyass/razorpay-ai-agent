import React from 'react';
import { SvgProps } from 'react-native-svg';

declare module 'lucide-react-native' {
  export interface IconProps extends SvgProps {
    size?: number | string;
    color?: string;
    strokeWidth?: number | string;
  }

  export type Icon = React.FC<IconProps>;

  export const Activity: Icon;
  export const AlertCircle: Icon;
  export const AlertTriangle: Icon;
  export const ArrowDown: Icon;
  export const ArrowLeft: Icon;
  export const ArrowRight: Icon;
  export const ArrowUp: Icon;
  export const Bot: Icon;
  export const Check: Icon;
  export const CheckCheck: Icon;
  export const CheckCircle: Icon;
  export const CheckCircle2: Icon;
  export const ChevronDown: Icon;
  export const ChevronLeft: Icon;
  export const ChevronRight: Icon;
  export const ChevronUp: Icon;
  export const CircleDot: Icon;
  export const CircleHelp: Icon;
  export const Clock: Icon;
  export const Compass: Icon;
  export const CreditCard: Icon;
  export const ExternalLink: Icon;
  export const Globe: Icon;
  export const HelpCircle: Icon;
  export const List: Icon;
  export const Lock: Icon;
  export const Menu: Icon;
  export const MessageSquare: Icon;
  export const Mic: Icon;
  export const Minus: Icon;
  export const MoreVertical: Icon;
  export const PackageOpen: Icon;
  export const Paperclip: Icon;
  export const Plus: Icon;
  export const RefreshCw: Icon;
  export const Search: Icon;
  export const Settings: Icon;
  export const Shield: Icon;
  export const ShieldAlert: Icon;
  export const ShieldCheck: Icon;
  export const ShoppingBag: Icon;
  export const Sliders: Icon;
  export const Smartphone: Icon;
  export const Sparkles: Icon;
  export const User: Icon;
  export const Wand2: Icon;
  export const X: Icon;
  export const XCircle: Icon;
  export const Zap: Icon;
}
