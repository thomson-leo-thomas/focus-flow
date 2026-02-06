export interface ParsedChunk {
    id: string;
    text: string;
    type: "paragraph" | "section";
    expectedTime?: number; // Estimated seconds for reading
    hasFigureReference?: boolean;
}

export async function ingestDocument(file: File): Promise<ParsedChunk[]> {
    const fileType = file.type;

    if (fileType === "application/pdf") {
        return parsePdf(file);
    } else {
        return parseText(file);
    }
}

async function parsePdf(file: File): Promise<ParsedChunk[]> {
    const pdfjsLib = await import("pdfjs-dist");

    // Set worker path
    if (typeof window !== "undefined") {
        pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.js";
    }

    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;

    let fullText = "";

    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();

        // Better normalization: collapse small fragments and fix PDF line artifacts
        const pageText = textContent.items
            .map((item: any) => item.str)
            .join(" ")
            .replace(/\s+/g, " ");

        fullText += pageText + "\n\n";
    }

    return splitIntoChunks(fullText);
}

async function parseText(file: File): Promise<ParsedChunk[]> {
    const text = await file.text();
    return splitIntoChunks(text);
}

function calculateExpectedTime(text: string): number {
    const words = text.split(/\s+/).filter(w => w.length > 0);
    const wordCount = words.length;
    if (wordCount === 0) return 0;

    const baseWpm = 120; // Academic reading speed
    const baseSeconds = (wordCount / baseWpm) * 60;

    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const avgSentenceLength = sentences.length > 0 ? wordCount / sentences.length : wordCount;

    // Density of technical tokens (numbers, acronyms, citations)
    const technicalTokens = words.filter(w =>
        /\d+/.test(w) ||
        /^[A-Z]{3,}$/.test(w) ||
        /\[\d+\]/.test(w) ||
        /\([A-Z][a-z]+, \d{4}\)/.test(w)
    ).length;

    const technicalTokenDensity = technicalTokens / wordCount;

    const complexityMultiplier =
        1 +
        (Math.min(avgSentenceLength, 60) / 30) * 0.3 +
        (Math.min(technicalTokenDensity, 0.4) * 0.5);

    return Math.max(5, Math.round(baseSeconds * complexityMultiplier));
}

function splitIntoChunks(text: string): ParsedChunk[] {
    const paragraphs = text.split(/\n\s*\n/);
    const chunks: ParsedChunk[] = [];

    paragraphs.forEach((p, pIdx) => {
        const trimmed = p.trim();
        if (!trimmed) return;

        // Enhanced Section Detection
        const isHeader =
            /^(ABSTRACT|INTRODUCTION|METHODS|METHODOLOGY|RESULTS|DISCUSSION|CONCLUSION|REFERENCES|ACKNOWLEDGEMENTS|RELATED WORK|II\.|III\.|IV\.|V\.)/i.test(trimmed) ||
            (/^[A-Z\s0-9]{5,100}$/.test(trimmed) && trimmed.split(" ").length < 10) ||
            trimmed.endsWith(":");

        const type = isHeader ? "section" : "paragraph";
        const expectedTime = type === "paragraph" ? calculateExpectedTime(trimmed) : 0;

        // Figure Reference Detection
        const hasFigureReference = /((Fig\.|Figure|Fig)\s\d+)|(Shown in Figure)|(as shown in Fig)/i.test(trimmed);

        chunks.push({
            id: `chunk-${type.charAt(0)}-${pIdx}-${Date.now()}`,
            text: trimmed,
            type,
            expectedTime,
            hasFigureReference
        });
    });

    return chunks;
}
