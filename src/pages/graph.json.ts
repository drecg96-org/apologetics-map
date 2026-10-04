import type { APIRoute } from "astro";
import { loadGraph, toGraphPayload } from "../lib/graph";

export const prerender = true;

export const GET: APIRoute = async () => {
  const { nodes } = await loadGraph();
  return new Response(JSON.stringify(toGraphPayload(nodes), null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
    },
  });
};
