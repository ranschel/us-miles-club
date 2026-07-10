import { createFileRoute, Link } from "@tanstack/react-router";
import { MapPin, Trophy, Users } from "lucide-react";

export const Route = createFileRoute("/about")({
  component: About,
  head: () => ({
    meta: [
      { title: "About — US Miles Club" },
      {
        name: "description",
        content:
          "US Miles Club is a friendly, map-driven mileage leaderboard for real US counties. No trackers, no feeds — just neighbors moving together.",
      },
      { property: "og:title", content: "About US Miles Club" },
      {
        property: "og:description",
        content:
          "Log walks, runs, and rides. Watch your city, county, and state climb a real US map.",
      },
      { property: "og:url", content: "/about" },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: "/about" }],
  }),
});

function About() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 md:py-14">
      <h1 className="text-4xl font-black tracking-tight md:text-5xl">
        Every mile counts for somewhere.
      </h1>
      <p className="mt-4 text-lg text-text-secondary">
        US Miles Club is a lightweight leaderboard for the miles you already move.
        Log a walk, run, or ride, and your city, county, and state climb a real
        US map. That's it — no trackers, no feeds, no social pressure.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <div className="card">
          <MapPin size={20} className="text-primary" />
          <h2 className="mt-2 font-bold">Local first</h2>
          <p className="mt-1 text-sm text-text-secondary">
            Your miles put your county on the map. Real counties, real states.
          </p>
        </div>
        <div className="card">
          <Trophy size={20} className="text-primary" />
          <h2 className="mt-2 font-bold">Small wins</h2>
          <p className="mt-1 text-sm text-text-secondary">
            Simple badges and monthly goals. No streak guilt, no follower counts.
          </p>
        </div>
        <div className="card">
          <Users size={20} className="text-primary" />
          <h2 className="mt-2 font-bold">Everyone counts</h2>
          <p className="mt-1 text-sm text-text-secondary">
            Whether you walk 2 miles or ride 40, you're moving your community forward.
          </p>
        </div>
      </div>

      <h2 className="mt-10 text-2xl font-black tracking-tight">How it works</h2>
      <ol className="mt-4 space-y-3 text-text-secondary">
        <li>
          <span className="font-bold text-foreground">1. Join the Club.</span>{" "}
          A quick sign-up. Add your name so your miles show up on the boards.
        </li>
        <li>
          <span className="font-bold text-foreground">2. Log a workout.</span>{" "}
          Sport, distance, city and county — that's the whole form.
        </li>
        <li>
          <span className="font-bold text-foreground">3. Watch the map.</span>{" "}
          Your county, city, and state light up as more miles roll in.
        </li>
      </ol>

      <div className="mt-10 flex flex-wrap gap-3">
        <Link to="/" className="btn btn-cta">
          See the map
        </Link>
        <Link to="/leaderboards" className="btn btn-ghost">
          View leaderboards
        </Link>
      </div>
    </div>
  );
}
