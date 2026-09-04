import { useState } from "react";
import type { Faq } from "@/types";

// TODO: replace with a live query against /faqs (where published == true,
// ordered by `order`). Placeholder content clearly marked for replacement.
const PLACEHOLDER_FAQS: Faq[] = [
  {
    id: "1",
    order: 1,
    published: true,
    question: "How much does it cost to enter?",
    answer: "Each entry costs R100, paid securely online. [Confirm free-entry route once legal review is complete.]",
  },
  {
    id: "2",
    order: 2,
    published: true,
    question: "How is the winner chosen?",
    answer: "[Insert the confirmed, lawyer-approved draw method here — e.g. random computerised draw from all valid entries.]",
  },
  {
    id: "3",
    order: 3,
    published: true,
    question: "When do entries close?",
    answer: "See the countdown on the Home and Competition pages for the exact closing date and time.",
  },
  {
    id: "4",
    order: 4,
    published: true,
    question: "Is my payment secure?",
    answer: "Yes. Payments are processed by a PCI-DSS compliant South African payment provider. We never store your card details.",
  },
  {
    id: "5",
    order: 5,
    published: true,
    question: "What happens to my personal information?",
    answer: "See our Privacy Policy for full details on how your information is collected, used and protected under POPIA.",
  },
];

export default function Faq() {
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <div className="container-page py-16">
      <p className="eyebrow">Support</p>
      <h1 className="mt-4 text-4xl md:text-5xl">Frequently Asked Questions</h1>

      <div className="mt-10 max-w-2xl divide-y divide-steel border-y border-steel">
        {PLACEHOLDER_FAQS.sort((a, b) => a.order - b.order).map((f) => {
          const isOpen = openId === f.id;
          return (
            <div key={f.id}>
              <button
                onClick={() => setOpenId(isOpen ? null : f.id)}
                className="flex w-full items-center justify-between py-5 text-left"
                aria-expanded={isOpen}
              >
                <span className="pr-4 text-base normal-case tracking-normal">
                  {f.question}
                </span>
                <span className="font-mono text-ignition">{isOpen ? "−" : "+"}</span>
              </button>
              {isOpen && (
                <p className="pb-5 text-sm text-silver">{f.answer}</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
