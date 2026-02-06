"use client";

import { motion } from "framer-motion";
import { Clock, Zap, Target, Brain, ArrowRight, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LoadState } from "@/hooks/useCognitiveLoad";
import { cn } from "@/lib/utils";
import { ParsedChunk } from "@/lib/pdf-ingest";

interface SessionSummaryProps {
    metrics: {
        activeReadingTime: number;
        timeInStates: Record<LoadState, number>;
        focusModeActivations: number;
    };
    chunks: ParsedChunk[];
    topFriction: { id: string; score: number }[];
    frictionMap: Record<string, any>;
    onNext: () => void;
}

export function SessionSummary({ metrics, chunks, topFriction, frictionMap, onNext }: SessionSummaryProps) {
    const { activeReadingTime, timeInStates, focusModeActivations } = metrics;

    const skimmedChunks = chunks.filter(c => frictionMap[c.id]?.isSkimmed);

    const formatTime = (sec: number) => {
        const m = Math.floor(sec / 60);
        const s = sec % 60;
        return m > 0 ? `${m}m ${s}s` : `${s}s`;
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-2xl mx-auto py-12 px-6 space-y-12"
        >
            <div className="space-y-4 text-center">
                <h2 className="text-3xl font-serif">Session Insight</h2>
                <p className="text-muted-foreground">A reflection on your cognitive journey through the text.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                    <div className="flex gap-4 items-start">
                        <div className="mt-1 p-2 bg-primary/5 rounded-lg text-primary">
                            <Clock className="w-5 h-5" />
                        </div>
                        <div>
                            <h4 className="font-medium text-sm text-foreground/60 uppercase tracking-wider text-[10px]">Total Time</h4>
                            <p className="text-2xl font-serif">{formatTime(activeReadingTime)}</p>
                        </div>
                    </div>

                    <div className="flex gap-4 items-start">
                        <div className="mt-1 p-2 bg-primary/5 rounded-lg text-primary">
                            <Zap className="w-5 h-5" />
                        </div>
                        <div>
                            <h4 className="font-medium text-sm text-foreground/60 uppercase tracking-wider text-[10px]">Focus Mode</h4>
                            <p className="text-2xl font-serif">{focusModeActivations} Activations</p>
                        </div>
                    </div>
                </div>

                <div className="space-y-4">
                    <h4 className="font-medium text-sm text-foreground/60 uppercase tracking-wider text-[10px]">Depth of Effort</h4>
                    <div className="space-y-3">
                        <StateRow label="Steady Focus" time={timeInStates.steady} color="bg-green-500" />
                        <StateRow label="High Effort" time={timeInStates["high-effort"]} color="bg-yellow-500" />
                        <StateRow label="Cognitive Strain" time={timeInStates.strain} color="bg-red-500" />
                    </div>
                </div>
            </div>

            {topFriction.length > 0 && (
                <div className="space-y-6 pt-6 border-t">
                    <h3 className="text-xl font-serif flex items-center gap-2">
                        <AlertCircle className="w-5 h-5 text-amber-500" />
                        Sections of Interest
                    </h3>
                    <div className="space-y-4">
                        {topFriction.slice(0, 3).map((f) => {
                            const chunk = chunks.find(c => c.id === f.id);
                            if (!chunk) return null;
                            return (
                                <div key={f.id} className="p-4 bg-muted/30 rounded-lg border border-muted/50">
                                    <p className="text-sm font-serif italic text-foreground/70 line-clamp-2">
                                        &quot;{chunk.text}&quot;
                                    </p>
                                    <div className="mt-2 text-[10px] uppercase tracking-widest text-muted-foreground">
                                        Friction Level: {f.score >= 6 ? "High" : "Moderate"}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {skimmedChunks.length > 0 && (
                <div className="space-y-6 pt-6 border-t">
                    <h3 className="text-xl font-serif flex items-center gap-2 text-foreground/70">
                        <Target className="w-5 h-5 text-blue-500/60" />
                        Skimmed Sections ({skimmedChunks.length})
                    </h3>
                    <div className="space-y-3">
                        {skimmedChunks.slice(0, 5).map((chunk) => (
                            <div key={chunk.id} className="flex items-center justify-between text-sm text-muted-foreground font-serif italic">
                                <span className="line-clamp-1 opacity-70">
                                    {chunk.type === "section" ? chunk.text : chunk.text.slice(0, 80) + "..."}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="pt-8 border-t flex justify-center">
                <Button onClick={onNext} className="group rounded-full px-10 bg-foreground/90 hover:bg-foreground transition-all duration-300" size="lg">
                    View Effort Analysis
                    <ArrowRight className="ml-2 w-4 h-4 transition-transform group-hover:translate-x-1" />
                </Button>
            </div>
        </motion.div>
    );
}

function StateRow({ label, time, color }: { label: string; time: number; color: string }) {
    return (
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className={cn("w-2 h-2 rounded-full", color)} />
                <span>{label}</span>
            </div>
            <span className="font-medium text-xs tabular-nums text-foreground/70">
                {Math.floor(time / 60)}m {time % 60}s
            </span>
        </div>
    );
}
