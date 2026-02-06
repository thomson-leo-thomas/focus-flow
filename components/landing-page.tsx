"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Upload, BookOpen, Brain, EyeOff, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ingestDocument, ParsedChunk } from "@/lib/pdf-ingest";
import { cn } from "@/lib/utils";

interface LandingPageProps {
    onDocumentLoaded: (chunks: ParsedChunk[]) => void;
}

export function LandingPage({ onDocumentLoaded }: LandingPageProps) {
    const [isDragging, setIsDragging] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const handleFile = async (file: File) => {
        setIsLoading(true);
        try {
            const chunks = await ingestDocument(file);
            onDocumentLoaded(chunks);
        } catch (error) {
            console.error("Failed to parse document", error);
            alert("Failed to parse document. Please try a valid PDF or Text file.");
        } finally {
            setIsLoading(false);
        }
    };

    const onDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files?.[0]) {
            handleFile(e.dataTransfer.files[0]);
        }
    };

    const onFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            handleFile(e.target.files[0]);
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center max-w-4xl mx-auto">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="space-y-8"
            >
                <div className="space-y-4">
                    <h1 className="text-4xl md:text-6xl font-serif font-medium tracking-tight text-foreground">
                        Stay in <span className="italic text-primary/80">flow</span> while you read.
                    </h1>
                    <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                        Focus Flow adapts the reading experience based on your cognitive effort — without tracking you.
                        <br />
                        <span className="text-sm opacity-70 mt-2 block">
                            No accounts. No data storage. No distractions.
                        </span>
                    </p>
                </div>

                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.2, duration: 0.6 }}
                    className={cn(
                        "relative group cursor-pointer border-2 border-dashed rounded-xl p-12 transition-all duration-300",
                        isDragging ? "border-primary bg-primary/5 scale-105" : "border-muted hover:border-primary/50 hover:bg-muted/30"
                    )}
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={onDrop}
                    onClick={() => document.getElementById("file-upload")?.click()}
                >
                    <input
                        id="file-upload"
                        type="file"
                        className="hidden"
                        accept=".pdf,.txt,.md"
                        onChange={onFileInput}
                    />

                    <div className="flex flex-col items-center gap-4">
                        <div className="h-16 w-16 bg-muted rounded-full flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                            {isLoading ? (
                                <motion.div
                                    animate={{ rotate: 360 }}
                                    transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                                >
                                    <Upload className="h-8 w-8 text-muted-foreground" />
                                </motion.div>
                            ) : (
                                <Upload className="h-8 w-8 text-muted-foreground group-hover:text-primary transition-colors" />
                            )}
                        </div>
                        <div className="space-y-2">
                            <h3 className="font-medium text-lg">Upload a document to begin</h3>
                            <p className="text-sm text-muted-foreground">
                                Supports .txt, .md, .pdf
                            </p>
                        </div>
                        <Button variant="outline" className="mt-4 pointer-events-none">
                            Browse Files
                        </Button>
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 }}
                    className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-12 text-left"
                >
                    <div className="space-y-2">
                        <div className="flex items-center gap-2 text-foreground/80">
                            <Brain className="h-5 w-5" />
                            <span className="font-medium">Adapts Automatically</span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                            Detects struggle and simplifies the UI to help you regain focus.
                        </p>
                    </div>
                    <div className="space-y-2">
                        <div className="flex items-center gap-2 text-foreground/80">
                            <EyeOff className="h-5 w-5" />
                            <span className="font-medium">Reduced Overload</span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                            Hides distractions when your cognitive load gets too high.
                        </p>
                    </div>
                    <div className="space-y-2">
                        <div className="flex items-center gap-2 text-foreground/80">
                            <Shield className="h-5 w-5" />
                            <span className="font-medium">Privacy First</span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                            Everything happens in your browser. No data leaves your device.
                        </p>
                    </div>
                </motion.div>
            </motion.div>
        </div>
    );
}
