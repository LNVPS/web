import { FormattedMessage } from "react-intl";
import { timeValueParts } from "../utils";

export function TimeValue({ seconds }: { seconds: number }) {
  const parts = timeValueParts(seconds);
  if (!parts) return null;

  const { unit, value, extra } = parts;

  switch (unit) {
    case "day":
      return (
        <FormattedMessage
          defaultMessage="{n, plural, one {# day} other {# days}}"
          values={{ n: value }}
        />
      );
    case "hour":
      return extra && extra > 0 ? (
        <FormattedMessage
          defaultMessage="{h, plural, one {# hr} other {# hrs}} {m, plural, one {# min} other {# mins}}"
          values={{ h: value, m: extra }}
        />
      ) : (
        <FormattedMessage
          defaultMessage="{n, plural, one {# hr} other {# hrs}}"
          values={{ n: value }}
        />
      );
    case "minute":
      return (
        <FormattedMessage
          defaultMessage="{n, plural, one {# min} other {# mins}}"
          values={{ n: value }}
        />
      );
    case "second":
      return (
        <FormattedMessage
          defaultMessage="{n, plural, one {# sec} other {# secs}}"
          values={{ n: value }}
        />
      );
    default:
      return null;
  }
}
