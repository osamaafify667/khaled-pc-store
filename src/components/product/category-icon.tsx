import {
  Box,
  CircuitBoard,
  Cpu,
  Fan,
  HardDrive,
  Headphones,
  Keyboard,
  MemoryStick,
  Monitor,
  MonitorPlay,
  PlugZap,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

const icons: Record<string, LucideIcon> = {
  cpu: Cpu,
  circuit: CircuitBoard,
  gpu: MonitorPlay,
  memory: MemoryStick,
  storage: HardDrive,
  plug: PlugZap,
  case: Box,
  fan: Fan,
  monitor: Monitor,
  keyboard: Keyboard,
  desktop: Monitor,
  headphones: Headphones,
};

export function CategoryIcon({ name, className }: { name?: string | null; className?: string }) {
  const Icon = (name && icons[name]) || Box;
  return <Icon className={cn("h-5 w-5", className)} />;
}
