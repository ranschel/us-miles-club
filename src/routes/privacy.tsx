import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/privacy")({
  component: Privacy,
  head: () => ({
    meta: [
      { title: "Privacy — US Miles Club" },
      {
        name: "description",
        content:
          "How US Miles Club handles your account and workout data. Short version: we keep it minimal.",
      },
      { property: "og:title", content: "Privacy — US Miles Club" },
      {
        property: "og:description",
        content:
          "The small amount of data US Miles Club collects and how it's used.",
      },
      { property: "og:url", content: "/privacy" },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: "/privacy" }],
  }),
});

function Privacy() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 md:py-14">
      <h1 className="text-4xl font-black tracking-tight md:text-5xl">Privacy</h1>
      <p className="mt-3 text-sm text-text-secondary">
        This page is maintained by the US Miles Club team to answer common
        privacy questions about the app. It isn't a legal contract.
      </p>

      <section className="mt-8 space-y-3">
        <h2 className="text-xl font-bold">What we store</h2>
        <p className="text-text-secondary">
          When you join, we store your email address (for sign-in) and a display
          name you choose. When you log a workout, we store the sport, distance,
          city, county, state, and the date/time — so we can show it on the
          leaderboards and your portal.
        </p>
      </section>

      <section className="mt-6 space-y-3">
        <h2 className="text-xl font-bold">What's public</h2>
        <p className="text-text-secondary">
          Aggregated mileage by city, county, and state is public — that's the
          whole point of the leaderboards. Your display name appears on the
          Individuals leaderboard once you set it. Your email is never shown.
        </p>
      </section>

      <section className="mt-6 space-y-3">
        <h2 className="text-xl font-bold">Tracking</h2>
        <p className="text-text-secondary">
          No third-party ad trackers, no cross-site pixels, no social feed
          telemetry. Cookies are limited to the ones needed to keep you signed in.
        </p>
      </section>

      <section className="mt-6 space-y-3">
        <h2 className="text-xl font-bold">Deleting your data</h2>
        <p className="text-text-secondary">
          You can delete individual workouts from{" "}
          <Link to="/portal" className="underline hover:text-foreground">My Portal</Link>{" "}
          at any time. To close your account and remove your profile entirely,
          write to us from the{" "}
          <Link to="/contact" className="underline hover:text-foreground">Contact page</Link>.
        </p>
      </section>
    </div>
  );
}
