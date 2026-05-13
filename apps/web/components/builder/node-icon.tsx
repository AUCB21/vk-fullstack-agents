"use client";

import {
  MessageSquare,
  RefreshCw,
  ExternalLink,
  Bot,
  Sparkles,
  Package,
  ShoppingCart,
  Layers,
  Table,
  GitBranch,
  Send,
  CheckCircle,
  Settings,
  Pencil,
  Search,
  Plus,
  X,
  Share2,
  Sun,
  Moon,
  ArrowUp,
  ChevronLeft,
  type LucideProps,
} from "lucide-react";
import type { ComponentType } from "react";

const ICON_MAP: Record<string, ComponentType<LucideProps>> = {
  MessageSquare,
  RefreshCw,
  ExternalLink,
  Bot,
  Sparkles,
  Package,
  ShoppingCart,
  Layers,
  Table,
  GitBranch,
  Send,
  CheckCircle,
  Settings,
  Pencil,
  Search,
  Plus,
  X,
  Share2,
  Sun,
  Moon,
  ArrowUp,
  ChevronLeft,
};

export function NodeIcon({ name, className }: { name: string; className?: string }) {
  const Icon = ICON_MAP[name] ?? Package;
  return <Icon className={className} />;
}
