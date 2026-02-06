"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ParsedChunk } from "@/lib/pdf-ingest";
import { useCognitiveLoad } from "@/hooks/useCognitiveLoad";
import { useFrictionTracker } from "@/hooks/useFrictionTracker";
import { TextChunk } from "@/components/text-chunk";
import { cn } from "@/lib/utils";
import { ArrowLeft, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EffortGraph } from "@/components/effort-graph";
import { SessionSummary } from "@/components/session-summary";

interface ReadingViewProps {
    chunks: ParsedChunk[];
    onBack: () => void;
}

type SessionStage = "reading" | "summary" | "graph";

export function ReadingView({ chunks, onBack }: ReadingViewProps) {
    const [metrics, actions] = useCognitiveLoad();
    const { loadScore, loadState, focusMode, isReadingActive, activeReadingTime, strainSustainedTime } = metrics;
    const {
        reportScrollUp,
        reportRelativeTime,
        reportHesitation,
        reportSmoothReading,
        startSession,
        pauseSession,
        endSession
    } = actions;

    const { updateFriction, markAsSkimmed, recordLoadSample, getTopFrictionChunks, frictionMap } = useFrictionTracker();

    const [sessionStage, setSessionStage] = useState<SessionStage>("reading");
    const [activeChunkIndex, setActiveChunkIndex] = useState(0);
    const lastScrollPos = useRef(0);
    const lastScrollTime = useRef(Date.now());
    const [velocity, setVelocity] = useState(0);
    const [isSkimming, setIsSkimming] = useState(false);
    const [isBreakSuggested, setIsBreakSuggested] = useState(false);

    // Session Start/Lifecycle
    useEffect(() => {
        startSession();
        return () => endSession();
    }, [startSession, endSession]);

    // Break Suggestion Logic (8-10 minutes of strain)
    useEffect(() => {
        if (loadState === "strain" && strainSustainedTime > 480) { // 8 minutes
            setIsBreakSuggested(true);
        } else if (loadState !== "strain") {
            setIsBreakSuggested(false);
        }
    }, [loadState, strainSustainedTime]);

    // Sampling Cognitive Load for the active chunk
    useEffect(() => {
        if (sessionStage !== "reading") return;

        const sampler = setInterval(() => {
            const activeId = chunks[activeChunkIndex]?.id;
            if (activeId) {
                recordLoadSample(activeId, loadScore);
            }
        }, 1000);

        return () => clearInterval(sampler);
    }, [activeChunkIndex, chunks, loadScore, recordLoadSample, sessionStage]);

    // Scroll Behavior & Velocity Monitoring
    useEffect(() => {
        if (sessionStage !== "reading") return;

        const handleScroll = () => {
            const currentScroll = window.scrollY;
            const absoluteDelta = Math.abs(currentScroll - lastScrollPos.current);
            const deltaY = lastScrollPos.current - currentScroll; // positive = scroll up
            const now = Date.now();
            const timeDelta = now - lastScrollTime.current;

            if (timeDelta > 0) {
                const currentVelocity = absoluteDelta / timeDelta; // pixels per ms
                setVelocity(prev => prev * 0.8 + currentVelocity * 0.2); // Smooth velocity
            }

            // Scroll-Up Detection & Classification
            if (deltaY > 0) { // Only consider scrolling up
                let intensity: "small" | "medium" | "large" | null = null;
                if (deltaY < 40) intensity = "small";
                else if (deltaY < 120) intensity = "medium";
                else intensity = "large";

                if (intensity) {
                    const rereadAmount = reportScrollUp(intensity);
                    if (rereadAmount > 0) {
                        const activeId = chunks[activeChunkIndex]?.id;
                        if (activeId) {
                            updateFriction(activeId, { type: "reread", amount: rereadAmount });
                        }
                    }
                }
            }

            if (currentScroll - lastScrollPos.current > 0 && absoluteDelta < 300 && timeDelta > 150) reportSmoothReading();

            lastScrollPos.current = currentScroll;
            lastScrollTime.current = now;
        };

        const handleWheel = (e: WheelEvent) => {
            if (focusMode && Math.abs(e.deltaY) > 100) {
                window.scrollBy(0, e.deltaY * 0.4);
                e.preventDefault();
            }
        };

        window.addEventListener("scroll", handleScroll);
        window.addEventListener("wheel", handleWheel, { passive: false });

        return () => {
            window.removeEventListener("scroll", handleScroll);
            window.removeEventListener("wheel", handleWheel);
        };
    }, [reportScrollUp, reportSmoothReading, sessionStage, focusMode, activeChunkIndex, chunks, updateFriction]);

    // Skimming Detection Feedback
    useEffect(() => {
        if (velocity > 1.5) { // Threshold for fast scrolling
            setIsSkimming(true);
            const timer = setTimeout(() => setIsSkimming(false), 2000);
            return () => clearTimeout(timer);
        }
    }, [velocity]);

    // Handle Chunk Interaction
    const handleChunkVisible = useCallback((index: number) => {
        if (index === activeChunkIndex) return;
        setActiveChunkIndex(index);
    }, [activeChunkIndex]);

    const handleChunkInteraction = useCallback((payload: any) => {
        if (payload.type === "relativeTime") {
            const { time, expected, id } = payload;

            // Skimming Detection: < 30% expected time AND fast velocity
            if (time < expected * 0.3 && velocity > 1.2) {
                markAsSkimmed(id);
            } else {
                reportRelativeTime(time, expected, id, payload.isPeriodic);
                updateFriction(id, { type: "visit_time", time, expected });
            }
        }
    }, [reportRelativeTime, updateFriction, markAsSkimmed, velocity]);

    // Background Softening
    const bgTints = {
        steady: "#fafafa",
        "high-effort": "#f9f7f2",
        strain: isBreakSuggested ? "#f1f8f1" : "#f6f2ec" // Greener tint if break suggested
    };

    if (sessionStage === "summary") {
        return (
            <SessionSummary
                metrics={metrics}
                chunks={chunks}
                topFriction={getTopFrictionChunks()}
                frictionMap={frictionMap}
                onNext={() => setSessionStage("graph")}
            />
        );
    }

    if (sessionStage === "graph") {
        const graphData = chunks.map((c, i) => {
            const fData = frictionMap[c.id];
            // effort_value = normalize(time_on_chunk / expected_time + rereads * 0.5)
            const timeRatio = fData && c.expectedTime ? fData.totalTime / c.expectedTime : 0;
            const rereadFactor = fData ? fData.rereads * 0.5 : 0;

            return {
                index: i,
                id: c.id,
                type: c.type,
                effort: fData?.isSkimmed ? 0 : (timeRatio + rereadFactor)
            };
        });
        return <EffortGraph data={graphData} onNext={onBack} />;
    }

    return (
        <motion.div
            animate={{ backgroundColor: bgTints[loadState] }}
            transition={{ duration: 1.2, ease: "easeInOut" }}
            className="min-h-screen transition-all"
        >
            {/* Status Bar */}
            <div className="fixed top-0 left-0 right-0 h-1 bg-muted/20 z-50">
                <motion.div
                    animate={{
                        width: `${((activeChunkIndex + 1) / chunks.length) * 100}%`,
                        opacity: focusMode ? 0.3 : 1
                    }}
                    className={cn("h-full transition-colors duration-1000",
                        loadState === "steady" ? "bg-green-500/50" :
                            loadState === "high-effort" ? "bg-yellow-500/50" : "bg-orange-400/50"
                    )}
                />
            </div>

            {/* Reassuring State Pill & Skimming Indicator */}
            <div className="fixed top-8 right-8 z-40 flex flex-col items-end gap-3">
                <AnimatePresence>
                    {isSkimming && (
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            className="flex items-center gap-3 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 backdrop-blur-md"
                        >
                            <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                            <span className="text-[10px] font-bold uppercase tracking-widest text-blue-600">
                                Skimming Detected
                            </span>
                        </motion.div>
                    )}
                </AnimatePresence>

                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn(
                        "flex flex-col items-end gap-1 px-5 py-3 rounded-2xl border shadow-sm transition-all duration-700 bg-white/40 backdrop-blur-xl border-white/50"
                    )}
                >
                    <div className="flex items-center gap-3">
                        <div className={cn(
                            "w-2 h-2 rounded-full",
                            loadState === "steady" ? "bg-green-500" :
                                loadState === "high-effort" ? "bg-yellow-500" : "bg-red-500 animate-pulse"
                        )} />
                        <span className="text-xs font-semibold uppercase tracking-wider text-foreground/70">
                            {loadState === "strain" ? "Technical Strain" : loadState === "high-effort" ? "Deep Focus" : "Steady Flow"}
                        </span>
                    </div>
                    {loadState === "strain" && (
                        <motion.span
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                            className="text-[10px] text-muted-foreground italic font-serif"
                        >
                            Taking it one paragraph at a time.
                        </motion.span>
                    )}
                </motion.div>

                <AnimatePresence>
                    {isBreakSuggested && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="mt-4 p-4 rounded-xl bg-green-50/50 border border-green-200/50 backdrop-blur-md max-w-[240px] text-right"
                        >
                            <p className="text-[11px] text-green-800/80 leading-relaxed italic mb-3">
                                You’ve been working through a dense section. A short pause might help before continuing.
                            </p>
                            <Button
                                onClick={() => pauseSession()}
                                size="sm"
                                variant="outline"
                                className="h-7 text-[9px] uppercase tracking-wider font-bold bg-white/50 border-green-200 text-green-700 hover:bg-green-100/50"
                            >
                                Pause for 2 minutes
                            </Button>
                        </motion.div>
                    )}
                </AnimatePresence>

                <AnimatePresence>
                    {!isReadingActive && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="fixed inset-0 z-[100] bg-white/60 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center"
                        >
                            <div className="max-w-sm space-y-6">
                                <h2 className="text-2xl font-serif">Session Paused</h2>
                                <p className="text-sm text-muted-foreground italic">Resting eyes. Take a deep breath.</p>
                                <Button
                                    onClick={() => startSession()}
                                    className="rounded-full px-12 h-12 text-sm font-medium"
                                >
                                    Resume Reading
                                </Button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            <main className="max-w-4xl mx-auto pt-32 pb-60 px-6">
                <div className="space-y-4">
                    {chunks.map((chunk, index) => (
                        <TextChunk
                            key={chunk.id}
                            id={chunk.id}
                            text={chunk.text}
                            type={chunk.type}
                            isActive={index === activeChunkIndex}
                            isFocused={focusMode}
                            expectedTime={chunk.expectedTime}
                            hasFigureReference={chunk.hasFigureReference}
                            onVisible={() => handleChunkVisible(index)}
                            reportInteraction={(payload) => handleChunkInteraction({ ...payload, id: chunk.id })}
                        />
                    ))}
                </div>

                <div className="mt-40 flex flex-col items-center gap-6">
                    <div className="h-px w-20 bg-foreground/10" />
                    <Button
                        onClick={() => {
                            endSession();
                            setSessionStage("summary");
                        }}
                        variant="ghost"
                        size="lg"
                        className="text-muted-foreground hover:text-foreground hover:bg-transparent px-10 font-serif italic"
                    >
                        Complete Session
                    </Button>
                </div>
            </main>
        </motion.div>
    );
}
