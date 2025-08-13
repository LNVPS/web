import { NewsLink } from "./news-link";
import { useLatestNews } from "../hooks/latest-news";

export function LatestNews() {
  const { data: posts } = useLatestNews();

  if (posts && posts.length > 0) {
    return (
      <div className="flex flex-col gap-2">
        <div className="text-xl">Latest News</div>
        <NewsLink ev={posts[0]} />
      </div>
    );
  }
}
