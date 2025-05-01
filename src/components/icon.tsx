import classNames from "classnames";
import { MouseEventHandler } from "react";

import Icons from "../icons.svg?no-inline";

type Props = {
  name: string;
  size?: number;
  className?: string;
  onClick?: MouseEventHandler<SVGSVGElement>;
};

export function Icon(props: Props) {
  const size = props.size || 20;
  const href = `${Icons}#${props.name}`;

  return (
    <svg
      width={size}
      height={size}
      className={classNames(props.className, "cursor-pointer")}
      onClick={props.onClick}
    >
      <use href={href} />
    </svg>
  );
}
