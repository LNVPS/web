/**
 * A single question and its answer, both already localised. The page renders
 * these exact strings *and* passes them here, so the markup a crawler reads
 * and the text a visitor reads cannot drift — which is the one thing that
 * disqualifies a `FAQPage` rich result.
 */
export interface FaqItem {
  question: string;
  answer: string;
}

/**
 * `FAQPage` structured data for a list of questions.
 *
 * `acceptedAnswer.text` is plain text, not markup: answers are written short
 * and self-contained so they stay eligible, so there is nothing to mark up.
 */
export function faqJsonLd(items: FaqItem[]): object {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((i) => ({
      "@type": "Question",
      name: i.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: i.answer,
      },
    })),
  };
}
