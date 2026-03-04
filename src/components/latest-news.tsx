import { NewsLink } from "./news-link";
import { useLatestNews } from "../hooks/latest-news";
import { FormattedMessage } from "react-intl";

export function LatestNews() {
  const { data: posts } = useLatestNews();

  if (posts && posts.length > 0) {
    return (
      <div className="flex flex-col gap-2">
        <div className="text-xl text-cyber-primary">
          <FormattedMessage defaultMessage="Latest News" />
        </div>
        <NewsLink ev={posts[0]} />
      </div>
    );
  }
}
