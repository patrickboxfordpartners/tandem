export const BRAINBASE_ORG_ID = "87ac102c-65d5-4158-b2b3-32fc2d8a9397";
export const BRAINBASE_TEAM_ID = "52153364-0a9d-4a0e-bfc2-8d65c84957c8";
export const BRAINBASE_ORCHESTRATION_ID = "db2e29b2-1d86-439b-bef7-5ef7271f2f82";

export const BRAINBASE_AGENTS = {
  planner: {
    id: "d2cf42f5-80bf-4a41-bf43-ebc824c6d7ee",
    title: "Planner",
  },
  infra: {
    id: "97b01b80-4c06-45c9-8f24-68e0bb5a8080",
    title: "Infrastructure",
  },
  payments: {
    id: "361abf9b-90af-41d7-91ff-9bdef41a3f10",
    title: "Payments",
  },
  comms: {
    id: "fc1b30ee-088d-4b2e-946b-72d83f6e9d65",
    title: "Comms",
  },
  legal: {
    id: "ae30a608-acac-40f2-91e0-de65fe904db6",
    title: "Legal",
  },
  seo: {
    id: "ff37419c-7a5a-4f7f-8ade-102dbe099d2a",
    title: "SEO",
  },
  research: {
    id: "0dfa3bee-5bef-4a78-8718-154457dd52c0",
    title: "Research",
  },
  contracts: {
    id: "eda8ce9b-2746-4a7a-aa2e-60be89abe664",
    title: "Contracts",
  },
  deployer: {
    id: "b91a3d0c-4409-4450-8c7b-e372bb8bfc91",
    title: "Deployer",
  },
} as const;

export const BRAINBASE_EDGES = [
  { from: "planner", to: "infra", description: "Planner sends project spec to Infrastructure" },
  { from: "planner", to: "payments", description: "Planner sends project spec to Payments" },
  { from: "planner", to: "comms", description: "Planner sends project spec to Comms" },
  { from: "planner", to: "legal", description: "Planner sends spec to Legal for privacy policy and terms" },
  { from: "planner", to: "seo", description: "Planner sends spec to SEO for crawl infrastructure" },
  { from: "planner", to: "research", description: "Planner sends spec to Research for competitive analysis" },
  { from: "infra", to: "deployer", description: "Infrastructure passes worker name to Deployer" },
  { from: "payments", to: "deployer", description: "Payments passes checkout URL to Deployer" },
  { from: "legal", to: "deployer", description: "Legal passes privacy policy and terms to Deployer" },
  { from: "seo", to: "deployer", description: "SEO passes robots.txt and sitemap to Deployer" },
  { from: "contracts", to: "deployer", description: "Contracts passes service agreement to Deployer" },
];

export function getOrchestrationGraph() {
  return {
    orchestration_id: BRAINBASE_ORCHESTRATION_ID,
    org: "Boxford Partners",
    team_id: BRAINBASE_TEAM_ID,
    agents: Object.entries(BRAINBASE_AGENTS).map(([key, agent]) => ({
      key,
      brainbase_id: agent.id,
      title: agent.title,
    })),
    edges: BRAINBASE_EDGES.map((e) => ({
      from: e.from,
      to: e.to,
      from_id: BRAINBASE_AGENTS[e.from as keyof typeof BRAINBASE_AGENTS].id,
      to_id: BRAINBASE_AGENTS[e.to as keyof typeof BRAINBASE_AGENTS].id,
      description: e.description,
    })),
    topology: "Planner -> [Infra, Payments, Comms] (parallel) -> Deployer (after Infra + Payments)",
  };
}
