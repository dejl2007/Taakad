import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Terminal, CheckCircle2, Lock, Unlock, Server, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export type LogEntry = {
  id: string;
  message: string;
  type: "info" | "success" | "encrypt" | "decrypt" | "network" | "failure";
  timestamp: number;
};

export function CryptoLog({ logs }: { logs: LogEntry[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div className="w-full h-full bg-black/40 rounded-xl border border-white/10 flex flex-col overflow-hidden backdrop-blur-md">
      <div className="h-10 border-b border-white/10 bg-white/5 px-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs font-mono font-medium text-muted-foreground">SECURE_LOG_TERMINAL_V1.0</span>
        </div>
        <div className="flex gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500/20 border border-red-500/50" />
          <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/20 border border-yellow-500/50" />
          <div className="w-2.5 h-2.5 rounded-full bg-green-500/20 border border-green-500/50" />
        </div>
      </div>
      
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-3 font-mono text-sm scroll-smooth"
      >
        <AnimatePresence initial={false}>
          {logs.map((log) => (
            <motion.div
              key={log.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              className={cn(
                "flex items-start gap-3 p-2 rounded border border-transparent transition-colors duration-300",
                log.type === "success" && "bg-green-500/10 border-green-500/20 text-green-400",
                log.type === "encrypt" && "bg-primary/10 border-primary/20 text-primary",
                log.type === "decrypt" && "bg-secondary/10 border-secondary/20 text-secondary",
                log.type === "network" && "text-blue-400",
                log.type === "failure" && "bg-red-500/10 border-red-500/20 text-red-400",
                log.type === "info" && "text-muted-foreground"
              )}
            >
              <div className="mt-0.5 shrink-0">
                {log.type === "success" && <CheckCircle2 className="w-4 h-4" />}
                {log.type === "encrypt" && <Lock className="w-4 h-4" />}
                {log.type === "decrypt" && <Unlock className="w-4 h-4" />}
                {log.type === "network" && <Server className="w-4 h-4" />}
                {log.type === "failure" && <XCircle className="w-4 h-4" />}
                {log.type === "info" && <span className="text-xs opacity-50">{">"}</span>}
              </div>
              <div className="flex flex-col gap-0.5 min-w-0 break-words">
                <span className="leading-tight">{log.message}</span>
                <span className="text-[10px] opacity-40">
                  {new Date(log.timestamp).toLocaleTimeString()}
                </span>
              </div>
            </motion.div>
          ))}
          {logs.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground/30 gap-2">
              <ActivityIcon />
              <p>Waiting for operations...</p>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function ActivityIcon() {
  return (
    <div className="relative w-8 h-8">
      <div className="absolute inset-0 border-2 border-current rounded-full opacity-20" />
      <div className="absolute inset-0 border-2 border-t-current border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin" />
    </div>
  );
}
