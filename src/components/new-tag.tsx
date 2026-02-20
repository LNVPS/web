import classNames from "classnames";

interface NewTagProps {
  className?: string;
}

export default function NewTag({ className }: NewTagProps) {
  return (
    <span
      className={classNames(
        "inline-block px-1 py-0.5 text-[10px] font-semibold uppercase leading-none",
        "bg-cyber-success text-cyber-darker rounded",
        className,
      )}
    >
      New
    </span>
  );
}
