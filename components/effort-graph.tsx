"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";
import { ArrowRight } from "lucide-react";

interface EffortGraphProps {
    data: {
        index: number;
        id: string;
        type: "paragraph" | "section";
        effort: number;
    }[];
    onNext: () => void;
}

export function EffortGraph({ data, onNext }: EffortGraphProps) {
    if (data.length < 2) {
        return (
            <div className="max-w-2xl mx-auto py-24 px-6 text-center space-y-6">
                <p className="text-muted-foreground font-serif italic">Insufficient data for timeline visualization.</p>
                <Button onClick={onNext} variant="outline" className="rounded-full px-8">Continue</Button>
            </div>
        );
    }

    // Smooth data using rolling average (window of 3)
    const smoothData = data.map((d, i) => {
        const window = data.slice(Math.max(0, i - 1), Math.min(data.length, i + 2));
        const avgEffort = window.reduce((sum, item) => sum + item.effort, 0) / window.length;
        return { ...d, effort: avgEffort };
    });

    const maxEffort = Math.max(...smoothData.map(d => d.effort), 0.5); // Minimum head-room
    const minEffort = 0; // Absolute baseline

    // Normalize to 0-100 for SVG coordinates
    const normalizedData = smoothData.map((d, i) => ({
        x: (i / (smoothData.length - 1)) * 100,
        y: 100 - (d.effort / maxEffort) * 85 - 5 // Ensure it stays within bounds with some padding
    }));

    const linePath = normalizedData.map((d, i) =>
        `${i === 0 ? 'M' : 'L'} ${d.x} ${d.y}`
    ).join(' ');

    const sections = data.filter(d => d.type === "section");

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="max-w-4xl mx-auto py-24 px-6 space-y-16"
        >
            <div className="relative w-full aspect-[21/10] px-12">
                {/* Y-Axis Label */}
                <div className="absolute left-0 top-1/2 -rotate-90 origin-left -translate-y-1/2">
                    <span className="text-[10px] uppercase tracking-widest text-muted-foreground/50 font-medium">
                        Relative cognitive effort
                    </span>
                </div>

                {/* Graph Area */}
                <div className="relative w-full h-full border-l border-b border-foreground/5">
                    {/* Gridlines */}
                    <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                        {[0, 1, 2, 3].map(i => (
                            <div key={i} className="w-full h-px bg-foreground/[0.03]" />
                        ))}
                    </div>

                    {/* Section Boundaries */}
                    {sections.map((s, idx) => {
                        const x = (s.index / (data.length - 1)) * 100;
                        return (
                            <div
                                key={s.id}
                                className="absolute top-0 bottom-0 w-px bg-foreground/[0.05] pointer-events-none"
                                style={{ left: `${x}%` }}
                            />
                        );
                    })}

                    <svg
                        viewBox="0 0 100 100"
                        preserveAspectRatio="none"
                        className="w-full h-full overflow-visible"
                    >
                        <motion.path
                            d={linePath}
                            fill="none"
                            stroke="#333333" // Deep charcoal/slate
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            initial={{ pathLength: 0, opacity: 0 }}
                            animate={{ pathLength: 1, opacity: 1 }}
                            transition={{ duration: 1.5, ease: "easeInOut" }}
                        />
                    </svg>
                </div>

                {/* X-Axis Label */}
                <div className="mt-6 flex justify-center w-full">
                    <span className="text-[10px] uppercase tracking-widest text-muted-foreground/50 font-medium">
                        Document progression
                    </span>
                </div>
            </div>

            <div className="flex flex-col items-center gap-10">
                <div className="text-center space-y-3">
                    <p className="text-base text-foreground/80 font-serif italic">
                        Cognitive effort across the document
                    </p>
                    <p className="text-[11px] text-muted-foreground/60 max-w-sm mx-auto leading-relaxed">
                        This normalized timeline synthesizes relative reading duration and re-read signals across sections. Higher peaks denote periods of increased focus or technical strain.
                    </p>
                </div>

                <Button onClick={onNext} variant="ghost" className="group text-foreground/50 hover:text-foreground hover:bg-transparent tracking-widest uppercase text-[10px] font-bold">
                    Finish Session
                    <ArrowRight className="ml-2 w-4 h-4 transition-transform group-hover:translate-x-1" />
                </Button>
            </div>
        </motion.div>
    );
}
