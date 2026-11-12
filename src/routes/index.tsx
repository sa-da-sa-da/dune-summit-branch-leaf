import { createFileRoute } from "@tanstack/react-router";
import { Studio } from "@/sim/studio";

export const Route = createFileRoute("/")({
  component: function Home() {
    return <Studio initial="rapier" />;
  },
});
