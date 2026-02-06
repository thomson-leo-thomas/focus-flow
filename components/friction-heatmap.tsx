"use client";

import { ParsedChunk } from "@/lib/pdf-ingest";
import { FrictionMap } from "@/hooks/useFrictionTracker";
import { TextChunk } from "./text-chunk";
import { Button } from "./ui/button";
import { RefreshCcw, Info } from "lucide-react";

interface FrictionHeatmapProps {
    chunks: ParsedChunk[];
    frictionMap: FrictionMap;
    onReset: () => void;
}

export function FrictionHeatmap({ chunks, frictionMap, onReset }: FrictionHeatmapProps) {
    return (
        <div className="space-y-12 py-12">
            <div className="sticky top-0 z-50 bg-[#fafafa]/90 backdrop-blur-xl py-6 border-b border-foreground/5 shadow-sm">
                <div className="max-w-2xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 px-6">
                    <div className="flex flex-col gap-3">
                        <h3 className="text-xl font-serif font-bold tracking-tight">Friction Heatmap</h3>
                        <div className="flex flex-wrap gap-5 text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 bg-green-500 rounded-sm" />
                                <span>Smooth</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 bg-yellow-500 rounded-sm" />
                                <span>High Effort</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 bg-red-500 rounded-sm" />
                                <span>Strain</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 bg-slate-400 rounded-sm" />
                                <span>Skimmed</span>
                            </div>
                        </div>
                    </div>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onReset}
                        className="rounded-full text-muted-foreground hover:text-foreground hover:bg-foreground/5 transition-colors border border-foreground/5"
                    >
                        <RefreshCcw className="w-4 h-4 mr-2" />
                        New Session
                    </Button>
                </div>
            </div>

            <div className="space-y-2">
                {chunks.map((chunk) => {
                    const fData = frictionMap[chunk.id];
                    return (
                        <TextChunk
                            key={chunk.id}
                            id={chunk.id}
                            text={chunk.text}
                            type={chunk.type}
                            isActive={false}
                            isFocused={false}
                            onVisible={() => { }}
                            reportInteraction={() => { }}
                            phase="heatmap"
                            frictionScore={fData?.score || 0}
                            isSkimmed={fData?.isSkimmed || false}
                            rereads={fData?.rereads || 0}
                            longPauses={fData?.longPauses || 0}
                        />
                    );
                })}
            </div>

            <div className="flex justify-center pt-12">
                <div className="flex items-center gap-2 text-muted-foreground text-xs font-serif italic">
                    <Info className="w-4 h-4" />
                    Focus areas are automatically highlighted based on reading duration and re-reads.
                </div>
            </div>
        </div>
    );
}
