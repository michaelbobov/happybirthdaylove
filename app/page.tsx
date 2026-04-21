import { HeroScroll } from "@/components/landing/HeroScroll";
import { HeroDemo } from "@/components/landing/HeroDemo";
import { SectionHow } from "@/components/landing/SectionHow";

export default function Home() {
  return (
    <main className="flex-1">
      <HeroScroll />
      <HeroDemo />
      <SectionHow />
      <footer
        className="mx-auto max-w-6xl px-6 py-12 text-center text-sm"
        style={{ color: "var(--color-muted)" }}
      >
        Made with care for the letters you haven&rsquo;t written yet.
      </footer>
    </main>
  );
}
