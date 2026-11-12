import { createFileRoute } from "@tanstack/react-router";
import { Studio } from "@/sim/studio";

export const Route = createFileRoute("/mujoco")({
  component: function MujocoEntry() {
    return <Studio initial="mujoco" />;
  },
});
