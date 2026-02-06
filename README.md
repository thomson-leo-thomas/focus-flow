# Focus Flow

**Stay in flow while you read.**

Focus Flow is a cognitive load–aware study companion that helps learners stay in flow while reading dense material. It adapts the reading experience based on your cognitive effort using explainable, non-invasive heuristics—without tracking you.

## Features

- **Adaptive Reading Interface**: Automatically simplifies the UI based on real-time cognitive strain detection.
- **Academic Structure Detection**: Recognizes section headers, abstract blocks, and mentions of figure references (e.g., "Fig. 1").
- **Precision Behavioral Engine**: Analyzes micro-scrolls, re-reads, and hesitation using weighted heuristics.
- **Effort Analysis Timeline**: A professional, normalized visualization of cognitive effort across document sections.
- **Supportive UX**: Non-intrusive break suggestions and integrated session pausing.
- **Privacy First**: 100% in-browser processing. Zero data leaves your device.
- **Universal Support**: Optimized for PDFs, Markdown, and Text files.

## Philosophy

### Why Cognitive Load Matters
Learning dense material requires maintaining a delicate balance of cognitive effort. Too little effort and you disengage; too much and you experience overload. Focus Flow detects when you drift into "overload" territory and subtly intervenes to help you regain control.

### Why Heuristics Over AI?
AI models are black boxes. Focus Flow uses transparent, deterministic heuristics (like scroll reversal and hesitation time) that map directly to human reading behaviors. This ensures the system is predictable, lightweight, and respectful of your agency. It supports you; it doesn't try to outsmart you.

### Design Philosophy
The interface is designed to disappear. Every pixel is dedicated to the text. Access to tools is available, but never intrusive. We believe that the best study tool is one that helps you forget you're using a tool.

## Getting Started

Focus Flow is a standard Next.js 14 application.

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/focus-flow.git
   cd focus-flow
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Run the development server**
   ```bash
   npm run dev
   ```

4. **Open in browser**
   Navigate to [http://localhost:3000](http://localhost:3000).

## Deployment

Deploy with zero configuration on [Vercel](https://vercel.com/new).

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fyourusername%2Ffocus-flow)

No environment variables are required.

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS
- **Motion**: Framer Motion
- **PDF Parsing**: pdfjs-dist (Client-side worker)
- **Language**: TypeScript

## License

MIT
