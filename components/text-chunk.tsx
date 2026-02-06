"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useInView } from "framer-motion";

interface TextChunkProps {
    id: string;
    text: string;
    type: "paragraph" | "section";
    isActive: boolean;
    isFocused: boolean;
    expectedTime?: number;
    onVisible: () => void;
    reportInteraction: (payload: any) => void;
    phase?: "reading" | "summary" | "heatmap"; // Control visual appearance
    frictionScore?: number;
    isSkimmed?: boolean;
    rereads?: number;
    longPauses?: number;
    hasFigureReference?: boolean;
}

export function TextChunk({
    id,
    text,
    type,
    isActive,
    isFocused,
    expectedTime,
    onVisible,
    reportInteraction,
    phase = "reading",
    frictionScore = 0,
    isSkimmed = false,
    rereads = 0,
    longPauses = 0,
    hasFigureReference = false
}: TextChunkProps) {
    const ref = useRef<HTMLDivElement>(null);
    const isInView = useInView(ref, { margin: "-20% 0px -20% 0px", amount: 0.5 });
    const startTimeRef = useRef<number | null>(null);

    // Initial visibility reporting
    useEffect(() => {
        if (isInView && !isActive && phase === "reading") {
            onVisible();
        }
    }, [isInView, isActive, onVisible, phase]);

    // Tracking time spent on chunk
    useEffect(() => {
        if (isInView && phase === "reading" && type === "paragraph") {
            const start = Date.now();
            startTimeRef.current = start;

            const interval = setInterval(() => {
                const elapsed = (Date.now() - start) / 1000;
                if (elapsed > 2) {
                    reportInteraction({ type: "relativeTime", time: elapsed, expected: expectedTime, isPeriodic: true });
                }
            }, 1000);

            return () => {
                clearInterval(interval);
                if (startTimeRef.current) {
                    const elapsed = (Date.now() - startTimeRef.current) / 1000;
                    if (elapsed > 2) {
                        reportInteraction({ type: "relativeTime", time: elapsed, expected: expectedTime, isPeriodic: false });
                    }
                    startTimeRef.current = null;
                }
            };
        }
    }, [isInView, phase, type, expectedTime, reportInteraction]);

    const isSection = type === "section";
    const isAbstract = isSection && text.toUpperCase().includes("ABSTRACT");

    // Adaptive Typography during Technical Strain (isFocused)
    const fontSize = isFocused && !isSection ? "110%" : "100%";
    const lineHeight = isFocused && !isSection ? 1.9 : isSection ? 1.4 : 1.75;
    const maxWidth = isFocused && !isSection ? "40rem" : "42rem";

    // One-paragraph focus: active is 100%, siblings are faded
    const normalOpacity = isSection ? 0.7 : 0.9;
    const focusedOpacity = isActive ? 1 : 0.3;
    const finalOpacity = phase === "heatmap" ? 1 : (isFocused ? focusedOpacity : (isActive ? 1 : normalOpacity));

    return (
        <motion.div
            ref={ref}
            id={id}
            animate={{
                opacity: finalOpacity,
                fontSize,
                lineHeight,
                maxWidth
            }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
            className={cn(
                "group relative px-4 md:px-12 transition-all duration-500 ease-out mx-auto",
                isSection ? "mt-12 mb-6" : "mb-6",
                isAbstract && "mt-16 bg-primary/[0.03] rounded-xl border border-primary/5 py-10 mb-12",
                "font-serif",
                isSection ? "text-2xl md:text-3xl tracking-tight font-semibold text-foreground/80" : "text-lg text-foreground/90",
            )}
        >
            {/* Reading Mode Indicator - Left Bar */}
            {phase === "reading" && isFocused && isActive && (
                <div className="absolute left-0 top-6 bottom-6 w-1 rounded-full bg-primary/30" />
            )}

            {/* Figure Reference Tag */}
            {hasFigureReference && !isSection && (
                <div className="mb-2 flex items-center gap-2">
                    <span className="bg-blue-500/10 text-blue-600/80 text-[10px] px-2 py-0.5 rounded-full uppercase tracking-widest font-bold">
                        📊 References a figure
                    </span>
                </div>
            )}

            <p className={cn(
                isSection && "uppercase tracking-[0.05em]",
                "relative leading-relaxed"
            )}>
                {text}
            </p>
        </motion.div>
    );
}
