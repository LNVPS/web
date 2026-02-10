import { ReactNode, forwardRef, useMemo } from "react";
import { Token, Tokens, marked } from "marked";
import { Link } from "react-router-dom";

interface MarkdownProps {
  content: string;
}

const Markdown = forwardRef<HTMLDivElement, MarkdownProps>(
  (props: MarkdownProps, ref) => {
    let ctr = 0;
    function renderToken(t: Token): ReactNode {
      try {
        switch (t.type) {
          case "paragraph": {
            return (
              <p key={ctr++} className="py-2">
                {t.tokens ? t.tokens.map(renderToken) : t.raw}
              </p>
            );
          }
          case "image": {
            return <img key={ctr++} src={t.href} />;
          }
          case "heading": {
            switch (t.depth) {
              case 1:
                return (
                  <h1 key={ctr++} className="my-6 text-2xl">
                    {t.tokens ? t.tokens.map(renderToken) : t.raw}
                  </h1>
                );
              case 2:
                return (
                  <h2 key={ctr++} className="my-5 text-xl">
                    {t.tokens ? t.tokens.map(renderToken) : t.raw}
                  </h2>
                );
              case 3:
                return (
                  <h3 key={ctr++} className="my-4 text-lg">
                    {t.tokens ? t.tokens.map(renderToken) : t.raw}
                  </h3>
                );
              case 4:
                return (
                  <h4 key={ctr++} className="my-3 text-md">
                    {t.tokens ? t.tokens.map(renderToken) : t.raw}
                  </h4>
                );
              case 5:
                return (
                  <h5 key={ctr++} className="my-2">
                    {t.tokens ? t.tokens.map(renderToken) : t.raw}
                  </h5>
                );
              case 6:
                return (
                  <h6 key={ctr++} className="my-2">
                    {t.tokens ? t.tokens.map(renderToken) : t.raw}
                  </h6>
                );
            }
            throw new Error("Invalid heading");
          }
          case "codespan": {
            return (
              <code key={ctr++} className="bg-cyber-panel px-2">
                {t.raw.substring(1, t.raw.length - 1)}
              </code>
            );
          }
          case "code": {
            return <pre key={ctr++}>{t.raw}</pre>;
          }
          case "br": {
            return <br key={ctr++} />;
          }
          case "hr": {
            return <hr key={ctr++} />;
          }
          case "strong": {
            return (
              <b key={ctr++}>{t.tokens ? t.tokens.map(renderToken) : t.raw}</b>
            );
          }
          case "blockquote": {
            return (
              <blockquote
                key={ctr++}
                className="outline-l-cyber-panel outline text-cyber-text p-3"
              >
                {t.tokens ? t.tokens.map(renderToken) : t.raw}
              </blockquote>
            );
          }
          case "link": {
            return (
              <Link to={t.href} key={ctr++} className="underline">
                {t.tokens ? t.tokens.map(renderToken) : t.raw}
              </Link>
            );
          }
          case "list": {
            if (t.ordered) {
              return (
                <ol key={ctr++} className="list-decimal list-outside pl-6">
                  {t.items.map(renderToken)}
                </ol>
              );
            } else {
              return (
                <ul key={ctr++} className="list-disc list-outside pl-6">
                  {t.items.map(renderToken)}
                </ul>
              );
            }
          }
          case "list_item": {
            return (
              <li key={ctr++}>
                {t.tokens ? t.tokens.map(renderToken) : t.raw}
              </li>
            );
          }
          case "em": {
            return (
              <em key={ctr++}>
                {t.tokens ? t.tokens.map(renderToken) : t.raw}
              </em>
            );
          }
          case "del": {
            return (
              <s key={ctr++}>{t.tokens ? t.tokens.map(renderToken) : t.raw}</s>
            );
          }
          case "table": {
            return (
              <table className="table-auto border-collapse" key={ctr++}>
                <thead>
                  <tr>
                    {(t.header as Tokens.TableCell[]).map((v) => (
                      <th className="border" key={ctr++}>
                        {v.tokens ? v.tokens.map(renderToken) : v.text}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(t.rows as Tokens.TableCell[][]).map((v) => (
                    <tr key={ctr++}>
                      {v.map((d, d_key) => (
                        <td className="border px-2 py-1" key={d_key}>
                          {d.tokens ? d.tokens.map(renderToken) : d.text}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            );
          }
          case "text": {
            if ("tokens" in t) {
              return (t.tokens as Array<Token>).map(renderToken);
            }
            return t.raw;
          }
          case "space": {
            return " ";
          }
          default: {
            console.debug(`Unknown token ${t.type}`);
          }
        }
      } catch (e) {
        console.error(e);
      }
    }

    const parsed = useMemo(() => {
      return marked.lexer(props.content);
    }, [props.content]);
    return (
      <div className="leading-8 text-pretty break-words" ref={ref}>
        {parsed
          .filter((a) => a.type !== "footnote" && a.type !== "footnotes")
          .map((a) => renderToken(a))}
      </div>
    );
  },
);

export default Markdown;
