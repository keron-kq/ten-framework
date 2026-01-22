import { cn } from "@/lib/utils";
import { HeaderActions, HeaderRoomInfo } from "./HeaderComponents";

export default function Header(props: { className?: string }) {
  const { className } = props;
  return (
    <>
      {/* Header */}
      <header
        className={cn(
          "flex items-center justify-between bg-[#181a1d] border-b border-[#2a2a2a] p-2 md:p-4",
          className
        )}
      >
        <div className="flex items-center space-x-4">
          {/* RIGOL Logo Style - Dark Theme */}
          <div className="flex items-center gap-2">
             {/* Yellow Accent Block */}
             <div className="h-6 w-1 bg-[#FFCC00] rounded-full"></div>
             <div className="flex flex-col">
                <span className="font-bold text-white text-lg tracking-wide">RIGOL</span>
                <span className="text-[10px] text-gray-400 tracking-wider uppercase leading-none">AI Assistant</span>
             </div>
          </div>
        </div>
        <div className="flex items-center gap-4">
        <HeaderActions />
        </div>
      </header>
    </>
  );
}
