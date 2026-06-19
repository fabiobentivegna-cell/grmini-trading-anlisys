import React from "react";
import { RealtimeMessage } from "../types";
import { Info, AlertTriangle, CheckCircle, BellOff, Server } from "lucide-react";

interface NotificationsPaneProps {
  notifications: RealtimeMessage[];
  onClear: () => void;
}

export default function NotificationsPane({ notifications, onClear }: NotificationsPaneProps) {
  const getIcon = (type: RealtimeMessage["type"], severity: RealtimeMessage["severity"]) => {
    switch (type) {
      case "ai_alert":
        return <Server className="w-3.5 h-3.5 text-[var(--orange)]" />;
      case "indicator":
        return <CheckCircle className="w-3.5 h-3.5 text-[var(--green)]" />;
      default:
        return <Info className="w-3.5 h-3.5 text-[var(--blue)]" />;
    }
  };

  const getSeverityBgClass = (severity: RealtimeMessage["severity"]) => {
    switch (severity) {
      case "success":
        return "border-l-2 border-[var(--green)] bg-[var(--green)]/5";
      case "warning":
        return "border-l-2 border-[var(--orange)] bg-[var(--orange)]/5";
      default:
        return "border-l-2 border-[var(--blue)] bg-[var(--blue)]/5";
    }
  };

  return (
    <div className="flex flex-col h-full bg-[var(--bg1)] border border-[var(--border)] rounded-md overflow-hidden">
      <div className="p-3 border-b border-[var(--border)] flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-1.5 font-sans font-bold text-xs uppercase tracking-wider text-[var(--text1)]">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--green)] animate-ping" />
          <span>Feed Eventi Live</span>
        </div>
        {notifications.length > 0 && (
          <button
            onClick={onClear}
            className="text-[var(--text3)] hover:text-[var(--text2)] font-mono text-[9px] flex items-center gap-1 transition"
          >
            <BellOff className="w-3 h-3" />
            Azzera
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-1.5 scrollbar-thin">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-3 text-[var(--text3)] gap-1">
            <span className="text-xl">📡</span>
            <p className="text-[10px] italic">In attesa di segnali dai mercati italiani ed esteri...</p>
          </div>
        ) : (
          notifications.map(item => (
            <div
              key={item.id}
              className={`p-2 rounded text-[11px] font-sans transition duration-200 ${getSeverityBgClass(
                item.severity
              )}`}
            >
              <div className="flex items-center justify-between gap-1 mb-1">
                <div className="flex items-center gap-1 font-bold text-[var(--text1)] text-[10px] uppercase">
                  {getIcon(item.type, item.severity)}
                  <span className="truncate">{item.title}</span>
                </div>
                <span className="text-[8px] font-mono text-[var(--text3)]">{item.timestamp}</span>
              </div>
              <p className="text-[var(--text2)] leading-normal font-sans text-[10.5px]">
                {item.message}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
