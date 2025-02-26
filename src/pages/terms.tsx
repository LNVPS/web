import Markdown from "../components/markdown";
import TOS from "../tos.md?raw";

export function TosPage() {
  return <Markdown content={TOS} />;
}
