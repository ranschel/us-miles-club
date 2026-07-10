import { createFileRoute } from "@tanstack/react-router";
import { Mail } from "lucide-react";

const SUPPORT_EMAIL = "hello@usmilesclub.com";

export const Route = createFileRoute("/contact")({
  component: Contact,
  head: () => ({
    meta: [
      { title: "Contact — US Miles Club" },
      {
        name: "description",
        content:
          "Get in touch with US Miles Club. Feedback, bug reports, and account questions welcome.",
      },
      { property: "og:title", content: "Contact US Miles Club" },
      {
        property: "og:description",
        content:
          "Say hi, report a bug, or ask about your account.",
      },
      { property: "og:url", content: "/contact" },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: "/contact" }],
  }),
});

function Contact() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-10 md:py-14">
      <h1 className="text-4xl font-black tracking-tight md:text-5xl">Contact</h1>
      <p className="mt-3 text-text-secondary">
        Feedback, bug reports, or account questions — we read every message.
      </p>

      <div className="card mt-8">
        <div className="flex items-center gap-3">
          <Mail size={22} className="text-primary" />
          <div>
            <div className="text-xs uppercase tracking-wide text-text-secondary">
              Email
            </div>
            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              className="mono text-lg font-bold underline hover:text-primary"
            >
              {SUPPORT_EMAIL}
            </a>
          </div>
        </div>
        <p className="mt-4 text-sm text-text-secondary">
          Please include the email tied to your account when writing about
          account issues so we can find you quickly.
        </p>
      </div>
    </div>
  );
}
