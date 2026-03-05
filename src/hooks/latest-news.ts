import { useLoaderData } from "react-router-dom";
import type { HomeLoaderData } from "../loaders";

export function useLatestNews() {
  const { latestNews } = useLoaderData<HomeLoaderData>();
  return { data: latestNews };
}
