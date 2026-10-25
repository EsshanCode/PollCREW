import type { Metadata } from "next";
import Header from "@/components/Header";
import BehindBallot from "@/components/BehindBallot";
import "./walkthrough.css";

export const metadata: Metadata = {
  title: "Behind the ballot · Additional features · Blind Ballot",
  description:
    "Explore how your answers become a policy match, from weighted agreement to 2,000 what-if scenarios, in an interactive fictional example.",
};

export default function AdditionalFeatures() {
  return (
    <div className="page">
      <Header active="features" />
      <main id="bb-engine">
        <BehindBallot />
      </main>
    </div>
  );
}
